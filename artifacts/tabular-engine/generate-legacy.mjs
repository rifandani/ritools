// Generated fixtures, MIT like this repository. No external workbook data.
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
const req=createRequire(resolve('apps/web/package.json'));const XLSX=req('xlsx');
const dir=resolve('artifacts/tabular-engine/fixtures');await mkdir(dir,{recursive:true});
const manifest=[];
for(const bookType of ['biff2','biff3','biff4','biff5','biff8','xlml']){
 const book=XLSX.utils.book_new();XLSX.utils.book_append_sheet(book,XLSX.utils.aoa_to_sheet([['text','n','b'],['00123',42,true]]),'Data');
 const bytes=new Uint8Array(XLSX.write(book,{type:'array',bookType}));const name=`${bookType}.xls`;await writeFile(resolve(dir,name),bytes);manifest.push({name,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
}
const cfb=XLSX.CFB.utils.cfb_new();XLSX.CFB.utils.cfb_add(cfb,'EncryptionInfo',new Uint8Array([4,0,4,0,0,0,0,0]));XLSX.CFB.utils.cfb_add(cfb,'EncryptedPackage',new Uint8Array([1,0,0,0,0,0,0,0]));
const encrypted=new Uint8Array(XLSX.CFB.write(cfb,{type:'array'}));await writeFile(resolve(dir,'encrypted-container.xls'),encrypted);manifest.push({name:'encrypted-container.xls',bytes:encrypted.length,sha256:createHash('sha256').update(encrypted).digest('hex'),note:'Synthetic encrypted CFB stream envelope; not a valid encrypted private workbook.'});
await writeFile(resolve(dir,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
