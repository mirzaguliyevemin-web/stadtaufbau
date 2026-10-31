# Epochia – Analyse Oberfläche und Bedienung (Stand V40, 31.10.2026)

Geprüft: `neu/js/oberflaeche.js`, `bedienung.js`, `start.js`, `einstieg.js`, `index.html`, `style.css`, `service-worker.js`.
Nachweise: Code-Lektüre und Headless-Chrome mit eigenen Skripten (`analyse/t1.js`, `t2.js`, `mess.js`, Fotos `win-*.png`, `res-*.png`, `g-*.png`, `m320.png`).
Es wurde nichts im Repo geändert.

Schwere: **Hoch** = blockiert/verliert etwas, **Mittel** = stört spürbar oder ist ein Logikfehler, **Niedrig** = Feinschliff.

## Was gut funktioniert (getestet)
- Zurück-Verlauf: Menü → Spielstände → 2× `history.back()` landet sauber auf Menü und dann auf dem Spielfeld (`histDepth` 2→1→0, Seitenstapel stimmt). Dialog über Dialog (Gebäude-Fenster → „Abreißen?“) belegt nur einen Eintrag, Zurück schließt ihn.
- `patchHtml`: Die Info-Blase wurde in 3 s **kein einziges Mal** neu aufgebaut (MutationObserver = 0), `el.innerHTML === infoPopHtml(i)` ist wahr → kein Flattern, Knöpfe bleiben treffbar.
- Doppelte Klicks auf Seitenknöpfe/Kacheln legen keine doppelten Verlaufseinträge an (`pageOpen !== name`).
- Doppeltipp-Zoom ist per `touch-action` überall abgeschaltet, Gummiband per `overscroll-behavior: none`.

## Befunde

### 1. Menü-Knopf im flachen Querformat unter der Bauleiste – Mittel/Hoch
- **Ort:** `style.css:625` (`.side-btn` 46 px hoch bei max-height 420), `#side` (`style.css` ~141), `index.html:42-46`.
- **Nachweis:** `mess.js` bei 750×320: Menü-Knopf 256–302 px, Bauleiste beginnt bei 260 px; `elementFromPoint` in der Knopfmitte trifft ein Bar-Tab-Emoji statt `btn-menu`. Foto `g-quer.png` (664×330): Menü ist nicht zu sehen. Tritt auf, sobald „Belohnung“ sichtbar ist (5 Knöpfe) – also bei jedem neuen Tag bis zum Abholen. iPhone SE/8 im Safari-Querformat hat ~320 px Höhe.
- **Vorschlag:** Seitenknöpfe bei `max-height: 360px` auf ~40 px verkleinern oder die Spalte mit `max-height: calc(100% - var(--top-h) - var(--bar-h))` + zwei Spalten/Scroll; alternativ „Belohnung“ als Abzeichen an Aufträge hängen.

### 2. Hinweise des Ältesten nach Wechsel des Spielstands tagelang gesperrt – Mittel
- **Ort:** `einstieg.js:98-100, 117`; `enterGame` in `start.js:49-74` setzt `lastHintAt`/`elderHint` nicht zurück.
- **Nachweis:** `t2.js`: Platz 1 mit `playTime` 36000 s, Hinweis kurz zuvor → Wechsel auf neuen Platz 2: `lastHintAt` = 35990, `playTime` 0,2 → Hinweise ~36 290 s (10 h Spielzeit) gesperrt. Umgekehrt bleibt ein offener `elderHint` des alten Standes im neuen Spiel stehen.
- **Vorschlag:** In `enterGame` `elderHint = null; lastHintAt = -1e9;` (oder `lastHintAt` im Spielstand führen).

### 3. Pfad-Modus: Ziehen, das auf einem Weg beginnt, löscht alle überstrichenen Wege – Mittel
- **Ort:** `bedienung.js:251-254`, Text `oberflaeche.js:328`.
- **Nachweis:** Code: Beginnt der Finger auf einem Weg, wird `gesture.mode = 'erase'` und jeder Weg unter dem Finger abgerissen. Wer einen bestehenden Weg verlängern will, setzt natürlich *am Wegende* an → der Weg verschwindet stückweise. Der Hinweis sagt nur „auf einen Weg tippen löscht ihn“, nicht „ziehen löscht“.
- **Vorschlag:** Löschen nur bei reinem Tippen (ohne Bewegung) oder über einen eigenen Radierer-Knopf in der Aktionsleiste; Start auf Weg = weitermalen.

### 4. Pfad-Modus: Zwei-Finger-Zoom setzt einen Weg – Niedrig/Mittel
- **Ort:** `bedienung.js:235-255`.
- **Nachweis:** Der erste Finger malt sofort bei `pointerdown` (bzw. löscht), bevor der zweite Finger zum Zoomen ankommt → zufälliger Trampelpfad (kostet Holz) oder gelöschtes Wegstück.
- **Vorschlag:** Erst nach ~DRAG_START_PX Bewegung bzw. ~80 ms ohne zweiten Finger malen.

### 5. Aktuellen Platz im Spiel löschen / Import: Spiel wird nur halb zurückgesetzt – Mittel
- **Ort:** `oberflaeche.js:1130-1135` (`doDeleteSlot`), `1149-1158` (`doImport`).
- **Nachweis:** `t2.js`: nach Löschen des offenen Platzes ist `state.tutorial = 0`, aber die Einstiegs-Blase bleibt versteckt (`renderTutorial` fehlt); Kamera wird nicht aufs Lager gesetzt (zeigt ins Leere); `resetLife()`/`resetWeather()` fehlen, Figuren/Tiere des alten Standes laufen weiter. Beim Import fehlen ebenfalls `resetLife`, `resetWeather`, `renderTutorial`, Rücksetzen von `elderHint`.
- **Vorschlag:** Beide Wege über `enterGame()` laufen lassen (nach `saveGame()`), das setzt alles einheitlich.

### 6. Zurück-Taste (Android) ohne offenes Fenster verlässt das Spiel – Mittel
- **Ort:** `oberflaeche.js:509-518`, `bedienung.js` (`ghost`, `pathMode`, Info-Blase haben keinen Verlaufseintrag).
- **Nachweis:** `t1.js`: nach `beginBuild()` bleibt `histDepth = 0`. Drückt man beim Bauen, Wege-Malen oder mit offener Info-Blase „Zurück“, verlässt der Browser die Seite bzw. schließt die PWA. Erwartet: Bauen abbrechen. Gleiches gilt für die Safari-Wischgeste vom linken Rand (im Browser, nicht als Home-Bildschirm-App).
- **Vorschlag:** In `beginBuild`/`liftBuilding`/Pfad-Modus `pushEntry('ghost')`, in `onHistoryBack` zuerst `cancelGhost()`; `cancelGhost`/`confirmGhost` dann `popEntries(1)`.

### 7. Fenster-Höhe mit `100vh` – auf iPhone-Safari (Browser) unten abgeschnitten – Mittel (Risiko)
- **Ort:** `style.css:359` (`#dialog-box { max-height: calc(100vh - 24px) }`).
- **Nachweis:** Code. In Safari mit sichtbarer Adressleiste ist `100vh` größer als der sichtbare Bereich; das zentrierte Fenster ragt oben und unten hinaus, der obere Teil ist nicht erreichbar, „Schließen“ evtl. verdeckt. Im Querformat (≈320–340 px) besonders beim langen Gebäude-Fenster (`win-quer.png` zeigt schon bei 330 px ein volles Fenster). Als Home-Bildschirm-App unkritisch.
- **Vorschlag:** `max-height: calc(100dvh - 24px)` mit `100vh` als Rückfall davor; ebenso `.logo img { max-height: 34vh }` → `dvh`.

### 8. Forschung hochkant: Wirkungs-Schild läuft in den „Erforschen“-Knopf – Niedrig/Mittel
- **Ort:** `oberflaeche.js:930-938`, CSS `.td-chips/.td-action`.
- **Nachweis:** `res-hoch.png` (390×664): „Feuer wärmen 2 Felder weiter“ ragt über „📜 Erforschen“. Die Box `.td-chips` endet bei x=224, der Text läuft aber darüber hinaus (`white-space: nowrap` des Tags), Knopf beginnt bei 236.
- **Vorschlag:** `.tag { white-space: normal }` in `.td-chips` oder `.td-action` hochkant unter den Text setzen.

### 9. Forschungsbaum am Handy sehr klein – Niedrig/Mittel
- **Ort:** `oberflaeche.js:870-880` (`fitTree`, min. 0,6), `style.css:632-636`.
- **Nachweis:** `t2.js`: Schrift 12–13 px × Skalierung 0,6 ≈ **7–8 px** effektiv, Kosten (`.nsub` 9 px) ≈ 5 px (`res-quer.png`). Die Übergangskarte „Mittelsteinzeit“ ist rechts abgeschnitten. Antippziele der Karten ≈ 83×34 px.
- **Vorschlag:** Untergrenze 0,8 und lieber waagrecht scrollen; Kosten auf der Karte weglassen (stehen im Detail).

### 10. Zahlenformat: Dezimalpunkt statt Komma – Niedrig
- **Ort:** `oberflaeche.js:353` (Info-Blase `+${n.toFixed(1)} …/min`), `oberflaeche.js:610` (Gebäude-Fenster „Stellt her: 🍖 0.0/min“).
- **Nachweis:** `t1.js`/`win-hoch.png`: „Stellt her: 🍖 0.0/min“ direkt über „Grundwert je Minute 8,0“ (dort korrekt mit `perMin`).
- **Vorschlag:** `perMin(n)` verwenden.

### 11. Texte / Grammatik – Niedrig
- `einstieg.js:126`: „Beim ${name} arbeitet niemand“ → „Beim Sammlerin“, „Beim Pflanzerin“, „Beim Tongrube“, „Beim Töpferei“ (nachgewiesen: `t1.js` → „Beim Sammlerin“). Vorschlag: „In ${name} …“ geht auch nicht immer; besser „${icon} ${name}: Hier arbeitet niemand …“.
- `oberflaeche.js:357, 612`: „Es fehlt Felle / Töpferwaren“ → Plural. Vorschlag: „Es fehlt: Felle“ (wie `missingText`) oder „Keine Felle mehr“.
- `logik.js:742`: „Erforsche erst … dann **könnt ihr** Mammuts jagen“ – Du/Ihr gemischt.
- `oberflaeche.js:594` „Kein Weg möglich – erst Bäume oder Felsen räumen.“ vs. `logik.js:187` „… Bäume, Felsen oder Wasser im Weg“ – Wasser fehlt im Fenster (Wasser kann man nicht räumen).
- `oberflaeche.js:1077`: Schalter „Musik – kommt später“ ist an und schaltbar, tut aber nichts → verwirrt; besser ausgegraut.
- Zeitformat insgesamt einheitlich („59 s“, „1:01 min“, „1 h 1 min“); bei sehr langer Abwesenheit „48 h 0 min“ – evtl. ab 24 h „2 Tage“.

### 12. Fenster schließen per Tipp daneben – Niedrig
- **Ort:** `index.html:63` (`onclick` auf `#dialog`), `oberflaeche.js:1053`, `1143-1147`.
- **Nachweis:** Code. „Willkommen zurück“ per Tipp daneben geschlossen → `afterWelcome()` läuft nicht, die Tagesbelohnung erscheint nicht (nur der Seitenknopf). Import-Fenster: ein Tipp daneben verwirft den eingefügten Text.
- **Vorschlag:** Für Import/Willkommen kein Schließen per Hintergrund, oder `afterWelcome` in `closeDialog` nachholen.

### 13. Doppeltipp auf ✔ kann gleich den nächsten Bau starten – Niedrig
- **Ort:** `oberflaeche.js:326, 331-334`.
- **Nachweis:** Code: Nach ✔ wird die Aktionsleiste ausgeblendet und an derselben Stelle erscheint die Bauleiste; der zweite Tipp landet auf einem Bauleisten-Eintrag → `beginBuild` dieses Gebäudes. Ähnlich „Ja, abreißen“ → zweiter Tipp auf die Karte.
- **Vorschlag:** Bauleiste nach ✔ ~300 ms gegen Tipps sperren.

### 14. Kleine Touch-Ziele – Niedrig
- `style.css:673`: Kategorie-Reiter im Querformat **32×24 px** (`mess.js`), Richtwert ≥ 40–44 px. `.btn.small` in der Info-Blase (Pause/Mehr) ≈ 28 px hoch.
- **Vorschlag:** Reiter mind. 36×32, Abstand 4 px.

### 15. Seiten/Anzeigen veralten, während sie offen sind – Niedrig
- Aufträge-Seite wird nicht laufend aufgefrischt (`start.js:127` ruft nur `tickResearchPage`): Wird ein Auftrag fertig, während die Seite offen ist, erscheint „Abholen“ erst nach erneutem Öffnen.
- Gebäude-Fenster: „Baustelle – noch 30 s“ und Arbeiterzahlen bleiben stehen.
- `researchSelected` (`oberflaeche.js:943`) bleibt nach fertiger Forschung und nach Spielstandwechsel stehen → Forschung öffnet bei einer schon erforschten bzw. fremden Karte statt bei der nächsten verfügbaren.

### 16. Service Worker – Niedrig/Mittel
- **Cache wächst bei jeder Update-Prüfung:** `start.js:174` holt `index.html?pruefen=<Zeit>`; der Worker (`service-worker.js:41-53`) legt jede dieser Adressen als eigenen Cache-Eintrag ab (alle 5 min + bei jedem Zurückkehren). Vorschlag: Anfragen mit `pruefen` nicht cachen (`if (url.searchParams.has('pruefen')) return;`).
- **Kein Zeitlimit beim „Netzwerk zuerst“:** Bei schlechtem Netz (Zug, Funkloch mit Rest-Empfang) hängt jedes der ~100 Bilder bis zum Browser-Timeout, bevor der Cache greift → sehr langer Ladebildschirm. Vorschlag: `Promise.race` mit ~3 s Timeout, dann Cache.
- **`cache.addAll` beim Installieren nutzt den HTTP-Cache** (`service-worker.js:28`): GitHub Pages liefert `max-age=600`, der neue Cache kann also für bis zu 10 min alte JS-Dateien enthalten → offline gemischte Versionen. Vorschlag: `cache.addAll(ASSETS.map(u => new Request(u, { cache: 'reload' })))`.
- Positiv: `skipWaiting` + `clients.claim`, Netzwerk zuerst mit `no-cache`, Update-Banner mit „Später“, Speichern vor dem Neuladen – Aktualisierung online zuverlässig. Offline-Start funktioniert über `ignoreSearch` (auch mit `?direkt`).

### 17. iPhone-Kleinigkeiten – Niedrig
- `style.css:28`: kein `-webkit-touch-callout: none` → langes Drücken auf Bilder (Bauleiste, Info-Blase, Forschungskarten) kann in iOS das Bild-Menü/Vorschau öffnen. Vorschlag: `* { -webkit-touch-callout: none }`, `img { -webkit-user-drag: none }`.
- `style.css:311`: `--safe-t` wird benutzt, aber nie definiert (Rückfall 0). Vorschlag: `--safe-t: env(safe-area-inset-top, 0px)` in `:root`, auch für `#topbar`/`.page-head` oben.
- `#toast` (`style.css:327-330`) sitzt fest bei `top: 50px` und überdeckt hochkant die zweizeilige Warenleiste (≈75 px). Vorschlag: `top: calc(var(--top-h) + 6px)`.
- Mehrere Meldungen kurz hintereinander (z. B. `evolved`-Schleife `start.js:138`) überschreiben sich, nur die letzte ist lesbar.

### 18. Einstieg (Tutorial) – Niedrig
- Alle Schritte außer dem letzten haben „Überspringen“, „Einstieg neu starten“ im Menü vorhanden – hängen bleiben kann man nicht.
- Ist die Bauleiste eingeklappt (`settings.barHidden`), zeigt der Leuchtrahmen auf einen unsichtbaren Eintrag; die Leiste klappt nicht von selbst auf (`einstieg.js:62-73`, `oberflaeche.js:283`). Vorschlag: bei `bar:`-Zielen `toggleBuildBar(false)`.
- Während eines Bau-Schritts setzt `renderBuildBar` die Kategorie alle 0,25 s zurück (`oberflaeche.js:283`) – der Spieler kann im Einstieg keinen anderen Reiter ansehen (gewollt, aber wirkt wie „Knopf geht nicht“).

### 19. Barrierearmut (grob) – Niedrig
- Aktionsknöpfe ✖ ↻ ✔ (`oberflaeche.js:324-326`), Seitenknöpfe-Abzeichen und Reiter (hochkant nur Emoji) ohne `aria-label`/`title`.
- Zustand nur über Farbe: `.cost.short` rot, `.chip.full` gelb – Zahlen sind aber dabei, also ausreichend.
- `user-scalable=no` + `maximum-scale=1` verhindern Vergrößern (in iOS ohnehin ignoriert) – für ein Spiel vertretbar.

### 20. Kleinkram im Code – Niedrig
- `bedienung.js:48-49`: `autoOrient` liest `BUILDINGS[ghost.type]` vor der Prüfung `!ghost` – heute harmlos (immer mit Geist aufgerufen), aber fallengefährlich.
- `doDeleteSlot` vom Startbildschirm aus: Knopf „▶ Weiterspielen (Platz n)“ bleibt stehen, obwohl der Platz gelöscht ist (`showStartScreen` wird nicht erneut aufgerufen); führt dann ein neues Spiel herbei – irreführend.
- Escape-Taste (`bedienung.js:375`) schließt keine Dialoge/Seiten (nur Desktop relevant).

## Kurz-Priorität
1. Menü-Knopf im Querformat (1), Zurück-Taste beim Bauen (6), Pfad-Löschfalle (3).
2. Rücksetzen bei Platzwechsel/Löschen/Import (2, 5).
3. `dvh` für Fenster (7), Forschung hochkant/Lesbarkeit (8, 9).
4. Texte (10, 11), Service-Worker-Feinschliff (16), iOS-Kleinigkeiten (17).
