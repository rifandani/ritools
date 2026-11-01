const { chromium } = require('@playwright/test');
const model = process.argv[2] || 'isnet-int8';
const backend = process.argv[3] || 'webgpu';
(async()=>{
 const browser = await chromium.launch({headless:false, args:['--enable-unsafe-webgpu','--enable-features=WebGPU','--ignore-gpu-blocklist','--window-position=2500,2500','--window-size=900,700']});
 const page = await browser.newPage();
 page.on('console', m => { if (m.type()==='error') console.error('PAGE', m.text()); });
 page.on('pageerror', e => console.error('PAGEERROR', String(e)));
 await page.goto('http://localhost:8766/bench.html');
 await page.waitForFunction(()=>window.ready===true, null, {timeout:60000});
 const t=Date.now();
 const r = await page.evaluate(([m,b])=>window.bench(m,b), [model, backend]);
 const out={model,backend,wallSeconds:(Date.now()-t)/1000,...r}; require('fs').writeFileSync(`../out/browser-${model}-${backend}.json`,JSON.stringify(out,null,2)); console.log(JSON.stringify(out,null,2));
 await browser.close();
})().catch(e=>{console.error(String(e));process.exit(1)});
