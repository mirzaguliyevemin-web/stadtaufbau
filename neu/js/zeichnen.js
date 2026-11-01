'use strict';
// Epochia – Zeichnen in Schrägansicht (isometrisch). Jedes Feld ist eine Raute, doppelt so breit wie hoch.
// Hintere Dinge werden zuerst gezeichnet, vordere davor. Der Boden wird vorab in Stücke gezeichnet.

const TW = CONFIG.tileW, TH = CONFIG.tileH;
const CHUNK = 16;
const FONT = "Fredoka, 'Trebuchet MS', sans-serif";   // Schrift für Texte auf der Karte (Zeichen/Emoji fallen auf die Systemschrift zurück)   // Boden-Stück = 16 × 16 Felder

const cam = { x: 0, y: N * TH / 2, zoom: 0.8 };
const ZOOM_MIN = 0.15, ZOOM_MAX = 3.5;   // Emin: näher heranzoomen (Bilder reichen bis etwa 3,5)
let canvas = null, ctx = null, viewW = 800, viewH = 450, dpr = 1;
// Auflösung: Ist das Handy zu langsam, zeichnet das Spiel mit weniger Bildpunkten (start.js passt das an)
let renderScale = 1;
let chunks = [];          // vorgezeichnete Boden-Stücke (null = neu zeichnen)
let frameTime = 0;        // Sekunden seit dem Start (für Bewegungen)

// Bilder: bilder/epochia/<name>.webp – fehlt eins, zeichnen wir einen Platzhalter
const IMAGE_DIR = '../bilder/epochia/';
const images = {};

function loadImage(name) {
  return new Promise(resolve => {
    if (typeof Image === 'undefined') return resolve(false);
    const img = new Image();
    img.onload = () => {
      img.sockel = STILT_IMAGES[name] ? STILT_IMAGES[name].sockel : measurePlate(img);
      images[name] = STILT_IMAGES[name] ? splitStiltBoat(name, img) : isHalfInWaterImage(name) ? featherWater(img) : img;
      if (GROUND_TEXTURES.includes(name) || name === 'busch' || name === 'blumen') onTerrainChanged();   // Boden neu zeichnen
      resolve(true);
    };
    img.onerror = () => { missingImages.add(name); resolve(false); };
    img.src = IMAGE_DIR + name + '.webp';
  });
}

// Bilder, die es (noch) nicht gibt – dann zeichnet das Spiel den Schnee selbst
const missingImages = new Set();

// Hütte auf Säulen: keine Platte im Bild – die Säulenfüße sind die Ecken der Raute. Das Boot wird aus dem Bild
// gelöst und liegt immer auf einem echten Wasserfeld. Werte in Bildpunkten des Bildes (538 × 640).
const STILT_IMAGES = {
  '1-fischerhuette': {
    sockel: { lx: 22 / 538, ly: 500 / 640, rx: 515 / 538, ry: 495 / 640, fx: 238 / 538, fy: 635 / 640, dicke: 0, farbe: '#6b4a2a', noClip: true },
    boat: 'fischerboot', spanPx: 493,
    outline: [[251, 553], [257, 555], [283, 553], [310, 536], [360, 508], [397, 494], [433, 479], [467, 464], [477, 469], [474, 488], [454, 535], [420, 572], [360, 602], [313, 613], [282, 607], [257, 592], [251, 580]],
  },
};
function splitStiltBoat(name, img) {
  try {
    const d = STILT_IMAGES[name];
    if (typeof document === 'undefined') return img;
    const k = img.width / 538, xs = d.outline.map(p => p[0] * k), ys = d.outline.map(p => p[1] * k);
    const trace = g => { g.beginPath(); xs.forEach((x, i) => g.lineTo(x, ys[i])); g.closePath(); };
    const x0 = Math.floor(Math.min(...xs)), y0 = Math.floor(Math.min(...ys));
    const b = document.createElement('canvas'); b.width = Math.ceil(Math.max(...xs)) - x0; b.height = Math.ceil(Math.max(...ys)) - y0;
    const bg = b.getContext('2d');
    bg.translate(-x0, -y0); trace(bg); bg.clip(); bg.drawImage(img, 0, 0);
    b.spanPx = d.spanPx * k;
    images[d.boat] = b;
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    g.globalCompositeOperation = 'destination-out'; trace(g); g.fill();
    c.sockel = img.sockel;
    return c;
  } catch (e) { return img; }
}

// Wo liegt das Boot der Hütte? Auf dem ersten freien Wasserfeld: zuerst vorne auf der Bootsseite, sonst ringsum.
function stiltBoatSpot(x, y, s, rot) {
  const mirror = (Number(rot) || 0) % 2 === 1;
  const alongY = [[x + s, y + 1], [x + s, y], [x + s + 1, y + 1], [x + s + 1, y]];   // vorne rechts (Boot wie im Bild)
  const alongX = [[x + 1, y + s], [x, y + s], [x + 1, y + s + 1], [x, y + s + 1]];   // vorne links (gespiegelt)
  const back = [[x - 1, y + 1], [x - 1, y], [x + 1, y - 1], [x, y - 1]];
  const order = mirror ? [[alongX, true], [alongY, false], [back, false]] : [[alongY, false], [alongX, true], [back, false]];
  for (const [list, flip] of order) for (const [tx, ty] of list)
    if (inMap(tx, ty) && terrain[ty * N + tx] === TERRAIN.wasser.id && buildingAt(tx, ty) < 0) return { x: tx, y: ty, flip };
  return null;
}

function drawStiltBoat(x, y, s, rot) {
  const img = images.fischerboot, spot = img && stiltBoatSpot(x, y, s, rot);
  if (!spot) return;
  const z = cam.zoom, k = s * TW * z / img.spanPx, w = img.width * k, h = img.height * k;
  const p = tileToScreen(spot.x + 0.5, spot.y + 0.5), bob = Math.sin(frameTime * 1.6 + spot.x + spot.y) * 1.2 * z;
  ctx.save();
  ctx.translate(p.x, p.y + bob);
  if (spot.flip) ctx.scale(-1, 1);
  ctx.fillStyle = 'rgba(15,45,70,0.22)';
  ctx.beginPath(); ctx.ellipse(0, h * 0.12, w * 0.42, h * 0.3, -0.4, 0, 7); ctx.fill();
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  drawSnowOver(img, -w / 2, -h / 2, w, h);
  ctx.restore();
}

// Gebäude halb im Wasser: Das Wasser im Bild läuft zum Rand der Platte hin weich aus, damit es nahtlos in den
// Fluss übergeht (statt mit einer harten Kante darüber zu liegen). Einmal beim Laden, als eigenes Bild (Canvas).
function isHalfInWaterImage(name) {
  return Object.values(BUILDINGS).some(d => halfInWater(d) && d.bild && name.startsWith(d.bild));
}
function featherWater(img) {
  try {
    if (typeof document === 'undefined' || !img.sockel) return img;
    const w = img.width, h = img.height, p = img.sockel;
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const data = g.getImageData(0, 0, w, h), px = data.data;
    if (!px || px.length !== w * h * 4) return img;
    // Grasoberfläche der Platte (Raute) im Bild: linke, rechte, vordere Ecke, hintere = L + R − F
    const up = p.dicke * h;
    const L = [p.lx * w, p.ly * h - up], R = [p.rx * w, p.ry * h - up], F = [p.fx * w, p.fy * h - up];
    const ax = L[0] - F[0], ay = L[1] - F[1], bx = R[0] - F[0], by = R[1] - F[1], det = ax * by - bx * ay;
    if (!det) return img;
    const inside = new Uint8Array(w * h), water = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const dx = x - F[0], dy = y - F[1];
      const u = (dx * by - bx * dy) / det, v = (ax * dy - dx * ay) / det;
      const i = y * w + x;
      if (u >= 0 && v >= 0 && u <= 1 && v <= 1 && px[i * 4 + 3] > 40) inside[i] = 1;
      const r = px[i * 4], gg = px[i * 4 + 1], b = px[i * 4 + 2];
      if (b > r + 20 && b > 90) water[i] = 1;
    }
    // Abstand (in Bildpunkten) vom Plattenrand, nur durch Wasser hindurch
    const RADIUS = Math.round(w * 0.035), dist = new Int16Array(w * h).fill(-1), queue = [];
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      if (!inside[i] || !water[i]) continue;
      if (!inside[i - 1] || !inside[i + 1] || !inside[i - w] || !inside[i + w]) { dist[i] = 0; queue.push(i); }
    }
    for (let q = 0; q < queue.length; q++) {
      const i = queue[q], d = dist[i];
      if (d >= RADIUS) continue;
      for (const j of [i - 1, i + 1, i - w, i + w]) if (j >= 0 && j < w * h && dist[j] < 0 && inside[j] && water[j]) { dist[j] = d + 1; queue.push(j); }
    }
    for (let i = 0; i < w * h; i++) if (dist[i] >= 0) px[i * 4 + 3] = Math.round(px[i * 4 + 3] * (dist[i] + 1) / (RADIUS + 1));
    g.putImageData(data, 0, 0);
    c.sockel = p;
    return c;
  } catch (e) { return img; }
}

// Gebäudebild: Wo liegen die linke, rechte und vordere Ecke der Unterkante des Erdsockels?
// Die Unterkante ist ein flaches „V“; durch beide Schenkel legen wir je eine Gerade (Median der Steigungen,
// damit Pfähle oder Steine am Rand nicht stören). Ergebnis als Anteile von Bildbreite und -höhe.
// Dazu: wie dick ist der Sockel (dicke, Anteil der Bildhöhe) und welche Farbe hat er (farbe)?
function measurePlate(img) {
  try {
    const w = Math.min(512, img.width), h = Math.round(img.height * w / img.width);
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0, w, h);
    const data = g.getImageData(0, 0, w, h).data;
    const bottom = [];
    for (let x = 0; x < w; x++) {
      for (let y = h - 1; y >= 0; y--) if (data[(y * w + x) * 4 + 3] > 128) { bottom.push([x, y]); break; }
    }
    const xl = bottom[0][0], xr = bottom[bottom.length - 1][0], span = xr - xl;
    const fit = (from, to) => {
      const pts = bottom.filter(([x]) => x > xl + from * span && x < xl + to * span);
      const slopes = [];
      for (let i = 0; i < pts.length; i += 3) {
        for (let j = i + 6; j < pts.length; j += 3) slopes.push((pts[j][1] - pts[i][1]) / (pts[j][0] - pts[i][0]));
      }
      const m = median(slopes);
      return { m, b: median(pts.map(([x, y]) => y - m * x)) };
    };
    const l = fit(0.08, 0.42), r = fit(0.58, 0.92);
    const fx = (r.b - l.b) / (l.m - r.m);
    // Sockeldicke: in jeder Spalte von der Unterkante aufwärts die Stelle, wo es deutlich heller wird
    // (dort beginnt die sonnige Oberseite der Platte). Nebenbei die Farbe knapp über der Unterkante sammeln.
    const lum = (x, y) => { const i = (y * w + x) * 4; return 0.3 * data[i] + 0.59 * data[i + 1] + 0.11 * data[i + 2]; };
    const thick = [], color = [0, 0, 0];
    let colorN = 0;
    for (const [x, y0] of bottom) {
      const fr = (x - xl) / span;
      if (!(fr > 0.1 && fr < 0.4) && !(fr > 0.6 && fr < 0.9)) continue;
      if (y0 > 6) {
        const i = ((y0 - 3) * w + x) * 4;
        color[0] += data[i]; color[1] += data[i + 1]; color[2] += data[i + 2]; colorN++;
      }
      const L = [];
      for (let k = 0; k < 0.12 * span && y0 - k - 3 >= 0; k++) L.push((lum(x, y0 - k) + lum(x, y0 - k - 1) + lum(x, y0 - k - 2)) / 3);
      let best = 25, bk = -1;
      for (let k = 3; k < L.length - 3; k++) if (L[k + 2] - L[k - 2] > best) { best = L[k + 2] - L[k - 2]; bk = k; }
      if (bk > 0) thick.push(bk);
    }
    const n = Math.max(1, colorN);
    return {
      lx: xl / w, ly: (l.m * xl + l.b) / h,
      rx: xr / w, ry: (r.m * xr + r.b) / h,
      fx: fx / w, fy: (l.m * fx + l.b) / h,
      dicke: (thick.length ? median(thick) : 0.06 * span) / h,
      farbe: `rgb(${Math.round(color[0] / n)},${Math.round(color[1] / n)},${Math.round(color[2] / n)})`,
    };
  } catch (e) {   // Bild nicht lesbar: ungefähre Werte
    return { lx: 0, ly: 0.62, rx: 1, ry: 0.62, fx: 0.5, fy: 1, dicke: 0.05, farbe: '#7a6a3a' };
  }
}

function median(list) {
  const s = [...list].sort((a, b) => a - b);
  return s.length ? s[s.length >> 1] : 0;
}

function imageNames() {
  const names = new Set(['start', 'ladebild', 'logo', 'aeltester-1', 'baum-laub', 'baum-tanne', 'baum-birke',
    'fels-gross', 'fels-klein', 'busch', 'blumen', 'erdsockel', 'axt', 'hacke', 'setzling', 'truhe', 'band', 'logo-rund', 'berg-gross', 'berg-klein',
    ...Object.values(TREE_SEASONS).flat().filter(Boolean), ...GROUND_TEXTURES, ...LIFE_NAMES]);
  for (const b of Object.values(BUILDINGS)) if (b.bild) {
    names.add(b.bild); names.add(b.bild + '-winter');
    for (const v of b.views || []) { names.add(b.bild + '-' + v); names.add(b.bild + '-' + v + '-winter'); }   // weitere Ansichten zum Drehen (auch im Winter)
  }
  for (const r of Object.values(RESOURCES)) if (r.bild) names.add(r.bild);
  for (const t of Object.values(TECHS)) if (t.bild) names.add(t.bild);
  for (const s of [2, 3, 4]) names.add('1-baustelle-' + s);
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

// Gelände geändert: mit Feld (x, y) nur die Stücke daneben, sonst alle als „veraltet“ markieren. Veraltete Stücke
// werden weiter gezeigt und nach und nach neu gemalt (höchstens eins pro Bild) – so ruckelt ein gefällter Baum nicht.
function onTerrainChanged(x, y) {
  if (!chunks.length) return;
  const per = N / CHUNK;
  if (x === undefined) { for (const ch of chunks) if (ch) ch.stale = true; return; }
  // renderChunk malt 2 Felder über den Rand hinaus – Nachbarstücke können betroffen sein
  for (let cy = Math.floor((y - 2) / CHUNK); cy <= Math.floor((y + 2) / CHUNK); cy++)
    for (let cx = Math.floor((x - 2) / CHUNK); cx <= Math.floor((x + 2) / CHUNK); cx++) {
      const ch = cx >= 0 && cy >= 0 && cx < per && cy < per && chunks[cy * per + cx];
      if (ch) ch.stale = true;
    }
}

function groundColor(x, y) {
  const t = terrain[y * N + x];
  const v = hash(x, y) * 0.08 - 0.04;
  if (t === TERRAIN.wasser.id) return shade(TERRAIN.wasser.color, v * 0.5);
  if (t === TERRAIN.sand.id) return shade(TERRAIN.sand.color, v);
  if (t === TERRAIN.wald.id) return shade('#68b048', v);
  if (t === TERRAIN.fels.id) return shade('#88ad62', v);
  return shade(TERRAIN.gras.color, v);
}

// Boden-Texturen (Draufsicht, nahtlos): eine Textur deckt TEXTURE_TILES × TEXTURE_TILES Felder und wird
// schräg aufs Raster gelegt. ox/oy = wo die obere Ecke von Feld (0, 0) liegt – so passen alle Stücke aneinander.
const TEXTURE_TILES = 4;
const GROUND_TEXTURES = ['wiese', 'wasser', 'sand', 'pfad', 'berg-boden'];

function groundPattern(g, name, ox, oy, zoom = 1) {
  const img = images[name];
  if (!img || !g.createPattern || typeof DOMMatrix === 'undefined') return null;
  const p = g.createPattern(img, 'repeat');
  const k = TEXTURE_TILES / img.width / 2 * zoom;
  p.setTransform(new DOMMatrix([TW * k, TH * k, -TW * k, TH * k, ox, oy]));
  return p;
}

function textureFor(t) {
  return t === TERRAIN.wasser.id ? 'wasser' : t === TERRAIN.sand.id ? 'sand' : 'wiese';
}

// Sand und Wasser als zusammenhängende, runde Flächen (statt eckiger Rauten): dicke Linien mit runden Enden
// zwischen den Mitten benachbarter Felder, gezeichnet in Feld-Koordinaten (g ist schon passend transformiert).
function regionStroke(g, x0, y0, x1, y1, inRegion) {
  g.beginPath();
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      if (!inMap(x, y) || !inRegion(x, y)) continue;
      const cx = x + 0.5, cy = y + 0.5;
      // Felder mitten in der Fläche brauchen nur zwei Linien (breiter Fluss: spart viel Rechenzeit)
      if (inMap(x - 1, y - 1) && inMap(x + 1, y + 1) && inRegion(x - 1, y) && inRegion(x + 1, y) && inRegion(x, y - 1) && inRegion(x, y + 1)
        && inRegion(x - 1, y - 1) && inRegion(x + 1, y - 1) && inRegion(x - 1, y + 1) && inRegion(x + 1, y + 1)) {
        g.moveTo(cx, cy); g.lineTo(cx + 1, cy);
        g.moveTo(cx, cy); g.lineTo(cx, cy + 1);
        continue;
      }
      g.moveTo(cx, cy); g.lineTo(cx + 0.001, cy);
      for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
        if (!inMap(x + dx, y + dy) || !inRegion(x + dx, y + dy)) continue;
        g.moveTo(cx, cy); g.lineTo(cx + dx, cy + dy);
      }
    }
}

// Uferlinie natürlicher machen: an Rändern einer Fläche zufällige kleine Ausbuchtungen (immer gleich je Feld)
function regionWobble(g, x0, y0, x1, y1, inRegion, grow, seed) {
  g.beginPath();
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      if (!inMap(x, y) || !inRegion(x, y)) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        if (!inMap(x + dx, y + dy) || inRegion(x + dx, y + dy)) continue;
        for (let k = 0; k < 2; k++) {
          const h = hash(x * 3 + dx + k * 17 + seed, y * 5 + dy - k * 11);
          if (h < 0.45) continue;
          const along = (hash(x + k * 7 + seed, y + dx * 3 + dy * 5) - 0.5) * 0.9;
          const out = 0.38 + 0.18 * hash(y + k + seed, x - dy);
          const r = 0.14 + 0.15 * h + grow;
          const cx = x + 0.5 + dx * out + dy * along, cy = y + 0.5 + dy * out + dx * along;
          g.moveTo(cx + r, cy);
          g.arc(cx, cy, r, 0, Math.PI * 2);
        }
      }
    }
}

// Fläche malen: runde Linien plus Ausbuchtungen, alles mit einem Stil (width = Linienbreite in Feldern)
function paintRegion(g, box, inRegion, style, width, seed) {
  const [x0, y0, x1, y1] = box;
  g.strokeStyle = style; g.fillStyle = style;
  regionStroke(g, x0, y0, x1, y1, inRegion);
  g.lineWidth = width; g.stroke();
  regionWobble(g, x0, y0, x1, y1, inRegion, (width - 1) / 2, seed);
  g.fill();
}

// Textur in Feld-Koordinaten (eine Textur deckt TEXTURE_TILES × TEXTURE_TILES Felder), verschiebbar für fließendes Wasser
function tilePattern(g, name, fx = 0, fy = 0) {
  const img = images[name];
  if (!img || !g.createPattern || typeof DOMMatrix === 'undefined') return null;
  const p = g.createPattern(img, 'repeat');
  const k = TEXTURE_TILES / img.width;
  p.setTransform(new DOMMatrix([k, 0, 0, k, fx, fy]));
  return p;
}

const isWaterAt = (x, y) => terrain[y * N + x] === TERRAIN.wasser.id;
const isMountainAt = (x, y) => terrain[y * N + x] === TERRAIN.berg.id;
const isShoreAt = (x, y) => terrain[y * N + x] === TERRAIN.wasser.id || terrain[y * N + x] === TERRAIN.sand.id;

function renderChunk(cx, cy) {
  const c = typeof document !== 'undefined' ? document.createElement('canvas') : null;
  if (!c || !c.getContext) return null;
  const x0 = cx * CHUNK, y0 = cy * CHUNK;
  const left = (x0 - (y0 + CHUNK)) * TW / 2, top = (x0 + y0) * TH / 2;
  c.width = CHUNK * TW;
  c.height = CHUNK * TH + 2;
  const g = c.getContext('2d');
  const toPoint = (x, y) => ({ x: (x - y) * TW / 2 - left, y: (x + y) * TH / 2 - top });
  const patterns = {};
  for (const name of ['wiese', 'wasser', 'sand']) patterns[name] = groundPattern(g, name, -left, -top);
  const decor = [];
  for (let y = y0; y < y0 + CHUNK; y++)
    for (let x = x0; x < x0 + CHUNK; x++) {
      const t = terrain[y * N + x];
      // Mit Bildern: überall erst Wiese, Sand und Wasser kommen danach als runde Flächen darüber
      g.fillStyle = patterns.wiese && patterns.sand ? patterns.wiese : patterns[textureFor(t)] || groundColor(x, y);
      diamondPath(g, x, y, 1, 1, toPoint, 0.6);
      g.fill();
      // Wald- und Felsboden etwas dunkler
      if (patterns.wiese && (t === TERRAIN.wald.id || t === TERRAIN.fels.id)) {
        g.fillStyle = t === TERRAIN.wald.id ? 'rgba(20,70,10,0.16)' : 'rgba(90,90,70,0.14)';
        g.fill();
      }
      // helle Uferkante am Wasser (nur ohne Wasser-Bild)
      if (!patterns.wasser && t === TERRAIN.wasser.id && hash(x + 7, y) > 0.7) {
        const p = toPoint(x + 0.5, y + 0.5);
        g.strokeStyle = 'rgba(255,255,255,0.35)';
        g.lineWidth = 1.5;
        g.beginPath(); g.moveTo(p.x - 8, p.y); g.lineTo(p.x + 6, p.y); g.stroke();
      }
      // Blumen und Büsche auf der Wiese (nur Schmuck – darauf bauen geht trotzdem)
      if (t === TERRAIN.gras.id && hash(x, y + 3) > 0.92) decor.push([x, y, hash(x + 1, y) > 0.8 ? 'busch' : 'blumen']);
      // Schilf am Seeufer
      if (t === TERRAIN.sand.id && mapFeatures.lake && hash(x + 9, y) > 0.35 && Math.hypot(x - mapFeatures.lake.x, y - mapFeatures.lake.y) < mapFeatures.lake.r * 1.8
        && [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1]].some(([dx, dy]) => inMap(x + dx, y + dy) && isWaterAt(x + dx, y + dy))) decor.push([x, y, 'schilf']);
    }
  // Ufer: Sand mit weichem Rand zur Wiese, dunkler nasser Sand am Wasser, darauf das Wasser (alles rund)
  if (patterns.wiese && patterns.sand) {
    g.save();
    g.transform(TW / 2, TH / 2, -TW / 2, TH / 2, -left, -top);
    g.lineCap = 'round'; g.lineJoin = 'round';
    const box = [x0 - 2, y0 - 2, x0 + CHUNK + 1, y0 + CHUNK + 1];   // Rand mitnehmen: keine Kanten an Stückgrenzen
    paintRegion(g, box, isShoreAt, 'rgba(96, 120, 40, 0.3)', 1.22, 1);   // grünlich-dunkler Saum ins Gras
    paintRegion(g, box, isShoreAt, tilePattern(g, 'sand'), 1.06, 1);
    paintRegion(g, box, isWaterAt, 'rgba(120, 88, 48, 0.32)', 1.42, 2);   // nasser Sand
    paintRegion(g, box, isWaterAt, 'rgba(105, 78, 44, 0.28)', 1.2, 2);
    if (patterns.wasser) paintRegion(g, box, isWaterAt, tilePattern(g, 'wasser'), 1.0, 2);
    // Gebirge: felsiger Boden mit dunklem Rand
    if (images['berg-boden']) {
      paintRegion(g, box, isMountainAt, 'rgba(70, 60, 45, 0.35)', 1.25, 3);
      paintRegion(g, box, isMountainAt, tilePattern(g, 'berg-boden'), 1.08, 3);
    }
    g.restore();
  }
  for (const [x, y, name] of decor) {
    const p = toPoint(x + 0.5, y + 0.5);
    if (name === 'schilf') { drawReeds(g, p.x, p.y, x, y); continue; }
    const img = images[name];
    if (!img) {   // ohne Bilder: kleiner Farbtupfer
      g.fillStyle = hash(x + 1, y) > 0.5 ? '#ffe36b' : '#ff9ec7';
      g.beginPath(); g.arc(p.x, p.y, 2.2, 0, 7); g.fill();
      continue;
    }
    const w = TW * (name === 'busch' ? 0.5 : 0.42), h = w * img.height / img.width;
    const ox = (hash(y, x + 5) - 0.5) * TW * 0.25;
    g.drawImage(img, p.x - w / 2 + ox, p.y - h * 0.8, w, h);
  }
  return { canvas: c, left, top, decor, depth: renderDepthLayer(x0, y0, left, top) };
}

// Schilfbüschel (fest im Boden-Bild, selbst gezeichnet): dünne Halme, oben dunkle Kolben
function drawReeds(g, px, py, x, y) {
  g.lineCap = 'round';
  for (let k = 0; k < 9; k++) {
    const a = hash(x + k * 3, y), b = hash(x, y + k * 5), h = 18 + a * 18;
    const bx = px + (a - 0.5) * 30, by = py + (b - 0.5) * 16, lean = (b - 0.5) * 6;
    g.strokeStyle = a > 0.5 ? '#6f8f3d' : '#88a24a';
    g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(bx, by); g.quadraticCurveTo(bx + lean * 0.3, by - h * 0.6, bx + lean, by - h); g.stroke();
    if (k % 2 === 0) {
      g.strokeStyle = '#6a4a2a'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(bx + lean * 0.8, by - h * 0.82); g.lineTo(bx + lean, by - h); g.stroke();
    }
  }
}

// Wassertiefe als eigene, grob aufgelöste Ebene je Boden-Stück: liegt über dem fließenden Wasser. Das grobe Raster macht
// die Übergänge von selbst weich und kostet beim Zeichnen nur ein drawImage je Stück.
const DEPTH_SCALE = 0.34;
function renderDepthLayer(x0, y0, left, top) {
  let any = false;
  for (let y = Math.max(0, y0 - 2); y < Math.min(N, y0 + CHUNK + 2) && !any; y++)
    for (let x = Math.max(0, x0 - 2); x < Math.min(N, x0 + CHUNK + 2); x++) if (isWaterAt(x, y)) { any = true; break; }
  if (!any || !waterDepth) return null;
  const c = document.createElement('canvas');
  c.width = Math.ceil(CHUNK * TW * DEPTH_SCALE);
  c.height = Math.ceil((CHUNK * TH + 2) * DEPTH_SCALE);
  const g = c.getContext('2d');
  // Farbe je Bildpunkt aus der weichen Tiefenkarte: hell und türkis am Ufer, dunkelblau in der Mitte, Sand auf Sandbänken
  const W = c.width, H = c.height, img = g.createImageData && g.createImageData(W, H), d = img && img.data;
  if (!d) return null;
  const sample = (f, fx, fy) => {
    const ix = Math.floor(fx), iy = Math.floor(fy), ax = fx - ix, ay = fy - iy;
    if (ix < 0 || iy < 0 || ix >= N - 1 || iy >= N - 1) return 0;
    const i = iy * N + ix;
    return (f[i] * (1 - ax) + f[i + 1] * ax) * (1 - ay) + (f[i + N] * (1 - ax) + f[i + N + 1] * ax) * ay;
  };
  for (let py = 0; py < H; py++)
    for (let px = 0; px < W; px++) {
      const sx = px / DEPTH_SCALE + left, sy = py / DEPTH_SCALE + top;
      const fx = sx / TW + sy / TH - 0.5, fy = sy / TH - sx / TW - 0.5;   // Feld-Koordinaten (Feldmitte = ganze Zahl)
      const dep = sample(waterDepth, fx, fy);
      if (dep <= 0) continue;
      const sh = sample(waterShoal, fx, fy);
      let r, gg, b, a;
      if (dep < 1.7) { const k = Math.max(0, (dep - 0.6) / 1.1); r = 185; gg = 238; b = 212; a = 0.46 * (1 - k); }   // seicht
      else { const k = Math.min(1, (dep - 1.7) / 3.0); r = 16; gg = 72; b = 140; a = 0.5 * k; }                     // tief
      if (sh > 0) {   // Sandbank schimmert durch
        const sa = 0.62 * sh, ra = sa + a * (1 - sa);
        if (ra > 0) { r = (232 * sa + r * a * (1 - sa)) / ra; gg = (216 * sa + gg * a * (1 - sa)) / ra; b = (160 * sa + b * a * (1 - sa)) / ra; a = ra; }
      }
      const o = (py * W + px) * 4;
      d[o] = r; d[o + 1] = gg; d[o + 2] = b; d[o + 3] = a * 255;
    }
  g.putImageData(img, 0, 0);
  g.setTransform(DEPTH_SCALE * TW / 2, DEPTH_SCALE * TH / 2, -DEPTH_SCALE * TW / 2, DEPTH_SCALE * TH / 2, -left * DEPTH_SCALE, -top * DEPTH_SCALE);
  g.lineCap = 'round'; g.lineJoin = 'round';
  const box = [x0 - 2, y0 - 2, x0 + CHUNK + 1, y0 + CHUNK + 1];
  // nur innerhalb der runden Wasserfläche
  const mask = document.createElement('canvas'); mask.width = W; mask.height = H;
  const mg = mask.getContext('2d');
  mg.setTransform(DEPTH_SCALE * TW / 2, DEPTH_SCALE * TH / 2, -DEPTH_SCALE * TW / 2, DEPTH_SCALE * TH / 2, -left * DEPTH_SCALE, -top * DEPTH_SCALE);
  mg.lineCap = 'round'; mg.lineJoin = 'round';
  paintRegion(mg, box, isWaterAt, '#000', 1.0, 2);
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'destination-in'; g.drawImage(mask, 0, 0); g.restore();
  // Nur die Raute des eigenen Boden-Stücks: Die Bilder überlappen sich, sonst läge die Tiefe am Rand doppelt (am großen See als Muster zu sehen)
  g.save(); g.globalCompositeOperation = 'destination-in'; g.fillStyle = '#000';
  g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + CHUNK, y0); g.lineTo(x0 + CHUNK, y0 + CHUNK); g.lineTo(x0, y0 + CHUNK); g.closePath(); g.fill(); g.restore();
  // ein paar Steine auf den Sandbänken
  for (let y = Math.max(0, box[1]); y <= Math.min(N - 1, box[3]); y++)
    for (let x = Math.max(0, box[0]); x <= Math.min(N - 1, box[2]); x++) {
      if (waterShoal[y * N + x] < 0.6 || hash(x + 11, y) < 0.72) continue;
      g.fillStyle = hash(x, y + 13) > 0.5 ? 'rgba(120,115,105,0.85)' : 'rgba(155,150,135,0.85)';
      g.beginPath(); g.ellipse(x + hash(x + 3, y), y + hash(x, y + 3), 0.1 + hash(y, x) * 0.1, 0.08 + hash(x, y) * 0.08, 0, 0, 7); g.fill();
    }
  return c;
}

function drawWaterDepth(range) {
  const per = N / CHUNK;
  if (!chunks.length) return;
  range = clipToLand(range);
  for (let cy = Math.floor(range.y0 / CHUNK); cy <= Math.floor(range.y1 / CHUNK); cy++)
    for (let cx = Math.floor(range.x0 / CHUNK); cx <= Math.floor(range.x1 / CHUNK); cx++) {
      if (cx < 0 || cy < 0 || cx >= per || cy >= per) continue;
      const ch = chunks[cy * per + cx];
      if (!ch || !ch.depth) continue;
      const p = worldToScreen(ch.left, ch.top);
      ctx.drawImage(ch.depth, p.x, p.y, CHUNK * TW * cam.zoom * ch.depth.width / (CHUNK * TW * DEPTH_SCALE), (CHUNK * TH + 2) * cam.zoom * ch.depth.height / ((CHUNK * TH + 2) * DEPTH_SCALE));
    }
}

// Wasserfall: Felsstufe quer über den Fluss, weißer Vorhang (läuft), Schaum am Fuß. Selbst gezeichnet, nur wenn sichtbar.
function drawWaterfall(range) {
  const f = mapFeatures.fall;
  if (!f || !landMask[Math.floor(f.y) * N + Math.floor(f.x)] || f.x < range.x0 - 8 || f.x > range.x1 + 8 || f.y < range.y0 - 8 || f.y > range.y1 + 8) return;
  const z = cam.zoom, t = frameTime, H = 46 * z;
  const px = f.uy, py = -f.ux;
  const a = tileToScreen(f.x - px * f.w, f.y - py * f.w), b = tileToScreen(f.x + px * f.w, f.y + py * f.w);
  const at = k => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k });
  const wob = k => Math.sin(k * 23 + f.x) * 3 * z;
  // Wasser-Vorhang
  const g = ctx.createLinearGradient(0, Math.min(a.y, b.y), 0, Math.max(a.y, b.y) + H);
  g.addColorStop(0, 'rgba(70,165,225,1)');
  g.addColorStop(0.3, 'rgba(120,200,240,1)');
  g.addColorStop(0.7, 'rgba(205,238,250,1)');
  g.addColorStop(1, 'rgba(255,255,255,1)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y - 2 * z);
  for (let k = 0; k <= 1.001; k += 0.1) { const q = at(k); ctx.lineTo(q.x, q.y - 2 * z + wob(k) * 0.3); }
  for (let k = 1; k >= -0.001; k -= 0.1) { const q = at(k); ctx.lineTo(q.x, q.y + H + wob(k)); }
  ctx.closePath(); ctx.fill();
  // fallende Streifen
  ctx.lineCap = 'round';
  const n = Math.max(6, Math.round(f.w * 7));
  for (let i = 0; i < n; i++) {
    const k = (i + 0.5) / n, q = at(k), sp = 0.55 + hash(i, 7) * 0.5, ph = hash(i, 19);
    for (let j = 0; j < 2; j++) {
      const v = (t * sp + ph + j * 0.5) % 1, y0 = q.y + v * H * 0.85, len = (5 + hash(i, j) * 7) * z;
      ctx.strokeStyle = `rgba(255,255,255,${0.75 * (0.35 + 0.65 * v)})`;
      ctx.lineWidth = Math.max(1, (1.1 + hash(j, i) * 1.2) * z);
      ctx.beginPath(); ctx.moveTo(q.x, y0); ctx.lineTo(q.x, Math.min(y0 + len, q.y + H)); ctx.stroke();
    }
  }
  // Schaum am Fuß
  for (let i = 0; i < n + 5; i++) {
    const k = (i + 0.5) / (n + 5), q = at(k), r = (3.5 + hash(i, 3) * 3.5 + Math.sin(t * 3 + i * 1.7) * 1.1) * z;
    ctx.fillStyle = `rgba(255,255,255,${0.72 + 0.2 * Math.sin(t * 2 + i)})`;
    ctx.beginPath(); ctx.ellipse(q.x, q.y + H + wob(k) + Math.sin(t * 2.2 + i) * 1.2 * z, r * 1.5, r * 0.75, 0, 0, 7); ctx.fill();
  }
  // Felsen an der Kante und an den Seiten
  const rock = (x, y, r, col) => {
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath(); ctx.ellipse(x + 1.5 * z, y + r * 0.55, r * 1.1, r * 0.5, 0, 0, 7); ctx.fill();
    ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.78, 0, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.beginPath(); ctx.ellipse(x - r * 0.25, y - r * 0.3, r * 0.5, r * 0.28, 0, 0, 7); ctx.fill();
  };
  for (let i = 0; i < 6; i++) {
    const k = hash(i, 41), q = at(k);
    if (hash(i, 43) < 0.5) rock(q.x, q.y - 3 * z, (2.5 + hash(i, 47) * 2.5) * z, '#807c72');
  }
  // große Felsen rechts und links verdecken die Kanten des Vorhangs
  for (const k of [0, 1]) {
    const q = at(k), side = k ? 1 : -1;
    for (let i = 0; i < 4; i++) {
      const v = i / 3;
      rock(q.x + side * (3 + hash(i, k + 2) * 7) * z, q.y + v * H, (10 - i) * z, i % 2 ? '#8a867b' : '#736f66');
    }
    rock(q.x - side * 3 * z, q.y + H + 3 * z, 7 * z, '#6d695f');
  }
  // Gischt: feiner Dunst über dem Schaum
  for (let i = 0; i < 5; i++) {
    const k = hash(i, 53), q = at(k), v = (t * 0.25 + hash(i, 59)) % 1;
    ctx.fillStyle = `rgba(255,255,255,${0.28 * (1 - v)})`;
    ctx.beginPath(); ctx.arc(q.x + Math.sin(t + i) * 4 * z, q.y + H - v * 16 * z, (5 + v * 10) * z, 0, 7); ctx.fill();
  }
}

// Boden nur dort, wo eigenes Land liegt – unter den Wolken wird nichts gemalt. Höchstens MAX_CHUNKS Stücke bleiben im Speicher
// (jedes kostet etwa 3 MB): Sind es mehr, fliegen die am längsten nicht gezeigten raus. Neue Stücke kosten höchstens etwa 10 ms je Bild,
// der Rest folgt in den nächsten Bildern (bis dahin liegt dort die Wolkenfarbe) – so ruckelt schnelles Verschieben nicht.
const MAX_CHUNKS = 48, MAX_CHUNKS_HARD = 72;   // hart: auch sichtbare Stücke werden dann nicht mehr angelegt (nur bei sehr viel eigenem Land ganz weit weg)
let chunksAlive = 0, chunkTick = 0;
const nowMs = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

function chunkHasLand(cx, cy) {
  const k = CHUNK / CONFIG.plotSize;
  for (let py = cy * k; py < (cy + 1) * k; py++)
    for (let px = cx * k; px < (cx + 1) * k; px++) if (state.plots[py * PLOTS + px] === 1) return true;
  return false;
}

function drawGround(range) {
  const per = N / CHUNK;
  if (!chunks.length) { chunks = new Array(per * per).fill(null); chunksAlive = 0; }
  chunkTick++;
  let redraw = 1;   // veraltete Stücke: höchstens eins pro Bild neu malen
  let made = 0;
  const t0 = nowMs(), first = chunksAlive === 0;
  range = clipToLand(range);
  for (let cy = Math.floor(range.y0 / CHUNK); cy <= Math.floor(range.y1 / CHUNK); cy++)
    for (let cx = Math.floor(range.x0 / CHUNK); cx <= Math.floor(range.x1 / CHUNK); cx++) {
      if (cx < 0 || cy < 0 || cx >= per || cy >= per || !chunkHasLand(cx, cy)) continue;
      const k = cy * per + cx;
      if (!chunks[k]) {
        // (ganz am Anfang, wenn noch nichts da ist: alles Sichtbare auf einmal, sonst beginnt das Spiel mit Löchern)
        if ((made && first === false && nowMs() - t0 > 10) || chunksAlive >= MAX_CHUNKS_HARD) continue;
        chunks[k] = renderChunk(cx, cy);
        if (chunks[k]) { chunksAlive++; made++; }
      } else if (chunks[k].stale && redraw > 0) { redraw--; chunks[k] = renderChunk(cx, cy) || chunks[k]; }
      const ch = chunks[k];
      if (!ch) continue;
      ch.used = chunkTick;
      const p = worldToScreen(ch.left, ch.top);
      ctx.drawImage(ch.canvas, p.x, p.y, ch.canvas.width * cam.zoom, ch.canvas.height * cam.zoom);
    }
  if (chunksAlive > MAX_CHUNKS) {
    const old = [];
    chunks.forEach((c, k) => { if (c && c.used !== chunkTick) old.push(k); });
    old.sort((a, b) => (chunks[a].used || 0) - (chunks[b].used || 0));
    for (const k of old.slice(0, chunksAlive - MAX_CHUNKS)) { chunks[k] = null; chunksAlive--; }
  }
}

// ---------------------------------------------------------------------
// Wolken: Was nicht gekauft ist, liegt unter einer weichen weißen Wolkendecke. Die Decke besteht aus wenigen vorgezeichneten
// Bildern (je Landstück eins, nur ein Bild-Aufruf; Speicher fest, egal wie groß die Karte ist). Die Wölkchen ragen über den Rand
// des Landstücks, dadurch hat eigenes Land einen weichen, gewellten Rand. Gezeichnet auf dem Boden, unter Bäumen und Häusern:
// Eigene hohe Dinge stehen vor den Wolken, fremde werden gar nicht gezeichnet. Nacht, Wetter und Winter liegen darüber.
// ---------------------------------------------------------------------

const CLOUD_BASE = '#f4f7fb';
const CLOUD_VARIANTS = 8, CLOUD_SCALE = 0.42, CLOUD_PAD = 2;   // Überstand in Feldern
const CLOUD_LIFT_SECONDS = 1.9;
const cloudSprites = [];
const cloudLifts = new Map();   // Landstück → wie weit die Wolke schon aufgelöst ist (0–1)
let cloudPuffSprite = null;

function drawPuff(g, x, y, r, soft = 0.42) {
  g.save();
  g.translate(x, y); g.scale(1, 0.8);
  const sh = g.createRadialGradient(0, r * 0.3, r * 0.3, 0, r * 0.3, r * 1.1);
  sh.addColorStop(0, `rgba(190,206,228,${soft})`);
  sh.addColorStop(0.7, `rgba(190,206,228,${soft * 0.65})`);
  sh.addColorStop(1, 'rgba(190,206,228,0)');
  g.fillStyle = sh;
  g.beginPath(); g.arc(0, r * 0.3, r * 1.1, 0, 7); g.fill();
  const hi = g.createRadialGradient(-r * 0.2, -r * 0.3, r * 0.1, 0, 0, r);
  hi.addColorStop(0, 'rgba(255,255,255,1)');
  hi.addColorStop(0.55, 'rgba(254,255,255,0.97)');
  hi.addColorStop(0.82, 'rgba(244,248,253,0.72)');
  hi.addColorStop(1, 'rgba(240,245,251,0)');
  g.fillStyle = hi;
  g.beginPath(); g.arc(0, 0, r, 0, 7); g.fill();
  g.restore();
}

function cloudSprite(v) {
  if (cloudSprites[v] !== undefined) return cloudSprites[v];
  if (typeof document === 'undefined') return (cloudSprites[v] = null);
  const ps = CONFIG.plotSize, W = (ps + 2 * CLOUD_PAD) * TW, H = (ps + 2 * CLOUD_PAD) * TH;
  const c = document.createElement('canvas');
  c.width = Math.ceil(W * CLOUD_SCALE); c.height = Math.ceil(H * CLOUD_SCALE);
  const g = c.getContext('2d');
  if (!g) return (cloudSprites[v] = null);
  g.scale(CLOUD_SCALE, CLOUD_SCALE);
  // u, v in Feldern ab der oberen Ecke des Landstücks → Bildpunkte im Bild
  const at = (a, b) => ({ x: W / 2 + (a - b) * TW / 2, y: CLOUD_PAD * TH + (a + b) * TH / 2 });
  const i = 0.25, e = ps - 0.25, co = [at(i, i), at(e, i), at(e, e), at(i, e)];
  g.fillStyle = CLOUD_BASE;
  g.beginPath(); co.forEach(q => g.lineTo(q.x, q.y)); g.closePath(); g.fill();
  const rnd = (a, b) => hash(v * 31 + a * 7 + 3, b * 13 + 11 + v);
  const puffs = [];
  // am Rand entlang (leicht nach innen versetzt), dadurch die gewellte Kante
  for (let k = 0; k <= ps * 1.5; k++) {
    const t = k / 1.5, inset = 0.35;
    for (let side = 0; side < 4; side++) {
      const j = rnd(k, side), j2 = rnd(side + 5, k + 9);
      const along = t + (j - 0.5) * 0.5, inn = inset + j2 * 0.5;
      const [a, b] = side === 0 ? [along, inn] : side === 1 ? [ps - inn, along] : side === 2 ? [along, ps - inn] : [inn, along];
      const q = at(a, b);
      puffs.push({ x: q.x, y: q.y, r: 40 + j * 24 });
    }
  }
  // Fläche: wenige große Ballen, dazwischen kleinere (verschiedene Größen, sonst sieht es nach Fischschuppen aus)
  for (let k = 0; k < 16; k++) {
    const a = 0.6 + rnd(k, 21) * (ps - 1.2), b = 0.6 + rnd(k, 22) * (ps - 1.2), q = at(a, b);
    puffs.push({ x: q.x, y: q.y, r: 62 + rnd(k, 23) * 70, soft: 0.3 });
  }
  for (let k = 0; k < 14; k++) {
    const a = 0.8 + rnd(k, 24) * (ps - 1.6), b = 0.8 + rnd(k, 25) * (ps - 1.6), q = at(a, b);
    puffs.push({ x: q.x, y: q.y, r: 22 + rnd(k, 26) * 26, soft: 0.5 });
  }
  puffs.sort((p1, p2) => p1.y - p2.y);
  for (const q of puffs) drawPuff(g, q.x, q.y, q.r, q.soft);
  c.originX = W / 2; c.originY = CLOUD_PAD * TH; c.worldW = W; c.worldH = H;
  return (cloudSprites[v] = c);
}

// Beim Kauf: Die Wolke über dem Landstück löst sich auf
function liftClouds(p) { cloudLifts.set(p, 0); }

// Liegt dieses Landstück (noch) unter Wolken?
function cloudCovers(p) { return state.plots[p] !== 1 || cloudLifts.has(p); }

// Die ganze Decke liegt fertig gemalt auf einer eigenen Leinwand (etwas größer als der Bildschirm, gröber aufgelöst – Wolken sind
// weich): Je Bild kostet sie nur einen Bild-Aufruf. Neu gemalt wird nur, wenn man weit verschiebt oder zoomt und wenn Land dazukommt.
const CLOUD_OVER = 0.3, CLOUD_RES = 0.65;
const cloudLayer = { canvas: null, g: null, x: 0, y: 0, z: 0, w: 0, h: 0, plots: -1 };

function paintCloudLayer() {
  const L = cloudLayer, z = cam.zoom, ps = CONFIG.plotSize;
  if (!L.canvas) {
    if (typeof document === 'undefined') return false;
    L.canvas = document.createElement('canvas');
    L.g = L.canvas.getContext('2d');
    if (!L.g) { L.canvas = null; return false; }
  }
  L.w = viewW * (1 + 2 * CLOUD_OVER); L.h = viewH * (1 + 2 * CLOUD_OVER);
  const cw = Math.ceil(L.w * CLOUD_RES), ch = Math.ceil(L.h * CLOUD_RES);
  if (L.canvas.width !== cw || L.canvas.height !== ch) { L.canvas.width = cw; L.canvas.height = ch; }
  L.x = cam.x; L.y = cam.y; L.z = z;
  const g = L.g;
  g.setTransform(CLOUD_RES, 0, 0, CLOUD_RES, 0, 0);
  g.clearRect(0, 0, L.w, L.h);
  // Feldbereich der Leinwand
  const toTile = (sx, sy) => { const wx = (sx - L.w / 2) / z + cam.x, wy = (sy - L.h / 2) / z + cam.y; return { x: (wx / (TW / 2) + wy / (TH / 2)) / 2, y: (wy / (TH / 2) - wx / (TW / 2)) / 2 }; };
  const corners = [toTile(0, 0), toTile(L.w, 0), toTile(0, L.h), toTile(L.w, L.h)];
  const m = CLOUD_PAD / ps + 1, lim = 5;   // über den Kartenrand hinaus: dort geht das Wolkenmeer weiter
  const px0 = Math.max(-lim, Math.floor(Math.min(...corners.map(q => q.x)) / ps - m)), px1 = Math.min(PLOTS + lim, Math.ceil(Math.max(...corners.map(q => q.x)) / ps + m));
  const py0 = Math.max(-lim, Math.floor(Math.min(...corners.map(q => q.y)) / ps - m)), py1 = Math.min(PLOTS + lim, Math.ceil(Math.max(...corners.map(q => q.y)) / ps + m));
  const hw = TW / 2 * ps, hh = TH / 2 * ps, cx = L.w / 2 - cam.x * z, cy = L.h / 2 - cam.y * z;
  const s0 = cloudSprite(0);
  if (!s0) return false;
  const W = s0.worldW * z, H = s0.worldH * z, ox = s0.originX * z, oy = s0.originY * z;
  let n = 0;
  for (let py = py0; py <= py1; py++)
    for (let px = px0; px <= px1; px++) {
      const inside = px >= 0 && py >= 0 && px < PLOTS && py < PLOTS, p = inside ? py * PLOTS + px : -1;
      if (inside && state.plots[p] === 1) continue;
      const sx = cx + (px - py) * hw * z, sy = cy + (px + py) * hh * z;
      if (sx + W - ox < 0 || sx - ox > L.w || sy - oy > L.h || sy + H - oy < 0) continue;
      const img = cloudSprite(Math.floor(hash(px + 40, py + 40) * CLOUD_VARIANTS));
      if (img) { g.drawImage(img, sx - ox, sy - oy, W, H); n++; }
    }
  L.sprites = n;
  L.plots = landVersion;
  return true;
}

function drawClouds(dt) {
  const L = cloudLayer, z = cam.zoom;
  // reicht die fertige Leinwand noch? (Verschieben und leichtes Zoomen gehen ohne neues Malen)
  const k = L.z ? z / L.z : 0;
  const dx = (cam.x - L.x) * L.z, dy = (cam.y - L.y) * L.z;
  const fits = L.canvas && k > 0.8 && k < 1.3 && L.plots === landVersion && Math.abs(dx) + viewW / 2 / k <= L.w / 2 - 6 && Math.abs(dy) + viewH / 2 / k <= L.h / 2 - 6;
  if (!fits && !paintCloudLayer()) return;
  // leichtes Treiben: die ganze Decke wandert ein paar Bildpunkte hin und her
  const drift = Math.sin(frameTime * 0.13) * 4 * z, driftY = Math.cos(frameTime * 0.1) * 2.5 * z;
  const q = z / L.z, sw = L.w * q, sh = L.h * q;
  const lx = (L.x - cam.x) * z + viewW / 2 - sw / 2 + drift, ly = (L.y - cam.y) * z + viewH / 2 - sh / 2 + driftY;
  ctx.drawImage(L.canvas, lx, ly, sw, sh);
  // Gerade gekauft: Die Wolke des Landstücks löst sich auf (ein Bild, wird größer, heller, steigt auf)
  if (cloudLifts.size) {
    const ps = CONFIG.plotSize, s0 = cloudSprite(0);
    for (const [p, t] of cloudLifts) {
      const px = p % PLOTS, py = Math.floor(p / PLOTS), e0 = Math.min(1, t / CLOUD_LIFT_SECONDS), e = e0 * e0 * (3 - 2 * e0), grow = 1 + 0.32 * e;
      const c = tileToScreen((px + 0.5) * ps, (py + 0.5) * ps), img = cloudSprite(Math.floor(hash(px + 40, py + 40) * CLOUD_VARIANTS));
      if (!img || !s0) continue;
      const W = s0.worldW * z * grow, H = s0.worldH * z * grow;
      ctx.globalAlpha = 1 - e;
      ctx.drawImage(img, c.x - W / 2, c.y - H / 2 - 30 * e * z, W, H);
      ctx.globalAlpha = 1;
      if (t + dt >= CLOUD_LIFT_SECONDS) cloudLifts.delete(p); else cloudLifts.set(p, t + dt);
    }
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

// Bäume je Jahreszeit (Bilder aus Canva). Nicht alle wechseln auf einmal: jeder Baum ein paar Sekunden versetzt.
const TREE_SEASONS = {
  'baum-laub':  ['baum-laub-fruehling', null, 'baum-laub-herbst', 'baum-laub-winter'],
  'baum-birke': ['baum-birke-fruehling', null, 'baum-birke-herbst', 'baum-birke-winter'],
  'baum-tanne': [null, null, null, 'baum-tanne-winter'],
};
function staggeredSeason(v) {
  const q = CONFIG.yearSeconds / 4, t = (state.yearTime + CONFIG.yearSeconds - v * 15) % CONFIG.yearSeconds;
  const si = Math.floor(t / q);
  if (si === 3 && seasonIndex() === 0 && snowCover() === 0) return 0;   // Spielbeginn im Frühling: kein „Nachwinter“
  return si === 0 && snowCover() > 0.5 ? 3 : si;   // Schnee taut noch: alles bleibt verschneit
}

function treeSeasonName(name, v) {
  const list = TREE_SEASONS[name];
  if (!list || !state) return name;
  const seasonal = list[staggeredSeason(v)];
  return seasonal && images[seasonal] ? seasonal : name;
}

// Gebirge: im Inneren große Gipfel (mit Schnee), zum Rand hin kleinere Felsberge, dazwischen nur Felsboden
function mountainAt(x, y) {
  const v = hash(x * 3 + 1, y * 7 + 2);
  let inner = 0;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]])
    if (inMap(x + dx, y + dy) && isMountainAt(x + dx, y + dy)) inner++;
  // große Gipfel nur alle paar Felder (sonst stehen sie ineinander)
  if (inner === 8 && v > 0.62 && (x + 2 * y) % 3 === 0) return { name: 'berg-gross', size: 2.6 + v * 0.6 };
  if (v > 0.45) return { name: 'berg-klein', size: 1.25 + v * 0.45 };
  return null;
}

// Verschneite Fassung eines Bildes (Felsen, Berge, Büsche – ohne eigenes Winterbild): Schnee liegt auf allem, was nach
// oben zeigt: am oberen Rand des Umrisses und auf hellen Flächen. Wird je Bild nur einmal berechnet.
const snowSprites = new Map();
function snowSprite(img, building = false) {
  if (!img) return null;
  if (snowSprites.has(img)) return snowSprites.get(img);
  let out = null;
  try {
    const k = Math.min(1, (building ? 560 : 320) / Math.max(img.width, img.height)), w = Math.max(1, Math.round(img.width * k)), h = Math.max(1, Math.round(img.height * k));
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0, w, h);
    const d = g.getImageData(0, 0, w, h), a = d.data;
    if (a && a.length === w * h * 4) {
      const lum = i => (a[i] * 0.3 + a[i + 1] * 0.59 + a[i + 2] * 0.11) / 255;
      const reach = Math.max(2, Math.round(h * 0.045));
      const L = new Float32Array(w * h);
      for (let i = 0; i < w * h; i++) L[i] = a[i * 4 + 3] > 100 ? lum(i * 4) : -1;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (L[i] < 0) continue;
        // Kante nach oben: darüber ist nichts oder etwas deutlich Dunkleres (Spalt zwischen zwei Steinen)
        let top = 0;
        for (let r = 1; r <= reach; r++) {
          const up = y - r < 0 ? -1 : L[i - r * w];
          // Gebäude haben feine Muster (Holz, Stroh): dort zählt nur der echte Rand, sonst wird alles grau
          if (up < 0 || (!building && up < L[i] - 0.14) || (building && r <= 2 && up < L[i] - 0.34)) { top = 1 - (r - 1) / reach; break; }
        }
        const j = i * 4;
        const bright = Math.max(0, Math.min(1, (L[i] - (building ? 0.58 : 0.42)) / 0.22));
        // Gebäude: Gras auf der Platte wird ganz weiß, damit keine grünen Flecken bleiben
        let green = 0;
        if (building) {   // Farbton: Gras (auch olivgrün) wird weiß, Stroh und Korn tragen viel Schnee, Holz bleibt
          const r0 = a[j], g0 = a[j + 1], b0 = a[j + 2], mx = Math.max(r0, g0, b0), mn = Math.min(r0, g0, b0), dl = mx - mn;
          const hue = !dl ? 0 : mx === r0 ? 60 * ((g0 - b0) / dl) : mx === g0 ? 60 * ((b0 - r0) / dl + 2) : 60 * ((r0 - g0) / dl + 4);
          const sat = mx ? dl / mx : 0;
          if (hue >= 50 && hue <= 150 && sat > 0.2) green = 1;
          else if (hue >= 37 && hue < 50 && sat > 0.45 && L[i] > 0.38) green = 0.72;
        }
        const grain = 0.82 + 0.18 * hash(x, y);
        const m = Math.min(1, Math.max(top * (building ? 0.8 : 1), bright, green) * grain);
        a[j] += (248 - a[j]) * m; a[j + 1] += (251 - a[j + 1]) * m; a[j + 2] += (255 - a[j + 2]) * m;
      }
      g.putImageData(d, 0, 0);
      out = c;
    }
  } catch (e) { out = null; }
  snowSprites.set(img, out);
  return out;
}

// Gebäudebild ohne eigenes Winterbild: verschneite Fassung mit denselben Platten-Maßen (einmal je Bild)
function buildingSnow(img) {
  if (!img) return img;
  const c = snowSprite(img, true);
  if (!c) return img;
  c.sockel = img.sockel;
  return c;
}

// Im Winter: frisch verschneite Felsen, Berge und Büsche (sanft ein- und ausblenden)
function drawSnowOver(img, x, y, w, h) {
  const snow = typeof snowCover === 'function' ? snowCover() : 0;
  if (snow <= 0.02) return;
  const sp = snowSprite(img);
  if (!sp) return;
  const old = ctx.globalAlpha;
  ctx.globalAlpha = old * Math.min(1, snow * 1.2);
  ctx.drawImage(sp, x, y, w, h);
  ctx.globalAlpha = old;
}

// Büsche liegen fest im Boden-Bild: im Winter kommt die verschneite Fassung darüber
function drawDecorSnow(range) {
  if (!chunks.length || (typeof snowCover === 'function' ? snowCover() : 0) <= 0.02) return;
  const img = images.busch;
  if (!img) return;
  const per = N / CHUNK, z = cam.zoom, w = TW * 0.5 * z, h = w * img.height / img.width;
  for (let cy = Math.floor(range.y0 / CHUNK); cy <= Math.floor(range.y1 / CHUNK); cy++)
    for (let cx = Math.floor(range.x0 / CHUNK); cx <= Math.floor(range.x1 / CHUNK); cx++) {
      const ch = cx >= 0 && cy >= 0 && cx < per && cy < per ? chunks[cy * per + cx] : null;
      if (!ch || !ch.decor) continue;
      for (const [x, y, name] of ch.decor) {
        if (name !== 'busch' || landMask[y * N + x] !== 2) continue;
        const p = tileToScreen(x + 0.5, y + 0.5), ox = (hash(y, x + 5) - 0.5) * TW * 0.25 * z;
        drawSnowOver(img, p.x - w / 2 + ox, p.y - h * 0.8, w, h);
      }
    }
}

function drawMountain(x, y, m) {
  const img = images[m.name];
  const p = tileToScreen(x + 0.5, y + 0.5), z = cam.zoom;
  if (!img) {   // ohne Bild: grauer Kegel
    ctx.fillStyle = '#8f8a80';
    ctx.beginPath(); ctx.moveTo(p.x - TW * 0.5 * z, p.y); ctx.lineTo(p.x, p.y - TW * 0.8 * z * m.size / 1.5); ctx.lineTo(p.x + TW * 0.5 * z, p.y); ctx.fill();
    return;
  }
  const w = TW * m.size * z, h = w * img.height / img.width;
  const flip = hash(x + 5, y + 9) < 0.5;
  ctx.save();
  ctx.translate(p.x, p.y);
  if (flip) ctx.scale(-1, 1);
  ctx.drawImage(img, -w / 2, -h * 0.8, w, h);
  if (m.name === 'berg-klein') drawSnowOver(img, -w / 2, -h * 0.8, w, h);   // der große Gipfel hat im Bild schon Schnee
  ctx.restore();
}

// Rechteck des Baum- bzw. Felsbilds auf dem Bildschirm (für das Antippen), etwas schmaler als das Bild
function terrainObjectRect(x, y) {
  const t = terrain[y * N + x], p = tileToScreen(x + 0.5, y + 0.5), z = cam.zoom;
  const ox = (hash(y, x) - 0.5) * 10 * z;
  if (t === TERRAIN.wald.id) { const h = TW * 1.25 * (0.95 + hash(x, y) * 0.3) * z; return { x0: p.x + ox - h * 0.28, x1: p.x + ox + h * 0.28, y0: p.y - h, y1: p.y + h * 0.1 }; }
  const w = TW * 0.95 * 0.9 * z;
  return { x0: p.x + ox - w * 0.4, x1: p.x + ox + w * 0.4, y0: p.y - w * 0.8, y1: p.y + w * 0.1 };
}

// Setzling: wächst von klein bis fast Baumgröße (k = 0–1), schwankt leicht im Wind
function drawSapling(x, y, k) {
  const p = tileToScreen(x + 0.5, y + 0.5), z = cam.zoom;
  const ox = (hash(y, x) - 0.5) * 10 * z;
  ctx.fillStyle = 'rgba(90,60,30,0.45)';   // frisch gelockerte Erde
  ctx.beginPath(); ctx.ellipse(p.x + ox, p.y, 9 * z, 4 * z, 0, 0, 7); ctx.fill();
  const img = k < 0.6 ? images.setzling : images[treeSeasonName('baum-laub', hash(x, y))] || images['baum-laub'];
  const h = (k < 0.6 ? 18 + k * 30 : TW * 1.25 * (0.45 + (k - 0.6) * 1.1)) * z;
  if (!img) { ctx.font = `${Math.round(h)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText('🌱', p.x + ox, p.y); return; }
  const w = h * img.width / img.height;
  const sway = Math.sin(frameTime * 1.6 + x + y) * 0.04;
  ctx.save(); ctx.translate(p.x + ox, p.y + 2 * z); ctx.transform(1, 0, -sway, 1, 0, 0);
  ctx.drawImage(img, -w / 2, -h, w, h);
  ctx.restore();
}

function drawTerrainObject(x, y, kind, anim = null) {
  const p = tileToScreen(x + 0.5, y + 0.5);
  const v = hash(x, y);
  let name, s;
  if (kind === 'wald') {
    name = treeSeasonName(v > 0.7 ? 'baum-tanne' : v < 0.2 ? 'baum-birke' : 'baum-laub', v);
    s = (0.95 + v * 0.3) * cam.zoom;
  } else {
    name = v > 0.5 ? 'fels-gross' : 'fels-klein';
    s = 0.9 * cam.zoom;
  }
  const photo = images[name];
  const img = photo || (kind === 'wald' ? treeSprite(v > 0.7 ? 2 : v > 0.35 ? 1 : 0) : rockSprite(v > 0.5 ? 0 : 1));
  if (!img) return;
  // Bilder von Emin: Bäume nach Höhe, Felsen nach Breite ausrichten (Tanne ist schmal)
  let w, h;
  if (photo && kind === 'wald') { h = TW * 1.25 * s; w = h * img.width / img.height; }
  else { w = (photo ? TW * 0.95 : img.width) * s; h = w * img.height / img.width; }
  const ox = (hash(y, x) - 0.5) * 10 * cam.zoom;
  const foot = photo ? h * 0.08 : 10 * s;
  if (anim) ctx.globalAlpha = anim.alpha;
  if (kind !== 'wald') {
    if (anim) {   // Felsen zerbröselt: sinkt zusammen
      ctx.save();
      ctx.translate(p.x + ox, p.y + foot);
      ctx.scale(1 + anim.k * 0.2, 1 - anim.k * 0.7);
      ctx.drawImage(img, -w / 2, -h, w, h);
      ctx.restore();
      ctx.globalAlpha = 1;
      return;
    }
    ctx.drawImage(img, p.x - w / 2 + ox, p.y - h + foot, w, h);
    if (photo) drawSnowOver(img, p.x - w / 2 + ox, p.y - h + foot, w, h);
    return;
  }
  // Wind: jeder Baum wiegt sich etwas anders, dazu laufen sanfte Böen über die Karte
  const t = frameTime;
  const wind = typeof windStrength === 'function' ? windStrength() : 1;   // Sturm: Bäume biegen sich stark
  const sway = (Math.sin(t * 1.4 * Math.sqrt(wind) + v * 40) * 0.03 + Math.sin(t * 0.6 * wind - (x + y) * 0.25) * 0.025) * wind + (wind - 1) * 0.04;
  ctx.save();
  ctx.translate(p.x + ox, p.y + foot);
  if (anim) ctx.rotate(anim.rot); else ctx.transform(1, 0, -sway, 1, 0, 0);
  ctx.drawImage(img, -w / 2, -h, w, h);
  ctx.restore();
  ctx.globalAlpha = 1;
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

// Bild: Die drei Ecken der Grasoberfläche (Unterkante des Sockels minus seine Dicke) werden genau über die
// linke, rechte und vordere Ecke der Raute gelegt (schräg verzerrt), alle in derselben Sockelhöhe – so passt
// jedes Bild ans Raster und alle Gebäude stehen gleich hoch. Den Sockel darunter schneiden wir auf diese Höhe
// zu bzw. ergänzen ihn in seiner Farbe, wenn er im Bild dünner ist.
const SOCKEL_HOEHE = 0.05;   // Anteil der Grundstücksbreite

// Erd-Textur für die Sockel, wandert mit der Karte mit
let earthCache = { key: '', p: null };   // nur einmal je Bild bzw. Kameraposition anlegen (nicht je Gebäude)
function earthPattern() {
  const img = images.erdsockel;
  if (!img || !ctx.createPattern || typeof DOMMatrix === 'undefined') return null;
  const o = worldToScreen(0, 0), k = 0.35 * cam.zoom;
  const key = o.x.toFixed(1) + ',' + o.y.toFixed(1) + ',' + k;
  if (earthCache.key === key && earthCache.p) return earthCache.p;
  const p = ctx.createPattern(img, 'repeat');
  p.setTransform(new DOMMatrix([k, 0, 0, k, o.x, o.y]));
  earthCache = { key, p };
  return p;
}

// Wo landet das Bild auf dem Bildschirm? Ecken der Raute und die Abbildung Bildpunkt → Bildschirm (a … f)
function imagePlacement(img, x, y, s, rot, lift = 0, flat = false) {
  const iw = img.width, ih = img.height, p = img.sockel;
  const up = p.dicke * ih;
  let L = [p.lx * iw, p.ly * ih - up], R = [p.rx * iw, p.ry * ih - up], F = [p.fx * iw, p.fy * ih - up];
  if (rot) [L, R, F] = [[iw - R[0], R[1]], [iw - L[0], L[1]], [iw - F[0], F[1]]];
  const bl = tileToScreen(x, y + s), br = tileToScreen(x + s, y), bf = tileToScreen(x + s, y + s);
  bl.y -= lift; br.y -= lift; bf.y -= lift;
  const H = flat ? 0 : SOCKEL_HOEHE * (br.x - bl.x);   // Gebäude am Wasser ohne Sockel: Wasser im Bild auf Flusshöhe
  const left = { x: bl.x, y: bl.y - H }, right = { x: br.x, y: br.y - H }, front = { x: bf.x, y: bf.y - H };
  const det = (R[0] - L[0]) * (F[1] - L[1]) - (F[0] - L[0]) * (R[1] - L[1]);
  const map = (tl, tr, tf) => {
    const a = ((tr - tl) * (F[1] - L[1]) - (tf - tl) * (R[1] - L[1])) / det;
    const c = ((tf - tl) * (R[0] - L[0]) - (tr - tl) * (F[0] - L[0])) / det;
    return [a, c, tl - a * L[0] - c * L[1]];
  };
  const [a, c, e] = map(left.x, right.x, front.x);
  const [b, d, f] = map(left.y, right.y, front.y);
  return { bl, br, bf, left, right, front, m: [a, b, c, d, e, f] };
}

// Durchsichtigkeit der Bilder (verkleinert, einmal ausgelesen) – damit man durch leere Bildecken hindurchtippen kann
const alphaCache = new Map();
function alphaAt(img, u, v) {   // u, v = Anteile 0–1; null = unbekannt
  let a = alphaCache.get(img);
  if (a === undefined) {
    a = null;
    try {
      const w = 96, h = Math.max(1, Math.round(96 * img.height / img.width));
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const g = c.getContext('2d'); g.drawImage(img, 0, 0, w, h);
      const data = g.getImageData(0, 0, w, h).data;
      if (data && data.length === w * h * 4) { a = { w, h, data }; }
    } catch (e) { a = null; }
    alphaCache.set(img, a);
  }
  if (!a) return null;
  const px = Math.min(a.w - 1, Math.max(0, Math.floor(u * a.w))), py = Math.min(a.h - 1, Math.max(0, Math.floor(v * a.h)));
  return a.data[(py * a.w + px) * 4 + 3];
}

// Liegt der Bildschirmpunkt auf einem sichtbaren Teil des Gebäudebilds? null = kein Bild (dann grob prüfen)
function buildingImageHit(b, sx, sy) {
  const def = BUILDINGS[b.type];
  if (settings.footprint) return false;   // Grundriss: nur die Platte selbst zählt
  const view = b.build > 0 ? { img: images['1-baustelle-' + def.size] || images['1-baustelle-2'], mirror: (Number(b.rot) || 0) % 2 === 1 } : buildingView(def, b.rot, b.x, b.y);
  const img = view.img;
  if (!img || !img.sockel) return null;
  const pl = imagePlacement(img, b.x, b.y, def.size, view.mirror, 0, !!def.needsWater && !(b.build > 0));
  if (sy > pl.left.y && sy > pl.right.y && sy > pl.front.y) return null;
  const [a, bb, c, d, e, f] = pl.m, det = a * d - c * bb;
  if (!det) return null;
  const X = sx - e, Y = sy - f;
  let u = (d * X - c * Y) / det, v = (a * Y - bb * X) / det;
  if (view.mirror) u = img.width - u;
  if (u < 0 || v < 0 || u >= img.width || v >= img.height) return false;
  const al = alphaAt(img, u / img.width, v / img.height);
  return al === null ? null : al > 40;
}

function drawImageOnTiles(img, x, y, s, rot, lift = 0, flat = false) {
  const iw = img.width, ih = img.height, p = img.sockel;
  const { bl, br, bf, left, right, front, m } = imagePlacement(img, x, y, s, rot, lift, flat);
  if (!flat) {
  // Einheitlicher Erdsockel für alle Gebäude (der gezeichnete Sockel im Bild wird an der Graskante abgeschnitten)
  const earth = earthPattern();
  ctx.fillStyle = earth || p.farbe;
  ctx.beginPath();
  ctx.moveTo(left.x, left.y); ctx.lineTo(front.x, front.y); ctx.lineTo(right.x, right.y);
  ctx.lineTo(br.x, br.y); ctx.lineTo(bf.x, bf.y); ctx.lineTo(bl.x, bl.y); ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.22)';   // rechte Seite liegt im Schatten
  ctx.beginPath();
  ctx.moveTo(front.x, front.y); ctx.lineTo(right.x, right.y); ctx.lineTo(br.x, br.y); ctx.lineTo(bf.x, bf.y); ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(60,35,15,0.55)';   // dunkle Unterkante wie bei den Bildern
  ctx.lineWidth = Math.max(1, 1.2 * cam.zoom);
  ctx.beginPath(); ctx.moveTo(bl.x, bl.y); ctx.lineTo(bf.x, bf.y); ctx.lineTo(br.x, br.y); ctx.stroke();
  }
  // Abbildung Bild → Bildschirm aus drei Punktpaaren
  const [a, b, c, d, e, f] = m;
  ctx.save();
  // alles unterhalb der Graskante abschneiden: dort sitzt der einheitliche Sockel
  const wide = br.x - bl.x, g = Math.max(1, 0.8 * cam.zoom);
  if (!p.noClip) {   // Hütte auf Säulen: nichts abschneiden (Leiter reicht über den Rand)
  ctx.beginPath();
  ctx.moveTo(left.x - wide, -1e5); ctx.lineTo(left.x - wide, left.y + g); ctx.lineTo(left.x, left.y + g); ctx.lineTo(front.x, front.y + g);
  ctx.lineTo(right.x, right.y + g); ctx.lineTo(right.x + wide, right.y + g); ctx.lineTo(right.x + wide, -1e5); ctx.closePath();
  ctx.clip();
  }
  ctx.transform(a, b, c, d, e, f);
  if (rot) { ctx.translate(iw, 0); ctx.scale(-1, 1); }
  ctx.drawImage(img, 0, 0);
  ctx.restore();
  // Punkt auf dem Bild (Anteile u, v) → Bildschirm – für Feuer und Rauch
  lastImagePoint = (u, v) => {
    const px = (rot ? 1 - u : u) * iw, py = v * ih;
    return { x: a * px + c * py + e, y: b * px + d * py + f };
  };
  return bl.y - (b * iw / 2 + f);   // so hoch ragt das Bild über die seitlichen Ecken der Raute
}
let lastImagePoint = null;

// ---------------------------------------------------------------------
// Leben im Bild: Feuer flackert, Rauch steigt auf, Wasser fließt, Bäume wiegen sich im Wind
// ---------------------------------------------------------------------

// Wo auf den Gebäudebildern brennt ein Feuer (u, v = Anteil von Bildbreite und -höhe) und wo steigt Rauch auf?
// feuer = Größe des Flackerns, rauch = Stärke des Rauchs (0 = keiner)
const EFFECTS = {
  '1-lagerfeuer':        [{ u: 0.50, v: 0.50, feuer: 1.5, rauch: 1.2, rv: 0.38 }],
  '1-feuerplatz':        [{ u: 0.47, v: 0.47, feuer: 1.0, rauch: 0.9, rv: 0.32 }],
  '1-wohnhoehle':        [{ u: 0.45, v: 0.47, feuer: 0.6, rauch: 0 }],
  '1-jaegerlager':       [{ u: 0.50, v: 0.54, feuer: 0.9, rauch: 0.8, rv: 0.49 }],
  '1-fellzelt':          [{ u: 0.33, v: 0.66, feuer: 0.7, rauch: 0.6, rv: 0.62 }],
  '1-mammutjaegerlager': [{ u: 0.43, v: 0.68, feuer: 0.9, rauch: 0.8, rv: 0.63 }],
  '1-ahnenplatz':        [{ u: 0.50, v: 0.51, feuer: 0.7, rauch: 0.6, rv: 0.47 }],
  '1-hoehlenmaler':      [{ u: 0.47, v: 0.53, feuer: 0.7, rauch: 0 }],
  '1-steinkreis':        [{ u: 0.51, v: 0.38, feuer: 0.9, rauch: 0.7, rv: 0.34 }],
  '1-langhaus':          [{ u: 0.76, v: 0.25, feuer: 0, rauch: 1.0 }],
  '1-toepferei':         [{ u: 0.75, v: 0.45, feuer: 0.6, rauch: 0 }, { u: 0.78, v: 0.23, feuer: 0, rauch: 1.1 }],
  // Rückansichten (r2): Feuer und Rauch an den Stellen im jeweiligen Bild
  '1-lagerfeuer-r2':        [{ u: 0.49, v: 0.36, feuer: 1.5, rauch: 1.2, rv: 0.24 }],
  '1-feuerplatz-r2':        [{ u: 0.475, v: 0.63, feuer: 1.0, rauch: 0.9, rv: 0.5 }],
  '1-jaegerlager-r2':       [{ u: 0.50, v: 0.36, feuer: 0.9, rauch: 0.8, rv: 0.31 }],
  '1-fellzelt-r2':          [{ u: 0.80, v: 0.46, feuer: 0.7, rauch: 0.6, rv: 0.40 }],
  '1-mammutjaegerlager-r2': [{ u: 0.56, v: 0.20, feuer: 0.7, rauch: 0.6, rv: 0.15 }],
  '1-ahnenplatz-r2':        [{ u: 0.50, v: 0.33, feuer: 0.7, rauch: 0.6, rv: 0.27 }],
  '1-hoehlenmaler-r2':      [{ u: 0.495, v: 0.55, feuer: 0.7, rauch: 0 }],
  '1-steinkreis-r2':        [{ u: 0.50, v: 0.38, feuer: 0.9, rauch: 0.7, rv: 0.33 }],
  '1-wohnhoehle-r2':        [{ u: 0.55, v: 0.46, feuer: 0.6, rauch: 0 }],
  '1-langhaus-r2':          [{ u: 0.22, v: 0.28, feuer: 0, rauch: 1.0 }],
  '1-toepferei-r2':         [{ u: 0.29, v: 0.44, feuer: 0, rauch: 1.1 }],
};

let smokeQueue = [];   // Rauch wird zuletzt gezeichnet, damit er über allem liegt

function flicker(t, ph) {
  return 0.5 + 0.3 * Math.sin(t * 11 + ph) + 0.2 * Math.sin(t * 23.7 + ph * 3);
}

function drawBuildingEffects(img, name, seed) {
  const list = EFFECTS[name];
  if (!list || !lastImagePoint) return;
  const z = cam.zoom, t = frameTime;
  list.forEach((fx, k) => {
    const ph = seed * 17 + k * 5;
    if (fx.feuer) {
      const p = lastImagePoint(fx.u, fx.v);
      const fl = flicker(t, ph);
      const r = fx.feuer * (14 + fl * 4) * z;
      if (typeof addLight === 'function') addLight(p.x, p.y, fx.feuer * 120 * z);   // leuchtet in der Nacht
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
      grad.addColorStop(0, `rgba(255,190,80,${0.35 + fl * 0.25})`);
      grad.addColorStop(1, 'rgba(255,120,30,0)');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.ellipse(p.x, p.y, r, r * 0.75, 0, 0, 7); ctx.fill();
      // Funken
      for (let i = 0; i < 3; i++) {
        const q = (t * 0.9 + i / 3 + seed) % 1;
        const sx = p.x + Math.sin(t * 3 + i * 2 + ph) * 4 * z * fx.feuer;
        const sy = p.y - q * 26 * z * fx.feuer;
        ctx.fillStyle = `rgba(255,${200 - q * 80},90,${(1 - q) * 0.9})`;
        ctx.beginPath(); ctx.arc(sx, sy, Math.max(0.8, 1.6 * z * (1 - q)), 0, 7); ctx.fill();
      }
      ctx.restore();
    }
    if (fx.rauch) smokeQueue.push({ p: lastImagePoint(fx.u, fx.rv ?? fx.v), s: fx.rauch, ph });
  });
}

function drawSmoke() {
  const z = cam.zoom, t = frameTime, n = 7, period = 5;
  for (const sm of smokeQueue) {
    for (let i = 0; i < n; i++) {
      const q = (t / period + i / n + sm.ph * 0.13) % 1;
      const x = sm.p.x + (q * q * 22 + Math.sin(t * 0.8 + i * 1.7 + sm.ph) * 3) * z * sm.s;
      const y = sm.p.y - q * 70 * z * sm.s;
      const r = (3 + q * 10) * z * sm.s;
      const a = 0.42 * (1 - q) * Math.min(1, q * 6);
      ctx.fillStyle = `rgba(238,236,232,${a})`;
      ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    }
  }
  smokeQueue = [];
}

// Fließendes Wasser: über das vorgezeichnete Wasser zwei langsam wandernde Lagen der Wasser-Textur legen
function drawWater(range) {
  if (!images.wasser) return;
  range = clipToLand(range);   // unter den Wolken fließt nichts (spart auf der großen Karte fast alles)
  const x0 = range.x0 - 1, y0 = range.y0 - 1, x1 = range.x1 + 1, y1 = range.y1 + 1;
  const isWaterShown = (x, y) => isWaterAt(x, y) && landMask[y * N + x] > 0;
  let any = false;
  for (let y = Math.max(0, y0); y <= Math.min(N - 1, y1) && !any; y++)
    for (let x = Math.max(0, x0); x <= Math.min(N - 1, x1); x++) if (isWaterShown(x, y)) { any = true; break; }
  if (!any) return;
  const t = frameTime;
  const o = tileToScreen(0, 0), ex = tileToScreen(1, 0), ey = tileToScreen(0, 1);
  ctx.save();
  ctx.transform(ex.x - o.x, ex.y - o.y, ey.x - o.x, ey.y - o.y, o.x, o.y);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const box = [x0, y0, x1, y1];
  // Schaumsaum am Ufer (atmet leicht)
  paintRegion(ctx, box, isWaterShown, `rgba(255,255,255,${0.32 + 0.12 * Math.sin(t * 1.3)})`, 1.1 + 0.03 * Math.sin(t * 1.3), 2);
  // zwei langsam wandernde Lagen der Wasser-Textur
  paintRegion(ctx, box, isWaterShown, tilePattern(ctx, 'wasser', (t * 0.18) % TEXTURE_TILES, (t * 0.05) % TEXTURE_TILES), 1.0, 2);
  ctx.globalAlpha = 0.35;
  paintRegion(ctx, box, isWaterShown, tilePattern(ctx, 'wasser', (t * 0.07) % TEXTURE_TILES, (t * 0.15) % TEXTURE_TILES), 1.0, 2);
  ctx.restore();
  ctx.globalAlpha = 1;
  // Glitzern
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = Math.max(1, 1.5 * cam.zoom);
  for (let y = Math.max(0, range.y0); y <= range.y1; y++)
    for (let x = Math.max(0, range.x0); x <= range.x1; x++) {
      if (!isWaterShown(x, y)) continue;
      const h = hash(x + 3, y + 11);
      if (h < 0.75) continue;
      const a = Math.pow(Math.max(0, Math.sin(t * 1.7 + h * 40)), 6);
      if (a < 0.05) continue;
      const p = tileToScreen(x + 0.5, y + 0.5);
      ctx.globalAlpha = a * 0.8;
      ctx.beginPath(); ctx.moveTo(p.x - 5 * cam.zoom, p.y); ctx.lineTo(p.x + 5 * cam.zoom, p.y); ctx.stroke();
    }
  ctx.globalAlpha = 1;
}

function drawBuildingSprite(type, x, y, rot, lift = 0, alpha = 1) {
  const def = BUILDINGS[type];
  const s = def.size;
  ctx.globalAlpha = alpha;
  if (def.isPath) {
    const o = worldToScreen(0, 0);
    const pattern = groundPattern(ctx, 'pfad', o.x, o.y, cam.zoom);
    if (pattern) {
      diamondPath(ctx, x, y, 1, 1, tileToScreen, 0.6);
      ctx.fillStyle = pattern;
      ctx.fill();
    } else drawPlot(x, y, 1, '#c9a874', '#a88a58');
    ctx.globalAlpha = 1;
    return;
  }
  if (settings.footprint && !lift && alpha === 1) { drawFootprint(def, x, y, s); ctx.globalAlpha = 1; return; }
  // Ansicht je Drehung, im Winter das verschneite Bild (aus Canva), falls es eins gibt
  const view = buildingView(def, rot, x, y);
  const img = view.img;
  if (img) {
    drawImageOnTiles(img, x, y, s, view.mirror, lift, !!def.needsWater);
    if (alpha === 1 && !lift) drawBuildingEffects(img, view.name, hash(x, y));
    if (def.stilts && alpha === 1 && !lift) drawStiltBoat(x, y, s, rot);
  } else {
    drawPlot(x, y, s, lift ? 'rgba(160,220,110,0.9)' : '#93d466', '#6fae48');
    drawPlaceholder(def, x, y, s, lift);
  }
  ctx.globalAlpha = 1;
}

// Welche Ansicht zeigt ein Gebäude bei Drehung rot (0–3; alte Stände: true = 1)?
// Mit eigenen Bildern (views: r1 = 90°, r2 = 180°): 0 vorne, 1 = r1, 2 = r2, 3 = r1 gespiegelt.
// Ohne: 0 vorne, 1 gespiegelt, 2 = r2 (falls da), 3 = r2 gespiegelt.
function buildingView(def, rot, x = 0, y = 0) {
  const r = (Number(rot) || 0) & 3;
  const has = v => !!(def.views && def.views.includes(v) && images[def.bild + '-' + v]);
  const options = has('r1') ? [['', false], ['r1', false], ['r2', false], ['r1', true]] : [['', false], ['', true], ['r2', false], ['r2', true]];
  let [v, mirror] = options[r];
  if (v && !has(v)) { v = ''; mirror = r % 2 === 1; }
  const name = def.bild ? def.bild + (v ? '-' + v : '') : null;
  const winter = name && state && staggeredSeason(hash(x, y)) === 3;
  // Winterbild aus Canva hat Vorrang; fehlt es, legt das Spiel selbst Schnee aufs Bild
  const img = !name ? null : !winter ? images[name] : images[name + '-winter'] || (missingImages.has(name + '-winter') ? buildingSnow(images[name]) : images[name]);
  return { name, mirror, img };
}

// Grundriss: Platte in der Farbe des Gebäudes mit Zeichen (und Name, wenn groß genug)
function drawFootprint(def, x, y, s, building = true) {
  diamondPath(ctx, x, y, s, s, tileToScreen, 0.08 * s);
  ctx.fillStyle = building ? hexAlpha(def.color || '#a08060', 0.55) : 'rgba(200,170,110,0.45)';
  ctx.fill();
  ctx.strokeStyle = shade(def.color || '#a08060', -0.35);
  ctx.lineWidth = Math.max(1.5, 2.5 * cam.zoom);
  ctx.setLineDash([6 * cam.zoom, 4 * cam.zoom]);
  ctx.stroke();
  ctx.setLineDash([]);
  const c = tileToScreen(x + s / 2, y + s / 2), z = cam.zoom;
  const img = def.bild && images[def.bild];
  const size = Math.max(14, 20 * z * Math.min(1.6, s / 2 + 0.4));
  if (img) ctx.drawImage(img, c.x - size * 0.7, c.y - size * 0.95, size * 1.4, size * 1.4 * img.height / img.width);
  else { ctx.font = `${Math.round(size)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(def.icon, c.x, c.y); }
  if (z >= 0.8) {
    ctx.font = `600 ${Math.round(10 * z)}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillStyle = 'rgba(40,25,10,0.85)';
    ctx.fillText(def.name, c.x, c.y + size * 0.45);
  }
}

function hexAlpha(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

function drawConstruction(b) {
  const def = BUILDINGS[b.type];
  const s = def.size;
  if (settings.footprint) { drawFootprint(def, b.x, b.y, s, false); drawProgress(b, s, 10 * cam.zoom); return; }
  // Baustellen-Bild in passender Größe (fehlt es, das 2×2-Bild vergrößert, sonst ein gezeichnetes Gerüst)
  const img = images['1-baustelle-' + s] || images['1-baustelle-2'];
  let height = (0.55 + s * 0.22) * TH * cam.zoom;
  if (img) {
    height = drawImageOnTiles(img, b.x, b.y, s, (Number(b.rot) || 0) % 2 === 1);
    drawProgress(b, s, height);
    return;
  }
  drawPlot(b.x, b.y, s, '#c8b07a', '#9c8452');
  // Gerüst
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
  drawProgress(b, s, height);
}

// Fortschrittsbalken und Restzeit über einer Baustelle
function drawProgress(b, s, height) {
  const def = BUILDINGS[b.type];
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
  ctx.font = `600 ${Math.max(11, Math.round(12 * cam.zoom))}px ${FONT}`;
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
  if (b.build || def.isPath || b.type === 'lagerfeuer' || cam.zoom < 0.45) return;
  let icon, pic = null, warn = false;
  const road = isConnected(i);
  if (road && !def.produces) return;
  const lacking = def.consumes && Object.keys(def.consumes).find(id => (state.res[id] || 0) < 0.5);
  if (!road) icon = '🛤️❗';
  else if (b.paused) icon = '⏸';
  else if (def.workers && !(stats.staff[i] > 0)) icon = '👤❗';
  else if (lacking) { icon = RESOURCES[lacking].icon + '❗'; pic = images[RESOURCES[lacking].bild]; warn = true; }
  else {
    // Blasen kommen und gehen, damit nicht alles gleichzeitig blinkt
    const phase = (frameTime / 4 + hash(b.x, b.y)) % 1;
    if (phase > 0.55) return;
    icon = RESOURCES[Object.keys(def.produces)[0]].icon;
    pic = images[RESOURCES[Object.keys(def.produces)[0]].bild];   // Warenbild statt Emoji (wie oben in der Leiste)
  }
  const s = def.size;
  const top = tileToScreen(b.x + s / 2, b.y + s / 2);
  const bob = Math.sin(frameTime * 2.5 + b.x) * 2 * cam.zoom;
  const size = Math.max(14, 18 * cam.zoom);
  const y = top.y - (0.55 + s * 0.22) * TH * cam.zoom - size * 1.6 + bob - (images[def.bild] ? s * TH * 0.5 * cam.zoom : 0);
  ctx.font = `${Math.round(size)}px sans-serif`;
  const w = (pic ? size * 1.15 + (warn ? size * 0.7 : 0) : ctx.measureText(icon).width) + size * 0.8;
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  roundRect(top.x - w / 2, y - size * 0.75, w, size * 1.5, size * 0.6); ctx.fill();
  ctx.beginPath(); ctx.moveTo(top.x - 5, y + size * 0.7); ctx.lineTo(top.x + 5, y + size * 0.7); ctx.lineTo(top.x, y + size * 1.1); ctx.fill();
  if (pic) {
    const q = size * 1.25, ox = warn ? -size * 0.35 : 0;
    ctx.drawImage(pic, top.x - q / 2 + ox, y - q / 2, q, q);
    if (warn) {   // rotes Ausrufezeichen: diese Ware fehlt
      ctx.fillStyle = '#d6332a'; ctx.font = `900 ${Math.round(size * 1.1)}px ${FONT}`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('!', top.x + q / 2 + ox + size * 0.25, y);
    }
    return;
  }
  ctx.fillStyle = '#000';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(icon, top.x, y);
}

// ---------------------------------------------------------------------
// Bild zusammensetzen
// ---------------------------------------------------------------------

// Preisschilder auf den Wolken über dem Land, das man kaufen kann (nach der Nacht gezeichnet: bleiben immer gut zu sehen)
let plotTags = [];   // Schilder im aktuellen Bild: { p, x0, y0, x1, y1 } zum Antippen
function drawPlots(range) {
  plotTags = [];
  if (cam.zoom <= 0.22) return;
  const ps = CONFIG.plotSize, price = plotPrice(), afford = canAfford(price);
  const px0 = Math.max(0, Math.floor((landBox.x0 - ps) / ps)), px1 = Math.min(PLOTS - 1, Math.floor((landBox.x1 + ps) / ps));
  const py0 = Math.max(0, Math.floor((landBox.y0 - ps) / ps)), py1 = Math.min(PLOTS - 1, Math.floor((landBox.y1 + ps) / ps));
  const size = Math.max(12, 15 * cam.zoom), text = '🛒 ' + formatAmounts(price);
  ctx.font = `600 ${Math.round(size)}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const w = ctx.measureText(text).width + 16;
  for (let py = py0; py <= py1; py++)
    for (let px = px0; px <= px1; px++) {
      const p = py * PLOTS + px;
      if (state.plots[p] === 1 || !canBuyPlot(p)) continue;
      const c = tileToScreen((px + 0.5) * ps, (py + 0.5) * ps);
      if (c.x < -w || c.x > viewW + w || c.y < -size * 2 || c.y > viewH + size * 2) continue;
      ctx.fillStyle = 'rgba(70,85,110,0.25)';
      roundRect(c.x - w / 2, c.y - size + 2, w, size * 2, size * 0.5); ctx.fill();
      ctx.fillStyle = afford ? 'rgba(255,248,225,0.97)' : 'rgba(226,220,206,0.92)';
      roundRect(c.x - w / 2, c.y - size, w, size * 2, size * 0.5); ctx.fill();
      ctx.fillStyle = afford ? '#4a3420' : '#7a6a58';
      ctx.fillText(text, c.x, c.y + 1);
      plotTags.push({ p, x0: c.x - w / 2, y0: c.y - size, x1: c.x + w / 2, y1: c.y + size });
    }
}

// Liegt unter dem Finger ein Preisschild?
function plotTagAtScreen(sx, sy) {
  const m = 4, t = plotTags.find(q => sx >= q.x0 - m && sx <= q.x1 + m && sy >= q.y0 - m && sy <= q.y1 + m);
  return t ? t.p : -1;
}

function drawGrid(range) {
  range = clipToLand(range);
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

// ---------------------------------------------------------------------
// Trampelpfade: zusammenhängende, runde Wege statt einzelner Rauten. Gezeichnet in Feld-Koordinaten
// (schräge Ansicht per Transformation), erst alle Ränder, dann alle Flächen – so verschmelzen Nachbarfelder.
// ---------------------------------------------------------------------

const PATH_WIDTH = 0.56;   // Breite des Weges (Anteil eines Feldes)

function drawPaths(range) {
  const tiles = [], bridges = [];
  for (const b of state.buildings) {
    if (!BUILDINGS[b.type].isPath) continue;
    if (b.x < range.x0 - 1 || b.x > range.x1 + 1 || b.y < range.y0 - 1 || b.y > range.y1 + 1) continue;
    (BUILDINGS[b.type].onWater ? bridges : tiles).push(b);
  }
  if (!tiles.length && !bridges.length) return;
  const o = tileToScreen(0, 0), ex = tileToScreen(1, 0), ey = tileToScreen(0, 1);
  ctx.save();
  ctx.transform(ex.x - o.x, ex.y - o.y, ey.x - o.x, ey.y - o.y, o.x, o.y);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // Zu jedem Gebäude führt nur EIN Weg hinein: das Wegfeld an der Vorderseite (unten links/rechts im Bild),
  // möglichst mittig. Sonst hätte jedes Wegfeld entlang der Hauswand einen eigenen Stummel zum Haus.
  const door = {};   // Gebäude-Index → { b: Wegfeld, dx, dy, score }
  for (const b of tiles) {
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const i = buildingAt(b.x + dx, b.y + dy);
      if (i < 0) continue;
      const h = state.buildings[i], def = BUILDINGS[h.type];
      if (def.isPath) continue;
      const sz = def.size, front = dx === -1 || dy === -1;   // Weg liegt rechts unten oder links unten vor dem Haus
      const mid = dx !== 0 ? Math.abs(b.y + 0.5 - (h.y + sz / 2)) : Math.abs(b.x + 0.5 - (h.x + sz / 2));
      const score = (front ? 0 : 100) + mid;
      if (!door[i] || score < door[i].score) door[i] = { b, dx, dy, score };
    }
  }
  const shape = () => {
    ctx.beginPath();
    for (const b of tiles) {
      const cx = b.x + 0.5, cy = b.y + 0.5;
      ctx.moveTo(cx, cy); ctx.lineTo(cx + 0.001, cy);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        if (!isPathAt(b.x + dx, b.y + dy)) continue;
        ctx.moveTo(cx, cy); ctx.lineTo(cx + dx * 0.5, cy + dy * 0.5);
      }
    }
    for (const d of Object.values(door)) {
      const cx = d.b.x + 0.5, cy = d.b.y + 0.5;
      ctx.moveTo(cx, cy); ctx.lineTo(cx + d.dx * 0.62, cy + d.dy * 0.62);
    }
  };
  // Rand: etwas dunklere, festgetretene Erde am Grasrand
  shape();
  ctx.strokeStyle = 'rgba(92, 64, 30, 0.55)';
  ctx.lineWidth = PATH_WIDTH + 0.14;
  ctx.stroke();
  // Fläche mit der Weg-Textur
  const img = images.pfad;
  let fill = '#b8915a';
  if (img && ctx.createPattern && typeof DOMMatrix !== 'undefined') {
    fill = ctx.createPattern(img, 'repeat');
    const k = 2 / img.width;   // eine Textur deckt 2 × 2 Felder
    fill.setTransform(new DOMMatrix([k, 0, 0, k, 0, 0]));
  }
  shape();
  ctx.strokeStyle = fill;
  ctx.lineWidth = PATH_WIDTH;
  ctx.stroke();
  // im Winter liegt etwas Schnee auf dem Weg
  const snow = typeof snowCover === 'function' ? snowCover() : 0;
  if (snow > 0) { ctx.strokeStyle = `rgba(245,250,255,${0.35 * snow})`; ctx.stroke(); }
  const sprite = images.bruecke;
  if (!sprite) for (const b of bridges) drawBridge(b, snow);
  ctx.restore();
  for (const b of bridges) {
    if (sprite) drawBridgeSprite(sprite, b, snow);
    else drawBridgeRails(b);
  }
}

// Fackel bzw. Laterne am Wegrand (selbst gezeichnet, kein Bild nötig). Nachts leuchtet sie (Loch in der Dunkelheit).
const TORCH_SPOT = [0.84, 0.16];   // rechte Ecke des Wegfelds – neben dem Weg, nicht mitten drauf
function drawPathLight(p, style, seed) {
  const z = cam.zoom, h = 15 * z, top = p.y - h;
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath(); ctx.ellipse(p.x, p.y, 3 * z, 1.2 * z, 0, 0, 7); ctx.fill();
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#5a3a1c'; ctx.lineWidth = Math.max(1, 1.6 * z);
  ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x, top + 2 * z); ctx.stroke();
  const fl = Math.sin(frameTime * 11 + seed) * 0.5 + Math.sin(frameTime * 17 + seed * 3) * 0.5;
  if (style === 'laterne') {   // für spätere Zeitalter: kleines Gehäuse mit Licht
    ctx.fillStyle = '#3b2a1a'; ctx.fillRect(p.x - 2.6 * z, top - 4.5 * z, 5.2 * z, 6 * z);
    ctx.fillStyle = `rgba(255,${200 + fl * 20},110,0.95)`; ctx.fillRect(p.x - 1.7 * z, top - 3.6 * z, 3.4 * z, 4.2 * z);
  } else {
    ctx.fillStyle = '#7a5530';   // umwickelter Kopf der Fackel
    ctx.beginPath(); ctx.ellipse(p.x, top + 1.5 * z, 1.7 * z, 1.3 * z, 0, 0, 7); ctx.fill();
    const fh = (5 + fl * 1.2) * z, sway = fl * 0.8 * z;
    ctx.fillStyle = '#ff8a1e';
    ctx.beginPath(); ctx.moveTo(p.x - 2 * z, top + 1 * z);
    ctx.quadraticCurveTo(p.x - 1.8 * z + sway, top - fh * 0.5, p.x + sway, top - fh);
    ctx.quadraticCurveTo(p.x + 1.8 * z + sway, top - fh * 0.5, p.x + 2 * z, top + 1 * z); ctx.fill();
    ctx.fillStyle = '#ffe07a';
    ctx.beginPath(); ctx.ellipse(p.x + sway * 0.5, top - fh * 0.25, 0.9 * z, 1.6 * z, 0, 0, 7); ctx.fill();
  }
  if (typeof addLight === 'function') addLight(p.x, p.y - 4 * z, 46 * z);   // leuchtet in der Nacht (Lichtkreis am Boden)
}

// Brückenstück aus Canva: läuft im Bild von unten links nach oben rechts (= entlang y); entlang x gespiegelt
// Brücke aus mehreren Feldern: Das Bild ist etwa 1,6 Felder lang. Jedes Feld zeichnet nur seinen eigenen Abschnitt
// (Scheibe quer zur Laufrichtung) – so entsteht eine durchgehende Brücke statt übereinander gestapelter Bilder.
// Die äußeren Enden (Ufer) werden nicht abgeschnitten, dort sieht man Stammenden und Pfosten.
function isBridgeAt(x, y) {
  const i = buildingAt(x, y);
  return i >= 0 && !!BUILDINGS[state.buildings[i].type].onWater;
}

const BRIDGE_SHEAR = 0.87 - TH / TW;
function drawBridgeSprite(img, b, snow) {
  const p = tileToScreen(b.x + 0.5, b.y + 0.5), z = cam.zoom;
  const w = TW * 1.0 * z, h = w * img.height / img.width;
  const ax = bridgeAlongX(b);
  const [dx, dy] = ax ? [1, 0] : [0, 1];
  const prev = isBridgeAt(b.x - dx, b.y - dy), next = isBridgeAt(b.x + dx, b.y + dy);
  ctx.save();
  if (prev || next) {   // nur den eigenen Abschnitt zeigen (Seite zum Ufer bleibt offen)
    const a0 = prev ? 0 : -3, a1 = next ? 1 : 4;   // Bereich entlang der Laufrichtung (in Feldern ab b.x bzw. b.y)
    const pt = (along, across) => ax ? tileToScreen(b.x + along, b.y + across) : tileToScreen(b.x + across, b.y + along);
    const c = [pt(a0, -3), pt(a1, -3), pt(a1, 4), pt(a0, 4)];
    ctx.beginPath(); ctx.moveTo(c[0].x, c[0].y);
    for (let k = 1; k < 4; k++) ctx.lineTo(c[k].x, c[k].y);
    ctx.closePath(); ctx.clip();
  }
  ctx.translate(p.x, p.y);
  if (ax) ctx.scale(-1, 1);
  // Im Bild steigt die Brücke etwas steiler an (≈ 0,87) als die Rasterachse (22/32 ≈ 0,69): leicht scheren,
  // damit aneinandergereihte Abschnitte genau fluchten (Pfosten bleiben senkrecht)
  ctx.transform(1, BRIDGE_SHEAR, 0, 1, 0, 0);
  ctx.fillStyle = 'rgba(20, 40, 60, 0.25)';   // Schatten im Wasser
  ctx.beginPath(); ctx.ellipse(3 * z, 5 * z, w * 0.42, h * 0.2, 0, 0, 7); ctx.fill();
  ctx.drawImage(img, -w / 2, -h * 0.58, w, h);
  if (snow > 0.3) {   // ein Hauch Schnee auf den Stämmen
    ctx.globalAlpha = 0.3 * snow;
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(img, -w / 2, -h * 0.58, w, h);
  }
  ctx.restore();
}

// Laufrichtung einer Brücke: entlang x, wenn links oder rechts Weg/Brücke/Ufer anschließt, sonst entlang y
function bridgeAlongX(b) {
  const way = (x, y) => isPathAt(x, y);
  if (way(b.x - 1, b.y) || way(b.x + 1, b.y)) return true;
  if (way(b.x, b.y - 1) || way(b.x, b.y + 1)) return false;
  return !isWaterAt(b.x - 1, b.y) || !isWaterAt(b.x + 1, b.y);
}

// Brückenbelag (in Feld-Koordinaten, ctx ist schon transformiert): Schatten, Rand, quer liegende Stämme
const BRIDGE_W = 0.7;
function drawBridge(b, snow) {
  const ax = bridgeAlongX(b), h = BRIDGE_W / 2;
  const [x0, y0, w, hh] = ax ? [b.x - 0.04, b.y + 0.5 - h, 1.08, BRIDGE_W] : [b.x + 0.5 - h, b.y - 0.04, BRIDGE_W, 1.08];
  ctx.fillStyle = 'rgba(20, 40, 60, 0.28)';   // Schatten im Wasser
  ctx.fillRect(x0 + 0.12, y0 + 0.12, w, hh);
  ctx.fillStyle = '#5c3a1a';
  ctx.fillRect(x0 - 0.03, y0 - 0.03, w + 0.06, hh + 0.06);
  const img = images['leiste-holz-steinzeit'];
  let fill = '#9a6332';
  if (img && ctx.createPattern && typeof DOMMatrix !== 'undefined') {
    fill = ctx.createPattern(img, 'repeat');
    const k = 0.16 / 36;   // ein Stamm im Bild ≈ 36 Bildpunkte → 0,16 Felder dick
    // Stämme liegen quer zur Laufrichtung
    fill.setTransform(ax ? new DOMMatrix([0, k, -k, 0, x0, y0]) : new DOMMatrix([k, 0, 0, k, x0, y0]));
  }
  ctx.fillStyle = fill;
  ctx.fillRect(x0, y0, w, hh);
  if (snow > 0) { ctx.fillStyle = `rgba(245,250,255,${0.45 * snow})`; ctx.fillRect(x0, y0, w, hh); }
}

// Geländer: zwei Seile auf Pfosten an den Brückenseiten (im Bild etwas angehoben)
function drawBridgeRails(b) {
  const ax = bridgeAlongX(b), h = BRIDGE_W / 2 + 0.02, z = cam.zoom, lift = 7 * z;
  const sides = ax ? [[[b.x, b.y + 0.5 - h], [b.x + 1, b.y + 0.5 - h]], [[b.x, b.y + 0.5 + h], [b.x + 1, b.y + 0.5 + h]]]
    : [[[b.x + 0.5 - h, b.y], [b.x + 0.5 - h, b.y + 1]], [[b.x + 0.5 + h, b.y], [b.x + 0.5 + h, b.y + 1]]];
  ctx.lineCap = 'round';
  for (const [a, c] of sides) {
    const p = tileToScreen(a[0], a[1]), q = tileToScreen(c[0], c[1]);
    ctx.strokeStyle = '#4a2c12'; ctx.lineWidth = Math.max(1.5, 2.6 * z);
    ctx.beginPath();
    for (const r of [p, q]) { ctx.moveTo(r.x, r.y); ctx.lineTo(r.x, r.y - lift); }   // Pfosten
    ctx.stroke();
    ctx.strokeStyle = '#c9a46a'; ctx.lineWidth = Math.max(1, 1.6 * z);
    ctx.beginPath(); ctx.moveTo(p.x, p.y - lift * 0.85); ctx.quadraticCurveTo((p.x + q.x) / 2, (p.y + q.y) / 2 - lift * 0.5, q.x, q.y - lift * 0.85); ctx.stroke();   // Seil
  }
  ctx.lineCap = 'butt';
}

function drawScene(dt) {
  if (!ctx || !state) return;
  frameTime += dt;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = CLOUD_BASE;   // jenseits des gemalten Bodens: Wolkenfarbe
  ctx.fillRect(0, 0, viewW, viewH);
  const range = visibleRange();
  updateLife(dt, range);
  drawGround(range);
  drawWater(range);
  drawWaterDepth(range);
  drawWaterfall(range);
  drawSeasonGround();
  drawClouds(dt);
  drawDecorSnow(range);
  drawPaths(range);
  if (ghost || pathMode) drawGrid(range);
  if (selected >= 0 && state.buildings[selected]) {
    const b = state.buildings[selected];
    diamondPath(ctx, b.x, b.y, BUILDINGS[b.type].size, BUILDINGS[b.type].size, tileToScreen);
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = Math.max(2, 3 * cam.zoom);
    ctx.stroke();
  }

  // Alles, was nach oben ragt, nach Tiefe sortieren (Mitte des Grundstücks: x + y)
  // visibleRange ist ein Rechteck in Feldern, der Bildschirm darin eine Raute: Felder außerhalb des Bildes überspringen
  // (Bäume und Berge ragen nach oben – unten darum mehr Rand)
  const objects = [];
  // Nur eigenes Land: Was unter den Wolken liegt, wird gar nicht erst angefasst
  const mx = 2 * TW * cam.zoom, top = -20 * cam.zoom, bottom = viewH + 160 * cam.zoom, land = clipToLand(range), thin = cam.zoom < 0.18 ? 0.3 : cam.zoom < 0.25 ? 0.55 : 1;
  for (let y = land.y0; y <= land.y1; y++)
    for (let x = land.x0; x <= land.x1; x++) {
      const t = terrain[y * N + x];
      if (t !== TERRAIN.wald.id && t !== TERRAIN.fels.id && t !== TERRAIN.berg.id) continue;
      if (landMask[y * N + x] !== 2) continue;
      if (thin < 1 && t !== TERRAIN.berg.id && hash(x + 2, y + 5) > thin) continue;   // ganz weit weg: lichter, spart bei viel eigenem Land Rechenzeit
      const p = tileToScreen(x + 0.5, y + 0.5);
      if (p.x < -mx || p.x > viewW + mx || p.y < top || p.y > bottom) continue;
      if (t === TERRAIN.wald.id) objects.push({ d: x + y + 1, kind: 'wald', x, y });
      else if (t === TERRAIN.fels.id) objects.push({ d: x + y + 1, kind: 'fels', x, y });
      else if (t === TERRAIN.berg.id) { const m = mountainAt(x, y); if (m) objects.push({ d: x + y + 1, kind: 'berg', x, y, m }); }
    }
  state.buildings.forEach((b, i) => {
    const s = BUILDINGS[b.type].size;
    if (b.x > range.x1 + 1 || b.y > range.y1 + 1 || b.x + s < range.x0 || b.y + s < range.y0) return;
    if (ghost && ghost.from === i) return;   // wird gerade verschoben
    if (BUILDINGS[b.type].isPath) return;    // Pfade zeichnet drawPaths vorher am Stück
    objects.push({ d: b.x + b.y + s, kind: 'b', i });
  });
  // Fackeln (später Laternen) am Wegrand – wie alles Hohe nach Tiefe sortiert
  if (state.buildings.length) {
    const style = pathLightStyle();
    for (const b of state.buildings) {
      if (!b.torch || b.x < range.x0 || b.x > range.x1 || b.y < range.y0 || b.y > range.y1) continue;
      const p = tileToScreen(b.x + TORCH_SPOT[0], b.y + TORCH_SPOT[1]);
      if (p.x < -mx || p.x > viewW + mx || p.y < top || p.y > bottom) continue;
      objects.push({ d: b.x + b.y + 1, kind: 'leben', x: b.x, draw: () => drawPathLight(p, style, b.x * 7 + b.y) });
    }
  }
  for (const [i, age] of state.saplings) {
    const x = i % N, y = Math.floor(i / N);
    if (x < range.x0 || x > range.x1 || y < range.y0 || y > range.y1) continue;
    objects.push({ d: x + y + 1, kind: 'leben', draw: () => drawSapling(x, y, age / CONFIG.trees.growSeconds) });
  }
  objects.push(...lifeObjects(range));
  objects.sort((a, b) => a.d - b.d || (a.x || 0) - (b.x || 0));
  for (const o of objects) {
    if (o.kind === 'b') {
      const b = state.buildings[o.i];
      if (b.build > 0) drawConstruction(b);
      else drawBuildingSprite(b.type, b.x, b.y, b.rot);
    } else if (o.kind === 'leben') o.draw();
    else if (o.kind === 'berg') drawMountain(o.x, o.y, o.m);
    else drawTerrainObject(o.x, o.y, o.kind);
  }
  drawSmoke();
  drawSky();
  // Winter: leichter blauer Schimmer
  if (seasonIndex() === 3) {
    ctx.fillStyle = 'rgba(200,225,255,0.12)';
    ctx.fillRect(0, 0, viewW, viewH);
  }
  drawWeather(dt);
  drawDayNight();
  // Blasen und das geplante Gebäude bleiben auch nachts und im Regen gut zu sehen
  for (const o of objects) if (o.kind === 'b') drawBubble(o.i);
  drawPlots(range);
  if (state.tutorial >= 0) drawGuide(dt);   // Einstieg: Stammesältester, Vorschau und Pfeile (nur solange er läuft)
  if (ghost) drawGhost(ghost);
}

function resizeCanvas() {
  if (!canvas) return;
  dpr = Math.min(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1) * renderScale;
  const r = canvas.getBoundingClientRect();
  viewW = Math.max(1, r.width);
  viewH = Math.max(1, r.height);
  canvas.width = Math.round(viewW * dpr);
  canvas.height = Math.round(viewH * dpr);
}
