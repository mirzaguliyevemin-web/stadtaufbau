// Epochia – Leben auf der Karte: Menschen laufen auf den Trampelpfaden, Hirsche und eine Mammutherde ziehen
// umher, Ziegen grasen am Gehege, Fische springen, Vögel fliegen vorbei, Schmetterlinge flattern über den Blumen.
// Reine Darstellung: nichts davon wird gespeichert. Nur die Mammutherde lässt sich antippen und jagen
// (die Jagd selbst steht in logik.js, hier laufen nur die Jäger und Mammuts).

const LIFE_NAMES = ['mensch-mann', 'mensch-frau', 'mammut', 'hirsch', 'ziege', 'einbaum'];

const life = { walkers: [], animals: [], birds: [], jumps: [], butterflies: [], felled: [], birdTimer: 4, fishTimer: 1, herdTimer: 0 };

function lifeRandom() { return Math.random(); }

// Wohin darf ein Tier laufen? Wiese oder Sand, kein Gebäude
function animalFree(x, y) {
  if (!inMap(x, y) || occ[y * N + x]) return false;
  const t = terrain[y * N + x];
  return t === TERRAIN.gras.id || t === TERRAIN.sand.id;
}

function pathTiles() {
  const out = [];
  state.buildings.forEach(b => { if (BUILDINGS[b.type].isPath) out.push([b.x, b.y]); });
  return out;
}

// ---------------------------------------------------------------------
// Menschen auf den Pfaden
// ---------------------------------------------------------------------

function updateWalkers(dt) {
  const paths = pathTiles();
  const want = paths.length < 2 ? 0 : Math.min(14, Math.ceil(state.pop / 2), paths.length);
  while (life.walkers.length > want) life.walkers.pop();
  while (life.walkers.length < want) {
    const [x, y] = paths[Math.floor(lifeRandom() * paths.length)];
    life.walkers.push({ x: x + 0.5, y: y + 0.5, from: [x, y], to: [x, y], k: 1, speed: 0.7 + lifeRandom() * 0.4,
      img: lifeRandom() < 0.5 ? 'mensch-mann' : 'mensch-frau', face: 1, wait: lifeRandom() * 3, ph: lifeRandom() * 9 });
  }
  for (const w of life.walkers) {
    if (w.wait > 0) { w.wait -= dt; continue; }
    w.k += dt * w.speed;
    if (w.k >= 1) {
      // am nächsten Feld angekommen: ein Nachbarfeld mit Pfad wählen (nicht gleich zurück, außer in der Sackgasse)
      const [cx, cy] = w.to;
      if (!isPathAt(cx, cy)) { w.k = 1; w.to = w.from = paths[0]; continue; }
      const next = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [cx + dx, cy + dy]).filter(([x, y]) => isPathAt(x, y));
      const forward = next.filter(([x, y]) => x !== w.from[0] || y !== w.from[1]);
      const pick = forward.length ? forward : next;
      w.from = [cx, cy];
      w.to = pick.length ? pick[Math.floor(lifeRandom() * pick.length)] : [cx, cy];
      w.k = 0;
      if (lifeRandom() < 0.08) w.wait = 1 + lifeRandom() * 3;   // kurz stehen bleiben und plaudern
    }
    const k = Math.min(1, w.k);
    w.x = w.from[0] + 0.5 + (w.to[0] - w.from[0]) * k;
    w.y = w.from[1] + 0.5 + (w.to[1] - w.from[1]) * k;
    const sx = (w.to[0] - w.from[0]) - (w.to[1] - w.from[1]);   // Richtung auf dem Bildschirm (links/rechts)
    if (sx) w.face = sx > 0 ? -1 : 1;
  }
}

// ---------------------------------------------------------------------
// Tiere: Hirsche, Mammutherde, Ziegen am Gehege
// ---------------------------------------------------------------------

function spawnAnimal(kind, x, y, extra = {}) {
  life.animals.push({ kind, x: x + 0.5, y: y + 0.5, tx: x + 0.5, ty: y + 0.5, wait: lifeRandom() * 4, face: 1, ph: lifeRandom() * 9, ...extra });
}

function randomFreeTile(cx, cy, r, minDist = 0) {
  for (let i = 0; i < 40; i++) {
    const x = Math.round(cx + (lifeRandom() * 2 - 1) * r), y = Math.round(cy + (lifeRandom() * 2 - 1) * r);
    if (Math.hypot(x - cx, y - cy) >= minDist && animalFree(x, y)) return [x, y];
  }
  return null;
}

function updateAnimals(dt) {
  const camp = state.buildings[0];
  if (!camp) return;
  const cx = camp.x + 1.5, cy = camp.y + 1.5;
  // Hirsche: einige am Waldrand in der weiteren Umgebung
  const deer = life.animals.filter(a => a.kind === 'hirsch').length;
  if (deer < 5) { const p = randomFreeTile(cx, cy, 22, 9); if (p) spawnAnimal('hirsch', p[0], p[1], { home: p }); }
  // Mammutherde: drei Tiere ziehen gemeinsam, weit weg vom Lager – solange es Mammuts gibt und keine Jagd war
  life.herdTimer -= dt;
  const hunt = state.hunt, phase = hunt ? huntPhase() : 0;
  if (herdPresent() && !life.animals.some(a => a.kind === 'mammut') && life.herdTimer <= 0) {
    const p = randomFreeTile(cx, cy, 26, 14);
    if (p) for (let i = 0; i < 3; i++) spawnAnimal('mammut', p[0] + (i % 2), p[1] + Math.floor(i / 2), { home: p, herd: i });
    life.herdTimer = 20;
  }
  // Jäger sind angekommen (oder keine Herde mehr da): ein Mammut ist erlegt, die anderen laufen davon
  if (!herdPresent() && !(hunt && phase < 0.5)) {
    const herd = life.animals.filter(a => a.kind === 'mammut' && !a.flee);
    if (herd.length && hunt) life.animals.splice(life.animals.indexOf(herd.shift()), 1);
    for (const a of herd) {
      a.flee = 6;
      const dx = a.x - cx, dy = a.y - cy, d = Math.hypot(dx, dy) || 1;
      a.tx = a.x + dx / d * 8; a.ty = a.y + dy / d * 8;
    }
  }
  for (const a of life.animals) if (a.flee) a.flee -= dt;
  life.animals = life.animals.filter(a => !(a.flee <= 0));
  // Ziegen: zwei an jedem fertigen Ziegengehege
  const pens = state.buildings.filter(b => b.type === 'ziegengehege' && !b.build);
  const goats = life.animals.filter(a => a.kind === 'ziege');
  if (goats.length < pens.length * 2) {
    const pen = pens[Math.floor(goats.length / 2)];
    const s = BUILDINGS.ziegengehege.size;
    const p = randomFreeTile(pen.x + s / 2, pen.y + s / 2, s / 2 + 2);
    if (p) spawnAnimal('ziege', p[0], p[1], { home: [pen.x + s / 2, pen.y + s / 2], pen: pen });
  }
  life.animals = life.animals.filter(a => a.kind !== 'ziege' || state.buildings.includes(a.pen));

  const leader = life.animals.find(a => a.kind === 'mammut' && a.herd === 0);
  for (const a of life.animals) {
    const speed = a.flee ? 1.6 : a.kind === 'mammut' ? 0.35 : a.kind === 'hirsch' ? 0.9 : 0.5;
    const dx = a.tx - a.x, dy = a.ty - a.y, dist = Math.hypot(dx, dy);
    if (dist < 0.05) {
      a.wait -= dt;
      if (a.wait > 0 || a.flee || (a.kind === 'mammut' && hunt)) continue;   // während der Jagd bleibt die Herde stehen
      // neues Ziel: Mammuts folgen der Leitkuh, die anderen bleiben in der Nähe ihres Zuhauses
      let p;
      if (a.kind === 'mammut' && leader && a !== leader) p = randomFreeTile(leader.tx, leader.ty, 1.5);
      else p = randomFreeTile(a.home[0], a.home[1], a.kind === 'ziege' ? 2.5 : a.kind === 'mammut' ? 7 : 5);
      if (p) { a.tx = p[0] + 0.5; a.ty = p[1] + 0.5; }
      a.wait = a.kind === 'mammut' ? 3 + lifeRandom() * 5 : 2 + lifeRandom() * 6;
      continue;
    }
    const step = Math.min(dist, speed * dt);
    const nx = a.x + dx / dist * step, ny = a.y + dy / dist * step;
    if (!a.flee && !animalFree(Math.floor(nx), Math.floor(ny))) { a.tx = a.x; a.ty = a.y; continue; }   // Hindernis: stehen bleiben
    a.x = nx; a.y = ny;
    const sx = dx - dy;
    if (Math.abs(sx) > 0.01) a.face = sx > 0 ? -1 : 1;
  }
}

// ---------------------------------------------------------------------
// Mammutjagd: Jäger laufen vom Jagdlager zur Herde und tragen die Beute zurück
// ---------------------------------------------------------------------

// 0 = losgezogen, 0,5 = bei der Herde, 1 = zurück
function huntPhase() {
  return state.hunt ? Math.min(1, Math.max(0, 1 - state.hunt.left / CONFIG.hunt.seconds)) : 0;
}

function hunterObjects(inView, t) {
  const h = state.hunt;
  if (!h) return [];
  const phase = huntPhase(), back = phase >= 0.5;
  const k = back ? 2 - phase * 2 : phase * 2;     // 0 = am Lager, 1 = bei der Herde
  const out = [];
  for (let i = 0; i < 3; i++) {
    const ox = (i - 1) * 0.55, oy = (i % 2) * 0.5;   // nebeneinander, leicht versetzt
    const x = h.cx + (h.x - h.cx) * k + ox, y = h.cy + (h.y - h.cy) * k + oy;
    if (!inView(x, y)) continue;
    const dx = (h.x - h.cx) * (back ? -1 : 1), dy = (h.y - h.cy) * (back ? -1 : 1);
    const face = dx - dy > 0 ? -1 : 1;
    const step = t * 10 + i * 2;
    out.push({ d: x + y - 0.5, kind: 'leben', draw: () => {
      drawCreature('mensch-mann', x, y, 32, face, Math.abs(Math.sin(step)) * 1.2 * cam.zoom, '🧍', step);
      if (back) {   // Beute auf dem Rückweg
        const p = tileToScreen(x, y), z = cam.zoom, img = images['ware-nahrung'];
        if (img) ctx.drawImage(img, p.x - 8 * z, p.y - 44 * z, 16 * z, 16 * z);
        else { ctx.font = `${Math.round(14 * z)}px sans-serif`; ctx.textAlign = 'center'; ctx.fillText('🍖', p.x, p.y - 32 * z); }
      }
    } });
  }
  return out;
}

// Liegt unter dem Finger ein Mammut? Gibt das Tier zurück oder null.
function mammothAtScreen(sx, sy) {
  const z = cam.zoom;
  for (const a of life.animals) {
    if (a.kind !== 'mammut' || a.flee) continue;
    const p = tileToScreen(a.x, a.y);
    if (Math.abs(sx - p.x) <= 34 * z && sy <= p.y + 8 * z && sy >= p.y - 60 * z) return a;
  }
  return null;
}

// ---------------------------------------------------------------------
// Arbeitende Menschen: laufen vom Gebäude zum Baum/Felsen/Busch, arbeiten dort und tragen die Beute zurück
// ---------------------------------------------------------------------

// Wer wohin geht: Gelände-Ziel, Werkzeug, was zurückgetragen wird, Figur, Teilchen beim Arbeiten
const WORK = {
  holzsammler:       { target: 'wald', tool: 'axt',   carry: 'ware-holz',    img: 'mensch-mann', chips: '#a8743f', swing: 'hack' },
  steinsammler:      { target: 'fels', tool: 'hacke', carry: 'ware-stein',   img: 'mensch-mann', chips: '#b9b4a8', swing: 'hack' },
  sammlerin:         { target: 'wald', tool: null,    carry: 'ware-nahrung', img: 'mensch-frau', chips: '#d8344a', swing: 'pick' },
  jaegerlager:       { target: 'wald', tool: null,    carry: 'ware-nahrung', img: 'mensch-mann', chips: null,      swing: 'look', far: true },
  mammutjaegerlager: { target: 'wald', tool: null,    carry: 'ware-nahrung', img: 'mensch-mann', chips: null,      swing: 'look', far: true },
  // Teil 2: am Ufer und im Einbaum fischen, an der Felswand malen, vor dem Haus arbeiten (target 'self')
  fischerplatz:      { target: 'wasser', tool: null,  carry: 'ware-nahrung', img: 'mensch-mann', chips: '#cfe9f7', swing: 'spear', boat: true },
  hoehlenmaler:      { target: 'fels',  tool: null,   carry: 'ware-wissen',  img: 'mensch-mann', chips: null,      swing: 'paint' },
  tongrube:          { target: 'wasser', tool: 'hacke', carry: 'ware-ton',   img: 'mensch-mann', chips: '#9a5a32', swing: 'hack' },
  fellmacherin:      { target: 'self',  tool: null,   carry: null, img: 'mensch-frau', chips: null,      swing: 'scrape', thing: 'ware-felle' },
  steinschlaeger:    { target: 'self',  tool: null,   carry: null, img: 'mensch-mann', chips: '#b9b4a8', swing: 'knap',   thing: 'ware-stein' },
  toepferei:         { target: 'self',  tool: null,   carry: null, img: 'mensch-frau', chips: null,      swing: 'pot',    thing: 'ware-toepferwaren' },
};
const WORK_SECONDS = 7, WORK_WALK = 0.75;   // so lange wird gearbeitet, so schnell gelaufen (Felder je Sekunde)

life.workers = [];
life.workTimer = 0;

// Nächstes passendes Geländefeld in der Nähe eines Gebäudes, dazu ein freier Standplatz daneben
function workSpot(b, kind, far, k = 0) {
  const s = BUILDINGS[b.type].size, cx = b.x + s / 2, cy = b.y + s / 2;
  if (kind === 'self') {   // arbeitet direkt vor dem Haus, das Werkstück liegt daneben
    const sx = b.x + s + 0.55, sy = b.y + s / 2 + (k ? 0.55 : -0.55);
    return { tx: sx + 0.45, ty: sy + 0.1, sx, sy };
  }
  const id = TERRAIN[kind].id, max = far ? 10 : 7;
  let best = null, bestD = Infinity;
  for (let y = Math.floor(cy - max); y <= cy + max; y++)
    for (let x = Math.floor(cx - max); x <= cx + max; x++) {
      if (!inMap(x, y) || terrain[y * N + x] !== id) continue;
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) + hash(x + b.x + k * 13, y - b.y + k * 7) * (far ? 4 : 2.5);   // nicht alle zum selben Baum
      if (d >= bestD) continue;
      for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
        if (!animalFree(x + dx, y + dy) && !isPathAt(x + dx, y + dy)) continue;
        best = { tx: x + 0.5, ty: y + 0.5, sx: x + 0.5 + dx * 0.7, sy: y + 0.5 + dy * 0.7 }; bestD = d; break;
      }
    }
  return best;
}

function updateWorkers(dt) {
  life.workTimer -= dt;
  if (life.workTimer <= 0) {   // einmal pro Sekunde: wer soll draußen arbeiten?
    life.workTimer = 1;
    const want = [];
    state.buildings.forEach((b, i) => {
      const w = WORK[b.type];
      if (!w || b.build || b.paused || !isConnected(i)) return;
      const n = Math.min(2, stats.staff[i] || 0);
      for (let k = 0; k < n; k++) want.push({ b, k });
    });
    life.workers = life.workers.filter(w => want.some(o => o.b === w.b && o.k === w.k));
    for (const o of want) {
      if (life.workers.some(w => w.b === o.b && w.k === o.k)) continue;
      const s = BUILDINGS[o.b.type].size;
      const home = { x: o.b.x + s + 0.3, y: o.b.y + s / 2 + (o.k ? 0.5 : -0.5) };   // vor dem Haus (rechts unten im Bild)
      life.workers.push({ b: o.b, k: o.k, kind: WORK[o.b.type], home, x: home.x, y: home.y, phase: 'rest', t: 1 + o.k * 2.5 + lifeRandom() * 2, face: 1, ph: lifeRandom() * 9 });
    }
  }
  for (const w of life.workers) {
    w.t -= dt;
    if (w.phase === 'rest') {
      if (w.t > 0) continue;
      const spot = workSpot(w.b, w.kind.target, w.kind.far, w.k);
      if (!spot) { w.t = 5; continue; }
      if (w.kind.boat && w.k === 1) {   // mit dem Einbaum ein Stück hinaus aufs Wasser
        const dx = (spot.tx - spot.sx) / 0.7, dy = (spot.ty - spot.sy) / 0.7;
        for (const n of [3, 2, 1]) {
          const x = Math.floor(spot.tx + dx * n), y = Math.floor(spot.ty + dy * n);
          if (inMap(x, y) && terrain[y * N + x] === TERRAIN.wasser.id && buildingAt(x, y) < 0) { spot.tx = x + 0.5; spot.ty = y + 0.5; break; }
        }
      }
      Object.assign(w, spot, { phase: 'go' });
    } else if (w.phase === 'go' || w.phase === 'back') {
      const [gx, gy] = w.phase === 'go' ? [w.sx, w.sy] : [w.home.x, w.home.y];
      const dx = gx - w.x, dy = gy - w.y, d = Math.hypot(dx, dy);
      if (d < 0.05) {
        if (w.phase === 'go') { w.phase = 'work'; w.t = WORK_SECONDS * (0.8 + lifeRandom() * 0.4); }
        else { w.phase = 'rest'; w.t = 3 + lifeRandom() * 3; }
        continue;
      }
      const step = Math.min(d, WORK_WALK * dt);
      w.x += dx / d * step; w.y += dy / d * step;
      if (Math.abs(dx - dy) > 0.01) w.face = dx - dy > 0 ? -1 : 1;
    } else if (w.phase === 'work') {
      if (w.kind.boat && w.k === 1) {   // im Einbaum: langsam auf dem Wasser hin und her treiben
        w.bt = (w.bt || 0) + dt;
        const r = Math.min(1, w.bt / 4);   // erst vom Ufer aufs Wasser hinaus paddeln
        const ox = Math.sin(w.bt * 0.35 + w.ph) * 0.35, oy = Math.cos(w.bt * 0.27 + w.ph) * 0.35;
        const bx = w.tx + ox, by = w.ty + oy;
        w.face = Math.cos(w.bt * 0.35 + w.ph) * 0.35 + Math.sin(w.bt * 0.27 + w.ph) * 0.27 > 0 ? -1 : 1;   // in Fahrtrichtung schauen
        w.x = w.sx + (bx - w.sx) * r; w.y = w.sy + (by - w.sy) * r;
        if (w.t <= 0) { w.bt = 0; w.x = w.sx; w.y = w.sy; w.phase = 'back'; }   // am Ufer wieder aussteigen
        continue;
      }
      const sxd = w.tx - w.x - (w.ty - w.y);
      if (Math.abs(sxd) > 0.01) w.face = sxd > 0 ? -1 : 1;   // zum Baum/Felsen schauen
      if (w.t <= 0) w.phase = 'back';
    }
  }
}

function workerObjects(inView, t) {
  const out = [];
  for (const w of life.workers) {
    if (w.phase === 'rest' || !inView(w.x, w.y)) continue;
    out.push({ d: w.x + w.y - 0.5, kind: 'leben', draw: () => drawWorker(w, t) });
  }
  return out;
}

function drawWorker(w, t) {
  const z = cam.zoom, walking = w.phase !== 'work', step = t * 10 + w.ph;
  if (!walking && w.kind.boat && w.k === 1 && images.einbaum) return drawBoat(w, t);
  // Werkstück vor dem Haus (Fell, Steinknolle, Topf) – liegt hinter der Figur
  if (!walking && w.kind.thing && images[w.kind.thing]) {
    const q = tileToScreen(w.tx, w.ty), s = 15 * z;
    const grow = w.kind.swing === 'pot' ? 0.6 + 0.4 * Math.min(1, (WORK_SECONDS - w.t) / WORK_SECONDS) : 1;   // der Topf wächst
    ctx.drawImage(images[w.kind.thing], q.x - s * grow / 2, q.y - s * grow * 0.8, s * grow, s * grow);
  }
  let bob = walking ? Math.abs(Math.sin(step)) * 1.2 * z : 0;
  const swing = w.kind.swing;
  if (!walking && swing === 'pick') bob = -Math.max(0, Math.sin(t * 3 + w.ph)) * 3 * z;   // bückt sich zum Busch
  drawCreature(w.kind.img, w.x, w.y, 32, w.face, bob, '🧍', walking ? step : null);
  const p = tileToScreen(w.x, w.y);
  // Werkzeug schwingen (hoch – runter – Schlag)
  if (!walking && w.kind.tool && images[w.kind.tool]) {
    const cyc = (t * 1.6 + w.ph) % 1;
    const ang = cyc < 0.7 ? -1.6 * (cyc / 0.7) : -1.6 + 2.2 * ((cyc - 0.7) / 0.3);   // langsam ausholen, schnell zuschlagen
    const s = 24 * z;
    ctx.save();
    ctx.translate(p.x - 5 * z * w.face, p.y - 18 * z);
    ctx.scale(-w.face, 1);
    ctx.rotate(ang);
    ctx.drawImage(images[w.kind.tool], -s * 0.2, -s, s, s);
    ctx.restore();
    // Späne bzw. Splitter beim Aufschlag
    if (cyc > 0.85 && w.kind.chips) {
      const q = (cyc - 0.85) / 0.15;
      const hx = tileToScreen(w.tx, w.ty);
      ctx.fillStyle = w.kind.chips;
      for (let i = 0; i < 4; i++) {
        const a = i * 1.7 + w.ph;
        ctx.globalAlpha = 1 - q;
        ctx.fillRect(hx.x + Math.cos(a) * 9 * q * z - 1.5, hx.y - 12 * z - Math.abs(Math.sin(a)) * 10 * q * z, 3 * z, 3 * z);
      }
      ctx.globalAlpha = 1;
    }
  }
  const hand = { x: p.x - 8 * z * w.face, y: p.y - 15 * z };
  if (!walking && swing === 'spear') {   // mit dem Speer ins Wasser stechen, es spritzt
    const cyc = (t * 0.8 + w.ph) % 1, thrust = cyc > 0.75 ? Math.sin((cyc - 0.75) / 0.25 * Math.PI) : 0;
    const q = tileToScreen(w.tx, w.ty);
    const ex = hand.x + (q.x - hand.x) * (0.55 + 0.3 * thrust), ey = hand.y + (q.y - 4 * z - hand.y) * (0.55 + 0.3 * thrust);
    ctx.strokeStyle = '#6b4a2a'; ctx.lineWidth = 1.8 * z; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(hand.x - (ex - hand.x) * 0.5, hand.y - 6 * z - (ey - hand.y) * 0.5); ctx.lineTo(ex, ey); ctx.stroke();
    if (thrust > 0.6) splash(ex, ey + 2 * z, z, thrust);
  }
  if (!walking && swing === 'paint') {   // Pinsel an die Felswand, bunte Tupfen erscheinen nach und nach
    const q = tileToScreen(w.tx, w.ty), done = Math.min(1, (WORK_SECONDS - w.t) / WORK_SECONDS);
    const cols = ['#b5462a', '#e0a040', '#3a2a1a', '#f2e6c8'];
    for (let i = 0; i < Math.floor(done * 7); i++) {
      ctx.fillStyle = cols[i % 4];
      ctx.beginPath(); ctx.arc(q.x + (hash(i, w.k + 3) - 0.5) * 16 * z, q.y - 10 * z - hash(w.k, i + 5) * 12 * z, 1.8 * z, 0, 7); ctx.fill();
    }
    const dab = Math.sin(t * 5 + w.ph);
    ctx.strokeStyle = '#6b4a2a'; ctx.lineWidth = 1.5 * z; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(hand.x, hand.y); ctx.lineTo(hand.x - (6 + dab * 2) * z * w.face, hand.y - (5 + dab * 3) * z); ctx.stroke();
  }
  if (!walking && (swing === 'scrape' || swing === 'knap' || swing === 'pot')) {   // Hände über dem Werkstück
    const q = tileToScreen(w.tx, w.ty);
    const m = swing === 'knap' ? Math.abs(Math.sin(t * 4 + w.ph)) : (Math.sin(t * 3 + w.ph) + 1) / 2;
    const hx = q.x + (swing === 'scrape' ? (m - 0.5) * 10 * z : 0), hy = q.y - 8 * z - (swing === 'knap' ? m * 7 * z : 2 * z);
    ctx.fillStyle = swing === 'knap' ? '#8a8478' : '#c99a6e';
    ctx.beginPath(); ctx.arc(hx, hy, (swing === 'knap' ? 2.6 : 2) * z, 0, 7); ctx.fill();
    if (swing === 'knap' && m < 0.15) {   // Splitter beim Schlag
      ctx.fillStyle = w.kind.chips;
      for (let i = 0; i < 3; i++) ctx.fillRect(hx + (i - 1) * 4 * z, hy - (2 + i) * z, 2 * z, 2 * z);
    }
  }
  // Beeren pflücken: ab und zu hüpft eine Beere in den Korb
  if (!walking && swing === 'pick') {
    const q = (t * 0.9 + w.ph) % 1;
    ctx.fillStyle = '#d8344a';
    ctx.beginPath(); ctx.arc(p.x - 8 * z * w.face, p.y - 14 * z - Math.sin(q * Math.PI) * 8 * z, 2.2 * z, 0, 7); ctx.fill();
  }
  // Beute auf dem Rückweg tragen
  if (w.phase === 'back' && w.kind.carry && images[w.kind.carry]) {
    const s = 14 * z;
    ctx.drawImage(images[w.kind.carry], p.x - s / 2, p.y - 32 * z - s * 0.6 - bob, s, s);
  }
}

// Kleine Wasserspritzer (Speer, Paddel)
function splash(x, y, z, k) {
  ctx.fillStyle = 'rgba(225,244,255,0.9)';
  for (let i = 0; i < 4; i++) {
    const a = -0.4 - i * 0.75;
    ctx.beginPath(); ctx.arc(x + Math.cos(a) * 5 * k * z, y + Math.sin(a) * 5 * k * z, 1.4 * z, 0, 7); ctx.fill();
  }
}

// Fischer im Einbaum: Boot schaukelt, Figur sitzt (nur Oberkörper), paddelt abwechselnd links und rechts
function drawBoat(w, t) {
  const z = cam.zoom, p = tileToScreen(w.x, w.y), img = images.einbaum;
  const rock = Math.sin(t * 1.8 + w.ph) * 1.2 * z;
  const bw = 40 * z, bh = bw * img.height / img.width;
  ctx.fillStyle = 'rgba(20,60,90,0.18)';
  ctx.beginPath(); ctx.ellipse(p.x, p.y + 1 * z, bw * 0.48, bh * 0.28, 0, 0, 7); ctx.fill();
  const man = images['mensch-mann'];
  ctx.save();
  ctx.translate(p.x, p.y + rock * 0.4);
  if (w.face < 0) ctx.scale(-1, 1);
  if (man) {   // Oberkörper sitzt im Boot
    const h = 30 * z, mw = h * man.width / man.height, cut = 0.55;
    ctx.drawImage(man, 0, 0, man.width, man.height * cut, -mw / 2, -h * cut - bh * 0.25, mw, h * cut);
  }
  ctx.drawImage(img, -bw / 2, -bh * 0.75, bw, bh);
  // Paddel
  const pa = Math.sin(t * 2.2 + w.ph);
  ctx.strokeStyle = '#7a5532'; ctx.lineWidth = 1.8 * z; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-2 * z + pa * 4 * z, -bh * 0.25 - 12 * z); ctx.lineTo(6 * z + pa * 9 * z, bh * 0.1); ctx.stroke();
  ctx.restore();
  if (pa > 0.9) splash(p.x + (6 + pa * 9) * z * w.face, p.y + bh * 0.1, z, 0.8);
}

// ---------------------------------------------------------------------
// Treffpunkte: Am Feuer sitzen die Leute zusammen (abends tanzen sie), am Ahnenplatz und Steinkreis beten sie
// ---------------------------------------------------------------------

const GATHER = { lagerfeuer: 'feuer', feuerplatz: 'feuer', ahnenplatz: 'beten', steinkreis: 'beten' };
life.visitors = [];
life.visitTimer = 0;

function gatherWant(b) {
  const evening = darkness() > 0.3 || timeOfDay().name === 'Abend';
  const most = GATHER[b.type] === 'feuer' ? (evening ? 7 : 3) : (evening ? 2 : 4);
  return Math.max(0, Math.min(most, Math.floor(state.pop / 3)));
}

function updateVisitors(dt) {
  life.visitTimer -= dt;
  if (life.visitTimer <= 0) {
    life.visitTimer = 1.5;
    state.buildings.forEach((b, i) => {
      if (!GATHER[b.type] || b.build || !isConnected(i)) return;
      const here = life.visitors.filter(v => v.b === b && v.phase !== 'leave');
      if (here.length > gatherWant(b)) { here[0].phase = 'leave'; return; }
      if (here.length >= gatherWant(b) || lifeRandom() < 0.4) return;
      const used = new Set(here.map(v => v.slot));
      let slot = 0; while (used.has(slot)) slot++;
      const s = BUILDINGS[b.type].size, cx = b.x + s / 2, cy = b.y + s / 2;
      const a = slot * 2.4 + hash(b.x, b.y) * 6, r = GATHER[b.type] === 'feuer' ? s * 0.34 + 0.1 : s / 2 + 0.3;   // am Feuer auf die Bänke
      const spot = { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r * 0.9 };
      const from = { x: cx + Math.cos(a) * (r + 3), y: cy + Math.sin(a) * (r + 3) };
      life.visitors.push({ b, slot, kind: GATHER[b.type], x: from.x, y: from.y, from, spot, cx, cy, phase: 'go', t: 25 + lifeRandom() * 35,
        img: lifeRandom() < 0.5 ? 'mensch-mann' : 'mensch-frau', face: 1, ph: lifeRandom() * 9, alpha: 0 });
    });
  }
  for (const v of life.visitors) {
    const target = v.phase === 'leave' ? v.from : v.spot;
    const dx = target.x - v.x, dy = target.y - v.y, d = Math.hypot(dx, dy);
    if (v.phase === 'stay') { v.t -= dt; if (v.t <= 0) v.phase = 'leave'; }
    else if (d < 0.04) { if (v.phase === 'go') v.phase = 'stay'; else v.gone = true; }
    else {
      const step = Math.min(d, 0.7 * dt);
      v.x += dx / d * step; v.y += dy / d * step;
      if (Math.abs(dx - dy) > 0.01) v.face = dx - dy > 0 ? -1 : 1;
    }
    v.alpha = v.phase === 'leave' ? Math.min(1, d / 1.5) : Math.min(1, v.alpha + dt * 2);
    if (v.phase === 'stay') { const sx = v.cx - v.x - (v.cy - v.y); v.face = sx > 0 ? -1 : 1; }   // zur Mitte schauen
  }
  life.visitors = life.visitors.filter(v => !v.gone && state.buildings.includes(v.b));
}

function visitorObjects(inView, t) {
  return life.visitors.filter(v => inView(v.x, v.y)).map(v => {
    // Auf der Platte des Gebäudes: nach dem Gebäude zeichnen, sonst verdeckt es sie
    const b = v.b, s = BUILDINGS[b.type].size;
    const onPlate = v.x > b.x && v.x < b.x + s && v.y > b.y && v.y < b.y + s;
    return { d: onPlate ? b.x + b.y + s + 0.01 + (v.x + v.y) * 1e-4 : v.x + v.y - 0.5, kind: 'leben', draw: () => drawVisitor(v, t) };
  });
}

function drawVisitor(v, t) {
  ctx.globalAlpha = v.alpha;
  const z = cam.zoom, step = t * 9 + v.ph;
  if (v.phase !== 'stay') drawCreature(v.img, v.x, v.y, 32, v.face, Math.abs(Math.sin(step)) * 1.2 * z, '🧍', step);
  else if (v.kind === 'feuer' && darkness() > 0.3) {   // abends: Tanz ums Feuer – hüpfen und drehen
    const hop = Math.abs(Math.sin(t * 4 + v.ph)) * 6 * z;
    drawCreature(v.img, v.x, v.y, 32, Math.sin(t * 1.3 + v.ph) > 0 ? 1 : -1, hop, '💃', t * 8 + v.ph);
  } else if (v.kind === 'feuer') drawSitting(v, t);
  else {   // beten: verbeugen sich langsam
    const p = tileToScreen(v.x, v.y), img = images[v.img];
    if (!img) { drawCreature(v.img, v.x, v.y, 32, v.face, 0, '🙏'); ctx.globalAlpha = 1; return; }
    const h = 32 * z, w = h * img.width / img.height, bow = Math.max(0, Math.sin(t * 0.8 + v.ph)) * 0.35;
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath(); ctx.ellipse(p.x, p.y, h * 0.32, h * 0.1, 0, 0, 7); ctx.fill();
    ctx.save(); ctx.translate(p.x, p.y); if (v.face < 0) ctx.scale(-1, 1);
    ctx.transform(1, 0, bow, 1 - bow * 0.25, 0, 0);
    ctx.drawImage(img, -w / 2, -h, w, h);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

// Am Feuer sitzen: nur der Oberkörper über dem Boden, die Hände ab und zu zum Feuer
function drawSitting(v, t) {
  const p = tileToScreen(v.x, v.y), img = images[v.img], z = cam.zoom;
  if (!img) { drawCreature(v.img, v.x, v.y, 26, v.face, 0, '🧍'); return; }
  const h = 32 * z, w = h * img.width / img.height, cut = LEGS[v.img] || 0.6;
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath(); ctx.ellipse(p.x, p.y, h * 0.36, h * 0.11, 0, 0, 7); ctx.fill();
  ctx.save(); ctx.translate(p.x, p.y + Math.sin(t * 1.5 + v.ph) * 0.6 * z); if (v.face < 0) ctx.scale(-1, 1);
  ctx.drawImage(img, 0, 0, img.width, img.height * cut, -w / 2, -h * cut - 1 * z, w, h * cut);
  // gekreuzte Beine als Fell-Polster
  ctx.fillStyle = '#7a5532';
  ctx.beginPath(); ctx.ellipse(0, -1 * z, w * 0.42, 3.2 * z, 0, 0, 7); ctx.fill();
  ctx.restore();
}

// Wo beginnen die Beine (Anteil der Bildhöhe von oben)? Für die Laufbewegung.
const LEGS = { 'mensch-mann': 0.6, 'mensch-frau': 0.62, hirsch: 0.58, ziege: 0.6, mammut: 0.7 };

// Figur mit Schatten zeichnen. Bilder schauen nach links; face = -1 spiegelt nach rechts.
// step = Laufphase (Bogenmaß) oder null im Stehen: Dann schwingen vordere und hintere Beine gegeneinander.
function drawCreature(name, x, y, height, face, bob, fallback, step = null) {
  const p = tileToScreen(x, y);
  const z = cam.zoom;
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath(); ctx.ellipse(p.x, p.y, height * 0.32 * z, height * 0.1 * z, 0, 0, 7); ctx.fill();
  const img = images[name];
  if (!img) { ctx.font = `${Math.round(height * z)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(fallback, p.x, p.y - bob); return; }
  const h = height * z, w = h * img.width / img.height;
  ctx.save();
  ctx.translate(p.x, p.y - bob);
  if (face < 0) ctx.scale(-1, 1);
  const legs = LEGS[name];
  if (step === null || !legs) {
    ctx.drawImage(img, -w / 2, -h, w, h);
  } else {
    const iw = img.width, ih = img.height, cut = Math.round(ih * legs);
    const top = -h + h * cut / ih;            // Hüfthöhe auf dem Bildschirm
    const swing = Math.sin(step) * 0.38;      // Schräglage der Beine
    // Oberkörper ruhig, dazu ein kleines Auf und Ab
    ctx.drawImage(img, 0, 0, iw, cut + 1, -w / 2, -h, w, h * (cut + 1) / ih);
    // vordere (links im Bild) und hintere Beinhälfte schwingen gegeneinander um die Hüfte
    for (const [sx0, sx1, dir] of [[0, 0.5, 1], [0.5, 1, -1]]) {
      ctx.save();
      ctx.translate(0, top);
      ctx.transform(1, 0, swing * dir, 1, 0, 0);
      ctx.drawImage(img, iw * sx0, cut, iw * (sx1 - sx0) + 1, ih - cut, -w / 2 + w * sx0, 0, w * (sx1 - sx0) + 1, h * (ih - cut) / ih);
      ctx.restore();
    }
  }
  ctx.restore();
}

// Gefällter Baum kippt um, abgetragener Felsen zerbröselt (das Feld ist schon frei, nur noch die Bewegung)
function addFelled(x, y, kind) {
  life.felled.push({ x, y, kind, k: 0, dir: hash(x + 9, y) < 0.5 ? -1 : 1 });
}

function felledObjects(dt) {
  for (const f of life.felled) f.k += dt / 0.9;
  life.felled = life.felled.filter(f => f.k < 1);
  return life.felled.map(f => ({ d: f.x + f.y + 1, kind: 'leben', draw: () => {
    const e = f.k * f.k;   // erst langsam, dann schneller
    drawTerrainObject(f.x, f.y, f.kind, { k: f.k, rot: f.dir * e * 1.45, alpha: f.k < 0.7 ? 1 : 1 - (f.k - 0.7) / 0.3 });
    // Staubwölkchen beim Aufschlag
    if (f.k > 0.55) {
      const p = tileToScreen(f.x + 0.5, f.y + 0.5), q = (f.k - 0.55) / 0.45;
      ctx.fillStyle = `rgba(200,180,140,${0.5 * (1 - q)})`;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath(); ctx.arc(p.x + (i - 2) * 9 * cam.zoom * (0.5 + q), p.y - q * 8 * cam.zoom, (3 + q * 6) * cam.zoom, 0, 7); ctx.fill();
      }
    }
  } }));
}

// Alles, was auf dem Boden läuft, für die Tiefensortierung in drawScene
function lifeObjects(range) {
  const out = [];
  const inView = (x, y) => x >= range.x0 - 1 && x <= range.x1 + 1 && y >= range.y0 - 1 && y <= range.y1 + 1;
  const t = frameTime;
  out.push(...felledObjects(lifeDt));
  out.push(...hunterObjects(inView, t));
  out.push(...workerObjects(inView, t));
  out.push(...visitorObjects(inView, t));
  for (const w of life.walkers) {
    if (!inView(w.x, w.y)) continue;
    const moving = w.wait <= 0;
    out.push({ d: w.x + w.y - 0.5, kind: 'leben', draw: () =>
      drawCreature(w.img, w.x, w.y, 32, w.face, moving ? Math.abs(Math.sin(t * 9 + w.ph)) * 1.2 * cam.zoom : 0, '🧍', moving ? t * 9 + w.ph : null) });
  }
  for (const a of life.animals) {
    if (!inView(a.x, a.y)) continue;
    const moving = Math.hypot(a.tx - a.x, a.ty - a.y) > 0.05;
    const size = a.kind === 'mammut' ? 56 : a.kind === 'hirsch' ? 32 : 22;
    const pace = a.kind === 'mammut' ? 4 : a.kind === 'hirsch' ? 9 : 7;
    const bob = moving ? Math.abs(Math.sin(t * pace + a.ph)) * 1.2 * cam.zoom : 0;
    const icon = a.kind === 'mammut' ? '🦣' : a.kind === 'hirsch' ? '🦌' : '🐐';
    out.push({ d: a.x + a.y - 0.5, kind: 'leben', draw: () => drawCreature(a.kind, a.x, a.y, size, a.face, bob, icon, moving ? t * pace + a.ph : null) });
  }
  return out;
}

// ---------------------------------------------------------------------
// Darüber: Fische, Vögel, Schmetterlinge
// ---------------------------------------------------------------------

function updateSky(dt, range) {
  const z = cam.zoom;
  // Vögel: ab und zu fliegt ein kleiner Schwarm quer über das Bild
  life.birdTimer -= dt;
  if (life.birdTimer <= 0) {
    life.birdTimer = 10 + lifeRandom() * 14;
    const fromLeft = lifeRandom() < 0.5;
    const y0 = viewH * (0.1 + lifeRandom() * 0.5);
    const n = 3 + Math.floor(lifeRandom() * 4);
    for (let i = 0; i < n; i++) {
      life.birds.push({ x: fromLeft ? -30 - i * 18 : viewW + 30 + i * 18, y: y0 + (i % 2 ? 12 : -4) * (i * 0.6), v: (fromLeft ? 1 : -1) * (70 + lifeRandom() * 15), ph: lifeRandom() * 6 });
    }
  }
  for (const b of life.birds) { b.x += b.v * dt; b.y += Math.sin(frameTime * 0.8 + b.ph) * 4 * dt; }
  life.birds = life.birds.filter(b => b.x > -80 && b.x < viewW + 80);
  // Fische: auf einem sichtbaren Wasserfeld springt ab und zu einer
  life.fishTimer -= dt;
  if (life.fishTimer <= 0) {
    life.fishTimer = 1.5 + lifeRandom() * 2.5;
    for (let i = 0; i < 12; i++) {
      const x = range.x0 + Math.floor(lifeRandom() * (range.x1 - range.x0 + 1)), y = range.y0 + Math.floor(lifeRandom() * (range.y1 - range.y0 + 1));
      if (inMap(x, y) && terrain[y * N + x] === TERRAIN.wasser.id) { life.jumps.push({ x: x + 0.5, y: y + 0.5, k: 0, face: lifeRandom() < 0.5 ? 1 : -1 }); break; }
    }
  }
  for (const j of life.jumps) j.k += dt / 1.1;
  life.jumps = life.jumps.filter(j => j.k < 1.6);
  // Schmetterlinge: über Blumen im sichtbaren Bereich
  if (life.butterflies.length < 6) {
    const x = range.x0 + Math.floor(lifeRandom() * (range.x1 - range.x0 + 1)), y = range.y0 + Math.floor(lifeRandom() * (range.y1 - range.y0 + 1));
    if (inMap(x, y) && terrain[y * N + x] === TERRAIN.gras.id && hash(x, y + 3) > 0.92 && !occ[y * N + x]) {
      const colors = ['#ffd84a', '#ff8ac0', '#8ecbff', '#ffffff', '#ffa94d'];
      life.butterflies.push({ x: x + 0.5, y: y + 0.5, ph: lifeRandom() * 9, c: colors[Math.floor(lifeRandom() * colors.length)], life: 20 + lifeRandom() * 20 });
    }
  }
  for (const f of life.butterflies) f.life -= dt;
  life.butterflies = life.butterflies.filter(f => f.life > 0 && f.x >= range.x0 - 3 && f.x <= range.x1 + 3 && f.y >= range.y0 - 3 && f.y <= range.y1 + 3);
  return z;
}

function drawSky() {
  const z = cam.zoom, t = frameTime;
  // springende Fische mit Wasserring
  for (const j of life.jumps) {
    const p = tileToScreen(j.x, j.y);
    if (j.k < 1) {
      const h = Math.sin(j.k * Math.PI) * 16 * z;
      const fx = p.x + (j.k - 0.5) * 14 * z * j.face;
      ctx.save();
      ctx.translate(fx, p.y - h);
      ctx.rotate((j.k - 0.5) * 2.2 * j.face);
      ctx.fillStyle = '#ff9f43';
      ctx.beginPath(); ctx.ellipse(0, 0, 5 * z, 2.2 * z, 0, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-4.5 * z * j.face, 0); ctx.lineTo(-8 * z * j.face, -2.5 * z); ctx.lineTo(-8 * z * j.face, 2.5 * z); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    for (const at of [0.05, 0.95]) {   // Ring beim Ein- und Austauchen
      const q = (j.k - at) / 0.6;
      if (q < 0 || q > 1) continue;
      const rx = p.x + (at - 0.5) * 14 * z * j.face;
      ctx.strokeStyle = `rgba(255,255,255,${0.7 * (1 - q)})`;
      ctx.lineWidth = Math.max(1, 1.5 * z);
      ctx.beginPath(); ctx.ellipse(rx, p.y, (3 + q * 9) * z, (1.2 + q * 3.5) * z, 0, 0, 7); ctx.stroke();
    }
  }
  // Schmetterlinge
  for (const f of life.butterflies) {
    const p = tileToScreen(f.x + Math.sin(t * 0.7 + f.ph) * 0.6, f.y + Math.cos(t * 0.5 + f.ph * 2) * 0.6);
    const y = p.y - (10 + Math.sin(t * 2 + f.ph) * 4) * z;
    const flap = Math.abs(Math.sin(t * 14 + f.ph));
    ctx.fillStyle = f.c;
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.ellipse(p.x + s * 2.4 * z * flap, y, 2.6 * z * flap + 0.4, 2.2 * z, s * 0.4, 0, 7); ctx.fill();
    }
    ctx.fillStyle = '#4a3020';
    ctx.fillRect(p.x - 0.5, y - 2 * z, 1, 4 * z);
  }
  // Vögel (in Bildschirm-Koordinaten, damit sie über allem fliegen)
  ctx.strokeStyle = '#3d2a17';
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  for (const b of life.birds) {
    const flap = Math.sin(t * 9 + b.ph) * 4;
    ctx.beginPath();
    ctx.moveTo(b.x - 7, b.y - flap); ctx.lineTo(b.x - 2, b.y - 1); ctx.lineTo(b.x, b.y + 1);
    ctx.lineTo(b.x + 2, b.y - 1); ctx.lineTo(b.x + 7, b.y - flap);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
}

let lifeDt = 0;
function updateLife(dt, range) {
  lifeDt = dt;
  if (!state || !occ) return;
  updateWalkers(dt);
  updateWorkers(dt);
  updateVisitors(dt);
  updateAnimals(dt);
  updateSky(dt, range);
}

// Neues Spiel oder anderer Spielstand: alles Lebendige neu verteilen
function resetLife() {
  life.walkers = []; life.workers = []; life.animals = []; life.birds = []; life.jumps = []; life.butterflies = []; life.felled = []; life.visitors = [];
}

// Holzsammler hat genug Holz für einen Baum beisammen: der Baum kippt sichtbar um
on('treeFelled', t => { if ((typeof gameRunning === 'undefined' || gameRunning) && !offlineRunning) addFelled(t.x, t.y, 'wald'); });
