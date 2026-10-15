"""Render native vector identity and an OG card; run with the bundled SUIT Variable font path."""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
import sys,base64,json,subprocess
root=Path(__file__).resolve().parents[1]
font=TTFont(sys.argv[1]);glyphs=font.getGlyphSet();cmap=font.getBestCmap();units=font['head'].unitsPerEm
mark='''<path d="M170 112h126l58 58v220H170c-18 0-32-14-32-32V144c0-18 14-32 32-32Z" fill="white"/><path d="M290 112v65h64" fill="#bed6ff"/><path d="M207 323v-66c0-22 18-40 40-40s40 18 40 40v24" fill="none" stroke="#2569dc" stroke-width="24" stroke-linecap="round"/><circle cx="207" cy="334" r="18" fill="#2569dc"/><circle cx="287" cy="301" r="18" fill="#2569dc"/>'''
def logo(mask=False):
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" '+('' if mask else 'rx="116"')+' fill="#2569dc"/>'+mark+'</svg>'
icons=root/'public/icons';(icons/'tripnote.svg').write_text(logo());(icons/'tripnote-maskable.svg').write_text(logo(True))

def text(s,x,y,size,color='#17191d'):
 scale=size/units;cursor=0;parts=[]
 for char in s:
  name=cmap.get(ord(char),'.notdef');pen=SVGPathPen(glyphs);glyphs[name].draw(pen)
  path=pen.getCommands()
  if path:parts.append(f'<path d="{path}" transform="translate({cursor} 0)"/>')
  cursor+=font['hmtx'].metrics[name][0]
 return f'<g fill="{color}" transform="translate({x} {y}) scale({scale} {-scale})">'+''.join(parts)+'</g>'
photo=root/'public/images/places/tenryuji-garden.jpg'
data=base64.b64encode(photo.read_bytes()).decode()
card='<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><defs><clipPath id="photo"><rect x="600" y="24" width="576" height="582" rx="20"/></clipPath></defs><rect width="1200" height="630" fill="#fff"/><rect x="600" y="24" width="576" height="582" rx="20" fill="#eaf0f4"/><image href="data:image/jpeg;base64,'+data+'" x="600" y="24" width="576" height="582" preserveAspectRatio="xMidYMid slice" clip-path="url(#photo)"/><rect x="600" y="558" width="576" height="48" fill="#162831" opacity=".75" clip-path="url(#photo)"/>'
card+='<g transform="translate(48 48) scale(.125)"><rect width="512" height="512" rx="112" fill="#2569dc"/>'+mark+'</g>'
card+=text('우리 가족 여행노트',130,90,25)
card+=text('오사카·교토',48,238,58)+text('가족여행 2026',48,310,58)
card+=text('일정, 이동 지도, 공항 안내를 한곳에.',48,376,23,'#626b77')
card+='<rect x="48" y="418" width="320" height="48" rx="8" fill="#eef5ff"/>'+text('2026.10.21–24  ·  3박 4일',66,450,20,'#2569dc')
card+=text('가족과 함께 보는 여행 준비와 하루의 동선',48,548,20,'#626b77')
card+=text('교토 · 텐류지 소겐치 정원',622,581,16,'#ffffff')+text('Photo: 663highland / CC BY-SA 3.0 · cropped',622,598,10,'#ffffff')
card+='</svg>'
(root/'public/images/share/tripnote-og.svg').write_text(card)
# Sharp rasterizes SVG and the embedded, credited local photograph.
js='''const sharp=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/sharp'); const fs=require('fs'); const p=process.argv[1]; (async()=> { for(const n of [32,180,192,512]) await sharp(p+'/public/icons/'+(n===180?'tripnote-maskable.svg':'tripnote.svg')).resize(n,n).png().toFile(p+'/public/icons/tripnote-'+n+'.png'); await sharp(p+'/public/icons/tripnote-maskable.svg').resize(512,512).png().toFile(p+'/public/icons/tripnote-maskable-512.png'); await sharp(p+'/public/images/share/tripnote-og.svg').jpeg({quality:90}).toFile(p+'/public/images/share/tripnote-og-v1.jpg'); })().catch(e=>{console.error(e);process.exit(1)});'''
subprocess.run(['node','-e',js,str(root)],check=True)
