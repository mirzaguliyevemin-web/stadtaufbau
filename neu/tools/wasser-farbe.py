# Epochia: Wasser in einem Gebäudebild an die Flussfarbe im Spiel angleichen (Wunsch Emin, 07.11.2026).
# Färbt nur Pixel um, die wie Wasser aussehen (blau bis türkis, kräftig genug), und behält Hell-Dunkel und Glanzlichter.
#   python3 neu/tools/wasser-farbe.py bilder/epochia/gebaeude/pfahlbau/1-pfahlbau.webp [weitere.webp …]
# Zielfarbe ist der Mittelwert des Wassers in bilder/epochia/gelaende/wasser.webp.
import sys, colorsys
from PIL import Image

TEXTUR = 'bilder/epochia/gelaende/wasser.webp'

def ist_wasser(h, s, v):
    return 0.43 <= h <= 0.62 and s >= 0.28 and v >= 0.30   # Farbton etwa 155°–225°

def mittel(pixel):
    n = len(pixel) or 1
    return [sum(p[i] for p in pixel) / n for i in range(3)]

def hsv_liste(im):
    return [colorsys.rgb_to_hsv(r / 255, g / 255, b / 255) for r, g, b, a in im.getdata() if a > 200]

ziel = mittel([p for p in hsv_liste(Image.open(TEXTUR).convert('RGBA')) if ist_wasser(*p)])

for datei in sys.argv[1:]:
    im = Image.open(datei).convert('RGBA')
    px = im.load()
    w, h = im.size
    wasser = [(x, y) for y in range(h) for x in range(w)
              if px[x, y][3] > 0 and ist_wasser(*colorsys.rgb_to_hsv(*(c / 255 for c in px[x, y][:3])))]
    if not wasser:
        print(datei, 'kein Wasser gefunden'); continue
    ist = mittel([colorsys.rgb_to_hsv(*(c / 255 for c in px[x, y][:3])) for x, y in wasser])
    fs, fv = ziel[1] / ist[1], ziel[2] / ist[2]
    for x, y in wasser:
        r, g, b, a = px[x, y]
        hh, ss, vv = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
        hh = ziel[0] + (hh - ist[0]) * 0.3            # Farbton auf den Fluss, kleine Unterschiede bleiben
        ss, vv = min(1, ss * fs), min(1, vv * fv)
        r, g, b = colorsys.hsv_to_rgb(hh % 1, ss, vv)
        px[x, y] = (round(r * 255), round(g * 255), round(b * 255), a)
    im.save(datei, quality=82, method=6)
    print(datei, f'{len(wasser)} Wasserpixel angepasst')
