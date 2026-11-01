# Winterbild freistellen: python3 neu/tools/winter-freistellen.py quelle.png ziel.webp 247 – nur fast reines Weiß ist Hintergrund, Schnee bleibt
import sys
from collections import deque
from PIL import Image, ImageFilter
src,dst=sys.argv[1],sys.argv[2]; T=int(sys.argv[3]) if len(sys.argv)>3 else 253
im=Image.open(src).convert('RGB'); w,h=im.size; px=im.load()
mask=Image.new('L',(w,h),0); m=mask.load()
q=deque([(x,y) for x in range(w) for y in (0,h-1)]+[(x,y) for y in range(h) for x in (0,w-1)])
white=lambda p:p[0]>=T and p[1]>=T and p[2]>=T
while q:
    x,y=q.popleft()
    if m[x,y] or not white(px[x,y]): continue
    m[x,y]=255
    if x>0:q.append((x-1,y))
    if x<w-1:q.append((x+1,y))
    if y>0:q.append((x,y-1))
    if y<h-1:q.append((x,y+1))
# nur das größte zusammenhängende Stück behalten (Schnee-Sprenkel im Hintergrund weg)
seen=bytearray(w*h); best=[]
for sy in range(h):
    for sx in range(w):
        if m[sx,sy] or seen[sy*w+sx]: continue
        comp=[]; st=[(sx,sy)]; seen[sy*w+sx]=1
        while st:
            x,y=st.pop(); comp.append((x,y))
            for nx,ny in ((x+1,y),(x-1,y),(x,y+1),(x,y-1)):
                if 0<=nx<w and 0<=ny<h and not m[nx,ny] and not seen[ny*w+nx]:
                    seen[ny*w+nx]=1; st.append((nx,ny))
        if len(comp)>len(best): best=comp
keep=set(best)
for y in range(h):
    for x in range(w):
        if not m[x,y] and (x,y) not in keep: m[x,y]=255
alpha=Image.eval(mask,lambda v:255-v).filter(ImageFilter.GaussianBlur(1.0))
out=im.convert('RGBA'); out.putalpha(alpha); out=out.crop(out.getbbox()); out.thumbnail((640,640),Image.LANCZOS)
out.save(dst,quality=88,method=6); print(dst,out.size)
