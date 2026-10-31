import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
const requireWeb=createRequire(`${process.cwd()}/apps/web/package.json`);
const {chromium,expect}=requireWeb('@playwright/test');
const browser=await chromium.launch({headless:true});
const results=[];
try{
  for(const candidate of ['rdg','aria']){
    const page=await browser.newPage({viewport:{width:1440,height:900}});page.setDefaultTimeout(15000);
    await page.goto(`http://127.0.0.1:4188/interaction?candidate=${candidate}&rows=10000`);
    const grid=page.getByRole('grid',{name:'Interaction Sheet'});await grid.waitFor();
    const first=grid.locator('[aria-rowindex="2"] [aria-colindex="1"]');await first.click();
    await page.keyboard.press('Shift+ArrowRight');await page.keyboard.press('Shift+ArrowDown');
    await expect(page.getByLabel('Range end',{exact:true})).toHaveValue('1,1');
    const last=grid.locator('[aria-rowindex="3"] [aria-colindex="2"]');
    await first.click();await last.click({modifiers:['Shift']});await expect(page.getByLabel('Range end',{exact:true})).toHaveValue('1,1');
    const a=await first.boundingBox(),b=await last.boundingBox();await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:6});await page.mouse.up();await expect(page.getByLabel('Range end',{exact:true})).toHaveValue('1,1');
    const clipboardCopy=await first.evaluate(el=>{const data=new DataTransfer();el.dispatchEvent(new ClipboardEvent('copy',{clipboardData:data,bubbles:true,cancelable:true}));return data.getData('text/plain');});
    expect(clipboardCopy).toBe('000000000\tvalue 0 1\n000000001\tvalue 1 1');
    await page.getByRole('button',{name:'Copy range',exact:true}).click();
    const copied=await page.getByLabel('Copied range',{exact:true}).inputValue();
    await expect(page.getByLabel('Copied range',{exact:true})).toHaveValue('000000000\tvalue 0 1\n000000001\tvalue 1 1');
    await first.evaluate(el=>{const data=new DataTransfer();data.setData('text/plain','A\tB\nC\tD');el.dispatchEvent(new ClipboardEvent('paste',{clipboardData:data,bubbles:true,cancelable:true}));});
    await page.waitForFunction(()=>window.interactionProof.historyDepth===1);
    const pasted=await page.evaluate(()=>window.interactionProof.values);
    expect(pasted).toEqual([['A','B'],['C','D']]);
    await page.getByRole('button',{name:'Undo',exact:true}).click();await page.waitForFunction(()=>window.interactionProof.historyDepth===0);
    const undone=await page.evaluate(()=>window.interactionProof.values);expect(undone).toEqual([['000000000','value 0 1'],['000000001','value 1 1']]);
    await page.getByRole('button',{name:'Redo',exact:true}).click();await page.waitForFunction(()=>window.interactionProof.historyDepth===1);
    await page.getByLabel('Paste text',{exact:true}).fill('bad\tshape\textra');
    await page.getByRole('button',{name:'Paste range',exact:true}).click();await expect(page.getByRole('status')).toContainText('Invalid paste');
    expect(await page.evaluate(()=>window.interactionProof.historyDepth)).toBe(1);
    await first.click();await page.keyboard.press('Enter');const draft=page.getByLabel('Cell draft',{exact:true});await draft.fill('cancel me');await draft.press('Escape');
    expect(await page.evaluate(()=>window.interactionProof.historyDepth)).toBe(1);
    await page.getByRole('button',{name:'Edit cell',exact:true}).click();await draft.fill('line one\nline two');
    await draft.dispatchEvent('compositionstart',{data:'日'});await draft.dispatchEvent('keydown',{key:'Enter',code:'Enter',ctrlKey:true,isComposing:true,bubbles:true});
    expect(await page.evaluate(()=>window.interactionProof.historyDepth)).toBe(1);await expect(draft).toBeVisible();
    await draft.dispatchEvent('compositionend',{data:'日'});await draft.press('Control+Enter');await page.waitForFunction(()=>window.interactionProof.historyDepth===2);
    expect((await page.evaluate(()=>window.interactionProof.values))[0][0]).toBe('line one\nline two');
    results.push({candidate,keyboardRectangle:true,shiftClick:true,pointerDrag:true,syntheticClipboardCopyPaste:true,copied,pasteOneEdit:true,undoWholePaste:true,redoWholePaste:true,invalidPasteAtomic:true,cancelNoEdit:true,syntheticImeGuard:true,multilineOneCommit:true});
    await page.close();
  }
}finally{await browser.close();}
await writeFile('artifacts/tabular/evidence/interaction.json',JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results,null,2));
