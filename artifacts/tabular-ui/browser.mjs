import {createRequire} from "node:module";
import {mkdir,writeFile} from "node:fs/promises";
import path from "node:path";
const require=createRequire(new URL("../../../apps/web/package.json",import.meta.url));
const {chromium,devices,expect}=require("@playwright/test");
const base=process.env.TABULAR_PROOF_URL ?? "http://127.0.0.1:4666";
const round=process.env.TABULAR_PROOF_ROUND ?? "1";
const root=path.resolve(import.meta.dirname,"../../..");
const captures=path.join(root,"apps/web/.impeccable/review/tabular");
await mkdir(captures,{recursive:true});
const browser=await chromium.launch();
const report={round,browser:browser.version(),platform:process.platform,deviceNote:"Desktop CPU. Mobile Chrome uses Pixel 7 touch/UA emulation at 390px; no physical-device result.",matrix:[],privacy:[],errors:[]};
const words={"en-us":{choose:"Choose a file",sample:"Open a sample",open:"Open file",edit:"Edit cell",text:"Cell text",apply:"Apply",export:"Export…",format:"Output format"},"id-id":{choose:"Pilih file",sample:"Buka contoh",open:"Buka file",edit:"Sunting sel",text:"Teks sel",apply:"Terapkan",export:"Ekspor…",format:"Format keluaran"}};
for(const width of [1440,390,1280]) for(const scheme of ["light","dark"]) for(const locale of ["en-us","id-id"]){
 const context=await browser.newContext({...(width===390?devices["Pixel 7"]:{}),viewport:{width,height:width===1280?800:900},colorScheme:scheme,reducedMotion:"reduce"});
 await context.addCookies([{name:"app-locale",value:locale,url:base}]);
 const page=await context.newPage();const requests=[];const errors=[];let workers=0;
 page.on("worker",()=>workers++);page.on("request",r=>requests.push({url:r.url(),method:r.method(),body:r.postData()}));page.on("pageerror",e=>errors.push(e.message));
 await page.goto(base+"/tabular");
 const w=words[locale];await expect(page.getByRole("button",{name:w.choose,exact:true})).toBeEnabled();
 const emptyWorkers=workers;
 if(width===1440&&scheme==="light"&&locale==="en-us") await page.screenshot({path:path.join(captures,"empty.png"),fullPage:true});
 await page.getByRole("button",{name:w.sample,exact:true}).click();
 await page.getByRole("button",{name:w.open,exact:true}).last().click();
 await expect(page.getByRole("grid").getByRole("columnheader")).not.toHaveCount(1);
 await page.getByRole("button",{name:w.edit,exact:true}).click();
 await page.getByRole("dialog").getByRole("textbox",{name:w.text,exact:true}).fill("00105");
 await page.getByRole("dialog").getByRole("button",{name:w.apply,exact:true}).click();
 await expect(page.getByRole("gridcell",{name:locale==="en-us"?"00105 Edited":"00105 Disunting",exact:true})).toBeVisible();
 await page.evaluate(async()=>{await document.fonts.ready;window.scrollTo(0,0);await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
 const metrics=await page.evaluate(()=>({width:innerWidth,pageWidth:document.documentElement.scrollWidth,gridWidth:document.querySelector('[role="grid"]').clientWidth,gridScrollWidth:document.querySelector('[role="grid"]').scrollWidth,cells:document.querySelectorAll('[role="gridcell"]').length,rows:document.querySelector('[role="grid"]').getAttribute("aria-rowcount"),columns:document.querySelector('[role="grid"]').getAttribute("aria-colcount"),colors:{text:getComputedStyle(document.querySelector('[role="gridcell"]')).color,cell:getComputedStyle(document.querySelector('[role="gridcell"]')).backgroundColor}}));
 let accessibility = null;
 if(round === "2") {
   await page.addScriptTag({path:"/tmp/ritools-tabular-qa/node_modules/axe-core/axe.min.js"});
   accessibility = await page.evaluate(async()=>{const result=await axe.run(document,{runOnly:{type:"tag",values:["wcag2a","wcag2aa","wcag21aa","wcag22aa"]}});return {violations:result.violations.map(v=>({id:v.id,impact:v.impact,description:v.description,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})),incomplete:result.incomplete.map(v=>({id:v.id,nodes:v.nodes.length}))};});
 }
 const name=`${width}-${scheme}-${locale}.png`;
 await page.screenshot({path:path.join(captures,name),fullPage:true});
 if(width===1440&&scheme==="light"&&locale==="en-us") await page.screenshot({path:path.join(root,"apps/web/.impeccable/review/desktop.png"),fullPage:true});
 if(width===390&&scheme==="light"&&locale==="en-us") await page.screenshot({path:path.join(root,"apps/web/.impeccable/review/mobile.png"),fullPage:true});
 report.matrix.push({requestedWidth:width,width,scheme,locale,emptyWorkers,...metrics,accessibility,errors});
 if(width===390&&scheme==="dark"&&locale==="id-id"||width===1440&&scheme==="light"&&locale==="en-us"){
   await page.getByRole("button",{name:w.export,exact:true}).click();
   await page.getByRole("combobox",{name:w.format,exact:true}).first().selectOption("xlsx");
   await page.evaluate(()=>window.scrollTo(0,document.getElementById("tabular-export-title").getBoundingClientRect().top+scrollY-24));
   await page.screenshot({path:path.join(captures,`export-${width}-${locale}.png`),fullPage:true});
 }
 report.privacy.push({width,scheme,locale,requests:requests.length,nonGet:requests.filter(r=>r.method!=="GET").map(r=>({url:r.url(),method:r.method})),fileDataRequests:requests.filter(r=>r.body?.includes("00105")||r.url.includes("stock-list.csv")||r.body?.includes("stock-list.csv")).length});
 report.errors.push(...errors);await context.close();
}
await writeFile(new URL(`./browser-round-${round}.json`,import.meta.url),JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify(report,null,2));await browser.close();
