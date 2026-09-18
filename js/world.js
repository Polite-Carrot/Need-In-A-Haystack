/* The barn: renderer, scene, procedural barn interior/exterior, hay piles. */
window.NIAH = window.NIAH || {};

NIAH.world = (function () {
  const T = THREE;

  const MAT = {
    floor:    new T.MeshLambertMaterial({ color: 0x7b5630 }),
    plank:    new T.MeshLambertMaterial({ color: 0x5d3f21 }),
    wallIn:   new T.MeshLambertMaterial({ color: 0x8a6136 }),
    wallOut:  new T.MeshLambertMaterial({ color: 0xa33b2c }),
    trim:     new T.MeshLambertMaterial({ color: 0xf3e6cf }),
    beam:     new T.MeshLambertMaterial({ color: 0x462b15 }),
    roof:     new T.MeshLambertMaterial({ color: 0x6d2a20 }),
    hay:      new T.MeshLambertMaterial({ color: 0xdcae42, flatShading: true }),
    hayDark:  new T.MeshLambertMaterial({ color: 0xa97c26, flatShading: true }),
    straw:    new T.MeshLambertMaterial({ color: 0xe8c463 }),
    metal:    new T.MeshLambertMaterial({ color: 0xb9c2c9, flatShading: true }),
    beltBed:  new T.MeshLambertMaterial({ color: 0x2f2a24 }),
    beltSlat: new T.MeshLambertMaterial({ color: 0x4a423a }),
    grass:    new T.MeshLambertMaterial({ color: 0x5f8a3f }),
    trunk:    new T.MeshLambertMaterial({ color: 0x4a3119 }),
    leaf:     new T.MeshLambertMaterial({ color: 0x3f6b31, flatShading: true }),
    shadow:   new T.MeshBasicMaterial({ color: 0x1a1006, transparent: true, opacity: 0.3, depthWrite: false }),
    glow:     new T.MeshBasicMaterial({ color: 0xfff0b0, transparent: true, opacity: 0.85 }),
    shaft:    new T.MeshBasicMaterial({ color: 0xffe6a6, transparent: true, opacity: 0.06, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }),
  };

  let renderer, scene, camera, canvas;
  let levelGroup = null, exterior = null, dust = null;
  const disposables = [];
  const state = { layout: null, piles: [], cart: null, doors: [], doorOpen: 0, bounds: null, needleGlow: null };
  const bursts = [];

  /* ------------------------------------------------------------ setup */

  function init(cv) {
    canvas = cv;
    renderer = new T.WebGLRenderer({ canvas, antialias: window.devicePixelRatio < 2, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 700 ? 1.75 : 2));
    renderer.outputColorSpace = T.SRGBColorSpace;

    scene = new T.Scene();
    scene.background = new T.Color(0x8ec2e4);
    scene.fog = new T.Fog(0x9ec9e2, 90, 320);

    camera = new T.PerspectiveCamera(58, 1, 0.1, 400);

    scene.add(new T.HemisphereLight(0xfff0cf, 0x6a5533, 2.2));
    const sun = new T.DirectionalLight(0xffe3b4, 2.0);
    sun.position.set(14, 30, 40);
    scene.add(sun);
    const fill = new T.DirectionalLight(0xbcd4ff, 0.5);
    fill.position.set(-18, 14, -26);
    scene.add(fill);

    buildExterior();
    buildDust();
    resize();
    return { scene, camera, renderer };
  }

  function resize() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(1, h);
    camera.fov = camera.aspect < 0.8 ? 72 : camera.aspect < 1.2 ? 64 : 58;
    camera.updateProjectionMatrix();
  }

  function track(obj) {
    obj.traverse((o) => { if (o.geometry) disposables.push(o.geometry); });
    return obj;
  }

  /* -------------------------------------------------------- textures */

  function signTexture(text) {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = '#f3e6cf';
    g.fillRect(0, 0, 512, 256);
    g.strokeStyle = '#8a3527'; g.lineWidth = 16;
    g.strokeRect(14, 14, 484, 228);
    g.fillStyle = '#8a3527';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '800 92px ui-rounded, Georgia, serif';
    g.fillText(text, 256, 122);
    g.font = '600 30px ui-rounded, Georgia, serif';
    g.fillText('HAY & NEEDLES', 256, 202);
    const tex = new T.CanvasTexture(c);
    tex.colorSpace = T.SRGBColorSpace;
    return tex;
  }

  function cartSignTexture() {
    const c = document.createElement('canvas');
    c.width = 384; c.height = 128;
    const g = c.getContext('2d');
    g.fillStyle = 'rgba(28,18,8,.86)';
    g.beginPath(); g.roundRect(6, 22, 372, 84, 22); g.fill();
    g.strokeStyle = '#ffcf4d'; g.lineWidth = 6; g.stroke();
    g.fillStyle = '#ffe9a8';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '800 46px ui-rounded, system-ui, sans-serif';
    g.fillText('SIFTER', 192, 66);
    const tex = new T.CanvasTexture(c);
    tex.colorSpace = T.SRGBColorSpace;
    return tex;
  }

  function letterTexture(letter) {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    g.fillStyle = 'rgba(28,18,8,.82)';
    g.beginPath(); g.arc(64, 64, 56, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#ffcf4d'; g.lineWidth = 7; g.stroke();
    g.fillStyle = '#ffe9a8';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '800 68px ui-rounded, system-ui, sans-serif';
    g.fillText(letter, 64, 70);
    const tex = new T.CanvasTexture(c);
    tex.colorSpace = T.SRGBColorSpace;
    return tex;
  }

  /* -------------------------------------------------------- exterior */

  function buildExterior() {
    exterior = new T.Group();

    const ground = new T.Mesh(new T.CircleGeometry(220, 40), MAT.grass);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.02;
    exterior.add(ground);

    // a dirt path leading to the doors
    const path = new T.Mesh(new T.PlaneGeometry(9, 150), new T.MeshLambertMaterial({ color: 0x8a6a42 }));
    path.rotation.x = -Math.PI / 2;
    path.position.set(0, 0.01, 95);
    exterior.add(path);

    // treeline
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2;
      const r = 120 + Math.random() * 60;
      if (Math.abs(Math.sin(a)) < 0.25 && Math.cos(a) > 0) continue; // keep the path clear
      const tree = new T.Group();
      const h = 7 + Math.random() * 7;
      const trunk = new T.Mesh(new T.CylinderGeometry(0.5, 0.7, h * 0.45, 6), MAT.trunk);
      trunk.position.y = h * 0.22;
      const top = new T.Mesh(new T.ConeGeometry(2.6 + Math.random() * 1.4, h, 7), MAT.leaf);
      top.position.y = h * 0.62;
      tree.add(trunk, top);
      tree.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
      exterior.add(tree);
    }

    scene.add(track(exterior));
  }

  function buildDust() {
    const n = 300;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 70;
      pos[i * 3 + 1] = Math.random() * 9 + 0.4;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 80;
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(pos, 3));
    dust = new T.Points(geo, new T.PointsMaterial({
      color: 0xffe9b0, size: 0.09, transparent: true, opacity: 0.5, depthWrite: false,
    }));
    scene.add(dust);
    disposables.push(geo);
  }

  /* ----------------------------------------------------- level build */

  function clearLevel() {
    if (!levelGroup) return;
    scene.remove(levelGroup);
    levelGroup.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material && o.material.map && o.material.map.isCanvasTexture) o.material.map.dispose();
      if (o.material && o.isSprite) o.material.dispose();
    });
    levelGroup = null;
    state.piles = [];
    state.doors = [];
    state.needleGlow = null;
  }

  function layoutFor(pileCount) {
    const cols = Math.min(4, Math.ceil(Math.sqrt(pileCount)));
    const rows = Math.ceil(pileCount / cols);
    const spacing = 9;
    const width = Math.max(30, cols * spacing + 12);
    const depth = rows * spacing + 26;
    const doorZ = depth / 2;
    const positions = [];
    for (let i = 0; i < pileCount; i++) {
      const col = i % cols, row = Math.floor(i / cols);
      const rowCount = Math.min(cols, pileCount - row * cols);
      const colOffset = (rowCount - 1) / 2;
      positions.push({
        x: (col - colOffset) * spacing,
        z: doorZ - 19 - row * spacing,
      });
    }
    return { cols, rows, width, depth, doorZ, positions, cartZ: doorZ - 12, spawnZ: doorZ - 3.5 };
  }

  function buildLevel(spec) {
    clearLevel();
    const L = layoutFor(spec.piles.length);
    state.layout = L;
    const g = new T.Group();
    const H = 11;                    // wall height
    const halfW = L.width / 2, halfD = L.depth / 2;
    const doorW = 9, doorH = 8;

    // floor
    const floor = new T.Mesh(new T.PlaneGeometry(L.width, L.depth), MAT.floor);
    floor.rotation.x = -Math.PI / 2;
    g.add(floor);
    for (let i = -Math.floor(L.width / 3); i <= Math.floor(L.width / 3); i++) {
      const line = new T.Mesh(new T.BoxGeometry(0.1, 0.02, L.depth), MAT.plank);
      line.position.set(i * 3, 0.012, 0);
      g.add(line);
    }

    // walls (boxes: red outside is faked with an outer skin)
    const wall = (w, h, d, x, y, z, mat) => {
      const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat);
      m.position.set(x, y, z);
      g.add(m);
      return m;
    };
    const t = 0.6;
    wall(L.width + t * 2, H, t, 0, H / 2, -halfD, MAT.wallIn);            // back
    wall(t, H, L.depth, -halfW, H / 2, 0, MAT.wallIn);                    // left
    wall(t, H, L.depth, halfW, H / 2, 0, MAT.wallIn);                     // right
    // outer skin
    wall(L.width + t * 2 + 0.3, H, 0.2, 0, H / 2, -halfD - 0.45, MAT.wallOut);
    wall(0.2, H, L.depth, -halfW - 0.45, H / 2, 0, MAT.wallOut);
    wall(0.2, H, L.depth, halfW + 0.45, H / 2, 0, MAT.wallOut);

    // front wall with a door gap
    const side = (L.width - doorW) / 2;
    wall(side, H, t, -(doorW + side) / 2, H / 2, halfD, MAT.wallIn);
    wall(side, H, t, (doorW + side) / 2, H / 2, halfD, MAT.wallIn);
    wall(doorW, H - doorH, t, 0, doorH + (H - doorH) / 2, halfD, MAT.wallIn);
    wall(side, H, 0.2, -(doorW + side) / 2, H / 2, halfD + 0.45, MAT.wallOut);
    wall(side, H, 0.2, (doorW + side) / 2, H / 2, halfD + 0.45, MAT.wallOut);
    wall(doorW, H - doorH, 0.2, 0, doorH + (H - doorH) / 2, halfD + 0.45, MAT.wallOut);
    wall(doorW + 1.4, 0.7, 0.5, 0, doorH + 0.3, halfD + 0.6, MAT.trim);

    // roof
    const pitch = 6;
    const slope = Math.hypot(halfW, pitch);
    const roofL = new T.Mesh(new T.BoxGeometry(slope * 2 + 1.2, 0.5, L.depth + 1.6), MAT.roof);
    roofL.position.set(0, H + pitch / 2, 0);
    roofL.scale.x = 0.5;
    roofL.position.x = -halfW / 2;
    roofL.rotation.z = Math.atan2(pitch, halfW);
    g.add(roofL);
    const roofR = roofL.clone();
    roofR.position.x = halfW / 2;
    roofR.rotation.z = -roofL.rotation.z;
    g.add(roofR);
    // gable ends, so the roof closes against the sky
    const gable = new T.Shape();
    gable.moveTo(-halfW - 0.4, 0);
    gable.lineTo(halfW + 0.4, 0);
    gable.lineTo(0, pitch + 0.4);
    gable.closePath();
    const gableGeo = new T.ShapeGeometry(gable);
    const gableBack = new T.Mesh(gableGeo, MAT.wallOut);
    gableBack.position.set(0, H - 0.1, -halfD - 0.5);
    gableBack.rotation.y = Math.PI;
    g.add(gableBack);
    const gableFront = new T.Mesh(gableGeo, MAT.wallOut);
    gableFront.position.set(0, H - 0.1, halfD + 0.5);
    g.add(gableFront);
    // inner faces, so it reads as timber from inside
    const gableInBack = new T.Mesh(gableGeo, MAT.wallIn);
    gableInBack.position.set(0, H - 0.1, -halfD + 0.05);
    g.add(gableInBack);
    const gableInFront = new T.Mesh(gableGeo, MAT.wallIn);
    gableInFront.position.set(0, H - 0.1, halfD - 0.05);
    gableInFront.rotation.y = Math.PI;
    g.add(gableInFront);

    for (let i = 0; i < L.rows + 3; i++) {
      const beam = new T.Mesh(new T.BoxGeometry(L.width, 0.5, 0.5), MAT.beam);
      beam.position.set(0, H - 0.4, -halfD + 4 + i * (L.depth / (L.rows + 3)));
      g.add(beam);
    }

    // sign above the doors
    const sign = new T.Mesh(new T.PlaneGeometry(9, 4.5), new T.MeshBasicMaterial({ map: signTexture('BARN ' + spec.level) }));
    sign.position.set(0, doorH + 2.4, halfD + 0.75);
    g.add(sign);

    // door leaves
    for (const s of [-1, 1]) {
      const pivot = new T.Group();
      pivot.position.set(s * doorW / 2, 0, halfD + 0.2);
      const leaf = new T.Mesh(new T.BoxGeometry(doorW / 2, doorH, 0.4), MAT.wallOut);
      leaf.position.set(-s * doorW / 4, doorH / 2, 0);
      const cross = new T.Mesh(new T.BoxGeometry(doorW / 2 - 0.6, 0.45, 0.5), MAT.trim);
      cross.position.copy(leaf.position);
      cross.position.y = doorH * 0.55;
      pivot.add(leaf, cross);
      g.add(pivot);
      state.doors.push({ pivot, sign: s });
    }

    // light shafts through the doorway
    const shaft = new T.Mesh(new T.PlaneGeometry(doorW, 26), MAT.shaft);
    shaft.rotation.x = -Math.PI / 2.6;
    shaft.position.set(0, 4.4, halfD - 9);
    g.add(shaft);

    // lanterns
    for (const s of [-1, 1]) {
      const lamp = new T.Mesh(new T.SphereGeometry(0.42, 10, 8), MAT.glow);
      lamp.position.set(s * (halfW - 1.4), 7.4, -halfD + L.depth * 0.32);
      g.add(lamp);
      const light = new T.PointLight(0xffc472, 90, 48, 2);
      light.position.copy(lamp.position);
      g.add(light);
    }

    // the sifter runs along the wall in the corner by the doors
    state.cart = buildSifter(g, -(halfW - 2.6), L.cartZ + 4);

    // hay piles
    spec.piles.forEach((p, i) => {
      const pos = L.positions[i];
      state.piles.push(buildPile(g, pos.x, pos.z, i, p));
    });

    state.bounds = {
      minX: -halfW + 1.6, maxX: halfW - 1.6,
      minZ: -halfD + 1.6, maxZ: halfD + 14,     // beyond the doors is the outside
      innerMaxZ: halfD - 1.6, doorHalf: doorW / 2 - 0.6,
    };
    state.doorOpen = 0;

    levelGroup = g;
    scene.add(g);
    return { layout: L, bounds: state.bounds };
  }

  /* The sifter: a conveyor tucked along the wall by the doors. You tip a load
     into the hopper at the near end, the belt carries it down to the crate. */
  function buildSifter(parent, x, nearZ) {
    const g = new T.Group();
    const LEN = 8.2, W = 2.2, TOP = 1.7;
    const farZ = nearZ - LEN;
    const midZ = (nearZ + farZ) / 2;

    // frame and legs
    const frame = new T.Mesh(new T.BoxGeometry(W + 0.35, 0.34, LEN), MAT.beam);
    frame.position.set(0, TOP - 0.3, midZ - nearZ);
    g.add(frame);
    for (const lz of [-0.6, -LEN + 0.6]) {
      for (const lx of [-1, 1]) {
        const leg = new T.Mesh(new T.BoxGeometry(0.3, TOP - 0.3, 0.3), MAT.beam);
        leg.position.set(lx * (W / 2 - 0.1), (TOP - 0.3) / 2, lz);
        g.add(leg);
      }
    }

    // belt bed plus the slats that sell the motion
    const bed = new T.Mesh(new T.BoxGeometry(W, 0.12, LEN - 0.8), MAT.beltBed);
    bed.position.set(0, TOP, midZ - nearZ);
    g.add(bed);
    const slats = [];
    const SLAT_GAP = 0.62;
    const count = Math.floor((LEN - 0.8) / SLAT_GAP);
    for (let i = 0; i < count; i++) {
      const slat = new T.Mesh(new T.BoxGeometry(W - 0.12, 0.09, 0.16), MAT.beltSlat);
      slat.position.set(0, TOP + 0.08, -0.5 - i * SLAT_GAP);
      g.add(slat);
      slats.push(slat);
    }

    // rollers at each end
    const rollers = [];
    for (const rz of [-0.45, -LEN + 0.45]) {
      const roller = new T.Mesh(new T.CylinderGeometry(0.28, 0.28, W + 0.1, 10), MAT.metal);
      roller.rotation.z = Math.PI / 2;
      roller.position.set(0, TOP, rz);
      g.add(roller);
      rollers.push(roller);
    }

    // hopper at the near end — this is what the player tips into
    const hopper = new T.Mesh(
      new T.CylinderGeometry(1.35, 0.7, 1.1, 8, 1, true),
      new T.MeshLambertMaterial({ color: 0x9fb0bb, flatShading: true, side: T.DoubleSide })
    );
    hopper.position.set(0, TOP + 0.75, -0.2);
    g.add(hopper);

    // crate at the far end, filling with sifted hay
    const crate = new T.Mesh(new T.BoxGeometry(W + 0.9, 1.5, 2.4), MAT.plank);
    crate.position.set(0, 0.75, -LEN - 0.9);
    g.add(crate);
    const hay = new T.Mesh(new T.BoxGeometry(W + 0.4, 1.1, 2.0), MAT.hay);
    hay.position.set(0, 1.2, -LEN - 0.9);
    hay.scale.y = 0.02;
    g.add(hay);

    // sign on a post over the hopper
    const post = new T.Mesh(new T.BoxGeometry(0.16, 2.6, 0.16), MAT.beam);
    post.position.set(0, TOP + 1.3, 0.55);
    g.add(post);
    const board = new T.Mesh(new T.PlaneGeometry(4.2, 1.45), new T.MeshBasicMaterial({
      map: cartSignTexture(), transparent: true, side: T.DoubleSide,
    }));
    board.position.set(0, TOP + 2.45, 0.55);
    board.rotation.y = 0.8;          // angled to face the room, not the wall
    g.add(board);

    g.position.set(x, 0, nearZ);
    parent.add(g);
    return {
      group: g, hay, slats, rollers,
      x, z: nearZ - 1.2,                    // where the player tips it in
      beltTop: TOP, len: LEN, nearZ, farZ,
      collide: { x, z: midZ, hx: W / 2 + 0.5, hz: LEN / 2 + 1.6 },
      fill: 0, riders: [],
    };
  }

  function buildPile(parent, x, z, index, data) {
    const group = new T.Group();
    group.position.set(x, 0, z);

    const geo = new T.CylinderGeometry(0.85, 3.25, 4.3 + (index % 3) * 0.4, 9, 3);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i);
      if (y < 2) {
        p.setX(i, p.getX(i) + (Math.random() - 0.5) * 0.5);
        p.setZ(i, p.getZ(i) + (Math.random() - 0.5) * 0.5);
      }
    }
    geo.computeVertexNormals();
    const cone = new T.Mesh(geo, MAT.hay);
    cone.userData.h = geo.parameters.height;
    cone.position.y = cone.userData.h / 2;
    group.add(cone);

    const base = new T.Mesh(new T.CylinderGeometry(3.4, 3.8, 0.5, 10), MAT.hayDark);
    base.position.y = 0.25;
    group.add(base);

    // straw fringe
    for (let i = 0; i < 11; i++) {
      const a = (i / 11) * Math.PI * 2 + Math.random();
      const s = new T.Mesh(new T.BoxGeometry(0.07, 0.07, 0.9 + Math.random() * 0.6), MAT.straw);
      s.position.set(Math.cos(a) * 3.1, 0.25 + Math.random() * 0.9, Math.sin(a) * 3.1);
      s.rotation.set(Math.random() * 0.4, -a, Math.random() * 0.5 - 0.25);
      group.add(s);
    }

    const shadow = new T.Mesh(new T.CircleGeometry(3.8, 16), MAT.shadow);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.03;
    group.add(shadow);

    const label = new T.Sprite(new T.SpriteMaterial({ map: letterTexture(data.name), depthTest: false, transparent: true }));
    label.scale.set(1.5, 1.5, 1);
    label.position.y = 5.4;
    group.add(label);

    parent.add(group);
    const pile = { group, cone, base, label, x, z, index };
    setPileVisual(pile, 1);
    return pile;
  }

  /* -------------------------------------------------------- updates */

  function setPileVisual(pile, remaining) {
    const s = 0.2 + 0.8 * Math.max(0, Math.min(1, remaining));
    pile.cone.scale.set(Math.max(0.35, s), s, Math.max(0.35, s));
    pile.cone.position.y = (pile.cone.userData.h / 2) * s;
    pile.base.scale.set(Math.max(0.4, s), 1, Math.max(0.4, s));
    pile.label.position.y = 1.8 + pile.cone.userData.h * s;
    pile.group.visible = remaining > 0.001;
  }

  function setCartFill(f) {
    const c = state.cart;
    if (!c) return;
    c.fill = f;
    c.hay.scale.y = Math.max(0.02, f);
    c.hay.position.y = 0.75 + 0.55 * f;
  }

  /* A tipped load rides the belt down to the crate. */
  function sifterLoad(clumps) {
    const c = state.cart;
    if (!c) return;
    for (let i = 0; i < clumps; i++) {
      const m = new T.Mesh(new T.BoxGeometry(0.5 + Math.random() * 0.4, 0.34, 0.5), MAT.hay);
      m.position.set((Math.random() - 0.5) * 1.1, c.beltTop + 0.28, -0.5 - Math.random() * 0.6);
      m.rotation.y = Math.random();
      c.group.add(m);
      c.riders.push({ mesh: m, z: m.position.z });
    }
    while (c.riders.length > 26) {
      const old = c.riders.shift();
      c.group.remove(old.mesh);
      old.mesh.geometry.dispose();
    }
  }

  const BELT_SPEED = 2.6;

  function updateSifter(dt) {
    const c = state.cart;
    if (!c) return;
    const span = c.len - 0.8;
    for (const slat of c.slats) {
      slat.position.z -= BELT_SPEED * dt;
      if (slat.position.z < -0.5 - span) slat.position.z += span;
    }
    for (const r of c.rollers) r.rotation.x -= BELT_SPEED * dt * 3;
    for (let i = c.riders.length - 1; i >= 0; i--) {
      const rider = c.riders[i];
      rider.mesh.position.z -= BELT_SPEED * dt;
      if (rider.mesh.position.z < -c.len + 0.3) {
        // tipped off the end into the crate
        hayBurst(c.x + rider.mesh.position.x, c.beltTop, c.z - c.len + 1.2, 3);
        c.group.remove(rider.mesh);
        rider.mesh.geometry.dispose();
        c.riders.splice(i, 1);
      }
    }
  }

  function setNeedleGlow(pile) {
    if (state.needleGlow) {
      state.needleGlow.parent.remove(state.needleGlow);
      state.needleGlow.geometry.dispose();
      state.needleGlow = null;
    }
    if (!pile) return;
    const glow = new T.Mesh(new T.SphereGeometry(0.5, 12, 10), new T.MeshBasicMaterial({ color: 0xfff3c4, transparent: true, opacity: 0.9 }));
    glow.position.set(0, 6.6, 0);
    pile.group.add(glow);
    state.needleGlow = glow;
  }

  function hayBurst(x, y, z, n) {
    for (let i = 0; i < n; i++) {
      const m = new T.Mesh(new T.BoxGeometry(0.1, 0.1, 0.55), MAT.straw);
      m.position.set(x + (Math.random() - 0.5), y + Math.random() * 0.8, z + (Math.random() - 0.5));
      m.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
      scene.add(m);
      bursts.push({
        mesh: m, life: 1,
        vx: (Math.random() - 0.5) * 4.5,
        vy: 2.5 + Math.random() * 3.5,
        vz: (Math.random() - 0.5) * 4.5,
        vr: (Math.random() - 0.5) * 9,
      });
    }
    while (bursts.length > 140) {
      const old = bursts.shift();
      scene.remove(old.mesh); old.mesh.geometry.dispose();
    }
  }

  function update(dt, time) {
    // doors
    for (const d of state.doors) {
      d.pivot.rotation.y = -d.sign * state.doorOpen * 1.9;
    }
    updateSifter(dt);

    // dust drift
    if (dust) {
      dust.rotation.y = time * 0.01;
      dust.position.y = Math.sin(time * 0.3) * 0.25;
    }
    // needle glow bobs
    if (state.needleGlow) {
      state.needleGlow.position.y = 6.4 + Math.sin(time * 2.5) * 0.35;
      state.needleGlow.material.opacity = 0.6 + Math.sin(time * 5) * 0.3;
    }
    // straw bursts
    for (let i = bursts.length - 1; i >= 0; i--) {
      const b = bursts[i];
      b.vy -= 13 * dt;
      b.mesh.position.x += b.vx * dt;
      b.mesh.position.y += b.vy * dt;
      b.mesh.position.z += b.vz * dt;
      b.mesh.rotation.x += b.vr * dt;
      b.life -= dt * 0.75;
      if (b.life <= 0 || b.mesh.position.y < 0) {
        scene.remove(b.mesh);
        b.mesh.geometry.dispose();
        bursts.splice(i, 1);
      }
    }
  }

  function setDoorOpen(v) { state.doorOpen = Math.max(0, Math.min(1, v)); }
  function render() { renderer.render(scene, camera); }
  function renderTo(otherScene, otherCamera) { renderer.render(otherScene, otherCamera); }

  return {
    init, resize, render, renderTo, update,
    buildLevel, layoutFor,
    setPileVisual, setCartFill, setNeedleGlow, setDoorOpen, hayBurst, sifterLoad,
    get scene() { return scene; },
    get camera() { return camera; },
    get piles() { return state.piles; },
    get cart() { return state.cart; },
    get bounds() { return state.bounds; },
    get canvasHeight() { return canvas ? canvas.clientHeight : 0; },
    get layout() { return state.layout; },
  };
})();
