/* My Farmer — a turntable preview of the farmhand, rendered through the same
   renderer as the barn while the wardrobe is open. */
window.NIAH = window.NIAH || {};

NIAH.wardrobe = (function () {
  const T = THREE;
  let scene = null, camera = null, rig = null, root = null, spin = 0, t = 0;

  function ensure() {
    if (scene) return;
    scene = new T.Scene();
    scene.background = new T.Color(0x1d1409);

    scene.add(new T.HemisphereLight(0xfff0cf, 0x4a3720, 2.4));
    const key = new T.DirectionalLight(0xffe3b4, 2.2);
    key.position.set(4, 7, 6);
    scene.add(key);
    const rim = new T.DirectionalLight(0xffcf4d, 1.1);
    rim.position.set(-5, 3, -4);
    scene.add(rim);

    // everything sits in one group that gets lifted into the visible band
    root = new T.Group();
    scene.add(root);

    // a bale to stand on
    const plinth = new T.Mesh(
      new T.CylinderGeometry(1.0, 1.15, 0.4, 16),
      new T.MeshLambertMaterial({ color: 0xd9a83c, flatShading: true })
    );
    plinth.position.y = -0.2;
    root.add(plinth);
    const ring = new T.Mesh(
      new T.CylinderGeometry(1.18, 1.18, 0.09, 16),
      new T.MeshLambertMaterial({ color: 0x8a5f1d })
    );
    ring.position.y = -0.38;
    root.add(ring);

    rig = NIAH.player.buildRig();
    root.add(rig.group);

    camera = new T.PerspectiveCamera(30, 1, 0.1, 80);
  }

  function open(look, tier) {
    ensure();
    NIAH.cosmetics.applyLook(rig, look, tier);
    rig.parts.load.visible = false;
    spin = -0.5;
    measure();
  }

  function preview(look, tier) {
    if (!scene) return;
    NIAH.cosmetics.applyLook(rig, look, tier);
    rig.parts.load.visible = false;
    measure();
  }

  function update(dt) {
    if (!rig) return;
    t += dt;
    spin += dt * 0.55;
    rig.group.rotation.y = spin;
    rig.parts.hips.position.y = 0.95 + Math.sin(t * 1.6) * 0.025;
    rig.parts.armL.rotation.x = Math.sin(t * 1.6) * 0.06;
    rig.parts.head.rotation.y = Math.sin(t * 0.7) * 0.18;

    camera.aspect = NIAH.world.camera.aspect;
    frame();
  }

  /* The camera stays level — tilting it crops tall hats and fans the
     perspective. Instead the figure is measured, then scaled (by distance) and
     lifted to sit centred in whatever band the header and item panel leave. */
  const CAM_Y = 1.25;
  let modelBox = { min: -0.4, max: 3.3 };

  function measure() {
    if (!root) return;
    const keepY = root.position.y;
    root.position.y = 0;
    root.updateMatrixWorld(true);
    const box = new T.Box3().setFromObject(root);
    modelBox = { min: box.min.y, max: box.max.y };
    root.position.y = keepY;
  }

  function frame() {
    const canvas = NIAH.world.canvasHeight;
    const panel = document.querySelector('.wardrobe-panel');
    const header = document.querySelector('.wardrobe-top');
    if (!canvas || !panel || !header) return;
    const top = Math.min(0.35, (header.getBoundingClientRect().bottom + 10) / canvas);
    const bottom = Math.max(top + 0.2, (panel.getBoundingClientRect().top - 10) / canvas);

    const h = Math.max(0.5, modelBox.max - modelBox.min);
    const band = bottom - top;
    const targetFrac = Math.min(band * 0.92, 0.55);          // how much of the
    const span = h / targetFrac;                             // canvas the figure fills
    const dist = span / (2 * Math.tan((camera.fov * Math.PI) / 360));
    camera.position.set(0, CAM_Y, Math.max(6, dist));
    camera.lookAt(0, CAM_Y, 0);
    camera.updateProjectionMatrix();

    const centreFrac = (top + bottom) / 2;
    const worldTop = CAM_Y + span / 2;
    const wantCentre = worldTop - centreFrac * span;
    root.position.y = wantCentre - (modelBox.min + h / 2);
  }

  function render() {
    if (scene && camera) NIAH.world.renderTo(scene, camera);
  }

  // exposed so the framing can be checked from a test
  return { open, preview, update, render, get __camera() { return camera; }, get __root() { return root; } };
})();
