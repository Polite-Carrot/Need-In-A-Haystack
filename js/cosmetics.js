/* My Farmer — outfits, hats and shovel skins. Everything is built from
   geometry and procedurally drawn textures, so there are no art assets. */
window.NIAH = window.NIAH || {};

NIAH.cosmetics = (function () {
  const T = THREE;

  /* ------------------------------------------------------- textures */

  const texCache = {};
  function canvasTex(key, w, h, draw) {
    if (texCache[key]) return texCache[key];
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const tex = new T.CanvasTexture(c);
    tex.colorSpace = T.SRGBColorSpace;
    tex.anisotropy = 2;
    texCache[key] = tex;
    return tex;
  }

  function camoTex(key, colors) {
    return canvasTex(key, 128, 128, (g, w, h) => {
      g.fillStyle = colors[0];
      g.fillRect(0, 0, w, h);
      // blobs, drawn wrapped so the pattern tiles without a visible seam
      for (let i = 1; i < colors.length; i++) {
        g.fillStyle = colors[i];
        for (let n = 0; n < 16; n++) {
          const x = Math.random() * w, y = Math.random() * h;
          const r = 9 + Math.random() * 15;
          for (const [ox, oy] of [[0, 0], [w, 0], [-w, 0], [0, h], [0, -h]]) {
            g.beginPath();
            for (let a = 0; a < 7; a++) {
              const ang = (a / 7) * Math.PI * 2;
              const rr = r * (0.6 + Math.random() * 0.7);
              const px = x + ox + Math.cos(ang) * rr;
              const py = y + oy + Math.sin(ang) * rr;
              a ? g.lineTo(px, py) : g.moveTo(px, py);
            }
            g.closePath();
            g.fill();
          }
        }
      }
    });
  }

  const TEXTURES = {
    camoWoodland: () => camoTex('camoWoodland', ['#4a5834', '#2f3a22', '#6b7a47', '#25301b']),
    camoDesert:   () => camoTex('camoDesert', ['#cbb188', '#a8895c', '#e0d0a8', '#7d6440']),
    camoPink:     () => camoTex('camoPink', ['#ff8fc4', '#d9508f', '#ffd0e6', '#a63472']),
    hiVis: () => canvasTex('hiVis', 64, 64, (g, w, h) => {
      g.fillStyle = '#d8f235'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#9aa7b0'; g.fillRect(0, h * 0.34, w, h * 0.12); g.fillRect(0, h * 0.62, w, h * 0.12);
      g.fillStyle = '#e8f7ff'; g.fillRect(0, h * 0.46, w, h * 0.04); g.fillRect(0, h * 0.74, w, h * 0.04);
    }),
    check: () => canvasTex('check', 64, 64, (g, w, h) => {
      g.fillStyle = '#8c2f2a'; g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(20,10,8,.55)';
      for (let i = 0; i < 4; i++) { g.fillRect(i * 16, 0, 7, h); g.fillRect(0, i * 16, w, 7); }
      g.fillStyle = 'rgba(255,230,200,.25)';
      for (let i = 0; i < 4; i++) { g.fillRect(i * 16 + 9, 0, 3, h); g.fillRect(0, i * 16 + 9, w, 3); }
    }),
    flagUK: () => canvasTex('flagUK', 120, 60, (g, w, h) => {
      g.fillStyle = '#012169'; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#fff'; g.lineWidth = 14;
      g.beginPath(); g.moveTo(0, 0); g.lineTo(w, h); g.moveTo(w, 0); g.lineTo(0, h); g.stroke();
      g.strokeStyle = '#C8102E'; g.lineWidth = 7;
      g.beginPath(); g.moveTo(0, 0); g.lineTo(w, h); g.moveTo(w, 0); g.lineTo(0, h); g.stroke();
      g.strokeStyle = '#fff'; g.lineWidth = 22;
      g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.stroke();
      g.strokeStyle = '#C8102E'; g.lineWidth = 12;
      g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.stroke();
    }),
    flagUS: () => canvasTex('flagUS', 120, 63, (g, w, h) => {
      for (let i = 0; i < 7; i++) {
        g.fillStyle = i % 2 ? '#fff' : '#B22234';
        g.fillRect(0, (i * h) / 6.5, w, h / 13);
      }
      g.fillStyle = '#B22234';
      for (let i = 0; i < 7; i++) g.fillRect(0, (i * h) / 6.5, w, h / 13);
      g.fillStyle = '#fff';
      for (let i = 0; i < 6; i++) g.fillRect(0, (i * h) / 6.5 + h / 13, w, h / 13);
      g.fillStyle = '#3C3B6E'; g.fillRect(0, 0, w * 0.42, h * 0.54);
      g.fillStyle = '#fff';
      for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) {
        g.beginPath(); g.arc(w * 0.05 + c * w * 0.08, h * 0.08 + r * h * 0.13, 2.1, 0, 7); g.fill();
      }
    }),
    jolly: () => canvasTex('jolly', 96, 96, (g, w, h) => {
      g.fillStyle = '#12100e'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#f4efe4';
      g.beginPath(); g.ellipse(w / 2, h * 0.42, 22, 25, 0, 0, 7); g.fill();
      g.fillRect(w / 2 - 15, h * 0.58, 30, 12);
      g.fillStyle = '#12100e';
      g.beginPath(); g.arc(w / 2 - 8, h * 0.4, 6, 0, 7); g.arc(w / 2 + 8, h * 0.4, 6, 0, 7); g.fill();
      g.fillRect(w / 2 - 3, h * 0.52, 6, 7);
      g.strokeStyle = '#f4efe4'; g.lineWidth = 7; g.lineCap = 'round';
      g.beginPath(); g.moveTo(14, h - 14); g.lineTo(w - 14, h - 34); g.moveTo(14, h - 34); g.lineTo(w - 14, h - 14); g.stroke();
    }),
    disco: () => canvasTex('disco', 64, 64, (g, w, h) => {
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
        g.fillStyle = `hsl(${(x * 37 + y * 61) % 360}, 85%, ${55 + ((x + y) % 3) * 12}%)`;
        g.fillRect(x * 8, y * 8, 8, 8);
      }
    }),
    hay: () => canvasTex('hayPrint', 64, 64, (g, w, h) => {
      g.fillStyle = '#e8c463'; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#b98f2c'; g.lineWidth = 1.5;
      for (let i = 0; i < 60; i++) {
        const x = Math.random() * w, y = Math.random() * h, a = Math.random() * Math.PI;
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 9, y + Math.sin(a) * 9); g.stroke();
      }
    }),
  };

  function material(spec) {
    if (spec.tex) {
      const tex = TEXTURES[spec.tex]();
      return new T.MeshLambertMaterial({ map: tex, color: 0xffffff });
    }
    return new T.MeshLambertMaterial({ color: spec.color, flatShading: !!spec.flat });
  }

  /* -------------------------------------------------------- outfits */

  const OUTFITS = [
    { id: 'farmhand', name: 'Farmhand Red', price: 0, desc: 'Where every farmer starts.',
      shirt: { color: 0xc9543f }, trousers: { color: 0x3f6390 }, swatch: ['#c9543f', '#3f6390'] },
    { id: 'denim', name: 'Double Denim', price: 400, desc: 'Head to toe, no apologies.',
      shirt: { color: 0x5b8dc4 }, trousers: { color: 0x2f4f77 }, swatch: ['#5b8dc4', '#2f4f77'] },
    { id: 'sunday', name: 'Sunday Best', price: 1200, desc: 'Too good for a barn.',
      shirt: { color: 0xf4ecd8 }, trousers: { color: 0x2b2b33 }, swatch: ['#f4ecd8', '#2b2b33'] },
    { id: 'lumber', name: 'Lumberjack', price: 2200, desc: 'Smells faintly of pine.',
      shirt: { tex: 'check' }, trousers: { color: 0x3b3027 }, swatch: ['#8c2f2a', '#3b3027'] },
    { id: 'hivis', name: 'Hi-Vis', price: 4000, desc: 'Visible from three barns away.',
      shirt: { tex: 'hiVis' }, trousers: { tex: 'hiVis' }, swatch: ['#d8f235', '#9aa7b0'] },
    { id: 'woodland', name: 'Woodland Camo', price: 7500, desc: 'Hides you from the hay.',
      shirt: { tex: 'camoWoodland' }, trousers: { tex: 'camoWoodland' }, swatch: ['#4a5834', '#6b7a47'] },
    { id: 'desert', name: 'Desert Camo', price: 7500, desc: 'For a very dry harvest.',
      shirt: { tex: 'camoDesert' }, trousers: { tex: 'camoDesert' }, swatch: ['#cbb188', '#7d6440'] },
    { id: 'pinkcamo', name: 'Pink Camo', price: 16000, desc: 'Tactical, but make it loud.',
      shirt: { tex: 'camoPink' }, trousers: { tex: 'camoPink' }, swatch: ['#ff8fc4', '#a63472'] },
    { id: 'flagUK', name: 'Union Flag', price: 30000, desc: 'Hay and country.',
      shirt: { tex: 'flagUK' }, trousers: { color: 0x1d2b4a }, swatch: ['#012169', '#C8102E'] },
    { id: 'flagUS', name: 'Stars & Stripes', price: 30000, desc: 'Barn of the free.',
      shirt: { tex: 'flagUS' }, trousers: { color: 0x2c3358 }, swatch: ['#B22234', '#3C3B6E'] },
    { id: 'jolly', name: 'Jolly Roger', price: 60000, desc: 'Yo ho ho and a bale of hay.',
      shirt: { tex: 'jolly' }, trousers: { color: 0x17150f }, swatch: ['#12100e', '#f4efe4'] },
    { id: 'hayprint', name: 'Full Hay Print', price: 90000, desc: 'Become the haystack.',
      shirt: { tex: 'hay' }, trousers: { tex: 'hay' }, swatch: ['#e8c463', '#b98f2c'] },
    { id: 'disco', name: 'Disco Sequins', price: 150000, unlock: 6, desc: 'The barn becomes a dancefloor.',
      shirt: { tex: 'disco' }, trousers: { tex: 'disco' }, swatch: ['#ff5ea8', '#5ed4ff'] },
  ];

  /* ----------------------------------------------------------- hats */

  const M = (c, flat) => new T.MeshLambertMaterial({ color: c, flatShading: !!flat });

  const HATS = [
    { id: 'straw', name: 'Straw Hat', price: 0, swatch: ['#e0b657'], desc: 'Standard issue sun protection.',
      build: () => {
        const g = new T.Group();
        const m = M(0xe0b657, true);
        const brim = new T.Mesh(new T.CylinderGeometry(0.62, 0.62, 0.07, 12), m);
        brim.position.y = 0.06;
        const crown = new T.Mesh(new T.ConeGeometry(0.33, 0.36, 10), m);
        crown.position.y = 0.22;
        g.add(brim, crown);
        return g;
      } },
    { id: 'capRed', name: 'Red Ball Cap', price: 500, swatch: ['#c23b34'], desc: 'Sweat-stained, lucky.',
      build: () => cap(0xc23b34) },
    { id: 'capBlue', name: 'Blue Ball Cap', price: 500, swatch: ['#2f6fb5'], desc: 'For away days.',
      build: () => cap(0x2f6fb5) },
    { id: 'capGreen', name: 'Green Ball Cap', price: 500, swatch: ['#3f8f4f'], desc: 'Tractor dealership freebie.',
      build: () => cap(0x3f8f4f) },
    { id: 'beanie', name: 'Woolly Beanie', price: 1500, swatch: ['#8b5ec9'], desc: 'Barns get cold.',
      build: () => {
        const g = new T.Group();
        const m = M(0x8b5ec9);
        const dome = new T.Mesh(new T.SphereGeometry(0.34, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), m);
        dome.position.y = 0.06;
        const band = new T.Mesh(new T.CylinderGeometry(0.35, 0.35, 0.12, 12), M(0xf0e9dd));
        band.position.y = 0.02;
        const bobble = new T.Mesh(new T.SphereGeometry(0.11, 8, 6), M(0xf0e9dd));
        bobble.position.y = 0.42;
        g.add(dome, band, bobble);
        return g;
      } },
    { id: 'bucket', name: 'Bucket Hat', price: 2500, swatch: ['#6f8f4a'], desc: 'Festival farmer.',
      build: () => {
        const g = new T.Group();
        const m = M(0x6f8f4a);
        const brim = new T.Mesh(new T.CylinderGeometry(0.56, 0.48, 0.1, 14), m);
        brim.position.y = 0.04;
        const top = new T.Mesh(new T.CylinderGeometry(0.33, 0.37, 0.28, 14), m);
        top.position.y = 0.2;
        g.add(brim, top);
        return g;
      } },
    { id: 'cowboy', name: 'Cowboy Hat', price: 5000, swatch: ['#6b4423'], desc: 'This barn ain’t big enough.',
      build: () => {
        const g = new T.Group();
        const m = M(0x6b4423, true);
        const brim = new T.Mesh(new T.TorusGeometry(0.52, 0.16, 6, 16), m);
        brim.rotation.x = Math.PI / 2;
        brim.scale.y = 0.35;
        brim.position.y = 0.06;
        const disc = new T.Mesh(new T.CylinderGeometry(0.52, 0.52, 0.06, 16), m);
        disc.position.y = 0.06;
        const crown = new T.Mesh(new T.CylinderGeometry(0.27, 0.32, 0.42, 10), m);
        crown.position.y = 0.3;
        const band = new T.Mesh(new T.CylinderGeometry(0.33, 0.33, 0.09, 12), M(0x2b1d10));
        band.position.y = 0.14;
        g.add(brim, disc, crown, band);
        return g;
      } },
    { id: 'tophat', name: 'Top Hat', price: 12000, swatch: ['#14131a'], desc: 'Gentleman of the soil.',
      build: () => {
        const g = new T.Group();
        const m = M(0x14131a);
        const brim = new T.Mesh(new T.CylinderGeometry(0.56, 0.56, 0.06, 16), m);
        brim.position.y = 0.04;
        const tube = new T.Mesh(new T.CylinderGeometry(0.33, 0.35, 0.7, 14), m);
        tube.position.y = 0.42;
        const band = new T.Mesh(new T.CylinderGeometry(0.36, 0.36, 0.1, 14), M(0xc23b34));
        band.position.y = 0.13;
        g.add(brim, tube, band);
        return g;
      } },
    { id: 'viking', name: 'Viking Helm', price: 25000, swatch: ['#b9c2c9', '#e8dfc8'], desc: 'Pillage the hay.',
      build: () => {
        const g = new T.Group();
        const dome = new T.Mesh(new T.SphereGeometry(0.36, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), M(0xb9c2c9, true));
        dome.position.y = 0.04;
        const rim = new T.Mesh(new T.CylinderGeometry(0.38, 0.38, 0.1, 14), M(0x8a949c));
        rim.position.y = 0.03;
        g.add(dome, rim);
        for (const s of [-1, 1]) {
          const horn = new T.Mesh(new T.ConeGeometry(0.1, 0.44, 8), M(0xe8dfc8, true));
          horn.position.set(s * 0.34, 0.26, 0);
          horn.rotation.z = s * -0.9;
          g.add(horn);
        }
        return g;
      } },
    { id: 'bunny', name: 'Bunny Head', price: 45000, swatch: ['#f6eee6', '#ff9dc0'], desc: 'Nobody asks why.',
      build: () => {
        const g = new T.Group();
        const fur = M(0xf6eee6);
        const head = new T.Mesh(new T.SphereGeometry(0.42, 14, 12), fur);
        head.position.y = 0.02;
        head.scale.z = 1.1;
        const snout = new T.Mesh(new T.SphereGeometry(0.2, 10, 8), fur);
        snout.position.set(0, -0.08, 0.34);
        const nose = new T.Mesh(new T.SphereGeometry(0.07, 8, 6), M(0xff6f9b));
        nose.position.set(0, -0.04, 0.52);
        g.add(head, snout, nose);
        for (const s of [-1, 1]) {
          const ear = new T.Mesh(new T.CapsuleGeometry(0.1, 0.5, 4, 8), fur);
          ear.position.set(s * 0.17, 0.55, -0.02);
          ear.rotation.z = s * 0.2;
          const inner = new T.Mesh(new T.CylinderGeometry(0.055, 0.055, 0.42, 8), M(0xff9dc0));
          inner.position.set(s * 0.19, 0.58, 0.06);
          inner.rotation.z = s * 0.2;
          const eye = new T.Mesh(new T.SphereGeometry(0.05, 8, 6), M(0x1a1410));
          eye.position.set(s * 0.17, 0.04, 0.36);
          g.add(ear, inner, eye);
        }
        return g;
      } },
    { id: 'cone', name: 'Traffic Cone', price: 70000, swatch: ['#f06424', '#f4efe4'], desc: 'Found it on the way in.',
      build: () => {
        const g = new T.Group();
        const cone = new T.Mesh(new T.ConeGeometry(0.34, 0.8, 12), M(0xf06424, true));
        cone.position.y = 0.42;
        const base = new T.Mesh(new T.BoxGeometry(0.62, 0.08, 0.62), M(0xf06424));
        base.position.y = 0.05;
        const stripe = new T.Mesh(new T.ConeGeometry(0.26, 0.16, 12), M(0xf4efe4));
        stripe.position.y = 0.53;
        g.add(cone, base, stripe);
        return g;
      } },
    { id: 'carrot', name: 'Polite Carrot', price: 120000, unlock: 6, swatch: ['#FF6B1A', '#65B84F'],
      desc: 'Become the mascot. Smile included.',
      build: () => {
        const g = new T.Group();
        g.rotation.z = -0.09;              // the logo's jaunty lean, gentler on a head

        /* A carrot head rather than a carrot hat: one lathed profile, domed at
           the crown and tapering to a tip that ends up inside the chest, so the
           farmer's own head is swallowed and the silhouette still reads carrot.
           x is the radius, y the height; the head it has to cover is a 0.3
           sphere centred at -0.12. */
        const profile = [
          [0.0, -1.0], [0.05, -0.95], [0.15, -0.78], [0.25, -0.56],
          [0.33, -0.36], [0.385, -0.16], [0.41, 0.02], [0.40, 0.20],
          [0.355, 0.38], [0.27, 0.50], [0.15, 0.575], [0.02, 0.60],
        ].map(([x, y]) => new T.Vector2(x, y));   // tip first: lathe winds
                                                  // outward-facing from the
                                                  // bottom up
        const body = new T.Mesh(new T.LatheGeometry(profile, 14), M(0xff6b1a, true));
        g.add(body);

        // leaves out of the crown
        const leaves = [[0x65b84f, -0.46, 0.54], [0x4b9d43, 0.44, 0.6], [0x7bcb59, -0.02, 0.46]];
        leaves.forEach(([col, lean, len], i) => {
          const leaf = new T.Mesh(new T.ConeGeometry(0.1, len, 7), M(col, true));
          leaf.position.set(Math.sin(lean) * 0.14, 0.56 + Math.cos(lean) * len * 0.42, i === 2 ? -0.09 : 0.05);
          leaf.rotation.z = -lean;
          leaf.rotation.x = i === 2 ? -0.3 : 0.14;
          g.add(leaf);
        });

        // face, on the widest part of the body as in the logo
        for (const sx of [-1, 1]) {
          const eye = new T.Mesh(new T.SphereGeometry(0.058, 12, 10), M(0x111111));
          eye.scale.y = 1.3;
          eye.position.set(sx * 0.145, 0.13, 0.345);
          const glint = new T.Mesh(new T.SphereGeometry(0.022, 7, 6), M(0xffffff));
          glint.position.set(sx * 0.145 - 0.024, 0.172, 0.375);
          g.add(eye, glint);
        }
        const smile = new T.Mesh(new T.TorusGeometry(0.115, 0.021, 7, 16, Math.PI * 0.8), M(0x421a12));
        smile.position.set(0, -0.02, 0.37);
        smile.rotation.z = Math.PI + Math.PI * 0.1;      // closed, turned up at the ends
        g.add(smile);

        // root dashes down the taper
        [[-0.1, -1, 0.36], [-0.26, 1, 0.32], [-0.42, -1, 0.26]].forEach(([y, sx, r]) => {
          const dash = new T.Mesh(new T.CylinderGeometry(0.015, 0.015, 0.09, 5), M(0xd9470b));
          dash.position.set(sx * r * 0.62, y, r * 0.72);
          dash.rotation.z = Math.PI / 2 - sx * 0.5;
          g.add(dash);
        });

        return g;
      } },
    { id: 'crown', name: 'Golden Crown', price: 250000, unlock: 8, swatch: ['#ffcf4d', '#ff4d6d'], desc: 'King of the haystack.',
      build: () => {
        const g = new T.Group();
        const gold = new T.Mesh(new T.CylinderGeometry(0.36, 0.36, 0.26, 12), M(0xffcf4d, true));
        gold.position.y = 0.16;
        g.add(gold);
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          const spike = new T.Mesh(new T.ConeGeometry(0.09, 0.26, 6), M(0xffcf4d, true));
          spike.position.set(Math.cos(a) * 0.3, 0.38, Math.sin(a) * 0.3);
          g.add(spike);
          const jewel = new T.Mesh(new T.SphereGeometry(0.06, 8, 6), M(0xff4d6d));
          jewel.position.set(Math.cos(a) * 0.36, 0.2, Math.sin(a) * 0.36);
          g.add(jewel);
        }
        return g;
      } },
  ];

  function cap(color) {
    const g = new T.Group();
    const m = M(color);
    const dome = new T.Mesh(new T.SphereGeometry(0.34, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), m);
    dome.position.y = 0.04;
    const peak = new T.Mesh(new T.CylinderGeometry(0.4, 0.4, 0.05, 14, 1, false, -0.7, 1.4), m);
    peak.position.set(0, 0.05, 0.16);
    peak.scale.z = 1.35;
    const btn = new T.Mesh(new T.SphereGeometry(0.06, 6, 5), m);
    btn.position.y = 0.36;
    g.add(dome, peak, btn);
    return g;
  }

  /* ------------------------------------------------------- shovels */

  function hayLoad(y, w) {
    const load = new T.Mesh(new T.BoxGeometry(w || 0.56, 0.3, 0.3), M(0xe0b043, true));
    load.position.y = y;
    load.scale.set(0.02, 0.02, 0.02);
    return load;
  }

  function spadeSkin(handleColor, bladeColor, flat) {
    return () => {
      const g = new T.Group();
      const handle = new T.Mesh(new T.CylinderGeometry(0.06, 0.06, 1.9, 6), M(handleColor));
      handle.position.y = -0.95;
      const blade = new T.Mesh(new T.BoxGeometry(0.62, 0.72, 0.1), M(bladeColor, flat !== false));
      blade.position.y = -1.95;
      const load = hayLoad(-2.08);
      g.add(handle, blade, load);
      return { group: g, blade, load };
    };
  }

  const SHOVEL_SKINS = [
    { id: 'auto', name: 'Standard', price: 0, swatch: ['#cdd6dd', '#8b5a2b'], desc: 'Whatever you bought in the shop.',
      build: spadeSkin(0x8b5a2b, 0xcdd6dd) },
    { id: 'blue', name: 'Blue Steel', price: 1500, swatch: ['#5b9bd5'], desc: 'Powder coated, barn ready.',
      build: spadeSkin(0x24405c, 0x5b9bd5) },
    { id: 'copper', name: 'Copper Spade', price: 3500, swatch: ['#c87d3f'], desc: 'Turns green if you sweat.',
      build: spadeSkin(0x5a3a1c, 0xc87d3f) },
    { id: 'pitchfork', name: 'Pitchfork', price: 8000, swatch: ['#b9c2c9'], desc: 'Four tines, no waiting.',
      build: () => {
        const g = new T.Group();
        const m = M(0xb9c2c9, true);
        const handle = new T.Mesh(new T.CylinderGeometry(0.06, 0.06, 1.9, 6), M(0x7c4f2a));
        handle.position.y = -0.95;
        const cross = new T.Mesh(new T.BoxGeometry(0.62, 0.1, 0.1), m);
        cross.position.y = -1.9;
        g.add(handle, cross);
        for (let i = 0; i < 4; i++) {
          const tine = new T.Mesh(new T.ConeGeometry(0.05, 0.62, 6), m);
          tine.position.set(-0.24 + i * 0.16, -2.2, 0);
          tine.rotation.x = Math.PI;
          g.add(tine);
        }
        const load = hayLoad(-2.16, 0.5);
        g.add(load);
        return { group: g, blade: cross, load };
      } },
    { id: 'spoon', name: 'Giant Spoon', price: 15000, swatch: ['#dfe7ee'], desc: 'Borrowed from a very big kitchen.',
      build: () => {
        const g = new T.Group();
        const m = M(0xdfe7ee, true);
        const handle = new T.Mesh(new T.CylinderGeometry(0.055, 0.075, 1.9, 8), m);
        handle.position.y = -0.95;
        const bowl = new T.Mesh(new T.SphereGeometry(0.42, 12, 10, 0, Math.PI * 2, 0, Math.PI / 2), m);
        bowl.position.y = -2.0;
        bowl.rotation.x = Math.PI;
        bowl.scale.z = 0.75;
        const load = hayLoad(-2.1, 0.5);
        g.add(handle, bowl, load);
        return { group: g, blade: bowl, load };
      } },
    { id: 'gold', name: 'Gold Shovel', price: 40000, swatch: ['#ffcf4d', '#c99a1e'], desc: 'Heavier than it looks.',
      build: () => {
        const r = spadeSkin(0xc99a1e, 0xffcf4d)();
        const collar = new T.Mesh(new T.CylinderGeometry(0.09, 0.09, 0.14, 8), M(0xfff0b8, true));
        collar.position.y = -1.6;
        r.group.add(collar);
        return r;
      } },
    { id: 'candy', name: 'Candy Cane', price: 80000, swatch: ['#f4efe4', '#d8384f'], desc: 'Festive. Sticky.',
      build: () => {
        const g = new T.Group();
        const white = M(0xf4efe4), red = M(0xd8384f);
        for (let i = 0; i < 9; i++) {
          const seg = new T.Mesh(new T.CylinderGeometry(0.07, 0.07, 0.21, 8), i % 2 ? red : white);
          seg.position.y = -0.2 - i * 0.21;
          g.add(seg);
        }
        const hook = new T.Mesh(new T.TorusGeometry(0.26, 0.07, 6, 12, Math.PI), red);
        hook.position.y = -2.15;
        hook.rotation.set(Math.PI / 2, 0, 0);
        hook.rotation.y = Math.PI;
        const blade = new T.Mesh(new T.BoxGeometry(0.5, 0.5, 0.1), white);
        blade.position.y = -2.25;
        blade.visible = false;
        const load = hayLoad(-2.2, 0.44);
        g.add(hook, blade, load);
        return { group: g, blade, load };
      } },
    { id: 'trident', name: 'Trident', price: 120000, swatch: ['#7fe3d4', '#ffcf4d'], desc: 'Ruler of hay and sea.',
      build: () => {
        const g = new T.Group();
        const shaft = M(0x2f7f74), tip = M(0x7fe3d4, true);
        const handle = new T.Mesh(new T.CylinderGeometry(0.07, 0.07, 2.0, 8), shaft);
        handle.position.y = -1.0;
        const cross = new T.Mesh(new T.BoxGeometry(0.72, 0.1, 0.1), tip);
        cross.position.y = -1.98;
        g.add(handle, cross);
        for (const x of [-0.32, 0, 0.32]) {
          const prong = new T.Mesh(new T.ConeGeometry(0.07, x === 0 ? 0.82 : 0.66, 6), tip);
          prong.position.set(x, -2.36 - (x === 0 ? 0.08 : 0), 0);
          prong.rotation.x = Math.PI;
          g.add(prong);
        }
        const gem = new T.Mesh(new T.SphereGeometry(0.1, 10, 8), M(0xffcf4d, true));
        gem.position.y = -1.86;
        g.add(gem);
        const load = hayLoad(-2.2, 0.56);
        g.add(load);
        return { group: g, blade: cross, load };
      } },
    { id: 'diamond', name: 'Diamond', price: 400000, unlock: 7, swatch: ['#bff3ff', '#7ad7f0'], desc: 'Cuts hay it has not met yet.',
      build: () => {
        const g = new T.Group();
        const handle = new T.Mesh(new T.CylinderGeometry(0.06, 0.06, 1.9, 6), M(0x4a6b78));
        handle.position.y = -0.95;
        const blade = new T.Mesh(new T.OctahedronGeometry(0.46, 0), new T.MeshLambertMaterial({
          color: 0xbff3ff, flatShading: true, transparent: true, opacity: 0.85,
        }));
        blade.position.y = -2.0;
        blade.scale.set(0.8, 1.1, 0.5);
        const load = hayLoad(-2.1, 0.5);
        g.add(handle, blade, load);
        return { group: g, blade, load };
      } },
  ];

  /* ---------------------------------------------------------- apply */

  const byId = (list, id) => list.find((x) => x.id === id) || list[0];

  function applyLook(rig, look, tier) {
    const p = rig.parts;
    const outfit = byId(OUTFITS, look.outfit);
    const shirtMat = material(outfit.shirt);
    const trouserMat = material(outfit.trousers);
    p.shirtMeshes.forEach((m) => { m.material = shirtMat; });
    p.trouserMeshes.forEach((m) => { m.material = trouserMat; });
    // the look is re-applied on every equip and every barn, so drop the
    // materials it replaces (their textures are cached and shared, so the
    // cache keeps owning those)
    (p.outfitMats || []).forEach((m) => m.dispose());
    p.outfitMats = [shirtMat, trouserMat];

    // hat
    if (p.hat) { p.hatAnchor.remove(p.hat); disposeTree(p.hat); }
    p.hat = byId(HATS, look.hat).build();
    p.hatAnchor.add(p.hat);

    // shovel — 'auto' keeps the shop tier's own look
    if (p.shovel) { p.armR.remove(p.shovel); disposeTree(p.shovel); }
    const skin = byId(SHOVEL_SKINS, look.shovel);
    const built = skin.id === 'auto' ? autoShovel(tier || 0) : skin.build();
    p.shovel = built.group;
    p.blade = built.blade;
    p.load = built.load;
    p.shovel.position.set(0.02, -0.66, 0.06);
    p.shovel.rotation.set(-2.45, 0, 0.22);
    const s = 0.85 + Math.min(tier || 0, 7) * 0.055;
    p.shovel.scale.setScalar(s);
    p.armR.add(p.shovel);
  }

  function autoShovel(tier) {
    const handle = tier >= 6 ? 0x4f3117 : tier >= 3 ? 0x8b5a2b : 0xc9a06a;
    const blade = tier >= 7 ? 0xffe9a8 : tier >= 4 ? 0xcdd6dd : tier >= 2 ? 0xa4703f : 0xe8c79a;
    return spadeSkin(handle, blade)();
  }

  function disposeTree(obj) {
    obj.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
    });
  }

  function priceOf(kind, id) {
    const item = byId(listFor(kind), id);
    return item ? item.price : 0;
  }
  function listFor(kind) {
    return kind === 'outfit' ? OUTFITS : kind === 'hat' ? HATS : SHOVEL_SKINS;
  }

  return { OUTFITS, HATS, SHOVEL_SKINS, applyLook, listFor, priceOf, byId };
})();
