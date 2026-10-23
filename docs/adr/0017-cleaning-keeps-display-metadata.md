# Cleaning keeps display metadata

"Completely clean" cannot mean "remove every metadata field": the ICC profile, the orientation, and the dimensions control how the image displays, and removing them can shift colors or rotate the image. Expose removes the selected semantic groups and always keeps these display fields. The Verification report names them separately from the removable fields.

The cost is a promise narrower than "zero metadata". The copy says what stays and why. An advanced option to remove the ICC profile or the orientation is out of scope.

## Consequences

- The Everything preset removes every removable group, not every byte of metadata.
- The Verification result counts the remaining fields in the selected groups, the remaining fields in the kept groups, and the Display Metadata that stays.
