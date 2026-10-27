# Bilder für Gebäude

Hier kommen die KI-Bilder für die Gebäude hinein. Claude baut sie ins Spiel ein
(die gezeichneten Gebäude bleiben als Ersatz, falls ein Bild fehlt).

## Dateinamen

Im Spiel: `<zeitalter>-<gebäude-id>.webp`, z. B. `1-hut.webp`, `2-farm.webp`
(Zeitalter 1 = Steinzeit, 2 = Antike, 3 = Mittelalter, 4 = Industrie, 5 = Moderne; siehe `docs/zeitalter.md`).
Claude schneidet den Hintergrund weg, verkleinert auf 384 px und trägt das Bild in `BUILDING_IMAGES` in `game.js` ein.
Eigene Bilder von Emin dürfen beliebig heißen (PNG/JPG) – Claude benennt sie um.

Bisher: 1-hut, 1-gatherer, 1-hunter, 1-woodcutter, 1-stonecutter, 1-fireplace, 1-painter, 1-watertrough, 2-house, 2-farm, 2-sawmill, 2-market, 4-coalmine, 4-steelworks, 4-factory, 4-tenement, 4-station, 4-police,
4-clocktower, 5-powerplant, 2-quarry, 2-warehouse, 2-park, 2-firestation, 2-scriptorium, 2-brickworks, 2-well, 2-guard, 2-sheepfarm, 2-fishery (Canva, Stil wie das Farm-Probebild: isometrisch, Gras-Sockel).

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
