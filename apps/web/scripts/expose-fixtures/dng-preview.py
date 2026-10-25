"""Add an original FFmpeg test-pattern JPEG to both original LinearRaw DNGs."""
import pathlib
import struct
import subprocess
import tempfile

fixtures = pathlib.Path(__file__).resolve().parents[2] / "src/features/expose/fixtures"
with tempfile.TemporaryDirectory() as directory:
    jpeg_path = pathlib.Path(directory) / "preview.jpg"
    subprocess.run([
        "ffmpeg", "-loglevel", "error", "-f", "lavfi", "-i",
        "testsrc=size=24x16:rate=1", "-frames:v", "1", "-threads", "1", str(jpeg_path),
    ], check=True)
    jpeg = jpeg_path.read_bytes()
# EXIF orientation 6. Browsers rotate the JPEG without a RAW decoder.
# The tag count is 32 bits, and the inline SHORT orientation occupies four bytes.
exif = b"Exif\0\0II" + struct.pack("<HIHHHIHHI", 42, 8, 1, 274, 3, 1, 6, 0, 0)
jpeg = jpeg[:2] + b"\xff\xe1" + struct.pack(">H", len(exif) + 2) + exif + jpeg[2:]
for order, endian in [("le", "<"), ("be", ">")]:
    data = bytearray((fixtures / f"linear-raw-{order}.dng").read_bytes())
    jpeg_offset = len(data)
    count = struct.unpack_from(endian + "H", data, 8)[0]
    for index in range(count):
        at = 10 + index * 12
        tag = struct.unpack_from(endian + "H", data, at)[0]
        replacements = {256: 24, 257: 16, 259: 7, 262: 6, 273: jpeg_offset, 278: 16, 279: len(jpeg)}
        if tag in replacements:
            kind = struct.unpack_from(endian + "H", data, at + 2)[0]
            struct.pack_into(endian + ("H" if kind == 3 else "I"), data, at + 8, replacements[tag])
        if tag == 258:
            bits_at = struct.unpack_from(endian + "I", data, at + 8)[0]
            struct.pack_into(endian + "HHH", data, bits_at, 8, 8, 8)
    data.extend(jpeg)
    (fixtures / f"linear-raw-preview-{order}.dng").write_bytes(data)

# A reduced, uncompressed RGB preview, as found in the Canon camera sample.
for order, endian in [("le", "<"), ("be", ">")]:
    data = bytearray((fixtures / f"linear-raw-{order}.dng").read_bytes())
    rgb_offset = len(data)
    # Six distinct pixels in two columns and three rows; IFD orientation is 6.
    rgb = bytes([255, 0, 0, 0, 255, 0, 0, 0, 255, 255, 255, 0, 255, 0, 255, 0, 255, 255])
    replacements = {256: 2, 257: 3, 259: 1, 262: 2, 273: rgb_offset, 278: 3, 279: len(rgb)}
    count = struct.unpack_from(endian + "H", data, 8)[0]
    for index in range(count):
        at = 10 + index * 12
        tag, kind = struct.unpack_from(endian + "HH", data, at)
        if tag in replacements:
            struct.pack_into(endian + ("H" if kind == 3 else "I"), data, at + 8, replacements[tag])
        if tag == 258:
            bits_at = struct.unpack_from(endian + "I", data, at + 8)[0]
            struct.pack_into(endian + "HHH", data, bits_at, 8, 8, 8)
    data.extend(rgb)
    (fixtures / f"linear-raw-rgb-{order}.dng").write_bytes(data)
