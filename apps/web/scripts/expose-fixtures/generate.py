"""Generate CC0 test containers. Requires Python 3 and FFmpeg; no remote inputs."""
from pathlib import Path
import hashlib
import json
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parents[2] / 'src/features/expose/fixtures'

def run(*args):
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', *args], check=True)

run('-f', 'lavfi', '-i', 'color=c=blue:s=32x24:d=0.1', '-frames:v', '1', '-update', '1', str(ROOT/'cover.jpg'))

for ext in ['mp4', 'mov', 'm4v', 'webm', 'mkv', 'avi']:
    codec = 'libvpx-vp9' if ext == 'webm' else 'mpeg4'
    target = ROOT / f'metadata.{ext}'
    # An M4V extension defaults to raw video in FFmpeg. Select the MP4 container.
    run('-f', 'lavfi', '-i', 'color=c=blue:s=32x24:d=0.2', '-c:v', codec,
        '-metadata', 'title=Fixture title', '-metadata', 'artist=Fixture author',
        *(['-metadata', 'comment=Fixture comment'] if ext != 'mov' else []), '-metadata', 'creation_time=2020-01-02T03:04:05Z',
        *(['-f', 'mp4', '-brand', 'M4V '] if ext == 'm4v' else []), str(target))
for ext, codec in [('m4a','aac'), ('mp3','libmp3lame'), ('wav','pcm_s16le'), ('flac','flac'), ('ogg','libopus')]:
    run('-f', 'lavfi', '-i', 'sine=frequency=440:duration=0.2', '-c:a', codec,
        '-metadata', 'title=Fixture title', '-metadata', 'artist=Fixture author',
        '-metadata', 'comment=Fixture comment', str(ROOT / f'metadata.{ext}'))

# Cover art in the supported audio writer and the read-only ID3 reader.
for ext in ['m4a', 'mp3']:
    original = ROOT / f'metadata.{ext}'
    temporary = ROOT / f'with-cover.{ext}'
    run('-i', str(original), '-i', str(ROOT/'cover.jpg'), '-map', '0:a', '-map', '1:v', '-c', 'copy', '-disposition:v:0', 'attached_pic', str(temporary))
    temporary.replace(original)

# A complete, deterministic one-page PDF with an Info dictionary.
objects = [b'<< /Type /Catalog /Pages 2 0 R >>', b'<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
           b'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 100 100] /Contents 4 0 R >>',
           b'<< /Length 18 >>\nstream\n0 0 10 10 re S\n\nendstream',
           b'<< /Title (Fixture title) /Author (Fixture author) /Creator (Ritools fixture generator) /CreationDate (D:20200102030405Z) >>']
pdf = bytearray(b'%PDF-1.4\n'); offsets = [0]
for index, obj in enumerate(objects, 1):
    offsets.append(len(pdf)); pdf.extend(f'{index} 0 obj\n'.encode() + obj + b'\nendobj\n')
xref = len(pdf); pdf.extend(f'xref\n0 {len(offsets)}\n0000000000 65535 f \n'.encode())
for offset in offsets[1:]: pdf.extend(f'{offset:010d} 00000 n \n'.encode())
pdf.extend(f'trailer\n<< /Root 1 0 R /Info 5 0 R /Size {len(offsets)} >>\nstartxref\n{xref}\n%%EOF\n'.encode())
(ROOT / 'metadata.pdf').write_bytes(pdf)

core = '''<?xml version="1.0"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/"><dc:title>Fixture title</dc:title><dc:creator>Fixture author</dc:creator><cp:lastModifiedBy>Fixture editor</cp:lastModifiedBy><dcterms:created>2020-01-02T03:04:05Z</dcterms:created><dcterms:modified>2020-01-03T03:04:05Z</dcterms:modified></cp:coreProperties>'''
app = '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>Fixture generator</Application><AppVersion>1.0</AppVersion><Company>Fixture company</Company></Properties>'
custom = '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/custom-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><property fmtid="{D5CDD505-2E9C-101B-9397-08002B2CF9AE}" pid="2" name="__proto__"><vt:lpwstr>Fixture value</vt:lpwstr></property></Properties>'
for ext, main, ct, xml in [
    ('docx','word/document.xml','wordprocessingml.document','<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Fixture content</w:t></w:r></w:p></w:body></w:document>'),
    ('xlsx','xl/workbook.xml','spreadsheetml.sheet','<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheets/></workbook>'),
    ('pptx','ppt/presentation.xml','presentationml.presentation','<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:sldIdLst/></p:presentation>')]:
    types = f'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/{main}" ContentType="application/vnd.openxmlformats-officedocument.{ct}.main+xml"/></Types>'
    with zipfile.ZipFile(ROOT / f'metadata.{ext}', 'w', zipfile.ZIP_DEFLATED) as archive:
        for name, data in [('[Content_Types].xml',types), ('_rels/.rels',f'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="r1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="{main}"/></Relationships>'), (main,xml), ('docProps/core.xml',core), ('docProps/app.xml',app), ('docProps/custom.xml',custom)]:
            info = zipfile.ZipInfo(name, date_time=(2020,1,2,0,0,0)); info.compress_type = zipfile.ZIP_DEFLATED
            archive.writestr(info,data)
        info=zipfile.ZipInfo('docProps/thumbnail.jpeg',date_time=(2020,1,2,0,0,0)); info.compress_type=zipfile.ZIP_DEFLATED
        archive.writestr(info,(ROOT/'cover.jpg').read_bytes())

files=[]
for ext in ['pdf','mp4','mov','m4v','webm','mkv','avi','m4a','mp3','wav','flac','ogg','docx','xlsx','pptx','cover']:
    path=ROOT/('cover.jpg' if ext=='cover' else f'metadata.{ext}'); data=path.read_bytes()
    files.append({'file':path.name,'source':'Generated by apps/web/scripts/expose-fixtures/generate.py','licence':'CC0-1.0','bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
(ROOT/'FILES.json').write_text(json.dumps(files,indent=2)+'\n')
