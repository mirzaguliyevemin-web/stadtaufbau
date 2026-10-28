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
  const names = imageNames().filter(n => n !== 'logo');
  let done = 0;
  await Promise.all(names.map(n => loadImage(n).then(() => setLoading(++done / names.length))));
}

function showStartScreen() {
  gameRunning = false;
  show($('game'), false);
  show($('loading'), false);
  const info = slotInfo(currentSlot);
  $('start-continue').textContent = info && !info.broken ? `▶ Weiterspielen (Platz ${currentSlot})` : '▶ Neues Spiel';
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
  show($('start'), false);
  show($('game'), true);
  resizeCanvas();
  let offline = null;
  if (loadSlot(currentSlot)) {
    offline = applyOfflineProgress(state.savedAt);
  } else {
    startNewGame();
  }
  checkDailyReward();
  saveGame();
  saveSettings();
  ghost = null; pathMode = false; selected = -1;
  centerOnCamp();
  recalcStats();
  lastTopbar = lastBar = lastAction = '';
  renderAll();
  renderTutorial();
  gameRunning = true;
  if (offline) showOfflineSummary(offline);
  else afterWelcome();
}

// Nach „Willkommen zurück“: tägliche Belohnung zeigen (nicht mitten im Einstieg)
function afterWelcome() {
  if (state.daily.pending && (state.tutorial < 0 || state.tutorial > 1)) showDailyReward();
}

function loop(now) {
  requestAnimationFrame(loop);
  const dt = lastFrame ? Math.min(0.25, (now - lastFrame) / 1000) : 0;
  lastFrame = now;
  if (!gameRunning) return;
  update(dt);
  drawScene(dt);
  uiTimer += dt;
  if (uiTimer > 0.25) {
    uiTimer = 0;
    renderTopbar();
    renderBuildBar();
    renderSideButtons();
    if (ghost) renderActionBar();
    if (infoFor) positionInfo();
    if (pageOpen === 'research') $('research-top').innerHTML = researchTopHtml();
  }
  saveTimer += dt;
  if (saveTimer > 10) { saveTimer = 0; saveGame(); }
}

on('finished', b => { if (gameRunning && BUILDINGS[b.type].time > 0) toast(`${BUILDINGS[b.type].icon} ${BUILDINGS[b.type].name} ist fertig!`); });
on('researchDone', id => {
  if (!gameRunning) return;
  toast(`📜 Erforscht: ${TECHS[id].name}`);
  refreshResearchPage();
  if (TECHS[id].effect && TECHS[id].effect.stage) {
    openDialog(`<h2>${TECHS[id].icon} ${esc(STAGES[stageIndex()].name)}!</h2>
      <p>Der Stamm ist in eine neue Zeit aufgebrochen. Im Forschungsbaum gibt es neue Forschungen und bald neue Gebäude.</p>
      <div class="buttons"><button class="btn primary" onclick="closeDialog()">Weiter</button></div>`);
  }
});
on('placed', b => { (state.seen ||= {})[b.type] = true; });

function boot() {
  canvas = $('map');
  ctx = canvas.getContext('2d');
  loadSettings();
  setupInput();
  $('loading-text').textContent = LOADING_SAYINGS[Math.floor(Math.random() * LOADING_SAYINGS.length)];
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', () => { resizeCanvas(); });
    window.addEventListener('popstate', () => { if (pageOpen) closePage(true); });
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && gameRunning) saveGame();
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
}

boot();
