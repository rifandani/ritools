import json, os, urllib.parse, urllib.request
from PIL import Image
from io import BytesIO

UA = "RitoolsUnmaskShape/1.0 (https://github.com/rifandani/ritools)"
FILES = {
  "portrait-hair": "File:Blowin' in the wind... - Flickr - 2 million- views. Humbled and thanks.jpg",
  "pet-fur": "File:Cat in Piran, Slovenia, 20240504 1600 8594.jpg",
  "product-busy": "File:20240907 Flea Market Izmailovo Scalimont Vanity Set.jpg",
  "product-plain": "File:LRP sunscreen bottle.jpg",
  "low-contrast": "File:Polar bear in Arctic Alaska.jpg",
  "alpha-input": "File:Blue Flower Transparent Background.png",
  "large-24mp": "File:FOOTE, WALTER A., MRS. PORTRAIT. WITH DOG LCCN2016870537.jpg",
  "glass-frame": "File:Bright red cocktail in a glass with ice and splash against a dark background.jpg",
  "frame-two": "File:Polar bear in Arctic Alaska.jpg",
}
def api(title):
    params={"action":"query","titles":title,"prop":"imageinfo","iiprop":"url|size|extmetadata|mime","format":"json"}
    url="https://commons.wikimedia.org/w/api.php?"+urllib.parse.urlencode(params)
    with urllib.request.urlopen(urllib.request.Request(url,headers={"User-Agent":UA})) as r: data=json.load(r)
    for p in data["query"]["pages"].values():
        if "imageinfo" in p: return p["title"], p["imageinfo"][0]
    raise SystemExit("missing "+title)

def get(url):
    with urllib.request.urlopen(urllib.request.Request(url,headers={"User-Agent":UA})) as r: return r.read()

os.makedirs("fixtures-raw", exist_ok=True)
meta={}
for slug,title in FILES.items():
    t,ii=api(title)
    ext=ii.get("extmetadata",{})
    meta[slug]={"title":t,"page":ii["descriptionurl"],"url":ii["url"],"width":ii["width"],"height":ii["height"],"bytes":ii["size"],"mime":ii["mime"],
      "license":ext.get("LicenseShortName",{}).get("value"),"licenseUrl":ext.get("LicenseUrl",{}).get("value"),
      "artist":ext.get("Artist",{}).get("value"),"credit":ext.get("Credit",{}).get("value"),"description":ext.get("ImageDescription",{}).get("value"),
      "date":ext.get("DateTimeOriginal",{}).get("value")}
    print(slug, t, ii["width"], ii["height"], ii["size"], meta[slug]["license"])
    data=get(ii["url"])
    open(f"fixtures-raw/{slug}{os.path.splitext(ii['url'].split('?')[0])[1]}","wb").write(data)
json.dump(meta,open("fixtures-meta.json","w"),indent=2)
