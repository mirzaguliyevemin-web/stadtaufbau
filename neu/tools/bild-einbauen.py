# Epochia: Bild von Emin fürs Spiel vorbereiten – weißen Hintergrund freistellen, zuschneiden, als WebP speichern
# und messen, wo die vordere Ecke der Grasplatte liegt (anker = Anteil der Bildhöhe).
#   python3 neu/tools/bild-einbauen.py quelle.png bilder/epochia/gebaeude/lagerfeuer/1-lagerfeuer.webp 640
#   python3 neu/tools/bild-einbauen.py quelle.png bilder/epochia/oberflaeche/start.webp 1600 --ganz   (ohne Freistellen)
#   python3 neu/tools/bild-einbauen.py quelle.png bilder/epochia/gebaeude/x/1-x-winter.webp 640 --schnee
#     Winterbilder: nur genau die Hintergrundfarbe freistellen (sonst frisst das Freistellen den Schnee am Rand).
#     Frisst es trotzdem Löcher in den Schnee: zusätzlich --toleranz=1 (Standard 5).
#     Dazu --loecher nur bei Bildern ohne Platte (Säulen): entfernt auch eingeschlossenen Hintergrund; auf Schnee würde das Löcher reißen.
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
snow = '--schnee' in sys.argv
corners = sorted(px[c] for c in [(2, 2), (w - 3, 2), (2, h - 3), (w - 3, h - 3)])
bg = corners[1]
tol = next((int(x.split('=')[1]) for x in sys.argv if x.startswith('--toleranz=')), 5)   # Schnee fast wie der Hintergrund: kleiner wählen
white = (lambda p: max(abs(p[i] - bg[i]) for i in range(3)) <= tol) if snow else (lambda p: p[0] > 232 and p[1] > 232 and p[2] > 232)
while q:
    x, y = q.popleft()
    if m[x, y] or not white(px[x, y]):
        continue
    m[x, y] = 255
    if x > 0: q.append((x - 1, y))
    if x < w - 1: q.append((x + 1, y))
    if y > 0: q.append((x, y - 1))
    if y < h - 1: q.append((x, y + 1))
if '--loecher' in sys.argv:   # eingeschlossene Flächen in Hintergrundfarbe (ab 300 Punkten)
    seen = bytearray(w * h)
    for sy in range(h):
        for sx in range(w):
            if seen[sy * w + sx] or m[sx, sy] or not white(px[sx, sy]):
                continue
            part, st = [], [(sx, sy)]
            seen[sy * w + sx] = 1
            while st:
                x, y = st.pop()
                part.append((x, y))
                for a, b in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                    if 0 <= a < w and 0 <= b < h and not seen[b * w + a] and not m[a, b] and white(px[a, b]):
                        seen[b * w + a] = 1
                        st.append((a, b))
            if len(part) >= 300:
                for x, y in part:
                    m[x, y] = 255
if snow:   # Flecken im Hintergrund (bei kleiner Toleranz): nur das größte zusammenhängende Stück behalten
    seen = bytearray(w * h)
    best = []
    for sy in range(h):
        for sx in range(w):
            if seen[sy * w + sx] or m[sx, sy]:
                continue
            part, st = [], [(sx, sy)]
            seen[sy * w + sx] = 1
            while st:
                x, y = st.pop()
                part.append((x, y))
                for a, c in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                    if 0 <= a < w and 0 <= c < h and not seen[c * w + a] and not m[a, c]:
                        seen[c * w + a] = 1
                        st.append((a, c))
            if len(part) > len(best):
                best = part
    keep = set(best)
    for y in range(h):
        for x in range(w):
            if not m[x, y] and (x, y) not in keep:
                m[x, y] = 255
alpha = Image.eval(mask, lambda v: 255 - v).filter(ImageFilter.GaussianBlur(1.0))
out = im.convert('RGBA')
out.putalpha(alpha)
out = out.crop(out.getbbox())
out.thumbnail((size, size), Image.LANCZOS)

out.save(dst, quality=88, method=6)
print(dst, out.size)
