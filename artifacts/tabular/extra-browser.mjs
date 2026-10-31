// Supplemental structural accessibility, touch-event, and heap probes.
import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
const requireWeb=createRequire(`${process.cwd()}/apps/web/package.json`);
const {chromium}=requireWeb('@playwright/test');
const browser=await chromium.launch({headless:true});
const results={keyboard:[],touch:[],memory:[]};
try {
  for(const candidate of ['rdg','aria']) {
    const page=await browser.newPage({viewport:{width:1440,height:900}});
    await page.goto(`http://127.0.0.1:4188/grid?candidate=${candidate}&rows=100000`);
    const grid=page.getByRole('grid',{name:'Table File'});await grid.waitFor();
    await grid.getByRole('gridcell').first().click();
    await page.keyboard.press('Control+End');
    await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
    results.keyboard.push({candidate,controlEnd:await page.evaluate(()=>({role:document.activeElement?.getAttribute('role'),row:document.activeElement?.closest('[aria-rowindex]')?.getAttribute('aria-rowindex'),column:document.activeElement?.getAttribute('aria-colindex'),text:document.activeElement?.textContent}))});
    await writeFile(`artifacts/tabular/evidence/${candidate}-aria.txt`,await grid.ariaSnapshot());
    const cdp=await page.context().newCDPSession(page);
    await cdp.send('HeapProfiler.collectGarbage');const before=await cdp.send('Runtime.getHeapUsage');
    await page.evaluate(()=>{window.patchHistory=Array.from({length:10000},(_,i)=>({sheetId:'s0',rowId:`r${i}`,columnId:'c1',before:`value ${i} 1`,after:`edited ${i}`}));});
    await cdp.send('HeapProfiler.collectGarbage');const after=await cdp.send('Runtime.getHeapUsage');
    results.memory.push({candidate,before,after,syntheticPatchCount:10000,patchHeapDelta:after.usedSize-before.usedSize});
    await page.close();
    const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
    const touch=await context.newPage();await touch.goto(`http://127.0.0.1:4188/grid?candidate=${candidate}&rows=10000`);
    await touch.getByRole('gridcell').first().tap();
    await touch.getByLabel('Cell text',{exact:true}).fill('touch text');
    await touch.getByRole('button',{name:'Apply cell',exact:true}).tap();
    await touch.getByRole('status').filter({hasText:'Cell committed'}).waitFor();
    await touch.getByText('touch text',{exact:true}).waitFor();
    results.touch.push({candidate,emulated:true,visibleTextControl:true,updatedCells:await touch.getByText('touch text',{exact:true}).count(),edits:await touch.evaluate(()=>window.probe.edits)});
    await context.close();
  }
} finally {await browser.close();}
await writeFile('artifacts/tabular/evidence/extra.json',JSON.stringify(results,null,2)+'\n');
console.log(JSON.stringify(results,null,2));
