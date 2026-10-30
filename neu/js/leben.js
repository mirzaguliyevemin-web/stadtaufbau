// Epochia – Leben auf der Karte: Menschen laufen auf den Trampelpfaden, Hirsche und eine Mammutherde ziehen
// umher, Ziegen grasen am Gehege, Fische springen, Vögel fliegen vorbei, Schmetterlinge flattern über den Blumen.
// Reine Darstellung: nichts davon wird gespeichert oder beeinflusst das Spiel.

const LIFE_NAMES = ['mensch-mann', 'mensch-frau', 'mammut', 'hirsch', 'ziege'];

const life = { walkers: [], animals: [], birds: [], jumps: [], butterflies: [], birdTimer: 4, fishTimer: 1, herdTimer: 0 };

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
  // Mammutherde: drei Tiere ziehen gemeinsam, weit weg vom Lager
  life.herdTimer -= dt;
  if (!life.animals.some(a => a.kind === 'mammut') && life.herdTimer <= 0) {
    const p = randomFreeTile(cx, cy, 26, 14);
    if (p) for (let i = 0; i < 3; i++) spawnAnimal('mammut', p[0] + (i % 2), p[1] + Math.floor(i / 2), { home: p, herd: i });
    life.herdTimer = 20;
  }
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
    const speed = a.kind === 'mammut' ? 0.35 : a.kind === 'hirsch' ? 0.9 : 0.5;
    const dx = a.tx - a.x, dy = a.ty - a.y, dist = Math.hypot(dx, dy);
    if (dist < 0.05) {
      a.wait -= dt;
      if (a.wait > 0) continue;
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
    if (!animalFree(Math.floor(nx), Math.floor(ny))) { a.tx = a.x; a.ty = a.y; continue; }   // Hindernis: stehen bleiben
    a.x = nx; a.y = ny;
    const sx = dx - dy;
    if (Math.abs(sx) > 0.01) a.face = sx > 0 ? -1 : 1;
  }
}

// Figur mit Schatten zeichnen. Bilder schauen nach links; face = -1 spiegelt nach rechts.
function drawCreature(name, x, y, height, face, bob, fallback) {
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
  ctx.drawImage(img, -w / 2, -h, w, h);
  ctx.restore();
}

// Alles, was auf dem Boden läuft, für die Tiefensortierung in drawScene
function lifeObjects(range) {
  const out = [];
  const inView = (x, y) => x >= range.x0 - 1 && x <= range.x1 + 1 && y >= range.y0 - 1 && y <= range.y1 + 1;
  const t = frameTime;
  for (const w of life.walkers) {
    if (!inView(w.x, w.y)) continue;
    const moving = w.wait <= 0;
    out.push({ d: w.x + w.y - 0.5, kind: 'leben', draw: () =>
      drawCreature(w.img, w.x, w.y, 32, w.face, moving ? Math.abs(Math.sin(t * 9 + w.ph)) * 2 * cam.zoom : 0, '🧍') });
  }
  for (const a of life.animals) {
    if (!inView(a.x, a.y)) continue;
    const moving = Math.hypot(a.tx - a.x, a.ty - a.y) > 0.05;
    const size = a.kind === 'mammut' ? 56 : a.kind === 'hirsch' ? 32 : 22;
    const bob = moving ? Math.abs(Math.sin(t * (a.kind === 'mammut' ? 4 : 8) + a.ph)) * 1.5 * cam.zoom : 0;
    const icon = a.kind === 'mammut' ? '🦣' : a.kind === 'hirsch' ? '🦌' : '🐐';
    out.push({ d: a.x + a.y - 0.5, kind: 'leben', draw: () => drawCreature(a.kind, a.x, a.y, size, a.face, bob, icon) });
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

function updateLife(dt, range) {
  if (!state || !occ) return;
  updateWalkers(dt);
  updateAnimals(dt);
  updateSky(dt, range);
}

// Neues Spiel oder anderer Spielstand: alles Lebendige neu verteilen
function resetLife() {
  life.walkers = []; life.animals = []; life.birds = []; life.jumps = []; life.butterflies = [];
}
