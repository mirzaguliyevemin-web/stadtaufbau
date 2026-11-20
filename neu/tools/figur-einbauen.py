# Epochia: Scenario-Figurenbilder ins Spiel bringen (20.11.2026).
#   python3 neu/tools/figur-einbauen.py [--spiegeln] [--schleier] ORDNER name [name ...]
# Die Arbeitsbilder im Spiel schauen nach links (leben.js spiegelt sie bei Blick nach rechts): nach rechts schauende Bilder mit --spiegeln.
# ORDNER enthält NAME.png (1024 × 1024 von Scenario, durchsichtiger Hintergrund).
# Je Bild: leichten Dunst um die Figur entfernen, auf den Inhalt zuschneiden, auf 200 Punkte Höhe verkleinern,
# als WebP nach bilder/epochia/figuren/NAME.webp. Das Original kommt nach bilder/epochia/quelle/figuren/NAME.png.
# Ausgabe je Bild: Rohhöhe (Punkte im 1024er-Bild) und Fußmitte (Anteil der Breite neben der Mitte) –
# daraus entstehen Höhe und Versatz in TOOL_POSES / ANIM_POSES (neu/js/leben.js).
import os, shutil, sys
from PIL import Image, ImageFilter

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
OUT = os.path.join(ROOT, 'bilder', 'epochia', 'figuren')
SRC = os.path.join(ROOT, 'bilder', 'epochia', 'quelle', 'figuren')
HOEHE = 200

def fussmitte(im):
    # Mitte zwischen den Füßen: im untersten Zehntel zusammenhängende Spalten suchen; Füße sind die, die bis ganz
    # nach unten reichen (Werkzeugspitzen enden meist höher). Ergebnis als Anteil der Breite neben der Bildmitte.
    a = im.getchannel('A').load(); w, h = im.size; y0 = int(h * 0.9)
    tief = [max([y for y in range(y0, h) if a[x, y] > 128], default=-1) for x in range(w)]
    stuecke, start = [], None
    for x in range(w + 1):
        an = x < w and tief[x] >= 0
        if an and start is None: start = x
        if not an and start is not None: stuecke.append((start, x - 1)); start = None
    stuecke = [(l, r) for l, r in stuecke if r - l + 1 >= h * 0.06] or stuecke   # dünne Stiele (Grabstock, Stab) sind keine Füße
    fuesse = [(l, r) for l, r in stuecke if max(tief[l:r + 1]) >= h - 1 - h * 0.035] or stuecke
    # Speerspitzen u. Ä. lassen sich nicht sicher erkennen: Ergebnis im Prüfbild (Fußmarke) ansehen und bei Bedarf von Hand setzen
    return (fuesse[0][0] + fuesse[-1][1]) / 2 / w - 0.5

def schleier_weg(im):
    # Heller Schimmer um die Figur (malt Scenario manchmal trotz durchsichtigem Hintergrund): halb durchsichtige,
    # helle, kaum farbige Punkte weg. Das weiße Fell ist voll deckend und bleibt.
    px = im.load(); w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            mx, mn = max(r, g, b), min(r, g, b)
            if 0 < a < 250 and mx > 150 and (mx - mn) / mx < 0.3: px[x, y] = (r, g, b, 0)

def bearbeiten(im, spiegeln=False, schleier=False):
    im = im.convert('RGBA')
    if spiegeln: im = im.transpose(Image.FLIP_LEFT_RIGHT)
    if schleier: schleier_weg(im)
    # Dunst: kaum deckende Punkte weg, der Rand bleibt weich
    alpha = im.getchannel('A').point(lambda v: 0 if v < 60 else min(255, round((v - 60) * 255 / 140)))
    alpha = alpha.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.6))
    im.putalpha(alpha)
    b = alpha.point(lambda v: 255 if v > 40 else 0).getbbox()
    im = im.crop(b)
    roh = im.height
    if im.height > HOEHE:
        im = im.resize((round(im.width * HOEHE / im.height), HOEHE), Image.LANCZOS)
    return im, roh

def main():
    args = sys.argv[1:]; spiegeln = '--spiegeln' in args; schleier = '--schleier' in args
    args = [a for a in args if a not in ('--spiegeln', '--schleier')]
    ordner, namen = args[0], args[1:]
    os.makedirs(SRC, exist_ok=True)
    for name in namen:
        quelle = os.path.join(ordner, name + '.png')
        im, roh = bearbeiten(Image.open(quelle), spiegeln, schleier)
        im.save(os.path.join(OUT, name + '.webp'), quality=85, method=6)
        shutil.copyfile(quelle, os.path.join(SRC, name + '.png'))
        print(f'{name}: {im.size}, Rohhöhe {roh}, Fußmitte {fussmitte(im):+.3f}')

if __name__ == '__main__':
    main()
