// Lädt Epochia ohne Browser in Node – mit Platzhaltern für Seite (DOM), Canvas und Speicher.
// Die Skripte werden in der Reihenfolge aus index.html geladen, so wie im Browser.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function fakeElement(tag = 'div') {
  const classes = new Set();
  const el = {
    tagName: tag.toUpperCase(),
    children: [],
    dataset: {},
    style: {},
    textContent: '',
    innerHTML: '',
    value: '',
    offsetWidth: 200,
    offsetHeight: 40,
    width: 300,
    height: 150,
    scrollLeft: 0,
    scrollTop: 0,
    classList: {
      add: (...c) => c.forEach(x => classes.add(x)),
      remove: (...c) => c.forEach(x => classes.delete(x)),
      toggle(c, force) {
        const on = force === undefined ? !classes.has(c) : !!force;
        if (on) classes.add(c); else classes.delete(c);
        return on;
      },
      contains: c => classes.has(c),
    },
    addEventListener() {},
    removeEventListener() {},
    appendChild(child) { el.children.push(child); return child; },
    setPointerCapture() {},
    querySelector: () => null,
    querySelectorAll: () => [],
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 844, height: 390 }),
    getContext: () => fakeCanvasContext(),
  };
  return el;
}

function fakeCanvasContext() {
  return new Proxy({}, {
    get(target, prop) {
      if (prop in target) return target[prop];
      if (prop === 'measureText') return text => ({ width: String(text).length * 8 });
      if (prop === 'createRadialGradient' || prop === 'createLinearGradient') return () => ({ addColorStop() {} });
      return () => {};
    },
    set(target, prop, value) { target[prop] = value; return true; },
  });
}

export function fakeStorage(initial = {}) {
  const data = { ...initial };
  return {
    getItem: k => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v); },
    removeItem: k => { delete data[k]; },
    _data: data,
  };
}

function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function scriptList() {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  return [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]);
}

/**
 * Startet Epochia ohne Browser.
 * @returns {{ run: (code: string) => any, errors: string[], logs: string[], storage: object }}
 */
export function loadGame({ storage = {}, seed } = {}) {
  const errors = [];
  const logs = [];
  const elements = new Map();
  const local = fakeStorage(storage);
  const math = Object.create(Math);
  if (seed !== undefined) math.random = seededRandom(seed);

  const document = {
    body: fakeElement('body'),
    visibilityState: 'visible',
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, fakeElement(id === 'map' ? 'canvas' : 'div'));
      return elements.get(id);
    },
    createElement: tag => fakeElement(tag),
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener() {},
  };

  const context = {
    console: {
      log: (...a) => logs.push(a.join(' ')),
      warn: (...a) => logs.push('WARN ' + a.join(' ')),
      error: (...a) => errors.push(a.join(' ')),
    },
    document,
    localStorage: local,
    navigator: {},
    history: { pushState() {}, back() {}, state: null },
    Math: math,
    Date,
    setTimeout: () => 0,
    clearTimeout() {},
    requestAnimationFrame: () => 0,
    devicePixelRatio: 1,
    addEventListener() {},
    btoa: s => Buffer.from(s, 'binary').toString('base64'),
    atob: s => Buffer.from(s, 'base64').toString('binary'),
    escape, unescape,
  };
  context.window = context;
  vm.createContext(context);

  for (const src of scriptList()) {
    try {
      vm.runInContext(fs.readFileSync(path.join(ROOT, src), 'utf8'), context, { filename: src });
    } catch (e) {
      errors.push(`Start ${src}: ${e.stack || e}`);
    }
  }

  return {
    run(code) {
      try {
        return vm.runInContext(code, context, { filename: 'tools' });
      } catch (e) {
        errors.push(e.stack || String(e));
        return undefined;
      }
    },
    errors,
    logs,
    storage: local._data,
  };
}
