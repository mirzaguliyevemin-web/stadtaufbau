# Bilder für Gebäude

Hier kommen die KI-Bilder für die Gebäude hinein. Claude baut sie ins Spiel ein
(die gezeichneten Gebäude bleiben als Ersatz, falls ein Bild fehlt).

## Dateinamen

Im Spiel: `<zeitalter>-<gebäude-id>.webp`, z. B. `1-hut.webp`, `2-farm.webp`
(Zeitalter 1 = Steinzeit, 2 = Antike, 3 = Mittelalter, 4 = Industrie, 5 = Moderne; siehe `docs/zeitalter.md`).
Claude schneidet den Hintergrund weg, verkleinert auf 384 px und trägt das Bild in `BUILDING_IMAGES` in `game.js` ein.
Eigene Bilder von Emin dürfen beliebig heißen (PNG/JPG) – Claude benennt sie um.

Bisher: 1-hut, 1-gatherer, 1-hunter, 1-woodcutter, 1-stonecutter, 1-fireplace, 1-painter, 1-watertrough, 2-house, 2-farm, 2-sawmill, 2-market, 4-coalmine, 4-steelworks, 4-factory, 4-tenement, 4-station, 4-police,
4-clocktower, 5-powerplant, 2-quarry, 2-warehouse, 2-park, 2-firestation, 2-scriptorium, 2-brickworks, 2-well, 2-guard, 2-sheepfarm, 2-fishery, 2-plaza (Canva, Stil wie das Farm-Probebild: isometrisch, Gras-Sockel).

## Format

| Fläche im Spiel | Bildformat | Gebäude |
|---|---|---|
| 1×1 | quadratisch 1:1 | Haus, Fischerhütte, Erzmine, Schreibstube, Bäckerei, Weberei, Schmiede, Brunnen, Wachhaus, Wachturm |
| 2×1 | breit 2:1 (z. B. 1024×512) | Sägewerk, Markt, Lagerhaus, Feuerwache, Schreinerei, Ziegelei, Brauerei, Bibliothek |
| 2×2 | quadratisch 1:1 | Farm, Schäferei, Steinbruch, Park, Schule, Krankenhaus, Rathaus |
| 3×3 | quadratisch 1:1 | Brunnenplatz, Kathedrale |

- Mindestens 1024 Pixel breit, PNG.
- Am besten transparenter Hintergrund; weißer Hintergrund geht auch (Claude schneidet ihn aus).

## Stil-Satz (immer gleich anhängen)

> Style: cartoon game asset, soft pastel colors, clean outlines, subtle shading, isometric view like a mobile
> city building game, light from top left, centered on a plain white background, no shadow on the
> ground, no text, no border, consistent style across all assets, 1:1 square format

Für 2×1-Gebäude am Ende statt „1:1 square format“: „2:1 wide format“.

## Gelände-Bausteine (Bäume, Berge, Wasser, Wiese)

Jedes Bild einzeln erzeugen, quadratisch, mindestens 1024 px, Dateiname wie angegeben (PNG oder JPG), in `bilder/` ablegen.
Bäume und Felsen: Stil-Satz von oben anhängen. Wasser und Wiese: **nahtlos kachelbar** (ohne Stil-Satz, eigener Text unten).

| Datei | Prompt (Anfang, dann Stil-Satz) |
|---|---|
| `baum-laub.png` | A single round leafy deciduous tree, full green crown, short brown trunk |
| `baum-tanne.png` | A single tall pine tree, dark green, cone shaped |
| `baum-eiche.png` | A single bushy oak tree, wide crown in two shades of green |
| `baum-birke.png` | A single small birch tree, white trunk with black marks, light green leaves |
| `baum-herbst.png` | A single round deciduous tree with orange and red autumn leaves |
| `baum-winter.png` | A single pine tree covered with snow |
| `fels-gross.png` | A big grey rocky mountain peak with a small snow cap, wide base |
| `fels-klein.png` | A small cluster of grey boulders and rocks |
| `busch.png` | A small round green bush with a few tiny flowers |

Wasser und Wiese (statt des Stil-Satzes):

- `wasser.png`: *Seamless tileable texture of calm blue water seen from directly above, small gentle cartoon wave lines,
  soft pastel colors, flat game texture, no objects, no shore, even lighting, square*
- `wiese.png`: *Seamless tileable texture of short green grass seen from directly above, a few tiny lighter and darker
  patches, soft pastel colors, flat cartoon game texture, no objects, no flowers, even lighting, square*
- `sand.png`: *Seamless tileable texture of light sandy beach seen from directly above, soft pastel colors,
  flat cartoon game texture, no objects, even lighting, square*
