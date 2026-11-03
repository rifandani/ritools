# Quill keeps Markdown and protects unsupported source

Quill keeps Markdown text as the document source of truth. Its visual editor
may normalize supported Markdown after an edit, including blank lines and list
markers. An editor-specific JSON document is a derived working model, not the
only saved copy. This keeps the Library portable and prevents the chosen editor
from owning the user's document format.

Each import retains its original bytes as an Import Original. An import or
source edit with syntax outside the supported visual profile opens in source
mode. Switching that document to visual editing requires an explicit conversion
with a description of the affected content and a recovery copy of the current
source. A parse error never authorizes replacement with partial or empty output.
An uncertain compatibility check keeps the document in source mode.

Exact source formatting after a visual edit is not promised. A Markdown export
before any edit keeps the import bytes. A source-mode edit exports the current
source without a visual-editor conversion. These rules were chosen over exact
format preservation because visual writing is the primary interaction, while
source mode and recovery copies protect content the editor cannot represent.
