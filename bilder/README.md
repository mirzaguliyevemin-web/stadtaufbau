# Bilder für Gebäude

Hier kommen die KI-Bilder für die Gebäude hinein. Claude baut sie ins Spiel ein
(die gezeichneten Gebäude bleiben als Ersatz, falls ein Bild fehlt).

## Dateinamen

`<zeitalter>-<gebäude>.png`, z. B. `1-farm.png`, `1-haus.png`, `2-farm.png`.
Zeitalter 1 = das erste Zeitalter (Reihenfolge siehe `docs/vorschlaege.md`).

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

> Style: cartoon game asset, soft pastel colors, clean outlines, subtle shading, top-down view with slight
> angle, same camera angle, light from top left, centered on a plain white background, no shadow on the
> ground, no text, no border, consistent style across all assets, 1:1 square format

Für 2×1-Gebäude am Ende statt „1:1 square format“: „2:1 wide format“.
