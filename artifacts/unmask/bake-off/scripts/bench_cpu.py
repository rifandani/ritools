import glob, json, os, resource, statistics, time
import numpy as np, onnxruntime as ort, psutil
from PIL import Image

FIXTURES = [
 ("portrait-hair","fixtures/portrait-hair.jpg"),
 ("pet-fur","fixtures/pet-fur.jpg"),
 ("product-busy","fixtures/product-busy.jpg"),
 ("product-plain","fixtures/product-plain.jpg"),
 ("low-contrast","fixtures/low-contrast.jpg"),
 ("alpha-input","fixtures/alpha-input.png"),
 ("large-24mp","fixtures/large-24mp.jpg"),
 ("first-frame","fixtures/first-frame.gif"),
]
MODELS = [
 ("isnet-int8","models/isnet-int8.onnx","isnet"),
 ("birefnet-lite-fp16","models/birefnet-lite-fp16.onnx","birefnet"),
 ("modnet-int8","models/modnet-int8.onnx","modnet"),
]
OUT="out"
for d in ["masks","previews"]:
    for m,_,_ in MODELS: os.makedirs(f"{OUT}/{d}/{m}",exist_ok=True)

def load_input(path):
    im=Image.open(path)
    if getattr(im,"is_animated",False): im.seek(0)
    im=im.convert("RGBA")
    bg=Image.new("RGBA",im.size,(255,255,255,255))
    bg.alpha_composite(im)
    return bg.convert("RGB")

def preprocess(im,kind):
    im=im.resize((1024,1024),Image.LANCZOS)
    a=np.asarray(im,dtype=np.float32)
    if kind=="isnet":
        x=(a-128.0)/256.0
    elif kind=="birefnet":
        mean=np.array([0.485,0.456,0.406],dtype=np.float32); std=np.array([0.229,0.224,0.225],dtype=np.float32)
        x=(a/255.0-mean)/std
    else:
        x=(a/255.0-0.5)/0.5
    return np.ascontiguousarray(x.transpose(2,0,1)[None].astype(np.float32))

def checker(size):
    w,h=size; c=Image.new("RGB",size,(235,232,224)); px=c.load(); s=16
    for y in range(0,h,s):
        for x in range(0,w,s):
            if (x//s+y//s)%2==0:
                for yy in range(y,min(y+s,h)):
                    for xx in range(x,min(x+s,w)): px[xx,yy]=(205,201,192)
    return c

results={"device":"Apple M2, 16 GB, macOS (CPUExecutionProvider, onnxruntime 1.31.1)","models":{}}
for mid,path,kind in MODELS:
    print("MODEL",mid,flush=True)
    data=open(path,"rb").read()
    rec={"file_bytes":len(data),"fixtures":{}}
    base_rss=psutil.Process().memory_info().rss
    t=time.perf_counter(); s=ort.InferenceSession(data,providers=["CPUExecutionProvider"]); rec["cold_load_s"]=time.perf_counter()-t
    t=time.perf_counter(); s2=ort.InferenceSession(data,providers=["CPUExecutionProvider"]); rec["warm_load_s"]=time.perf_counter()-t
    del s2
    inp=s.get_inputs()[0].name; out=s.get_outputs()[0].name
    for slug,path_in in FIXTURES:
        print("  ",slug,flush=True)
        orig=load_input(path_in); x=preprocess(orig,kind)
        t=time.perf_counter(); y=s.run([out],{inp:x})[0]; cold=time.perf_counter()-t
        warm=[]
        for _ in range(3):
            t=time.perf_counter(); y=s.run([out],{inp:x})[0]; warm.append(time.perf_counter()-t)
        y=y[0,0]
        if kind=="birefnet": y=1.0/(1.0+np.exp(-y))
        y=np.clip(y,0,1)
        mask=Image.fromarray((y*255).astype(np.uint8),"L").resize(orig.size,Image.LANCZOS)
        mask.save(f"{OUT}/masks/{mid}/{slug}.png")
        # preview: subject over checkerboard
        comp=checker(orig.size); comp.paste(orig,(0,0),mask)
        comp.thumbnail((720,720),Image.LANCZOS)
        comp.save(f"{OUT}/previews/{mid}/{slug}.jpg",quality=88)
        arr=np.asarray(mask,dtype=np.float32)/255.0
        rec["fixtures"][slug]={"cold_infer_s":cold,"warm_infer_s":statistics.median(warm),"warm_runs":warm,
            "coverage":float((arr>0.5).mean()),"soft_fraction":float(((arr>0.05)&(arr<0.95)).mean()),
            "mean_alpha":float(arr.mean()),"input_size":orig.size}
    rec["peak_rss_bytes"]=psutil.Process().memory_info().rss
    rec["rss_delta_bytes"]=rec["peak_rss_bytes"]-base_rss
    results["models"][mid]=rec
    del s
json.dump(results,open(f"{OUT}/cpu-bench.json","w"),indent=2)
print(json.dumps(results,indent=2))
