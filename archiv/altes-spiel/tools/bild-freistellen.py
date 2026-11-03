# Gebäudebild für das Spiel vorbereiten: weißen Hintergrund (vom Rand her) transparent machen,
# zuschneiden und verkleinern.  python3 tools/bild-freistellen.py quelle.png bilder/1-hut.webp 384
import sys
from PIL import Image, ImageDraw, ImageFilter
src, dst, size = sys.argv[1], sys.argv[2], int(sys.argv[3])
im = Image.open(src).convert('RGB')
w, h = im.size
mask = Image.new('L', (w, h), 0)
# Flutfüllung vom Rand: Pixel, die fast weiß sind, gehören zum Hintergrund
px = im.load(); m = mask.load()
from collections import deque
q = deque()
def white(p): return p[0] > 235 and p[1] > 235 and p[2] > 235
for x in range(w):
    for y in (0, h - 1): q.append((x, y))
for y in range(h):
    for x in (0, w - 1): q.append((x, y))
while q:
    x, y = q.popleft()
    if m[x, y] or not white(px[x, y]): continue
    m[x, y] = 255
    if x > 0: q.append((x - 1, y))
    if x < w - 1: q.append((x + 1, y))
    if y > 0: q.append((x, y - 1))
    if y < h - 1: q.append((x, y + 1))
alpha = Image.eval(mask, lambda v: 255 - v).filter(ImageFilter.GaussianBlur(1.2))
out = im.convert('RGBA'); out.putalpha(alpha)
out = out.crop(out.getbbox())
out.thumbnail((size, size), Image.LANCZOS)
out.save(dst, quality=88, method=6) if dst.endswith('.webp') else out.save(dst, optimize=True)
print(dst, out.size)
