"""Fetch pinned proof packages to /tmp. Do not install an app dependency."""

import hashlib
import io
import os
from pathlib import Path
import shutil
import tarfile
import urllib.request

scratch = Path(os.environ.get("TABULAR_PROBE_DIR", "/tmp/ritools-tabular-18"))
packages = [
    ("rdg", "https://registry.npmjs.org/react-data-grid/-/react-data-grid-7.0.0-beta.63.tgz", "e09f314bbcc034092d963024a40bcbbd0d651bc167ac3463eecbec08a463b63e"),
    ("sheetjs", "https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz", "8dc73fc3b00203e72d176e85b50938627c7b086e607c682e8d3c22c02bb99fe8"),
    ("papa", "https://registry.npmjs.org/papaparse/-/papaparse-5.7.0.tgz", "263bac53bab292390bcf2697a8c14f0bc382ab3c192fa088e1caa9a8241956b1"),
]
for name, url, expected in packages:
    with urllib.request.urlopen(url, timeout=60) as response:
        data = response.read()
    actual = hashlib.sha256(data).hexdigest()
    if actual != expected:
        raise ValueError(f"Package hash mismatch: {name}")
    target = scratch / "vendor" / name
    target.mkdir(parents=True, exist_ok=True)
    with tarfile.open(fileobj=io.BytesIO(data), mode="r:gz") as archive:
        for member in archive.getmembers():
            parts = Path(member.name).parts[1:]
            if not parts or ".." in parts or member.issym() or member.islnk():
                continue
            path = target.joinpath(*parts)
            if member.isdir():
                path.mkdir(parents=True, exist_ok=True)
            elif member.isfile():
                path.parent.mkdir(parents=True, exist_ok=True)
                with archive.extractfile(member) as source, path.open("wb") as output:
                    shutil.copyfileobj(source, output)
    print(f"{name}: SHA-256 {actual}")
