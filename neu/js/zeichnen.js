'use strict';
// Epochia – Zeichnen in Schrägansicht (isometrisch). Jedes Feld ist eine Raute, doppelt so breit wie hoch.
// Hintere Dinge werden zuerst gezeichnet, vordere davor. Der Boden wird vorab in Stücke gezeichnet.

const TW = CONFIG.tileW, TH = CONFIG.tileH;
const CHUNK = 16;   // Boden-Stück = 16 × 16 Felder

const cam = { x: 0, y: N * TH / 2, zoom: 0.8 };
const ZOOM_MIN = 0.3, ZOOM_MAX = 2.2;
let canvas = null, ctx = null, viewW = 800, viewH = 450, dpr = 1;
let chunks = [];          // vorgezeichnete Boden-Stücke (null = neu zeichnen)
let frameTime = 0;        // Sekunden seit dem Start (für Bewegungen)

// Bilder: bilder/epochia/<name>.webp – fehlt eins, zeichnen wir einen Platzhalter
const IMAGE_DIR = '../bilder/epochia/';
const images = {};

function loadImage(name) {
  return new Promise(resolve => {
    if (typeof Image === 'undefined') return resolve(false);
    const img = new Image();
    img.onload = () => { img.ecke = measureCorner(img); images[name] = img; resolve(true); };
    img.onerror = () => resolve(false);
    img.src = IMAGE_DIR + name + '.webp';
  });
}

// Gebäudebild: In welcher Höhe (Anteil der Bildhöhe) liegen die linke und rechte Ecke der Grasplatte?
// Das ist die erste Zeile, in der das Bild (fast) seine volle Breite hat – darunter steht nur noch der Erdsockel.
function measureCorner(img) {
  try {
    const w = Math.min(256, img.width), h = Math.round(img.height * w / img.width);
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0, w, h);
    const data = g.getImageData(0, 0, w, h).data;
    const widths = [];
    for (let y = 0; y < h; y++) {
      let left = -1, right = -1;
      for (let x = 0; x < w; x++) if (data[(y * w + x) * 4 + 3] > 128) { if (left < 0) left = x; right = x; }
      widths.push(left < 0 ? 0 : right - left);
    }
    const max = Math.max(...widths);
    return widths.findIndex(v => v >= max * 0.985) / h;
  } catch (e) {
    return 0.55;   // Bild nicht lesbar: ungefährer Wert
  }
}

function imageNames() {
  const names = new Set(['start', 'ladebild', 'aeltester-1', 'baum-laub', 'baum-tanne', 'fels-gross', 'fels-klein']);
  for (const b of Object.values(BUILDINGS)) if (b.bild) names.add(b.bild);
  return [...names];
}

// ---------------------------------------------------------------------
// Umrechnen: Feld ↔ Welt ↔ Bildschirm
// ---------------------------------------------------------------------

// Obere Ecke des Feldes (x, y) in Welt-Bildpunkten
function tileToWorld(x, y) { return { x: (x - y) * TW / 2, y: (x + y) * TH / 2 }; }

function worldToScreen(wx, wy) {
  return { x: (wx - cam.x) * cam.zoom + viewW / 2, y: (wy - cam.y) * cam.zoom + viewH / 2 };
}

function tileToScreen(x, y) { const w = tileToWorld(x, y); return worldToScreen(w.x, w.y); }

// Bildschirmpunkt → Feld (mit Nachkommastellen)
function screenToTileF(sx, sy) {
  const wx = (sx - viewW / 2) / cam.zoom + cam.x;
  const wy = (sy - viewH / 2) / cam.zoom + cam.y;
  return { x: (wx / (TW / 2) + wy / (TH / 2)) / 2, y: (wy / (TH / 2) - wx / (TW / 2)) / 2 };
}

function screenToTile(sx, sy) {
  const t = screenToTileF(sx, sy);
  return { x: Math.floor(t.x), y: Math.floor(t.y) };
}

function clampCamera() {
  cam.zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, cam.zoom));
  cam.x = Math.min(N * TW / 2, Math.max(-N * TW / 2, cam.x));
  cam.y = Math.min(N * TH, Math.max(0, cam.y));
}

function centerOnTile(x, y) {
  const w = tileToWorld(x, y);
  cam.x = w.x; cam.y = w.y;
  clampCamera();
}

// Start-Zoom: etwa 10 kleine Gebäude passen quer auf den Bildschirm
function defaultZoom() { return Math.min(1.4, Math.max(0.45, viewW / (10 * 2 * TW))); }

function zoomAt(sx, sy, factor) {
  const before = screenToWorld(sx, sy);
  cam.zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, cam.zoom * factor));
  const after = screenToWorld(sx, sy);
  cam.x += before.x - after.x;
  cam.y += before.y - after.y;
  clampCamera();
}

function screenToWorld(sx, sy) {
  return { x: (sx - viewW / 2) / cam.zoom + cam.x, y: (sy - viewH / 2) / cam.zoom + cam.y };
}

// ---------------------------------------------------------------------
// Hilfen
// ---------------------------------------------------------------------

function shade(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  const f = c => Math.max(0, Math.min(255, Math.round(c + (amount > 0 ? (255 - c) * amount : c * amount))));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

function hash(x, y) {
  let h = (x * 374761393 + y * 668265263) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// Raute über einen Bereich von Feldern (x, y, Breite w, Tiefe h) als Pfad
function diamondPath(c, x, y, w, h, toPoint, grow = 0) {
  const a = toPoint(x, y), b = toPoint(x + w, y), d = toPoint(x + w, y + h), e = toPoint(x, y + h);
  c.beginPath();
  c.moveTo(a.x, a.y - grow);
  c.lineTo(b.x + grow * 2, b.y);
  c.lineTo(d.x, d.y + grow);
  c.lineTo(e.x - grow * 2, e.y);
  c.closePath();
}

// ---------------------------------------------------------------------
// Boden: vorab in Stücke gezeichnet (schnell, kein Ruckeln)
// ---------------------------------------------------------------------

function onTerrainChanged() { chunks = []; }

function groundColor(x, y) {
  const t = terrain[y * N + x];
  const v = hash(x, y) * 0.08 - 0.04;
  if (t === TERRAIN.wasser.id) return shade(TERRAIN.wasser.color, v * 0.5);
  if (t === TERRAIN.sand.id) return shade(TERRAIN.sand.color, v);
  if (t === TERRAIN.wald.id) return shade('#68b048', v);
  if (t === TERRAIN.fels.id) return shade('#88ad62', v);
  return shade(TERRAIN.gras.color, v);
}

function renderChunk(cx, cy) {
  const c = typeof document !== 'undefined' ? document.createElement('canvas') : null;
  if (!c || !c.getContext) return null;
  const x0 = cx * CHUNK, y0 = cy * CHUNK;
  const left = (x0 - (y0 + CHUNK)) * TW / 2, top = (x0 + y0) * TH / 2;
  c.width = CHUNK * TW;
  c.height = CHUNK * TH + 2;
  const g = c.getContext('2d');
  const toPoint = (x, y) => ({ x: (x - y) * TW / 2 - left, y: (x + y) * TH / 2 - top });
  for (let y = y0; y < y0 + CHUNK; y++)
    for (let x = x0; x < x0 + CHUNK; x++) {
      g.fillStyle = groundColor(x, y);
      diamondPath(g, x, y, 1, 1, toPoint, 0.6);
      g.fill();
      // helle Uferkante am Wasser
      if (terrain[y * N + x] === TERRAIN.wasser.id && hash(x + 7, y) > 0.7) {
        const p = toPoint(x + 0.5, y + 0.5);
        g.strokeStyle = 'rgba(255,255,255,0.35)';
        g.lineWidth = 1.5;
        g.beginPath(); g.moveTo(p.x - 8, p.y); g.lineTo(p.x + 6, p.y); g.stroke();
      }
      // kleine Blumen auf der Wiese
      if (terrain[y * N + x] === TERRAIN.gras.id && hash(x, y + 3) > 0.92) {
        const p = toPoint(x + 0.5, y + 0.5);
        g.fillStyle = hash(x + 1, y) > 0.5 ? '#ffe36b' : '#ff9ec7';
        g.beginPath(); g.arc(p.x, p.y, 2.2, 0, 7); g.fill();
      }
    }
  return { canvas: c, left, top };
}

function drawGround(range) {
  const per = N / CHUNK;
  if (!chunks.length) chunks = new Array(per * per).fill(null);
  for (let cy = Math.floor(range.y0 / CHUNK); cy <= Math.floor(range.y1 / CHUNK); cy++)
    for (let cx = Math.floor(range.x0 / CHUNK); cx <= Math.floor(range.x1 / CHUNK); cx++) {
      if (cx < 0 || cy < 0 || cx >= per || cy >= per) continue;
      const k = cy * per + cx;
      if (!chunks[k]) chunks[k] = renderChunk(cx, cy);
      const ch = chunks[k];
      if (!ch) continue;
      const p = worldToScreen(ch.left, ch.top);
      ctx.drawImage(ch.canvas, p.x, p.y, ch.canvas.width * cam.zoom, ch.canvas.height * cam.zoom);
    }
}

// Sichtbarer Bereich in Feldern (mit Rand)
function visibleRange() {
  const pts = [screenToTileF(0, 0), screenToTileF(viewW, 0), screenToTileF(0, viewH), screenToTileF(viewW, viewH)];
  const m = 5;
  return {
    x0: Math.max(0, Math.floor(Math.min(...pts.map(p => p.x))) - m),
    x1: Math.min(N - 1, Math.ceil(Math.max(...pts.map(p => p.x))) + m),
    y0: Math.max(0, Math.floor(Math.min(...pts.map(p => p.y))) - m),
    y1: Math.min(N - 1, Math.ceil(Math.max(...pts.map(p => p.y))) + m),
  };
}

// ---------------------------------------------------------------------
// Bäume und Felsen (als kleine vorgezeichnete Bilder)
// ---------------------------------------------------------------------

const sprites = {};

function makeSprite(key, w, h, draw) {
  if (sprites[key] !== undefined) return sprites[key];
  const c = typeof document !== 'undefined' ? document.createElement('canvas') : null;
  if (!c || !c.getContext) return (sprites[key] = null);
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  return (sprites[key] = c);
}

function treeSprite(variant) {
  return makeSprite('baum' + variant, 64, 96, (g, w, h) => {
    g.fillStyle = 'rgba(0,0,0,0.18)';
    g.beginPath(); g.ellipse(w / 2, h - 10, 20, 8, 0, 0, 7); g.fill();
    g.fillStyle = '#7a5230';
    g.fillRect(w / 2 - 4, h - 34, 8, 26);
    if (variant === 2) {   // Tanne
      for (let i = 0; i < 3; i++) {
        g.fillStyle = shade('#2f7d3a', i * 0.08);
        g.beginPath();
        g.moveTo(w / 2, 6 + i * 16); g.lineTo(w / 2 + 22 - i * 3, 44 + i * 14); g.lineTo(w / 2 - 22 + i * 3, 44 + i * 14);
        g.closePath(); g.fill();
      }
    } else {
      const base = variant === 1 ? '#4c9e3c' : '#3f8f36';
      [[0, 40, 22], [-11, 48, 15], [11, 46, 16], [0, 28, 16]].forEach(([dx, dy, r], i) => {
        g.fillStyle = shade(base, i * 0.07);
        g.beginPath(); g.arc(w / 2 + dx, dy, r, 0, 7); g.fill();
      });
      g.fillStyle = 'rgba(255,255,255,0.15)';
      g.beginPath(); g.arc(w / 2 - 7, 30, 8, 0, 7); g.fill();
    }
  });
}

function rockSprite(variant) {
  return makeSprite('fels' + variant, 64, 56, (g, w, h) => {
    g.fillStyle = 'rgba(0,0,0,0.18)';
    g.beginPath(); g.ellipse(w / 2, h - 12, 24, 9, 0, 0, 7); g.fill();
    const big = variant === 0;
    g.fillStyle = '#9a9a96';
    g.beginPath();
    g.moveTo(w / 2 - (big ? 24 : 16), h - 12);
    g.lineTo(w / 2 - (big ? 16 : 10), h - (big ? 38 : 26));
    g.lineTo(w / 2 + 2, h - (big ? 46 : 30));
    g.lineTo(w / 2 + (big ? 20 : 14), h - (big ? 32 : 22));
    g.lineTo(w / 2 + (big ? 24 : 16), h - 12);
    g.closePath(); g.fill();
    g.fillStyle = '#b8b8b2';
    g.beginPath();
    g.moveTo(w / 2 - (big ? 16 : 10), h - (big ? 38 : 26));
    g.lineTo(w / 2 + 2, h - (big ? 46 : 30));
    g.lineTo(w / 2 + 4, h - 22);
    g.closePath(); g.fill();
  });
}

function drawTerrainObject(x, y, kind) {
  const p = tileToScreen(x + 0.5, y + 0.5);
  const v = hash(x, y);
  let img, s;
  if (kind === 'wald') {
    img = images[v > 0.7 ? 'baum-tanne' : 'baum-laub'] || treeSprite(v > 0.7 ? 2 : v > 0.35 ? 1 : 0);
    s = (0.95 + v * 0.3) * cam.zoom;
  } else {
    img = images[v > 0.5 ? 'fels-gross' : 'fels-klein'] || rockSprite(v > 0.5 ? 0 : 1);
    s = 0.9 * cam.zoom;
  }
  if (!img) return;
  const w = (img.width > 200 ? TW * 1.1 : img.width) * s;
  const h = w * img.height / img.width;
  const ox = (hash(y, x) - 0.5) * 10 * cam.zoom;
  ctx.drawImage(img, p.x - w / 2 + ox, p.y - h + (img.width > 200 ? h * 0.12 : 10 * s), w, h);
}

// ---------------------------------------------------------------------
// Gebäude
// ---------------------------------------------------------------------

function drawPlot(x, y, s, fill, stroke) {
  diamondPath(ctx, x, y, s, s, tileToScreen);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = Math.max(1, 1.5 * cam.zoom);
  ctx.stroke();
}

// Platzhalter-Gebäude: Kasten mit Dach und Zeichen, bis Emins Bild da ist
function drawPlaceholder(def, x, y, s, lift) {
  const m = s === 1 ? 0 : 0.22 * s;
  const height = (s === 1 ? 0 : (0.55 + s * 0.22) * TH) * cam.zoom;
  const pt = (tx, ty) => { const p = tileToScreen(tx, ty); return { x: p.x, y: p.y - lift }; };
  const a = pt(x + m, y + m), b = pt(x + s - m, y + m), c = pt(x + s - m, y + s - m), d = pt(x + m, y + s - m);
  if (s === 1) return;
  const color = def.color || '#a08060';
  // linke Wand
  ctx.fillStyle = shade(color, -0.15);
  ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(c.x, c.y); ctx.lineTo(c.x, c.y - height); ctx.lineTo(d.x, d.y - height); ctx.closePath(); ctx.fill();
  // rechte Wand
  ctx.fillStyle = shade(color, -0.32);
  ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(b.x, b.y); ctx.lineTo(b.x, b.y - height); ctx.lineTo(c.x, c.y - height); ctx.closePath(); ctx.fill();
  // Dach (oben)
  ctx.fillStyle = shade(color, 0.18);
  ctx.beginPath();
  ctx.moveTo(a.x, a.y - height); ctx.lineTo(b.x, b.y - height); ctx.lineTo(c.x, c.y - height); ctx.lineTo(d.x, d.y - height);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(60,35,20,0.55)';
  ctx.lineWidth = Math.max(1, 1.2 * cam.zoom);
  ctx.stroke();
  // Tür vorne links
  const door = pt(x + s / 2, y + s - m);
  ctx.fillStyle = 'rgba(50,30,15,0.7)';
  const dw = 7 * cam.zoom * Math.min(2, s / 2 + 0.5), dh = Math.min(height * 0.6, 16 * cam.zoom * Math.min(2, s / 2 + 0.5));
  ctx.fillRect(door.x - dw - 2 * cam.zoom, door.y - dh - 2 * cam.zoom, dw, dh);
  // Zeichen auf dem Dach
  const top = pt(x + s / 2, y + s / 2);
  ctx.font = `${Math.round(TW * 0.32 * s * cam.zoom)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(def.icon, top.x, top.y - height - 2 * cam.zoom);
}

function drawBuildingSprite(type, x, y, rot, lift = 0, alpha = 1) {
  const def = BUILDINGS[type];
  const s = def.size;
  ctx.globalAlpha = alpha;
  if (def.isPath) {
    drawPlot(x, y, 1, '#c9a874', '#a88a58');
    ctx.globalAlpha = 1;
    return;
  }
  const img = def.bild && images[def.bild];
  if (img) {
    // Bild: Grasplatte füllt die volle Breite; ihre seitlichen Ecken liegen auf den Ecken der Raute
    const left = tileToScreen(x, y + s), right = tileToScreen(x + s, y);
    const w = right.x - left.x, h = w * img.height / img.width;
    ctx.save();
    ctx.translate((left.x + right.x) / 2, left.y - lift);
    if (rot) ctx.scale(-1, 1);
    ctx.drawImage(img, -w / 2, -h * img.ecke, w, h);
    ctx.restore();
  } else {
    drawPlot(x, y, s, lift ? 'rgba(160,220,110,0.9)' : '#93d466', '#6fae48');
    drawPlaceholder(def, x, y, s, lift);
  }
  ctx.globalAlpha = 1;
}

function drawConstruction(b) {
  const def = BUILDINGS[b.type];
  const s = def.size;
  drawPlot(b.x, b.y, s, '#c8b07a', '#9c8452');
  // Gerüst
  const height = (0.55 + s * 0.22) * TH * cam.zoom;
  const m = 0.25 * s;
  ctx.strokeStyle = '#7a5230';
  ctx.lineWidth = Math.max(1.5, 3 * cam.zoom);
  const corners = [[b.x + m, b.y + m], [b.x + s - m, b.y + m], [b.x + s - m, b.y + s - m], [b.x + m, b.y + s - m]].map(([tx, ty]) => tileToScreen(tx, ty));
  ctx.beginPath();
  for (const p of corners) { ctx.moveTo(p.x, p.y); ctx.lineTo(p.x, p.y - height); }
  ctx.moveTo(corners[3].x, corners[3].y - height * 0.6); ctx.lineTo(corners[2].x, corners[2].y - height * 0.6);
  ctx.moveTo(corners[2].x, corners[2].y - height * 0.6); ctx.lineTo(corners[1].x, corners[1].y - height * 0.6);
  ctx.moveTo(corners[3].x, corners[3].y - height); ctx.lineTo(corners[2].x, corners[2].y - height); ctx.lineTo(corners[1].x, corners[1].y - height);
  ctx.stroke();
  // Fortschrittsbalken und Restzeit
  const total = def.time || 1;
  const done = 1 - b.build / total;
  const top = tileToScreen(b.x + s / 2, b.y + s / 2);
  const bw = Math.max(40, s * TW * 0.5 * cam.zoom), bh = Math.max(6, 8 * cam.zoom);
  const by = top.y - height - 18 * cam.zoom;
  ctx.fillStyle = 'rgba(40,25,10,0.7)';
  roundRect(top.x - bw / 2 - 2, by - 2, bw + 4, bh + 4, 4); ctx.fill();
  ctx.fillStyle = '#8fd14f';
  roundRect(top.x - bw / 2, by, bw * Math.max(0, Math.min(1, done)), bh, 3); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${Math.max(11, Math.round(12 * cam.zoom))}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('🔨 ' + formatTime(b.build), top.x, by - 3);
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Sprechblase über einem Gebäude: was es gerade herstellt (oder was fehlt)
function drawBubble(i) {
  const b = state.buildings[i];
  const def = BUILDINGS[b.type];
  if (b.build || !def.produces || cam.zoom < 0.45) return;
  let icon;
  const lacking = def.consumes && Object.keys(def.consumes).find(id => (state.res[id] || 0) < 0.5);
  if (def.workers && !(stats.staff[i] > 0)) icon = '👤❗';
  else if (lacking) icon = RESOURCES[lacking].icon + '❗';
  else {
    // Blasen kommen und gehen, damit nicht alles gleichzeitig blinkt
    const phase = (frameTime / 4 + hash(b.x, b.y)) % 1;
    if (phase > 0.55) return;
    icon = RESOURCES[Object.keys(def.produces)[0]].icon;
  }
  const s = def.size;
  const top = tileToScreen(b.x + s / 2, b.y + s / 2);
  const bob = Math.sin(frameTime * 2.5 + b.x) * 2 * cam.zoom;
  const size = Math.max(14, 18 * cam.zoom);
  const y = top.y - (0.55 + s * 0.22) * TH * cam.zoom - size * 1.6 + bob - (images[def.bild] ? s * TH * 0.5 * cam.zoom : 0);
  ctx.font = `${Math.round(size)}px sans-serif`;
  const w = ctx.measureText(icon).width + size * 0.8;
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  roundRect(top.x - w / 2, y - size * 0.75, w, size * 1.5, size * 0.6); ctx.fill();
  ctx.beginPath(); ctx.moveTo(top.x - 5, y + size * 0.7); ctx.lineTo(top.x + 5, y + size * 0.7); ctx.lineTo(top.x, y + size * 1.1); ctx.fill();
  ctx.fillStyle = '#000';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(icon, top.x, y);
}

// ---------------------------------------------------------------------
// Bild zusammensetzen
// ---------------------------------------------------------------------

function drawPlots(range) {
  const ps = CONFIG.plotSize;
  const price = plotPrice();
  for (let p = 0; p < state.plots.length; p++) {
    if (state.plots[p] === 1) continue;
    const px = (p % PLOTS) * ps, py = Math.floor(p / PLOTS) * ps;
    if (px > range.x1 || py > range.y1 || px + ps < range.x0 || py + ps < range.y0) continue;
    diamondPath(ctx, px, py, ps, ps, tileToScreen, 0.5);
    ctx.fillStyle = 'rgba(30,40,20,0.38)';
    ctx.fill();
    if (canBuyPlot(p) && cam.zoom > 0.35) {
      const c = tileToScreen(px + ps / 2, py + ps / 2);
      const size = Math.max(12, 15 * cam.zoom);
      ctx.font = `bold ${Math.round(size)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const text = '🛒 ' + formatAmounts(price);
      const w = ctx.measureText(text).width + 16;
      ctx.fillStyle = canAfford(price) ? 'rgba(255,248,225,0.92)' : 'rgba(220,210,190,0.8)';
      roundRect(c.x - w / 2, c.y - size, w, size * 2, size * 0.5); ctx.fill();
      ctx.fillStyle = '#4a3420';
      ctx.fillText(text, c.x, c.y + 1);
    }
  }
}

function drawGrid(range) {
  ctx.strokeStyle = 'rgba(255,255,255,0.28)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = range.x0; x <= range.x1 + 1; x++) {
    const a = tileToScreen(x, range.y0), b = tileToScreen(x, range.y1 + 1);
    ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
  }
  for (let y = range.y0; y <= range.y1 + 1; y++) {
    const a = tileToScreen(range.x0, y), b = tileToScreen(range.x1 + 1, y);
    ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
  }
  ctx.stroke();
}

// Geplantes oder hochgehobenes Gebäude: schwebt, Raute grün (passt) oder rot (passt nicht), Eckmarken
function drawGhost(g) {
  const def = BUILDINGS[g.type];
  const s = def.size;
  const ok = !ghostProblem();
  diamondPath(ctx, g.x, g.y, s, s, tileToScreen);
  ctx.fillStyle = ok ? 'rgba(90,220,90,0.45)' : 'rgba(235,70,60,0.5)';
  ctx.fill();
  // Eckmarken
  ctx.strokeStyle = ok ? '#3fdc4f' : '#ff5a4a';
  ctx.lineWidth = Math.max(2, 4 * cam.zoom);
  const corners = [[g.x, g.y], [g.x + s, g.y], [g.x + s, g.y + s], [g.x, g.y + s]];
  const center = tileToScreen(g.x + s / 2, g.y + s / 2);
  for (const [cx, cy] of corners) {
    const p = tileToScreen(cx, cy);
    const k = 0.22;
    ctx.beginPath();
    ctx.moveTo(p.x + (center.x - p.x) * k * 1.3, p.y + (center.y - p.y) * k * 0.2);
    ctx.lineTo(p.x, p.y);
    ctx.lineTo(p.x + (center.x - p.x) * k * 0.2, p.y + (center.y - p.y) * k * 1.3);
    ctx.stroke();
  }
  const lift = (10 + Math.sin(frameTime * 4) * 3) * cam.zoom;
  drawBuildingSprite(g.type, g.x, g.y, g.rot, lift, 0.88);
}

function drawScene(dt) {
  if (!ctx || !state) return;
  frameTime += dt;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#5a9a3a';
  ctx.fillRect(0, 0, viewW, viewH);
  const range = visibleRange();
  drawGround(range);
  drawPlots(range);
  if (ghost || pathMode) drawGrid(range);
  if (selected >= 0 && state.buildings[selected]) {
    const b = state.buildings[selected];
    diamondPath(ctx, b.x, b.y, BUILDINGS[b.type].size, BUILDINGS[b.type].size, tileToScreen);
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = Math.max(2, 3 * cam.zoom);
    ctx.stroke();
  }

  // Alles, was nach oben ragt, nach Tiefe sortieren (Mitte des Grundstücks: x + y)
  const objects = [];
  for (let y = range.y0; y <= range.y1; y++)
    for (let x = range.x0; x <= range.x1; x++) {
      const t = terrain[y * N + x];
      if (t === TERRAIN.wald.id) objects.push({ d: x + y + 1, kind: 'wald', x, y });
      else if (t === TERRAIN.fels.id) objects.push({ d: x + y + 1, kind: 'fels', x, y });
    }
  state.buildings.forEach((b, i) => {
    const s = BUILDINGS[b.type].size;
    if (b.x > range.x1 + 1 || b.y > range.y1 + 1 || b.x + s < range.x0 || b.y + s < range.y0) return;
    if (ghost && ghost.from === i) return;   // wird gerade verschoben
    objects.push({ d: BUILDINGS[b.type].isPath ? -1e6 + b.x + b.y : b.x + b.y + s, kind: 'b', i });
  });
  objects.sort((a, b) => a.d - b.d || (a.x || 0) - (b.x || 0));
  for (const o of objects) {
    if (o.kind === 'b') {
      const b = state.buildings[o.i];
      if (b.build > 0) drawConstruction(b);
      else drawBuildingSprite(b.type, b.x, b.y, b.rot);
    } else drawTerrainObject(o.x, o.y, o.kind);
  }
  for (const o of objects) if (o.kind === 'b') drawBubble(o.i);
  if (ghost) drawGhost(ghost);

  // Winter: leichter blauer Schimmer
  if (seasonIndex() === 3) {
    ctx.fillStyle = 'rgba(200,225,255,0.12)';
    ctx.fillRect(0, 0, viewW, viewH);
  }
}

function resizeCanvas() {
  if (!canvas) return;
  dpr = Math.min(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1);
  const r = canvas.getBoundingClientRect();
  viewW = Math.max(1, r.width);
  viewH = Math.max(1, r.height);
  canvas.width = Math.round(viewW * dpr);
  canvas.height = Math.round(viewH * dpr);
}
