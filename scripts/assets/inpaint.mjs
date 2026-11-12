// Local object removal with the LaMa inpainting model (Apache-2.0),
// ONNX export from huggingface.co/Carve/LaMa-ONNX, stored at .tools/lama_fp32.onnx.
// Used only to prepare backgrounds from the supplied illustrations.
import ort from 'onnxruntime-node';
import sharp from 'sharp';

const SIZE = 512;
let session;
async function getSession() {
  session ??= await ort.InferenceSession.create('.tools/lama_fp32.onnx');
  return session;
}

/**
 * Image held as raw RGB in memory.
 * @typedef {{ data: Buffer, width: number, height: number }} RawImage
 */

export async function loadRaw(file, crop) {
  let img = sharp(file);
  if (crop) img = img.extract(crop);
  const { data, info } = await img.removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

/** Mask helpers — mask is a Uint8Array (1 = remove) of width*height. */
export const newMask = (img) => new Uint8Array(img.width * img.height);
export function maskRect(img, mask, [l, t, r, b]) {
  for (let y = Math.max(0, t); y < Math.min(img.height, b); y++)
    for (let x = Math.max(0, l); x < Math.min(img.width, r); x++) mask[y * img.width + x] = 1;
}
export function maskEllipse(img, mask, [l, t, r, b]) {
  const cx = (l + r) / 2, cy = (t + b) / 2, rx = (r - l) / 2, ry = (b - t) / 2;
  for (let y = Math.max(0, t); y < Math.min(img.height, b); y++)
    for (let x = Math.max(0, l); x < Math.min(img.width, r); x++)
      if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) mask[y * img.width + x] = 1;
}
/** Mask pixels inside a box that match a colour test. */
export function maskWhere(img, mask, [l, t, r, b], test) {
  for (let y = Math.max(0, t); y < Math.min(img.height, b); y++)
    for (let x = Math.max(0, l); x < Math.min(img.width, r); x++) {
      const i = y * img.width + x;
      if (test(img.data[i * 3], img.data[i * 3 + 1], img.data[i * 3 + 2])) mask[i] = 1;
    }
}
export function dilate(img, mask, radius) {
  const { width: w, height: h } = img;
  let cur = mask;
  for (let p = 0; p < radius; p++) {
    const next = new Uint8Array(cur);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (cur[i]) continue;
        if ((x > 0 && cur[i - 1]) || (x < w - 1 && cur[i + 1]) || (y > 0 && cur[i - w]) || (y < h - 1 && cur[i + w])) next[i] = 1;
      }
    cur = next;
  }
  mask.set(cur);
}

/**
 * Inpaint the masked pixels that fall inside `win` ([l,t,r,b]).
 * The window is scaled to 512×512 for the model; only masked pixels are replaced.
 */
export async function inpaintWindow(img, mask, win) {
  const [l, t, r, b] = win.map(Math.round);
  const ww = r - l, wh = b - t;
  const crop = await sharp(img.data, { raw: { width: img.width, height: img.height, channels: 3 } })
    .extract({ left: l, top: t, width: ww, height: wh })
    .resize(SIZE, SIZE, { kernel: 'lanczos3', fit: 'fill' })
    .raw()
    .toBuffer();
  const m = Buffer.alloc(ww * wh);
  for (let y = 0; y < wh; y++) for (let x = 0; x < ww; x++) m[y * ww + x] = mask[(t + y) * img.width + (l + x)] ? 255 : 0;
  // nearest-neighbour downscale of the mask, done by hand (any covered source pixel → hole)
  const mSmall = new Uint8Array(SIZE * SIZE);
  for (let y = 0; y < wh; y++)
    for (let x = 0; x < ww; x++)
      if (m[y * ww + x]) mSmall[Math.min(SIZE - 1, ((y * SIZE) / wh) | 0) * SIZE + Math.min(SIZE - 1, ((x * SIZE) / ww) | 0)] = 255;
  for (let ty = 0; ty < SIZE; ty++)
    for (let tx = 0; tx < SIZE; tx++)
      if (m[Math.min(wh - 1, ((ty * wh) / SIZE) | 0) * ww + Math.min(ww - 1, ((tx * ww) / SIZE) | 0)]) mSmall[ty * SIZE + tx] = 255;

  const imgT = new Float32Array(3 * SIZE * SIZE);
  const maskT = new Float32Array(SIZE * SIZE);
  for (let i = 0; i < SIZE * SIZE; i++) {
    const hole = mSmall[i] > 127 ? 1 : 0;
    // LaMa must not see the pixels it is asked to replace
    imgT[i] = hole ? 0 : crop[i * 3] / 255;
    imgT[SIZE * SIZE + i] = hole ? 0 : crop[i * 3 + 1] / 255;
    imgT[2 * SIZE * SIZE + i] = hole ? 0 : crop[i * 3 + 2] / 255;
    maskT[i] = hole;
  }
  const s = await getSession();
  const res = await s.run({
    image: new ort.Tensor('float32', imgT, [1, 3, SIZE, SIZE]),
    mask: new ort.Tensor('float32', maskT, [1, 1, SIZE, SIZE]),
  });
  const out = res.output.data;
  if (process.env.INPAINT_DEBUG) {
    let holes = 0; for (const v of maskT) holes += v;
    const dump = Buffer.alloc(SIZE * SIZE * 3);
    for (let i = 0; i < SIZE * SIZE; i++) for (let c = 0; c < 3; c++) dump[i * 3 + c] = Math.round(imgT[c * SIZE * SIZE + i] * 255);
    await sharp(dump, { raw: { width: SIZE, height: SIZE, channels: 3 } }).png().toFile(process.env.INPAINT_DEBUG + '-in.png');
    console.log('holes', holes, 'crop len', crop.length);
  }
  let max = 0;
  for (let i = 0; i < out.length; i += 97) max = Math.max(max, out[i]);
  const k = max <= 1.5 ? 255 : 1;
  const rgb = Buffer.alloc(SIZE * SIZE * 3);
  for (let i = 0; i < SIZE * SIZE; i++)
    for (let c = 0; c < 3; c++) rgb[i * 3 + c] = Math.max(0, Math.min(255, Math.round(out[c * SIZE * SIZE + i] * k)));
  const back = await sharp(rgb, { raw: { width: SIZE, height: SIZE, channels: 3 } }).resize(ww, wh, { kernel: 'lanczos3', fit: 'fill' }).raw().toBuffer();

  // Soft-edged composite: blend 2px around the mask border.
  // 3px soft edge around the mask (separable box blur, done by hand)
  const soft = new Float32Array(m);
  for (const horiz of [true, false]) {
    const src = Float32Array.from(soft);
    for (let y = 0; y < wh; y++)
      for (let x = 0; x < ww; x++) {
        let sum = 0, n = 0;
        for (let d = -3; d <= 3; d++) {
          const xx = horiz ? x + d : x, yy = horiz ? y : y + d;
          if (xx < 0 || yy < 0 || xx >= ww || yy >= wh) continue;
          sum += src[yy * ww + xx];
          n++;
        }
        soft[y * ww + x] = sum / n;
      }
  }
  for (let y = 0; y < wh; y++)
    for (let x = 0; x < ww; x++) {
      const a = Math.max(m[y * ww + x], soft[y * ww + x]) / 255;
      if (a <= 0) continue;
      const gi = ((t + y) * img.width + (l + x)) * 3, li = (y * ww + x) * 3;
      for (let c = 0; c < 3; c++) img.data[gi + c] = Math.round(img.data[gi + c] * (1 - a) + back[li + c] * a);
    }
  for (let y = t; y < b; y++) for (let x = l; x < r; x++) mask[y * img.width + x] = 0;
}

/** Window around a box, padded and clamped to the image. */
export function windowAround(img, [l, t, r, b], pad = 0.45) {
  const w = r - l, h = b - t;
  const side = Math.max(w, h) * (1 + pad * 2);
  const cx = (l + r) / 2, cy = (t + b) / 2;
  let wl = cx - Math.max(side, w + 40) / 2, wr = cx + Math.max(side, w + 40) / 2;
  let wt = cy - Math.max(side * 0.6, h + 40) / 2, wb = cy + Math.max(side * 0.6, h + 40) / 2;
  const clamp = (a, bb, max) => {
    if (a < 0) [a, bb] = [0, bb - a];
    if (bb > max) [a, bb] = [a - (bb - max), max];
    return [Math.max(0, a), Math.min(max, bb)];
  };
  [wl, wr] = clamp(wl, wr, img.width);
  [wt, wb] = clamp(wt, wb, img.height);
  return [wl, wt, wr, wb];
}

export async function saveRaw(img, file, opts = {}) {
  let s = sharp(img.data, { raw: { width: img.width, height: img.height, channels: 3 } });
  if (opts.resize) s = s.resize(opts.resize);
  return file.endsWith('.png') ? s.png().toFile(file) : s.webp({ quality: opts.quality ?? 88 }).toFile(file);
}

export async function saveMaskPreview(img, mask, file) {
  const o = Buffer.from(img.data);
  for (let i = 0; i < mask.length; i++) if (mask[i]) (o[i * 3] = 255), (o[i * 3 + 1] = 0), (o[i * 3 + 2] = 255);
  await sharp(o, { raw: { width: img.width, height: img.height, channels: 3 } }).resize({ width: 1000 }).png().toFile(file);
}
