# Epochia: Boden-Textur von Emin/Canva nahtlos machen, Farbe angleichen, verkleinern.
#   python3 neu/tools/textur-einbauen.py quelle.png bilder/epochia/wiese.webp 256 [R,G,B]
# R,G,B = gewünschte Durchschnittsfarbe (z. B. damit die Wiese zum Gras der Gebäudebilder passt)
import sys
from PIL import Image, ImageChops

src, dst, size = sys.argv[1], sys.argv[2], int(sys.argv[3])
im = Image.open(src).convert('RGB').resize((size, size), Image.LANCZOS)
# nahtlos: um die halbe Breite verschobene Kopie (deren Ränder passen sicher) zur Mitte hin überblenden
shifted = ImageChops.offset(im, size // 2, size // 2)
mask = Image.new('L', (size, size))
px = mask.load()
for y in range(size):
    for x in range(size):
        d = min(x, y, size - 1 - x, size - 1 - y) / (size / 2)   # 0 am Rand, 1 in der Mitte
        px[x, y] = int(255 * min(1, d * 2.2))
im = Image.composite(im, shifted, mask)
if len(sys.argv) > 4:
    want = [int(v) for v in sys.argv[4].split(',')]
    have = [sum(c) / (size * size) for c in zip(*im.getdata())]
    bands = [b.point(lambda v, f=w / h: min(255, int(v * f))) for b, w, h in zip(im.split(), want, have)]
    im = Image.merge('RGB', bands)
im.save(dst, quality=85, method=6)
print(dst, im.size)
