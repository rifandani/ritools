# Qraft writes every symbology in the browser with etiket

Qraft is the fifth Tool. It writes QR codes, 2D codes, 1D barcodes, and postal codes, styles them, and exports SVG, PNG, and label sheets. A server encoder would receive the Payload, and ADR-0007 says a Tool runs on local data only. A hand-written encoder for 40+ symbologies is not feasible. Qraft uses `etiket` 1.0.0, a zero-dependency, tree-shakeable library that writes every required Symbology and verifies each one against an external decoder or BWIPP.

The default QR renders on the server, because `etiket` is pure and has no DOM dependency. The non-QR Code Families load on the client on demand, so the first load carries only the QR family. Qraft imports the `etiket/qr`, `etiket/2d`, `etiket/barcode`, `etiket/postal`, `etiket/png`, and `etiket/validators` subpaths, so the bundler drops the encoders a session does not use. JAB Code is excluded: no decoder or reference encoder can verify it, and the product principle is "Verifiable claims only".

## Considered Options

- `qrcode` or `uqr` — rejected; QR only, no styling depth, no 1D or 2D
- `bwip-js` — rejected; large, no styled QR, no gradients or logo
- `qr-code-styling` — rejected; QR only, and it carries dependencies
- A server encoder — rejected; it receives the Payload, which violates ADR-0007
- A hand-written encoder — rejected; 40+ symbologies is too large to maintain and verify
