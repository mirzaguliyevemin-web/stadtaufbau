'use strict';
// Epochia – Einstieg: Der Stammesälteste führt Schritt für Schritt durch die ersten Minuten.
// Immer nur ein Schritt; ein leuchtender Rahmen zeigt, wohin man tippen oder ziehen soll.

function tutorialStep() {
  return state && state.tutorial >= 0 ? TUTORIAL[state.tutorial] : null;
}

// Ist ein Schritt schon erledigt (z. B. weil man vorgegriffen hat)?
function tutorialAlreadyDone(step) {
  const has = type => state.buildings.some(b => b.type === type);
  switch (step.id) {
    case 'sammlerin': return has('sammlerin');
    case 'pfad': return sammlerinConnected();
    case 'holzsammler': return has('holzsammler');
    case 'wohnhoehle': return state.buildings.filter(b => b.type === 'wohnhoehle').length > 2;
    case 'forschung': return !!state.research || Object.keys(state.techs).length > 0;
    default: return false;
  }
}

function sammlerinConnected() {
  return state.buildings.some((b, i) => b.type === 'sammlerin' && isConnected(i));
}

function advanceTutorial() {
  if (!state || state.tutorial < 0) return;
  state.tutorial++;
  while (state.tutorial < TUTORIAL.length && tutorialAlreadyDone(TUTORIAL[state.tutorial])) state.tutorial++;
  if (state.tutorial >= TUTORIAL.length) state.tutorial = -1;
  renderTutorial();
}

function skipTutorial() {
  state.tutorial = -1;
  renderTutorial();
}

function restartTutorial() {
  state.tutorial = 0;
  renderTutorial();
}

function renderTutorial() {
  const step = tutorialStep();
  const box = $('tutorial');
  show(box, !!step || !!elderHint);
  highlightTutorialTarget();
  if (!step) { if (elderHint) renderElderHint(); return; }
  const face = images['aeltester-1'] ? `<img src="${IMAGE_DIR}aeltester-1.webp" alt="">` : '<span class="emoji">👴</span>';
  const last = state.tutorial === TUTORIAL.length - 1;
  box.innerHTML = `<div class="elder">${face}</div>
    <div class="speech"><b>Stammesältester</b><p>${esc(step.text)}</p>
      <div class="tut-buttons">
        ${step.button ? `<button class="btn primary" onclick="advanceTutorial()">${esc(step.button)}</button>` : ''}
        ${last ? '' : '<button class="btn small" onclick="skipTutorial()">Überspringen</button>'}
      </div>
      <small>Schritt ${state.tutorial + 1} von ${TUTORIAL.length}</small>
    </div>`;
}

function highlightTutorialTarget() {
  if (typeof document === 'undefined') return;
  for (const el of document.querySelectorAll('.glow')) el.classList.remove('glow');
  const step = tutorialStep();
  if (!step) return;
  let target = step.target;
  // Forschung: erst den Höhlenmaler bauen, dann auf den Forschungs-Knopf zeigen
  if (step.id === 'forschung' && state.buildings.some(b => b.type === 'hoehlenmaler')) target = 'btn-research';
  if (!target) return;
  const el = target.startsWith('bar:') ? document.querySelector(`.bar-item[data-type="${target.slice(4)}"]`) : $(target);
  if (el) el.classList.add('glow');
}

function onTutorialEvent(name, data) {
  const step = tutorialStep();
  if (!step) return;
  const type = data && data.type;
  const done =
    (step.id === 'sammlerin' && name === 'placed' && type === 'sammlerin') ||
    (step.id === 'pfad' && (name === 'placed' || name === 'moved') && sammlerinConnected()) ||
    (step.id === 'antippen' && name === 'tapped' && !data.build && type !== 'lagerfeuer' && type !== 'wohnhoehle') ||
    (step.id === 'holzsammler' && name === 'placed' && type === 'holzsammler') ||
    (step.id === 'hochheben' && name === 'lifted') ||
    (step.id === 'wohnhoehle' && name === 'placed' && type === 'wohnhoehle') ||
    (step.id === 'forschung' && name === 'researchStarted') ||
    (step.id === 'auftraege' && name === 'questsOpened');
  if (done) advanceTutorial();
  else if (step.id === 'forschung' && name === 'placed') highlightTutorialTarget();
}

for (const name of ['placed', 'moved', 'tapped', 'lifted', 'researchStarted', 'questsOpened']) on(name, data => onTutorialEvent(name, data));

// ---------------------------------------------------------------------
// Hinweise des Stammesältesten nach dem Einstieg (z. B. Gebäude ohne Arbeiter)
// ---------------------------------------------------------------------

let elderHint = null;
let lastHintAt = -1e9;
const HINT_PAUSE_S = 300;   // höchstens alle 5 Spielminuten ein Hinweis

function renderElderHint() {
  const face = images['aeltester-1'] ? `<img src="${IMAGE_DIR}aeltester-1.webp" alt="">` : '<span class="emoji">👴</span>';
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
function checkStaffHint() {
  if (elderHint || tutorialStep() || state.playTime - lastHintAt < HINT_PAUSE_S) return;
  if (Math.floor(state.pop) < stats.housing) return;   // es ziehen noch Menschen zu
  const i = state.buildings.findIndex((b, k) => {
    const def = BUILDINGS[b.type];
    return def.workers && !b.build && !b.paused && isConnected(k) && !(stats.staff[k] > 0);
  });
  if (i < 0) return;
  lastHintAt = state.playTime;
  const name = BUILDINGS[state.buildings[i].type].name;
  let text = `Beim ${name} arbeitet niemand – alle Menschen sind schon beschäftigt. Baue eine Wohnung, dann kommen mehr Menschen. ` +
    `Oder tippe ein anderes Gebäude an und drücke ⏸ Pause: Dann arbeiten dessen Leute hier.`;
  if ((state.res.stein || 0) < (BUILDINGS.wohnhoehle.cost.stein || 0)) text += ' Fehlt dir Stein? Tippe auf einen Felsen und trage ihn ab.';
  elderHint = text;
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
