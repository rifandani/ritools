# Fixtures

Eight fixtures, nine files. Each file is licence-clean, local, and recorded
with its source, author, licence, bytes, and SHA-256. The files are in
`artifacts/unmask/fixtures/`. The notice is in `NOTICE.txt`; the machine
record is in `manifest.json`.

The fixtures are test data. They are not shipped as a Sample Image in the app
and they are not precached. The bake-off and the engine tests read them from
the repository. No fixture needs a network request.

## The set

| # | File | Role | Size | Bytes | SHA-256 |
| ---: | --- | --- | --- | ---: | --- |
| 1 | `portrait-hair.jpg` | A portrait with flyaway hair. Tests thin hair strands and a bright, low-contrast sky. | 2400 × 1521 | 388,410 | `0f7d84b699ce62d25a87c89cc41818cf57bfd6741516e91d92bf617904257e28` |
| 2 | `pet-fur.jpg` | A pet with fur. Tests fur detail and a textured wall behind the Subject. | 2400 × 1602 | 827,396 | `0470b9077d1abff1226e6116b8e271813039ae5153bfd11cdf7e7c38861e63e8` |
| 3 | `product-busy.jpg` | A product on a busy Background. Tests glass, reflections, and many similar objects. | 2400 × 1800 | 860,013 | `4850b0717c4c05b354d088ea4f832c7a89946ce382ebab38c9bc1880d604df58` |
| 4 | `product-plain.jpg` | A product on a plain Background. Tests a hard product edge and a label with small text. | 1321 × 2000 | 375,333 | `50266704d925bca42d9ad0f9ddcc8749507cabe0954272d6f2fa7d9f45b961a1` |
| 5 | `low-contrast.jpg` | A low-contrast Subject. Tests a pale Subject against a pale Background. | 2048 × 1358 | 124,822 | `93159d65646f91f2db9d27c9942af702d7225733aa6ef0bf64072cf411af3ea9` |
| 6 | `alpha-input.png` | A transparent PNG input. Tests an input that already carries an alpha channel. | 2048 × 1536 | 2,102,355 | `5963faf86a838499aa1709e84af88103f2f417f31ea3342bab7b897c0c7eb1ff` |
| 7 | `large-24mp.jpg` | A large image above 24 MP. Tests the full-resolution path and the memory guard. | 6000 × 4344 | 3,527,373 | `eead44dcb392d5c5381eb1383eda96f3d7a4429eec83d2eb48803a72b181d51c` |
| 8a | `first-frame.gif` | An animated GIF with two frames. Frame 1 is the glass subject; frame 2 is a polar bear. Tests the first-frame rule. | 960 × 1440 | 1,004,320 | `d6ec89979705412a63c0d61b4e743799657166fba317c45f416685f8f789bc17` |
| 8b | `first-frame.bmp` | A BMP with the same first frame as the GIF. Tests the first-frame rule and a BMP input. | 960 × 1440 | 4,147,254 | `d5078f112c784d97ada2fdf69f6d1f6e4566ce84f31129ce15520af08fdf5376` |

Total: 13,357,276 bytes.

## Provenance

### 1. Portrait with hair

- Source: "Blowin' in the wind... - Flickr - 2 million- views. Humbled and
  thanks.jpg", Wikimedia Commons.
- Author: Rajarshi MITRA from Mumbai, India.
- Licence: CC BY 2.0. https://creativecommons.org/licenses/by/2.0
- Page: https://commons.wikimedia.org/wiki/File:Blowin%27_in_the_wind..._-_Flickr_-_2_million-_views._Humbled_and_thanks.jpg
- Change: resized to 2400 px on the long edge; JPEG quality 90, progressive.
  No crop.
- Why: the flyaway hair is the hardest edge case for a matte. The bright sky
  also lowers the contrast at the hair.

### 2. Pet with fur

- Source: "Cat in Piran, Slovenia, 20240504 1600 8594.jpg", Wikimedia Commons.
- Author: Jakub Hałun.
- Licence: CC BY 4.0. https://creativecommons.org/licenses/by/4.0
- Page: https://commons.wikimedia.org/wiki/File:Cat_in_Piran,_Slovenia,_20240504_1600_8594.jpg
- Change: resized to 2400 px on the long edge; JPEG quality 90, progressive.
  No crop.
- Why: fur is a fine, low-contrast texture. The wall behind the cat is also
  textured, so a lazy model keeps some of it.

### 3. Product on a busy Background

- Source: "20240907 Flea Market Izmailovo Scalimont Vanity Set.jpg", Wikimedia
  Commons.
- Author: Tess Mattew.
- Licence: CC BY-SA 4.0. https://creativecommons.org/licenses/by-sa/4.0
- Page: https://commons.wikimedia.org/wiki/File:20240907_Flea_Market_Izmailovo_Scalimont_Vanity_Set.jpg
- Change: resized to 2400 px on the long edge; JPEG quality 90, progressive.
  No crop.
- Why: several glass objects share the frame, with reflections and a red cloth.
  The model must choose the Subject and remove the rest. It is the glass and
  busy-Background test.

### 4. Product on a plain Background

- Source: "LRP sunscreen bottle.jpg", Wikimedia Commons.
- Author: Netstars22.
- Licence: CC BY-SA 4.0. https://creativecommons.org/licenses/by-sa/4.0
- Page: https://commons.wikimedia.org/wiki/File:LRP_sunscreen_bottle.jpg
- Change: resized to 2000 px on the long edge; JPEG quality 90, progressive.
  No crop.
- Why: a hard, clean product edge with small label text. A model that erodes
  the edge cuts the text. The plain Background also shows a leftover halo
  clearly.

### 5. Low-contrast Subject

- Source: "Polar bear in Arctic Alaska.jpg", Wikimedia Commons.
- Author: Terry Debruyne, U.S. Fish and Wildlife Service.
- Licence: public domain.
- Page: https://commons.wikimedia.org/wiki/File:Polar_bear_in_Arctic_Alaska.jpg
- Change: unchanged dimensions; JPEG quality 92, progressive.
- Why: a pale bear on a pale snow field. The edge is low contrast and the
  model must not keep the snow.

### 6. Transparent PNG input

- Source: "Blue Flower Transparent Background.png", Wikimedia Commons.
- Author: The People's Internet.
- Licence: CC0 1.0. https://creativecommons.org/publicdomain/zero/1.0/
- Page: https://commons.wikimedia.org/wiki/File:Blue_Flower_Transparent_Background.png
- Change: resized to 2048 px on the long edge; PNG with alpha, optimized. No
  crop. The source page says the uploader changed the hue of the flower.
- Why: the input already has a Cutout. The engine must keep the input alpha and
  must not run the model. The bake-off still scores the model on the file as a
  format test.

### 7. Large image above 24 MP

- Source: "FOOTE, WALTER A., MRS. PORTRAIT. WITH DOG LCCN2016870537.jpg",
  Wikimedia Commons, from the Harris & Ewing Collection at the Library of
  Congress.
- Author: Harris & Ewing, photographer.
- Licence: public domain.
- Page: https://commons.wikimedia.org/wiki/File:FOOTE,_WALTER_A.,_MRS._PORTRAIT._WITH_DOG_LCCN2016870537.jpg
- Change: cropped 200 px from the left and right and 160 px from the top and
  bottom to remove the scan border; resized to 6000 px wide. 6000 × 4344 =
  26.1 MP; JPEG quality 90, progressive.
- Why: the full-resolution path must work above 24 MP. The subject is a woman
  and a dog, with fur and a leash, so the fixture also tests thin structures.

### 8. GIF and BMP first frame

- GIF source 1: "Bright red cocktail in a glass with ice and splash against a
  dark background.jpg", Wikimedia Commons.
- Author 1: Shixart1985.
- Licence 1: CC BY 2.0. https://creativecommons.org/licenses/by/2.0
- Page 1: https://commons.wikimedia.org/wiki/File:Bright_red_cocktail_in_a_glass_with_ice_and_splash_against_a_dark_background.jpg
- GIF source 2: "Polar bear in Arctic Alaska.jpg", Wikimedia Commons.
- Author 2: Terry Debruyne, U.S. Fish and Wildlife Service.
- Licence 2: public domain.
- Page 2: https://commons.wikimedia.org/wiki/File:Polar_bear_in_Arctic_Alaska.jpg
- Change: two frames at 960 × 1440, 1200 ms per frame, loop forever. Frame 1
  is a crop and resize of source 1. Frame 2 is a fit of source 2 on a paper
  field. The GIF as a whole is CC BY 2.0 because of source 1.
- BMP: 24-bit at 960 × 1440, written from frame 1 of the GIF. Source 1 and
  licence 1 apply.
- Why: the first frame must be the glass, not the bear. If a reader takes the
  last frame or an average, the result is visibly wrong. The glass also tests a
  thin stem and a transparent base.

## First-frame proof

Frame 1 is a red cocktail on a dark field. Frame 2 is a polar bear on snow. The
two frames are different in colour and subject. A reader that takes frame 1
shows the glass. A reader that takes frame 2 shows the bear. The engine test
compares the decoded pixels with frame 1 of the GIF and with the BMP. The
fixture check allows a small difference from GIF quantization: the mean
absolute difference must be below 2.

The BMP is the same frame 1. It proves that the BMP path and the GIF path agree.

## Offline rule

- The files are in the repository. The bake-off and the tests read them from
  disk. No fixture is fetched from Wikimedia Commons at test time.
- `fetch_fixtures.py` can rebuild the raw downloads. It is a maintenance
  script, not a test dependency.
- The model files are not fixtures. They are downloaded from the model URLs in
  `model-provenance.json` for the bake-off and are not committed.

## Redistribution

- The MIT licence of the Ritools repository does not apply to these files.
- CC BY 2.0 and CC BY 4.0 files keep their attribution. The notice names the
  author, the source page, the licence, and the change.
- CC BY-SA 4.0 files and their resized copies stay under CC BY-SA 4.0. The
  notice says so.
- Public domain and CC0 files have no condition. The notice still records the
  source.
- The `large-24mp.jpg` is a crop and a resize of a public domain file. It stays
  public domain.
- The GIF is a derivative of a CC BY 2.0 file and a public domain file. The GIF
  as a whole is CC BY 2.0. The BMP is CC BY 2.0.
- A distributor of the repository must keep `NOTICE.txt` with the files.

## Manifest

`manifest.json` has this shape:

```json
{
  "schema": 1,
  "tool": "Unmask",
  "generated": "2026-11-01",
  "fixtures": [
    {
      "file": "portrait-hair.jpg",
      "slug": "portrait-hair",
      "role": "A portrait with flyaway hair. ...",
      "width": 2400,
      "height": 1521,
      "mode": "RGB",
      "bytes": 388410,
      "sha256": "0f7d84...",
      "source": {
        "title": "File:Blowin' in the wind...",
        "page": "https://commons.wikimedia.org/wiki/File:...",
        "file": "https://upload.wikimedia.org/wikipedia/commons/...",
        "author": "Rajarshi MITRA from Mumbai, India",
        "licence": "CC BY 2.0",
        "licenceUrl": "https://creativecommons.org/licenses/by/2.0"
      },
      "changes": "Resized to 2400 px on the long edge; ..."
    }
  ]
}
```

The GIF entry also has `source2` for the polar bear frame.

## Rebuild

The scripts are in `artifacts/unmask/bake-off/scripts/`:

1. `fetch_fixtures.py` reads the Wikimedia Commons API and writes the raw files
   and `fixtures-meta.json`.
2. `build_fixtures.py` resizes, crops, writes the GIF and BMP, and prints the
   bytes and SHA-256.
3. `manifest.json` is regenerated from the raw metadata and the final files.

A rebuild must update the bytes, the SHA-256, and the changelog in the notice.
Do not replace a fixture with a different image without a new bake-off.
