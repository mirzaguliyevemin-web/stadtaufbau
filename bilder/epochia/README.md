# Epochia – Bilder

Seit 15.11.2026 entstehen alle Bilder mit **Scenario** im halb-realistischen Stil (die alten Canva-Prompts wurden am
18.11.2026 entfernt, sie stehen noch in der Git-Geschichte). Was noch fehlt und was es kostet: `docs/plan-bilder-neu.md`.

## Ordner

| Ordner | Inhalt |
|---|---|
| `gebaeude/<name>/` | je Gebäude ein Ordner: `1-name.webp`, `1-name-winter.webp`, Rückansicht `…-r2`, Wassergebäude `…-r1`, Wunderwerke `…-bau`, `…-halb` |
| `figuren/` | Menschen, Bewegungen (je 3 Bilder), Tiere, Boote, Händler |
| `gelaende/` | Boden, Bäume, Felsen, Berge, Hügel, Brücken, Wasserfall |
| `forschung/`, `waren/`, `fundstuecke/`, `deko/`, `oberflaeche/` | Bildchen, Leisten, Symbole, Startseite |
| `musik/` | Musikstücke |
| `quelle/` | die Originale in voller Größe, gleich sortiert |

Das Spiel findet den Ordner über den Namen (`imagePath` in `neu/js/zeichnen.js`); der Test „Bilder“ prüft, dass alles am richtigen Platz liegt.

## Einbauen

```
python3 neu/tools/bild-einbauen.py quelle.png bilder/epochia/gebaeude/x/1-x.webp 640           # freistellen, zuschneiden
python3 neu/tools/bild-einbauen.py quelle.png bilder/epochia/gebaeude/x/1-x-winter.webp 640 --schnee
python3 neu/tools/bild-einbauen.py quelle.png bilder/epochia/oberflaeche/start.webp 1600 --ganz  # ohne Freistellen
```

Weitere Helfer in `neu/tools/`: `platte-fuellen.py` (Lücken am Plattenrand), `schnee-rand.py`, `rauch-weg.py`,
`wasser-weg.py`, `wasser-farbe.py`, `textur-einbauen.py` (Gelände).
