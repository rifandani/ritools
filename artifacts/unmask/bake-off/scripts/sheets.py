import json, os, random
from PIL import Image, ImageDraw
random.seed(20261101)
models=["isnet-int8","birefnet-lite-fp16","modnet-int8"]
FX=["portrait-hair","pet-fur","product-busy","product-plain","low-contrast","alpha-input","large-24mp","first-frame"]
os.makedirs("out/sheets2",exist_ok=True)
mapping={}
for fx in FX:
    order=models[:]; random.shuffle(order)
    mapping[fx]=dict(zip("ABC",order))
    ext='png' if fx=='alpha-input' else 'gif' if fx=='first-frame' else 'jpg'
    orig=Image.open(f"fixtures/{fx}.{ext}")
    if fx=="first-frame": orig.seek(0)
    orig=orig.convert("RGBA"); bg=Image.new("RGBA",orig.size,(255,255,255,255)); bg.alpha_composite(orig); orig=bg.convert("RGB")
    w,h=orig.size
    if fx=="portrait-hair": orig=orig.crop((int(w*0.02),int(h*0.03),int(w*0.78),int(h*0.92)))
    elif fx=="pet-fur": orig=orig.crop((int(w*0.10),int(h*0.10),int(w*0.95),int(h*0.95)))
    elif fx=="large-24mp": orig=orig.crop((int(w*0.05),int(h*0.05),int(w*0.72),int(h*0.95)))
    orig.thumbnail((620,620),Image.LANCZOS)
    panels=[("ORIGINAL",orig)]
    for lab in "ABC":
        p=Image.open(f"out/previews/{mapping[fx][lab]}/{fx}.jpg").convert("RGB"); p.thumbnail((620,620),Image.LANCZOS)
        panels.append((lab,p))
    cw=max(p.width for _,p in panels)+16; ch=max(p.height for _,p in panels)+44
    sheet=Image.new("RGB",(cw*2+12,ch*2+12),(245,242,235)); d=ImageDraw.Draw(sheet)
    for i,(lab,p) in enumerate(panels):
        x=(i%2)*(cw+12)+8; y=(i//2)*(ch+12)+8
        sheet.paste(p,(x,y+30)); d.text((x+4,y+6),lab,fill=(0,0,0))
    sheet.save(f"out/sheets2/{fx}.jpg",quality=92)
json.dump(mapping,open("out/sheets2/mapping.json","w"),indent=2)
print("built")
