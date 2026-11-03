# Zusatzpaket „Konto, Stufen & Freunde“ (Epochia) – Plan

Stand: 31.10.2026, nur geplant, noch nichts gebaut. Wird in Sitzungen mit Emin umgesetzt.

## Entscheidungen von Emin

- **Wer spielt:** zuerst Emin und Familie. Wenn alles fertig ist: Veröffentlichung im **Google Play Store**.
- **Anmeldung:** E-Mail (Anmelde-Link) reicht zuerst, Google-Anmeldung später. **Kein Apple.**
- **Geschenke:** **Schmuck** (Deko-Gebäude, Profilbilder, Rahmen, Titel), keine Spielhilfen.
- **Freunde:** Liste **und Siedlung besuchen** (ansehen).
- **Zeitpunkt:** erst nach der Bronzezeit, eventuell auch erst nach weiteren Zeitaltern. Keine Eile.

## Stand

2026-11-01: **Schritt A gebaut** (`neu/js/konto.js`, Knopf „☁️ Konto“ im Menü). Supabase-Projekt `nisfsdkjxtzovxqzovtn` (Frankfurt).
Datenbank: `profile` (Name, Nummer), `spielstaende` (je Platz, `version` zählt der Server), Funktion `konto_loeschen()`, alles mit RLS.
Ohne Bibliothek (nur fetch), Spielen ohne Konto und offline unverändert. Ins Spiel kommt nur der öffentliche Schlüssel, nie `service_role`.

So bleibt kein Spielstand auf der Strecke: Das Gerät merkt sich die zuletzt gesehene Cloud-Version und schreibt nur auf genau diese.
Hat sich die Cloud geändert (oder wäre es ein deutlicher Rückschritt), fragt das Spiel: „Cloud laden / Dieses Gerät behalten“.
Vor dem Laden wird der Gerätestand in `epochia-save-N-vorher` aufgehoben. Sicherung höchstens alle 3 Minuten und beim Verlassen.

Noch einzustellen im Supabase-Dashboard (geht nicht per Werkzeug):
- Authentication → URL Configuration: Site URL und Redirect URLs = `https://mirzaguliyevemin-web.github.io/stadtaufbau/neu/`
- Der eingebaute Mail-Versand ist nur zum Ausprobieren gedacht (sehr wenige Mails je Stunde). Für viele Spieler später eigenen SMTP-Dienst eintragen.
- Für den Play Store: Datenschutzerklärung nötig. Gespeichert werden E-Mail, Profilname, Spielstände.

## Technik

- Server: **Supabase** (kostenloser Tarif): Anmeldung, Datenbank, Zugriffsregeln (RLS). Spiel bleibt auf GitHub Pages.
- Kostenloser Tarif schläft nach ca. 1 Woche ohne Nutzung ein → täglicher kleiner Aufruf.
- Spielen ohne Konto und ohne Internet bleibt möglich; Konto ist ein Zusatz.
- Neue Datei `neu/js/konto.js`. Supabase-Bibliothek muss offline nicht laden können, ohne dass das Spiel ausfällt.
- Tabellen (Entwurf):
  - `profile` (Nutzer-ID, Name, Nummer, EP, Stufe, höchstes Zeitalter, Profilbild, Titel, erstellt)
  - `spielstaende` (Nutzer, Platz 1–3, Daten, geändert) → Cloud-Sicherung und Grundlage für „Siedlung besuchen“
  - `freunde` (A, B, Status: angefragt/angenommen)
  - `geschenke` (Nutzer, Stufe, Geschenk, eingelöst)
- Stufe/EP/Geschenke liegen im **Konto**, nicht im Spielstand. Neue Spielstandfelder nur über `sanitizeState`.

## Konto und ID

- Name + kurze Nummer, z. B. **Emin#4821**; diese ID gibt man Freunden.
- Profil: Name, ID, Stufe, Zeitalter, Profilbild (aus den Menschen-Bildern), Titel, „dabei seit“.
- Cloud-Sicherung der Spielstände (Handywechsel, Browser geleert).
- „Konto löschen“ im Spiel und Datenschutzerklärung (für den Play Store Pflicht).

## Stufen

EP für die ganze Person, über alle Spielstände:

| Aktion | EP |
|---|---|
| Gebäude fertig | 5 |
| Forschung fertig | 20 |
| Neues Zeitalter | 200 |
| Tägliche Anmeldung | 10 + Serienbonus |
| Aufgaben | 30–100 |

Jede Stufe braucht etwas mehr EP. Server prüft grob auf Glaubwürdigkeit (max. EP pro Stunde).

## Geschenke (nur Schmuck)

- Deko-Gebäude nur über Stufen (z. B. Totempfahl, Steinfigur, Fahnenmast) → Canva-Bilder nötig.
- Profilbilder, Rahmen, Titel („Mammutjäger“ …).
- Alle 5 Stufen ein größeres Geschenk.
- Geschenkkiste: Deko-Gebäude löst man in einem gewählten Spielstand ein.

## Freunde

- Hinzufügen über ID oder Einladungslink (WhatsApp); Anfrage muss angenommen werden.
- Liste: Name, Stufe, Zeitalter, zuletzt gespielt.
- **Siedlung besuchen:** Cloud-Spielstand des Freundes wird nur angezeigt (keine Bedienung, kein Speichern).
- Später möglich: Rangliste unter Freunden.

## Google Play Store (später)

- Epochia ist eine PWA → als App verpacken mit **Trusted Web Activity** (Werkzeug „Bubblewrap“), Code bleibt gleich.
- Google-Entwicklerkonto (einmalig 25 $), Datenschutzerklärung, Konto löschen im Spiel und über eine Webseite,
  Angaben zur Datensicherheit, Altersfreigabe.
- Neue Entwicklerkonten müssen vor der Veröffentlichung einen geschlossenen Test mit Testern machen (Familie).

## Reihenfolge

| Schritt | Inhalt |
|---|---|
| A ✅ | Supabase einrichten, E-Mail-Anmeldung, Profil mit ID, Cloud-Spielstand |
| B | EP und Stufen, Anzeige im Menü, Geschenkkiste |
| C | Schmuck-Geschenke: Deko-Gebäude (Canva), Profilbilder, Rahmen, Titel |
| D | Freundesliste (ID-Suche, Einladungslink, Anfragen) |
| E | Siedlung besuchen |
| F | Google-Anmeldung, Play-Store-Paket (wartet auf Emins Gewerbe, Stand 03.11.2026) |
