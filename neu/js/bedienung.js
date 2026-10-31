'use strict';
// Epochia – Bedienung: Karte verschieben und zoomen, Gebäude aus der Leiste ziehen, antippen, hochheben, drehen.

let ghost = null;       // geplantes oder hochgehobenes Gebäude: { type, x, y, rot, from } (from = -1: neu)
let pathMode = false;   // Trampelpfade malen
let selected = -1;      // angetipptes Gebäude

const LONG_PRESS_MS = 450;
const DRAG_START_PX = 9;
const FINGER_LIFT_PX = 55;   // beim Ziehen schwebt das Gebäude über dem Finger, damit man es sieht

const pointers = new Map();
let gesture = null;     // { mode: 'press' | 'pan' | 'pinch' | 'ghost' | 'path' | 'done', … }
let pressTimer = 0;

function ghostProblem() {
  if (!ghost) return null;
  return ghost.from < 0 ? buildProblem(ghost.type, ghost.x, ghost.y) : placeProblem(ghost.type, ghost.x, ghost.y, ghost.from);
}

// Gebäude mit der Mitte auf einen Bildschirmpunkt setzen
function ghostToScreen(sx, sy) {
  const s = BUILDINGS[ghost.type].size;
  const t = screenToTileF(sx, sy);
  ghost.x = Math.max(0, Math.min(N - s, Math.round(t.x - s / 2)));
  ghost.y = Math.max(0, Math.min(N - s, Math.round(t.y - s / 2)));
}

// Freien Platz in der Nähe eines Feldes suchen (Spirale nach außen)
function findFreeSpot(type, cx, cy) {
  const s = BUILDINGS[type].size;
  for (let r = 0; r < 14; r++)
    for (let dy = -r; dy <= r; dy++)
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const x = cx + dx - Math.floor(s / 2), y = cy + dy - Math.floor(s / 2);
        if (!placeProblem(type, x, y)) return { x, y };
      }
  return { x: cx - Math.floor(s / 2), y: cy - Math.floor(s / 2) };
}

// Bauen beginnen (aus der Leiste). Ohne Bildschirmpunkt: in der Mitte einen freien Platz suchen.
function beginBuild(type, sx, sy) {
  closeInfo();
  (state.seen ||= {})[type] = true;
  if (BUILDINGS[type].isPath) {
    ghost = null;
    pathMode = true;
    renderActionBar();
    return;
  }
  pathMode = false;
  ghost = { type, x: 0, y: 0, rot: false, from: -1 };
  if (sx === undefined) {
    const c = screenToTile(viewW / 2, viewH / 2);
    const spot = findFreeSpot(type, c.x, c.y);
    ghost.x = spot.x; ghost.y = spot.y;
  } else ghostToScreen(sx, sy - FINGER_LIFT_PX);
  renderActionBar();
}

function liftBuilding(i) {
  const b = state.buildings[i];
  if (!b || BUILDINGS[b.type].isPath) return;
  closeInfo();
  ghost = { type: b.type, x: b.x, y: b.y, rot: b.rot, from: i };
  if (navigator.vibrate) try { navigator.vibrate(30); } catch (e) { /* egal */ }
  emit('lifted', b);
  renderActionBar();
}

function confirmGhost() {
  if (!ghost) return;
  const g = ghost;
  const problem = g.from < 0 ? placeBuilding(g.type, g.x, g.y, g.rot) : moveBuilding(g.from, g.x, g.y, g.rot);
  if (problem) { toast(problem); return; }
  ghost = null;
  renderActionBar();
  renderAll();
}

function rotateGhost() {
  if (ghost) ghost.rot = !ghost.rot;
}

function cancelGhost() {
  ghost = null;
  pathMode = false;
  renderActionBar();
}

function paintPath(sx, sy) {
  const t = screenToTile(sx, sy);
  if (!inMap(t.x, t.y) || buildingAt(t.x, t.y) >= 0) return;
  const problem = placeBuilding(wayTypeAt(t.x, t.y), t.x, t.y);   // über Wasser entsteht eine Brücke
  if (problem && problem !== gesture.lastProblem) { toast(problem); gesture.lastProblem = problem; }
}

function erasePath(sx, sy) {
  const t = screenToTile(sx, sy);
  if (!inMap(t.x, t.y) || !isPathAt(t.x, t.y)) return;
  demolish(buildingAt(t.x, t.y));
}

// Was liegt unter dem Finger? Gebäude (pixelgenau am Bild) und Bäume/Felsen werden wie beim Zeichnen nach Tiefe
// geordnet – das vorderste gewinnt. Ergebnis: { i } für ein Gebäude, { x, y } für Baum/Felsen oder null.
function objectAtScreen(sx, sy) {
  const t = screenToTile(sx, sy);
  let best = null;
  const consider = (d, hit) => { if (!best || d > best.d) best = { d, ...hit }; };
  const direct = inMap(t.x, t.y) ? buildingAt(t.x, t.y) : -1;
  if (direct >= 0 && !BUILDINGS[state.buildings[direct].type].isPath) { const b = state.buildings[direct]; consider(b.x + b.y + BUILDINGS[b.type].size, { i: direct }); }
  state.buildings.forEach((b, i) => {
    const def = BUILDINGS[b.type], s = def.size;
    if (def.isPath || i === direct) return;
    if (b.x > t.x + 4 || b.y > t.y + 4 || b.x + s + 6 < t.x || b.y + s + 6 < t.y) return;   // zu weit weg
    let hit = buildingImageHit(b, sx, sy);
    if (hit === null) {   // ohne Bild bzw. ohne Pixel: grob über den Umriss
      const left = tileToScreen(b.x, b.y + s).x, right = tileToScreen(b.x + s, b.y).x;
      const bottom = tileToScreen(b.x + s / 2, b.y + s / 2).y;
      hit = sx >= left + 6 && sx <= right - 6 && sy >= bottom - s * TW * cam.zoom * 0.55 && sy <= bottom;
    }
    if (hit) consider(b.x + b.y + s, { i });
  });
  for (let y = t.y - 1; y <= t.y + 3; y++)
    for (let x = t.x - 1; x <= t.x + 3; x++) {
      if (!inMap(x, y) || !terrainAt(x, y).clear || buildingAt(x, y) >= 0) continue;
      const r = terrainObjectRect(x, y);
      const onTile = x === t.x && y === t.y;
      if (onTile || (sx >= r.x0 && sx <= r.x1 && sy >= r.y0 && sy <= r.y1)) consider(x + y + 1 + (onTile ? 0.01 : 0), { x, y });
    }
  return best;
}

// Welches Gebäude liegt unter dem Finger? (-1 = keins oder ein Baum davor)
function buildingAtScreen(sx, sy) {
  const o = objectAtScreen(sx, sy);
  return o && o.i !== undefined ? o.i : -1;
}

function handleTap(sx, sy) {
  if (ghost) {   // anderswo tippen: geplantes Gebäude dorthin setzen
    ghostToScreen(sx, sy);
    return;
  }
  if (pathMode) return;
  const mammoth = typeof mammothAtScreen === 'function' ? mammothAtScreen(sx, sy) : null;
  if (mammoth) { showHuntInfo(mammoth); return; }
  const hit = objectAtScreen(sx, sy);
  if (hit && hit.i === undefined && isOwned(hit.x, hit.y)) { showTerrainInfo(hit.x, hit.y, sx, sy); return; }
  const i = hit && hit.i !== undefined ? hit.i : -1;
  if (i >= 0) {
    selected = i;
    showInfo(i);
    emit('tapped', state.buildings[i]);
    return;
  }
  const t = screenToTile(sx, sy);
  if (!inMap(t.x, t.y)) { closeInfo(); return; }
  if (!isOwned(t.x, t.y)) {
    closeInfo();
    showPlotDialog(plotOf(t.x, t.y));
    return;
  }
  const ter = terrainAt(t.x, t.y);
  if (ter.clear) { showTerrainInfo(t.x, t.y, sx, sy); return; }
  closeInfo();
}

function pointerPos(e) {
  const r = canvas.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

function onPointerDown(e) {
  if (!state) return;
  const p = pointerPos(e);
  pointers.set(e.pointerId, p);
  try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* egal */ }
  clearTimeout(pressTimer);
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    gesture = { mode: 'pinch', dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
    return;
  }
  if (pointers.size > 2) return;
  gesture = { mode: 'press', start: p, last: p };
  if (ghost) {
    const t = screenToTileF(p.x, p.y);
    const s = BUILDINGS[ghost.type].size;
    if (t.x >= ghost.x - 1 && t.x <= ghost.x + s + 1 && t.y >= ghost.y - 1 && t.y <= ghost.y + s + 1) {
      gesture.mode = 'ghost';
      gesture.offset = { x: t.x - ghost.x, y: t.y - ghost.y };
    }
    return;
  }
  if (pathMode) {   // auf einem Weg anfangen = Wege wegwischen, sonst Wege malen
    const t = screenToTile(p.x, p.y);
    gesture.mode = isPathAt(t.x, t.y) ? 'erase' : 'path';
    if (gesture.mode === 'erase') erasePath(p.x, p.y); else paintPath(p.x, p.y);
    return;
  }
  const i = buildingAtScreen(p.x, p.y);
  if (i >= 0 && !state.buildings[i].build) {
    pressTimer = setTimeout(() => {
      if (gesture && gesture.mode === 'press') {
        liftBuilding(i);
        const t = screenToTileF(gesture.last.x, gesture.last.y);
        gesture.mode = 'ghost';
        gesture.offset = { x: t.x - ghost.x, y: t.y - ghost.y };
      }
    }, LONG_PRESS_MS);
  }
}

function onPointerMove(e) {
  if (!pointers.has(e.pointerId) || !gesture) return;
  const prev = pointers.get(e.pointerId);
  const p = pointerPos(e);
  pointers.set(e.pointerId, p);
  if (gesture.mode === 'pinch') {
    if (pointers.size < 2) return;
    const [a, b] = [...pointers.values()];
    const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    zoomAt(mid.x, mid.y, dist / gesture.dist);
    cam.x -= (mid.x - gesture.mid.x) / cam.zoom;
    cam.y -= (mid.y - gesture.mid.y) / cam.zoom;
    clampCamera();
    gesture.dist = dist;
    gesture.mid = mid;
    return;
  }
  gesture.last = p;
  if (gesture.mode === 'press' && Math.hypot(p.x - gesture.start.x, p.y - gesture.start.y) > DRAG_START_PX) {
    clearTimeout(pressTimer);
    gesture.mode = 'pan';
    closeInfo();
  }
  if (gesture.mode === 'pan') {
    cam.x -= (p.x - prev.x) / cam.zoom;
    cam.y -= (p.y - prev.y) / cam.zoom;
    clampCamera();
  } else if (gesture.mode === 'ghost') {
    const t = screenToTileF(p.x, p.y);
    const s = BUILDINGS[ghost.type].size;
    ghost.x = Math.max(0, Math.min(N - s, Math.round(t.x - gesture.offset.x)));
    ghost.y = Math.max(0, Math.min(N - s, Math.round(t.y - gesture.offset.y)));
    renderActionBar();
  } else if (gesture.mode === 'path') {
    paintPath(p.x, p.y);
  } else if (gesture.mode === 'erase') {
    erasePath(p.x, p.y);
  }
}

function onPointerUp(e) {
  if (!pointers.has(e.pointerId)) return;
  pointers.delete(e.pointerId);
  clearTimeout(pressTimer);
  if (!gesture) return;
  if (gesture.mode === 'press' && e.type === 'pointerup') handleTap(gesture.start.x, gesture.start.y);
  if (gesture.mode === 'ghost') renderActionBar();
  // nach dem Zoomen mit zwei Fingern nichts mehr tun, bis alle Finger weg sind
  gesture = pointers.size ? { mode: 'done' } : null;
}

function onWheel(e) {
  e.preventDefault();
  const p = pointerPos(e);
  zoomAt(p.x, p.y, e.deltaY < 0 ? 1.12 : 1 / 1.12);
}

// Ziehen aus der Bauleiste: nach oben ziehen = bauen, zur Seite = Leiste blättern (macht der Browser)
let barDrag = null;

function onBarPointerDown(e, type, locked) {
  barDrag = { type, locked, x: e.clientX, y: e.clientY, dragging: false, id: e.pointerId };
  try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) { /* egal */ }
}

function onBarPointerMove(e) {
  if (!barDrag || barDrag.id !== e.pointerId) return;
  const dx = e.clientX - barDrag.x, dy = e.clientY - barDrag.y;
  if (!barDrag.dragging && !barDrag.locked && dy < -12 && Math.abs(dy) > Math.abs(dx)) {
    barDrag.dragging = true;
    beginBuild(barDrag.type, 0, 0);
  }
  if (barDrag.dragging && ghost) {
    const r = canvas.getBoundingClientRect();
    ghostToScreen(e.clientX - r.left, e.clientY - r.top - FINGER_LIFT_PX);
    renderActionBar();
  }
}

function onBarPointerUp(e) {
  if (!barDrag || barDrag.id !== e.pointerId) return;
  const d = barDrag;
  barDrag = null;
  if (d.dragging) return;
  if (e.type === 'pointercancel') return;   // Leiste wurde geblättert
  if (d.locked) {   // gesperrt: Forschungsfenster mit der nötigen Forschung öffnen
    toast(lockText(d.type) || 'Noch gesperrt');
    const req = BUILDINGS[d.type].requires;
    if (req && TECHS[req]) { researchSelected = req; openResearch(); }
    return;
  }
  beginBuild(d.type);
}

function setupInput() {
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);
  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { cancelGhost(); closeInfo(); }
    if (e.key === 'r' || e.key === 'R') rotateGhost();
  });
}
