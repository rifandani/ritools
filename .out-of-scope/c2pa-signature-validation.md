# C2PA signature validation

Expose reports whether a C2PA Manifest is present, how many bytes it holds, and what it claims. It does not validate the signature, and it does not decide whether the signer is trusted.

## Why this is out of scope

Validation is a chain of checks, not one cryptographic test. A validator must verify the claim signature, build the certificate chain to a trust anchor, check the signing time against the certificate validity, check the revocation state, and verify the hard binding to the image bytes. A partial check produces a confident answer that can be wrong.

The C2PA trust list changes. A shipped list is dated, and an offline check cannot see a revocation that happened after the build. The UI would then have to carry the list date in every state, and "Valid" would mean "valid against the list we shipped", not "valid now". That weakens the product principle "Verifiable claims only".

The validator also adds weight to the viewer. The read path loads ExifReader only. A WASM validator and a trust list would add a second lazy load, or a large first load, and the report would show "Unknown" until it finishes.

The current evidence card is honest and useful. It shows the presence, the size, the claim generator, and the "Claimed signer". It says, in plain words, that Expose does not validate the signature. A user who needs a verdict can use the official verifier, but that service uploads the file, so ADR-0007 rules it out as a link in the Tool.

A valid manifest proves only that the claim was signed. It does not prove that the image content is true, and a missing manifest does not prove that the image is human-made. Expose already states both limits.

If a local validator becomes practical later, the correct next step is a new decision issue with a new ADR. That issue must name the validator, the trust-list update policy, the revocation policy, the four states (Valid, Invalid, Trusted, Unknown), and the sample set. That is a new shape, not a change to this one.

## Prior requests

- #14: "[Decision] Expose: validate C2PA signatures"
