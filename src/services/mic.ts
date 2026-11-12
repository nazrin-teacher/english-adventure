/**
 * Optional microphone "voice meter".
 *
 * It asks the browser for permission only when the child/parent presses the mic
 * button, then reports a 0–1 loudness level so the child can *see* their voice.
 * Audio is analysed in memory frame by frame and immediately discarded:
 * nothing is recorded, stored, transcribed or uploaded, and no pronunciation
 * judgement is made.
 */

export type MicSession = { stop: () => void };

export type MicError = 'unsupported' | 'denied' | 'failed';

export async function startVoiceMeter(onLevel: (level: number) => void): Promise<MicSession> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    throw 'unsupported' satisfies MicError;
  }
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
  } catch (e) {
    const name = (e as { name?: string })?.name;
    throw (name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'failed') satisfies MicError;
  }
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  const ctx = new AC();
  const src = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 512;
  src.connect(analyser);
  const buf = new Uint8Array(analyser.fftSize);
  let raf = 0;
  let stopped = false;
  const loop = () => {
    if (stopped) return;
    analyser.getByteTimeDomainData(buf);
    let sum = 0;
    for (let i = 0; i < buf.length; i++) {
      const v = (buf[i] - 128) / 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / buf.length);
    onLevel(Math.min(1, rms * 4));
    raf = requestAnimationFrame(loop);
  };
  loop();
  return {
    stop() {
      stopped = true;
      cancelAnimationFrame(raf);
      stream.getTracks().forEach((t) => t.stop());
      void ctx.close().catch(() => undefined);
      onLevel(0);
    },
  };
}
