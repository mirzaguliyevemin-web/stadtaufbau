# Epochia: Wasser aus einem Gebäudebild entfernen (Wunsch Emin, 07.11.2026: Das gemalte Wasser passte nicht zum Fluss.
# Steht das Gebäude im Fluss, ist darunter jetzt der echte Fluss der Karte zu sehen).
#   python3 neu/tools/wasser-weg.py bilder/epochia/gebaeude/pfahlbau/1-pfahlbau.webp [weitere.webp …]
# Winterbilder (Name mit -winter): strengere Regel, sonst ginge der bläuliche Schnee mit weg.
# Wasser = blau bis türkis (wie in wasser-farbe.py). Helle Glanzlichter und Schaum mitten im Wasser gehören dazu.
# Am Rand zum Ufer wird 1 Bildpunkt weich ausgeblendet. Pfähle, Boote, Schilf und das Ufer bleiben.
import sys, colorsys
from PIL import Image

WINTER = False

def ist_wasser(r, g, b):
    h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
    if WINTER: return 0.45 <= h <= 0.62 and s >= 0.42 and v >= 0.35
    return (0.42 <= h <= 0.64 and s >= 0.18 and v >= 0.28) or (b > r + 25 and b > 90 and g > r)

def ist_hell(r, g, b):   # Glanzlicht oder Schaum
    h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
    return not WINTER and v >= 0.62 and s <= 0.38

for datei in sys.argv[1:]:
    WINTER = '-winter' in datei
    im = Image.open(datei).convert('RGBA')
    w, h = im.size
    px = im.load()
    wasser = bytearray(w * h)
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a > 0 and ist_wasser(r, g, b): wasser[y * w + x] = 1
    # Glanzlichter und kleine Lücken im Wasser schließen: ein heller Punkt, der rundum fast nur Wasser hat, ist Wasser
    nachbarn = [(-1, -1), (0, -1), (1, -1), (-1, 0), (1, 0), (-1, 1), (0, 1), (1, 1)]
    for _ in range(4):
        neu = []
        for y in range(1, h - 1):
            for x in range(1, w - 1):
                i = y * w + x
                if wasser[i] or px[x, y][3] == 0: continue
                n = sum(wasser[(y + dy) * w + x + dx] for dx, dy in nachbarn)
                if n >= 6 or (n >= 4 and ist_hell(*px[x, y][:3])): neu.append(i)
        for i in neu: wasser[i] = 1
    entfernt = 0
    for y in range(h):
        for x in range(w):
            i = y * w + x
            r, g, b, a = px[x, y]
            if wasser[i]:
                px[x, y] = (r, g, b, 0); entfernt += 1
            elif a > 0 and 0 < x < w - 1 and 0 < y < h - 1 and sum(wasser[(y + dy) * w + x + dx] for dx, dy in nachbarn) >= 4:
                px[x, y] = (r, g, b, a // 2)   # weicher Rand zum Ufer
    im.save(datei, quality=86, method=6)
    print(datei, f'{entfernt} Wasserpunkte entfernt')
