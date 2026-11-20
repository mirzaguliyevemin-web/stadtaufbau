# Epochia: Scenario-Gebäudebilder ohne Sockel (durchsichtiger Hintergrund) ins Spiel bringen (20.11.2026).
#   python3 neu/tools/scenario-einbauen.py ORDNER [name ...]
# ORDNER enthält NAME.png, NAME-r2.png, NAME-r1.png und die -winter-Fassungen (1024 × 1024 von Scenario).
# Je Bild: hellen Dunst-Schleier entfernen (Scenario malt ihn manchmal trotz durchsichtigem Hintergrund),
# gemalten Rauch entfernen (das Spiel lässt bewegten Rauch aufsteigen, EFFECTS in neu/js/zeichnen.js),
# auf den Inhalt zuschneiden, auf 640 Punkte Breite verkleinern, als WebP nach bilder/epochia/gebaeude/NAME/1-….webp.
# Das Original kommt nach bilder/epochia/quelle/gebaeude/NAME/1-….png.
import os, re, shutil, sys
from PIL import Image, ImageChops, ImageFilter

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
OUT = os.path.join(ROOT, 'bilder', 'epochia', 'gebaeude')
SRC = os.path.join(ROOT, 'bilder', 'epochia', 'quelle', 'gebaeude')

# Gemalter Rauch: Kasten (u0, u1, v0, v1) als Anteil des 1024er-Bilds. Darin wird alles Helle, kaum Farbige entfernt.
RAUCH = {
    'fellzelt':    (0.49, 0.55, 0.00, 0.11),
    'fellzelt-r2': (0.40, 0.58, 0.00, 0.105),
    'langhaus':    (0.66, 0.84, 0.00, 0.265),
    'langhaus-r2': (0.12, 0.31, 0.00, 0.285),
    'toepferei':   (0.72, 0.88, 0.10, 0.325),
    'toepferei-r2': (0.12, 0.32, 0.00, 0.27),
}
# Winterbilder sind wie das Sommerbild aufgebaut: derselbe Kasten

# Gebäude halb im Wasser: gemaltes Wasser in der Farbe des Flusses im Spiel (zeichnen.js blendet es zum Rand weich aus)
WASSER = {'tongrube'}
FLUSS = (97, 154, 158)

def wasser_angleichen(im):
    px = im.load(); w, h = im.size; wasser = []
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a and b > r + 20 and b > 90: wasser.append((x, y))
    if not wasser: return
    mittel = [sum(px[x, y][i] for x, y in wasser) / len(wasser) for i in range(3)]
    for x, y in wasser:
        r, g, b, a = px[x, y]
        px[x, y] = tuple(max(0, min(255, round(FLUSS[i] + ((r, g, b)[i] - mittel[i]) * 0.5))) for i in range(3)) + (a,)

def hell_grau(r, g, b):
    mx, mn = max(r, g, b), min(r, g, b)
    return mx > 150 and (mx - mn) / max(mx, 1) < 0.3

def schleier_anteil(im):
    px = im.load(); w, h = im.size; halb = deckend = 0
    for y in range(0, h, 4):
        for x in range(0, w, 4):
            r, g, b, a = px[x, y]
            if a > 0: deckend += 1
            if 0 < a < 250 and hell_grau(r, g, b): halb += 1
    return halb / max(1, deckend)

def bearbeiten(im, name, box=None):
    im = im.convert('RGBA'); w, h = im.size; px = im.load()
    schleier = schleier_anteil(im) > 0.12
    kasten = RAUCH.get(name) or RAUCH.get(name.replace('-winter', ''))
    mask = Image.new('L', (w, h)); m = mask.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            weg = a < 40
            if not weg and schleier and a < 252 and hell_grau(r, g, b): weg = True
            if not weg and kasten and kasten[0] * w <= x <= kasten[1] * w and kasten[2] * h <= y <= kasten[3] * h and hell_grau(r, g, b): weg = True
            m[x, y] = 0 if weg else a
    weich = mask.filter(ImageFilter.GaussianBlur(0.8)).point(lambda v: min(255, v + 30))
    im.putalpha(ImageChops.darker(mask, weich))
    if box is None:   # sonst (Winterbild) derselbe Ausschnitt wie im Sommer, damit Feuer und Rauch (EFFECTS) passen
        b = im.getchannel('A').point(lambda v: 255 if v > 16 else 0).getbbox()
        box = (max(0, b[0] - 4), max(0, b[1] - 4), min(w, b[2] + 4), min(h, b[3] + 4))
    im = im.crop(box)
    if im.width > 640:
        im = im.resize((640, round(im.height * 640 / im.width)), Image.LANCZOS)
    if name.split('-')[0] in WASSER: wasser_angleichen(im)
    im.box = box
    return im, schleier

def main():
    ordner, nur = sys.argv[1], set(sys.argv[2:])
    for datei in sorted(os.listdir(ordner)):
        mt = re.fullmatch(r'([a-z]+)((?:-r[12])?(?:-winter)?)\.png', datei)
        if not mt: continue
        basis, rest = mt.groups()
        if nur and basis not in nur and basis + rest not in nur: continue
        name = f'1-{basis}{rest}'
        box = None
        sommer = os.path.join(ordner, basis + rest.replace('-winter', '') + '.png')
        if rest.endswith('-winter') and os.path.exists(sommer):
            box = bearbeiten(Image.open(sommer), basis + rest.replace('-winter', ''))[0].box
        im, schleier = bearbeiten(Image.open(os.path.join(ordner, datei)), basis + rest, box)
        os.makedirs(os.path.join(OUT, basis), exist_ok=True)
        os.makedirs(os.path.join(SRC, basis), exist_ok=True)
        im.save(os.path.join(OUT, basis, name + '.webp'), quality=82, method=6)
        shutil.copyfile(os.path.join(ordner, datei), os.path.join(SRC, basis, name + '.png'))
        print(name, im.size, 'Schleier entfernt' if schleier else '')

if __name__ == '__main__':
    main()
