# Agenten-Protokoll

Der tägliche Cloud-Agent trägt hier nach jedem Lauf ein, was er geprüft und geändert hat.
Neueste Einträge oben.

## 2026-10-25 – Täglicher Lauf (Version 37)

- Tests: alle 7 bestanden. Bot (3 Läufe à 90 min), Durchschnitt: Kleinstadt 3,9 min · 50 Einw. 17,7 min ·
  Stadt 26,2 min · 150 Einw. 34,0 min · 200 Einw. 43,1 min · Kathedrale (Läufe 2/3: 79,2 / 47,6 min) ·
  Hunger höchstens 0,2 min · Frost 0 min · 38/38 Aufträge. Alles im Zielbereich.
- Geprüfter Codebereich: Speichern/Laden und Spielstand-Plätze (`game.js` Zeilen ca. 2620–2950: `load`, `buildSaveData`,
  `slotSummary`, `completeCity`, `switchSlot`). Keine Fehler gefunden.
- Keine Änderung nötig (Version bleibt 37).

## 2026-10-25 – Einrichtung

- Tests (`tools/test.mjs`) und Balancing-Bot (`tools/bot.mjs`) ins Repo aufgenommen.
- Ausgangswerte Version 37, Bot Zufall 1: Kleinstadt 3,8 min · 50 Einw. 16,7 min · Stadt 23,0 min ·
  Kathedrale 54,9 min · Hunger 1 min · Frost 0 min · 38/38 Aufträge.
