# Epochia

Aufbauspiel durch die Zeitalter als PWA: reines HTML, CSS und JavaScript mit Canvas, kein Server nötig.

**Spielen:** https://mirzaguliyevemin-web.github.io/stadtaufbau/ (leitet zu `…/neu/` weiter)

## Ordner

| Ordner | Inhalt |
|---|---|
| `neu/` | das Spiel: `js/`, `style.css`, `tools/` (Tests, Bot, Bild-Werkzeuge) |
| `bilder/epochia/` | Bilder nach Art sortiert, Gebäude je im eigenen Ordner, Originale unter `quelle/`, dazu `musik/` und die Bild-Prompts |
| `docs/` | Pläne, Wunschliste (`wuensche.md`), Protokoll des täglichen Agenten |
| `archiv/altes-spiel/` | das alte Spiel mit Draufsicht, wird nicht mehr bearbeitet |

Regeln für die Arbeit am Spiel: `CLAUDE.md`. Tests: `node neu/tools/test.mjs`, Bot: `node neu/tools/bot.mjs 90 3`.
