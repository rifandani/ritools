// Browser-only proof. No production page, grid, telemetry, or data persistence.
import { Effect, Layer, ManagedRuntime, Stream } from '../../../apps/web/node_modules/effect';
import * as T from '../../../apps/web/src/features/tabular/tabular';
import { TabularEngine, TabularWorkerFactory } from '../../../apps/web/src/features/tabular/tabular.service';
import { tabularWorkerFactoryLayer } from '../../../apps/web/src/features/tabular/tabular.worker-client';

let serial=0;
const requestId=()=>T.RequestId.make(`browser-${++serial}`);
const runtime=ManagedRuntime.make(TabularEngine.layer.pipe(Layer.provide(tabularWorkerFactoryLayer)));
const run=<A,E>(e:Effect.Effect<A,E,TabularEngine>)=>runtime.runPromise(e);
const call=<A>(f:(engine:TabularEngine['Service'])=>Effect.Effect<A,T.EngineError>)=>run(Effect.flatMap(TabularEngine,f));
const source=(text:string,name='proof.csv')=>{const bytes=new TextEncoder().encode(text);return {name,size:bytes.length,bytes};};
const assert=(pass:unknown,message:string)=>{if(!pass)throw new Error(message);};
async function benchmark(rows:number,columns:number){
  const stage=(phase:string)=>{document.getElementById('status')!.textContent=`${rows}x${columns}: ${phase}`;};stage('generate');
  const data=Array.from({length:rows+1},(_,r)=>Array.from({length:columns},(_,c)=>r?`v${r-1}_${c}`:`column${c}`).join(',')).join('\n');
  stage("import");const input=source(data);const start=performance.now();const candidate=await call(e=>e.prepareOpen(input,T.defaultParseOptions,{requestId:requestId()}));const session=await call(e=>e.acceptOpen({candidateId:candidate.candidateId,replace:null,acknowledgeValuesOnly:false,requestId:requestId()}));const importMs=performance.now()-start;
  const sheetId=session.sheets[0]!.sheetId;let revision=session.revision;
  const guard=()=>({sessionId:session.sessionId,expectedRevision:revision,requestId:requestId()});
  let t=performance.now();let view=await call(e=>e.setView({...guard(),sheetId,search:'',sort:null}));const viewMs=performance.now()-t;
  t=performance.now();const box=await call(e=>e.readViewport({...guard(),viewId:view.viewId,rowStart:0,rowCount:32,columnStart:0,columnCount:Math.min(20,columns)}));const viewportMs=performance.now()-t;
  const viewportBytes=new TextEncoder().encode(JSON.stringify(box)).length;
  const commits:number[]=[];let historyBytes=0;
  const address={sheetId,rowId:box.rows[0]!.rowId,columnId:box.columns[0]!.columnId};
  for(let i=0;i<41;i++){t=performance.now();const changed=await call(e=>e.edit({...guard(),edit:{_tag:'SetCell',address,text:`edited${i}`}}));revision=changed.session.revision;historyBytes=changed.session.history.estimatedBytes;commits.push(performance.now()-t);}
  const searches:number[]=[];const sorts:number[]=[];let query=view;
  for(let i=0;i<20;i++){t=performance.now();query=await call(e=>e.setView({...guard(),sheetId,search:'v9_',sort:null}));searches.push(performance.now()-t);t=performance.now();view=await call(e=>e.setView({...guard(),sheetId,search:'',sort:{columnId:box.columns[0]!.columnId,direction:'descending'}}));sorts.push(performance.now()-t);}
  const percentile=(values:number[])=>values.toSorted((a,b)=>a-b)[Math.ceil(values.length*.95)-1];
  const searchMs=percentile(searches);const sortMs=percentile(sorts);
  stage("export");const exports=[];
  for(const format of ['csv','xlsx','xls'] as const){
    const options:T.ExportOptions={format,scope:{_tag:'WholeSheet',sheetId},delimiter:',',newline:'crlf',bom:false,textPolicy:'exact',jsonShape:'auto'};
    stage(`plan ${format}`);t=performance.now();const plan=await call(e=>e.planExport({...guard(),options}));
    if(format==='xls'&&(rows>=65536||columns>256)){assert(plan.blockedBy.some(e=>e._tag==='FormatLimit'),'XLS bounds');exports.push({format,blocked:'FormatLimit'});continue;}
    stage(`write ${format}`);const bytes=await call(e=>e.exportBytes({...guard(),planId:plan.planId,acknowledgeValuesOnly:true}));exports.push({format,ms:performance.now()-t,bytes:bytes.bytes.length,writtenRows:bytes.writtenRows});
  }
  const result={rows,columns,inputBytes:input.size,importMs,viewMs,viewportMs,viewportBytes,viewportCells:box.rows.length*box.columns.length,commitP95Ms:commits.toSorted((a,b)=>a-b)[Math.ceil(commits.length*.95)-1],searchMs,searchSamples:searches,matching:query.matchingRows,sortMs,sortSamples:sorts,historyBytes,exports};
  await call(e=>e.close(session.sessionId));return result;
}
Object.assign(window,{benchmark,runTabularEngineProof:async()=>{
  const results=[];Object.assign(window,{proofResults:results});
  for(const [rows,columns] of [[10000,20],[100000,20],[100,1000]])results.push(await benchmark(rows!,columns!));
  return {userAgent:navigator.userAgent,hardwareConcurrency:navigator.hardwareConcurrency,results,resources:performance.getEntriesByType('resource').map(r=>({name:r.name,transferSize:(r as PerformanceResourceTiming).transferSize}))};
}});
document.getElementById('status')!.textContent='Ready: window.runTabularEngineProof()';

Object.assign(window,{runSmallEngineProof:async(cancelJob=false)=>{
 const input=source('a,b\none,1\ntwo,2');const candidate=await call(e=>e.prepareOpen(input,T.defaultParseOptions,{requestId:requestId()}));
 const accepted=await call(e=>e.acceptOpen({candidateId:candidate.candidateId,replace:null,requestId:requestId(),acknowledgeValuesOnly:false}));const sheetId=accepted.sheets[0]!.sheetId;
 const changed=await call(e=>e.edit({sessionId:accepted.sessionId,expectedRevision:0,requestId:requestId(),edit:{_tag:'InsertRows',sheetId,before:null,count:1}}));
 let cancelled:string|null=null;let cancelMs:number|null=null;
 if(cancelJob){const cancelStart=performance.now();const id=requestId();const pending=call(e=>e.prepareOpen(source('a,b\n'+Array.from({length:100000},(_,r)=>r+',value').join('\n')),T.defaultParseOptions,{requestId:id}));await call(e=>e.cancel({requestId:id}));try{await pending;throw Error('Job was not cancelled')}catch(error){cancelled=(error as T.EngineError)._tag;assert(cancelled==='Cancelled','cancelled format job');cancelMs=performance.now()-cancelStart;}}
 const summary=await call(e=>e.summary(accepted.sessionId,{requestId:requestId()}));assert(summary.revision===1&&summary.history.dirty,'accepted edits preserved');await call(e=>e.close(accepted.sessionId));
 return {revision:summary.revision,dirty:summary.history.dirty,rows:summary.sheets[0]!.rowCount,cancelled,cancelMs};
}});
Object.assign(window,{runWorkerRecoveryProof:async()=>{
 const real=await Effect.runPromise(Effect.provide(TabularWorkerFactory,tabularWorkerFactoryLayer));let starts=0;
 const crashUrl=URL.createObjectURL(new Blob(["throw new Error('Tabular proof crash')"],{type:'application/javascript'}));
 const layer=Layer.succeed(TabularWorkerFactory,{...real,create:()=>{
  starts++;if(starts>1)return real.create();const w=new Worker(crashUrl,{type:'module'});return {send:(r:unknown)=>w.postMessage(r),subscribe:(h:{message:(v:unknown)=>void,error:()=>void})=>{w.addEventListener('message',e=>h.message(e.data));w.addEventListener('error',()=>h.error());},terminate:()=>w.terminate()};
 }});
 const isolated=ManagedRuntime.make(TabularEngine.layer.pipe(Layer.provide(layer)));
 try{let failure:string|null=null;
  try{await isolated.runPromise(Effect.flatMap(TabularEngine,e=>e.prepareOpen(source('a\nvalue'),T.defaultParseOptions,{requestId:requestId()})))}catch(error){failure=(error as T.EngineError)._tag;}
  assert(failure==='EngineFailed','real Worker startup failure');
  const candidate=await isolated.runPromise(Effect.flatMap(TabularEngine,e=>e.prepareOpen(source('a\nvalue'),T.defaultParseOptions,{requestId:requestId()})));
  return {failure,retryCandidate:!!candidate.candidateId,workerStarts:starts};
 }finally{await isolated.dispose();URL.revokeObjectURL(crashUrl);}
}});
Object.assign(window,{runConversionMatrixProof:async()=>{
 const matrix=[['id','note','n'],['00123','=1+1','42'],['999999999999999999','  x  ','0']];
 const sources=new Map<string,T.Source>();
 for(const input of ['csv','tsv','tab','txt']){const sep=input==='csv'?',':input==='txt'?'|':'\t';sources.set(input,source(matrix.map(r=>r.join(sep)).join('\r\n'),`input.${input}`));}
 const seed=await call(e=>e.prepareOpen(sources.get('csv')!,T.defaultParseOptions,{requestId:requestId()}));const seeded=await call(e=>e.acceptOpen({requestId:requestId(),candidateId:seed.candidateId,replace:null,acknowledgeValuesOnly:false}));const seedSheet=seeded.sheets[0]!.sheetId;
 const options=(format:T.OutputFormat,scope:T.ExportScope):T.ExportOptions=>({format,scope,delimiter:['tsv','tab','clipboard'].includes(format)?'\t':',',newline:format==='clipboard'?'lf':'crlf',bom:false,textPolicy:'exact',jsonShape:'auto'});
 for(const format of ['xls','xlsx'] as const){const plan=await call(e=>e.planExport({sessionId:seeded.sessionId,expectedRevision:0,requestId:requestId(),options:options(format,{_tag:'WholeSheet',sheetId:seedSheet})}));const out=await call(e=>e.exportBytes({sessionId:seeded.sessionId,expectedRevision:0,requestId:requestId(),planId:plan.planId,acknowledgeValuesOnly:true}));sources.set(format,{name:`input.${format}`,size:out.bytes.length,bytes:out.bytes});}
 await call(e=>e.close(seeded.sessionId));const pairs=[];
 for(const [input,file] of sources){
  const candidate=await call(e=>e.prepareOpen(file,T.defaultParseOptions,{requestId:requestId()}));const session=await call(e=>e.acceptOpen({requestId:requestId(),candidateId:candidate.candidateId,replace:null,acknowledgeValuesOnly:true}));const sheetId=session.sheets[0]!.sheetId;
  const guard=()=>({sessionId:session.sessionId,expectedRevision:0,requestId:requestId()});const view=await call(e=>e.setView({...guard(),sheetId,search:'00123',sort:null}));
  for(const format of ['csv','tsv','tab','xls','xlsx','json','clipboard'] as const){
   const scopes:T.ExportScope[]=[{_tag:'WholeSheet',sheetId},{_tag:'CurrentView',sheetId,viewId:view.viewId}];if(format==='xls'||format==='xlsx')scopes.push({_tag:'WholeWorkbook'});
   for(const scope of scopes){
    const expected=scope._tag==='CurrentView'?matrix.slice(0,2):matrix;
    const plan=await call(e=>e.planExport({...guard(),options:options(format,scope)}));assert(!plan.blockedBy.length,'unblocked matrix export');const out=await call(e=>e.exportBytes({...guard(),planId:plan.planId,acknowledgeValuesOnly:true}));assert(out.writtenRows===expected.length-1,'matrix row count');
    if(format==='json'){const objects=expected.slice(1).map(r=>Object.fromEntries(expected[0]!.map((h,i)=>[h,r[i]])));assert(JSON.stringify(JSON.parse(new TextDecoder().decode(out.bytes)))===JSON.stringify(objects),'JSON exact objects');}
    else{const extension=format==='clipboard'?'tsv':format;const reread=await call(e=>e.prepareOpen({name:`read.${extension}`,size:out.bytes.length,bytes:out.bytes},T.defaultParseOptions,{requestId:requestId()}));const values=reread.sheets[0]!.sample.map(r=>r.map(v=>v._tag==='Text'?v.text:v));assert(JSON.stringify(values)===JSON.stringify(expected),`${input} to ${format}: exact read-back`);await call(e=>e.discardCandidate(reread.candidateId,{requestId:requestId()}));}
    pairs.push({input,output:format,scope:scope._tag,pass:true});
   }
  }
  await call(e=>e.close(session.sessionId));
 }
 return {pairs,uniquePairs:new Set(pairs.map(p=>p.input+':'+p.output)).size,scopeChecks:pairs.length};
}});
