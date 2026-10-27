# PDF fonts

Static Archivo TTFs for the Tabular PDF Report. jsPDF cannot read WOFF2, so the files are cut from the existing OFL variable face at `public/fonts/archivo-latin-wdth-normal.woff2`.

| File                                | Instance               |
| ----------------------------------- | ---------------------- |
| `archivo-latin-400-normal.ttf`      | `wght=400`, `wdth=100` |
| `archivo-latin-wdth125-wght900.ttf` | `wght=900`, `wdth=125` |

The recipe uses fonttools 4.67.0 and brotli:

```sh
python3 - <<'PY'
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

source = "apps/web/public/fonts/archivo-latin-wdth-normal.woff2"
for name, location in [
    ("archivo-latin-400-normal.ttf", {"wght": 400, "wdth": 100}),
    ("archivo-latin-wdth125-wght900.ttf", {"wght": 900, "wdth": 125}),
]:
    font = TTFont(source)
    instance = instantiateVariableFont(font, location, updateFontNames=True)
    instance.flavor = None
    instance.save(f"apps/web/public/fonts/pdf/{name}")
PY
```

The licence is SIL Open Font License 1.1. The text is in `public/fonts/licenses/archivo-OFL.txt`.
