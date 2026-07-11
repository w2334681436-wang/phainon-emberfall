import { cp, mkdir, rm } from 'node:fs/promises';
const out = new URL('../dist/', import.meta.url);
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
for (const path of ['index.html', 'styles.css', 'src', 'vercel.json']) {
  await cp(new URL(`../${path}`, import.meta.url), new URL(`../dist/${path}`, import.meta.url), { recursive: true });
}
console.log('Static build ready in dist/');
