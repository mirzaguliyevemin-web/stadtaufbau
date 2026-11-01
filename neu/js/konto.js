'use strict';
// Epochia – Konto (freiwillig): Anmeldung per E-Mail, Profil mit Nummer, Spielstand in der Cloud (Supabase).
// Ohne Konto und ohne Internet läuft das Spiel genau wie immer: Jeder Netzfehler bleibt hier drin.
// Kein Spielstand wird still überschrieben: Der Server zählt jede Änderung (version); hat sich der Cloud-Stand seit
// dem letzten Abgleich dieses Geräts geändert, entscheidet der Spieler. Vor dem Laden aus der Cloud wird der
// Gerätestand unter epochia-save-N-vorher aufgehoben.

// Beides ist öffentlich und darf im Code stehen; die Zugriffsregeln (RLS) liegen in der Datenbank.
const KONTO_URL = 'https://nisfsdkjxtzovxqzovtn.supabase.co';
const KONTO_SCHLUESSEL = 'sb_publishable_zhn0aC2M1pjH595UeZ0RmA_4K2qrCp0';
const KONTO_KEY = 'epochia-konto';
const KONTO_ZIEL = 'https://mirzaguliyevemin-web.github.io/stadtaufbau/neu/';   // hierher führen die Links in den Mails
const KONTO_TAKT = 3 * 60 * 1000;       // höchstens alle 3 Minuten sichern
const KONTO_TAKT_RAUS = 30 * 1000;      // beim Verlassen des Spiels höchstens alle 30 Sekunden
const KONTO_TAKT_PRUEFEN = 60 * 1000;   // beim Zurückkehren höchstens jede Minute nachsehen
const KONTO_KEEPALIVE = 60000;          // größere Daten lässt der Browser beim Schließen nicht mehr los

let konto = null;                 // { access, refresh, expires, id, email, name, nummer, basis: { Platz: Version }, zeit: { Platz: ms } }
let kontoAbgeglichen = {};        // Plätze, die in dieser Sitzung verglichen sind – erst dann wird hochgeladen
let kontoKonflikt = null;         // { slot, daten, version } wartet auf die Entscheidung des Spielers
let kontoLetzterVersuch = 0, kontoLetztesPruefen = 0;
let kontoReihe = Promise.resolve();   // Abgleich und Upload laufen nacheinander, nie gleichzeitig
let kontoMeldung = '', kontoMeldungFehler = false, kontoEmail = '';

function kontoMerken() {
  if (konto) storageSet(KONTO_KEY, JSON.stringify(konto));
  else { try { localStorage.removeItem(KONTO_KEY); } catch (e) { /* egal */ } }
}

function kontoLaden() {
  try {
    const k = JSON.parse(storageGet(KONTO_KEY) || 'null');
    if (k && typeof k.access === 'string' && typeof k.refresh === 'string') konto = { basis: {}, zeit: {}, ...k };
  } catch (e) { konto = null; }
}

// Netz: wirft bei Ausfall einen Fehler, den die Aufrufer abfangen
async function kontoFetch(pfad, optionen = {}, keepalive = false) {
  if (typeof fetch !== 'function') throw new Error('kein Netz');
  const headers = { apikey: KONTO_SCHLUESSEL, 'Content-Type': 'application/json', ...(optionen.headers || {}) };
  const steuer = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const uhr = steuer ? setTimeout(() => steuer.abort(), 15000) : 0;
  try {
    return await fetch(KONTO_URL + pfad, { ...optionen, headers, keepalive, ...(steuer ? { signal: steuer.signal } : {}) });
  } finally { clearTimeout(uhr); }
}

async function kontoJson(res) {
  try { return await res.json(); } catch (e) { return null; }
}

function kontoSitzung(j) {
  const alt = konto || {};
  const gleich = alt.id && j.user && alt.id === j.user.id;
  konto = {
    access: j.access_token, refresh: j.refresh_token,
    expires: j.expires_at ? j.expires_at * 1000 : Date.now() + (j.expires_in || 3600) * 1000,
    id: j.user ? j.user.id : alt.id, email: j.user ? j.user.email : alt.email,
    name: gleich ? alt.name : '', nummer: gleich ? alt.nummer : '',
    basis: gleich ? alt.basis || {} : {}, zeit: gleich ? alt.zeit || {} : {},
  };
  kontoMerken();
}

// Gültiges Zugangszeichen; läuft es bald ab, wird es erneuert. Lehnt der Server ab, ist die Sitzung vorbei.
async function kontoToken(erzwingen = false) {
  if (!konto) throw new Error('nicht angemeldet');
  if (!erzwingen && konto.expires - Date.now() > 60000) return konto.access;
  const res = await kontoFetch('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: JSON.stringify({ refresh_token: konto.refresh }) });
  if (res.status === 400 || res.status === 401 || res.status === 403) {
    konto = null;
    kontoAbgeglichen = {};
    kontoMerken();
    toast('☁️ Bitte melde dich neu an – dein Spiel läuft auf diesem Gerät normal weiter');
    throw new Error('Sitzung beendet');
  }
  if (!res.ok) throw new Error('Server antwortet nicht');
  const j = await kontoJson(res);
  if (!j || !j.access_token) throw new Error('Server antwortet nicht');
  kontoSitzung(j);
  return konto.access;
}

// Anfrage an die Datenbank; ist das Zeichen doch abgelaufen, einmal erneuern und wiederholen
async function kontoRest(pfad, optionen = {}, keepalive = false) {
  const anfrage = t => kontoFetch(pfad, { ...optionen, headers: { Authorization: 'Bearer ' + t, ...(optionen.headers || {}) } }, keepalive);
  let res = await anfrage(await kontoToken());
  if (res.status === 401) res = await anfrage(await kontoToken(true));
  return res;
}

async function kontoProfilHolen() {
  if (!konto) return;
  const res = await kontoRest(`/rest/v1/profile?select=name,nummer&id=eq.${encodeURIComponent(konto.id)}`);
  if (!res.ok || !konto) return;
  const j = await kontoJson(res);
  if (Array.isArray(j) && j[0]) { konto.name = String(j[0].name || ''); konto.nummer = String(j[0].nummer || ''); kontoMerken(); }
}

// Kurzinfo zu einem Spielstand-Text, ohne ihn zu laden
function kontoInfo(text) {
  try {
    const d = JSON.parse(text);
    if (!d || typeof d !== 'object') return null;
    const stage = STAGES.find(s => s.id === d.stage) || STAGES[0];
    return { stage: stage.name, pop: Math.floor(Number(d.pop) || 0), savedAt: Number(d.savedAt) || 0, playTime: Number(d.playTime) || 0 };
  } catch (e) { return null; }
}

function kontoInfoText(info) {
  if (!info) return 'nicht lesbar';
  const datum = info.savedAt ? new Date(info.savedAt).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' }) : 'unbekannt';
  return `${info.stage} · ${info.pop} Einwohner · ${datum}`;
}

// Cloud und Gerät vergleichen. Ergebnis: 'gleich', 'hoch' (Gerät weiter, wird gesichert), 'frage' (Spieler entscheidet)
function kontoEinzeln(aufgabe) {
  const lauf = kontoReihe.then(aufgabe);
  kontoReihe = lauf.catch(() => {});
  return lauf;
}

function kontoAbgleich(slot = currentSlot) { return kontoEinzeln(() => kontoAbgleichJetzt(slot)); }

async function kontoAbgleichJetzt(slot) {
  if (!konto || kontoKonflikt) return 'warten';
  const res = await kontoRest(`/rest/v1/spielstaende?select=daten,version&nutzer=eq.${encodeURIComponent(konto.id)}&platz=eq.${slot}`);
  if (!res.ok) return 'fehler';
  const zeilen = await kontoJson(res);
  if (!konto || !Array.isArray(zeilen)) return 'fehler';
  const cloud = zeilen[0], lokal = storageGet(SAVE_PREFIX + slot);
  if (!cloud) {
    delete konto.basis[slot];
    kontoAbgeglichen[slot] = true;
    kontoMerken();
    if (!lokal) return 'gleich';
    await kontoHochladenJetzt(slot);
    return 'hoch';
  }
  const iCloud = kontoInfo(cloud.daten), iLokal = lokal ? kontoInfo(lokal) : null;
  const gleicherStand = iCloud && iLokal && iCloud.savedAt === iLokal.savedAt && iCloud.playTime === iLokal.playTime;
  // Gerät kennt genau diese Cloud-Version → Gerät ist weiter. Ausnahme: Es wäre ein deutlicher Rückschritt (neu angefangen)
  const bekannt = konto.basis[slot] === cloud.version;
  const rueckschritt = iCloud && iLokal && iCloud.playTime > iLokal.playTime + 120;
  if (gleicherStand || !iCloud || (bekannt && lokal && !rueckschritt)) {
    konto.basis[slot] = cloud.version;
    kontoAbgeglichen[slot] = true;
    kontoMerken();
    return gleicherStand ? 'gleich' : 'hoch';
  }
  kontoAbgeglichen[slot] = false;
  kontoKonflikt = { slot, daten: cloud.daten, version: cloud.version };
  kontoFrageZeigen();
  return 'frage';
}

function kontoFrageZeigen() {
  if (!kontoKonflikt) return;
  if (typeof dialogOpen !== 'undefined' && dialogOpen) {   // nicht über ein anderes Fenster legen (z. B. „Willkommen zurück“)
    setTimeout(kontoFrageZeigen, 3000);
    return;
  }
  const lokal = storageGet(SAVE_PREFIX + kontoKonflikt.slot);
  openDialog(`<h2>☁️ Welcher Spielstand soll gelten?</h2>
    <p>Auf Platz ${kontoKonflikt.slot} unterscheiden sich dieses Gerät und die Cloud.</p>
    <div class="info-list">
      <div><span>☁️ Cloud</span><small>${esc(kontoInfoText(kontoInfo(kontoKonflikt.daten)))}</small></div>
      <div><span>📱 Dieses Gerät</span><small>${esc(lokal ? kontoInfoText(kontoInfo(lokal)) : 'kein Spielstand')}</small></div>
    </div>
    <p class="hint">Der andere Stand wird dann ersetzt.</p>
    <div class="buttons">
      <button class="btn primary" onclick="kontoCloudLaden()">Cloud laden</button>
      <button class="btn" onclick="kontoGeraetBehalten()">Dieses Gerät behalten</button>
    </div>`);
}

// Cloud-Stand übernehmen: erst prüfen, dann den Gerätestand aufheben, dann über den normalen Weg laden
function kontoCloudLaden() {
  const k = kontoKonflikt;
  closeDialog();
  if (!k) return false;
  kontoKonflikt = null;
  let brauchbar = false;
  try { brauchbar = !!sanitizeState(JSON.parse(k.daten)); } catch (e) { brauchbar = false; }
  if (!brauchbar) {
    toast('☁️ Der Cloud-Stand ist beschädigt – dein Spiel auf diesem Gerät bleibt');
    kontoAbgeglichen[k.slot] = false;
    return false;
  }
  const lokal = storageGet(SAVE_PREFIX + k.slot);
  if (lokal) storageSet(SAVE_PREFIX + k.slot + '-vorher', lokal);
  storageSet(SAVE_PREFIX + k.slot, k.daten);
  if (konto) { konto.basis[k.slot] = k.version; kontoMerken(); }
  kontoAbgeglichen[k.slot] = true;
  if (k.slot === currentSlot && typeof gameRunning !== 'undefined' && gameRunning) {
    if (typeof closeAllPages === 'function') closeAllPages();
    gameRunning = false;   // enterGame soll den neuen Stand laden, nicht den alten vorher wieder speichern
    enterGame();
  }
  toast('☁️ Spielstand aus der Cloud geladen');
  return true;
}

// Gerätestand behalten: Die Cloud bekommt ihn; basis auf die gesehene Version, damit nur genau diese ersetzt wird
function kontoGeraetBehalten() {
  const k = kontoKonflikt;
  closeDialog();
  if (!k || !konto) { kontoKonflikt = null; return Promise.resolve(); }
  kontoKonflikt = null;
  konto.basis[k.slot] = k.version;
  kontoAbgeglichen[k.slot] = true;
  kontoMerken();
  return kontoHochladen(k.slot).catch(() => {});
}

// Stand hochladen. Nur auf die zuletzt gesehene Version schreiben – sonst hat ein anderes Gerät gesichert.
function kontoHochladen(slot = currentSlot, keepalive = false) { return kontoEinzeln(() => kontoHochladenJetzt(slot, keepalive)); }

async function kontoHochladenJetzt(slot, keepalive = false) {
  if (!konto || !kontoAbgeglichen[slot] || kontoKonflikt) return false;
  const daten = storageGet(SAVE_PREFIX + slot);
  if (!daten) return false;
  const basis = konto.basis[slot];
  const bleib = keepalive && daten.length < KONTO_KEEPALIVE;
  const res = basis === undefined
    ? await kontoRest('/rest/v1/spielstaende?select=version', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ nutzer: konto.id, platz: slot, daten }) }, bleib)
    : await kontoRest(`/rest/v1/spielstaende?select=version&nutzer=eq.${encodeURIComponent(konto.id)}&platz=eq.${slot}&version=eq.${basis}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ daten }) }, bleib);
  if (!konto) return false;
  const zeilen = res.ok ? await kontoJson(res) : null;
  if (!konto) return false;
  if (res.status === 409 || (res.ok && (!Array.isArray(zeilen) || !zeilen[0]))) {   // anderes Gerät war schneller → neu vergleichen
    kontoAbgeglichen[slot] = false;
    await kontoAbgleichJetzt(slot);
    return false;
  }
  if (!res.ok) return false;
  konto.basis[slot] = zeilen[0].version;
  konto.zeit[slot] = Date.now();
  kontoMerken();
  if (pageOpen === 'konto') kontoSeiteNeu();
  return true;
}

// Wird nach jedem Speichern aufgerufen: gedrosselt sichern. Darf nie etwas stören.
function kontoNachSpeichern() {
  if (!konto || !kontoAbgeglichen[currentSlot]) return;
  const jetzt = Date.now();
  if (jetzt - kontoLetzterVersuch < KONTO_TAKT) return;
  kontoLetzterVersuch = jetzt;
  kontoHochladen(currentSlot).catch(() => {});
}

function kontoBeimVerlassen() {
  if (!konto || !kontoAbgeglichen[currentSlot]) return;
  const jetzt = Date.now();
  if (jetzt - kontoLetzterVersuch < KONTO_TAKT_RAUS) return;
  kontoLetzterVersuch = jetzt;
  kontoHochladen(currentSlot, true).catch(() => {});
}

function kontoPruefen() {
  if (!konto || typeof gameRunning === 'undefined' || !gameRunning) return;
  if (kontoKonflikt) { if (!dialogOpen) kontoFrageZeigen(); return; }   // Fenster weggewischt: Entscheidung steht noch aus
  const jetzt = Date.now();
  if (jetzt - kontoLetztesPruefen < KONTO_TAKT_PRUEFEN) return;
  kontoLetztesPruefen = jetzt;
  kontoAbgleich(currentSlot).catch(() => {});
}

// Am Anfang von enterGame: Bis zum neuen Vergleich wird nichts hochgeladen (etwa ein gerade neu begonnenes Spiel)
function kontoVorSpielstart() { kontoAbgeglichen = {}; }

// Am Ende von enterGame: anderer Platz oder neuer Start → neu vergleichen
function kontoNachSpielstart() {
  if (!konto) return;
  kontoLetztesPruefen = Date.now();
  kontoAbgleich(currentSlot).catch(() => {});
}

// ---------------------------------------------------------------------
// Anmelden, Registrieren, Abmelden
// ---------------------------------------------------------------------

function kontoFehlertext(j, status) {
  const code = j && (j.error_code || j.code), text = String((j && (j.msg || j.error_description || j.message)) || '');
  if (code === 'invalid_credentials' || /invalid login/i.test(text)) return 'E-Mail oder Passwort stimmt nicht.';
  if (code === 'email_not_confirmed' || /not confirmed/i.test(text)) return 'Bitte bestätige zuerst deine E-Mail (Link in der Mail, auch im Spam-Ordner nachsehen).';
  if (code === 'user_already_exists' || code === 'email_exists' || /already registered/i.test(text)) return 'Diese E-Mail ist schon vergeben. Melde dich an oder setze das Passwort zurück.';
  if (code === 'weak_password' || /password should/i.test(text)) return 'Das Passwort ist zu kurz oder zu einfach (mindestens 6 Zeichen).';
  if (code === 'validation_failed' || code === 'email_address_invalid' || /invalid format|invalid email/i.test(text)) return 'Das sieht nicht wie eine E-Mail-Adresse aus.';
  if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit' || status === 429) return 'Gerade zu viele Versuche. Bitte warte etwas und versuche es dann noch einmal.';
  if (code === 'signup_disabled') return 'Neue Konten sind gerade nicht möglich.';
  return 'Das hat nicht geklappt. Bitte versuche es später noch einmal.';
}

function kontoSagen(text, fehler = false) {
  kontoMeldung = text;
  kontoMeldungFehler = fehler;
  if (pageOpen === 'konto') kontoSeiteNeu();
}

const KONTO_OFFLINE = 'Keine Verbindung. Dein Spiel läuft trotzdem normal weiter – versuche es später noch einmal.';

function kontoEingaben() {
  const mail = $('konto-mail'), pass = $('konto-pass');
  kontoEmail = mail && mail.value ? String(mail.value).trim() : kontoEmail;
  return { email: kontoEmail, password: pass ? String(pass.value || '') : '' };
}

async function kontoAnmelden() {
  const { email, password } = kontoEingaben();
  if (!email || !password) return kontoSagen('Bitte E-Mail und Passwort eingeben.', true);
  try {
    const res = await kontoFetch('/auth/v1/token?grant_type=password', { method: 'POST', body: JSON.stringify({ email, password }) });
    const j = await kontoJson(res);
    if (!res.ok || !j || !j.access_token) return kontoSagen(kontoFehlertext(j, res.status), true);
    await kontoEingeloggt(j);
    kontoSagen('Du bist angemeldet.');
  } catch (e) { kontoSagen(KONTO_OFFLINE, true); }
}

async function kontoRegistrieren() {
  const { email, password } = kontoEingaben();
  if (!email || !password) return kontoSagen('Bitte E-Mail und Passwort eingeben.', true);
  try {
    const res = await kontoFetch(`/auth/v1/signup?redirect_to=${encodeURIComponent(KONTO_ZIEL)}`, { method: 'POST', body: JSON.stringify({ email, password }) });
    const j = await kontoJson(res);
    if (!res.ok || !j) return kontoSagen(kontoFehlertext(j, res.status), true);
    if (j.access_token) {   // ohne Bestätigungspflicht: gleich angemeldet
      await kontoEingeloggt(j);
      return kontoSagen('Willkommen! Dein Konto ist angelegt.');
    }
    // Supabase verrät eine vergebene Adresse nur so: Nutzer ohne Identitäten
    const nutzer = j.user || j;
    if (Array.isArray(nutzer.identities) && nutzer.identities.length === 0) return kontoSagen('Diese E-Mail ist schon vergeben. Melde dich an oder setze das Passwort zurück.', true);
    kontoSagen('Fast geschafft: Wir haben dir eine Mail geschickt. Klicke auf den Link darin (auch im Spam-Ordner nachsehen).');
  } catch (e) { kontoSagen(KONTO_OFFLINE, true); }
}

async function kontoEingeloggt(sitzung) {
  kontoSitzung(sitzung);
  kontoAbgeglichen = {};
  kontoKonflikt = null;
  kontoLetzterVersuch = 0;
  await kontoProfilHolen().catch(() => {});
  if (typeof gameRunning !== 'undefined' && gameRunning) { saveGame(); await kontoAbgleich(currentSlot).catch(() => {}); }
}

async function kontoPasswortVergessen() {
  const { email } = kontoEingaben();
  if (!email) return kontoSagen('Bitte zuerst deine E-Mail eintragen.', true);
  try {
    const res = await kontoFetch(`/auth/v1/recover?redirect_to=${encodeURIComponent(KONTO_ZIEL)}`, { method: 'POST', body: JSON.stringify({ email }) });
    if (!res.ok) return kontoSagen(kontoFehlertext(await kontoJson(res), res.status), true);
    kontoSagen('Wenn es zu dieser E-Mail ein Konto gibt, kommt gleich eine Mail mit einem Link.');
  } catch (e) { kontoSagen(KONTO_OFFLINE, true); }
}

// Abmelden: Sitzung weg, Spielstände auf dem Gerät bleiben
function kontoAbmelden() {
  const alt = konto;
  konto = null;
  kontoAbgeglichen = {};
  kontoKonflikt = null;
  kontoMerken();
  kontoSagen('Du bist abgemeldet. Deine Spielstände auf diesem Gerät bleiben.');
  if (alt) kontoFetch('/auth/v1/logout', { method: 'POST', headers: { Authorization: 'Bearer ' + alt.access } }).catch(() => {});
}

async function kontoJetztSichern() {
  if (!konto) return;
  if (kontoKonflikt) return kontoFrageZeigen();
  try {
    kontoLetzterVersuch = Date.now();   // erst danach speichern: sonst liefe die gedrosselte Sicherung zusätzlich
    saveGame();
    const stand = await kontoAbgleich(currentSlot);
    if (stand === 'frage' || stand === 'warten') return;
    if (stand === 'fehler') return kontoSagen(KONTO_OFFLINE, true);
    const geschafft = await kontoHochladen(currentSlot);
    if (geschafft) kontoSagen('Gesichert.');
    else if (!kontoKonflikt) kontoSagen('Gerade nicht möglich – versuche es gleich noch einmal.', true);
  } catch (e) { kontoSagen(KONTO_OFFLINE, true); }
}

async function kontoNameSpeichern() {
  const feld = $('konto-name');
  const name = feld ? String(feld.value || '').trim().slice(0, 24) : '';
  if (!konto || !name) return kontoSagen('Bitte einen Namen eintragen.', true);
  try {
    const res = await kontoRest(`/rest/v1/profile?id=eq.${encodeURIComponent(konto.id)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ name }) });
    if (!res.ok) return kontoSagen('Der Name ließ sich nicht speichern.', true);
    konto.name = name;
    kontoMerken();
    kontoSagen('Name gespeichert.');
  } catch (e) { kontoSagen(KONTO_OFFLINE, true); }
}

function kontoLoeschenFragen() {
  openDialog(`<h2>Konto löschen?</h2>
    <p>Dein Konto, dein Profil und alle Spielstände in der Cloud sind dann für immer weg. Die Spielstände auf diesem Gerät bleiben.</p>
    <div class="buttons"><button class="btn danger" onclick="kontoLoeschen()">Endgültig löschen</button><button class="btn" onclick="closeDialog()">Abbrechen</button></div>`);
}

async function kontoLoeschen() {
  closeDialog();
  if (!konto) return;
  try {
    const res = await kontoRest('/rest/v1/rpc/konto_loeschen', { method: 'POST', body: '{}' });
    if (!res.ok) return kontoSagen('Das Löschen hat nicht geklappt. Bitte versuche es später noch einmal.', true);
    konto = null;
    kontoAbgeglichen = {};
    kontoKonflikt = null;
    kontoMerken();
    kontoSagen('Dein Konto ist gelöscht.');
  } catch (e) { kontoSagen(KONTO_OFFLINE, true); }
}

// ---------------------------------------------------------------------
// Zurück aus einer Mail: Die Anmeldung steckt in der Adresse (#access_token=…); danach sofort aus der Adresse entfernen
// ---------------------------------------------------------------------

function kontoAdressePruefen() {
  if (typeof location === 'undefined' || !location.hash || location.hash.length < 2) return;
  const p = new URLSearchParams(location.hash.slice(1));
  const fehler = p.get('error_description') || p.get('error'), access = p.get('access_token'), refresh = p.get('refresh_token');
  if (!fehler && !access) return;
  const art = p.get('type');
  try { history.replaceState(history.state, '', location.pathname + location.search); } catch (e) { /* egal */ }
  if (fehler) { toast('☁️ Der Link aus der Mail ist abgelaufen oder ungültig. Bitte fordere einen neuen an.'); return; }
  if (!refresh) return;
  konto = { access, refresh, expires: Number(p.get('expires_at')) * 1000 || Date.now() + 3000000, id: '', email: '', name: '', nummer: '', basis: {}, zeit: {} };
  kontoFetch('/auth/v1/user', { headers: { Authorization: 'Bearer ' + access } }).then(async res => {
    const j = res.ok ? await kontoJson(res) : null;
    if (!j || !j.id) { konto = null; kontoMerken(); return; }
    konto.id = j.id;
    konto.email = j.email || '';
    kontoMerken();
    await kontoProfilHolen().catch(() => {});
    if (art === 'recovery') kontoPasswortFragen();
    else toast('☁️ Deine E-Mail ist bestätigt – du bist angemeldet');
    if (typeof gameRunning !== 'undefined' && gameRunning) kontoAbgleich(currentSlot).catch(() => {});
  }).catch(() => { konto = null; kontoMerken(); });
}

function kontoPasswortFragen() {
  openDialog(`<h2>Neues Passwort</h2>
    <p>Bitte wähle ein neues Passwort (mindestens 6 Zeichen).</p>
    <input id="konto-neu" class="konto-feld" type="password" autocomplete="new-password">
    <div class="buttons"><button class="btn primary" onclick="kontoPasswortSetzen()">Speichern</button><button class="btn" onclick="closeDialog()">Später</button></div>`);
}

async function kontoPasswortSetzen() {
  const feld = $('konto-neu'), password = feld ? String(feld.value || '') : '';
  closeDialog();
  if (!konto || !password) return;
  try {
    const res = await kontoFetch('/auth/v1/user', { method: 'PUT', headers: { Authorization: 'Bearer ' + await kontoToken() }, body: JSON.stringify({ password }) });
    toast(res.ok ? '☁️ Neues Passwort gespeichert' : '☁️ ' + kontoFehlertext(await kontoJson(res), res.status));
  } catch (e) { toast('☁️ ' + KONTO_OFFLINE); }
}

// ---------------------------------------------------------------------
// Konto-Seite im Menü
// ---------------------------------------------------------------------

function kontoHtml() {
  const meldung = kontoMeldung ? `<p class="konto-meldung${kontoMeldungFehler ? ' fehler' : ''}">${esc(kontoMeldung)}</p>` : '';
  const hinweis = `<p class="hint">Freiwillig: Spielen geht auch ohne Konto und ohne Internet. Gespeichert werden deine E-Mail-Adresse, dein Profilname und deine Spielstände – nur dafür, sie auf deinen Geräten zu sichern.</p>`;
  if (!konto) {
    return `<div class="konto">
      <section class="card">
        <h3>☁️ Spielstand sichern</h3>
        <p>Mit einem Konto ist dein Spielstand in der Cloud sicher und auf Handy und Laptop gleich.</p>
        ${meldung}
        <label>E-Mail<input id="konto-mail" class="konto-feld" type="email" autocomplete="email" value="${esc(kontoEmail)}"></label>
        <label>Passwort<input id="konto-pass" class="konto-feld" type="password" autocomplete="current-password"></label>
        <div class="buttons">
          <button class="btn primary" onclick="kontoAnmelden()">Anmelden</button>
          <button class="btn" onclick="kontoRegistrieren()">Neu registrieren</button>
        </div>
        <button class="btn konto-klein" onclick="kontoPasswortVergessen()">Passwort vergessen?</button>
        ${hinweis}
      </section>
    </div>`;
  }
  const zeit = konto.zeit && konto.zeit[currentSlot];
  const letzte = zeit ? new Date(zeit).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' }) : 'noch nicht auf diesem Gerät';
  return `<div class="konto">
    <section class="card">
      <h3>☁️ Dein Konto</h3>
      ${meldung}
      <div class="info-list">
        <div><span>E-Mail</span><small>${esc(konto.email)}</small></div>
        <div><span>Deine Nummer</span><b>${esc(konto.nummer || '–')}</b></div>
        <div><span>Letzte Sicherung (Platz ${currentSlot})</span><small>${esc(letzte)}</small></div>
      </div>
      <label>Name<input id="konto-name" class="konto-feld" maxlength="24" value="${esc(konto.name)}"></label>
      <div class="buttons">
        <button class="btn" onclick="kontoNameSpeichern()">Name speichern</button>
        <button class="btn primary" onclick="kontoJetztSichern()">☁️ Jetzt sichern</button>
      </div>
      <div class="buttons">
        <button class="btn" onclick="kontoAbmelden()">Abmelden</button>
        <button class="btn danger" onclick="kontoLoeschenFragen()">Konto löschen</button>
      </div>
      ${hinweis}
    </section>
  </div>`;
}

function kontoSeiteNeu() {
  if (pageOpen !== 'konto') return;
  const pass = $('konto-pass'), wert = pass ? pass.value : '';   // eingegebenes Passwort beim Neuzeichnen behalten (steht nirgends sonst)
  $('page-body').innerHTML = kontoHtml();
  const neu = $('konto-pass');
  if (neu && wert) neu.value = wert;
}

function openKonto() {
  kontoMeldung = '';
  openPage('☁️ Konto', kontoHtml(), 'konto');
  if (konto) kontoProfilHolen().then(kontoSeiteNeu).catch(() => {});
}

// Einmal beim Spielstart: Sitzung laden, Rückkehr aus einer Mail erkennen, beim Weggehen und Zurückkommen sichern/prüfen
function kontoStart() {
  kontoLaden();
  kontoAdressePruefen();
  if (typeof document !== 'undefined' && document.addEventListener) {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') kontoBeimVerlassen();
      else kontoPruefen();
    });
  }
  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('pagehide', kontoBeimVerlassen);
    window.addEventListener('online', kontoPruefen);
  }
}
