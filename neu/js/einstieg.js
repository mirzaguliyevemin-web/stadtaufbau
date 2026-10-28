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
    case 'holzsammler': return has('holzsammler');
    case 'wohnhoehle': return state.buildings.filter(b => b.type === 'wohnhoehle').length > 2;
    case 'forschung': return !!state.research || Object.keys(state.techs).length > 0;
    default: return false;
  }
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
  show(box, !!step);
  highlightTutorialTarget();
  if (!step) return;
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
    (step.id === 'antippen' && name === 'tapped' && !data.build && type !== 'lagerfeuer' && type !== 'wohnhoehle') ||
    (step.id === 'holzsammler' && name === 'placed' && type === 'holzsammler') ||
    (step.id === 'hochheben' && name === 'lifted') ||
    (step.id === 'wohnhoehle' && name === 'placed' && type === 'wohnhoehle') ||
    (step.id === 'forschung' && name === 'researchStarted') ||
    (step.id === 'auftraege' && name === 'questsOpened');
  if (done) advanceTutorial();
  else if (step.id === 'forschung' && name === 'placed') highlightTutorialTarget();
}

for (const name of ['placed', 'tapped', 'lifted', 'researchStarted', 'questsOpened']) on(name, data => onTutorialEvent(name, data));
