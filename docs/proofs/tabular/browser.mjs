// Run the disposable browser workflow with the project's installed Playwright.
import { createRequire } from 'node:module';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const requireWeb = createRequire(`${process.cwd()}/apps/web/package.json`);
const { chromium } = requireWeb('@playwright/test');
const scratch = process.env.TABULAR_PROBE_DIR ?? await mkdtemp(join(tmpdir(), 'ritools-tabular-18-'));
const source = await readFile('docs/proofs/tabular/run-browser.js.txt', 'utf8');
await writeFile(`${scratch}/run-browser.mjs`, `export default ${source}`, { mode: 0o600 });
const { default: run } = await import(pathToFileURL(`${scratch}/run-browser.mjs`).href);
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  const result = await run(page);
  await writeFile('docs/proofs/tabular/evidence/browser.json', `${JSON.stringify(result,null,2)}\n`);
} finally {
  await browser.close();
}
