# Epochia: Bild von Emin fürs Spiel vorbereiten – weißen Hintergrund freistellen, zuschneiden, als WebP speichern
# und messen, wo die vordere Ecke der Grasplatte liegt (anker = Anteil der Bildhöhe).
#   python3 neu/tools/bild-einbauen.py quelle.png bilder/epochia/1-lagerfeuer.webp 640
#   python3 neu/tools/bild-einbauen.py quelle.png bilder/epochia/start.webp 1600 --ganz   (ohne Freistellen)
import sys
from collections import deque
from PIL import Image, ImageFilter

src, dst, size = sys.argv[1], sys.argv[2], int(sys.argv[3])
im = Image.open(src).convert('RGB')
if '--ganz' in sys.argv:
    im.thumbnail((size, size), Image.LANCZOS)
    im.save(dst, quality=82, method=6)
    print(dst, im.size)
    sys.exit()

w, h = im.size
mask = Image.new('L', (w, h), 0)
px, m = im.load(), mask.load()
q = deque([(x, y) for x in range(w) for y in (0, h - 1)] + [(x, y) for y in range(h) for x in (0, w - 1)])
white = lambda p: p[0] > 232 and p[1] > 232 and p[2] > 232
while q:
    x, y = q.popleft()
    if m[x, y] or not white(px[x, y]):
        continue
    m[x, y] = 255
    if x > 0: q.append((x - 1, y))
    if x < w - 1: q.append((x + 1, y))
    if y > 0: q.append((x, y - 1))
    if y < h - 1: q.append((x, y + 1))
alpha = Image.eval(mask, lambda v: 255 - v).filter(ImageFilter.GaussianBlur(1.0))
out = im.convert('RGBA')
out.putalpha(alpha)
out = out.crop(out.getbbox())
out.thumbnail((size, size), Image.LANCZOS)

out.save(dst, quality=88, method=6)
print(dst, out.size)
