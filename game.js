/* Need in a Haystack — a first-person hay-shovelling incremental.
   Tap the haystack to fill your shovel, dump it in the pit, earn coins,
   buy bigger shovels, and eventually turn up the needle. */
(() => {
'use strict';

/* ------------------------------------------------------------------ data */

const SHOVELS = [
  { name: 'Bare Hands',       emoji: '🤲', cap: 5,       tap: 1,      price: 0,          scale: 0.55, blade: '#e8c79a', handle: '#c9a06a', desc: 'Splintery, but free.' },
  { name: 'Garden Trowel',    emoji: '🥄', cap: 14,      tap: 3,      price: 25,         scale: 0.68, blade: '#b9c4cc', handle: '#7c4f2a', desc: 'Borrowed from the flower bed.' },
  { name: 'Rusty Pitchfork',  emoji: '🍴', cap: 40,      tap: 9,      price: 220,        scale: 0.8,  blade: '#a4703f', handle: '#7c4f2a', desc: 'Tetanus sold separately.' },
  { name: 'Wooden Shovel',    emoji: '🪵', cap: 110,     tap: 26,     price: 1600,      scale: 0.9,  blade: '#c08b4e', handle: '#8b5a2b', desc: 'Honest farm tooling.' },
  { name: 'Steel Spade',      emoji: '⚒️', cap: 300,     tap: 72,     price: 1.1e4,      scale: 1.0,  blade: '#cdd6dd', handle: '#6b4423', desc: 'Cuts hay like butter.' },
  { name: "Farmer's Scoop",   emoji: '🪣', cap: 850,     tap: 210,    price: 7e4,      scale: 1.12, blade: '#9fb7c9', handle: '#5c3a1c', desc: 'Grain-grade capacity.' },
  { name: 'Bale Fork',        emoji: '🔱', cap: 2.4e3,   tap: 620,    price: 4.5e5,        scale: 1.25, blade: '#dfe7ee', handle: '#4f3117', desc: 'Moves a bale per swing.' },
  { name: 'Tractor Bucket',   emoji: '🚜', cap: 7e3,     tap: 1.8e3,  price: 3e6,        scale: 1.4,  blade: '#ffd34d', handle: '#3f2a14', desc: 'Hydraulics do the lifting.' },
  { name: 'Excavator Claw',   emoji: '🦾', cap: 2.2e4,   tap: 5.5e3,  price: 2e7,      scale: 1.55, blade: '#f2a03d', handle: '#33210f', desc: 'Not strictly farm equipment.' },
  { name: 'Hay Vortex 3000',  emoji: '🌪️', cap: 7e4,     tap: 1.8e4,  price: 1.4e8,        scale: 1.7,  blade: '#9ee8ff', handle: '#2b3a48', desc: 'Inhales a whole wagon.' },
  { name: 'Antimatter Scoop', emoji: '🌀', cap: 2.6e5,   tap: 6.5e4,  price: 1e9,      scale: 1.85, blade: '#d4a6ff', handle: '#2a1a3a', desc: 'Hay goes in. Hay comes out. Mostly.' },
  { name: 'Hand of Harvest',  emoji: '✨', cap: 1e6,     tap: 2.6e5,  price: 8e9,     scale: 2.0,  blade: '#ffe9a8', handle: '#6d4a12', desc: 'The barn gods approve.' },
];

const UPGRADES = {
  gloves:   { name: 'Grip Gloves',    emoji: '🧤', base: 150,  growth: 2.35, max: 25,
              desc: l => `+25% hay per scoop (now +${l * 25}%)` },
  sift:     { name: 'Sifting Screen', emoji: '🕸️', base: 400,  growth: 2.6,  max: 25,
              desc: l => `×1.3 coins per hay (now ×${(Math.pow(1.3, l)).toFixed(2)})` },
  hands:    { name: 'Farmhand',       emoji: '👨‍🌾', base: 1200, growth: 1.95, max: 12,
              desc: l => `Each hand shovels for you (now ${l} working)` },
  detector: { name: 'Metal Detector', emoji: '📡', base: 8000, growth: 4.2,  max: 6,
              desc: l => l ? `Senses the needle from ${(2 + l * 3)}% away` : 'Senses the needle before you reach it' },
};

const SAVE_KEY = 'needleInHaystack.save.v1';
const BASE_STACK = 1400;      // hay in haystack #1
const STACK_GROWTH = 2.3;     // each haystack is this much bigger
const COIN_GROWTH = 2.2;      // each haystack pays this much better

/* ----------------------------------------------------------------- utils */

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a, b) => a + Math.random() * (b - a);
const SUFFIX = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];

function fmt(n) {
  n = Math.floor(n);
  if (n < 1000) return String(n);
  let tier = Math.floor(Math.log10(Math.abs(n)) / 3);
  tier = Math.min(tier, SUFFIX.length - 1);
  const scaled = n / Math.pow(1000, tier);
  return (scaled < 10 ? scaled.toFixed(2) : scaled < 100 ? scaled.toFixed(1) : Math.floor(scaled)) + SUFFIX[tier];
}

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ----------------------------------------------------------------- state */

const state = {
  coins: 0,
  shovel: 0,
  owned: [0],
  load: 0,
  up: { gloves: 0, sift: 0, hands: 0, detector: 0 },
  stack: 1,
  stackTotal: BASE_STACK,
  searched: 0,
  needleAt: Math.floor(BASE_STACK * rnd(0.35, 1)),
  totalHay: 0,
  totalScoops: 0,
  needles: 0,
  muted: false,
  started: Date.now(),
};

const shovel = () => SHOVELS[state.shovel];
const capacity = () => shovel().cap;
const perScoop = () => Math.ceil(shovel().tap * (1 + state.up.gloves * 0.25));
const coinsPerHay = () => Math.pow(1.3, state.up.sift) * Math.pow(COIN_GROWTH, state.stack - 1);
const handRate = () => state.up.hands * shovel().tap * 0.5; // hay per second
const upgradePrice = (k) => Math.floor(UPGRADES[k].base * Math.pow(UPGRADES[k].growth, state.up[k]));
const hintRange = () => state.stackTotal * (0.02 + state.up.detector * 0.03);

function save() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) { /* private mode */ }
}
function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    Object.assign(state, data);
    state.up = Object.assign({ gloves: 0, sift: 0, hands: 0, detector: 0 }, data.up || {});
    if (!Array.isArray(state.owned) || !state.owned.length) state.owned = [0];
    state.shovel = clamp(state.shovel | 0, 0, SHOVELS.length - 1);
    state.load = clamp(state.load, 0, capacity());
  } catch (e) { /* corrupt save — start fresh */ }
}

/* ----------------------------------------------------------------- audio */

const audio = {
  ctx: null,
  wake() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  },
  noise(dur, freq, gain, type) {
    if (state.muted || !this.ctx) return;
    const ctx = this.ctx;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const filt = ctx.createBiquadFilter();
    filt.type = type || 'bandpass'; filt.frequency.value = freq; filt.Q.value = 0.8;
    const g = ctx.createGain(); g.gain.value = gain;
    src.connect(filt).connect(g).connect(ctx.destination);
    src.start();
  },
  tone(freq, dur, gain, type, delay) {
    if (state.muted || !this.ctx) return;
    const ctx = this.ctx, t0 = ctx.currentTime + (delay || 0);
    const osc = ctx.createOscillator(); osc.type = type || 'triangle';
    osc.frequency.setValueAtTime(freq, t0);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(ctx.destination);
    osc.start(t0); osc.stop(t0 + dur + 0.02);
  },
  scoop() { this.noise(0.16, 1400 + Math.random() * 600, 0.22); },
  dump()  { this.noise(0.34, 620, 0.3, 'lowpass'); },
  coin()  { this.tone(880 + Math.random() * 120, 0.1, 0.06, 'square'); },
  buy()   { [523, 659, 784].forEach((f, i) => this.tone(f, 0.16, 0.08, 'triangle', i * 0.06)); },
  nope()  { this.tone(150, 0.14, 0.07, 'sawtooth'); },
  ding()  { this.tone(1760, 0.09, 0.05, 'sine'); },
  fanfare() { [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.5, 0.11, 'triangle', i * 0.1)); },
};

/* ---------------------------------------------------------------- canvas */

const cv = document.getElementById('scene');
const ctx = cv.getContext('2d');
const view = { w: 0, h: 0, dpr: 1 };
const scene = {
  stackSquash: 0, scoopAnim: 0, dumpAnim: 0, shovelBob: 0,
  pitPile: 0, shake: 0, flash: 0,
};
const particles = [];
const floaters = [];
const sparkles = [];

function resize() {
  view.dpr = Math.min(window.devicePixelRatio || 1, 2);
  view.w = cv.clientWidth;
  view.h = cv.clientHeight;
  cv.width = Math.floor(view.w * view.dpr);
  cv.height = Math.floor(view.h * view.dpr);
  ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
  hayCache.key = '';
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 120));

/* geometry of the scene, recomputed from the current canvas size */
function geo() {
  const W = view.w, H = view.h;
  const groundY = H * 0.62;
  const shrink = lerp(1, 0.62, clamp(state.searched / state.stackTotal, 0, 1));
  const stackW = Math.min(W * 0.98, H * 0.78) * shrink;
  const stackH = stackW * 0.6;
  return {
    W, H, groundY,
    stack: { cx: W * 0.5, base: groundY + H * 0.015, w: stackW, h: stackH },
    pit:   { cx: W * 0.5, cy: H * 0.805, rx: Math.min(W * 0.4, 230), ry: Math.min(H * 0.068, 58) },
  };
}

/* ------------------------------------------------------- haystack render */

const hayCache = { canvas: document.createElement('canvas'), key: '', pad: 14 };

function buildHaystack(w, h) {
  const key = Math.round(w) + 'x' + Math.round(h);
  if (hayCache.key === key) return hayCache.canvas;
  const c = hayCache.canvas;
  const pad = hayCache.pad;
  c.width = Math.max(1, Math.ceil((w + pad * 2) * view.dpr));
  c.height = Math.max(1, Math.ceil((h + pad * 2) * view.dpr));
  const g = c.getContext('2d');
  g.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
  g.clearRect(0, 0, w + pad * 2, h + pad * 2);
  g.translate(pad + w / 2, pad + h);

  const rand = mulberry32(1337);
  const rr = (a, b) => a + rand() * (b - a);
  // profile of the mound: half-ellipse with a couple of lumps
  const lumps = [[rr(-0.5, -0.2), rr(0.06, 0.13)], [rr(0.2, 0.5), rr(0.05, 0.12)]];
  const profile = (x) => {
    if (Math.abs(x) >= 1) return 0;
    let y = Math.sqrt(1 - x * x);
    for (const [lx, la] of lumps) y += la * Math.exp(-Math.pow((x - lx) * 3.2, 2));
    return Math.max(0, y);
  };

  // silhouette
  g.beginPath();
  g.moveTo(-w / 2, 0);
  for (let i = 0; i <= 80; i++) {
    const t = -1 + (2 * i) / 80;
    g.lineTo((t * w) / 2, -profile(t) * h);
  }
  g.lineTo(w / 2, 0);
  g.closePath();
  const grad = g.createLinearGradient(-w / 2, -h, w / 2, 0);
  grad.addColorStop(0, '#f0cc6a');
  grad.addColorStop(0.45, '#d9a83c');
  grad.addColorStop(1, '#8a5f1d');
  g.fillStyle = grad;
  g.fill();

  // straws
  const count = Math.floor(clamp(w * 1.5, 320, 900));
  for (let i = 0; i < count; i++) {
    let x, y, tries = 0;
    do {
      x = rand() * 2 - 1;
      y = rand();
      tries++;
    } while (y > profile(x) && tries < 8);
    const px = (x * w) / 2;
    const py = -y * h;
    const light = clamp(1 - y * 0.55 + (-x) * 0.18, 0.15, 1);
    const len = rr(6, 20) * (0.6 + w / 520);
    const ang = rr(-Math.PI, Math.PI) * (rand() < 0.7 ? 0.35 : 1) - 0.4;
    g.strokeStyle = `hsl(${rr(36, 48)}, ${rr(55, 85)}%, ${18 + light * 45}%)`;
    g.lineWidth = rr(0.8, 2.1);
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(px, py);
    g.lineTo(px + Math.cos(ang) * len, py + Math.sin(ang) * len * 0.6);
    g.stroke();
  }

  // fuzzy rim
  for (let i = 0; i < 140; i++) {
    const t = rand() * 2 - 1;
    const px = (t * w) / 2;
    const py = -profile(t) * h;
    const ang = -Math.PI / 2 + rr(-0.9, 0.9);
    const len = rr(5, 16);
    g.strokeStyle = `hsla(45, 80%, ${rr(62, 84)}%, .85)`;
    g.lineWidth = rr(0.7, 1.6);
    g.beginPath();
    g.moveTo(px, py);
    g.lineTo(px + Math.cos(ang) * len, py + Math.sin(ang) * len);
    g.stroke();
  }

  hayCache.key = key;
  return c;
}

/* ----------------------------------------------------------- scene paint */

function drawBackground(G) {
  const { W, H, groundY } = G;
  // barn interior wall
  const wall = ctx.createLinearGradient(0, 0, 0, groundY);
  wall.addColorStop(0, '#38220f');
  wall.addColorStop(0.55, '#5d3a1c');
  wall.addColorStop(1, '#43290f');
  ctx.fillStyle = wall;
  ctx.fillRect(0, 0, W, groundY + 2);

  // planks
  ctx.strokeStyle = 'rgba(0,0,0,.22)';
  ctx.lineWidth = 2;
  const plank = Math.max(26, H * 0.055);
  for (let y = plank; y < groundY; y += plank) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }

  // sunlit window
  const wx = W * 0.14, wy = H * 0.1, ww = W * 0.2, wh = H * 0.15;
  ctx.fillStyle = 'rgba(255,238,180,.13)';
  ctx.fillRect(wx, wy, ww, wh);
  ctx.strokeStyle = 'rgba(28,17,7,.75)'; ctx.lineWidth = 5;
  ctx.strokeRect(wx, wy, ww, wh);
  ctx.beginPath();
  ctx.moveTo(wx + ww / 2, wy); ctx.lineTo(wx + ww / 2, wy + wh);
  ctx.moveTo(wx, wy + wh / 2); ctx.lineTo(wx + ww, wy + wh / 2);
  ctx.stroke();
  // shaft of light
  const shaft = ctx.createLinearGradient(wx, wy, wx + W * 0.5, groundY);
  shaft.addColorStop(0, 'rgba(255,229,150,.16)');
  shaft.addColorStop(1, 'rgba(255,229,150,0)');
  ctx.fillStyle = shaft;
  ctx.beginPath();
  ctx.moveTo(wx, wy + wh); ctx.lineTo(wx + ww, wy);
  ctx.lineTo(wx + ww + W * 0.42, groundY); ctx.lineTo(wx + W * 0.16, groundY);
  ctx.closePath(); ctx.fill();

  // floor
  const floor = ctx.createLinearGradient(0, groundY, 0, H);
  floor.addColorStop(0, '#5a3a1b');
  floor.addColorStop(1, '#2a1a0b');
  ctx.fillStyle = floor;
  ctx.fillRect(0, groundY, W, H - groundY);
  ctx.strokeStyle = 'rgba(0,0,0,.25)';
  ctx.lineWidth = 2;
  for (let i = -6; i <= 6; i++) {
    ctx.beginPath();
    ctx.moveTo(W / 2 + i * W * 0.1, groundY);
    ctx.lineTo(W / 2 + i * W * 0.42, H);
    ctx.stroke();
  }
  // scattered floor straw
  const rand = mulberry32(99);
  ctx.strokeStyle = 'rgba(224,184,96,.45)';
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 60; i++) {
    const t = rand();
    const x = rand() * W;
    const y = groundY + t * (H - groundY);
    const len = 5 + t * 16;
    const a = rand() * Math.PI;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len * 0.35);
    ctx.stroke();
  }
}

function drawStack(G) {
  const s = G.stack;
  const squash = scene.stackSquash;
  const w = s.w * (1 + squash * 0.035);
  const h = s.h * (1 - squash * 0.06);
  const img = buildHaystack(s.w, s.h);
  const pad = hayCache.pad;

  // contact shadow
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  ctx.beginPath();
  ctx.ellipse(s.cx, s.base + 4, w * 0.55, h * 0.1, 0, 0, Math.PI * 2);
  ctx.filter = 'blur(2px)';
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(s.cx, s.base);
  ctx.scale(w / s.w, h / s.h);
  ctx.drawImage(img, -(s.w / 2 + pad), -(s.h + pad), s.w + pad * 2, s.h + pad * 2);
  ctx.restore();
}

function drawPit(G) {
  const p = G.pit;
  // hole
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(p.cx, p.cy, p.rx, p.ry, 0, 0, Math.PI * 2);
  const hole = ctx.createRadialGradient(p.cx, p.cy, 2, p.cx, p.cy, p.rx);
  hole.addColorStop(0, '#0a0603');
  hole.addColorStop(0.75, '#17100a');
  hole.addColorStop(1, '#2a1b0d');
  ctx.fillStyle = hole;
  ctx.fill();

  // hay settled inside the pit
  const fill = clamp(scene.pitPile, 0, 1);
  if (fill > 0.01) {
    ctx.save();
    ctx.clip();
    const top = p.cy + p.ry - fill * p.ry * 2.1;
    ctx.fillStyle = '#c69633';
    ctx.beginPath();
    ctx.ellipse(p.cx, top + p.ry, p.rx * 0.98, p.ry * 1.25, 0, 0, Math.PI * 2);
    ctx.fill();
    const rand = mulberry32(7);
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 70; i++) {
      const x = p.cx + (rand() * 2 - 1) * p.rx * 0.9;
      const y = top + rand() * p.ry * 1.6;
      const a = rand() * Math.PI;
      ctx.strokeStyle = `hsla(${40 + rand() * 8}, 70%, ${40 + rand() * 30}%, .9)`;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a) * 10, y + Math.sin(a) * 4);
      ctx.stroke();
    }
    ctx.restore();
  }
  ctx.restore();

  // wooden rim
  ctx.save();
  ctx.lineWidth = Math.max(9, p.ry * 0.34);
  const rim = ctx.createLinearGradient(p.cx - p.rx, p.cy, p.cx + p.rx, p.cy);
  rim.addColorStop(0, '#5b3a1c');
  rim.addColorStop(0.5, '#8b5a2b');
  rim.addColorStop(1, '#4b2f16');
  ctx.strokeStyle = rim;
  ctx.beginPath();
  ctx.ellipse(p.cx, p.cy, p.rx, p.ry, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(0,0,0,.35)';
  ctx.stroke();
  ctx.restore();

  // label
  ctx.save();
  ctx.font = '600 11px ui-rounded, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,244,220,.38)';
  ctx.fillText('SEARCH PIT', p.cx, p.cy - p.ry - 12);
  ctx.restore();
}

function drawShovel(G) {
  const { W, H } = G;
  const sh = shovel();
  const loadPct = capacity() ? state.load / capacity() : 0;
  const size = Math.min(W * 0.16, H * 0.13) * (0.8 + sh.scale * 0.45);

  // rest pose bottom-right; lifts toward the stack on scoop, tips over the pit on dump
  const bob = Math.sin(scene.shovelBob) * 5;
  const scoopT = scene.scoopAnim;
  const dumpT = scene.dumpAnim;
  const restX = W * 0.79, restY = H * 0.87 + bob;
  const scoopX = lerp(restX, W * 0.62, Math.sin(scoopT * Math.PI));
  const scoopY = lerp(restY, H * 0.7, Math.sin(scoopT * Math.PI));
  const x = lerp(scoopX, G.pit.cx + G.pit.rx * 0.35, Math.sin(dumpT * Math.PI));
  const y = lerp(scoopY, G.pit.cy - G.pit.ry * 1.1, Math.sin(dumpT * Math.PI));
  const rot = -0.5 - Math.sin(scoopT * Math.PI) * 0.35 + Math.sin(dumpT * Math.PI) * 2.3;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);

  // handle
  ctx.lineCap = 'round';
  ctx.strokeStyle = sh.handle;
  ctx.lineWidth = size * 0.17;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(size * 2.1, size * 2.1);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,.18)';
  ctx.lineWidth = size * 0.05;
  ctx.beginPath();
  ctx.moveTo(size * 0.2, size * 0.28);
  ctx.lineTo(size * 2.0, size * 2.0);
  ctx.stroke();

  // blade
  ctx.beginPath();
  ctx.moveTo(-size * 0.62, -size * 0.2);
  ctx.quadraticCurveTo(-size * 0.75, size * 0.62, 0, size * 0.72);
  ctx.quadraticCurveTo(size * 0.75, size * 0.62, size * 0.62, -size * 0.2);
  ctx.quadraticCurveTo(0, -size * 0.55, -size * 0.62, -size * 0.2);
  ctx.closePath();
  const bg = ctx.createLinearGradient(-size, -size, size, size);
  bg.addColorStop(0, '#ffffff55');
  bg.addColorStop(0.25, sh.blade);
  bg.addColorStop(1, 'rgba(0,0,0,.45)');
  ctx.fillStyle = sh.blade;
  ctx.fill();
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.lineWidth = size * 0.055;
  ctx.strokeStyle = 'rgba(0,0,0,.4)';
  ctx.stroke();

  // hay heaped in the blade
  if (loadPct > 0.01) {
    ctx.save();
    ctx.clip();
    const top = size * 0.72 - loadPct * size * 1.3;
    ctx.fillStyle = '#e0b043';
    ctx.beginPath();
    ctx.ellipse(0, top + size * 0.4, size * 0.72, size * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    const rand = mulberry32(21);
    ctx.lineWidth = Math.max(1, size * 0.03);
    for (let i = 0; i < 18; i++) {
      const px = (rand() * 2 - 1) * size * 0.6;
      const py = top + rand() * size * 0.3;
      const a = rand() * Math.PI - Math.PI / 2;
      ctx.strokeStyle = `hsla(44, 75%, ${55 + rand() * 25}%, .9)`;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + Math.cos(a) * size * 0.2, py + Math.sin(a) * size * 0.14);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/* ------------------------------------------------------------- particles */

function spawnHay(x, y, n, tx, ty) {
  for (let i = 0; i < n; i++) {
    const toTarget = tx !== undefined;
    particles.push({
      x: x + rnd(-14, 14), y: y + rnd(-14, 14),
      vx: toTarget ? (tx - x) * 1.35 + rnd(-60, 60) : rnd(-140, 140),
      vy: toTarget ? (ty - y) * 1.35 - rnd(120, 260) : rnd(-260, -80),
      g: 720, life: 1, rot: rnd(0, 6.3), vr: rnd(-9, 9),
      len: rnd(6, 15), hue: rnd(38, 50), light: rnd(45, 78),
    });
  }
  if (particles.length > 260) particles.splice(0, particles.length - 260);
}

function spawnSparkle(G) {
  const s = G.stack;
  const t = rnd(-0.85, 0.85);
  sparkles.push({
    x: s.cx + (t * s.w) / 2,
    y: s.base - rnd(0.15, 0.85) * s.h,
    life: 1, size: rnd(5, 11),
  });
}

function floatText(x, y, text, color, size) {
  floaters.push({ x, y, text, color: color || '#ffcf4d', size: size || 17, life: 1, vy: -52 });
  if (floaters.length > 24) floaters.shift();
}

function stepParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.vy += p.g * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.rot += p.vr * dt;
    p.life -= dt * 1.25;
    if (p.life <= 0) particles.splice(i, 1);
  }
  for (let i = floaters.length - 1; i >= 0; i--) {
    const f = floaters[i];
    f.y += f.vy * dt;
    f.vy *= 0.94;
    f.life -= dt * 0.85;
    if (f.life <= 0) floaters.splice(i, 1);
  }
  for (let i = sparkles.length - 1; i >= 0; i--) {
    const s = sparkles[i];
    s.life -= dt * 1.4;
    if (s.life <= 0) sparkles.splice(i, 1);
  }
}

function drawParticles() {
  ctx.lineCap = 'round';
  for (const p of particles) {
    ctx.save();
    ctx.globalAlpha = clamp(p.life, 0, 1);
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.strokeStyle = `hsl(${p.hue}, 72%, ${p.light}%)`;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-p.len / 2, 0);
    ctx.lineTo(p.len / 2, 0);
    ctx.stroke();
    ctx.restore();
  }
  for (const s of sparkles) {
    const a = Math.sin(s.life * Math.PI);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(s.x, s.y);
    ctx.fillStyle = '#fff6cf';
    ctx.shadowColor = '#ffd75e';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const ang = (i * Math.PI) / 2;
      ctx.lineTo(Math.cos(ang) * s.size, Math.sin(ang) * s.size);
      ctx.lineTo(Math.cos(ang + Math.PI / 4) * s.size * 0.32, Math.sin(ang + Math.PI / 4) * s.size * 0.32);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  for (const f of floaters) {
    ctx.save();
    ctx.globalAlpha = clamp(f.life, 0, 1);
    ctx.font = `800 ${f.size}px ui-rounded, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.lineWidth = 3.5;
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;
    ctx.strokeStyle = 'rgba(20,12,4,.8)';
    ctx.strokeText(f.text, f.x, f.y);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
    ctx.restore();
  }
}

/* ------------------------------------------------------------ core loop  */

let last = performance.now();
let saveTimer = 0, handBank = 0, sparkTimer = 0;

function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;
  update(dt);
  render();
  requestAnimationFrame(frame);
}

function update(dt) {
  scene.stackSquash = Math.max(0, scene.stackSquash - dt * 5);
  scene.scoopAnim = Math.max(0, scene.scoopAnim - dt * 4.5);
  scene.dumpAnim = Math.max(0, scene.dumpAnim - dt * 2.4);
  scene.shake = Math.max(0, scene.shake - dt * 3);
  scene.flash = Math.max(0, scene.flash - dt * 1.6);
  scene.shovelBob += dt * 2.2;
  scene.pitPile = Math.max(0, scene.pitPile - dt * 0.16);

  // farmhands keep working
  const rate = handRate();
  if (rate > 0 && !gameOverlayOpen()) {
    handBank += rate * dt;
    if (handBank >= 1) {
      const n = Math.floor(handBank);
      handBank -= n;
      processHay(n, true);
      const G = geo();
      if (Math.random() < dt * 6) spawnHay(G.stack.cx + rnd(-G.stack.w / 3, G.stack.w / 3), G.stack.base - G.stack.h * 0.4, 2, G.pit.cx, G.pit.cy);
    }
  }

  // detector chatter when the needle is near
  const away = state.needleAt - state.searched;
  const near = away > 0 && away <= hintRange();
  sparkTimer -= dt;
  if (near && sparkTimer <= 0) {
    sparkTimer = clamp(away / hintRange(), 0.08, 1) * 0.5;
    spawnSparkle(geo());
    audio.ding();
  }
  updateDetectorLine(near, away);

  saveTimer += dt;
  if (saveTimer > 5) { saveTimer = 0; save(); }

  stepParticles(dt);
}

function render() {
  const G = geo();
  ctx.clearRect(0, 0, G.W, G.H);
  ctx.save();
  if (scene.shake > 0) {
    ctx.translate(rnd(-1, 1) * scene.shake * 7, rnd(-1, 1) * scene.shake * 7);
  }
  drawBackground(G);
  drawStack(G);
  drawPit(G);
  drawParticles();
  drawShovel(G);
  ctx.restore();

  if (scene.flash > 0) {
    ctx.fillStyle = `rgba(255,236,170,${scene.flash * 0.5})`;
    ctx.fillRect(0, 0, G.W, G.H);
  }
}

/* ---------------------------------------------------------- game actions */

function gameOverlayOpen() {
  return document.getElementById('winModal').classList.contains('open');
}

function scoop(x, y) {
  const cap = capacity();
  if (state.load >= cap) {
    showHint('Shovel is full — tap the pit to dump it!');
    audio.nope();
    scene.dumpAnim = 0.35;
    return;
  }
  const amount = Math.min(perScoop(), cap - state.load);
  state.load += amount;
  state.totalScoops++;
  scene.stackSquash = 1;
  scene.scoopAnim = 1;
  audio.scoop();
  const G = geo();
  spawnHay(x, y, clamp(Math.round(4 + amount / 6), 4, 16), G.W * 0.78, G.H * 0.84);
  floatText(x, y - 10, '+' + fmt(amount) + ' hay', '#ffe9a8', 15);
  if (state.load >= cap) showHint('Shovel full! Tap the pit below.');
  refreshHUD();
}

function dump() {
  if (state.load <= 0) {
    showHint('Nothing to dump — tap the haystack first.');
    audio.nope();
    return;
  }
  const amount = state.load;
  state.load = 0;
  scene.dumpAnim = 1;
  scene.pitPile = clamp(scene.pitPile + 0.28, 0, 1);
  audio.dump();
  const G = geo();
  spawnHay(G.pit.cx, G.pit.cy - G.pit.ry, clamp(Math.round(8 + amount / 4), 8, 40));
  processHay(amount, false);
  refreshHUD();
}

function processHay(amount, quiet) {
  const gained = Math.max(1, Math.floor(amount * coinsPerHay()));
  state.coins += gained;
  state.searched += amount;
  state.totalHay += amount;
  const G = geo();
  if (!quiet) {
    floatText(G.pit.cx + rnd(-30, 30), G.pit.cy - G.pit.ry - 14, '+' + fmt(gained) + ' 🪙');
    audio.coin();
    bumpCoins();
  }
  if (state.searched >= state.needleAt) findNeedle();
  refreshHUD();
}

function findNeedle() {
  if (gameOverlayOpen()) return;
  state.needles++;
  const bonus = Math.floor(Math.max(100, state.stackTotal * coinsPerHay() * 0.5));
  state.coins += bonus;
  scene.flash = 1;
  scene.shake = 1;
  audio.fanfare();
  for (let i = 0; i < 40; i++) spawnSparkle(geo());
  save();

  document.getElementById('winText').textContent =
    `After ${fmt(state.searched)} pieces of hay, something glinted in the pit. Haystack #${state.stack} is officially solved.`;
  document.getElementById('winStats').innerHTML = `
    <div><span>Needle bounty</span><span>🪙 ${fmt(bonus)}</span></div>
    <div><span>Hay searched</span><span>${fmt(state.searched)}</span></div>
    <div><span>Needles found</span><span>${state.needles}</span></div>
    <div><span>Next haystack pays</span><span>×${COIN_GROWTH.toFixed(1)} coins</span></div>`;
  openModal('winModal');
  refreshHUD();
}

function nextStack() {
  state.stack++;
  state.stackTotal = Math.floor(BASE_STACK * Math.pow(STACK_GROWTH, state.stack - 1));
  state.needleAt = Math.floor(state.stackTotal * rnd(0.35, 1));
  state.searched = 0;
  state.load = 0;
  scene.pitPile = 0;
  hayCache.key = '';
  closeModal('winModal');
  showHint(`Haystack #${state.stack}. Bigger hay, better coins.`);
  save();
  refreshHUD();
  renderShop();
}

/* ------------------------------------------------------------- buying    */

function buyShovel(i) {
  if (state.owned.includes(i)) {
    state.shovel = i;
    state.load = Math.min(state.load, capacity());
    audio.buy();
  } else {
    const prev = i - 1;
    if (prev >= 0 && !state.owned.includes(prev)) { audio.nope(); return; }
    if (state.coins < SHOVELS[i].price) { audio.nope(); return; }
    state.coins -= SHOVELS[i].price;
    state.owned.push(i);
    state.shovel = i;
    audio.buy();
    showHint(`${SHOVELS[i].name} equipped!`);
  }
  save();
  refreshHUD();
  renderShop();
}

function buyUpgrade(key) {
  const u = UPGRADES[key];
  if (state.up[key] >= u.max) { audio.nope(); return; }
  const price = upgradePrice(key);
  if (state.coins < price) { audio.nope(); return; }
  state.coins -= price;
  state.up[key]++;
  audio.buy();
  save();
  refreshHUD();
  renderShop();
}

/* ------------------------------------------------------------------- UI  */

const el = (id) => document.getElementById(id);
const ui = {
  coinCount: el('coinCount'), coinBox: el('coinBox'), stackName: el('stackName'),
  stackProgress: el('stackProgress'), stackProgressText: el('stackProgressText'),
  shovelName: el('shovelName'), shovelLoad: el('shovelLoad'), loadFill: el('loadFill'),
  shopBody: el('shopBody'), shopCoins: el('shopCoins'), shopDot: el('shopDot'),
  hint: el('hint'), detector: el('detectorLine'),
};
let shopTab = 'shovels';
let hintTimer = null;

function bumpCoins() {
  ui.coinBox.classList.add('bump');
  setTimeout(() => ui.coinBox.classList.remove('bump'), 120);
}

function showHint(text) {
  ui.hint.textContent = text;
  ui.hint.classList.add('show');
  clearTimeout(hintTimer);
  hintTimer = setTimeout(() => ui.hint.classList.remove('show'), 2600);
}

function updateDetectorLine(near, away) {
  if (near) {
    const pct = clamp(1 - away / hintRange(), 0, 1);
    const heat = pct > 0.8 ? 'BURNING HOT' : pct > 0.5 ? 'very warm' : 'warm';
    ui.detector.textContent = `📡 *click* *click* — something metal is ${heat}`;
    ui.detector.classList.add('on');
  } else {
    ui.detector.classList.remove('on');
  }
}

function refreshHUD() {
  const cap = capacity();
  ui.coinCount.textContent = fmt(state.coins);
  ui.shopCoins.textContent = fmt(state.coins);
  ui.stackName.textContent = `Haystack #${state.stack}`;
  const pct = clamp((state.searched / state.stackTotal) * 100, 0, 100);
  ui.stackProgress.style.width = pct.toFixed(2) + '%';
  ui.stackProgressText.textContent = `${fmt(state.searched)} / ${fmt(state.stackTotal)} hay searched`;
  ui.shovelName.textContent = shovel().name;
  ui.shovelLoad.textContent = `${fmt(state.load)} / ${fmt(cap)}`;
  const lp = cap ? (state.load / cap) * 100 : 0;
  ui.loadFill.style.width = lp.toFixed(1) + '%';
  ui.loadFill.classList.toggle('full', state.load >= cap);
  ui.shopDot.classList.toggle('hidden', !anythingAffordable());
  // haystack visibly shrinks as it is searched
  const wanted = geo().stack;
  if (hayCache.key && hayCache.key !== Math.round(wanted.w) + 'x' + Math.round(wanted.h)) hayCache.key = '';
}

function anythingAffordable() {
  const next = SHOVELS.findIndex((s, i) => !state.owned.includes(i));
  if (next >= 0 && state.coins >= SHOVELS[next].price) return true;
  return Object.keys(UPGRADES).some(k => state.up[k] < UPGRADES[k].max && state.coins >= upgradePrice(k));
}

function row({ emoji, name, desc, cls, btnLabel, btnCls, disabled, onClick }) {
  const d = document.createElement('div');
  d.className = 'item ' + (cls || '');
  d.innerHTML = `<div class="item-emoji">${emoji}</div>
    <div class="item-info"><div class="item-name"></div><div class="item-desc"></div></div>`;
  d.querySelector('.item-name').textContent = name;
  d.querySelector('.item-desc').textContent = desc;
  const b = document.createElement('button');
  b.className = 'btn-buy ' + (btnCls || '');
  b.innerHTML = btnLabel;
  b.disabled = !!disabled;
  if (onClick) b.addEventListener('click', onClick);
  d.appendChild(b);
  return d;
}

let shopSig = '';
function renderShop(force) {
  const sig = [shopTab, state.coins >= 0 ? Math.floor(Math.log10(state.coins + 1) * 40) : 0,
    state.shovel, state.owned.length, state.stack,
    Object.keys(UPGRADES).map(k => state.up[k]).join('-'),
    Object.keys(UPGRADES).map(k => state.coins >= upgradePrice(k)).join('-'),
    SHOVELS.map((s2, i) => state.coins >= s2.price).join('-')].join('|');
  if (!force && sig === shopSig) return;
  shopSig = sig;
  const body = ui.shopBody;
  const scroll = body.scrollTop;
  body.innerHTML = '';
  ui.shopCoins.textContent = fmt(state.coins);

  if (shopTab === 'shovels') {
    SHOVELS.forEach((s, i) => {
      const owned = state.owned.includes(i);
      const equipped = state.shovel === i;
      const unlocked = i === 0 || state.owned.includes(i - 1);
      const desc = `${s.desc}  •  ${fmt(s.cap)} capacity  •  ${fmt(s.tap)} hay per scoop`;
      let label, btnCls = '', disabled = false, cls = '';
      if (equipped) { label = 'In hand'; btnCls = 'tag'; disabled = true; cls = 'equipped'; }
      else if (owned) { label = 'Equip'; btnCls = 'equip'; cls = 'owned'; }
      else if (!unlocked) { label = 'Locked'; disabled = true; cls = 'locked'; }
      else { label = '🪙 ' + fmt(s.price); disabled = state.coins < s.price; }
      body.appendChild(row({
        emoji: s.emoji, name: s.name, desc, cls, btnLabel: label, btnCls, disabled,
        onClick: () => buyShovel(i),
      }));
    });
  } else {
    Object.keys(UPGRADES).forEach(key => {
      const u = UPGRADES[key];
      const lvl = state.up[key];
      const maxed = lvl >= u.max;
      const price = upgradePrice(key);
      body.appendChild(row({
        emoji: u.emoji,
        name: `${u.name}${lvl ? ` — Lv ${lvl}` : ''}`,
        desc: u.desc(lvl),
        cls: maxed ? 'owned' : '',
        btnLabel: maxed ? 'MAX' : '🪙 ' + fmt(price),
        btnCls: maxed ? 'tag' : '',
        disabled: maxed || state.coins < price,
        onClick: () => buyUpgrade(key),
      }));
    });
    const info = document.createElement('div');
    info.className = 'item';
    info.innerHTML = `<div class="item-emoji">📈</div><div class="item-info">
      <div class="item-name">Current rates</div>
      <div class="item-desc">${fmt(perScoop())} hay per scoop · ${coinsPerHay() < 10 ? coinsPerHay().toFixed(2) : fmt(coinsPerHay())} coins per hay${handRate() > 0 ? ` · ${fmt(handRate())} hay/sec from farmhands` : ''}</div>
    </div>`;
    body.appendChild(info);
  }
  body.scrollTop = scroll;
}

function openDrawer() {
  el('shop').classList.add('open');
  renderShop(true);
}
function closeDrawer() { el('shop').classList.remove('open'); }
function openModal(id) { el(id).classList.add('open'); }
function closeModal(id) { el(id).classList.remove('open'); }

function showStats() {
  const mins = Math.floor((Date.now() - state.started) / 60000);
  const rows = [
    ['Needles found', state.needles],
    ['Current haystack', '#' + state.stack],
    ['Hay searched (all time)', fmt(state.totalHay)],
    ['Scoops taken', fmt(state.totalScoops)],
    ['Coins', fmt(state.coins)],
    ['Shovel', shovel().name],
    ['Hay per scoop', fmt(perScoop())],
    ['Coins per hay', coinsPerHay() < 10 ? coinsPerHay().toFixed(2) : fmt(coinsPerHay())],
    ['Farmhands', state.up.hands + ' (' + fmt(handRate()) + ' hay/sec)'],
    ['Time on the farm', mins < 60 ? mins + ' min' : Math.floor(mins / 60) + 'h ' + (mins % 60) + 'm'],
  ];
  el('statsList').innerHTML = rows.map(r => `<li><span>${r[0]}</span><span>${r[1]}</span></li>`).join('');
  openModal('statsModal');
}

/* ---------------------------------------------------------------- input  */

function pointInEllipse(x, y, cx, cy, rx, ry) {
  const dx = (x - cx) / rx, dy = (y - cy) / ry;
  return dx * dx + dy * dy <= 1;
}

function pointInStack(x, y, G) {
  const s = G.stack;
  const nx = (x - s.cx) / (s.w / 2);
  const ny = (s.base - y) / s.h;
  if (ny < 0 || Math.abs(nx) > 1) return false;
  return ny <= Math.sqrt(Math.max(0, 1 - nx * nx)) + 0.12;
}

function handleTap(x, y) {
  audio.wake();
  if (gameOverlayOpen()) return;
  const G = geo();
  if (pointInEllipse(x, y, G.pit.cx, G.pit.cy, G.pit.rx * 1.25, G.pit.ry * 2.2)) {
    dump();
  } else if (pointInStack(x, y, G)) {
    scoop(x, y);
  } else if (y > G.groundY) {
    dump();
  } else {
    scoop(x, y);
  }
}

cv.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  const r = cv.getBoundingClientRect();
  handleTap(e.clientX - r.left, e.clientY - r.top);
});
cv.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  const G = geo();
  if (e.code === 'Space') { e.preventDefault(); audio.wake(); if (!gameOverlayOpen()) scoop(G.stack.cx + rnd(-60, 60), G.stack.base - G.stack.h * 0.5); }
  if (e.code === 'Enter') { e.preventDefault(); audio.wake(); if (!gameOverlayOpen()) dump(); }
});

el('shopBtn').addEventListener('click', () => { audio.wake(); openDrawer(); });
el('closeShop').addEventListener('click', closeDrawer);
document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => {
  document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
  t.classList.add('active');
  shopTab = t.dataset.tab;
  ui.shopBody.scrollTop = 0;
  renderShop(true);
}));
el('statsBtn').addEventListener('click', showStats);
el('closeStats').addEventListener('click', () => closeModal('statsModal'));
el('nextStackBtn').addEventListener('click', nextStack);
el('muteBtn').addEventListener('click', () => {
  state.muted = !state.muted;
  el('muteBtn').textContent = state.muted ? '🔇' : '🔊';
  audio.wake();
  save();
});
el('resetBtn').addEventListener('click', () => {
  if (!confirm('Burn the whole barn down and start over?')) return;
  try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
  location.reload();
});
document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
window.addEventListener('beforeunload', save);

/* ------------------------------------------------------------------ boot */

load();
resize();
el('muteBtn').textContent = state.muted ? '🔇' : '🔊';
refreshHUD();
renderShop();
setInterval(() => { if (el('shop').classList.contains('open')) renderShop(); }, 400);
setTimeout(() => showHint('Tap the haystack to fill your shovel'), 500);
requestAnimationFrame(frame);
})();
