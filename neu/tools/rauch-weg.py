# Epochia: gemalten (starren) Rauch aus Gebäudebildern entfernen (Wunsch Emin, 08.11.2026: „Manche Gebäude haben immer
# noch unbewegliche Rauchwolken“). Danach steigt dort der bewegte Rauch des Spiels auf (EFFECTS in neu/js/zeichnen.js).
#   python3 neu/tools/rauch-weg.py            alle Bilder aus der Liste (immer auf die unveränderten Bilder anwenden)
# Je Bild: Kasten um die Rauchfahne als Anteil der Bildbreite/-höhe (u0, u1, v0, v1). v1 = Öffnung des Schornsteins,
# darunter wird nichts angefasst. Entfernt wird nur die zusammenhängende Rauchfahne (hell, kaum farbig) ab ihrer Spitze,
# Schnee auf Büschen daneben bleibt. Liegt die Fahne vor dem Boden (boden = ab hier), wird sie dort zu glattem Schnee.
import colorsys, glob
from PIL import Image

KAESTEN = {   # name: (u0, u1, v0, v1, boden)
    '2-feld':                 (0.15, 0.30, 0.05, 0.295, None),
    '2-feld-winter':          (0.15, 0.27, 0.05, 0.275, None),
    '2-felsritzer':           (0.13, 0.28, 0.05, 0.365, None),
    '2-felsritzer-winter':    (0.13, 0.27, 0.05, 0.305, None),
    '2-hallenhaus':           (0.13, 0.20, 0.10, 0.375, None),
    '2-koehler':              (0.14, 0.30, 0.05, 0.385, None),
    '2-kupferschmied':        (0.15, 0.28, 0.05, 0.312, None),
    '2-kupferschmied-winter': (0.13, 0.29, 0.00, 0.330, None),
    '2-toepferwerkstatt':     (0.12, 0.25, 0.05, 0.370, None),
    '1-toepferei-r2-winter':  (0.235, 0.315, 0.12, 0.415, 0.265),
}

def rauchig(r, g, b, streng=True):
    h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
    return (s < 0.28 and v > 0.5) if streng else (s < 0.4 and v > 0.35)

for name, (u0, u1, v0, v1, boden) in KAESTEN.items():
    datei = glob.glob(f'bilder/epochia/gebaeude/*/{name}.webp')[0]
    im = Image.open(datei).convert('RGBA'); w, h = im.size; px = im.load()
    x0, x1, y0, y1 = int(u0 * w), int(u1 * w), int(v0 * h), int(v1 * h)
    inn = lambda x, y: x0 <= x < x1 and y0 <= y < y1
    ok = lambda x, y: px[x, y][3] > 0 and rauchig(*px[x, y][:3])
    gesehen, weg = set(), set()
    for y in range(y0, y1):   # größte zusammenhängende helle Fläche im Kasten = die Rauchfahne
        for x in range(x0, x1):
            if (x, y) in gesehen or not ok(x, y): continue
            teil, stapel = {(x, y)}, [(x, y)]
            while stapel:
                a, b = stapel.pop()
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, 1), (1, -1), (-1, -1)):
                    q = (a + dx, b + dy)
                    if q not in teil and inn(*q) and ok(*q): teil.add(q); stapel.append(q)
            gesehen |= teil
            if len(teil) > len(weg): weg = teil
    # Ränder der Fahne, die über den Kasten hinausragen: höchstens 10 Bildpunkte weiter, nur durch Rauchfarbe
    breit = lambda x, y: x0 - 10 <= x < x1 + 10 and y0 - 10 <= y < y1
    rand = set(weg)
    for _ in range(10):
        rand = {q for (x, y) in rand for q in ((x + 1, y), (x - 1, y), (x, y - 1), (x, y + 1))
                if q not in weg and breit(*q) and ok(*q)}
        weg |= rand
    for _ in range(2):   # weicher Rand der Rauchfahne
        neu = {q for (x, y) in weg for q in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1))
               if q not in weg and breit(*q) and px[q][3] > 0 and (px[q][3] < 250 or rauchig(*px[q][:3], False))}
        weg |= neu
    if boden is not None:   # Schneefarbe vom Boden neben der Fahne (Mittelwert heller Punkte), leicht gesprenkelt
        yb = int(boden * h)
        probe = [px[x, y][:3] for y in range(yb, y1) for x in range(x0 - 15, x1 + 15)
                 if (x, y) not in weg and px[x, y][3] > 250 and sum(px[x, y][:3]) > 640]
        farbe = tuple(sorted(c[i] for c in probe)[len(probe) // 2] for i in range(3))
    import random; random.seed(1)
    for (x, y) in weg:
        r, g, b, a = px[x, y]
        if boden is not None and y >= boden * h:
            n = random.randint(-5, 4); px[x, y] = (*(min(255, c + n) for c in farbe), 255)
        else: px[x, y] = (r, g, b, 0)
    # Rest der Fahne knapp über der Öffnung weich ausblenden (keine flache Kante; dort steigt der bewegte Rauch auf)
    if boden is None:
        unten = [x for (x, y) in weg if y >= y1 - 4]   # nur so breit, wie die Fahne unten war (Ofenrand bleibt)
        fx0, fx1 = (min(unten), max(unten) + 1) if unten else (0, 0)
        for y in range(y1, min(h, y1 + 14)):
            for x in range(fx0, fx1):
                r, g, b, al = px[x, y]
                if al > 0 and rauchig(r, g, b): px[x, y] = (r, g, b, int(al * (y - y1 + 1) / 15))
    im.save(datei, quality=86, method=6)
    print(f'{name}: {len(weg)} Rauchpunkte entfernt')
