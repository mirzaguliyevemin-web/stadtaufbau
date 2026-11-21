# Epochia: Laufbilder aus Scenario-Blättern ins Spiel bringen (21.11.2026, V250).
#   python3 neu/tools/lauf-einbauen.py ORDNER name [name ...]
#   python3 neu/tools/lauf-einbauen.py --tier ORDNER hirsch mammut …   (Tiere: ohne „mensch-“ davor, V251)
# ORDNER enthält NAME-blatt.png: vier Laufbilder nebeneinander (1536 × 640, durchsichtiger Hintergrund, Blick nach links),
# z. B. mann-leer-blatt.png für die Figur mensch-mann-leer.
# Je Blatt: Dunst entfernen, die vier Figuren trennen, alle mit derselben Höhe (oberster Kopf bis unterste Fußsohle) und
# derselben Breite zuschneiden, waagrecht auf den Rumpf ausgerichtet – so springt beim Bildwechsel nichts.
# Ausgabe: bilder/epochia/figuren/mensch-NAME-lauf-1…4.webp (200 Punkte hoch), das Blatt nach quelle/figuren/mensch-NAME-lauf.png.
import os, shutil, sys
from PIL import Image, ImageFilter

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
OUT = os.path.join(ROOT, 'bilder', 'epochia', 'figuren')
SRC = os.path.join(ROOT, 'bilder', 'epochia', 'quelle', 'figuren')
HOEHE = 200

def saeubern(im):
    # wie figur-einbauen.py: heller, halb durchsichtiger Schimmer weg, kaum deckende Punkte weg
    im = im.convert('RGBA'); px = im.load(); w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            mx, mn = max(r, g, b), min(r, g, b)
            if 0 < a < 250 and mx > 150 and (mx - mn) / mx < 0.3: px[x, y] = (r, g, b, 0)
    alpha = im.getchannel('A').point(lambda v: 0 if v < 60 else min(255, round((v - 60) * 255 / 140)))
    alpha = alpha.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.6))
    im.putalpha(alpha)
    return im

def figuren(im):
    # Spalten mit Inhalt zu Stücken zusammenfassen; die vier breitesten Lücken trennen die Figuren
    a = im.getchannel('A').load(); w, h = im.size
    voll = [any(a[x, y] > 40 for y in range(0, h, 2)) for x in range(w)]
    luecken, start = [], None
    for x in range(w + 1):
        leer = x == w or not voll[x]
        if leer and start is None: start = x
        if not leer and start is not None: luecken.append((start, x)); start = None
    if start is not None: luecken.append((start, w))
    innen = sorted([l for l in luecken if l[0] > 0 and l[1] < w], key=lambda l: l[1] - l[0], reverse=True)[:3]
    schnitte = sorted((l[0] + l[1]) // 2 for l in innen)
    # Berühren sich zwei Bilder (Geweih, Huf): an der Spalte mit den wenigsten deckenden Punkten nahe dem Viertel schneiden
    for k in (1, 2, 3):
        soll = k * w // 4
        if any(abs(c - soll) < w // 8 for c in schnitte): continue
        menge = lambda x: sum(1 for y in range(0, h, 2) if a[x, y] > 40)
        schnitte.append(min(range(soll - w // 10, soll + w // 10), key=menge))
    schnitte = [0] + sorted(schnitte) + [w]
    return [(schnitte[i], schnitte[i + 1]) for i in range(4)]

def rumpf_mitte(im, x0, x1, top, bot):
    # Waagrechte Mitte der deckenden Punkte im Rumpf (35–60 % der Höhe): Stäbe und Speere zählen dort kaum
    a = im.getchannel('A').load(); sx = n = 0
    for y in range(top + int((bot - top) * 0.35), top + int((bot - top) * 0.6), 2):
        for x in range(x0, x1):
            if a[x, y] > 128: sx += x; n += 1
    return sx / n if n else (x0 + x1) / 2

def nur_hauptteil(im):
    # Splitter vom Nachbarbild (Geweihspitze, Huf am Schnittrand) entfernen: nur zusammenhängende Teile mit mindestens
    # 3 % der Fläche des größten Teils bleiben
    a = im.getchannel('A'); w, h = im.size; px = a.load()
    marke = [[0] * w for _ in range(h)]; teile = []
    for y0 in range(h):
        for x0 in range(w):
            if px[x0, y0] <= 20 or marke[y0][x0]: continue
            n = len(teile) + 1; stapel = [(x0, y0)]; marke[y0][x0] = n; punkte = []
            while stapel:
                x, y = stapel.pop(); punkte.append((x, y))
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < w and 0 <= ny < h and not marke[ny][nx] and px[nx, ny] > 20:
                        marke[ny][nx] = n; stapel.append((nx, ny))
            teile.append(punkte)
    if not teile: return im
    gross = max(len(t) for t in teile)
    for t in teile:
        if len(t) < gross * 0.03:
            for x, y in t: px[x, y] = 0
    im.putalpha(a)
    return im

def main():
    args = sys.argv[1:]
    tier = args[0] == '--tier'
    if tier: args = args[1:]
    ordner, namen = args[0], args[1:]
    vor = '' if tier else 'mensch-'
    os.makedirs(SRC, exist_ok=True)
    for name in namen:
        quelle = os.path.join(ordner, name + '-blatt.png')
        im = saeubern(Image.open(quelle))
        teile = figuren(im)
        boxen = [im.crop((x0, 0, x1, im.height)).getchannel('A').point(lambda v: 255 if v > 40 else 0).getbbox() for x0, x1 in teile]
        top = min(b[1] for b in boxen); bot = max(b[3] for b in boxen)
        mitten = [rumpf_mitte(im, x0, x1, top, bot) for x0, x1 in teile]
        halb = max(max(m - (x0 + b[0]), (x0 + b[2]) - m) for (x0, _), b, m in zip(teile, boxen, mitten)) + 2
        for i, ((x0, x1), m) in enumerate(zip(teile, mitten)):
            stueck = Image.new('RGBA', (round(2 * halb), bot - top))
            teil = im.crop((x0, top, x1, bot))
            stueck.alpha_composite(teil, (round(x0 - (m - halb)), 0))
            stueck = stueck.resize((round(stueck.width * HOEHE / stueck.height), HOEHE), Image.LANCZOS)
            stueck = nur_hauptteil(stueck)
            stueck.save(os.path.join(OUT, f'{vor}{name}-lauf-{i + 1}.webp'), quality=85, method=6)
        shutil.copyfile(quelle, os.path.join(SRC, f'{vor}{name}-lauf.png'))
        print(f'{vor}{name}: 4 Laufbilder, {round(2 * halb * HOEHE / (bot - top))} × {HOEHE}')

if __name__ == '__main__':
    main()
