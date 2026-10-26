// Disposable issue 18 probe. Run from the repository root with Bun.
// Dependencies are downloaded to /tmp; application manifests stay unchanged.
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { resolve } from 'node:path';

const root = process.cwd();
const scratch = process.env.TABULAR_PROBE_DIR ?? '/tmp/ritools-tabular-18';
const requireWeb = createRequire(resolve(root, 'apps/web/package.json'));
const source = resolve(root, 'docs/proofs/tabular');
await mkdir(`${scratch}/site`, { recursive: true });
await mkdir(`${scratch}/src`, { recursive: true });
for (const name of ['baseline', 'shared', 'rdg', 'aria', 'parser', 'interaction']) {
  await writeFile(`${scratch}/src/${name}.tsx`, await readFile(`${source}/${name}.tsx.txt`));
}
const sizes = [];
for (const entry of ['baseline', 'rdg', 'aria', 'parser', 'interaction']) {
  const result = await Bun.build({
    entrypoints: [`${scratch}/src/${entry}.tsx`],
    outdir: `${scratch}/site/${entry}`,
    target: 'browser', minify: true,
    define: { 'process.env.NODE_ENV': JSON.stringify('production') },
    plugins: [{ name: 'probe-dependencies', setup(build) {
      build.onResolve({ filter: /^(react|react-dom|react-aria-components)(\/.*)?$/ }, ({ path }) => ({ path: requireWeb.resolve(path) }));
      build.onResolve({ filter: /^react-data-grid$/ }, () => ({ path: `${scratch}/vendor/rdg/lib/index.js` }));
      build.onResolve({ filter: /^papaparse$/ }, () => ({ path: `${scratch}/vendor/papa/papaparse.js` }));
      build.onResolve({ filter: /^xlsx$/ }, () => ({ path: `${scratch}/vendor/sheetjs/xlsx.mjs` }));
    } }],
  });
  if (!result.success) throw new Error(String(result.logs));
  for (const output of result.outputs) {
    const bytes = new Uint8Array(await output.arrayBuffer());
    sizes.push({ entry, file: output.path.split('/').at(-1), bytes: bytes.length, gzip: gzipSync(bytes).length });
  }
}
await writeFile(`${scratch}/site/sizes.json`, JSON.stringify(sizes, null, 2));
for (const name of ['surface.html', 'grid.css']) {
  await writeFile(`${scratch}/site/${name}`, await readFile(`${source}/${name}`));
}
await writeFile(`${scratch}/site/rdg.css`, await readFile(`${scratch}/vendor/rdg/lib/styles.css`));
console.log(JSON.stringify(sizes, null, 2));
const server = Bun.serve({ port: 4188, hostname: '127.0.0.1', async fetch(request) {
  const url = new URL(request.url);
  if (url.pathname === '/grid' || url.pathname === '/parser' || url.pathname === '/interaction') {
    const candidate = url.pathname === '/interaction' ? 'interaction' : url.pathname === '/parser' ? 'parser' : url.searchParams.get('candidate') === 'aria' ? 'aria' : 'rdg';
    return new Response(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Tabular ${candidate} disposable probe</title><link rel="stylesheet" href="/rdg.css"><link rel="stylesheet" href="/grid.css"><main id="root"></main><script type="module" src="/${candidate}/${candidate}.js"></script></html>`, { headers: { 'content-type': 'text/html' } });
  }
  if (url.pathname.startsWith('/fonts/')) return new Response(Bun.file(resolve(root, `apps/web/public${url.pathname}`)));
  const path = url.pathname === '/' ? '/surface.html' : url.pathname;
  if (path.includes('..')) return new Response('Invalid path', { status: 400 });
  const file = Bun.file(`${scratch}/site${path}`);
  return await file.exists() ? new Response(file) : new Response('Not found', { status: 404 });
} });
console.log(`Disposable probe: ${server.url}`);
