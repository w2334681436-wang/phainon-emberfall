import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const out = new URL('../dist/', import.meta.url);
const checkOnly = process.argv.includes('--check-only');

let encoded = '';
for (const index of [1, 2, 3]) {
  const text = await readFile(new URL(`../src/runtime-chunk-${index}.js`, import.meta.url), 'utf8');
  const match = text.match(/\+'([^']+)'/);
  if (!match) throw new Error(`Invalid runtime chunk ${index}`);
  encoded += match[1];
}
const runtime = gunzipSync(Buffer.from(encoded, 'base64')).toString('utf8');

const checkTarget = new URL('../.runtime-check.js', import.meta.url);
await writeFile(checkTarget, runtime, 'utf8');
try {
  execFileSync(process.execPath, ['--check', fileURLToPath(checkTarget)], { stdio: 'inherit' });
} finally {
  await rm(checkTarget, { force: true });
}

if (checkOnly) {
  console.log('Runtime integrity and syntax checks passed.');
  process.exit(0);
}

await rm(out, { recursive: true, force: true });
await mkdir(new URL('./src/', out), { recursive: true });
await cp(new URL('../index.html', import.meta.url), new URL('./index.html', out));
await cp(new URL('../styles.css', import.meta.url), new URL('./styles.css', out));
await writeFile(new URL('./src/game.js', out), runtime, 'utf8');
await cp(new URL('../ATTRIBUTION.md', import.meta.url), new URL('./ATTRIBUTION.md', out));
console.log('Static Vercel build ready in dist/.');
