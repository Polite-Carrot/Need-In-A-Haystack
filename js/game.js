/* Needle in a Haystack — game state, barn flow, digging, economy, main loop. */
window.NIAH = window.NIAH || {};

NIAH.data = {
  SHOVELS: [
    { name: 'Bare Hands',     emoji: '🤲', cap: 10,   dig: 5,   price: 0,      unlock: 1,  desc: 'Splintery, but free.' },
    { name: 'Garden Trowel',  emoji: '🥄', cap: 24,   dig: 11,  price: 120,    unlock: 1,  desc: 'Borrowed from the flower bed.' },
    { name: 'Rusty Pitchfork',emoji: '🍴', cap: 55,   dig: 22,  price: 900,    unlock: 2,  desc: 'Tetanus sold separately.' },
    { name: 'Wooden Shovel',  emoji: '🪵', cap: 120,  dig: 42,  price: 5.5e3,  unlock: 3,  desc: 'Honest farm tooling.' },
    { name: 'Steel Spade',    emoji: '⚒️', cap: 260,  dig: 80,  price: 34e3,   unlock: 4,  desc: 'Cuts hay like butter.' },
    { name: "Farmer's Scoop", emoji: '🪣', cap: 580,  dig: 150, price: 2.1e5,  unlock: 5,  desc: 'Grain-grade capacity.' },
    { name: 'Bale Fork',      emoji: '🔱', cap: 1300, dig: 290, price: 1.3e6,  unlock: 7,  desc: 'Moves a bale per swing.' },
    { name: 'Hay Loader',     emoji: '🚜', cap: 3000, dig: 600, price: 9e6,    unlock: 9,  desc: 'Barely legal indoors.' },
  ],
  GEAR: {
    boots: { name: 'Work Boots',   emoji: '🥾', max: 5,  base: 250,  growth: 3,
             desc: (l) => l ? `+${l * 14}% walking speed` : 'Walk faster between pile and cart' },
    sense: { name: 'Needle Sense', emoji: '📡', max: 3,  base: 1500, growth: 10,
             desc: (l) => [
               'Reads how far off the needle is. Take readings from two spots and the rings cross',
               'Lv 1: warm / hot / burning, from where you stand',
               'Lv 2: the distance, to the nearest five metres',
               'Lv 3: the distance, to the metre',
             ][l] },
    sift:  { name: 'Sifting Screen', emoji: '🕸️', max: 10, base: 600, growth: 2.8,
             desc: (l) => l ? `×1.25 coins per hay (now ×${Math.pow(1.25, l).toFixed(2)})` : 'Sifted hay pays more' },
    hands: { name: 'Farmhand',     emoji: '👨‍🌾', max: 4,  base: 4000, growth: 3.2,
             desc: (l) => l ? `${l} working the barn with you` : 'Hire a hand who digs and carries while you do' },
  },
};

NIAH.game = (function () {
  const D = NIAH.data;
  const SAVE_KEY = 'niah.save.v2';
  const LETTERS = 'ABCDEFGHIJKL';
  const T = THREE;

  /* ---------------------------------------------------------- state */

  const state = {
    coins: 0,
    shovel: 0,
    owned: [0],
    gear: { boots: 0, sense: 0, sift: 0, hands: 0 },
    level: 1,
    lv: null,
    needles: 0,
    totalHay: 0,
    totalLoads: 0,
    started: Date.now(),
    camera: 'follow',
    muted: false,
    look: { outfit: 'farmhand', hat: 'straw', face: 'plain', shovel: 'auto' },
    wardrobe: { outfit: ['farmhand'], hat: ['straw'], face: ['plain'], shovel: ['auto'] },
  };

  let phase = 'boot';            // boot | menu | intro | play | paused | win
  const input = { x: 0, y: 0 };
  let held = false, lastTime = 0, elapsed = 0;
  let digSfx = 0, saveTimer = 0, handBank = 0, senseTimer = 0, actionLock = 0, stickActive = false;
  let wardrobeReturn = null;
  const intro = { t: 0, done: false };
  const keys = Object.create(null);
  const tmpV = new T.Vector3();

  /* ------------------------------------------------------- economy */

  const shovel = () => D.SHOVELS[state.shovel];
  const capacity = () => shovel().cap;
  const digRate = () => shovel().dig;
  const moveSpeed = () => 6 * (1 + state.gear.boots * 0.14);
  const coinsPerHay = () => Math.pow(1.25, state.gear.sift) * Math.pow(1.85, state.level - 1);
  const pileCount = (lvl) => Math.min(4 + Math.floor((lvl - 1) * 1.2), 12);
  const pileHay = (lvl) => Math.round(55 * Math.pow(1.5, lvl - 1));
  const gearPrice = (k) => Math.floor(D.GEAR[k].base * Math.pow(D.GEAR[k].growth, state.gear[k]));

  function affordable() {
    const next = D.SHOVELS.findIndex((s, i) => !state.owned.includes(i) && s.unlock <= state.level);
    if (next >= 0 && state.coins >= D.SHOVELS[next].price) return true;
    return Object.keys(D.GEAR).some((k) => state.gear[k] < D.GEAR[k].max && state.coins >= gearPrice(k));
  }

  /* ---------------------------------------------------- persistence */

  function save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) { /* private mode */ }
  }
  function readSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }
  function applySave(data) {
    Object.assign(state, data);
    state.gear = Object.assign({ boots: 0, sense: 0, sift: 0, hands: 0 }, data.gear || {});
    // saves from before My Farmer arrive without a wardrobe
    state.look = Object.assign({ outfit: 'farmhand', hat: 'straw', face: 'plain', shovel: 'auto' }, data.look || {});
    state.wardrobe = Object.assign({ outfit: ['farmhand'], hat: ['straw'], face: ['plain'], shovel: ['auto'] }, data.wardrobe || {});
    ['outfit', 'hat', 'face', 'shovel'].forEach((kind) => {
      if (!Array.isArray(state.wardrobe[kind]) || !state.wardrobe[kind].length) {
        state.wardrobe[kind] = [NIAH.cosmetics.listFor(kind)[0].id];
      }
      if (!state.wardrobe[kind].includes(state.look[kind])) state.look[kind] = state.wardrobe[kind][0];
    });
    if (state.lv && !state.lv.needle) {
      const legacy = state.lv;
      const total = (legacy.piles[0] && legacy.piles[0].total) || 1;
      state.lv.needle = {
        pile: legacy.needlePile || 0,
        depth: Math.max(0.3, Math.min(0.9, (legacy.needleDepth || total * 0.6) / total)),
        ox: (Math.random() - 0.5) * 3.4,
        oz: (Math.random() - 0.5) * 3.4,
        revealed: false,
      };
    }
    if (!Array.isArray(state.owned) || !state.owned.length) state.owned = [0];
    state.shovel = Math.max(0, Math.min(D.SHOVELS.length - 1, state.shovel | 0));
    NIAH.audio.muted = !!state.muted;
  }
  function wipeSave() {
    if (!confirm('Erase your save and start the farm over?')) return;
    try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
    location.reload();
  }

  /* --------------------------------------------------- level set-up */

  function makeLevel(level) {
    const count = pileCount(level);
    const hay = pileHay(level);
    const piles = [];
    for (let i = 0; i < count; i++) piles.push({ name: LETTERS[i], total: hay, hay: hay, sifted: 0 });
    return {
      level,
      piles,
      // the needle has a place inside its pile: how far down, and whereabouts
      needle: {
        pile: Math.floor(Math.random() * count),
        depth: 0.3 + Math.random() * 0.6,        // fraction of the pile dug before it shows
        ox: (Math.random() - 0.5) * 3.4,
        oz: (Math.random() - 0.5) * 3.4,
        revealed: false,
      },
      load: [],
      loadTotal: 0,
      startedAt: Date.now(),
      sifted: 0,
      opened: 0,
    };
  }

  function buildWorldForLevel() {
    const lv = state.lv;
    NIAH.world.buildLevel({ level: lv.level, piles: lv.piles });
    lv.piles.forEach((p, i) => NIAH.world.setPileVisual(NIAH.world.piles[i], p.hay / p.total));
    NIAH.world.setCartFill(0);
    NIAH.world.hideNeedle();
    if (lv.needle.revealed) NIAH.world.showNeedle(lv.needle.pile, lv.needle.ox, lv.needle.oz);
    NIAH.helpers.sync(state.gear.hands);
    NIAH.helpers.reset();
    NIAH.player.applyLook(state.look, state.shovel);
    NIAH.player.setLoadVisual(lv.loadTotal / capacity());   // a resumed save can arrive mid-load
  }

  /* ------------------------------------------------------ level flow */

  function startLevel(withIntro) {
    buildWorldForLevel();
    const L = NIAH.world.layout;
    NIAH.ui.setIntro(state.lv.level, state.lv.piles.length + ' piles · one needle');
    if (withIntro) {
      phase = 'intro';
      intro.t = 0;
      intro.done = false;
      NIAH.player.place(0, L.doorZ + 16, Math.PI);
      NIAH.player.camYaw = Math.PI;
      NIAH.helpers.setVisible(false);
      NIAH.world.setDoorOpen(0);
      NIAH.ui.screen('intro', true);
      NIAH.ui.hudOn(false);
      NIAH.audio.door();
    } else {
      finishIntro();
    }
    save();
  }

  function finishIntro() {
    const L = NIAH.world.layout;
    if (NIAH.player.position.z > L.cartZ + 5.5) {
      NIAH.player.place(0, L.cartZ + 5, Math.PI);
      NIAH.player.camYaw = Math.PI;
    }
    NIAH.world.setDoorOpen(1);
    NIAH.ui.screen('intro', false);
    NIAH.ui.hudOn(true);
    NIAH.player.updateCamera(NIAH.world.camera, 1, state.camera, true, NIAH.world.bounds);
    NIAH.helpers.setVisible(true);
    phase = 'play';
    intro.done = true;
  }

  function updateIntro(dt) {
    intro.t += dt;
    const t = intro.t;
    NIAH.world.setDoorOpen(Math.min(1, t / 1.7));

    const L = NIAH.world.layout;
    const walking = t > 0.8 && NIAH.player.position.z > L.cartZ + 5;
    NIAH.player.camYaw = Math.PI;
    NIAH.player.update(dt, walking ? { x: 0, y: 1 } : { x: 0, y: 0 }, NIAH.world, { speed: 3.4 });

    // camera keyframes: a wide approach shot easing into the follow position
    const cam = NIAH.world.camera;
    const p = NIAH.player.position;
    const s1 = smooth(t, 0, 3.2);
    const s2 = smooth(t, 3.2, 6.4);
    const wide = cam.aspect < 0.8 ? 1.4 : cam.aspect < 1.2 ? 1.15 : 1;   // portrait needs more room
    const from = tmpV.set(17 * wide, 8 * wide, L.doorZ + 30 * wide);
    const mid = new T.Vector3(6.5 * wide, 3.6 + wide, L.doorZ + 12 * wide);
    const to = new T.Vector3(p.x, 7.8, p.z + 12.5);
    const a = from.clone().lerp(mid, s1);
    const b = a.clone().lerp(to, s2);
    cam.position.copy(b);
    cam.lookAt(p.x, 1.6, p.z - 2);

    if (!walking && t > 1.2) finishIntro();
    if (t > 12) finishIntro();
  }

  function smooth(t, a, b) {
    const x = Math.max(0, Math.min(1, (t - a) / (b - a)));
    return x * x * (3 - 2 * x);
  }

  function skipIntro() { if (phase === 'intro') finishIntro(); }

  /* -------------------------------------------------------- digging */

  function nearestPile() {
    const p = NIAH.player.position;
    let best = null, bestD = Infinity;
    NIAH.world.piles.forEach((mesh, i) => {
      const data = state.lv.piles[i];
      if (data.hay <= 0) return;
      const d = Math.hypot(p.x - mesh.x, p.z - mesh.z);
      const reach = 1.3 + 1.9 * mesh.cone.scale.x + 2.2;
      if (d < reach && d < bestD) { bestD = d; best = i; }
    });
    return best;
  }

  function nearCart() {
    const c = NIAH.world.cart;
    if (!c) return false;
    const p = NIAH.player.position;
    return Math.hypot(p.x - c.x, p.z - c.z) < 5.4;
  }

  function addLoad(pileIndex, amount) {
    const lv = state.lv;
    const entry = lv.load.find((e) => e.pile === pileIndex);
    if (entry) entry.amount += amount;
    else lv.load.push({ pile: pileIndex, amount });
    lv.loadTotal += amount;
  }

  /* Enough hay off the top and the needle is lying there in what is left. */
  function checkReveal(pileIndex) {
    const lv = state.lv;
    const n = lv.needle;
    if (!n || n.revealed || pileIndex !== n.pile) return;
    const data = lv.piles[pileIndex];
    const dugFraction = 1 - data.hay / data.total;
    if (dugFraction < n.depth) return;
    n.revealed = true;
    NIAH.world.showNeedle(n.pile, n.ox, n.oz);
    NIAH.audio.ping();
    NIAH.audio.coin();
    NIAH.ui.setSense('✨ Something glinted in pile ' + data.name);
    save();
  }

  function needleInReach() {
    const lv = state.lv;
    if (!lv || !lv.needle.revealed) return false;
    const pos = NIAH.world.needlePosition();
    if (!pos) return false;
    const p = NIAH.player.position;
    return Math.hypot(p.x - pos.x, p.z - pos.z) < 3.6;
  }

  function grabNeedle() {
    if (!needleInReach()) return false;
    winLevel();
    return true;
  }

  function dig(dt, pileIndex) {
    const lv = state.lv;
    const data = lv.piles[pileIndex];
    const room = capacity() - lv.loadTotal;
    const amount = Math.min(digRate() * dt, room, data.hay);
    if (amount <= 0) return false;
    data.hay -= amount;
    addLoad(pileIndex, amount);
    NIAH.world.setPileVisual(NIAH.world.piles[pileIndex], data.hay / data.total);
    checkReveal(pileIndex);
    NIAH.player.setLoadVisual(lv.loadTotal / capacity());
    NIAH.player.setAction('dig');

    digSfx -= dt;
    if (digSfx <= 0) {
      digSfx = 0.26;
      NIAH.audio.dig();
      const m = NIAH.world.piles[pileIndex];
      NIAH.world.hayBurst(m.x, 2 + Math.random(), m.z, 3);
    }
    return true;
  }

  function dump() {
    const lv = state.lv;
    if (lv.loadTotal <= 0) { NIAH.audio.nope(); return; }
    const c = NIAH.world.cart;
    let gained = 0;

    for (const entry of lv.load) {
      const data = lv.piles[entry.pile];
      const before = data.sifted;
      data.sifted = Math.min(data.total, data.sifted + entry.amount);
      if (before === 0 && data.sifted > 0) lv.opened++;
      gained += entry.amount * coinsPerHay();
      lv.sifted += entry.amount;
      state.totalHay += entry.amount;
    }

    state.coins += Math.max(1, Math.floor(gained));
    state.totalLoads++;
    lv.load = [];
    lv.loadTotal = 0;

    NIAH.player.setAction('dump');
    actionLock = 0.5;
    NIAH.player.setLoadVisual(0);
    NIAH.world.setCartFill(Math.min(1, NIAH.world.cart.fill + 0.25));
    NIAH.world.sifterLoad(4);
    NIAH.world.hayBurst(c.x, NIAH.world.cart.beltTop + 1.4, c.z, 14);
    NIAH.audio.dump();
    NIAH.audio.coin();
    NIAH.ui.bumpCoins();

    save();
  }

  /* ---------------------------------------------------------- hands */

  const helperApi = {
    ratePerHelper: () => digRate() * 0.12,
    piles: () => state.lv.piles,
    takeFromPile(i, amount) {
      const data = state.lv.piles[i];
      if (!data) return 0;
      const got = Math.min(amount, data.hay);
      if (got <= 0) return 0;
      data.hay -= got;
      NIAH.world.setPileVisual(NIAH.world.piles[i], data.hay / data.total);
      checkReveal(i);
      return got;
    },
    deliver(i, amount) {
      const lv = state.lv;
      const data = lv.piles[i];
      if (!data || amount <= 0) return;
      const before = data.sifted;
      data.sifted = Math.min(data.total, data.sifted + amount);
      if (before === 0 && data.sifted > 0) lv.opened++;
      lv.sifted += amount;
      state.totalHay += amount;
      state.coins += Math.max(1, Math.floor(amount * coinsPerHay()));
      NIAH.world.sifterLoad(2);
    },
  };

  function farmhands(dt) {
    if (phase !== 'play') return;
    NIAH.helpers.sync(state.gear.hands);
    NIAH.helpers.update(dt, helperApi);
  }

  /* ----------------------------------------------------------- sense */

  function updateSense(dt) {
    if (phase !== 'play') return;
    senseTimer -= dt;
    if (senseTimer > 0) return;
    senseTimer = 0.2;

    const lv = state.lv;
    const n = lv.needle;

    if (n.revealed) {
      NIAH.ui.setSense(needleInReach()
        ? '✨ The needle — grab it!'
        : '✨ The needle is lying in pile ' + lv.piles[n.pile].name);
      return;
    }

    const sense = state.gear.sense;
    if (!sense) { NIAH.ui.setSense(''); return; }

    /* A reading off your own position, never a name. One reading narrows it
       to a ring; walk somewhere else and take another and the rings cross —
       that is the whole game the detector is for. Levels buy precision, not
       the answer. */
    // read to the needle's actual spot in the pile, not the pile's middle, so
    // the precision you paid for means something
    const mesh = NIAH.world.piles[n.pile];
    const p = NIAH.player.position;
    const d = Math.hypot(p.x - (mesh.x + n.ox), p.z - (mesh.z + n.oz));

    if (sense >= 3) {
      NIAH.ui.setSense('📡 ' + d.toFixed(1) + ' m to the needle');
    } else if (sense >= 2) {
      const paces = Math.max(5, Math.round(d / 5) * 5);
      NIAH.ui.setSense('📡 about ' + paces + ' m away');
    } else {
      const band = d < 6 ? 'BURNING' : d < 12 ? 'hot' : d < 20 ? 'warm' : d < 32 ? 'cool' : 'stone cold';
      NIAH.ui.setSense('📡 ' + band);
    }
  }

  /* ------------------------------------------------------- win / flow */

  function winLevel() {
    if (phase === 'win') return;
    phase = 'win';
    const lv = state.lv;
    state.needles++;
    const bonus = Math.max(50, Math.floor(pileHay(state.level) * coinsPerHay() * 0.6));
    state.coins += bonus;

    const pos = NIAH.world.needlePosition();
    if (pos) NIAH.world.hayBurst(pos.x, pos.y + 1, pos.z, 26);
    NIAH.world.hideNeedle();
    NIAH.audio.fanfare();
    NIAH.player.setAction('idle');

    const secs = Math.round((Date.now() - lv.startedAt) / 1000);
    NIAH.ui.showWin({
      text: `You pulled it out of pile ${lv.piles[lv.needle.pile].name}, `
        + `${Math.round(lv.needle.depth * 100)}% of the way down. Barn ${lv.level} is done.`,
      rows: [
        ['Needle bounty', '🪙 ' + NIAH.ui.fmt(bonus)],
        ['Hay sifted here', NIAH.ui.fmt(lv.sifted)],
        ['Piles opened', lv.opened + ' of ' + lv.piles.length],
        ['Time in the barn', secs < 60 ? secs + 's' : Math.floor(secs / 60) + 'm ' + (secs % 60) + 's'],
        ['Next barn pays', '×1.85 coins'],
      ],
    });
    save();
  }

  function nextBarn() {
    state.level++;
    state.lv = makeLevel(state.level);
    NIAH.ui.screen('win', false);
    NIAH.ui.closeShop();
    startLevel(true);
  }

  function startNewGame() {
    state.level = 1;
    state.lv = makeLevel(1);
    NIAH.ui.screen('menu', false);
    startLevel(true);
  }

  function continueGame() {
    if (!state.lv) state.lv = makeLevel(state.level);
    NIAH.ui.screen('menu', false);
    startLevel(true);
  }

  function quitToMenu() {
    save();
    NIAH.helpers.setVisible(false);
    phase = 'menu';
    NIAH.ui.screen('pause', false);
    NIAH.ui.closeShop();
    NIAH.ui.hudOn(false);
    NIAH.ui.setMenu(readSave());
    NIAH.ui.screen('menu', true);
  }

  function pause(on) {
    if (on && phase === 'play') { phase = 'paused'; NIAH.ui.screen('pause', true); save(); }
    else if (!on && phase === 'paused') { phase = 'play'; NIAH.ui.screen('pause', false); NIAH.ui.closeShop(); }
  }

  /* -------------------------------------------------------- shopping */

  function buyShovel(i) {
    const sh = D.SHOVELS[i];
    if (state.owned.includes(i)) {
      state.shovel = i;
      NIAH.player.applyLook(state.look, i);
      if (state.lv && state.lv.loadTotal > capacity()) trimLoad();
      NIAH.audio.buy();
    } else {
      if (state.level < sh.unlock || state.coins < sh.price) { NIAH.audio.nope(); return; }
      state.coins -= sh.price;
      state.owned.push(i);
      state.shovel = i;
      NIAH.player.applyLook(state.look, i);
      NIAH.audio.buy();
    }
    save();
    NIAH.ui.renderShop(true);
  }

  function trimLoad() {
    const lv = state.lv;
    let over = lv.loadTotal - capacity();
    while (over > 0 && lv.load.length) {
      const last = lv.load[lv.load.length - 1];
      const cut = Math.min(over, last.amount);
      last.amount -= cut;
      lv.loadTotal -= cut;
      over -= cut;
      if (last.amount <= 0.001) lv.load.pop();
    }
    NIAH.player.setLoadVisual(lv.loadTotal / capacity());
  }

  function buyGear(key) {
    const g = D.GEAR[key];
    if (state.gear[key] >= g.max) { NIAH.audio.nope(); return; }
    const price = gearPrice(key);
    if (state.coins < price) { NIAH.audio.nope(); return; }
    state.coins -= price;
    state.gear[key]++;
    NIAH.audio.buy();
    if (key === 'hands' && state.lv) {
      NIAH.helpers.sync(state.gear.hands);
      NIAH.helpers.setVisible(phase === 'play' || phase === 'paused');
    }
    save();
    NIAH.ui.renderShop(true);
  }

  /* --------------------------------------------------------- My Farmer */

  function ownsCosmetic(kind, id) {
    return (state.wardrobe[kind] || []).includes(id);
  }

  function cosmeticLocked(kind, id) {
    const item = NIAH.cosmetics.byId(NIAH.cosmetics.listFor(kind), id);
    return !!item.unlock && state.level < item.unlock;
  }

  function buyCosmetic(kind, id) {
    const item = NIAH.cosmetics.byId(NIAH.cosmetics.listFor(kind), id);
    if (!ownsCosmetic(kind, id)) {
      if (cosmeticLocked(kind, id) || state.coins < item.price) { NIAH.audio.nope(); return; }
      state.coins -= item.price;
      state.wardrobe[kind].push(id);
    }
    state.look[kind] = id;
    NIAH.player.applyLook(state.look, state.shovel);
    NIAH.wardrobe.preview(state.look, state.shovel);
    if (state.lv) NIAH.player.setLoadVisual(state.lv.loadTotal / capacity());
    NIAH.audio.buy();
    save();
    NIAH.ui.renderWardrobe(true);
  }

  function openWardrobe() {
    if (phase === 'wardrobe') return;
    wardrobeReturn = phase;
    phase = 'wardrobe';
    NIAH.wardrobe.open(state.look, state.shovel);
    NIAH.ui.closeShop();
    NIAH.ui.screen('menu', false);
    NIAH.ui.screen('pause', false);
    NIAH.ui.screen('win', false);
    NIAH.ui.hudOn(false);
    NIAH.ui.screen('wardrobe', true);
    NIAH.ui.syncOutfitCat();
    NIAH.ui.renderWardrobe(true);
    NIAH.audio.ui();
  }

  function closeWardrobe() {
    NIAH.ui.screen('wardrobe', false);
    const back = wardrobeReturn || 'menu';
    wardrobeReturn = null;
    if (back === 'menu') {
      phase = 'menu';
      NIAH.ui.setMenu(readSave());
      NIAH.ui.screen('menu', true);
    } else if (back === 'win') {
      phase = 'win';
      NIAH.ui.screen('win', true);
    } else {
      phase = 'paused';
      NIAH.ui.screen('pause', true);
    }
    save();
  }

  function toggleSound() {
    NIAH.audio.muted = !NIAH.audio.muted;
    state.muted = NIAH.audio.muted;
    NIAH.audio.wake();
    NIAH.ui.setMenu(readSave());
    save();
  }

  function toggleCamera() {
    state.camera = state.camera === 'follow' ? 'first' : 'follow';
    NIAH.ui.setCameraLabel(state.camera);
    save();
  }

  /* ------------------------------------------------------------ loop */

  function update(dt) {
    if (phase === 'intro') { updateIntro(dt); return; }
    if (phase !== 'play') {
      if (phase === 'menu') updateMenuCamera(dt);
      if (phase === 'wardrobe') NIAH.wardrobe.update(dt);
      return;
    }

    const lv = state.lv;
    const pileIndex = nearestPile();
    const atCart = nearCart();
    let digging = false;

    actionLock = Math.max(0, actionLock - dt);
    if (held && pileIndex !== null && lv.loadTotal < capacity()) {
      digging = dig(dt, pileIndex);
    }
    if (!digging && actionLock <= 0) {
      NIAH.player.setAction(NIAH.player.speed > 0.4 ? 'walk' : 'idle');
    }

    // keyboard drives the same input vector the stick does
    if (!stickActive) {
      const k = readKeys();
      input.x = k.x; input.y = k.y;
    }

    NIAH.player.update(dt, input, NIAH.world, { speed: moveSpeed() });
    NIAH.player.updateCamera(NIAH.world.camera, dt, state.camera, false, NIAH.world.bounds);

    farmhands(dt);
    updateSense(dt);

    // contextual prompt + action button label
    let label = 'Dig', enabled = false, prompt = '';
    if (needleInReach()) {
      label = 'Grab'; enabled = true;
      prompt = 'The needle! Grab it';
    } else if (atCart && lv.loadTotal > 0) {
      label = 'Sift'; enabled = true;
      prompt = 'Tip ' + NIAH.ui.fmt(lv.loadTotal) + ' hay onto the belt';
    } else if (pileIndex !== null) {
      if (lv.loadTotal >= capacity()) { label = 'Full'; prompt = 'Shovel full — carry it to the sifter'; }
      else { label = 'Dig'; enabled = true; prompt = 'Hold to dig pile ' + lv.piles[pileIndex].name; }
    } else if (lv.loadTotal >= capacity()) {
      prompt = 'Shovel full — carry it to the sifter';
    }
    NIAH.ui.setAction(label, enabled);
    NIAH.ui.setPrompt(prompt);
    NIAH.ui.setPileCard(pileIndex !== null ? lv.piles[pileIndex] : null);
    NIAH.ui.setHud({
      coins: state.coins, level: state.level, shovelName: shovel().name,
      load: lv.loadTotal, capacity: capacity(), affordable: affordable(),
    });

    saveTimer += dt;
    if (saveTimer > 10) { saveTimer = 0; save(); }
  }

  function updateMenuCamera(dt) {
    const cam = NIAH.world.camera;
    const L = NIAH.world.layout;
    if (!L) return;
    elapsed += dt;
    const a = Math.sin(elapsed * 0.06) * 0.9;
    const r = 34;
    cam.position.set(Math.sin(a) * r, 9 + Math.sin(elapsed * 0.1) * 1.5, L.doorZ + 8 + Math.cos(a) * r);
    cam.lookAt(0, 5.5, L.doorZ - 4);
  }

  function frame(now) {
    // Keep the loop alive whatever happens in a frame: this used to sit after
    // update(), so a single thrown error stopped the game for good.
    requestAnimationFrame(frame);
    const dt = Math.min((now - lastTime) / 1000, 0.08);
    lastTime = now;
    elapsed += dt;
    try {
      update(dt);
      if (phase === 'wardrobe') {
        NIAH.wardrobe.render();
      } else {
        NIAH.world.update(dt, elapsed);
        NIAH.world.render();
      }
    } catch (err) {
      if (!frame.warned) { frame.warned = true; console.error('frame error', err); }
    }
  }

  /* ----------------------------------------------------------- input */

  function readKeys() {
    let x = 0, y = 0;
    if (keys['KeyW'] || keys['ArrowUp']) y += 1;
    if (keys['KeyS'] || keys['ArrowDown']) y -= 1;
    if (keys['KeyA'] || keys['ArrowLeft']) x -= 1;
    if (keys['KeyD'] || keys['ArrowRight']) x += 1;
    const m = Math.hypot(x, y);
    if (m > 1) { x /= m; y /= m; }
    return { x, y };
  }

  function actionPress() {
    NIAH.audio.wake();
    held = true;
    if (phase === 'intro') { skipIntro(); return; }
    if (phase !== 'play') return;
    if (grabNeedle()) return;
    if (nearCart() && state.lv.loadTotal > 0) dump();
  }
  function actionRelease() {
    held = false;
    if (phase === 'play') NIAH.player.setAction('idle');
  }

  function bindInput(canvas) {
    document.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      keys[e.code] = true;
      if (e.code === 'Space' || e.code === 'KeyE') { e.preventDefault(); actionPress(); }
      if (e.code === 'Escape') {
        e.preventDefault();
        if (phase === 'wardrobe') closeWardrobe();
        else if (phase === 'paused') pause(false);
        else pause(true);
      }
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      if (phase === 'play' || phase === 'intro') NIAH.audio.wake();
    });
    document.addEventListener('keyup', (e) => {
      keys[e.code] = false;
      if (e.code === 'Space' || e.code === 'KeyE') actionRelease();
    });

    // drag to swing the camera
    let dragId = null, dragX = 0;
    canvas.addEventListener('pointerdown', (e) => {
      if (phase === 'intro') { skipIntro(); return; }
      dragId = e.pointerId; dragX = e.clientX;
    });
    canvas.addEventListener('pointermove', (e) => {
      if (e.pointerId !== dragId) return;
      const dx = e.clientX - dragX;
      dragX = e.clientX;
      NIAH.player.nudgeCamera(dx * 0.006);
    });
    const endDrag = (e) => { if (e.pointerId === dragId) dragId = null; };
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // drag the farmer round in My Farmer
    const wardrobeEl = document.getElementById('wardrobe');
    let turnId = null, turnX = 0;
    wardrobeEl.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.wardrobe-panel, .wardrobe-top')) return;   // panel scrolls, not spins
      turnId = e.pointerId;
      turnX = e.clientX;
      NIAH.wardrobe.grab();
    });
    wardrobeEl.addEventListener('pointermove', (e) => {
      if (e.pointerId !== turnId) return;
      NIAH.wardrobe.turn(e.clientX - turnX);
      turnX = e.clientX;
    });
    const endTurn = (e) => {
      if (turnId !== null && e.pointerId !== turnId) return;
      turnId = null;
      NIAH.wardrobe.release();
    };
    wardrobeEl.addEventListener('pointerup', endTurn);
    wardrobeEl.addEventListener('pointercancel', endTurn);
    wardrobeEl.addEventListener('pointerleave', endTurn);

    // action button
    const btn = NIAH.ui.actionBtn;
    btn.addEventListener('pointerdown', (e) => { e.preventDefault(); actionPress(); });
    btn.addEventListener('pointerup', (e) => { e.preventDefault(); actionRelease(); });
    btn.addEventListener('pointercancel', actionRelease);
    btn.addEventListener('pointerleave', actionRelease);

    // virtual stick
    const stick = NIAH.ui.stick, knob = NIAH.ui.stickKnob;
    if (window.matchMedia('(pointer: coarse)').matches) stick.hidden = false;
    let stickId = null, cx = 0, cy = 0;
    const R = 46;
    stick.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      stickId = e.pointerId;
      stickActive = true;
      const r = stick.getBoundingClientRect();
      cx = r.left + r.width / 2; cy = r.top + r.height / 2;
      moveStick(e);
      NIAH.audio.wake();
    });
    stick.addEventListener('pointermove', (e) => { if (e.pointerId === stickId) { e.preventDefault(); moveStick(e); } });
    const endStick = (e) => {
      if (e.pointerId !== stickId) return;
      stickId = null; stickActive = false; input.x = 0; input.y = 0;
      knob.style.transform = '';
    };
    stick.addEventListener('pointerup', endStick);
    stick.addEventListener('pointercancel', endStick);
    function moveStick(e) {
      let dx = e.clientX - cx, dy = e.clientY - cy;
      const d = Math.hypot(dx, dy);
      if (d > R) { dx = (dx / d) * R; dy = (dy / d) * R; }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      input.x = dx / R;
      input.y = -dy / R;
    }

    // Mobile browsers zoom on a quick second tap and on pinch. Both wreck a
    // game where tapping fast is the point, and iOS ignores user-scalable=no.
    let lastTap = 0;
    document.addEventListener('touchend', (e) => {
      const now = Date.now();
      // leave real controls alone so a fast double-buy still registers
      const onControl = e.target && e.target.closest && e.target.closest('button, .stick, .drawer-body');
      if (now - lastTap <= 350 && !onControl) e.preventDefault();
      lastTap = now;
    }, { passive: false });
    document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });
    ['gesturestart', 'gesturechange', 'gestureend'].forEach((type) => {
      document.addEventListener(type, (e) => e.preventDefault(), { passive: false });
    });

    window.addEventListener('resize', () => NIAH.world.resize());
    window.addEventListener('orientationchange', () => setTimeout(() => NIAH.world.resize(), 150));
    document.addEventListener('visibilitychange', () => { if (document.hidden) { save(); if (phase === 'play') pause(true); } });
    window.addEventListener('beforeunload', save);
  }

  /* ------------------------------------------------------------ boot */

  function boot() {
    NIAH.ui.init();
    const canvas = document.getElementById('scene');
    NIAH.world.init(canvas);
    NIAH.player.create(NIAH.world.scene);

    const saved = readSave();
    if (saved) applySave(saved);
    if (!state.lv) state.lv = makeLevel(state.level);

    buildWorldForLevel();
    const L = NIAH.world.layout;
    NIAH.player.place(0, L.doorZ + 9, Math.PI);
    NIAH.ui.setCameraLabel(state.camera);
    NIAH.ui.setMenu(saved);
    bindInput(canvas);

    phase = 'menu';
    NIAH.ui.screen('menu', true);
    lastTime = performance.now();
    requestAnimationFrame(frame);
    // the barn is built and the first frame is scheduled — let the boot
    // lockup fade once it has had its beat
    if (window.politeCarrotBootReady) window.politeCarrotBootReady();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  return {
    state, startNewGame, continueGame, nextBarn, quitToMenu, pause, skipIntro,
    buyShovel, buyGear, gearPrice, toggleSound, toggleCamera, wipeSave,
    openWardrobe, closeWardrobe, buyCosmetic, ownsCosmetic, cosmeticLocked,
    capacity, digRate, coinsPerHay, moveSpeed,
    get phase() { return phase; },
  };
})();
