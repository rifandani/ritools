import {createRequire} from "node:module";import {writeFile} from "node:fs/promises";
const require=createRequire(new URL("../../../apps/web/package.json",import.meta.url));const {chromium,expect}=require("@playwright/test");const browser=await chromium.launch();const results=[];
for(const [rows,width] of [[100000,1440],[10000,390]]){
 const page=await browser.newPage({viewport:{width,height:900},reducedMotion:"reduce"});await page.goto("http://127.0.0.1:4666/tabular");await expect(page.getByRole("button",{name:"Choose a file",exact:true})).toBeEnabled();
 const content=Array.from({length:rows+1},(_,r)=>Array.from({length:20},(_,c)=>r?`v${r-1}_${c}`:`column${c}`).join(",")).join("\n");
 await page.locator('input[type="file"]').setInputFiles({name:"views.csv",mimeType:"text/csv",buffer:Buffer.from(content)});await page.getByRole("button",{name:"Open file",exact:true}).last().click();await page.getByRole("gridcell",{name:"v0_0",exact:true}).waitFor();
 const search=page.getByRole("searchbox");const samples=[];
 for(let i=0;i<20;i++){const query=i%2?"v1_":"v99_";const start=performance.now();await search.fill(query);await expect(page.getByText(`1 / ${rows.toLocaleString("en-US")} rows`,{exact:true}).first()).toBeVisible();await page.getByRole("gridcell",{name:i%2?"v1_0":"v99_0",exact:true}).waitFor();samples.push(performance.now()-start);}
 await search.fill("");await expect(page.getByText(`${rows.toLocaleString("en-US")} / ${rows.toLocaleString("en-US")} rows`,{exact:true}).first()).toBeVisible();
 await page.getByRole("gridcell",{name:"v0_0",exact:true}).click();
 const header=page.getByRole("columnheader",{name:"column0",exact:true});const sort=[];
 for(let i=0;i<10;i++){const a=performance.now();await header.click();await header.click();await expect(page.getByRole("gridcell",{name:"v0_0",exact:true}).locator("..")).toHaveAttribute("aria-rowindex",String(rows+1));await expect(page.getByRole("gridcell",{name:"v0_0",exact:true})).toBeInViewport();sort.push(performance.now()-a);const b=performance.now();await header.click();await expect(page.getByRole("gridcell",{name:"v0_0",exact:true}).locator("..")).toHaveAttribute("aria-rowindex","2");await expect(page.getByRole("gridcell",{name:"v0_0",exact:true})).toBeInViewport();sort.push(performance.now()-b);}
 const p95=values=>[...values].sort((a,b)=>a-b)[Math.ceil(values.length*.95)-1];results.push({rows,columns:20,width,method:"Automation elapsed from fill/click to the matching row. Search includes the 150ms debounce. Two sort clicks measure ascending then descending, preserving v0_0 and waiting for its absolute row index and visibility; reset is measured separately.",searchMs:samples,searchP95:p95(samples),sortMs:sort,sortP95:p95(sort)});await page.close();
}
await writeFile(new URL("./views.json",import.meta.url),JSON.stringify({browser:browser.version(),results},null,2)+"\n");console.log(results);await browser.close();
