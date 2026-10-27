# Agenten-Protokoll

Der tägliche Cloud-Agent trägt hier nach jedem Lauf ein, was er geprüft und geändert hat.
Neueste Einträge oben.

## 2026-10-27 – Fehler von Emin (Version 68)

- Bauleiste ließ sich in der gedrehten Ansicht (Handy hochkant gehalten, seit Version 60) nicht scrollen: Chrome wertet die
  Wischrichtung nach dem Bildschirm aus und scrollt im gedrehten Bereich nicht selbst. Betraf auch Fenster wie die Forschung.
  → In der gedrehten Ansicht scrollt das Spiel selbst (`setupTurnedScroll`): Fingerbewegung zurückdrehen, mit Nachschwingen,
  nach dem Wischen kein versehentlicher Klick. Mit simuliertem Handy (Chromium, Touch) gedreht und quer geprüft.

## 2026-10-27 – Analyse mit Emin (Version 67)

- Bot (3 Läufe à 90 min), Durchschnitt: Kleinstadt 5,7 min · 50 Einw. 18,7 · Stadt 24,0 · 150 Einw. 31,3 · 200 Einw. 35,5 ·
  Antike 16,2–16,9 · Mittelalter 47,1–50,6 · Industrie nur in 1 von 3 Läufen (76,9) · Hunger/Frost 0.
- Auffällig: In 2 von 3 Läufen nur 2 Gelehrte (keine Schule) → Wissen bleibt bei ~100, Forschung im Mittelalter fast still.
  → Neuer Hinweis oben im Forschungsfenster, wenn Gelehrten-Stellen leer bleiben (mit „Baue Schulen …“).
- Tägliche Belohnung erscheint nicht mehr beim allerersten Start (Tag 1 gibt es am nächsten Tag). Neuer Test für beides.
- Holz fällt im Mittelalter oft fast auf 0, taucht aber nicht unter den Engpässen auf, Frost 0 → keine Balancing-Änderung.
- Weitere Punkte aus der Analyse (spätes Spiel ohne Ziel, Banditen ohne Gefahr, Baustellen-Engpass, Steinzeit-Wartephase,
  gesperrte Gebäude in der Bauleiste) warten auf Entscheidung von Emin, siehe `vorschlaege.md`.

## 2026-10-27 – Rückmeldung von Emin (Version 60)

- Weg zur Farm (und allen Bild-Gebäuden) führt jetzt zur Spitze des Bildes in der Mitte der Seite statt zur Mitte des Straßenfelds.
- Immer quer: hochkant gehaltene Handys zeigen das Spiel um 90° gedreht (statt Hinweis „Handy drehen“); Einstellung
  „📱 Hochkant spielen“ schaltet das ab. Querformat-CSS hängt jetzt an der Klasse `html.quer` statt an einer Media-Query.
- Fehler: Nach dem Antippen eines fertigen Gebäudes blieb die Bauauswahl aktiv, der nächste Tipp aufs freie Feld setzte
  das zuletzt gewählte Gebäude → Antippen eines Gebäudes beendet die Bauauswahl.
- Wassertrog wird nicht mehr automatisch zur 1×1-Feuerwache, sondern lässt sich ab der Antike weiterentwickeln (2×1).
- Neuer Knopf oben rechts auf der Karte: Leisten aus- und einblenden.

## 2026-10-27 – Aufbruch offline (Version 59)

- Wunsch von Emin: Der Zeitalter-Aufbruch läuft offline weiter. Wird offline die letzte nötige Forschung fertig und ist sonst
  alles erfüllt, beginnt der Aufbruch von selbst; Waren werden dabei wie im Spiel abgezogen (reichen sie nicht, wartet er).
  Ist er fertig, wechselt das Zeitalter beim Zurückkommen sofort mit Meldung. Neuer Test dafür.

## 2026-10-27 – Fehlersuche mit Emin (Version 58)

- Ausführliche Fehlersuche in vier Bereichen (Zeitalter, Mauer/Tor, Weiterentwickeln/Bauen, Oberfläche), 23 Fehler behoben:
  - Weiterentwickeln: Ausbaustufe ging gratis aufs neue Gebäude über (Rohstoffe vermehrbar) → neues Gebäude startet auf Stufe 1;
    Drehen/Verschieben während des Weiterentwickelns gesperrt; Bewohner bleiben während des Umbaus; Abriss-Modus bricht nur ab.
  - Verarbeiter (z. B. Sägewerk) verbrauchten ohne Arbeiter weiter Rohstoffe → Verbrauch nach Besetzung.
  - Banditen sprangen bei Rucklern über die Mauer, plünderten eine Straße, die an Stelle ihres Ziels gebaut wurde;
    Straße an der Mauer entlang machte jedes Stück zum Tor; Tor abreißen/durchbrechen lässt jetzt die Straße liegen.
  - Zeitalter-Übersicht und Aufbruch-Karte im höchsten Zeitalter leer bzw. veraltet; Ende des Aufbruchs warf aus dem Abriss-Modus.
  - Querformat: Rohstoffe oben nicht scrollbar, Abriss-Knopf abgeschnitten, Ereignis-Fenster zu hoch, Reiterwechsel ohne Sprung
    nach oben, Notch/Home-Leiste; Hochkant-Hinweis nur noch auf Handys (≤ 600 px) mit „Trotzdem hochkant spielen“, Spiel ruht dahinter.
- Neue Tests für Weiterentwickeln (Stufe, Bewohner, Abriss-Modus), Sägewerk ohne Arbeiter, Tore beim Ziehen, große Zeitschritte.
- Offen (Entscheidung Emin): Aufbruch läuft offline nicht weiter (Forschung schon); Wassertrog → Feuerwache bleibt 1×1.

## 2026-10-27 – Sitzung mit Emin (Version 52–54)

- Zweite Wunschliste von Emin (12 Punkte, mit Bildschirmfotos) umgesetzt, siehe `wuensche.md` → Erledigt.
- Bot (3 Läufe à 90 min), Durchschnitt: Kleinstadt 5,7 min · 50 Einw. 18,4 min · Stadt 23,6 min · 150 Einw. 30,0 min ·
  200 Einw. 34,9 min · Antike 16,2–16,9 min · Mittelalter 47,7–50,3 min · Industrie nicht in 90 min · Hunger/Frost 0.
  Vorher (Version 51): Antike ca. 8 min, Mittelalter ca. 16 min. Langsamer ist gewollt (Emin: zu schnell);
  neuer Zielwert Antike 12–20 min.
- Bot baut jetzt Holzfäller statt Sägewerk für Holz, forscht schon in der Steinzeit und baut fehlende Pflichtgebäude für den Aufbruch.

## 2026-10-27 – Täglicher Lauf (Version 51)

- Tests: alle 15 bestanden. Bot (3 Läufe à 90 min), Durchschnitt: Kleinstadt 5,9 min · 50 Einw. 14,0 min ·
  Stadt 18,2 min · 150 Einw. 24,1 min · 200 Einw. 37,5 min · Kathedrale (Läufe 2/3: 41,4 / 36,7 min) ·
  Hunger 0,1 min · Frost 0 min · Aufträge 54–63/68. Alles im Zielbereich (Antike 8–8,3 min).
- `docs/wuensche.md`: keine offenen Punkte.
- Geprüfter Codebereich: keiner (Zeit für Tests und Bot verwendet, keine Auffälligkeiten im Bericht).
- Keine Änderung nötig (Version bleibt 51).

## 2026-10-26 – Sitzung mit Emin (Version 51)

- Industrie und Moderne eingebaut. Bot (150 min, Zufall 1): Antike 9,1 · Mittelalter 15,7 · Industrie 58,4 ·
  Moderne 118,9 min; Uhrturm 120,8 min; kein Hunger. Engpässe spät: Baustellen, Land, Stahl, Fabrikwaren.
- Bot baut die erste Anlage jeder neuen Kette (Kohle, Stahl, Fabrik, Strom …) zuerst.

## 2026-10-26 – Sitzung mit Emin (Version 48)

- Wunsch Emin: Ressourcen in der Steinzeit zu leicht. Sammlerin 3→2 Nahrung/6 s, Jägerlager 4→3/8 s,
  Holzfäller 2 Holz alle 6→8 s, Steinsammler 2 Stein alle 8→10 s, Steinzeit-Belohnungen halbiert.
- Bot (3 Läufe à 30 min) vorher: Antike 4,2–4,9 min, Mittelalter 9,4–10,7 min, Kleinstadt 2,4–2,8 min.
  Nachher: Antike 7,8–9,2 min, Mittelalter 18,8–19,3 min, Kleinstadt 5,2–6,7 min, Stadt 17,9–19,1 min, kein Hunger.
- Zielwert neu: Antike (Bot) 6–12 min.

## 2026-10-26 – Täglicher Lauf (Version 42)

- Tests: alle 12 bestanden. Bot (3 Läufe à 90 min), Durchschnitt: Kleinstadt 2,8 min · 50 Einw. 8,9 min ·
  Stadt 17,4 min · 150 Einw. 24,8 min · 200 Einw. 33,2 min · Kathedrale (Läufe 2/3: 34,7 / 31,3 min) ·
  Hunger 0 min · Frost 0 min · 41/41 Aufträge. Alles im Zielbereich.
- `docs/wuensche.md`: keine offenen Punkte.
- Geprüfter Codebereich: keiner (Zeit für Bot-Läufe verwendet, keine Auffälligkeiten im Bericht).
- Keine Änderung nötig (Version bleibt 42).

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
