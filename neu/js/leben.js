// Epochia – Leben auf der Karte: Menschen laufen auf den Trampelpfaden, Hirsche und eine Mammutherde ziehen
// umher, Ziegen grasen am Gehege, Fische springen, Vögel fliegen vorbei, Schmetterlinge flattern über den Blumen.
// Reine Darstellung: nichts davon wird gespeichert. Nur die Mammutherde lässt sich antippen und jagen
// (die Jagd selbst steht in logik.js, hier laufen nur die Jäger und Mammuts).

const LIFE_NAMES = ['mensch-bergmann-korb', 'mensch-hacke-mitte', 'mensch-axt-mitte', 'mensch-tongrube-korb', 'mensch-mann', 'mensch-frau', 'mensch-mann-sitzend', 'mensch-frau-sitzend', 'mensch-mann-leer', 'mensch-frau-leer', 'mensch-jaeger', 'mensch-jaeger-beute', 'mensch-mann-stein', 'mensch-mann-betend', 'mensch-frau-betend', 'mensch-axt-oben', 'mensch-axt-unten', 'mensch-hacke-oben', 'mensch-hacke-unten', 'mensch-frau-pflueckt', 'mensch-frau-grabstock-oben', 'mensch-frau-grabstock-unten', 'mensch-frau-grabstock-tief', 'mensch-hirte', 'mensch-frau-pflanzt', 'mammut', 'hirsch', 'ziege', 'einbaum', 'fischer-boot-vorne', 'fischer-boot-hinten', 'fischer-speer-oben', 'fischer-speer-mitte', 'fischer-speer-unten'];

const life = { walkers: [], animals: [], birds: [], jumps: [], butterflies: [], felled: [], birdTimer: 4, fishTimer: 1, herdTimer: 0 };

function lifeRandom() { return Math.random(); }

// Menschenbilder je Lage (aus Canva). Grundbilder: mensch-mann trägt Holz auf der Schulter, mensch-frau einen
// Beerenkorb – darum gehen Spaziergänger und Leute auf dem Weg zur Arbeit mit leeren Händen (…-leer),
// und nur wer wirklich Holz bzw. Beeren heimbringt, trägt sie. Fehlt ein Bild noch, nimmt man das Grundbild.
const PERSON_LOOK = { leer: { 'mensch-mann': 'mensch-mann-leer', 'mensch-frau': 'mensch-frau-leer' } };
function personImg(base, look) {
  const n = PERSON_LOOK[look] && PERSON_LOOK[look][base];
  return n && images[n] ? n : base;
}

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
  const free = Math.max(0, Math.floor(state.pop - (stats.workers || 0)));   // wer arbeitet, ist nicht auf den Pfaden unterwegs
  const want = paths.length < 2 ? 0 : Math.min(14, Math.ceil(free / 2), paths.length);
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

// Tiere bleiben auf eigenem Land: Unter den Wolken sähe man sie nicht (und könnte die Mammuts nicht antippen)
function randomFreeTile(cx, cy, r, minDist = 0) {
  for (let i = 0; i < 40; i++) {
    const x = Math.round(cx + (lifeRandom() * 2 - 1) * r), y = Math.round(cy + (lifeRandom() * 2 - 1) * r);
    if (Math.hypot(x - cx, y - cy) >= minDist && animalFree(x, y) && isOwned(x, y)) return [x, y];
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
    // nur dort, wo die Jäger zu Fuß hinkommen (nicht auf der anderen Flussseite ohne Brücke)
    let p = null;
    for (let i = 0; i < 6 && !p; i++) { const q = randomFreeTile(cx, cy, 26, i < 3 ? 14 : 9); if (q && isOwned(q[0] + 1, q[1]) && isOwned(q[0], q[1] + 1) && walkRoute(cx, cy, q[0] + 0.5, q[1] + 0.5)) p = q; }
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
  const pens = state.buildings.filter(b => (b.type === 'ziegengehege' || b.type === 'viehhof') && !b.build);
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
    if (!animalFree(Math.floor(nx), Math.floor(ny)) || (!a.flee && !isOwned(Math.floor(nx), Math.floor(ny)))) { a.tx = a.x; a.ty = a.y; continue; }   // Hindernis (auch auf der Flucht, z. B. Wasser): stehen bleiben
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

// Weg der Jäger vom Lager zur Herde – um Wasser und Gebirge herum (einmal je Jagd berechnet).
// Gibt es keinen Fußweg, gehen sie wie früher geradeaus.
function huntRoute(h) {
  const id = `${h.cx},${h.cy},${h.x},${h.y}`;
  if (life.huntRoute && life.huntRoute.id === id) return life.huntRoute;
  const pts = [[h.cx, h.cy], ...(walkRoute(h.cx, h.cy, h.x, h.y) || [[h.x, h.y]])];
  const len = [0];
  for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  life.huntRoute = { id, pts, len };
  return life.huntRoute;
}

// Punkt auf dem Weg bei Anteil k (0 = Lager, 1 = Herde) und die Laufrichtung dort
function routePoint(r, k) {
  const total = r.len[r.len.length - 1], d = total * k;
  let i = 1;
  while (i < r.pts.length - 1 && r.len[i] < d) i++;
  const [ax, ay] = r.pts[i - 1], [bx, by] = r.pts[Math.min(i, r.pts.length - 1)];
  const seg = (r.len[i] - r.len[i - 1]) || 1, f = Math.min(1, Math.max(0, (d - r.len[i - 1]) / seg));
  return { x: ax + (bx - ax) * f, y: ay + (by - ay) * f, dx: bx - ax, dy: by - ay };
}

function hunterObjects(inView, t) {
  const h = state.hunt;
  if (!h) return [];
  const phase = huntPhase(), back = phase >= 0.5;
  const k = back ? 2 - phase * 2 : phase * 2;     // 0 = am Lager, 1 = bei der Herde
  const route = huntRoute(h);
  const out = [];
  for (let i = 0; i < 3; i++) {
    const p0 = routePoint(route, Math.max(0, k - i * 0.02));   // hintereinander auf dem Weg, leicht versetzt
    const ox = (i - 1) * 0.25, oy = (i % 2) * 0.2;
    const x = p0.x + ox, y = p0.y + oy;
    if (!inView(x, y)) continue;
    const dx = p0.dx * (back ? -1 : 1), dy = p0.dy * (back ? -1 : 1);
    const face = dx - dy > 0 ? -1 : 1;
    const step = t * 10 + i * 2;
    out.push({ d: x + y - 0.5, kind: 'leben', draw: () => {
      drawCreature(images['mensch-jaeger'] ? 'mensch-jaeger' : 'mensch-mann', x, y, 32, face, Math.abs(Math.sin(step)) * 1.2 * cam.zoom, '🧍', step);
      if (back) {   // Beute auf dem Rückweg
        const p = tileToScreen(x, y), z = cam.zoom, img = images['ware-nahrung'];
        if (img) ctx.drawImage(img, p.x - 8 * z, p.y - 44 * z, 16 * z, 16 * z);
        else { ctx.font = `${Math.round(14 * z)}px sans-serif`; ctx.textAlign = 'center'; ctx.fillText('🍖', p.x, p.y - 32 * z); }
      }
    } });
  }
  return out;
}

// Händler am Handelsplatz: eine Figur mit Ochsen (Bilder folgen) und eine Blase zum Antippen
function traderSpot() {
  if (!traderHere()) return null;
  const b = state.buildings[tradePosts()[0]], s = BUILDINGS[b.type].size;
  return { b, x: b.x + s + 0.5, y: b.y + s / 2, bx: b.x + s / 2, by: b.y + s / 2 };
}

function traderObjects(inView, t) {
  const p = traderSpot();
  if (!p) return [];
  const out = [];
  if (inView(p.x, p.y)) out.push({ d: p.x + p.y - 0.5, kind: 'leben', draw: () => {
    drawCreature(personImg('mensch-mann', 'leer'), p.x, p.y, 32, 1, 0, '🧍', null);
    const q = tileToScreen(p.x, p.y + 1), z = cam.zoom;
    ctx.font = `${Math.round(24 * z)}px sans-serif`; ctx.textAlign = 'center'; ctx.fillStyle = '#000';
    ctx.fillText('🐂', q.x, q.y);
  } });
  out.push({ d: p.bx + p.by + 100, kind: 'leben', draw: () => {
    const q = traderBubble(p), z = Math.max(cam.zoom, 1.4), r = (15 + Math.sin(t * 3) * 1.5) * z;   // auch weit herausgezoomt gut zu sehen
    ctx.fillStyle = 'rgba(255,250,235,0.95)'; ctx.strokeStyle = '#6b4a2b'; ctx.lineWidth = 2 * z;
    ctx.beginPath(); ctx.arc(q.x, q.y, r, 0, 7); ctx.fill(); ctx.stroke();
    ctx.font = `${Math.round(17 * z)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#000';
    ctx.fillText('🤝', q.x, q.y + z);
    ctx.textBaseline = 'alphabetic';
  } });
  return out;
}

function traderBubble(p) {
  const q = tileToScreen(p.bx, p.by), z = cam.zoom;
  return { x: q.x, y: q.y - 70 * z };
}

// Liegt unter dem Finger die Blase oder die Figur des Händlers?
function traderAtScreen(sx, sy) {
  const p = traderSpot();
  if (!p) return false;
  const z = cam.zoom, q = traderBubble(p), f = tileToScreen(p.x, p.y);
  return Math.hypot(sx - q.x, sy - q.y) <= 26 * Math.max(z, 1.4) || (Math.abs(sx - f.x) <= 22 * z && sy <= f.y + 8 * z && sy >= f.y - 40 * z);
}

// Liegt unter dem Finger ein Mammut? Gibt das Tier zurück oder null.
function mammothAtScreen(sx, sy) {
  const z = cam.zoom;
  for (const a of life.animals) {
    if (a.kind !== 'mammut' || a.flee || !isOwned(Math.floor(a.x), Math.floor(a.y))) continue;
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
  holzsammler:       { target: 'wald', tool: 'axt',   carry: 'ware-holz',    img: 'mensch-mann', chips: '#a8743f', swing: 'hack', carryLook: 'mensch-mann' },
  steinsammler:      { target: 'fels', tool: 'hacke', carry: 'ware-stein',   img: 'mensch-mann', chips: '#b9b4a8', swing: 'hack', carryLook: 'mensch-mann-stein' },
  sammlerin:         { target: 'wald', tool: null,    carry: 'ware-nahrung', img: 'mensch-frau', chips: '#d8344a', swing: 'pick', carryLook: 'mensch-frau', anim: 'pfluecken' },
  jaegerlager:       { target: 'wald', tool: null,    carry: 'ware-nahrung', img: 'mensch-mann', chips: null,      swing: 'look', far: true, look: 'mensch-jaeger-bogen-1', anim: 'bogen', carryLook: 'mensch-jaeger-beute' },
  mammutjaegerlager: { target: 'wald', tool: null,    carry: 'ware-nahrung', img: 'mensch-mann', chips: null,      swing: 'look', far: true, look: 'mensch-jaeger', anim: 'speerwurf', carryLook: 'mensch-jaeger-beute' },
  // Teil 2: am Ufer und im Einbaum fischen, an der Felswand malen, vor dem Haus arbeiten (target 'self')
  fischerplatz:      { target: 'wasser', tool: 'speer', carry: 'ware-nahrung', img: 'mensch-mann', chips: '#cfe9f7', swing: 'spear', boat: true },
  hoehlenmaler:      { target: 'fels',  tool: null,   carry: 'ware-wissen',  img: 'mensch-mann', chips: null,      swing: 'paint', anim: 'malen' },
  tongrube:          { target: 'wasser', tool: 'hacke', carry: 'ware-ton',   img: 'mensch-mann', chips: '#9a5a32', swing: 'hack', carryLook: 'mensch-tongrube-korb' },
  fellmacherin:      { target: 'self',  tool: null,   carry: null, img: 'mensch-frau', chips: null,      swing: 'scrape', thing: 'ware-felle', anim: 'schaben' },
  steinschlaeger:    { target: 'self',  tool: null,   carry: null, img: 'mensch-mann', chips: '#b9b4a8', swing: 'knap',   thing: 'ware-stein', anim: 'steinschlag' },
  toepferei:         { target: 'self',  tool: null,   carry: null, img: 'mensch-frau', chips: null,      swing: 'pot',    thing: 'ware-toepferwaren', anim: 'toepfern' },
  // Teil 3: auf dem Acker graben, am Ziegengehege hüten, Setzlinge pflanzen
  acker:             { target: 'field',  tool: 'grabstock', carry: null, img: 'mensch-frau', chips: '#7a5230', swing: 'hack' },
  ziegengehege:      { target: 'pen',    tool: null,  carry: null, img: 'mensch-mann', chips: null,      swing: 'herd', look: 'mensch-hirte', anim: 'hirte' },
  pflanzerin:        { target: 'sapling', tool: null, carry: null, img: 'mensch-frau', chips: '#7a5230', swing: 'plant', anim: 'pflanzen' },
};
// Gebückte/kniende Arbeitshaltungen (Canva) je Bewegung
const BEND_POSES = { pick: 'mensch-frau-pflueckt', plant: 'mensch-frau-pflanzt' };
const WORK_SECONDS = 7, WORK_WALK = 0.75;   // so lange wird gearbeitet, so schnell gelaufen (Felder je Sekunde)

life.workers = [];
life.workTimer = 0;

// Freier Platz direkt am Gebäude (Nummer k): zuerst vorne rechts, dann vorne links, dann die anderen Seiten.
// Nie in einem anderen Haus, im Wasser oder im Gebirge. Ergebnis: Mitte des Feldes und Blickrichtung nach außen.
function frontSpot(b, k = 0) {
  const s = BUILDINGS[b.type].size, out = [];
  for (let d = 0; d < s; d++) out.push([b.x + s, b.y + d, 1, 0]);    // rechts unten im Bild
  for (let d = 0; d < s; d++) out.push([b.x + d, b.y + s, 0, 1]);    // links unten im Bild
  for (let d = 0; d < s; d++) out.push([b.x - 1, b.y + d, -1, 0]);
  for (let d = 0; d < s; d++) out.push([b.x + d, b.y - 1, 0, -1]);
  const mid = Math.floor(s / 2);   // in der Mitte der Seite anfangen
  const order = out.map((c, i) => [c, Math.floor(i / s) * 10 + Math.abs((i % s) - mid)]).sort((a, c) => a[1] - c[1]).map(a => a[0]);
  const free = order.filter(([x, y]) => walkable(x, y));
  if (!free.length) return null;
  const [x, y, dx, dy] = free[k % free.length];
  return { x: x + 0.5, y: y + 0.5, dx, dy };
}

// Nächstes passendes Geländefeld in der Nähe eines Gebäudes, dazu ein freier Standplatz daneben
// Geländearten, an denen gearbeitet wird: an Felsen auch das Gebirge (unerschöpflich, Felsen werden abgebaut)
const targetIds = kind => kind === 'fels' ? [TERRAIN.fels.id, TERRAIN.berg.id] : [TERRAIN[kind].id];
// Ist das Ziel noch da? (Baum gefällt, Felsen abgebaut → neues Ziel suchen)
function targetGone(w) {
  const k = w.kind.target;
  if (!TERRAIN[k]) return false;
  const x = Math.floor(w.tx), y = Math.floor(w.ty);
  return inMap(x, y) && !targetIds(k).includes(terrain[y * N + x]);
}

// Jede Arbeit hat einen eigenen Eintrag (docs/plan-arbeitsbewegungen.md). Solange die eigenen Bilder fehlen, passt die Bewegung
// zur Arbeit, so gut es mit den vorhandenen Figuren geht: anim = Name in ANIM_POSES, sobald die Bilder da sind.
Object.assign(WORK, {
  holzfaeller: WORK.holzsammler, steinbruch: WORK.steinsammler, lehmgrube: WORK.tongrube, fischerhuette: WORK.fischerplatz,
  jagdhuette: WORK.mammutjaegerlager, feld: WORK.acker, viehhof: WORK.ziegengehege, baumgaertnerin: WORK.pflanzerin, toepferwerkstatt: WORK.toepferei,
  gemuesegarten:  { target: 'self',   tool: null,    carry: null, img: 'mensch-frau', chips: '#d8344a', swing: 'pick', anim: 'pfluecken' },   // bleibt auf dem Beet
  felsritzer:     { target: 'fels',   tool: null,    carry: 'ware-wissen', img: 'mensch-mann', chips: '#b9b4a8', swing: 'chisel' },
  sternkundiger:  { target: 'self',   tool: null,    carry: null, img: 'mensch-mann', chips: null, swing: 'gaze' },       // schaut zum Himmel
  kupferschmied:  { target: 'self',   tool: null,    carry: null, img: 'mensch-mann', chips: '#ffb347', swing: 'knap', thing: 'ware-werkzeug', anim: 'schmieden' },
  bronzeschmied:  { target: 'self',   tool: null,    carry: null, img: 'mensch-mann', chips: '#ffb347', swing: 'knap', thing: 'ware-werkzeug', anim: 'schmieden' },
  weberin:        { target: 'self',   tool: null,    carry: null, img: 'mensch-frau', chips: null, swing: 'scrape', thing: 'ware-kleidung' },
  schmuckmacherin:{ target: 'self',   tool: null,    carry: null, img: 'mensch-frau', chips: '#ffd166', swing: 'knap', anim: 'schmuck' },
  kupfermine:     { target: 'fels',   tool: 'hacke', carry: null, img: 'mensch-mann', chips: '#6fae8a', swing: 'hack', carryLook: 'mensch-bergmann-korb', anim: 'bergbau' },
  koehler:        { target: 'self',   tool: null,    carry: null, img: 'mensch-mann', chips: '#ffb347', swing: 'tend', anim: 'stochern' },   // am Meiler
  schmelzofen:    { target: 'self',   tool: null,    carry: null, img: 'mensch-mann', chips: '#ff8a3c', swing: 'tend', anim: 'blasebalg' },
  bronzegiesser:  { target: 'self',   tool: null,    carry: null, img: 'mensch-mann', chips: '#ffd166', swing: 'tend', anim: 'giessen' },
  // Eisenzeit: vorläufig passende Bewegungen, eigene Bilder folgen
  obstgarten: { target: 'self', tool: null, carry: null, img: 'mensch-frau', chips: '#d8344a', swing: 'pick', anim: 'pfluecken' },
  holzhof: WORK.holzsammler, grosser_steinbruch: WORK.steinsammler, grosse_lehmgrube: WORK.tongrube, fischerei: WORK.fischerplatz,
  jagdhof: WORK.mammutjaegerlager, eisenfeld: WORK.acker, rindergut: WORK.ziegengehege, forstmeisterin: WORK.pflanzerin, drehscheibe: WORK.toepferei,
  druide:       { target: 'self', tool: null,    carry: null, img: 'mensch-mann', chips: null, swing: 'gaze' },
  eisenschmied: { target: 'self', tool: null,    carry: null, img: 'mensch-mann', chips: '#ff8a3c', swing: 'knap', thing: 'ware-werkzeug' },
  tuchmacherin: { target: 'self', tool: null,    carry: null, img: 'mensch-frau', chips: null, swing: 'scrape', thing: 'ware-kleidung' },
  eisenmine:    { target: 'fels', tool: 'hacke', carry: null, img: 'mensch-mann', chips: '#a0604a', swing: 'hack', carryLook: 'mensch-mann-stein' },
  rennofen:     { target: 'self', tool: null,    carry: null, img: 'mensch-mann', chips: '#ff8a3c', swing: 'tend' },
  salzsiederei: { target: 'self', tool: null,    carry: null, img: 'mensch-mann', chips: '#f4f4ee', swing: 'tend' },
  glasmacherin: { target: 'self', tool: null,    carry: null, img: 'mensch-frau', chips: '#7fe0b8', swing: 'tend' },
  wagner:       { target: 'self', tool: null,    carry: null, img: 'mensch-mann', chips: '#a8743f', swing: 'knap' },
  zinnwaescherin: { target: 'wasser', tool: null,    carry: null, img: 'mensch-frau', chips: '#cfe9f7', swing: 'pan', anim: 'waschen' },    // schwenkt die Pfanne am Ufer
});

// Arbeitsplatz IN der Werkstatt (auf der Platte, vordere Hälfte, passend zum Bild): [Standplatz u, v, Werkstück u, v]
// u läuft zur rechten, v zur linken Ecke der Raute (0 … Größe). Gespiegelte Ansicht: u und v tauschen.
const INSIDE_SPOTS = {
  gemuesegarten:  [[1.5, 1.0, 1.1, 0.9], [1.0, 1.5, 0.9, 1.1]],   // zwischen den Beeten
  fellmacherin:   [[1.55, 1.05, 1.25, 0.8], [1.05, 1.55, 0.8, 1.25]],   // vor den Spannrahmen
  steinschlaeger: [[1.6, 1.05, 1.15, 1.25], [1.25, 1.7, 1.1, 1.25]],    // am großen Arbeitsstein
  kupferschmied:  [[1.6, 1.05, 1.15, 1.25], [1.25, 1.7, 1.1, 1.25]],
  bronzeschmied:  [[1.6, 1.05, 1.15, 1.25], [1.25, 1.7, 1.1, 1.25]],
  weberin:        [[1.55, 1.05, 1.25, 0.8], [1.05, 1.55, 0.8, 1.25]],
  toepferwerkstatt: [[1.65, 1.0, 1.35, 1.35], [1.05, 1.65, 1.35, 1.35]],
  toepferei:      [[1.65, 1.0, 1.35, 1.35], [1.05, 1.65, 1.35, 1.35]],  // zwischen Ofen und Töpfen
};
function insideSpot(b, k) {
  const list = INSIDE_SPOTS[b.type];
  if (!list) return null;
  let [su, sv, tu, tv] = list[k % list.length];
  if (typeof buildingView === 'function' && buildingView(BUILDINGS[b.type], b.rot, b.x, b.y).mirror) [su, sv, tu, tv] = [sv, su, tv, tu];
  return { tx: b.x + tu, ty: b.y + tv, sx: b.x + su, sy: b.y + sv };
}

function workSpot(b, kind, far, k = 0) {
  const s = BUILDINGS[b.type].size, cx = b.x + s / 2, cy = b.y + s / 2;
  if (kind === 'self') {   // arbeitet in der Werkstatt auf der Platte; ohne festgelegten Platz direkt vor dem Haus
    const inside = insideSpot(b, k);
    if (inside) return inside;
    const f = frontSpot(b, k);
    if (!f) return null;
    return { tx: f.x + f.dx * 0.45 + f.dy * 0.1, ty: f.y + f.dy * 0.45 + f.dx * 0.1, sx: f.x - f.dx * 0.1, sy: f.y - f.dy * 0.1 };
  }
  const r = (a, c) => hash(b.x + a + Math.floor(lifeRandom() * 50), b.y + c);
  if (kind === 'field') {   // irgendwo auf dem eigenen Acker, jedes Mal ein anderes Stück
    const sx = b.x + 0.6 + r(k, 1) * (s - 1.2), sy = b.y + 0.6 + r(2, k + 5) * (s - 1.2);
    return { tx: sx - 0.5, ty: sy, sx, sy };
  }
  if (kind === 'pen') {   // am Zaun entlang, Blick ins Gehege
    const a = r(k * 3, 9) * Math.PI * 2, rr = s / 2 + 0.45;
    const sx = cx + Math.cos(a) * rr, sy = cy + Math.sin(a) * rr;
    if (!walkable(Math.floor(sx), Math.floor(sy))) return null;
    return { tx: cx, ty: cy, sx, sy };
  }
  if (kind === 'sapling') {   // zum nächsten Setzling, sonst auf die Wiese daneben (gleich wird dort gepflanzt)
    let best = null, bestD = Infinity;
    for (const [i] of state.saplings) {
      const x = i % N, y = Math.floor(i / N), d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) + hash(x + k * 7, y) * 3;
      if (d < bestD && d < CONFIG.trees.plantRadius + 2 && walkable(x + 1, y)) { bestD = d; best = { tx: x + 0.5, ty: y + 0.5, sx: x + 1.15, sy: y + 0.5 }; }
    }
    if (best) return best;
    const sx = b.x + s + 0.6 + r(k, 3) * 1.5, sy = b.y + r(4, k) * s;
    return walkable(Math.floor(sx), Math.floor(sy)) ? { tx: sx - 0.6, ty: sy, sx, sy } : null;
  }
  const ids = targetIds(kind), max = far ? 10 : 7;
  let best = null, bestD = Infinity;
  for (let y = Math.floor(cy - max); y <= cy + max; y++)
    for (let x = Math.floor(cx - max); x <= cx + max; x++) {
      if (!inMap(x, y) || !ids.includes(terrain[y * N + x])) continue;
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) + hash(x + b.x + k * 13, y - b.y + k * 7) * (far ? 4 : 2.5)   // nicht alle zum selben Baum
        + (isOwned(x, y) ? 0 : 40);   // lieber auf eigenem Land arbeiten – unter den Wolken sieht man niemanden
      if (d >= bestD) continue;
      for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
        if (!animalFree(x + dx, y + dy) && !isPathAt(x + dx, y + dy)) continue;
        best = { tx: x + 0.5, ty: y + 0.5, sx: x + 0.5 + dx * 0.7, sy: y + 0.5 + dy * 0.7 }; bestD = d; break;
      }
    }
  return best;
}

// Fußweg von Feld zu Feld (8 Richtungen, keine Ecken abschneiden): über Land, Pfade und Brücken – nie übers Wasser,
// nicht durchs Gebirge und nicht quer über Gebäude. Ergebnis: Liste von Punkten bis zum Ziel, oder null.
function walkable(x, y) {
  if (!inMap(x, y)) return false;
  const i = buildingAt(x, y);
  if (i >= 0) return !!BUILDINGS[state.buildings[i].type].isPath;   // Pfade und Brücken ja, Gebäude nein
  const t = terrain[y * N + x];
  return t !== TERRAIN.wasser.id && t !== TERRAIN.berg.id;
}

// own = Index eines Gebäudes, über dessen Fläche man gehen darf (Platz am Feuer); sonst nur das, in dem man startet
function walkRoute(fx, fy, tx, ty, own = -1) {
  const ax = Math.floor(fx), ay = Math.floor(fy), bx = Math.floor(tx), by = Math.floor(ty);
  const x0 = Math.min(ax, bx) - 8, y0 = Math.min(ay, by) - 8, W = Math.max(ax, bx) + 9 - x0, H = Math.max(ay, by) + 9 - y0;
  const prev = new Int32Array(W * H).fill(-1), key = (x, y) => (y - y0) * W + (x - x0);
  const start = key(ax, ay), goal = key(bx, by);
  const home = inMap(ax, ay) ? buildingAt(ax, ay) : -1;   // aus dem eigenen Gebäude darf man hinausgehen
  const ok = (x, y) => walkable(x, y) || (inMap(x, y) && ((home >= 0 && buildingAt(x, y) === home) || (own >= 0 && buildingAt(x, y) === own)));
  prev[start] = start;
  const queue = [start];
  for (let qi = 0; qi < queue.length && prev[goal] < 0; qi++) {
    const k = queue[qi], x = k % W + x0, y = Math.floor(k / W) + y0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < x0 || ny < y0 || nx >= x0 + W || ny >= y0 + H) continue;
      const nk = key(nx, ny);
      if (prev[nk] >= 0) continue;
      const isGoal = nk === goal;
      if (!isGoal && !ok(nx, ny)) continue;
      if (dx && dy && (!ok(x + dx, y) || !ok(x, y + dy))) continue;   // nicht über Wasserecken springen
      prev[nk] = k;
      queue.push(nk);
    }
  }
  if (prev[goal] < 0) return null;
  const pts = [];
  for (let k = goal; k !== start; k = prev[k]) pts.push([k % W + x0 + 0.5, Math.floor(k / W) + y0 + 0.5]);
  pts.reverse();
  if (pts.length) pts.pop();
  pts.push([tx, ty]);   // letzter Punkt: genau der Standplatz
  return pts;
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
    // verschobene Gebäude: Arbeiter neu aufstellen (sonst stehen sie am alten Ort)
    life.workers = life.workers.filter(w => w.bx === w.b.x && w.by === w.b.y && want.some(o => o.b === w.b && o.k === w.k));
    for (const o of want) {
      if (life.workers.some(w => w.b === o.b && w.k === o.k)) continue;
      const s = BUILDINGS[o.b.type].size;
      const f = WORK[o.b.type].target === 'field' ? null : frontSpot(o.b, o.k);
      const home = WORK[o.b.type].target === 'field'
        ? { x: o.b.x + s - 0.5, y: o.b.y + s / 2 + (o.k ? 0.6 : -0.6) }      // auf dem Acker bleiben, am vorderen Feldrand
        : f ? { x: f.x, y: f.y } : null;                                     // vor dem Haus, auf freiem Boden
      if (!home) continue;   // ringsum alles zugebaut: niemand zu sehen
      life.workers.push({ b: o.b, k: o.k, kind: WORK[o.b.type], home, bx: o.b.x, by: o.b.y, x: home.x, y: home.y, phase: 'rest', t: 1 + o.k * 2.5 + lifeRandom() * 2, face: 1, ph: lifeRandom() * 9 });
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
      const own = w.kind.target === 'self' ? state.buildings.indexOf(w.b) : -1;   // Werkstatt: über die eigene Platte gehen
      const route = walkRoute(w.x, w.y, spot.sx, spot.sy, own);
      if (!route) { w.t = 8; continue; }   // nur übers Wasser erreichbar: später nochmal (anderer Baum)
      Object.assign(w, spot, { phase: 'go', route });
    } else if (w.phase === 'go' || w.phase === 'back') {
      if (w.phase === 'go' && targetGone(w)) { w.phase = 'rest'; w.t = 0.5; w.route = null; continue; }   // Ziel verschwunden: neues suchen
      if (!w.route || !w.route.length) w.route = [w.phase === 'go' ? [w.sx, w.sy] : [w.home.x, w.home.y]];
      const [gx, gy] = w.route[0];
      const dx = gx - w.x, dy = gy - w.y, d = Math.hypot(dx, dy);
      if (d < 0.05) {
        w.route.shift();
        if (w.route.length) continue;
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
        if (w.t <= 0) { w.bt = 0; w.x = w.sx; w.y = w.sy; w.phase = 'back'; w.route = walkRoute(w.x, w.y, w.home.x, w.home.y); }   // am Ufer wieder aussteigen
        continue;
      }
      const sxd = w.tx - w.x - (w.ty - w.y);
      if (Math.abs(sxd) > 0.01) w.face = sxd > 0 ? -1 : 1;   // zum Baum/Felsen schauen
      if (w.t <= 0) { w.phase = 'back'; w.route = walkRoute(w.x, w.y, w.home.x, w.home.y, state.buildings.indexOf(w.b)) || [[w.home.x, w.home.y]]; }
    }
  }
}

function workerObjects(inView, t) {
  const out = [];
  for (const w of life.workers) {
    if (w.phase === 'rest' || !inView(w.x, w.y)) continue;
    const b = w.b, s = BUILDINGS[b.type].size;
    const onPlate = w.x > b.x && w.x < b.x + s && w.y > b.y && w.y < b.y + s;   // auf dem Acker: nicht vom Feld verdecken
    out.push({ d: onPlate ? b.x + b.y + s + 0.01 + (w.x + w.y) * 1e-4 : w.x + w.y - 0.5, kind: 'leben', draw: () => drawWorker(w, t) });
  }
  return out;
}

function drawWorker(w, t) {
  const z = cam.zoom, walking = w.phase !== 'work', step = t * 10 + w.ph;
  if (!walking && w.kind.boat && w.k === 1 && images.einbaum) return drawBoat(w, t);
  // Werkstück vor dem Haus (Fell, Steinknolle, Topf) – liegt hinter der Figur. Zeigen es die Bewegungsbilder schon, entfällt es.
  const ownThing = w.kind.anim && ANIM_POSES[w.kind.anim] && ANIM_POSES[w.kind.anim].filter(f => images[f[0]]).length >= 2;
  if (!walking && w.kind.thing && images[w.kind.thing] && !ownThing) {
    // Fell liegt nicht auf dem Boden: die Fellmacherin hält es vor sich in den Händen und schabt es
    const held = w.kind.swing === 'scrape', pw = tileToScreen(w.x, w.y);
    const q = held ? { x: pw.x - 8 * z * w.face, y: pw.y - 9 * z } : tileToScreen(w.tx, w.ty), s = (held ? 13 : 15) * z;
    const grow = w.kind.swing === 'pot' ? 0.6 + 0.4 * Math.min(1, (WORK_SECONDS - w.t) / WORK_SECONDS) : 1;   // der Topf wächst
    ctx.drawImage(images[w.kind.thing], q.x - s * grow / 2, q.y - s * grow * 0.8, s * grow, s * grow);
  }
  let bob = walking ? Math.abs(Math.sin(step)) * 1.2 * z : 0;
  const swing = w.kind.swing;
  if (!walking && swing === 'pick' && !w.kind.anim) bob = -Math.max(0, Math.sin(t * 3 + w.ph)) * 3 * z;   // bückt sich zum Busch
  if (!walking && (swing === 'tend' || swing === 'pan')) bob = (Math.sin(t * 2 + w.ph) + 1) * 0.9 * z;   // wiegt sich bei der Arbeit
  if (!walking && swing === 'chisel') bob = Math.abs(Math.sin(t * 6 + w.ph)) * 0.8 * z;
  // mit Last nur auf dem Rückweg (carryLook: das Grundbild zeigt schon Holz bzw. Korb), sonst leere Hände
  const look = w.phase === 'back' && w.kind.carryLook && images[w.kind.carryLook] ? w.kind.carryLook
    : w.kind.look && images[w.kind.look] ? w.kind.look : personImg(w.kind.img, 'leer');   // Jäger immer mit Waffe
  const p = tileToScreen(w.x, w.y);
  // Arbeitshaltung aus Canva: ganz eigene Bewegung (anim) oder das Werkzeug in der Hand
  const pose = !walking && ((w.kind.anim && ANIM_POSES[w.kind.anim]) || (w.kind.tool && TOOL_POSES[w.kind.tool]));
  const frames = pose ? pose.filter(f => images[f[0]]) : [];
  const posed = frames.length >= 2;
  if (posed) {
    const timing = ANIM_TIMING[w.kind.anim] || {};
    const m = poseMix(frames.length, (t * (timing.speed || 1.6) + w.ph) % 1, timing.keys);
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath(); ctx.ellipse(p.x, p.y, 10 * z, 3.2 * z, 0, 0, 7); ctx.fill();
    ctx.save(); ctx.translate(p.x, p.y); if (w.face < 0) ctx.scale(-1, 1);
    for (const [i, alpha] of m) {
      const [name, h, shift] = frames[i], img = images[name], hh = h * z, ww = hh * img.width / img.height;
      ctx.globalAlpha = alpha;
      ctx.drawImage(img, -ww / 2 - ww * shift, -hh, ww, hh);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  } else if (!walking && BEND_POSES[swing] && images[BEND_POSES[swing]]) {   // bückt sich zum Busch / kniet am Setzling (Canva)
    const img = images[BEND_POSES[swing]], hh = 30 * z, ww = hh * img.width / img.height, dip = Math.max(0, Math.sin(t * 3 + w.ph)) * 1.5 * z;
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath(); ctx.ellipse(p.x, p.y, 10 * z, 3.2 * z, 0, 0, 7); ctx.fill();
    ctx.save(); ctx.translate(p.x, p.y + dip); if (w.face < 0) ctx.scale(-1, 1);
    ctx.drawImage(img, -ww / 2 - ww * 0.1, -hh, ww, hh);
    ctx.restore();
  } else drawCreature(look, w.x, w.y, 32, w.face, bob, '🧍', walking ? step : null);
  // Werkzeug schwingen (hoch – runter – Schlag)
  if (!walking && w.kind.tool && (posed || images[w.kind.tool])) {
    const cyc = (t * 1.6 + w.ph) % 1;
    if (!posed) {
    const ang = cyc < 0.7 ? -1.6 * (cyc / 0.7) : -1.6 + 2.2 * ((cyc - 0.7) / 0.3);   // langsam ausholen, schnell zuschlagen
    const s = 24 * z;
    ctx.save();
    ctx.translate(p.x - 5 * z * w.face, p.y - 18 * z);
    ctx.scale(-w.face, 1);
    ctx.rotate(ang);
    ctx.drawImage(images[w.kind.tool], -s * 0.2, -s, s, s);
    ctx.restore();
    }
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
  if (!walking && w.kind.anim === 'bogen' && posed) {   // beim Schuss fliegt der Pfeil davon
    const cyc = (t * ANIM_TIMING.bogen.speed + w.ph) % 1;
    if (cyc >= 0.75) {
      const q = (cyc - 0.75) / 0.25, ax = p.x - w.face * (16 + 46 * q) * z, ay = p.y - (24 - 5 * q * q) * z;
      ctx.globalAlpha = q < 0.8 ? 1 : (1 - q) / 0.2;
      ctx.strokeStyle = '#4a3320'; ctx.lineWidth = 1.2 * z; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax + w.face * 8 * z, ay - 0.6 * z); ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
  if (!walking && w.kind.anim === 'speerwurf' && posed) {   // der geworfene Speer fliegt davon
    const cyc = (t * ANIM_TIMING.speerwurf.speed + w.ph) % 1;
    if (cyc >= 0.68) {
      const q = (cyc - 0.68) / 0.32, ax = p.x - w.face * (20 + 60 * q) * z, ay = p.y - (26 + 10 * Math.sin(q * Math.PI) - 8 * q) * z;
      ctx.globalAlpha = q < 0.8 ? 1 : (1 - q) / 0.2;
      ctx.strokeStyle = '#6b4a2a'; ctx.lineWidth = 1.6 * z; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax + w.face * 20 * z, ay - (2 - 4 * q) * z); ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
  if (!walking && swing === 'spear' && posed) {   // Canva-Haltungen: beim Zustechen spritzt es an der Speerspitze
    const cyc = (t * 1.6 + w.ph) % 1;
    if (cyc >= 0.7) splash(p.x - w.face * 15 * z, p.y - 1 * z, z, 1 - (cyc - 0.7) / 0.3);
  }
  if (!walking && swing === 'spear' && !posed) {   // ohne Bilder: gezeichneter Speer, es spritzt
    // Speer steil von oben nach unten ins Wasser (nicht waagrecht – das sah aus wie ein Gewehr)
    const cyc = (t * 0.8 + w.ph) % 1, thrust = cyc > 0.75 ? Math.sin((cyc - 0.75) / 0.25 * Math.PI) : 0;
    const q = tileToScreen(w.tx, w.ty), dir = Math.sign(q.x - p.x) || -w.face;
    const ex = p.x + dir * (9 + 2 * thrust) * z, ey = p.y + (1 + 6 * thrust) * z;   // Spitze vor den Füßen im Wasser
    const gx = ex - dir * 11 * z, gy = ey - 30 * z;                                   // oberes Ende über der Schulter
    ctx.strokeStyle = '#6b4a2a'; ctx.lineWidth = 1.8 * z; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(ex, ey); ctx.stroke();
    const ux = (ex - gx) / 32, uy = (ey - gy) / 32;   // Steinspitze
    ctx.fillStyle = '#8a8478';
    ctx.beginPath(); ctx.moveTo(ex + ux * 5, ey + uy * 5); ctx.lineTo(ex - uy * 1.6 - ux * 1.5, ey + ux * 1.6 - uy * 1.5); ctx.lineTo(ex + uy * 1.6 - ux * 1.5, ey - ux * 1.6 - uy * 1.5); ctx.fill();
    if (thrust > 0.6) splash(ex, ey + 2 * z, z, thrust);
  }
  if (!walking && swing === 'paint') {   // Pinsel an die Felswand, bunte Tupfen erscheinen nach und nach
    const q = tileToScreen(w.tx, w.ty), done = Math.min(1, (WORK_SECONDS - w.t) / WORK_SECONDS);
    const cols = ['#b5462a', '#e0a040', '#3a2a1a', '#f2e6c8'];
    for (let i = 0; i < Math.floor(done * 7); i++) {
      ctx.fillStyle = cols[i % 4];
      ctx.beginPath(); ctx.arc(q.x + (hash(i, w.k + 3) - 0.5) * 16 * z, q.y - 10 * z - hash(w.k, i + 5) * 12 * z, 1.8 * z, 0, 7); ctx.fill();
    }
    if (!posed) {   // sonst zeigen die Bilder den Pinsel schon
      const dab = Math.sin(t * 5 + w.ph);
      ctx.strokeStyle = '#6b4a2a'; ctx.lineWidth = 1.5 * z; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(hand.x, hand.y); ctx.lineTo(hand.x - (6 + dab * 2) * z * w.face, hand.y - (5 + dab * 3) * z); ctx.stroke();
    }
  }
  if (!walking && !posed && (swing === 'scrape' || swing === 'knap' || swing === 'pot')) {   // Hände über dem Werkstück
    const pw = tileToScreen(w.x, w.y);
    const q = swing === 'scrape' ? { x: pw.x - 8 * z * w.face, y: pw.y - 3 * z } : tileToScreen(w.tx, w.ty);
    const m = swing === 'knap' ? Math.abs(Math.sin(t * 4 + w.ph)) : (Math.sin(t * 3 + w.ph) + 1) / 2;
    const hx = q.x + (swing === 'scrape' ? (m - 0.5) * 10 * z : 0), hy = q.y - 8 * z - (swing === 'knap' ? m * 7 * z : 2 * z);
    ctx.fillStyle = swing === 'knap' ? '#8a8478' : '#c99a6e';
    ctx.beginPath(); ctx.arc(hx, hy, (swing === 'knap' ? 2.6 : 2) * z, 0, 7); ctx.fill();
    if (swing === 'knap' && m < 0.15) {   // Splitter beim Schlag
      ctx.fillStyle = w.kind.chips;
      for (let i = 0; i < 3; i++) ctx.fillRect(hx + (i - 1) * 4 * z, hy - (2 + i) * z, 2 * z, 2 * z);
    }
  }
  // Köhler, Ofen, Gießer: beugt sich sanft zur Glut, Funken steigen auf
  if (!walking && swing === 'tend') {
    const g = tileToScreen(w.tx, w.ty), q = (t * 0.8 + w.ph) % 1;
    ctx.fillStyle = w.kind.chips;
    for (let i = 0; i < 4; i++) {
      const k = (q + i * 0.25) % 1;
      ctx.globalAlpha = 1 - k;
      ctx.fillRect(g.x + Math.sin(k * 9 + i) * 5 * z - z, g.y - 8 * z - k * 18 * z, 2 * z, 2 * z);
    }
    ctx.globalAlpha = 1;
  }
  // Felsritzer: kleine Splitter an der Wand
  if (!walking && swing === 'chisel') {
    const g = tileToScreen(w.tx, w.ty), q = (t * 2 + w.ph) % 1;
    if (q < 0.4) {
      ctx.fillStyle = w.kind.chips; ctx.globalAlpha = 1 - q / 0.4;
      for (let i = 0; i < 3; i++) ctx.fillRect(g.x + (i - 1) * 5 * q * z * 2.5, g.y - 14 * z - q * 8 * z, 2 * z, 2 * z);
      ctx.globalAlpha = 1;
    }
  }
  // Zinn waschen: das Wasser spritzt beim Schwenken
  if (!walking && swing === 'pan') {
    const q = (t * 1.2 + w.ph) % 1;
    if (q < 0.5) splash(p.x - w.face * 12 * z, p.y - 2 * z, z, 1 - q * 2);
  }
  // Sternkundiger: nachts funkelt über ihm ein Stern
  if (!walking && swing === 'gaze' && darkness() > 0.3) {
    const q = 0.5 + 0.5 * Math.sin(t * 2 + w.ph);
    ctx.globalAlpha = darkness() * (0.4 + q * 0.6);
    drawSparkle(p.x - w.face * 14 * z, p.y - 48 * z, (4 + q * 3) * z, '#fff6c8', t * 0.3);
    ctx.globalAlpha = 1;
  }
  // Beeren pflücken: ab und zu hüpft eine Beere in den Korb
  if (!walking && swing === 'pick') {
    const q = (t * 0.9 + w.ph) % 1;
    ctx.fillStyle = '#d8344a';
    ctx.beginPath(); ctx.arc(p.x - 8 * z * w.face, p.y - 14 * z - Math.sin(q * Math.PI) * 8 * z, 2.2 * z, 0, 7); ctx.fill();
  }
  // Pflanzen: Erde krümelt neben den Händen
  if (!walking && swing === 'plant') {
    const q = (t * 1.3 + w.ph) % 1, g = tileToScreen(w.tx, w.ty);
    ctx.fillStyle = '#7a5230'; ctx.globalAlpha = 1 - q;
    for (let i = 0; i < 3; i++) ctx.fillRect(g.x + (i - 1) * 4 * z + (p.x - g.x) * 0.4, g.y - 3 * z - q * (4 + i * 2) * z, 2 * z, 2 * z);
    ctx.globalAlpha = 1;
  }
  // Beute auf dem Rückweg tragen
  if (w.phase === 'back' && w.kind.carry && images[w.kind.carry] && look !== w.kind.carryLook) {
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
  const front = images['fischer-boot-vorne'], back = images['fischer-boot-hinten'];
  if (front && back) {   // Canva: Paddel wechselt zwischen vorn und hinten, das Boot schaukelt und schiebt sich beim Zug
    const cyc = (t * 0.9 + w.ph) % 1, pull = cyc > 0.5, pic = pull ? back : front;
    const bw = 58 * z, bh = bw * pic.height / pic.width, rock = Math.sin(t * 1.8 + w.ph) * 1.1 * z;
    ctx.fillStyle = 'rgba(20,60,90,0.2)';
    ctx.beginPath(); ctx.ellipse(p.x, p.y + 2 * z, bw * 0.48, bh * 0.2, 0, 0, 7); ctx.fill();
    ctx.save();
    ctx.translate(p.x, p.y + rock * 0.4);
    if (w.face < 0) ctx.scale(-1, 1);
    ctx.rotate(Math.sin(t * 1.8 + w.ph) * 0.02);
    ctx.drawImage(pic, -bw / 2, -bh * 0.82, bw, bh);
    ctx.restore();
    const q = pull ? (cyc - 0.5) / 0.5 : cyc / 0.5;
    if (q < 0.25) splash(p.x + (pull ? 0.28 : -0.33) * bw * w.face, p.y + 1 * z, z, 0.8);
    return;
  }
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

const GATHER = { lagerfeuer: 'feuer', feuerplatz: 'feuer', geschichtenhoehle: 'feuer', dorfbrunnen: 'feuer', ahnenplatz: 'beten', steinkreis: 'beten', himmelshalle: 'beten' };
life.visitors = [];
life.visitTimer = 0;

function gatherWant(b) {
  const evening = darkness() > 0.3 || timeOfDay().name === 'Abend';
  const most = GATHER[b.type] === 'feuer' ? (evening ? 7 : 3) : (evening ? 2 : 4);
  return Math.max(0, Math.min(most, Math.floor(state.pop / 3)));
}

// Woher ein Besucher kommt: 3 Felder außerhalb, aber nur über begehbares Land (kein Wasser, kein Gebirge).
// Klappt keine Richtung, erscheint er direkt an seinem Platz.
// Woher ein Besucher kommt: 3 Felder außerhalb, und die gerade Linie dorthin führt nur über begehbaren Boden
// (kein Wasser, kein Gebirge, kein fremdes Haus; über den eigenen Platz darf er). Sonst erscheint er an seinem Platz.
function gatherFrom(spot, a, r, cx, cy, own = -1) {
  for (const turn of [0, 1, -1, 2, -2, 3, -3, 4]) {   // erst die eigene Richtung, dann immer weiter daneben
    const b = a + turn * Math.PI / 4;
    const from = { x: cx + Math.cos(b) * (r + 3), y: cy + Math.sin(b) * (r + 3) };
    let ok = true;
    for (let s = 0.25; s <= 1 && ok; s += 0.25) {
      const x = Math.floor(spot.x + (from.x - spot.x) * s), y = Math.floor(spot.y + (from.y - spot.y) * s);
      if (!walkable(x, y) && !(inMap(x, y) && buildingAt(x, y) === own)) ok = false;
    }
    if (ok) return from;
  }
  return { x: spot.x, y: spot.y };
}

function updateVisitors(dt) {
  life.visitTimer -= dt;
  if (life.visitTimer <= 0) {
    life.visitTimer = 1.5;
    // nur freie Einwohner (nicht bei der Arbeit, nicht schon unterwegs auf den Pfaden) kommen zu Besuch
    let budget = Math.floor(state.pop - (stats.workers || 0)) - life.walkers.length - life.visitors.filter(v => v.phase !== 'leave').length;
    state.buildings.forEach((b, i) => {
      if (!GATHER[b.type] || b.build || !isConnected(i)) return;
      const here = life.visitors.filter(v => v.b === b && v.phase !== 'leave');
      if (here.length > gatherWant(b) || (budget < 0 && here.length)) { here[0].phase = 'leave'; budget++; return; }
      if (here.length >= gatherWant(b) || budget <= 0 || lifeRandom() < 0.4) return;
      const used = new Set(here.map(v => v.slot));
      const s = BUILDINGS[b.type].size, cx = b.x + s / 2, cy = b.y + s / 2;
      const pray = GATHER[b.type] === 'beten';
      const r = pray ? s * 0.27 : s * 0.34 + 0.1;   // am Feuer auf die Bänke; Beter knien auf dem Platz um die Mitte
      // freien Platz suchen: auf dem eigenen Platz oder auf begehbarem Boden – nicht im Acker oder Nachbarhaus
      let slot = -1, a = 0, spot = null;
      for (let k = 0; k < 10 && slot < 0; k++) {
        if (used.has(k)) continue;
        a = pray ? Math.PI / 4 + (k % 5 - 2) * 0.55 + (k >= 5 ? 0.27 : 0) : k * 2.4 + hash(b.x, b.y) * 6;   // Beter vorne (zum Betrachter hin)
        const p = { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r * 0.9 };
        const tx = Math.floor(p.x), ty = Math.floor(p.y);
        if (buildingAt(tx, ty) === i || (!pray && walkable(tx, ty))) { slot = k; spot = p; }
      }
      if (slot < 0) return;
      const from = gatherFrom(spot, a, r, cx, cy, i);
      const route = walkRoute(from.x, from.y, spot.x, spot.y, i);
      const start = route ? from : spot;   // kein Fußweg: erscheint gleich an seinem Platz
      life.visitors.push({ b, slot, kind: GATHER[b.type], x: start.x, y: start.y, from: start, spot, route: route || [], cx, cy, phase: 'go', t: 25 + lifeRandom() * 35,
        img: lifeRandom() < 0.5 ? 'mensch-mann' : 'mensch-frau', face: 1, ph: lifeRandom() * 9, alpha: 0 });
      budget--;
    });
  }
  for (const v of life.visitors) {
    // unterwegs über feste Wegpunkte: hin route (endet am Platz), zurück dieselben rückwärts bis zum Startpunkt
    if (v.phase === 'leave' && !v.back) { v.back = v.route.slice(0, -1).reverse().concat([[v.from.x, v.from.y]]); v.i = 0; }
    const pts = v.phase === 'leave' ? v.back : v.route.length ? v.route : [[v.spot.x, v.spot.y]];
    v.i ||= 0;
    let [gx, gy] = pts[Math.min(v.i, pts.length - 1)];
    if (v.phase !== 'stay' && Math.hypot(gx - v.x, gy - v.y) < 0.05 && v.i < pts.length - 1) { v.i++; [gx, gy] = pts[v.i]; }
    const target = v.phase === 'stay' ? v.spot : { x: gx, y: gy };
    const dx = target.x - v.x, dy = target.y - v.y, d = Math.hypot(dx, dy);
    const end = v.phase === 'leave' ? v.from : v.spot, rest = Math.hypot(end.x - v.x, end.y - v.y);
    if (v.phase === 'stay') { v.t -= dt; if (v.t <= 0) v.phase = 'leave'; }
    else if (rest < 0.04) { if (v.phase === 'go') { v.phase = 'stay'; v.i = 0; } else v.gone = true; }
    else {
      const step = Math.min(d, 0.7 * dt);
      if (d > 0) { v.x += dx / d * step; v.y += dy / d * step; }
      if (Math.abs(dx - dy) > 0.01) v.face = dx - dy > 0 ? -1 : 1;
    }
    v.alpha = v.phase === 'leave' ? Math.min(1, rest / 1.5) : Math.min(1, v.alpha + dt * 2);
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
  if (v.phase !== 'stay') drawCreature(personImg(v.img, 'leer'), v.x, v.y, 32, v.face, Math.abs(Math.sin(step)) * 1.2 * z, '🧍', step);
  else if (v.kind === 'feuer' && (darkness() > 0.3 || festNow())) {   // abends und beim Sonnwendfest: Tanz ums Feuer – hüpfen und drehen
    const hop = Math.abs(Math.sin(t * 4 + v.ph)) * 6 * z;
    drawCreature(personImg(v.img, 'leer'), v.x, v.y, 32, Math.sin(t * 1.3 + v.ph) > 0 ? 1 : -1, hop, '💃', t * 8 + v.ph);
  } else if (v.kind === 'feuer') drawSitting(v, t);
  else if (images[v.img + '-betend']) {   // beten: Mann und Frau knien (Canva-Bilder), nicken langsam
    const p = tileToScreen(v.x, v.y), img = images[v.img + '-betend'], z = cam.zoom;
    const h = 24 * z, w = h * img.width / img.height, nod = Math.max(0, Math.sin(t * 0.8 + v.ph)) * 0.08;
    ctx.fillStyle = 'rgba(0,0,0,0.14)';
    ctx.beginPath(); ctx.ellipse(p.x, p.y, 9 * z, 3 * z, 0, 0, 7); ctx.fill();
    ctx.save(); ctx.translate(p.x, p.y); if (v.face < 0) ctx.scale(-1, 1);
    ctx.transform(1, 0, nod, 1, 0, 0);
    ctx.drawImage(img, -w / 2, -h, w, h);
    ctx.restore();
  } else {   // beten: verbeugen sich langsam
    const p = tileToScreen(v.x, v.y), img = images[personImg(v.img, 'leer')];
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

// Am Feuer sitzen: eigenes Bild (mensch-mann-sitzend / mensch-frau-sitzend aus Canva);
// fehlt es noch, nur der Oberkörper der stehenden Figur, ohne Fleck darunter
function drawSitting(v, t) {
  const p = tileToScreen(v.x, v.y), z = cam.zoom;
  const sit = images[v.img + '-sitzend'], img = sit || images[v.img];
  if (!img) { drawCreature(v.img, v.x, v.y, 26, v.face, 0, '🧍'); return; }
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.beginPath(); ctx.ellipse(p.x, p.y, 9 * z, 3 * z, 0, 0, 7); ctx.fill();
  const facesRight = sit && v.img === 'mensch-mann';   // das Canva-Bild des sitzenden Mannes schaut nach rechts
  ctx.save(); ctx.translate(p.x, p.y + Math.sin(t * 1.5 + v.ph) * 0.6 * z); if ((v.face < 0) !== facesRight) ctx.scale(-1, 1);
  if (sit) {
    const h = 22 * z, w = h * img.width / img.height;
    ctx.drawImage(img, -w / 2, -h, w, h);
  } else {
    const h = 32 * z, w = h * img.width / img.height, cut = LEGS[v.img] || 0.6;
    ctx.drawImage(img, 0, 0, img.width, img.height * cut, -w / 2, -h * cut, w, h * cut);
  }
  ctx.restore();
}

// Arbeitshaltungen je Werkzeug: [Bild, Höhe in Bildpunkten bei Zoom 1, Versatz nach links (Anteil der Breite)]
const TOOL_POSES = {
  axt:   [['mensch-axt-oben', 38, -0.145], ['mensch-axt-mitte', 33, 0.144], ['mensch-axt-unten', 34, 0.175]],
  hacke: [['mensch-hacke-oben', 38, -0.126], ['mensch-hacke-mitte', 33, 0.195], ['mensch-hacke-unten', 34, 0.154]],
  speer: [['fischer-speer-oben', 40, 0.05], ['fischer-speer-mitte', 29, 0.1], ['fischer-speer-unten', 34, 0.12]],
  grabstock: [['mensch-frau-grabstock-oben', 36, 0.117], ['mensch-frau-grabstock-unten', 33, 0.103], ['mensch-frau-grabstock-tief', 31, 0.082]],
};

// Eigene Bewegungen je Beruf (je Bild: Name, Höhe, Versatz). Nur eintragen, was es als Bild gibt, sonst würde es umsonst geladen.
const ANIM_POSES = {
  bogen: [['mensch-jaeger-bogen-1', 34, 0.076], ['mensch-jaeger-bogen-2', 35, 0.12], ['mensch-jaeger-bogen-3', 36, 0.099]],
  speerwurf: [['mensch-mammutjaeger-1', 47, -0.136], ['mensch-mammutjaeger-2', 34, -0.02], ['mensch-mammutjaeger-3', 31, 0.142]],
  malen: [['mensch-maler-1', 33, 0.054], ['mensch-maler-2', 33, 0.184], ['mensch-maler-3', 38, 0.175]],
  schaben: [['mensch-fellmacherin-1', 29.4, 0.033], ['mensch-fellmacherin-2', 27.2, 0.033], ['mensch-fellmacherin-3', 22.6, -0.014]],
  steinschlag: [['mensch-steinschlaeger-1', 24.7, 0.006], ['mensch-steinschlaeger-2', 24.7, 0.006], ['mensch-steinschlaeger-3', 23.6, 0.006]],
  hirte: [['mensch-hirte-1', 32.6, 0.18], ['mensch-hirte-2', 34.2, 0.201], ['mensch-hirte-3', 44, 0.085]],
  bergbau: [['mensch-bergmann-1', 37.8, 0], ['mensch-bergmann-2', 32.4, 0.181], ['mensch-bergmann-3', 28.6, 0.164]],   // Bronzezeit: Bergmann in Wolltunika
  blasebalg: [['mensch-schmelzer-1', 37.9, 0.04], ['mensch-schmelzer-2', 39.2, 0.048], ['mensch-schmelzer-3', 37.5, 0.033]],   // Schmelzofen: tritt den Blasebalg
  giessen: [['mensch-giesser-1', 35.6, 0.197], ['mensch-giesser-2', 35.5, 0.198], ['mensch-giesser-3', 36.2, 0.232]],   // Bronzegießer: Tiegel kippen und gießen
  stochern: [['mensch-koehler-1', 38.2, 0.151], ['mensch-koehler-2', 35.5, 0.218], ['mensch-koehler-3', 32.6, 0.2]],   // Köhler stochert mit der Stange im Meiler
  waschen: [['mensch-zinnwaescherin-1', 32.3, 0.091], ['mensch-zinnwaescherin-2', 32.7, 0.088], ['mensch-zinnwaescherin-3', 29.4, 0.151]],   // Zinnwäscherin im Bach
  schmuck: [['mensch-schmuck-1', 32.1, 0.144], ['mensch-schmuck-2', 32.3, 0.144], ['mensch-schmuck-3', 32.5, 0.144]],   // Schmuckmacherin klopft den Armreif
  schmieden: [['mensch-schmied-1', 39.5, 0.228], ['mensch-schmied-2', 34.5, 0.229], ['mensch-schmied-3', 35.1, 0.204]],   // Schmied am Amboss
  toepfern: [['mensch-toepferin-1', 29.0, -0.007], ['mensch-toepferin-2', 29.4, -0.004], ['mensch-toepferin-3', 30.4, -0.004]],
  pfluecken: [['mensch-frau-pflueckt-greift', 30, 0.118], ['mensch-frau-pflueckt', 30, 0.1], ['mensch-frau-pflueckt-korb', 33.6, -0.164]],
  pflanzen: [['mensch-frau-pflanzt-graben', 30.5, 0.156], ['mensch-frau-pflanzt', 30, 0.1], ['mensch-frau-pflanzt-fertig', 30.7, 0.054]],
};
// Eigener Ablauf einer Bewegung: speed = Durchläufe je Sekunde, keys = [Bild, Beginn im Durchlauf]. Ohne Angabe wie die Werkzeuge.
const ANIM_TIMING = {
  bogen: { speed: 0.45, keys: [[0, 0], [1, 0.25], [2, 0.75]] },   // Pfeil nehmen, lange zielen, Schuss, wieder von vorn
  speerwurf: { speed: 0.45, keys: [[0, 0], [1, 0.6], [2, 0.68]] },   // lange ausholen, schnell werfen, nachschauen
  malen: { speed: 0.3, keys: [[0, 0], [1, 0.2], [2, 0.5], [1, 0.8]] },   // Pinsel eintauchen, in Kopfhöhe malen, hoch oben malen, wieder herunter
  schaben: { speed: 0.5, keys: [[0, 0], [1, 0.25], [2, 0.5], [1, 0.75]] },   // Schaber gleichmäßig vor und zurück
  steinschlag: { speed: 0.8, keys: [[0, 0], [1, 0.6], [2, 0.7], [1, 0.9]] },   // langsam heben, schnell schlagen, Splitter fliegen
  hirte: { speed: 0.22, keys: [[0, 0], [1, 0.45], [2, 0.6], [1, 0.8]] },   // steht lange ruhig, hebt den Stab, ruft die Ziegen
  bergbau: { speed: 0.9, keys: [[0, 0], [1, 0.6], [2, 0.7], [1, 0.9]] },   // Kupferhacke langsam heben, schnell zuschlagen
  blasebalg: { speed: 0.6, keys: [[0, 0], [1, 0.4], [2, 0.55], [1, 0.85]] },   // Gewicht verlagern, Balg flach treten, Luft strömt, wieder hoch
  giessen: { speed: 0.3, keys: [[0, 0], [1, 0.4], [2, 0.75]] },   // Tiegel ruhig halten, langsam gießen, letzte Tropfen
  stochern: { speed: 0.45, keys: [[0, 0], [1, 0.45], [2, 0.6], [1, 0.85]] },   // Stange heben, nach vorn schieben, tief hineinstoßen
  waschen: { speed: 0.35, keys: [[2, 0], [0, 0.25], [1, 0.5], [0, 0.75]] },   // Kies schöpfen, anheben, hin und her schwenken
  schmuck: { speed: 0.9, keys: [[0, 0], [1, 0.55], [2, 0.7], [1, 0.9]] },   // Hämmerchen heben, kurz aufklopfen
  schmieden: { speed: 0.8, keys: [[0, 0], [1, 0.55], [2, 0.7], [1, 0.9]] },   // Hammer langsam heben, schnell auf die glühende Klinge
  toepfern: { speed: 0.2, keys: [[0, 0], [1, 0.35], [2, 0.75]] },
  pflanzen: { speed: 0.22, keys: [[0, 0], [1, 0.4], [2, 0.75]] },   // Loch graben, Setzling hineindrücken, aufrichten und anschauen
  pfluecken: { speed: 0.35, keys: [[0, 0], [1, 0.3], [2, 0.65]] },   // nach der Beere greifen, pflücken, in den Korb legen   // Klumpen formen, Rand glätten, fertigen Topf betrachten, dann der nächste
};
for (const list of Object.values(ANIM_POSES)) for (const [name] of list) if (!LIFE_NAMES.includes(name)) LIFE_NAMES.push(name);

// Welche Bilder gerade zu sehen sind: [[Bildnummer, Deckkraft], …]. Ausholen ist langsam, der Schlag schnell. Dazwischen wird
// kurz überblendet, das macht die Bewegung weich. Zwei Bilder: oben, unten. Drei Bilder: oben, Mitte, unten, Mitte, oben.
function poseMix(n, cyc, own) {
  const keys = own || (n >= 3 ? [[0, 0], [1, 0.58], [2, 0.7], [1, 0.9]] : [[0, 0], [1, 0.7]]);
  let k = keys.length - 1;
  while (keys[k][1] > cyc) k--;
  const next = keys[(k + 1) % keys.length], end = k === keys.length - 1 ? 1 : next[1];
  const fade = 0.05, left = end - cyc;
  if (left >= fade) return [[keys[k][0], 1]];
  return [[keys[k][0], 1], [next[0], 1 - left / fade]];
}

// Wo beginnen die Beine (Anteil der Bildhöhe von oben)? Für die Laufbewegung.
const LEGS = { 'mensch-mann': 0.6, 'mensch-frau': 0.62, 'mensch-mann-leer': 0.62, 'mensch-frau-leer': 0.62, 'mensch-jaeger': 0.62, 'mensch-jaeger-bogen-1': 0.62, 'mensch-jaeger-beute': 0.66, 'mensch-tongrube-korb': 0.66, 'mensch-bergmann-korb': 0.64, 'mensch-mann-stein': 0.62, 'mensch-hirte': 0.62, hirsch: 0.58, ziege: 0.6, mammut: 0.7 };

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
  return life.felled.filter(f => landMask[f.y * N + f.x] === 2).map(f => ({ d: f.x + f.y + 1, kind: 'leben', draw: () => {
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
  // Wer unter den Wolken ist, wird nicht gezeichnet (Jäger, Holzsammler am Rand, flüchtende Tiere)
  const inView = (x, y) => x >= range.x0 - 1 && x <= range.x1 + 1 && y >= range.y0 - 1 && y <= range.y1 + 1 && landMask[Math.floor(y) * N + Math.floor(x)] === 2;
  const t = frameTime;
  out.push(...felledObjects(lifeDt));
  out.push(...hunterObjects(inView, t));
  out.push(...tripObjects(inView, t));
  out.push(...spotObjects(inView, t));
  out.push(...traderObjects(inView, t));
  out.push(...workerObjects(inView, t));
  out.push(...visitorObjects(inView, t));
  for (const w of life.walkers) {
    if (!inView(w.x, w.y)) continue;
    const moving = w.wait <= 0;
    out.push({ d: w.x + w.y - 0.5, kind: 'leben', draw: () =>
      drawCreature(personImg(w.img, 'leer'), w.x, w.y, 32, w.face, moving ? Math.abs(Math.sin(t * 9 + w.ph)) * 1.2 * cam.zoom : 0, '🧍', moving ? t * 9 + w.ph : null) });
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
  range = clipToLand(range);   // Fische und Schmetterlinge nur über eigenem Land
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
      if (inMap(x, y) && terrain[y * N + x] === TERRAIN.wasser.id && landMask[y * N + x] === 2) { life.jumps.push({ x: x + 0.5, y: y + 0.5, k: 0, face: lifeRandom() < 0.5 ? 1 : -1 }); break; }
    }
  }
  for (const j of life.jumps) j.k += dt / 1.1;
  life.jumps = life.jumps.filter(j => j.k < 1.6);
  // Schmetterlinge: über Blumen im sichtbaren Bereich
  if (life.butterflies.length < 6) {
    const x = range.x0 + Math.floor(lifeRandom() * (range.x1 - range.x0 + 1)), y = range.y0 + Math.floor(lifeRandom() * (range.y1 - range.y0 + 1));
    if (inMap(x, y) && terrain[y * N + x] === TERRAIN.gras.id && hash(x, y + 3) > 0.92 && !occ[y * N + x] && landMask[y * N + x] === 2) {
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
on('rockMined', t => { if ((typeof gameRunning === 'undefined' || gameRunning) && !offlineRunning) addFelled(t.x, t.y, 'fels'); });
on('treeFelled', t => { if ((typeof gameRunning === 'undefined' || gameRunning) && !offlineRunning) addFelled(t.x, t.y, 'wald'); });
