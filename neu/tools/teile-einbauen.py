# Epochia: Scenario-Blatt mit mehreren Einzelteilen nebeneinander zerschneiden (21.11.2026, V251).
#   python3 neu/tools/teile-einbauen.py [--schnitte 585,1030] BLATT.png BREITE name1 name2 …
# (--schnitte: feste Trennspalten, wenn sich Teile berühren, z. B. Wasserfontäne und Walrücken;
#  --leer x0,y0,x1,y1: Rechteck im Blatt durchsichtig machen, z. B. Fontänen-Dunst über dem Walrücken)
# Trennt an den breitesten durchsichtigen Spalten, schneidet jedes Teil auf seinen Inhalt zu und verkleinert alle
# im selben Maßstab (das breiteste Teil wird BREITE Punkte breit). Kein Dunst-Filter: Gischt und Wasserfontäne sind
# absichtlich hell und halb durchsichtig. Ausgabe: bilder/epochia/figuren/NAME.webp, Blatt nach quelle/figuren/.
import os, shutil, sys
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
OUT = os.path.join(ROOT, 'bilder', 'epochia', 'figuren')
SRC = os.path.join(ROOT, 'bilder', 'epochia', 'quelle', 'figuren')

def main():
    args = sys.argv[1:]; fest = None
    leer = []
    while args[0].startswith('--'):
        if args[0] == '--schnitte': fest = [int(v) for v in args[1].split(',')]
        if args[0] == '--leer': leer.append([int(v) for v in args[1].split(',')])
        args = args[2:]
    blatt, breite, namen = args[0], int(args[1]), args[2:]
    im = Image.open(blatt).convert('RGBA'); w, h = im.size
    for box in leer: im.paste((0, 0, 0, 0), tuple(box))
    a = im.getchannel('A').load()
    voll = [any(a[x, y] > 60 for y in range(0, h, 2)) for x in range(w)]
    luecken, start = [], None
    for x in range(w + 1):
        leer = x == w or not voll[x]
        if leer and start is None: start = x
        if not leer and start is not None: luecken.append((start, x)); start = None
    innen = sorted([l for l in luecken if l[0] > 0 and l[1] < w], key=lambda l: l[1] - l[0], reverse=True)[:len(namen) - 1]
    schnitte = [0] + (fest or sorted((l[0] + l[1]) // 2 for l in innen)) + [w]
    if fest:   # an festen Schnitten den Dunst des Nachbarteils weich ausblenden (sonst harte senkrechte Kante)
        ap = im.getchannel('A'); px = ap.load(); R = 28
        for c in fest:
            for x in range(max(0, c - R), min(w, c + R)):
                f = abs(x - c) / R
                for y in range(h):
                    if px[x, y] < 120: px[x, y] = round(px[x, y] * f)
        im.putalpha(ap)
    teile = []
    for i in range(len(namen)):
        t = im.crop((schnitte[i], 0, schnitte[i + 1], h))
        t = t.crop(t.getchannel('A').point(lambda v: 255 if v > 12 else 0).getbbox())
        teile.append(t)
    f = breite / max(t.width for t in teile)
    os.makedirs(SRC, exist_ok=True)
    for name, t in zip(namen, teile):
        t = t.resize((round(t.width * f), round(t.height * f)), Image.LANCZOS)
        t.save(os.path.join(OUT, name + '.webp'), quality=85, method=6)
        print(name, t.size)
    shutil.copyfile(blatt, os.path.join(SRC, namen[0].rsplit('-', 1)[0] + '-blatt.png'))

if __name__ == '__main__':
    main()
