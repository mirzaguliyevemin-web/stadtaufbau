'use strict';
// Epochia – Start: Ladefenster, Startseite, Spiel betreten, Hauptschleife, automatisches Speichern.

let gameRunning = false;
let lastFrame = 0;
let saveTimer = 0;
let uiTimer = 0;

function setLoading(progress) {
  const bar = $('loading-bar');
  if (bar) bar.style.width = Math.round(progress * 100) + '%';
}

// Logo-Bild statt Text-Logo (sobald Emins Schriftzug geladen ist)
function showLogo() {
  if (!images.logo) return;
  for (const id of ['loading-logo', 'start-logo']) $(id).innerHTML = `<img src="${IMAGE_DIR}logo.webp" alt="Epochia">`;
}

async function preloadImages() {
  if (await loadImage('logo')) showLogo();   // Logo zuerst, damit es schon im Ladefenster steht
  // Bilder für andere Jahreszeiten (verschneit, Herbstlaub, Blüten) kommen erst nach dem Start – nicht warten
  const seasonal = n => /-(winter|herbst|fruehling)$/.test(n);
  const names = imageNames().filter(n => n !== 'logo' && !seasonal(n));
  let done = 0;
  await Promise.all(names.map(n => loadImage(n).then(() => setLoading(++done / names.length))));
  setTimeout(() => imageNames().filter(seasonal).forEach(n => loadImage(n)), 1500);
}

function showStartScreen() {
  gameRunning = false;
  updateMusic();
  show($('game'), false);
  show($('loading'), false);
  const info = slotInfo(currentSlot);
  $('start-continue').textContent = info && !info.broken ? "▶ Weiterspielen" : '▶ Neues Spiel';
  if (images.start) $('start').style.backgroundImage = `url(${IMAGE_DIR}start.webp)`;
  show($('start'), true);
}

function centerOnCamp() {
  const fire = state.buildings.find(b => b.type === 'lagerfeuer');
  cam.zoom = defaultZoom();
  if (fire) centerOnTile(fire.x + 1.5, fire.y + 1.5);
  cam.x += viewW * 0.14 / cam.zoom;   // Lager etwas links der Mitte – rechts ist Platz für den Stammesältesten
  clampCamera();
}

// Spiel auf dem aktuellen Platz öffnen (Stand laden oder neu anfangen)
function enterGame() {
  if (typeof kontoVorSpielstart === 'function') kontoVorSpielstart();
  resetLife();
  resetWeather();
  show($('start'), false);
  show($('game'), true);
  resizeCanvas();
  let offline = null;
  if (loadSlot(currentSlot)) {
    offline = applyOfflineProgress(state.savedAt);
  } else {
    // Es lag etwas auf dem Platz, ließ sich aber nicht laden: erst beiseitelegen, nicht einfach überschreiben
    const broken = storageGet(SAVE_PREFIX + currentSlot);
    if (broken) { storageSet(SAVE_PREFIX + currentSlot + '-kaputt', broken); toast('⚠️ Der Spielstand war beschädigt – er wurde aufgehoben, hier beginnt ein neues Spiel'); }
    startNewGame();
  }
  checkDailyReward();
  saveGame();
  saveSettings();
  ghost = null; pathMode = false; selected = -1;
  if (typeof elderHint !== 'undefined') { elderHint = null; lastHintAt = -1e9; }   // Hinweise des alten Spielstands vergessen
  centerOnCamp();
  recalcStats();
  lastTopbar = lastBar = lastAction = '';
  renderAll();
  renderTutorial();
  gameRunning = true;
  if (typeof kontoNachSpielstart === 'function') kontoNachSpielstart();
  if (offline) showOfflineSummary(offline);
  else afterWelcome();
  checkTurnHint();
}

// Hochkant auf dem Handy: einmal je Start darauf hinweisen, dass quer schöner ist (verschwindet beim Drehen)
let turnHintDone = false;
function checkTurnHint() {
  if (typeof window === 'undefined' || !window.innerWidth) return;
  const portrait = window.innerHeight > window.innerWidth && window.innerWidth < 700;
  if (portrait && (state.tutorial >= 0 || dialogOpen)) { show($('turn-hint'), false); return; }   // nicht über dem Ältesten oder einem Fenster
  if (!portrait) turnHintDone = true;   // einmal quer gehalten: nicht mehr erinnern
  show($('turn-hint'), portrait && !turnHintDone);
}
function hideTurnHint() { turnHintDone = true; show($('turn-hint'), false); }

// Nach „Willkommen zurück“: tägliche Belohnung zeigen (nicht mitten im Einstieg)
function afterWelcome() {
  if (state.daily.pending && (state.tutorial < 0 || state.tutorial > 1)) showDailyReward();
}

// Ruckelt es (unter etwa 45 Bildern pro Sekunde), zeichnet das Spiel mit weniger Bildpunkten – auf Handys mit
// sehr feinem Bildschirm (iPhone) ist das kaum zu sehen, macht es aber flüssig. Läuft es lange flüssig, wieder feiner.
let qualityTime = 0, qualityFrames = 0;
// Auflösung nach der Rechenzeit je Bild regeln (nicht nach Bildern pro Sekunde: im Stromsparmodus zeigt das iPhone
// nur 30 Bilder pro Sekunde, das Spiel ist dabei aber gar nicht überlastet)
let qualityBusy = 0;
function adaptQuality(dt, busyMs) {
  if (!(dt > 0)) return;
  qualityTime += dt; qualityFrames++; qualityBusy += busyMs || 0;
  if (qualityTime < 2) return;
  const busy = qualityBusy / qualityFrames;
  qualityTime = 0; qualityFrames = 0; qualityBusy = 0;
  const native = Math.min(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1);
  if (busy > 12 && native * renderScale > 1) renderScale = Math.max(1 / native, renderScale - 0.15);
  else if (busy < 6 && renderScale < 1) renderScale = Math.min(1, renderScale + 0.05);
  else return;
  resizeCanvas();
}

function loop(now) {
  requestAnimationFrame(loop);
  const dt = lastFrame ? Math.min(0.25, (now - lastFrame) / 1000) : 0;
  lastFrame = now;
  if (!gameRunning) return;
  // Größe geändert (Handy gedreht)? iPhones melden die neue Größe oft erst etwas später als „resize“ –
  // darum hier jedes Bild nachsehen, sonst wird das Bild verzerrt gestreckt
  if (canvas && (Math.abs(canvas.clientWidth - viewW) > 0.5 || Math.abs(canvas.clientHeight - viewH) > 0.5 || (window.devicePixelRatio && Math.min(2, window.devicePixelRatio) * renderScale !== dpr))) { resizeCanvas(); renderAll(); }
  const t0 = performance.now();
  update(dt);
  drawScene(dt);
  adaptQuality(dt, performance.now() - t0);
  uiTimer += dt;
  if (uiTimer > 0.25) {
    uiTimer = 0;
    renderTopbar();
    renderBuildBar();
    updateMusic();   // z. B. nach Startseite → Spiel
    renderSideButtons();
    if (ghost) renderActionBar();
    if (infoFor) positionInfo();
    tickResearchPage();
    checkStaffHint();
    checkHerdHint();
  }
  saveTimer += dt;
  if (saveTimer > 10) { saveTimer = 0; saveGame(); }
}

on('finished', b => { if (gameRunning && !offlineRunning && BUILDINGS[b.type].time > 0) toast(`${BUILDINGS[b.type].icon} ${BUILDINGS[b.type].name} ist fertig!`); });
on('evolved', list => {
  if (!gameRunning) return;
  for (const c of list) toast(`✨ ${c.count}× ${BUILDINGS[c.from].name} → ${BUILDINGS[c.to].name}`);
  renderAll();
});
on('researchDone', id => {
  if (!gameRunning || offlineRunning) return;
  toast(`📜 Erforscht: ${TECHS[id].name}`);
  refreshResearchPage();
  if (TECHS[id].effect && TECHS[id].effect.stage) {
    playFestMusic();
    openDialog(`<h2>${TECHS[id].icon} ${esc(STAGES[stageIndex()].name)}!</h2>
      <p>Der Stamm ist in eine neue Zeit aufgebrochen. Im Forschungsbaum gibt es neue Forschungen und bald neue Gebäude.</p>
      <div class="buttons"><button class="btn primary" onclick="closeDialog()">Weiter</button></div>`);
  }
});
on('huntDone', reward => { if (gameRunning) toast(Object.keys(reward).length ? `🦣 Die Jäger sind zurück: +${formatAmounts(reward)}` : '🦣 Die Jäger fanden ihr Lager nicht mehr – die Beute ist verloren'); });
on('placed', b => { (state.seen ||= {})[b.type] = true; });
on('needStarted', id => {
  if (gameRunning && !offlineRunning) toast(`${RESOURCES[id].icon} Deine Leute brauchen jetzt ${RESOURCES[id].name} – ${CONFIG.needGift} gibt es geschenkt, ${Math.round(CONFIG.needGrace / 60)} Minuten Zeit`);
});
on('starved', () => { if (gameRunning && !offlineRunning) toast('🍖 Hunger! Ein Einwohner ist weggezogen – baue mehr Nahrung'); });
on('disaster', id => {
  if (!gameRunning || offlineRunning) return;
  const d = DISASTERS[id];
  openDialog(`<div class="disaster-ic">${d.icon}</div><h2>${esc(d.name)}!</h2><p>${esc(d.text)}</p>
    <p class="hint">Das dauert etwa ${formatTime(d.minutes * 60)}. Oben beim Wetter siehst du, wie lange noch.</p>
    <div class="buttons"><button class="btn primary" onclick="closeDialog()">Wir halten durch!</button></div>`);
  if (typeof playSound === 'function') playSound('katastrophe');
});
on('disasterEnded', id => { if (gameRunning) toast(`${DISASTERS[id].icon} ${DISASTERS[id].name} ist vorbei – aufatmen!`); });

// ---------------------------------------------------------------------
// Neue Version online? Dann oben einen Knopf zum Aktualisieren zeigen
// ---------------------------------------------------------------------

let updateCheckAt = 0;
async function checkForUpdate(force = false) {
  if (typeof fetch === 'undefined' || typeof location === 'undefined' || !/^https?:/.test(location.protocol)) return;
  const now = Date.now();
  if (!force && now - updateCheckAt < 60000) return;   // höchstens einmal pro Minute
  updateCheckAt = now;
  try {
    const res = await fetch('index.html?pruefen=' + now, { cache: 'no-store' });
    const m = (await res.text()).match(/name="app-version" content="(\d+)"/);
    const online = m ? Number(m[1]) : 0;
    if (online > APP_VERSION) showUpdateBanner(online);
    else if (force) toast('✔ Du hast schon die neueste Version (' + APP_VERSION + ')');
  } catch (e) {
    if (force) toast('Keine Verbindung – später noch einmal versuchen');
  }
}

function showUpdateBanner(version) {
  const el = $('update-banner');
  el.innerHTML = `<span>✨ Neue Version ${version} ist da!</span>
    <button class="btn primary" onclick="applyUpdate()">🔄 Jetzt aktualisieren</button>
    <button class="btn" onclick="show($('update-banner'), false)">Später</button>`;
  show(el, true);
}

function applyUpdate() {
  if (gameRunning) saveGame();
  location.reload();
}

function boot() {
  canvas = $('map');
  ctx = canvas.getContext('2d');
  loadSettings();
  if (typeof kontoStart === 'function') kontoStart();
  setupInput();
  $('loading-text').textContent = LOADING_SAYINGS[Math.floor(Math.random() * LOADING_SAYINGS.length)];
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', () => { resizeCanvas(); if (gameRunning) checkTurnHint(); });
    window.addEventListener('orientationchange', () => { for (const ms of [50, 300, 800]) setTimeout(resizeCanvas, ms); });
    window.addEventListener('popstate', onHistoryBack);
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && gameRunning) saveGame();
    updateMusic();
    if (document.visibilityState === 'visible') checkForUpdate();
    if (document.visibilityState === 'visible' && gameRunning) {
      // Zeit im Hintergrund nachholen
      const r = applyOfflineProgress(state.savedAt);
      if (r && r.seconds > 120) showOfflineSummary(r);
      checkDailyReward();
      lastFrame = 0;
    }
  });
  const minWait = new Promise(r => setTimeout(r, 900));
  Promise.all([preloadImages(), minWait]).then(() => {
    if (images.ladebild) $('loading').style.backgroundImage = `url(${IMAGE_DIR}ladebild.webp)`;
    showStartScreen();
    // ?direkt überspringt die Startseite (zum Ausprobieren und für Bildschirmfotos)
    if (typeof location !== 'undefined' && /direkt/.test(location.search || '')) enterGame();
  });
  if (typeof navigator !== 'undefined' && navigator.serviceWorker) {
    navigator.serviceWorker.register('service-worker.js').catch(err => console.warn('Service Worker', err));
  }
  requestAnimationFrame(loop);
  setTimeout(() => checkForUpdate(), 4000);
  setInterval(() => checkForUpdate(), 5 * 60 * 1000);
}

boot();
