// Rerun parser checks without repeating the grid timing probe.
import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
const requireWeb=createRequire(`${process.cwd()}/apps/web/package.json`);
const {chromium}=requireWeb('@playwright/test');
const browser=await chromium.launch({headless:true});
try {
  const page=await browser.newPage();
  await page.goto('http://127.0.0.1:4188/parser');
  await page.waitForFunction(()=>typeof window.runParserProbe==='function');
  const result=await page.evaluate(()=>window.runParserProbe());
  await writeFile('artifacts/tabular/evidence/parser.json',JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify({results:result.results,pairs:result.pairs.length,workbookBudgets:result.workbookBudgets,papaBudgets:result.papaBudgets},null,2));
  const contrast=[];
  for(const width of [390,1440]) for(const colorScheme of ['light','dark']) {
    await page.setViewportSize({width,height:1000});await page.emulateMedia({colorScheme,reducedMotion:'reduce'});
    await page.goto('http://127.0.0.1:4188/');await page.evaluate(()=>document.fonts.ready);
    const styles=await page.evaluate(()=>{
      const selectors=['body','.quiet','.note','button','.primary','th','td','h1 span','h1 span:nth-child(2)','nav'];
      return selectors.map(selector=>{const el=document.querySelector(selector);const cs=getComputedStyle(el);let p=el;const backgrounds=[];while(p){backgrounds.unshift(getComputedStyle(p).backgroundColor);p=p.parentElement;}return {selector,color:cs.color,backgrounds};});
    });
    contrast.push({width,colorScheme,styles});
    await page.screenshot({path:`artifacts/tabular/evidence/${width}-${colorScheme}.png`,fullPage:true});
  }
  await writeFile('artifacts/tabular/evidence/computed-colors.json',JSON.stringify(contrast,null,2)+'\n');
} finally {await browser.close();}
