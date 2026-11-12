// Publish to GitHub without a local `git` install, using the GitHub REST API:
//   • main      ← the source code (everything not in .gitignore)
//   • gh-pages  ← the built website (dist/), served by GitHub Pages
//
// Usage:
//   BASE_PATH=/english-adventure/ npm run build
//   node scripts/publish-github.mjs <owner>/<repo> "commit message"
// Needs the GitHub CLI to be logged in (`gh auth login`); its token is used.
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync, existsSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const [repo, message = 'Update English Adventure'] = process.argv.slice(2);
if (!repo) throw new Error('usage: node scripts/publish-github.mjs owner/repo "message"');
const token = execFileSync('gh', ['auth', 'token'], { encoding: 'utf8' }).trim();
const API = `https://api.github.com/repos/${repo}`;
const TRAILER = '\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>';

async function gh(path, method = 'GET', body) {
  const res = await fetch(path.startsWith('http') ? path : `${API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  return { ok: res.ok, status: res.status, data };
}
async function must(path, method, body) {
  const r = await gh(path, method, body);
  if (!r.ok) throw new Error(`${method ?? 'GET'} ${path} → ${r.status} ${JSON.stringify(r.data).slice(0, 300)}`);
  return r.data;
}

/** Files to publish from a folder, honouring simple .gitignore entries. */
function listFiles(root, ignore = []) {
  const out = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      const rel = relative(root, p);
      if (name === '.DS_Store' || ignore.some((ig) => rel === ig || rel.startsWith(ig + '/'))) continue;
      if (statSync(p).isDirectory()) walk(p);
      else out.push(rel);
    }
  };
  walk(root);
  return out.sort();
}

async function pool(items, size, fn) {
  const results = [];
  let i = 0;
  await Promise.all(
    Array.from({ length: size }, async () => {
      while (i < items.length) {
        const k = i++;
        results[k] = await fn(items[k], k);
      }
    }),
  );
  return results;
}

/** Commit a folder as the full content of `branch` (creating the branch if needed). */
async function commitFolder(root, files, branch, msg) {
  const ref = await gh(`/git/ref/heads/${branch}`);
  const parent = ref.ok ? ref.data.object.sha : null;
  let done = 0;
  const tree = await pool(files, 6, async (f) => {
    const blob = await must('/git/blobs', 'POST', { content: readFileSync(join(root, f)).toString('base64'), encoding: 'base64' });
    if (++done % 25 === 0) console.log(`  ${branch}: ${done}/${files.length} files`);
    return { path: f, mode: '100644', type: 'blob', sha: blob.sha };
  });
  const t = await must('/git/trees', 'POST', { tree });
  const c = await must('/git/commits', 'POST', { message: msg + TRAILER, tree: t.sha, parents: parent ? [parent] : [] });
  if (parent) await must(`/git/refs/heads/${branch}`, 'PATCH', { sha: c.sha, force: false });
  else await must('/git/refs', 'POST', { ref: `refs/heads/${branch}`, sha: c.sha });
  console.log(`${branch}: ${files.length} files → ${c.sha.slice(0, 7)}`);
}

// An empty repository has no git database yet: create the first file through the contents API.
const probe = await gh('/git/ref/heads/main');
if (!probe.ok && (probe.status === 409 || probe.status === 404)) {
  const r = await gh('/contents/README.md', 'PUT', { message: 'Initial commit' + TRAILER, content: readFileSync('README.md').toString('base64'), branch: 'main' });
  if (!r.ok && r.status !== 422) throw new Error(`init failed ${r.status} ${JSON.stringify(r.data)}`);
}

const ignore = readFileSync('.gitignore', 'utf8').split('\n').map((s) => s.trim().replace(/\/$/, '')).filter(Boolean);
await commitFolder('.', listFiles('.', [...ignore, '.git']), 'main', message);

if (!existsSync('dist/index.html')) throw new Error('dist/ missing — run the build first');
writeFileSync('dist/.nojekyll', '');
await commitFolder('dist', listFiles('dist'), 'gh-pages', `Website: ${message}`);

// Turn on GitHub Pages from the gh-pages branch (no-op if already on).
// (GitHub may switch Pages on by itself as soon as a gh-pages branch appears → 409 is fine.)
const pages = await gh('/pages');
if (!pages.ok) {
  const r = await gh('/pages', 'POST', { source: { branch: 'gh-pages', path: '/' } });
  if (!r.ok && r.status !== 409) throw new Error(`enable Pages → ${r.status} ${JSON.stringify(r.data).slice(0, 300)}`);
}
const current = await must('/pages');
if (current.source?.branch !== 'gh-pages') await must('/pages', 'PUT', { source: { branch: 'gh-pages', path: '/' } });
const info = await must('/pages');
console.log('Pages:', info.html_url, '(status:', info.status ?? 'queued', ')');
