/* The farmhands you hire, as actual people: they walk to a pile, dig a load,
   carry it to the conveyor, tip it in, and go back for more.

   Their throughput is exactly the figure the shop quotes. Each hand accrues
   what it is owed every second no matter what it is doing, and digs that much
   on its next visit to a pile — so a longer walk means a bigger armful, not
   less money, and the pay never drifts from the quoted rate. */
window.NIAH = window.NIAH || {};

NIAH.helpers = (function () {
  const T = THREE;

  const KITS = [
    { outfit: 'denim', hat: 'capBlue' },
    { outfit: 'forest', hat: 'bucket' },
    { outfit: 'sunday', hat: 'capRed' },
    { outfit: 'lumber', hat: 'straw' },
  ];

  const SPEED = 4.4;
  const SCALE = 0.72;
  const list = [];
  let shown = false;

  /* ---------------------------------------------------------- lifecycle */

  function make(index) {
    const rig = NIAH.player.buildRig();
    rig.group.scale.setScalar(SCALE);
    const kit = KITS[index % KITS.length];
    NIAH.cosmetics.applyLook(rig, { outfit: kit.outfit, hat: kit.hat, shovel: 'auto' }, 1);
    rig.parts.load.visible = false;
    NIAH.world.scene.add(rig.group);
    return {
      rig, index,
      pos: new T.Vector3(),
      yaw: Math.PI,
      state: 'toPile',
      target: -1,
      carry: 0,
      load: 1,
      owed: 0,          // hay earned but not yet dug and delivered
      phase: 0,
      digPhase: 0,
      timer: 0,
      speed: 0,
      stuck: 0,
      ghost: 0,          // seconds left of walking through piles when wedged
    };
  }

  function sync(count) {
    while (list.length < count) list.push(make(list.length));
    while (list.length > count) {
      const h = list.pop();
      NIAH.world.scene.remove(h.rig.group);
      h.rig.group.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    }
  }

  function setVisible(on) {
    shown = on;
    list.forEach((h) => { h.rig.group.visible = on; });
  }

  /* Drop everyone by the conveyor at the start of a barn. */
  function reset() {
    const c = NIAH.world.cart;
    if (!c) return;
    list.forEach((h, i) => {
      h.pos.set(c.x + 2.6 + (i % 2) * 1.6, 0, c.z + 2.2 + Math.floor(i / 2) * 1.8);
      h.state = 'toPile';
      h.target = -1;
      h.carry = 0;
      h.owed = 0;
      h.rig.parts.load.visible = false;
      place(h);
    });
  }

  function place(h) {
    h.rig.group.position.copy(h.pos);
    h.rig.group.rotation.y = h.yaw;
  }

  /* ------------------------------------------------------------ steering */

  function pileRadius(mesh) { return 1.3 + 1.9 * mesh.cone.scale.x; }

  function step(h, dt, tx, tz, avoidIndex) {
    const dx = tx - h.pos.x, dz = tz - h.pos.z;
    const d = Math.hypot(dx, dz);
    if (d > 0.05) {
      const move = Math.min(d, SPEED * dt);
      h.pos.x += (dx / d) * move;
      h.pos.z += (dz / d) * move;
      h.yaw = Math.atan2(dx, dz);
      h.speed = SPEED;
    } else {
      h.speed = 0;
    }

    if (h.ghost <= 0) {
      const piles = NIAH.world.piles;
      for (let i = 0; i < piles.length; i++) {
        if (i === avoidIndex) continue;
        const p = piles[i];
        if (!p.group.visible) continue;
        const r = pileRadius(p) + 0.3;
        const px = h.pos.x - p.x, pz = h.pos.z - p.z;
        const pd = Math.hypot(px, pz);
        if (pd < r && pd > 0.001) {
          h.pos.x = p.x + (px / pd) * r;
          h.pos.z = p.z + (pz / pd) * r;
        }
      }
      const c = NIAH.world.cart && NIAH.world.cart.collide;
      if (c) {
        const cx = h.pos.x - c.x, cz = h.pos.z - c.z;
        const hx = c.hx + 0.3, hz = c.hz + 0.3;
        if (Math.abs(cx) < hx && Math.abs(cz) < hz) {
          if (hx - Math.abs(cx) < hz - Math.abs(cz)) h.pos.x = c.x + Math.sign(cx || 1) * hx;
          else h.pos.z = c.z + Math.sign(cz || 1) * hz;
        }
      }
    } else {
      h.ghost -= dt;
    }

    const after = Math.hypot(tx - h.pos.x, tz - h.pos.z);
    if (after > d - SPEED * dt * 0.25) {
      h.stuck += dt;
      if (h.stuck > 2.2) { h.ghost = 2.5; h.stuck = 0; }   // wedged between piles
    } else {
      h.stuck = 0;
    }
    return after;
  }

  /* ---------------------------------------------------------- animation */

  function animate(h, dt) {
    const p = h.rig.parts;
    const moving = h.speed > 0.4;
    h.phase += dt * (moving ? 3.4 : 0);
    const swing = moving ? Math.sin(h.phase) * 0.72 : 0;
    p.legL.rotation.x = swing;
    p.legR.rotation.x = -swing;
    p.hips.position.y = 0.95 + (moving ? Math.abs(Math.sin(h.phase * 2)) * 0.07 : 0);
    p.hips.rotation.z = moving ? Math.sin(h.phase) * 0.04 : 0;

    if (h.state === 'dig') {
      h.digPhase += dt * 6;
      const d = Math.sin(h.digPhase);
      p.armR.rotation.x = -0.4 + d * 1.1;
      p.armL.rotation.x = -0.3 + d * 0.85;
      p.hips.rotation.x = 0.16 + d * 0.12;
      if (p.shovel) p.shovel.rotation.x = -0.15 - d * 0.5;
    } else if (h.state === 'dump') {
      h.digPhase += dt * 5;
      const d = Math.sin(Math.min(Math.PI, h.digPhase));
      p.armR.rotation.x = -d * 2.0;
      p.armL.rotation.x = -d * 1.6;
      if (p.shovel) p.shovel.rotation.x = -2.45 + d * 1.6;
    } else {
      h.digPhase = 0;
      p.armR.rotation.x = -swing * 0.6;
      p.armL.rotation.x = swing * 0.6;
      p.hips.rotation.x += (0 - p.hips.rotation.x) * Math.min(1, dt * 8);
      if (p.shovel) p.shovel.rotation.x += (-2.45 - p.shovel.rotation.x) * Math.min(1, dt * 8);
    }

    const f = h.load > 0 ? h.carry / h.load : 0;
    p.load.visible = f > 0.02;
    if (p.load.visible) {
      const s = 0.35 + f * 0.9;
      p.load.scale.set(s, Math.max(0.05, f * 1.3), s);
    }
    place(h);
  }

  /* --------------------------------------------------------------- brain */

  /* Prefer a pile nobody else is on, so the crew fans out across the barn
     instead of queueing at whichever one happens to be biggest. */
  function pickPile(api, self) {
    const piles = api.piles();
    const taken = new Set(list.filter((o) => o !== self && o.target >= 0).map((o) => o.target));
    let best = -1, most = 0, fallback = -1, fallbackMost = 0;
    piles.forEach((p, i) => {
      if (p.hay <= 0) return;
      if (p.hay > fallbackMost) { fallbackMost = p.hay; fallback = i; }
      if (!taken.has(i) && p.hay > most) { most = p.hay; best = i; }
    });
    return best >= 0 ? best : fallback;
  }

  /* A gentle shove so two hands never stand inside one another. */
  function separate(h) {
    for (const o of list) {
      if (o === h) continue;
      const dx = h.pos.x - o.pos.x, dz = h.pos.z - o.pos.z;
      const d = Math.hypot(dx, dz);
      if (d < 1.0 && d > 0.001) {
        const push = (1.0 - d) * 0.5;
        h.pos.x += (dx / d) * push;
        h.pos.z += (dz / d) * push;
      }
    }
  }

  function update(dt, api) {
    if (!list.length || !NIAH.world.cart) return;
    const cart = NIAH.world.cart;
    const rate = api.ratePerHelper();

    list.forEach((h, i) => {
      h.owed += rate * dt;

      if (h.state === 'toPile') {
        if (h.target < 0 || api.piles()[h.target].hay <= 0) h.target = pickPile(api, h);
        if (h.target < 0) {                      // nothing left to dig
          const idleX = cart.x + 3.4 + (i % 2) * 1.5, idleZ = cart.z + 3.2;
          step(h, dt, idleX, idleZ, -1);
          animate(h, dt);
          return;
        }
        const mesh = NIAH.world.piles[h.target];
        const toBeltX = cart.x - mesh.x, toBeltZ = cart.z - mesh.z;
        const len = Math.hypot(toBeltX, toBeltZ) || 1;
        const stand = pileRadius(mesh) + 0.9;
        const tx = mesh.x + (toBeltX / len) * stand + (i % 2 ? 0.8 : -0.8);
        const tz = mesh.z + (toBeltZ / len) * stand;
        const left = step(h, dt, tx, tz, h.target);
        if (left < 0.9) {
          h.state = 'dig';
          h.digPhase = 0;
          h.load = Math.max(1, h.owed);     // dig exactly what has been earned
          h.carry = 0;
        }
      } else if (h.state === 'dig') {
        h.speed = 0;
        const want = Math.min(h.load - h.carry, (h.load / 2.4) * dt);
        const got = api.takeFromPile(h.target, want);
        h.carry += got;
        h.owed -= got;
        if (h.carry >= h.load - 0.001 || got <= 0.0001) {
          if (h.carry <= 0) { h.state = 'toPile'; h.target = -1; }
          else { h.state = 'toBelt'; }
        }
      } else if (h.state === 'toBelt') {
        const tx = cart.x + 2.3 + (i % 2) * 2.0;
        const tz = cart.z + 0.4 + Math.floor(i / 2) * 2.1;
        const left = step(h, dt, tx, tz, -1);
        if (left < 0.9) {
          h.state = 'dump';
          h.digPhase = 0;
          h.timer = 0.7;
          h.yaw = Math.atan2(cart.x - h.pos.x, cart.z - h.pos.z);
        }
      } else if (h.state === 'dump') {
        h.speed = 0;
        h.timer -= dt;
        if (h.timer <= 0) {
          api.deliver(h.target, h.carry);
          h.carry = 0;
          h.state = 'toPile';
          h.target = -1;
        }
      }

      separate(h);
      animate(h, dt);
    });
  }

  return { sync, reset, update, setVisible, get count() { return list.length; }, get all() { return list; } };
})();
