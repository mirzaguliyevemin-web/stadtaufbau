# Epochia: Winterbilder – frisst das Freistellen weißen Schnee am Plattenrand weg, füllt das die Platten-Raute wieder deckend.
#   python3 neu/tools/platte-fuellen.py bilder/epochia/gebaeude/jagdhuette/2-jagdhuette-winter.webp
import sys
from PIL import Image, ImageDraw
datei = sys.argv[1]
a = Image.open(datei).convert('RGBA'); w, h = a.size
al = a.getchannel('A').load()
pts = [(x, y) for y in range(h // 3, h) for x in range(w) if al[x, y] > 200]
L = min(pts); R = max(pts); B = max(pts, key=lambda p: p[1])
cx, cy = (L[0] + R[0]) / 2, (L[1] + R[1]) / 2
T = (2 * cx - B[0], 2 * cy - B[1])
print('Ecken', L, R, B, T)
m = Image.new('L', (w, h), 0); ImageDraw.Draw(m).polygon([L, B, R, T], fill=255)
mk = m.load(); px = a.load(); n = 0
for y in range(h):
    for x in range(w):
        if mk[x, y] and px[x, y][3] < 255:
            r, g, b, al2 = px[x, y]
            if al2 == 0: r, g, b = 250, 251, 252
            px[x, y] = (r, g, b, 255); n += 1
print(n, 'Punkte gefüllt')
a.save(datei, quality=86, method=6)
