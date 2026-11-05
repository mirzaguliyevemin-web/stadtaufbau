# Plan: Helleres Design je Zeitalter

Stand 2026-11-04, Version 94. **Entschieden von Emin (04.11.): die vier Farbwelten, gemalte helle Leisten, eigene Kupferzeit, erst Schritt 1–3, dann Canva.** Wunsch von Emin: Das Spiel ist viel zu braun, gewünscht sind helle Töne passend zum Zeitalter, das Lager braucht ein besseres Design. Danach werden die Bilder mit Canva erzeugt.

## 1 · Befund

Rundgang durch alle Fenster in Altsteinzeit, Später Bronzezeit und Eisenzeit, im Quer- und Hochformat.

| Bild | Brauntöne | Beige | Helligkeit |
|---|---:|---:|---:|
| Startbild (das Vorbild) | 18 % | 8 % | 61 |
| Karte Altsteinzeit | 39 % | 6 % | 42 |
| Karte Späte Bronzezeit | 59 % | 22 % | 48 |
| Lager | 15 % | 84 % | 83 |
| Forschung | 15–18 % | 67–82 % | 80 |

Grobe Messung am Bildschirmfoto. Das Wetter ändert die Werte etwas.

1. **Braun überall:** Leisten, Seitenknöpfe, Fensterköpfe, Titelband und Rahmen sind Holz und Leder. Die Fenster selbst sind Beige auf Beige.
2. **Kein Unterschied zwischen den Zeitaltern:** Alle 9 Stufen nutzen die Steinzeit-Leisten (`theme: 'steinzeit'` in `STAGES`).
3. **Karte:** Ab der Bronzezeit sind Wege, Erdsockel und Strohdächer zusammen so braun, dass die Wiese fast verschwindet.
4. **Lager:** flache Beige-Zeilen ohne Gewichtung, volle und leere Waren sehen fast gleich aus, man sieht nicht, wie voll etwas ist.
5. **Gemischte Symbole:** 13 von 22 Waren und die Seitenknöpfe zeigen Emojis neben gemalten Bildern.
6. **Kleinigkeiten:** Schatzkiste und Shop sind flach, das Logo im Menü nimmt im Querformat viel Platz ein, die Seitenknöpfe verdecken im Querformat einen Teil der Karte.
7. **Technik:** `style.css` enthält 134 feste Farben, ein Wechsel je Zeitalter geht erst, wenn sie zu Farbvariablen zusammengefasst sind.

Gut und bleibt: das helle Startbild als Maßstab, die Schrift Fredoka, die grünen Hauptknöpfe.

## 2 · Farben je Zeitalter

Hell als Grundton, je ein kräftiger Akzent. Holz wird zur Ausnahme, nicht zur Fläche.

| Zeitalter | Stimmung | Leiste | Akzent | Zweiter Akzent |
|---|---|---|---|---|
| Steinzeit | Birke, Moos, Glut | `#f3e9d0` | Moos `#6f9e4f` | Glut `#e8843a` |
| Kupferzeit | Patina und Kupfer | `#e4f1ea` | Patina `#3f9c8d` | Kupfer `#d9794a` |
| Bronzezeit | Sonne, Weizen, Himmel | `#fdf1c4` | Himmel `#3f93c9` | Bronze `#d99a1e` |
| Eisenzeit | Morgennebel und Wald | `#e6eef4` | Wald `#4f8a5f` | Rost `#b5473c` |

Die Stufen teilen sich die Farben ihres Zeitalters.

## 3 · Schritte

**Stand Version 95:** Schritt 1–3 gebaut. `html[data-zeit]` in `style.css`, Feld `zeit` in `STAGES`. Gemalte Leisten kommen später über `--bar-top`, `--bar-bottom` und `--title-band`. `pfad`, `erdsockel` und `wiese` sind nur als webp aufgehellt (Helligkeit 1,28 / 1,22 / 1,1), die Originale in `quelle/` sind unverändert. Gemessen: Braun auf der Karte Altsteinzeit 39 % auf 14 %, Späte Bronzezeit 59 % auf 43 %. Der Rest dort sind vor allem die Gebäude (Schritt 5).

**Schritt 1, ohne Canva: Oberfläche.** Farbvariablen, vier Farbwelten, Wechsel in `applyEpochTheme`; Leisten, Knöpfe, Fensterköpfe und Rahmen hell; Schatzkiste, Shop und Menü überarbeiten. Bis die Bilder da sind, stehen Farbflächen statt Holz.

**Schritt 2, ohne Canva: Lager neu.** Eine helle Karte je Bereich mit farbigem Kopf, je Ware ein Balken für den Füllstand, „bald leer“ und „voll“ als deutliche Marke, leere Waren blass, gefährdete Waren oben.

**Schritt 3, ohne Canva: Karte aufhellen im Code.** Wege und Erdsockel heller einfärben, Wiese frischer. Der Helligkeitsfilter aus der Probe kann auf dem Handy bremsen, darum wird das an den Bildern selbst gemacht und auf dem Handy geprüft.

**Schritt 4, Canva: Oberflächenbilder** (Stand Version 96: Leiste unten für Steinzeit und Kupferzeit eingebaut; aus dem Original werden zwei Planken ausgeschnitten.)

| Was | Bilder |
|---|---:|
| Leiste oben, Leiste unten, Titelband, je 4 Zeitalter | 12 |
| Gemalte Symbole für Seitenknöpfe | 8 |
| Gemalte Waren statt Emojis | 13 |
| Wege, Erdsockel, Wiese je Zeitalter, soweit nötig | etwa 10 |
| **Zusammen** | **etwa 43** |

Bei etwa 25 Bildern am Tag sind das rund zwei Tage Canva.

**Schritt 5, Canva: Gebäude.** Noch keine Neuerzeugung der 119 vorhandenen Gebäudebilder. Erst nach Schritt 3 prüfen, welche noch zu dunkel wirken. Wichtig: Die rund 124 Bronzezeit-Bilder sind noch nicht erzeugt, sie bekommen von Anfang an einen helleren Stil im Prompt.

## 4 · Fragen an Emin

1. **Grundton:** Gefallen die vier Farbwelten aus der Probe, oder soll ein Zeitalter anders aussehen?
2. **Holz:** Leisten ganz hell und glatt, oder helles Birkenholz und Stoff als gemalte Bilder? Vorschlag: gemalt.
3. **Kupferzeit:** eigene Farbwelt mit Patina oder wie die Bronzezeit? Vorschlag: eigene.
4. **Reihenfolge:** erst das neue Design oder erst die 16 restlichen Steinzeit-Bilder? Vorschlag: erst Schritt 1–3, dann die Canva-Bilder.
