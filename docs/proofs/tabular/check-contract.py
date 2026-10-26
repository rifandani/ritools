"""Check issue 18 documents, paired copy, fixtures, and TypeScript examples."""

from collections import Counter
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess

errors = []
documents = list(Path("docs/plans/tabular").glob("*.md")) + [
    Path("apps/web/.impeccable/surfaces/src-features-tabular.md"),
    Path("docs/proofs/tabular/README.md"),
]
for path in documents:
    text = path.read_text()
    if len(re.findall(r"^```", text, re.M)) % 2:
        errors.append(f"{path}: unmatched code fence")
    for link in re.findall(r"\]\(([^)]+)\)", text):
        if not re.match(r"[a-z]+:|#", link) and not (path.parent / link.split("#")[0]).exists():
            errors.append(f"{path}: missing {link}")
keys = []
for line in Path("docs/plans/tabular/copy.md").read_text().splitlines():
    cells = [cell.strip() for cell in line.strip("|").split("|")]
    if len(cells) != 3 or cells[0] in ["Key suffix", "Tag / key suffix", "---"]:
        continue
    keys.append(cells[0])
    if Counter(re.findall(r"\{([^}]+)\}", cells[1])) != Counter(re.findall(r"\{([^}]+)\}", cells[2])):
        errors.append(f"Placeholder mismatch: {cells[0]}")
if len(set(keys)) != len(keys):
    errors.append("Duplicate message keys")
fixtures = json.loads(Path("docs/proofs/tabular/samples/manifest.json").read_text())
for fixture in fixtures:
    data = (Path("docs/proofs/tabular/samples") / fixture["name"]).read_bytes()
    if len(data) != fixture["bytes"] or hashlib.sha256(data).hexdigest() != fixture["sha256"]:
        errors.append(f"Fixture hash mismatch: {fixture['name']}")
scratch = Path(os.environ.get("TABULAR_PROBE_DIR", "/tmp/ritools-tabular-18"))
scratch.mkdir(parents=True, exist_ok=True)
contract = Path("docs/plans/tabular/engine-interface.md").read_text()
example = scratch / "contract.ts"
# The examples form one module, not a global script with DOM History/Location.
example.write_text("export {};\n" + "\n".join(re.findall(r"```ts\n(.*?)```", contract, re.S)))
check = subprocess.run([
    "rtk", "proxy", "node_modules/.bin/tsc", "--ignoreConfig", "--noEmit",
    "--skipLibCheck", "--strict", "--target", "ESNext", "--module", "preserve", str(example),
], capture_output=True, text=True)
if check.returncode:
    errors.append(check.stdout + check.stderr)
result = {"documents": len(documents), "pairedMessages": len(keys), "fixtures": len(fixtures),
          "typescriptExamples": check.returncode == 0, "errors": errors}
Path("docs/proofs/tabular/evidence/contract-check.json").write_text(json.dumps(result, indent=2) + "\n")
print(json.dumps(result, indent=2))
if errors:
    raise SystemExit(1)
