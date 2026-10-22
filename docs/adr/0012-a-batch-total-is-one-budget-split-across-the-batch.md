# A Batch total is one budget split across the Batch

In Batch total mode, one byte budget covers the whole Batch. The budget is split evenly first: `share = floor(total / N)`, with a 10 KB floor per image. Unused bytes from images that fit under their share form a pool. One redistribution pass shares that pool equally among the misses, capped at what each one needs, and returns leftover from a capped miss to the rest until the pool is smaller than one byte per remaining miss or every need is met. A miss that now fits re-runs under its raised Target.

An even split alone is predictable but wastes the budget: one 40 KB image can leave 160 KB unused while another image misses by 10 KB. Sequential remaining-budget allocation uses the bytes but punishes the images that arrive first. The even split plus one redistribution pass is deterministic, order-independent for the split, and uses the unused bytes where they can still change an outcome.

Per-image overrides are disabled in this mode: the mode's point is one budget, and an override has no meaning against a share. Multi is disabled because one budget cannot describe three files per image.

## Consequences

A Batch total is a budget, not a promise: if the pool cannot cover every need, some rows stay Miss and the summary says how far over the total the Batch lands. Adding or removing a file changes the share and marks every result stale; the run holds the settings snapshot it started with. The per-image budget is shown live in the settings group. The redistribution is deterministic for a given set of images and results.
