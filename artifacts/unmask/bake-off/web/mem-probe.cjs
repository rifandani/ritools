const { chromium } = require('@playwright/test');
const { execSync } = require('child_process');
const fs = require('fs');
const model = process.argv[2], backend = process.argv[3];
function rss(){ try { return execSync("ps -axo rss=,comm= | grep -i 'Chromium' | grep -v grep | awk '{s+=$1} END {print s}'",{encoding:'utf8'}).trim()*1024||0; } catch(e){ return 0; } }
(async()=>{
 const browser = await chromium.launch({headless:false, args:['--enable-unsafe-webgpu','--enable-features=WebGPU','--ignore-gpu-blocklist','--window-position=2500,2500','--window-size=900,700']});
 const page = await browser.newPage();
 await page.goto('http://localhost:8767/bench.html');
 await page.waitForFunction(()=>window.ready===true,null,{timeout:60000});
 await page.waitForTimeout(800);
 const base = rss();
 let peak = base;
 const timer = setInterval(()=>{ peak=Math.max(peak,rss()); }, 150);
 const r = await page.evaluate(([m,b])=>window.memProbe(m,b),[model,backend]);
 clearInterval(timer);
 const out = {...r, rssBaseBytes:base, rssPeakBytes:peak, rssDeltaBytes:Math.max(0,peak-base)};
 fs.writeFileSync(`../out/mem-${model}-${backend}.json`,JSON.stringify(out,null,2));
 console.log(JSON.stringify(out,null,2));
 await browser.close();
})().catch(e=>{console.error(String(e));process.exit(1)});
