import glob, hashlib, json, os
from PIL import Image

os.makedirs("fixtures", exist_ok=True)
def src(name): return Image.open(glob.glob(f"fixtures-raw/{name}.*")[0])

def resize_long(im, long_edge):
    w,h=im.size
    if max(w,h)<=long_edge: return im.copy()
    s=long_edge/max(w,h)
    return im.resize((round(w*s),round(h*s)), Image.LANCZOS)

# 1 portrait hair
im=src("portrait-hair").convert("RGB")
resize_long(im,2400).save("fixtures/portrait-hair.jpg",quality=90,optimize=True,progressive=True)
# 2 pet fur
im=src("pet-fur").convert("RGB")
resize_long(im,2400).save("fixtures/pet-fur.jpg",quality=90,optimize=True,progressive=True)
# 3 product busy
im=src("product-busy").convert("RGB")
resize_long(im,2400).save("fixtures/product-busy.jpg",quality=90,optimize=True,progressive=True)
# 4 product plain
im=src("product-plain").convert("RGB")
resize_long(im,2000).save("fixtures/product-plain.jpg",quality=90,optimize=True,progressive=True)
# 5 low contrast
im=src("low-contrast").convert("RGB")
im.save("fixtures/low-contrast.jpg",quality=92,optimize=True,progressive=True)
# 6 alpha input
im=src("alpha-input").convert("RGBA")
resize_long(im,2048).save("fixtures/alpha-input.png",optimize=True)
# 7 large > 24 MP
im=src("large-24mp").convert("RGB")
im=im.crop((200,160,10134,7352))
w,h=im.size; s=6000/w
im=im.resize((6000,round(h*s)),Image.LANCZOS)
print("large final",im.size, im.size[0]*im.size[1]/1e6, "MP")
im.save("fixtures/large-24mp.jpg",quality=90,optimize=True,progressive=True)
# 8 GIF + BMP first frame
cocktail=src("glass-frame").convert("RGB")
# crop to 2:3 portrait and resize 960x1440
w,h=cocktail.size
target=2/3
if w/h>target:
    nw=round(h*target); cocktail=cocktail.crop(((w-nw)//2,0,(w+nw)//2,h))
else:
    nh=round(w/target); cocktail=cocktail.crop((0,(h-nh)//2,w,(h+nh)//2))
cocktail=cocktail.resize((960,1440),Image.LANCZOS)
second=src("frame-two").convert("RGB")
# fit second into 960x1440 with a visible band
second=second.resize((960,round(second.height*960/second.width)),Image.LANCZOS)
canvas=Image.new("RGB",(960,1440),(250,245,235))
canvas.paste(second,((960-second.width)//2,(1440-second.height)//2))
cocktail.save("fixtures/first-frame.gif",save_all=True,append_images=[canvas],duration=1200,loop=0,optimize=True)
cocktail.save("fixtures/first-frame.bmp")

for p in sorted(glob.glob("fixtures/*")):
    data=open(p,"rb").read()
    im=Image.open(p)
    print(os.path.basename(p), im.size, im.mode, len(data), hashlib.sha256(data).hexdigest())
