import {createRequire} from "node:module";
import {writeFile} from "node:fs/promises";
const require=createRequire(new URL("../../../apps/web/package.json",import.meta.url));
const {chromium,devices,expect}=require("@playwright/test");
const base=process.env.TABULAR_PROOF_URL ?? "http://127.0.0.1:4666";
const browser=await chromium.launch();
const report={browser:browser.version(),cpu:"Apple M2 desktop CPU; mobile uses Pixel 7 emulation",performance:[],offline:{},privacy:{}};
const openSample=async page=>{await page.getByRole("button",{name:"Open a sample",exact:true}).click();await page.getByRole("button",{name:"Open file",exact:true}).last().click();await expect(page.getByRole("gridcell",{name:"00104",exact:true})).toBeVisible();};
const ready=async page=>{await page.goto(base+"/tabular");await expect(page.getByRole("button",{name:"Choose a file",exact:true})).toBeEnabled({timeout:15000});};
for(const [rows,cols,width,fixture] of [[100000,20,1440],[10000,20,390],[100,1000,1440],[100000,20,1440,"engine-standard"]]){
 const context=await browser.newContext({...(width===390?devices["Pixel 7"]:{}),viewport:{width,height:900},reducedMotion:"reduce"});
 const page=await context.newPage();await ready(page);page.setDefaultTimeout(20000);
 const text=Array.from({length:rows+1},(_,r)=>Array.from({length:cols},(_,c)=>r===0?`Column ${c}`:fixture === "engine-standard" ? `v${r-1}_${c}` : `row ${r-1} column ${c}`).join(",")).join("\n");
 const start=performance.now();await page.locator('input[type="file"]').setInputFiles({name:"performance.csv",mimeType:"text/csv",buffer:Buffer.from(text)});
 await expect(page.getByRole("button",{name:"Open file",exact:true}).last()).toBeVisible();const previewMs=performance.now()-start;
 await page.getByRole("button",{name:"Open file",exact:true}).last().click();await expect(page.getByRole("gridcell",{name:fixture === "engine-standard" ? "v0_0" : "row 0 column 0",exact:true})).toBeVisible();
 const gridMs=performance.now()-start;const grid=page.getByRole("grid");
 const beforeCells=await grid.getByRole("gridcell").count();const automationTimings=[];
 await page.evaluate(()=>{
  window.tabularFeedback={pending:null,times:[]};
  document.addEventListener("keydown",event=>{if(event.key === "Enter" && event.target instanceof HTMLInputElement && event.target.closest('[role="grid"]'))window.tabularFeedback.pending={text:event.target.value,start:performance.now()};},true);
  new MutationObserver(()=>{const state=window.tabularFeedback;const pending=state.pending;if(!pending)return;const cells=[...document.querySelectorAll('.tabular-changed')];if(cells.some(cell=>cell.textContent.startsWith(pending.text))){state.pending=null;requestAnimationFrame(()=>requestAnimationFrame(()=>state.times.push(performance.now()-pending.start)));}}).observe(document.querySelector('main'),{childList:true,subtree:true,characterData:true});
 });

 if(cols===20){
  for(let i=0;i<21;i++){
   const first=grid.locator('[aria-rowindex="2"] [aria-colindex="2"]');await first.dblclick();const input=page.getByRole("textbox",{name:"Cell text",exact:true});await input.fill(`commit-${i}`);
   const t=performance.now();await input.press("Enter");await expect(page.getByRole("gridcell",{name:`commit-${i} Edited`,exact:true})).toBeVisible();await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));automationTimings.push(performance.now()-t);
  }
 }
 await grid.locator('[aria-rowindex="2"] [aria-colindex="2"]').click();await page.keyboard.press("Control+End");
 await expect(page.getByRole("gridcell",{name:fixture === "engine-standard" ? `v${rows-1}_${cols-1}` : `row ${rows-1} column ${cols-1}`,exact:true})).toBeVisible();
 const afterCells=await grid.getByRole("gridcell").count();
 const focus=await page.evaluate(()=>({row:document.activeElement?.parentElement?.getAttribute("aria-rowindex"),column:document.activeElement?.getAttribute("aria-colindex")}));
 const timings=await page.evaluate(()=>window.tabularFeedback.times);const sorted=[...timings].sort((a,b)=>a-b);report.performance.push({fixture:fixture ?? "expanded-cell-text",rows,cols,width,bytes:Buffer.byteLength(text),previewMs,gridMs,beforeCells,afterCells,focus,automationElapsedSamples:automationTimings,commitSamples:timings,commitP95Ms:sorted.length?sorted[Math.ceil(sorted.length*.95)-1]:null});await context.close();
}
const context=await browser.newContext({reducedMotion:"reduce"});const page=await context.newPage();await ready(page);
await page.evaluate(async()=>{await navigator.serviceWorker.ready;});await page.reload();await expect(page.getByRole("button",{name:"Open a sample",exact:true})).toBeEnabled();
await openSample(page);await context.setOffline(true);await page.reload();await expect(page.getByRole("button",{name:"Open a sample",exact:true})).toBeEnabled();await openSample(page);
await page.getByRole("button",{name:"Export…",exact:true}).click();await page.getByRole("button",{name:"Check export",exact:true}).click();await page.getByRole("button",{name:"Create download",exact:true}).click();await expect(page.getByRole("button",{name:"Download CSV",exact:true})).toBeVisible();
report.offline.cachedSampleAndExport=true;report.offline.caches=await page.evaluate(()=>caches.keys());await context.close();
const missingContext=await browser.newContext();const missing=await missingContext.newPage();await ready(missing);await missing.evaluate(async()=>{await navigator.serviceWorker.ready;});await missing.reload();await expect(missing.getByRole("button",{name:"Open a sample",exact:true})).toBeEnabled();await missingContext.setOffline(true);await missing.reload();await expect(missing.getByRole("button",{name:"Open a sample",exact:true})).toBeEnabled();await missing.getByRole("button",{name:"Open a sample",exact:true}).click();await expect(missing.getByRole("alert")).toContainText("not cached");report.offline.uncachedNamedFailure=true;await missingContext.close();
await writeFile(new URL("./runtime.json",import.meta.url),JSON.stringify(report,null,2)+"\n");console.log(JSON.stringify(report,null,2));await browser.close();
