'use strict';
// Epochia – Einstieg: Der Stammesälteste steht auf der Karte neben dem Ort, um den es gerade geht, sagt kurz, was zu tun ist,
// und läuft mit Fußspuren zum nächsten Ort. Der gezeigte Bauplatz ist nur ein Vorschlag.
// Auf der Karte (Canvas) gezeichnet, darum fängt nichts davon Eingaben ab; die Blase liegt mit pointer-events: none darüber.

const GUIDE_FACE = 'aeltester-1';
const GUIDE_DOTS = ['sammlerin', 'pfad', 'antippen', 'holzsammler', 'hochheben', 'wohnhoehle', 'forschung'];   // sieben Handlungen; Aufträge sind das „Noch was“
const GUIDE_AUTO_SECONDS = 3, GUIDE_HELP_SECONDS = 20, GUIDE_FLASH_SECONDS = 1.7;
const GUIDE_WALK_SPEED = 5;   // Felder je Sekunde

const guide = {
  owner: null,            // zu welchem Spielstand das hier gehört
  plan: null, flash: null, side: null, pos: null, walking: false, flip: false,
  steps: [], stepAge: 0,  // Fußspuren: { x, y, foot, age }
  keyTime: 0, autoTime: 0, checkTimer: 0, planTimer: 0, sideTimer: 0, measureTimer: 1,
  time: 0, exitPath: false, glide: null, site: null, routeMemo: null,
  obstacles: [], bounds: null, freeBox: null, sideRect: null, skipRect: null, bubbleSize: null, offsetL: 0, barRect: null, uiRect: null, lastBubble: '', lastBubbleClass: '', lastPos: '', frozen: null, offscreen: false,
};

function tutorialStep() {
  return state && state.tutorial >= 0 ? TUTORIAL[state.tutorial] || null : null;
}

function tutorialType(step) {
  if (step.id === 'pfad' || step.id === 'antippen') return 'sammlerin';
  return step.target && step.target.startsWith('bar:') ? step.target.slice(4) : null;
}

// Das zum Schritt gehörende Gebäude (das neueste; die beiden Wohnhöhlen vom Spielstart zählen nicht)
function tutorialBuildingIndex(type) {
  const list = [];
  state.buildings.forEach((b, i) => { if (b.type === type) list.push(i); });
  if (type === 'wohnhoehle' && list.length <= 2) return -1;
  return list.length ? list[list.length - 1] : -1;
}

function memoRoute(i) {
  const key = i + ':' + state.buildings.length + ':' + (typeof terrainVersion === 'undefined' ? 0 : terrainVersion);
  if (!guide.routeMemo || guide.routeMemo.key !== key) guide.routeMemo = { key, route: pathRoute(i) };
  return guide.routeMemo.route;
}

// Verbunden – oder gar kein Weg möglich (dann darf der Einstieg nicht daran hängen bleiben)
function tutorialConnected(i) {
  return isConnected(i) || memoRoute(i) === null;
}

// Ist ein Schritt schon erledigt (z. B. weil man vorgegriffen hat)?
function tutorialAlreadyDone(step) {
  const built = type => { const i = tutorialBuildingIndex(type); return i >= 0 && tutorialConnected(i); };
  switch (step.id) {
    case 'sammlerin': return tutorialBuildingIndex('sammlerin') >= 0;
    case 'pfad': return built('sammlerin');
    case 'holzsammler': return built('holzsammler');
    case 'wohnhoehle': return built('wohnhoehle');
    case 'forschung': return !!state.research || Object.keys(state.techs).length > 0;
    default: return false;
  }
}

function sammlerinConnected() {
  return state.buildings.some((b, i) => b.type === 'sammlerin' && isConnected(i));
}

// ---------------------------------------------------------------------
// Belohnungen: je Spielstand einmal (state.tutorialRewards), auch nach Neuladen und erneutem Einstieg
// ---------------------------------------------------------------------

function grantTutorialReward(key, amounts) {
  if (!amounts) return null;
  const got = state.tutorialRewards || (state.tutorialRewards = {});
  if (got[key]) return null;
  got[key] = true;
  addResources(amounts);
  if (typeof renderTopbar === 'function') renderTopbar();
  flyReward(amounts);
  return amounts;
}

function rewardText(amounts) {
  return Object.entries(amounts || {}).map(([id, n]) => `+${n} ${iconHtml(RESOURCES[id].bild, RESOURCES[id].icon)} ${esc(RESOURCES[id].name)}`).join(' ');
}

// Kleines „+5 Nahrung“ fliegt vom Ältesten zum Vorrat oben
function flyReward(amounts) {
  if (typeof document === 'undefined' || !$('game')) return;
  const from = guideScreenFeet();
  Object.entries(amounts).forEach(([id, n], k) => {
    const el = document.createElement('div');
    el.className = 'guide-fly';
    el.innerHTML = `${iconHtml(RESOURCES[id].bild, RESOURCES[id].icon)}+${n}`;
    $('game').appendChild(el);
    if (!el.animate) { if (el.remove) el.remove(); return; }
    const chip = document.querySelector(`#topbar .chip[onclick*="'${id}'"]`);
    const target = chip || document.getElementById('btn-lager');   // steht die Ware nicht oben, fliegt sie ins Lager
    const r = target ? target.getBoundingClientRect() : { left: from.x, top: 8, width: 0, height: 0 };
    const a = el.animate([
      { transform: `translate(${from.x - 20}px,${from.y - 60}px) scale(.7)`, opacity: 0 },
      { transform: `translate(${from.x - 20}px,${from.y - 86}px) scale(1.1)`, opacity: 1, offset: 0.28 },
      { transform: `translate(${r.left + r.width / 2 - 20}px,${r.top + r.height / 2 - 12}px) scale(.8)`, opacity: 0.9 },
    ], { duration: 1050, delay: k * 120, easing: 'ease-in-out', fill: 'both' });
    a.onfinish = () => {
      el.remove();
      if (chip && chip.animate) chip.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.18)' }, { transform: 'scale(1)' }], { duration: 260 });
    };
  });
}

function guideFlash(text, amounts) {
  if (!text && !amounts) return;
  guide.flash = { t: GUIDE_FLASH_SECONDS, html: `<em class="ok">✔ ${esc(text || 'Gut!')}</em>${amounts ? rewardText(amounts) : ''}` };
  if (typeof playSound === 'function') playSound(amounts ? 'muenze' : 'fertig');
}

// ---------------------------------------------------------------------
// Ablauf
// ---------------------------------------------------------------------

function leaveTutorialStep(step) {
  guideFlash(step.ok, grantTutorialReward(step.id, step.belohnung));
  if (step.id === 'fertig') guide.flash = null;
  guide.exitPath = pathMode;
}

function advanceTutorial() {
  if (!state || state.tutorial < 0) return;
  const step = tutorialStep();
  if (step) leaveTutorialStep(step);
  state.tutorial++;
  while (state.tutorial < TUTORIAL.length && tutorialAlreadyDone(TUTORIAL[state.tutorial])) {
    grantTutorialReward(TUTORIAL[state.tutorial].id, TUTORIAL[state.tutorial].belohnung);
    state.tutorial++;
  }
  if (state.tutorial >= TUTORIAL.length) state.tutorial = -1;
  guide.autoTime = 0;
  renderTutorial();
}

function skipTutorial() {
  state.tutorial = -1;
  guide.flash = null;
  renderTutorial();
}

function restartTutorial() {
  state.tutorial = 0;
  elderHint = null;
  guide.autoTime = 0;
  guide.flash = null;
  guide.pos = null;
  renderTutorial();
}

// Alles prüfen, was sich am Spielstand ablesen lässt. Fehlt ein Gebäude wieder (abgerissen, alter Stand), geht es einen Schritt zurück.
function checkTutorial() {
  const step = tutorialStep();
  if (!step) return;
  const here = id => TUTORIAL.findIndex(s => s.id === id);
  if (step.id === 'pfad' || step.id === 'antippen') {
    const i = tutorialBuildingIndex('sammlerin');
    if (i < 0) { state.tutorial = here('sammlerin'); renderTutorial(); return; }
    if (step.id === 'antippen' && !tutorialConnected(i)) { state.tutorial = here('pfad'); renderTutorial(); return; }
  }
  if (step.id === 'forschung' && !guide.flash && tutorialResearchPart() === 2 && !(state.tutorialRewards || {}).forschung_bau) {
    guideFlash(step.bauOk, grantTutorialReward('forschung_bau', step.bauBelohnung));
    guide.exitPath = pathMode;
    tryExitPath();
  }
  if (tutorialAlreadyDone(step)) advanceTutorial();
  else refreshGuidePlan();
}

function tutorialResearchPart() {
  const i = tutorialBuildingIndex('hoehlenmaler');
  return i >= 0 && tutorialConnected(i) ? 2 : 1;
}

function onTutorialEvent(name, data) {
  const step = tutorialStep();
  if (!step) return;
  guide.routeMemo = null;
  const type = data && data.type;
  const done =
    (step.id === 'antippen' && name === 'tapped' && !data.build && type !== 'lagerfeuer' && type !== 'wohnhoehle') ||
    (step.id === 'hochheben' && name === 'lifted') ||
    (step.id === 'forschung' && name === 'researchStarted') ||
    (step.id === 'auftraege' && name === 'questsOpened');
  if (done) advanceTutorial();
  else checkTutorial();
}

for (const name of ['placed', 'moved', 'demolished', 'finished', 'tapped', 'lifted', 'researchStarted', 'questsOpened']) on(name, data => onTutorialEvent(name, data));

// Im Forschungsfenster die gesuchte Forschung leuchten lassen
on('researchOpened', () => {
  const step = tutorialStep();
  if (!step || step.id !== 'forschung' || typeof document === 'undefined') return;
  const el = document.querySelector('.rs-item[onclick*="feuer_hueten"]');
  if (el) el.classList.add('glow');
});

function tryExitPath() {
  if (!guide.exitPath || (typeof pointers !== 'undefined' && pointers.size)) return;
  guide.exitPath = false;
  if (pathMode) cancelGhost();   // sonst täte das nächste Antippen nichts
}

// Der erste Finger beendet Begrüßung und Abschluss und hält einen Kameraflug an – die Eingabe selbst läuft normal weiter
function onGuidePointerDown() {
  guide.glide = null;
  const step = tutorialStep();
  if (step && step.auto && !dialogOpen && !pageOpen && guide.autoTime > 0.4) advanceTutorial();
}
if (typeof document !== 'undefined' && document.addEventListener) document.addEventListener('pointerdown', onGuidePointerDown, { passive: true });

// ---------------------------------------------------------------------
// Bauplatz vorschlagen: wirklich frei, gut gelegen, mit möglichem Weg
// ---------------------------------------------------------------------

// Wie viele neue Wegfelder bräuchte ein Gebäude hier? 0 = liegt schon am Netz, null = kein Weg in der Nähe (nur über Land)
function spotRouteLength(x, y, s, limit = 8) {
  updateNetwork();
  if (touchesNetworkRaw(x, y, s)) return 0;
  const seen = new Set(), inside = (tx, ty) => tx >= x && tx < x + s && ty >= y && ty < y + s;
  let front = [];
  const free = (tx, ty) => !inside(tx, ty) && inMap(tx, ty) && (isPathAt(tx, ty) || (wayTypeAt(tx, ty) === 'pfad' && !placeProblem('pfad', tx, ty)));
  for (const [tx, ty] of perimeter(x, y, s)) if (free(tx, ty)) { seen.add(ty * N + tx); front.push([tx, ty]); }
  for (let depth = 1; depth <= limit && front.length; depth++) {
    const next = [];
    for (const [tx, ty] of front) {
      if (touchesNetworkRaw(tx, ty, 1)) return depth;
      for (const [nx, ny] of [[tx + 1, ty], [tx - 1, ty], [tx, ty + 1], [tx, ty - 1]]) {
        const k = ny * N + nx;
        if (!seen.has(k) && free(nx, ny)) { seen.add(k); next.push([nx, ny]); }
      }
    }
    front = next;
  }
  return null;
}

function suggestSite(type) {
  const def = BUILDINGS[type], s = def.size;
  const fire = state.buildings.find(b => b.type === 'lagerfeuer');
  if (!fire) return null;
  const cx = fire.x + 1.5, cy = fire.y + 1.5;
  const close = type === 'wohnhoehle' ? 1.2 : 0.5, minRoute = type === 'sammlerin' ? 2 : 1;   // Die erste Sammlerin soll den Weg zeigen
  const list = [];
  for (let y = Math.round(cy) - 12; y <= cy + 12; y++)
    for (let x = Math.round(cx) - 12; x <= cx + 12; x++) {
      if (placeProblem(type, x, y)) continue;
      const d = Math.hypot(x + s / 2 - cx, y + s / 2 - cy);
      let score = -d * close;
      if (def.bonus) {
        const near = [].concat(def.bonus.terrain).reduce((a, t) => a + countTerrainNear(x, y, s, TERRAIN[t].id, CONFIG.bonusRadius), 0);
        score += Math.min(def.bonus.max, near * def.bonus.perTile) / def.bonus.max * 6;
      }
      const c = tileToScreen(x + s / 2, y + s / 2);
      if (!guidePointFree(c.x, c.y, 70) || !guidePointFree(c.x, c.y + 50 * guideScale(), 0)) score -= 30;   // lieber gut im Bild, nicht unter einem Knopf und nicht dicht an der Leiste
      list.push({ x, y, score });
    }
  list.sort((a, b) => b.score - a.score);
  let fallback = null;
  for (const spot of list.slice(0, 80)) {
    const len = spotRouteLength(spot.x, spot.y, s);
    if (len === null) continue;
    if (!fallback) fallback = spot;
    if (len >= minRoute && len <= 6) return spot;
  }
  return fallback;
}

function tutorialSite(type) {
  const old = guide.site;
  if (old && old.type === type && !placeProblem(type, old.x, old.y)) return old;
  const spot = suggestSite(type);
  guide.site = spot ? { type, x: spot.x, y: spot.y } : null;
  return guide.site;
}

// ---------------------------------------------------------------------
// Was gerade dran ist: Ziel auf der Karte oder Knopf, dazu der Spruch – er richtet sich nach der Lage
// ---------------------------------------------------------------------

function buildSayFor(type, step) {
  const cost = BUILDINGS[type].cost;
  if (!canAfford(cost)) {
    const missing = Object.keys(cost).find(id => (state.res[id] || 0) < cost[id]);
    if (missing === 'stein') return { ruf: 'Uns fehlt Stein.', text: 'Tipp einen Felsen an und trag ihn ab.' };
    if (missing === 'holz') return { ruf: 'Uns fehlt Holz.', text: 'Tipp einen Baum an und fäll ihn.' };
    return { ruf: 'Uns fehlt noch etwas.', text: 'Warte kurz, bis es reicht.' };
  }
  if (constructionCount() >= constructionLimit()) return { ruf: 'Erst mal fertig bauen.', text: `Höchstens ${CONFIG.maxConstructions} Baustellen gleichzeitig.` };
  return null;
}

function roadPlan(i, step) {
  const b = state.buildings[i], route = memoRoute(i) || [];
  const say = pathMode
    ? { ruf: 'Oje, kein Weg!', text: 'Zieh den *Pfad* vom Feuer zur Baustelle.' }
    : { ruf: 'Oje, kein Weg!', text: 'Wähl unten den *Trampelpfad*.' };
  return { kind: 'road', key: `${step.id}:road:${i}`, i, x: b.x, y: b.y, s: BUILDINGS[b.type].size, route, bar: 'pfad', say,
    hilfe: 'Oder tipp die Baustelle an, dann „Mehr“ und „Weg bauen“.' };
}

function sitePlan(type, step, say) {
  const site = tutorialSite(type);
  const lack = buildSayFor(type, step);
  if (!site) return { kind: 'center', key: `${step.id}:center`, bar: type, say: lack || say };
  return { kind: 'site', key: `${step.id}:site:${site.x},${site.y}`, type, x: site.x, y: site.y, s: BUILDINGS[type].size, bar: type, say: lack || say, hilfe: step.hilfe };
}

function computeGuidePlan() {
  const step = tutorialStep();
  if (!step) return null;
  const base = { ruf: step.ruf, text: step.text };
  if (ghost && ghost.from >= 0) {   // hochgehoben: erst abstellen
    const s = BUILDINGS[ghost.type].size;
    return { kind: 'ghost', key: `${step.id}:lift`, x: ghost.x, y: ghost.y, s, say: { ruf: 'Verschieben und drehen geht jetzt.', text: 'Mit ✔ abstellen oder mit ✖ lassen.' } };
  }
  if (ghost) {
    const s = BUILDINGS[ghost.type].size, problem = ghostProblem();
    return { kind: 'ghost', key: `${step.id}:ghost`, x: ghost.x, y: ghost.y, s,
      say: problem ? { ruf: 'Da geht es nicht.', text: problem } : { ruf: 'Passt!', text: 'Tipp auf ✔.' } };
  }
  switch (step.id) {
    case 'sammlerin': case 'holzsammler': case 'wohnhoehle': {
      const type = tutorialType(step), i = tutorialBuildingIndex(type);
      return i >= 0 ? roadPlan(i, step) : sitePlan(type, step, base);
    }
    case 'pfad': {
      const i = tutorialBuildingIndex('sammlerin');
      if (i >= 0) return roadPlan(i, step);
      return { kind: 'center', key: 'pfad:center', say: base };
    }
    case 'antippen': {
      const i = tutorialBuildingIndex('sammlerin');
      if (i < 0) return { kind: 'center', key: 'antippen:center', say: base };
      const b = state.buildings[i], s = BUILDINGS[b.type].size;
      if (b.build > 0) return { kind: 'building', key: `antippen:wait:${i}`, i, x: b.x, y: b.y, s, wait: true, say: { ruf: 'Jetzt wird gebaut.', text: `Noch ${Math.ceil(b.build)} Sekunden.` }, hilfe: step.hilfe };
      return { kind: 'building', key: `antippen:tap:${i}`, i, x: b.x, y: b.y, s, tap: true, say: base };
    }
    case 'hochheben': {
      let i = tutorialBuildingIndex('holzsammler');
      if (i < 0 || state.buildings[i].build) i = tutorialBuildingIndex('sammlerin');
      if (i < 0 || state.buildings[i].build) i = state.buildings.findIndex(b => !b.build && !BUILDINGS[b.type].isPath);
      if (i < 0) return { kind: 'center', key: 'hochheben:center', say: base };
      const b = state.buildings[i];
      return { kind: 'building', key: `hochheben:${i}`, i, x: b.x, y: b.y, s: BUILDINGS[b.type].size, hold: true, say: base };
    }
    case 'forschung': {
      if (tutorialResearchPart() === 1) {
        const i = tutorialBuildingIndex('hoehlenmaler');
        return i >= 0 ? roadPlan(i, step) : sitePlan('hoehlenmaler', step, base);
      }
      const say = canAfford(TECHS.feuer_hueten.cost) ? { ruf: step.ruf2, text: step.text2 } : { ruf: 'Noch zu wenig Wissen.', text: 'Der Höhlenmaler braucht etwas Zeit.' };
      return { kind: 'ui', key: 'forschung:ui', ui: step.target2, say };
    }
    case 'auftraege': return { kind: 'ui', key: 'auftraege:ui', ui: step.target, say: base };
    case 'willkommen': { const b = state.buildings[0]; return { kind: 'building', key: 'willkommen', x: b.x, y: b.y, s: BUILDINGS[b.type].size, swipe: true, say: base }; }
    default: return { kind: 'center', key: step.id, say: base };
  }
}

function refreshGuidePlan() {
  if (guide.flash && guide.plan) return;   // Erfolg zeigen, dann erst weiter
  const plan = computeGuidePlan();
  const old = guide.plan;
  guide.plan = plan;
  if (!plan) return;
  if (!old || old.key !== plan.key) {
    guide.keyTime = 0;
    guide.walking = true;
    guide.side = null;
    guide.measureTimer = 1;
    if (typeof researchSelected !== 'undefined' && plan.key === 'forschung:ui' && techStatus('feuer_hueten') !== 'done') researchSelected = 'feuer_hueten';
    if (plan.bar && settings.barHidden && typeof toggleBuildBar === 'function') toggleBuildBar(false);   // die Leiste wird gebraucht
    if (plan.key === 'willkommen' && !guide.glide) {   // Die Karte fährt zum Feuer
      guide.glide = { x: cam.x, y: cam.y };
      cam.x += viewW * 0.22 / cam.zoom;
      cam.y += viewH * 0.18 / cam.zoom;
      clampCamera();
    }
    highlightTutorialTarget();
    if (typeof renderBuildBar === 'function') renderBuildBar();
  }
}

// Welches Gebäude die Bauleiste gerade zeigen soll
function tutorialBarType() {
  const plan = tutorialStep() && (guide.plan || computeGuidePlan());
  return plan ? plan.bar || null : null;
}

function tutorialPlan() { return guide.plan || computeGuidePlan(); }

function highlightTutorialTarget() {
  if (typeof document === 'undefined') return;
  for (const el of document.querySelectorAll('.glow')) el.classList.remove('glow');
  const plan = tutorialStep() ? guide.plan : null;
  if (!plan) return;
  const el = plan.bar ? document.querySelector(`.bar-item[data-type="${plan.bar}"]`) : plan.ui ? $(plan.ui) : null;
  if (el) el.classList.add('glow');
}

function renderTutorial() {
  const step = tutorialStep();
  if (guide.owner !== state) { guide.owner = state; guide.pos = null; guide.plan = null; guide.site = null; guide.steps = []; guide.flash = null; guide.autoTime = 0; }
  const box = $('tutorial');
  show(box, !step && !!elderHint);
  show($('guide'), !!step);
  if (!step) {
    guide.plan = null;
    highlightTutorialTarget();
    if (elderHint) renderElderHint();
    return;
  }
  show($('guide-skip'), step.id !== 'fertig');
  refreshGuidePlan();
  tryExitPath();
  highlightTutorialTarget();
}

// ---------------------------------------------------------------------
// Takt: läuft mit dem Zeichnen, nur solange der Einstieg läuft
// ---------------------------------------------------------------------

function tutorialTick(dt) {
  const step = tutorialStep();
  if (!step) return;
  guide.time += dt;
  guide.keyTime += dt;
  if (guide.flash) { guide.flash.t -= dt; if (guide.flash.t <= 0) { guide.flash = null; refreshGuidePlan(); highlightTutorialTarget(); } }
  tryExitPath();
  if (step.id === 'fertig' && !dialogOpen && !pageOpen) {
    const given = grantTutorialReward(step.id, step.belohnung);
    if (given) { guide.flash = { t: GUIDE_AUTO_SECONDS, html: `<em class="ok">🎁 ${esc(step.ruf)}</em>${esc(step.text)}<br>${rewardText(given)}` }; if (typeof playSound === 'function') playSound('muenze'); }
  }
  if (step.auto && !dialogOpen && !pageOpen) {
    guide.autoTime += dt;
    if (guide.autoTime >= GUIDE_AUTO_SECONDS + (step.id === 'fertig' ? 0.6 : 0)) { advanceTutorial(); return; }
  }
  if ((guide.checkTimer += dt) >= 0.5) { guide.checkTimer = 0; checkTutorial(); }
  else if ((guide.planTimer += dt) >= 0.25) { guide.planTimer = 0; refreshGuidePlan(); }
  if (guide.glide) {
    const k = 1 - Math.exp(-dt * 5);
    cam.x += (guide.glide.x - cam.x) * k;
    cam.y += (guide.glide.y - cam.y) * k;
    clampCamera();
    if (Math.hypot(guide.glide.x - cam.x, guide.glide.y - cam.y) < 2) guide.glide = null;
  }
}

// Hinweis am Bildrand antippen: Die Karte fährt zum Ort
function tutorialGoToTarget() {
  const plan = guide.plan;
  if (!plan || plan.x === undefined) return;
  const w = tileToWorld(plan.x + plan.s / 2, plan.y + plan.s / 2);
  const b = guideFreeBox();
  guide.glide = { x: w.x - ((b.l + b.r) / 2 - viewW / 2) / cam.zoom, y: w.y - ((b.t + b.b) / 2 - viewH / 2) / cam.zoom };
}

// ---------------------------------------------------------------------
// Platz auf dem Bildschirm: Was ist frei, wo steht er, wohin kommt die Blase
// ---------------------------------------------------------------------

function guideRect(id) {
  const el = $(id);
  if (!el || !el.getBoundingClientRect || (el.classList && el.classList.contains('hidden'))) return null;
  const r = el.getBoundingClientRect();
  if (!r.width || !r.height || r.top >= viewH) return null;
  return { l: r.left, t: r.top, r: r.left + r.width, b: r.top + r.height };
}

function guideMeasure() {
  const area = guideRect('guide');
  guide.bounds = area ? { l: area.l + 2, r: area.r - 2, t: 0, b: viewH } : { l: 0, r: viewW, t: 0, b: viewH };
  const top = guideRect('topbar');
  const skip = $('guide-skip');
  if (skip && top) skip.style.top = Math.round(top.b + 4) + 'px';
  guide.obstacles = ['topbar', 'side', 'bar-tabs', 'buildbar', 'action-bar', 'bar-toggle', 'guide-skip', 'research-pill', 'info-pop'].map(guideRect).filter(Boolean);
  const plan = guide.plan;
  guide.barRect = null; guide.uiRect = null;
  if (plan && plan.bar && typeof document !== 'undefined') {
    const el = document.querySelector(`.bar-item[data-type="${plan.bar}"]`);
    if (el && el.getBoundingClientRect) { const r = el.getBoundingClientRect(); if (r.width) guide.barRect = { l: r.left, t: r.top, r: r.left + r.width, b: r.top + r.height }; }
  }
  if (plan && plan.ui) guide.uiRect = guideRect(plan.ui);
  const g = $('guide');
  if (g && g.classList) g.classList.toggle('gross', guideScale() > 1.1);
  guide.freeBox = measureFreeBox();
  guide.offsetL = area ? area.l : 0;
  guide.sideRect = guideRect('side');
  guide.skipRect = guideRect('guide-skip');
  guide.bubbleSize = null;
}

function guideScale() { return Math.min(viewW, viewH) >= 700 ? 1.3 : 1; }

// Die freie Fläche für den Hinweis am Bildrand
function guideFreeBox() {
  return guide.freeBox || measureFreeBox();
}

function measureFreeBox() {
  const b = guide.bounds || { l: 0, r: viewW, t: 0, b: viewH };
  const box = { l: b.l, r: b.r, t: b.t, b: b.b };
  for (const id of ['topbar']) { const r = guideRect(id); if (r) box.t = Math.max(box.t, r.b); }
  for (const id of ['buildbar', 'bar-tabs', 'action-bar']) { const r = guideRect(id); if (r) box.b = Math.min(box.b, r.t); }
  const side = guideRect('side');
  if (side && viewW > viewH) box.l = Math.max(box.l, side.r);
  return box;
}

function guidePointFree(x, y, margin = 0) {
  const box = guideFreeBox();
  return x >= box.l + margin && x <= box.r - margin && y >= box.t + margin && y <= box.b - margin / 2;
}

function overlapArea(a, b) {
  const w = Math.min(a.r, b.r) - Math.max(a.l, b.l), h = Math.min(a.b, b.b) - Math.max(a.t, b.t);
  return w > 0 && h > 0 ? w * h : 0;
}

function guideTargetRect(plan) {
  if (plan.kind === 'ui') {   // neben den Knöpfen links stehen, nicht über einer zweiten Spalte
    const u = guide.uiRect || { l: 0, r: 60, t: 80, b: 140 }, side = guide.sideRect;
    return side ? { l: u.l, t: u.t, b: u.b, r: Math.max(u.r, side.r) } : u;
  }
  if (plan.x === undefined) { const c = { x: viewW / 2, y: viewH / 2 }; return { l: c.x - 20, r: c.x + 20, t: c.y - 20, b: c.y + 20 }; }
  const corner = (x, y, s) => ({ l: tileToScreen(x, y + s).x, r: tileToScreen(x + s, y).x, t: tileToScreen(x, y).y, b: tileToScreen(x + s, y + s).y });
  const rise = plan.s * TW * cam.zoom * 0.42;
  const r = corner(plan.x, plan.y, plan.s);
  r.t -= rise;
  if (plan.kind === 'road') for (const [x, y] of plan.route) {
    const c = corner(x, y, 1);
    r.l = Math.min(r.l, c.l); r.r = Math.max(r.r, c.r); r.t = Math.min(r.t, c.t); r.b = Math.max(r.b, c.b);
  }
  return r;
}

function guideFigureSize() {
  const rel = Math.max(0.85, Math.min(1.25, cam.zoom / (defaultZoom() || 1)));
  return 46 * guideScale() * rel;   // klein halten: Emin störte, dass der Älteste viel Platz wegnimmt
}

function guideBubbleSize() {
  if (guide.bubbleSize) return guide.bubbleSize;
  const el = $('guide-bubble');
  return guide.bubbleSize = { w: (el && el.offsetWidth) || 190, h: (el && el.offsetHeight) || 56 };
}

// Elder-Rechteck und Blase für eine Seite. Erster Buchstabe: wo er zum Ziel steht, zweiter: wo die Blase zu ihm steht
function guideLayout(mode, t, g, bub) {
  const gap = 4 * guideScale();
  let ex, ey;
  const midY = (t.t + t.b) / 2 - g * 0.55, midX = (t.l + t.r) / 2 - g / 2;
  if (mode[0] === 'r') { ex = t.r + gap; ey = midY; }
  else if (mode[0] === 'l') { ex = t.l - g - gap; ey = midY; }
  else if (mode[0] === 't') { ex = midX; ey = t.t - g - gap; }
  else { ex = midX; ey = t.b + gap; }
  const box = guideFreeBox();   // nie unter die Leisten: lieber etwas näher ans Ziel rücken
  ey = Math.max(box.t + 2, Math.min(box.b - g - 2, ey));
  return { e: { l: ex, r: ex + g, t: ey, b: ey + g }, b: guideBubbleRect(mode[1], { l: ex, r: ex + g, t: ey, b: ey + g }, bub, gap) };
}

function guideBubbleRect(where, e, bub, gap) {
  if (where === 'r') return { l: e.r + gap + 4, r: e.r + gap + 4 + bub.w, t: e.t + (e.b - e.t - bub.h) / 2, b: e.t + (e.b - e.t + bub.h) / 2 };
  if (where === 'l') return { l: e.l - gap - 4 - bub.w, r: e.l - gap - 4, t: e.t + (e.b - e.t - bub.h) / 2, b: e.t + (e.b - e.t + bub.h) / 2 };
  const cx = (e.l + e.r) / 2;
  return { l: cx - bub.w / 2, r: cx + bub.w / 2, t: e.t - gap - 6 - bub.h, b: e.t - gap - 6 };
}

const GUIDE_MODES_WIDE = ['rr', 'll', 'tr', 'tl', 'rt', 'lt', 'tt', 'br', 'bl'];
const GUIDE_MODES_TALL = ['tt', 'rt', 'lt', 'bt', 'tr', 'tl', 'br', 'bl', 'rr', 'll'];

function guideScore(mode, plan, t, g, bub, order) {
  const lay = guideLayout(mode, t, g, bub);
  let score = order;
  const b = guide.bounds || { l: 0, r: viewW, t: 0, b: viewH };
  for (const r of [lay.e, lay.b]) {
    score += overlapArea(r, t) * 3;
    for (const o of guide.obstacles) score += overlapArea(r, o) * 3;
    const whole = (r.r - r.l) * (r.b - r.t);
    score += (whole - overlapArea(r, b)) * 4;
  }
  return { score, lay };
}

// Zur freien Seite ausweichen: nur wechseln, wenn die neue Seite deutlich besser ist (sonst zappelt er)
function guideChooseSide(plan, t, g) {
  const bub = guideBubbleSize();
  const modes = viewH > viewW ? GUIDE_MODES_TALL : GUIDE_MODES_WIDE;
  let best = null, bestScore = Infinity;
  modes.forEach((m, k) => { const { score } = guideScore(m, plan, t, g, bub, k); if (score < bestScore) { bestScore = score; best = m; } });
  if (guide.side) {
    const now = guideScore(guide.side, plan, t, g, bub, modes.indexOf(guide.side)).score;
    if (now <= bestScore + 300) return;
  }
  if (guide.side !== best) { guide.side = best; guide.walking = true; }
}

function guideScreenFeet() {
  if (!guide.pos) return { x: viewW / 2, y: viewH / 2 };
  return tileToScreen(guide.pos.x, guide.pos.y);
}

function guideMove(dt, plan, t, g) {
  const lay = guideLayout(guide.side, t, g, guideBubbleSize());
  const feet = screenToTileF((lay.e.l + lay.e.r) / 2, lay.e.b - g * 0.06);
  const fixedOnScreen = plan.kind === 'ui' || plan.kind === 'center';
  if (!guide.pos) { guide.pos = { x: feet.x, y: feet.y }; guide.walking = false; return; }
  const dx = feet.x - guide.pos.x, dy = feet.y - guide.pos.y, d = Math.hypot(dx, dy);
  if (d > 16) { guide.pos.x = feet.x; guide.pos.y = feet.y; guide.steps = []; guide.walking = false; return; }   // die Karte ist weit gesprungen
  if (d < 0.6 || (fixedOnScreen && !guide.walking)) { guide.pos.x = feet.x; guide.pos.y = feet.y; guide.walking = false; return; }
  if (d > 1.2 && !fixedOnScreen) guide.walking = true;
  if (!guide.walking) { const k = Math.min(1, dt * 8); guide.pos.x += dx * k; guide.pos.y += dy * k; return; }
  const step = Math.min(d, Math.max(GUIDE_WALK_SPEED, d * 1.6) * dt);   // weite Wege nicht ewig: die Blase kommt erst bei der Ankunft
  guide.pos.x += dx / d * step;
  guide.pos.y += dy / d * step;
  guide.stepAge += step;
  if (guide.stepAge >= 0.55) {
    guide.stepAge = 0;
    guide.steps.push({ x: guide.pos.x, y: guide.pos.y, foot: guide.steps.length % 2 ? 1 : -1, age: 0 });
    if (guide.steps.length > 24) guide.steps.shift();
  }
}

// ---------------------------------------------------------------------
// Zeichnen
// ---------------------------------------------------------------------

let guideSprite = null;
// Das Bild endet unten mit harter Kante: einmal vorbereiten, dass es sanft ausläuft (nicht jedes Bild neu)
function guideFigure() {
  const img = images[GUIDE_FACE];
  if (!img || !img.width) return null;
  if (guideSprite || typeof document === 'undefined') return guideSprite;
  const c = newCanvas();
  c.width = img.width; c.height = img.height;
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0);
  g.globalCompositeOperation = 'destination-in';
  const fade = g.createLinearGradient(0, img.height * 0.8, 0, img.height);
  fade.addColorStop(0, 'rgba(0,0,0,1)');
  fade.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = fade;
  g.fillRect(0, 0, img.width, img.height);
  guideSprite = c;
  return c;
}

function drawGuideFigure(g) {
  const p = guideScreenFeet();
  const f = frameTime;
  const walk = guide.walking;
  const bob = walk ? Math.abs(Math.sin(f * 11)) * 5 : Math.sin(f * 2.2) * 1.2;
  const tilt = walk ? Math.sin(f * 11) * 0.07 : Math.sin(f * 2.2) * 0.025;
  ctx.fillStyle = 'rgba(30,20,5,0.32)';
  ctx.beginPath();
  ctx.ellipse(p.x, p.y, g * 0.36, g * 0.09, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.translate(p.x, p.y - bob);
  ctx.rotate(tilt);
  if (guide.flip) ctx.scale(-1, 1);
  const img = guideFigure();
  if (img) ctx.drawImage(img, -g / 2, -g * 1.02, g, g * (img.height / img.width));
  else { ctx.font = `${g * 0.8}px sans-serif`; ctx.textAlign = 'center'; ctx.fillText('👴', 0, -g * 0.2); }
  ctx.restore();
}

function drawGuideSteps(dt) {
  for (const s of guide.steps) s.age += dt;
  guide.steps = guide.steps.filter(s => s.age < 3.5);
  const size = Math.max(2.5, 4.5 * cam.zoom);
  for (const s of guide.steps) {
    const p = tileToScreen(s.x, s.y);
    ctx.fillStyle = `rgba(255,246,227,${0.85 * (1 - s.age / 3.5)})`;
    ctx.beginPath();
    ctx.ellipse(p.x + s.foot * size, p.y + s.foot * size * 0.4, size, size * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Gestrichelter Pfeil (Kurve von a nach b)
function drawGuideArrow(a, b, bend, color) {
  const mx = (a.x + b.x) / 2 - (b.y - a.y) * bend, my = (a.y + b.y) / 2 + (b.x - a.x) * bend;
  const u = guideScale();
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.quadraticCurveTo(mx, my, b.x, b.y);
  ctx.strokeStyle = 'rgba(90,58,18,0.55)'; ctx.lineWidth = 6 * u; ctx.setLineDash([]); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.quadraticCurveTo(mx, my, b.x, b.y);
  ctx.strokeStyle = color; ctx.lineWidth = 3.5 * u; ctx.setLineDash([9 * u, 8 * u]); ctx.lineDashOffset = -frameTime * 22; ctx.stroke();
  ctx.setLineDash([]); ctx.lineDashOffset = 0;
  const ang = Math.atan2(b.y - my, b.x - mx), h = 15 * u;
  ctx.beginPath();
  ctx.moveTo(b.x, b.y);
  ctx.lineTo(b.x - Math.cos(ang - 0.5) * h, b.y - Math.sin(ang - 0.5) * h);
  ctx.lineTo(b.x - Math.cos(ang + 0.5) * h, b.y - Math.sin(ang + 0.5) * h);
  ctx.closePath();
  ctx.fillStyle = color; ctx.fill();
  ctx.strokeStyle = 'rgba(90,58,18,0.8)'; ctx.lineWidth = 1.5; ctx.stroke();
}

function drawGuideFinger(x, y) {
  const size = 30 * guideScale();
  ctx.font = `${size}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#000';
  ctx.fillText('👆', x, y);
  ctx.textBaseline = 'alphabetic';
}

function drawGuideGlowTile(x, y, s, pulse) {
  diamondPath(ctx, x, y, s, s, tileToScreen);
  ctx.fillStyle = `rgba(255,224,138,${0.3 + 0.2 * pulse})`;
  ctx.fill();
  ctx.strokeStyle = '#ffd44f';
  ctx.lineWidth = Math.max(2, 3 * cam.zoom);
  ctx.stroke();
}

function barArrowStart() {
  const r = guide.barRect;
  return r ? { x: (r.l + r.r) / 2, y: r.t - 2 } : null;
}

function drawGuideMarks(plan, pulse, targetSeen) {
  if (plan.kind === 'site' && !pathMode) {
    drawGuideGlowTile(plan.x, plan.y, plan.s, pulse);
    drawBuildingSprite(plan.type, plan.x, plan.y, 0, (6 + pulse * 3) * cam.zoom, 0.72);
    ctx.globalAlpha = 1;
    const from = barArrowStart();
    if (from && targetSeen) {
      const c = tileToScreen(plan.x + plan.s / 2, plan.y + plan.s / 2);
      const d = Math.hypot(c.x - from.x, c.y - from.y) || 1, stop = plan.s * TW * cam.zoom * 0.5;
      if (d > stop * 1.5) drawGuideArrow(from, { x: c.x - (c.x - from.x) / d * stop, y: c.y - (c.y - from.y) / d * stop }, viewH > viewW ? -0.2 : 0.14, '#ffd44f');
    }
  }
  if (plan.kind === 'road') {
    for (const [x, y] of plan.route) drawGuideGlowTile(x, y, 1, pulse);
    if (plan.route.length && targetSeen) {
      const mid = ([x, y]) => tileToScreen(x + 0.5, y + 0.5);
      if (pathMode) {   // Finger fährt die Felder entlang: So wird gezogen
        const pos = (frameTime * 1.6) % (plan.route.length + 0.8);
        const k = Math.min(plan.route.length - 1, Math.floor(pos)), f = Math.min(1, pos - k);
        const a = mid(plan.route[k]), b = mid(plan.route[Math.min(plan.route.length - 1, k + 1)]);
        drawGuideFinger(a.x + (b.x - a.x) * f, a.y + (b.y - a.y) * f);
      } else {
        const from = barArrowStart();
        if (from) drawGuideArrow(from, mid(plan.route[Math.floor(plan.route.length / 2)]), 0.12, '#ffd44f');
      }
    }
  }
  if (plan.kind === 'building' && !plan.swipe) {
    if (!plan.wait) {
      drawGuideGlowTile(plan.x, plan.y, plan.s, pulse);
      const c = tileToScreen(plan.x + plan.s / 2, plan.y + plan.s / 2);
      const lift = plan.hold ? 0 : Math.abs(Math.sin(frameTime * 3)) * 8;
      drawGuideFinger(c.x, c.y - 4 + lift);
      if (plan.hold) {   // gedrückt halten: Kreis läuft voll
        const phase = (frameTime % 1.4) / 0.9;
        ctx.strokeStyle = '#ffd44f'; ctx.lineWidth = 4 * guideScale();
        ctx.beginPath(); ctx.arc(c.x, c.y, 26 * guideScale(), -Math.PI / 2, -Math.PI / 2 + Math.min(1, phase) * Math.PI * 2); ctx.stroke();
      }
    }
  }
  if (plan.swipe && guide.keyTime < 2.6) {
    const box = guideFreeBox();
    const swing = Math.sin(guide.keyTime * 2.4) * 44 * guideScale();
    drawGuideFinger((box.l + box.r) / 2 + swing, box.b - 62 * guideScale());
  }
  if (plan.kind === 'ui' && guide.uiRect && guide.pos) {
    const p = guideScreenFeet(), g = guideFigureSize();
    if (guide.uiRect.r < p.x - g / 2) drawGuideArrow({ x: p.x - g * 0.5, y: p.y - g * 0.6 }, { x: guide.uiRect.r + 4, y: (guide.uiRect.t + guide.uiRect.b) / 2 }, 0.1, '#ffd44f');
  }
}

// Blase, Hinweis am Bildrand: nur anfassen, wenn sich etwas ändert
function guideBubbleHtml(plan) {
  if (guide.flash) return guide.flash.html + guideDotsHtml();
  const help = plan.hilfe && guide.keyTime > GUIDE_HELP_SECONDS;
  const say = plan.say;
  const rich = t => esc(t).replace(/\*(.+?)\*/g, '<b>$1</b>');
  return `<em>${rich(say.ruf)}</em>${rich(help ? plan.hilfe : say.text || '')}${guideDotsHtml()}`;
}

function guideDotsHtml() {
  const step = tutorialStep();
  if (!step || step.auto) return '';
  const now = step.id === 'auftraege' ? GUIDE_DOTS.length : GUIDE_DOTS.indexOf(step.id);
  return `<span class="guide-dots">${GUIDE_DOTS.map((_, i) => `<i class="${i < now ? 'ok' : i === now ? 'now' : ''}"></i>`).join('')}</span>`;
}

function positionGuideBubble(plan, t, g, visible) {
  const el = $('guide-bubble');
  if (!el) return;
  const on = visible && !!guide.side && !(guide.walking && !guide.flash) && !pageOpen;
  const html = plan ? guideBubbleHtml(plan) : '';
  if (html !== guide.lastBubble) { guide.lastBubble = html; el.innerHTML = html; guide.bubbleSize = null; }
  const tail = guide.side ? { r: 'tail-l', l: 'tail-r', t: 'tail-b' }[guide.side[1]] : '';
  const cls = (on ? '' : 'off ') + (tail || '');
  if (cls !== guide.lastBubbleClass) { guide.lastBubbleClass = cls; el.className = cls; }
  if (!on) return;
  const bub = guideBubbleSize(), feet = guideScreenFeet();
  const e = { l: feet.x - g / 2, r: feet.x + g / 2, t: feet.y - g * 0.94, b: feet.y + g * 0.06 };
  const r = guideBubbleRect(guide.side[1], e, bub, 4 * guideScale());
  const box = guideFreeBox(), area = guide.bounds || box;
  const x = Math.max(area.l + 2, Math.min(area.r - bub.w - 2, r.l));
  let y = Math.max(box.t + 3, Math.min(box.b - bub.h - 3, r.t));
  const skip = guide.skipRect;   // „Überspringen“ bleibt frei
  if (skip && x + bub.w > skip.l && x < skip.r && y < skip.b && y + bub.h > skip.t) y = Math.min(box.b - bub.h - 3, skip.b + 3);
  const offset = guide.offsetL || 0;
  const key = `${Math.round(x)},${Math.round(y)},${Math.round(feet.x)}`;
  if (key !== guide.lastPos) {
    guide.lastPos = key;
    el.style.transform = `translate(${Math.round(x - offset)}px,${Math.round(y)}px)`;
    if (guide.side[1] === 't') el.style.setProperty('--tail-x', Math.max(16, Math.min(bub.w - 16, feet.x - x)) + 'px');
  }
}

function positionGuideEdge(plan, seen, t) {
  const el = $('guide-edge');
  if (!el) return;
  const onMap = plan && plan.x !== undefined && plan.kind !== 'ghost';
  const showIt = onMap && !seen && !pageOpen;
  if (showIt !== guide.offscreen) { guide.offscreen = showIt; show(el, showIt); }
  if (!showIt) return;
  const box = guideFreeBox(), area = guide.bounds || box;
  const cx = (box.l + box.r) / 2, cy = (box.t + box.b) / 2;
  const tx = (t.l + t.r) / 2, ty = (t.t + t.b) / 2;
  const w = el.offsetWidth || 110, h = el.offsetHeight || 30;
  const dx = tx - cx, dy = ty - cy;
  const scale = Math.min(Math.abs(dx) > 1 ? ((box.r - box.l) / 2 - w / 2 - 6) / Math.abs(dx) : 9, Math.abs(dy) > 1 ? ((box.b - box.t) / 2 - h / 2 - 6) / Math.abs(dy) : 9);
  const x = Math.max(area.l + 2, cx + dx * scale - w / 2), y = cy + dy * scale - h / 2;
  const offset = guide.offsetL || 0;
  el.style.transform = `translate(${Math.round(x - offset)}px,${Math.round(y)}px)`;
  const arrow = $('guide-edge-arrow');
  if (arrow) arrow.style.transform = `rotate(${Math.round(Math.atan2(dy, dx) * 180 / Math.PI)}deg)`;
}

function drawGuide(dt) {
  tutorialTick(dt);
  const plan = guide.plan;
  if (!tutorialStep() || !plan) return;
  if ((guide.measureTimer += dt) >= 0.25) { guide.measureTimer = 0; guideMeasure(); }
  if (!guide.bounds) guideMeasure();
  // Beim Ziehen des geplanten Gebäudes bleibt er stehen; erst nach dem Loslassen läuft er nach
  const dragging = plan.kind === 'ghost' && ((gesture && gesture.mode === 'ghost') || (barDrag && barDrag.dragging));
  const t = dragging && guide.frozen ? guide.frozen : guideTargetRect(plan);
  guide.frozen = t;
  const g = guideFigureSize();
  const coreX = (t.l + t.r) / 2, coreY = plan.kind === 'ui' ? (t.t + t.b) / 2 : (t.t * 0.3 + t.b * 0.7);
  const seen = plan.kind === 'ui' || plan.x === undefined || guidePointFree(coreX, coreY, 8);
  const pulse = 0.5 + 0.5 * Math.sin(frameTime * 4);
  if (!guide.flash) drawGuideMarks(plan, pulse, seen);
  if (seen) {
    if (!guide.side || (guide.sideTimer += dt) >= 0.4) {
      guide.sideTimer = 0;
      if (!dragging) guideChooseSide(plan, t, g);
    }
    if (guide.side && !dragging) guideMove(dt, plan, t, g);
    guide.flip = !!guide.pos && (t.l + t.r) / 2 > guideScreenFeet().x;
    drawGuideSteps(dt);
    if (guide.pos) drawGuideFigure(g);
  } else {
    guide.pos = null;   // Ort außerhalb: Er kommt wieder dazu, sobald der Ort im Bild ist
    guide.steps = [];
  }
  positionGuideBubble(plan, t, g, seen);
  positionGuideEdge(plan, seen, t);
}

// ---------------------------------------------------------------------
// Hinweise des Stammesältesten nach dem Einstieg (z. B. Gebäude ohne Arbeiter)
// ---------------------------------------------------------------------

let elderHint = null;
let lastHintAt = -1e9;
const HINT_PAUSE_S = 300;   // höchstens alle 5 Spielminuten ein Hinweis

function renderElderHint() {
  const face = images['aeltester-1'] ? `<img src="${imagePath('aeltester-1')}" alt="">` : '<span class="emoji">👴</span>';
  $('tutorial').innerHTML = `<div class="elder">${face}</div>
    <div class="speech"><b>Stammesältester</b><p>${esc(elderHint)}</p>
      <div class="tut-buttons"><button class="btn primary" onclick="closeElderHint()">Verstanden</button></div>
    </div>`;
}

function closeElderHint() {
  elderHint = null;
  renderTutorial();
}

// Steht ein fertiges Gebäude mit Weg ohne Arbeiter da, weil alle Menschen schon arbeiten? Dann erklären, was hilft.
let shortageSince = null;
function checkStaffHint() {
  // Arbeiterfalle: nur wenn sie mindestens eine Minute anhält (sonst meldet sich der Älteste bei jedem neuen Gebäude)
  const short = workerShortage();
  if (!short) shortageSince = null;
  else if (shortageSince === null) shortageSince = state.playTime;
  if (elderHint || tutorialStep() || state.playTime - lastHintAt < HINT_PAUSE_S) return;
  if (short && state.playTime - shortageSince >= 60) {
    lastHintAt = state.playTime;
    const name = BUILDINGS[state.buildings[short.i].type].name, good = RESOURCES[short.good].name;
    let text = `${name}: Hier fehlen Arbeiter, und ${good} geht aus. `;
    if (short.donor !== null) {
      const d = BUILDINGS[state.buildings[short.donor].type];
      text += `Bei ${d.name} arbeiten Leute, obwohl dort alles voll ist. Tippe es an und drücke ⏸ Pause, ` +
        (short.helps ? 'dann arbeiten sie hier.' : 'dann werden Leute für andere Gebäude frei.');
      if (d.produces.nahrung) text += ' Wenn die Nahrung sinkt, drücke dort wieder ▶ Weiter.';
    } else text += 'Baue eine Wohnung, dann kommen mehr Menschen. Oder tippe ein anderes Gebäude an und drücke ⏸ Pause.';
    elderHint = text;
    renderTutorial();
    return;
  }
  if (Math.floor(state.pop) < stats.housing) return;   // es ziehen noch Menschen zu
  const i = state.buildings.findIndex((b, k) => {
    const def = BUILDINGS[b.type];
    return def.workers && !b.build && !b.paused && isConnected(k) && !(stats.staff[k] > 0);
  });
  if (i < 0) return;
  // Die Arbeiter werden nur 4× je Sekunde neu verteilt: Ein gerade fertiges Gebäude hat vielleicht noch keine, obwohl Leute frei sind
  recalcStats();
  if (stats.staff[i] > 0) return;
  lastHintAt = state.playTime;
  const name = BUILDINGS[state.buildings[i].type].name;
  let text = `${name}: Hier arbeitet niemand – alle Menschen sind schon beschäftigt. Baue eine Wohnung, dann kommen mehr Menschen. ` +
    `Oder tippe ein anderes Gebäude an und drücke ⏸ Pause: Dann arbeiten dessen Leute hier.`;
  if ((state.res.stein || 0) < (BUILDINGS.wohnhoehle.cost.stein || 0)) text += ' Fehlt dir Stein? Tippe auf einen Felsen und trage ihn ab.';
  elderHint = text;
  renderTutorial();
}

// Der Aufbruch ist dran, aber die Einwohner verbrauchen eine Ware schneller, als sie zusammenkommt: einmal je Forschung warnen
let stallSince = null;
function checkStallHint() {
  const g = researchGoal();
  const open = g && !TECHS[g.trans].soon && techStatus(g.trans) === 'available' ? g.trans : null;
  if (!open || !researchStalls(open).length || (state.seen || {})['stau_' + open]) { stallSince = null; return; }
  if (stallSince === null) stallSince = state.playTime;
  if (elderHint || tutorialStep() || state.playTime - stallSince < 120 || state.playTime - lastHintAt < HINT_PAUSE_S) return;
  (state.seen ||= {})['stau_' + open] = true;
  lastHintAt = state.playTime;
  elderHint = `Der Weg ins nächste Zeitalter stockt! ${stallText(open)}`;
  renderTutorial();
}

// Erste Mammutherde nach der Forschung „Mammutjagd“: einmal erklären, wie die Jagd geht
function checkHerdHint() {
  if (elderHint || tutorialStep() || (state.seen || {}).mammutherde) return;
  if (!state.techs.mammutjagd || !herdPresent() || !life.animals.some(a => a.kind === 'mammut')) return;
  (state.seen ||= {}).mammutherde = true;
  lastHintAt = state.playTime;
  elderHint = 'Seht, eine Mammutherde zieht vorbei! Tippe ein Mammut an und schicke die Jäger los. ' +
    'Nach einer Minute bringen sie viel Fleisch und Felle – mit dem Mammutjägerlager noch mehr.';
  renderTutorial();
}
