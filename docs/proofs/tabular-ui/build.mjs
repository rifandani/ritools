import {readdir,readFile,writeFile} from "node:fs/promises";
import {gzipSync} from "node:zlib";
const directory=new URL("../../../apps/web/.output/public/assets/",import.meta.url);
const assets=[];
for(const name of await readdir(directory)){
 if(!/\.(js|css)$/.test(name)) continue;
 const bytes=await readFile(new URL(name,directory));
 assets.push({name,bytes:bytes.length,gzip:gzipSync(bytes).length});
}
const base=process.env.TABULAR_PROOF_URL??"http://127.0.0.1:4666";
const html=await(await fetch(base+"/tabular")).text();
const sitemap=await readFile(new URL("../../../apps/web/public/sitemap.xml",import.meta.url),"utf8");
const record={ssr:{title:html.includes("Tabular — CSV and Excel viewer and editor"),ssrPromise:html.includes("View, edit, and convert table files on your device."),og:html.includes("og:image"),noUserContent:!html.includes("00104"),sitemap:sitemap.includes("/tabular")},assets,dedicated:assets.filter(x=>x.name.startsWith("tabular"))};
await writeFile(new URL("./build-after.json",import.meta.url),JSON.stringify(record,null,2)+"\n");console.log(record.ssr);
