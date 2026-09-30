/* VLAN Quest – procedural 3D models (no external assets) */
(function (VQ) {
  const M = VQ.M = {};
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  M.V3 = V3;

  // ---------- materials ----------
  const matCache = {};
  M.mat = function (color, o = {}) {
    const key = color + '|' + (o.e || 0) + '|' + (o.ei || 0) + '|' + (o.m || 0) + '|' + (o.r == null ? 0.55 : o.r) + '|' + (o.o == null ? 1 : o.o) + '|' + (o.side || 0);
    if (matCache[key]) return matCache[key];
    const m = new THREE.MeshStandardMaterial({
      color, roughness: o.r == null ? 0.55 : o.r, metalness: o.m || 0.15,
      emissive: o.e != null ? o.e : 0x000000, emissiveIntensity: o.ei != null ? o.ei : (o.e != null ? 1 : 0),
      transparent: o.o != null && o.o < 1, opacity: o.o == null ? 1 : o.o, side: o.side || THREE.FrontSide,
    });
    m.userData.shared = true;
    return (matCache[key] = m);
  };
  // unique (non-cached) material – for meshes whose colour changes at runtime
  M.mat2 = (color, o = {}) => { const m = M.mat(color, o).clone(); m.userData.shared = false; return m; };
  M.glowMat = (color, o = 1) => new THREE.MeshBasicMaterial({ color, transparent: o < 1, opacity: o });

  M.box = function (w, h, d, color, o) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M.mat(color, o));
    return m;
  };
  M.cyl = function (rt, rb, h, color, o, seg = 24) { return new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), M.mat(color, o)); };
  M.sph = function (r, color, o, seg = 20) { return new THREE.Mesh(new THREE.SphereGeometry(r, seg, seg), M.mat(color, o)); };
  const at = (o, x, y, z) => { o.position.set(x, y, z); return o; };

  // ---------- text label sprites ----------
  M.label = function (text, o = {}) {
    const cv = document.createElement('canvas'), ctx = cv.getContext('2d');
    const tex = new THREE.CanvasTexture(cv); tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false;
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: !o.onTop, depthWrite: false });
    const sp = new THREE.Sprite(mat);
    const px = o.px || 54;
    sp.userData.set = function (t, over) {
      const oo = Object.assign({}, o, over || {});
      const lines = String(t).split('\n'), font = (oo.weight || '800') + ' ' + px + 'px Heebo, Segoe UI, Arial, sans-serif';
      ctx.font = font;
      const wmax = Math.max(...lines.map((l) => ctx.measureText(l).width)), pad = oo.bg ? px * 0.45 : px * 0.15;
      const lh = px * 1.25;
      cv.width = Math.ceil(wmax + pad * 2); cv.height = Math.ceil(lh * lines.length + pad * 2);
      ctx.font = font; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      if (oo.bg) {
        ctx.fillStyle = oo.bg; ctx.beginPath();
        const r = px * 0.5; ctx.moveTo(r, 0); ctx.arcTo(cv.width, 0, cv.width, cv.height, r); ctx.arcTo(cv.width, cv.height, 0, cv.height, r); ctx.arcTo(0, cv.height, 0, 0, r); ctx.arcTo(0, 0, cv.width, 0, r); ctx.fill();
        if (oo.border) { ctx.lineWidth = 4; ctx.strokeStyle = oo.border; ctx.stroke(); }
      }
      ctx.fillStyle = oo.color || '#fff';
      if (!oo.bg) { ctx.shadowColor = 'rgba(0,0,0,.85)'; ctx.shadowBlur = 8; }
      lines.forEach((l, i) => { ctx.direction = VQ.hasHeb(l) ? 'rtl' : 'ltr'; ctx.fillText(l, cv.width / 2, pad + lh * (i + 0.5)); });
      tex.dispose(); tex.needsUpdate = true;
      const s = (oo.size || 0.5) / lh;
      sp.scale.set(cv.width * s, cv.height * s, 1);
    };
    sp.userData.set(text);
    sp.renderOrder = o.onTop ? 20 : 5;
    return sp;
  };

  const glowTexCache = {};
  M.glow = function (color, size = 1.5, op = 0.9) {
    const k = color;
    if (!glowTexCache[k]) {
      const cv = document.createElement('canvas'); cv.width = cv.height = 64;
      const c = cv.getContext('2d'), g = c.createRadialGradient(32, 32, 0, 32, 32, 32), col = new THREE.Color(color);
      const rgb = `${Math.round(col.r * 255)},${Math.round(col.g * 255)},${Math.round(col.b * 255)}`;
      g.addColorStop(0, `rgba(${rgb},1)`); g.addColorStop(0.4, `rgba(${rgb},.35)`); g.addColorStop(1, `rgba(${rgb},0)`);
      c.fillStyle = g; c.fillRect(0, 0, 64, 64);
      const t = new THREE.CanvasTexture(cv); t.userData.shared = true; glowTexCache[k] = t;
    }
    const m = new THREE.SpriteMaterial({ map: glowTexCache[k], transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: op });
    const s = new THREE.Sprite(m); s.scale.set(size, size, 1); return s;
  };

  // ---------- devices ----------
  function brickTex() {
    const cv = document.createElement('canvas'); cv.width = 128; cv.height = 128;
    const c = cv.getContext('2d'); c.fillStyle = '#7f1d1d'; c.fillRect(0, 0, 128, 128);
    c.strokeStyle = '#fca5a5'; c.lineWidth = 3;
    for (let y = 0; y < 4; y++) { c.strokeRect(-2, y * 32, 132, 32); for (let x = (y % 2) * 32; x < 128; x += 64) { c.beginPath(); c.moveTo(x, y * 32); c.lineTo(x, y * 32 + 32); c.stroke(); } }
    const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 1); return t;
  }
  function arrows(g, y, r, color) {
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2, c = M.cyl(0, r * 0.35, r * 0.7, color, { e: color, ei: 0.4 }, 4);
      c.position.set(Math.cos(a) * r * 0.9, y, Math.sin(a) * r * 0.9); c.rotation.z = -Math.cos(a) * Math.PI / 2; c.rotation.x = Math.sin(a) * Math.PI / 2;
      c.scale.set(0.5, 0.55, 0.5); g.add(c);
    }
  }
  const D = {};
  D.pc = (o) => {
    const g = new THREE.Group();
    g.add(at(M.box(0.55, 0.05, 0.4, 0x1e293b), 0, 0.03, 0));
    g.add(at(M.box(0.09, 0.3, 0.09, 0x334155), 0, 0.2, -0.02));
    g.add(at(M.box(1.0, 0.65, 0.07, 0x111827), 0, 0.68, 0));
    const sc = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.55), M.mat2(o.screen || 0x0ea5e9, { e: o.screen || 0x0ea5e9, ei: 0.5 }));
    sc.position.set(0, 0.68, 0.04); g.add(sc); g.screen = sc;
    g.add(at(M.box(0.75, 0.04, 0.26, 0x475569), 0, 0.03, 0.5));
    g.userData.r = 0.75; g.userData.h = 1.05; g.userData.faceZ = 0.9;
    return g;
  };
  D.laptop = (o) => {
    const g = new THREE.Group();
    g.add(at(M.box(0.9, 0.05, 0.62, 0x475569), 0, 0.03, 0.15));
    const s = at(M.box(0.9, 0.58, 0.04, 0x111827), 0, 0.33, -0.15); s.rotation.x = -0.25; g.add(s);
    const sc = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.48), M.mat2(o.screen || 0x0ea5e9, { e: o.screen || 0x0ea5e9, ei: 0.5 }));
    sc.position.set(0, 0.33, -0.125); sc.rotation.x = -0.25; g.add(sc); g.screen = sc;
    g.userData.r = 0.6; g.userData.h = 0.6;
    return g;
  };
  D.server = (o) => {
    const g = new THREE.Group();
    g.add(at(M.box(0.8, 1.55, 0.95, 0x1f2937), 0, 0.78, 0));
    for (let i = 0; i < 5; i++) {
      g.add(at(M.box(0.66, 0.16, 0.02, 0x0f172a), 0, 0.3 + i * 0.27, 0.49));
      const l = at(M.box(0.06, 0.06, 0.02, o.led || 0x4ade80, { e: o.led || 0x4ade80, ei: 1 }), 0.25, 0.3 + i * 0.27, 0.5); g.add(l);
    }
    g.userData.r = 0.62; g.userData.h = 1.5;
    return g;
  };
  D.hypervisor = (o) => {
    const g = D.server(o);
    [0x38bdf8, 0x4ade80, 0xfb923c].forEach((c, i) => g.add(at(M.box(0.32, 0.32, 0.32, c, { e: c, ei: 0.5 }), -0.35 + i * 0.35, 1.75, 0)));
    g.userData.h = 1.95; return g;
  };
  D.switch = (o) => {
    const n = o.ports || 8, w = Math.max(1.8, n * (o.pitch || 0.3) + 0.5), g = new THREE.Group();
    const body = o.color || 0x0e7490;
    g.add(at(M.box(w, 0.36, 0.9, body, { m: 0.4 }), 0, 0.2, 0));
    g.add(at(M.box(w - 0.1, 0.2, 0.02, 0x0b1220), 0, 0.2, 0.46));
    g.ports = []; g.leds = [];
    const sx = (w - 0.5) / Math.max(1, n - 1);
    for (let i = 0; i < n; i++) {
      const x = n === 1 ? 0 : -(w - 0.5) / 2 + i * sx;
      g.add(at(M.box(0.16, 0.12, 0.03, 0x000000), x, 0.17, 0.47));
      const led = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.04, 0.03), M.mat2(0x334155, { e: 0x334155, ei: 0.4 }));
      led.position.set(x, 0.29, 0.47); g.add(led); g.leds.push(led); g.ports.push(V3(x, 0.19, 0.5));
    }
    g.setPort = (i, hex, on = true) => { const l = g.leds[i]; if (!l) return; l.material.color.setHex(hex); l.material.emissive.setHex(hex); l.material.emissiveIntensity = on ? 1.2 : 0.15; };
    g.userData.r = w / 2; g.userData.h = 0.4; g.userData.w = w;
    return g;
  };
  D.l3 = (o) => { const g = D.switch(Object.assign({ color: 0x6d28d9 }, o)); arrows(g, 0.5, 0.28, 0xf5d0fe); g.userData.h = 0.6; return g; };
  D.unmanaged = (o) => { const g = D.switch(Object.assign({ color: 0x64748b, ports: 5 }, o)); return g; };
  D.router = (o) => {
    const g = new THREE.Group();
    g.add(at(M.cyl(0.78, 0.82, 0.34, o.color || 0x1d4ed8, { m: 0.4 }), 0, 0.2, 0));
    arrows(g, 0.42, 0.55, 0xffffff);
    g.userData.r = 0.85; g.userData.h = 0.5;
    return g;
  };
  D.ap = (o) => {
    const g = new THREE.Group();
    g.add(at(M.cyl(0.55, 0.6, 0.12, 0xf1f5f9), 0, 0.06, 0));
    g.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.4, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), M.mat(0xe2e8f0)), 0, 0.12, 0));
    g.add(at(M.sph(0.06, 0x4ade80, { e: 0x4ade80, ei: 1 }, 8), 0, 0.5, 0));
    for (let i = 1; i <= 3; i++) {
      const t = new THREE.Mesh(new THREE.TorusGeometry(0.28 * i, 0.025, 6, 24, Math.PI * 0.7), M.mat(0x38bdf8, { e: 0x38bdf8, ei: 0.9 }));
      t.position.set(0, 0.62 + i * 0.05, 0); t.rotation.z = Math.PI * 0.65 - Math.PI * 0.35 + Math.PI * 0.35; t.rotation.x = -Math.PI / 2 + 1.2; g.add(t);
    }
    g.userData.r = 0.6; g.userData.h = 1.1;
    return g;
  };
  D.phone = (o) => {
    const g = new THREE.Group();
    g.add(at(M.box(0.7, 0.14, 0.5, 0x1e293b), 0, 0.08, 0));
    const h = at(M.box(0.75, 0.1, 0.16, 0x0f172a), 0, 0.22, -0.1); h.rotation.z = 0.05; g.add(h);
    g.add(at(M.box(0.3, 0.02, 0.15, 0x22d3ee, { e: 0x22d3ee, ei: 0.8 }), 0.15, 0.16, 0.12));
    for (let i = 0; i < 6; i++) g.add(at(M.box(0.06, 0.03, 0.06, 0x94a3b8), -0.25 + (i % 3) * 0.09, 0.16, 0.06 + Math.floor(i / 3) * 0.09));
    g.userData.r = 0.45; g.userData.h = 0.3;
    return g;
  };
  D.printer = (o) => {
    const g = new THREE.Group();
    g.add(at(M.box(0.95, 0.42, 0.65, 0xe2e8f0), 0, 0.21, 0));
    g.add(at(M.box(0.7, 0.04, 0.35, 0xffffff), 0, 0.45, -0.1));
    g.add(at(M.box(0.6, 0.03, 0.3, 0xffffff), 0, 0.2, 0.42));
    g.add(at(M.box(0.16, 0.02, 0.1, 0x4ade80, { e: 0x4ade80, ei: 1 }), 0.3, 0.43, 0.2));
    g.userData.r = 0.6; g.userData.h = 0.5;
    return g;
  };
  D.cam = (o) => {
    const g = new THREE.Group();
    g.add(at(M.cyl(0.06, 0.06, 0.6, 0x475569), 0, 0.3, 0));
    const c = at(M.cyl(0.2, 0.2, 0.5, 0xe2e8f0), 0, 0.68, 0.1); c.rotation.x = Math.PI / 2; g.add(c);
    g.add(at(M.sph(0.1, 0xef4444, { e: 0xef4444, ei: 1 }, 8), 0, 0.68, 0.38));
    g.userData.r = 0.4; g.userData.h = 0.9;
    return g;
  };
  D.firewall = (o) => {
    const g = new THREE.Group();
    const wall = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1, 0.5), new THREE.MeshStandardMaterial({ map: brickTex(), roughness: 0.8 }));
    wall.position.y = 0.5; g.add(wall);
    const f = at(M.cyl(0, 0.22, 0.55, 0xfb923c, { e: 0xf97316, ei: 1 }, 10), 0, 1.3, 0); g.add(f);
    g.add(at(M.cyl(0, 0.13, 0.4, 0xfde047, { e: 0xfde047, ei: 1 }, 10), 0.05, 1.25, 0.03));
    g.flame = f; g.userData.r = 0.85; g.userData.h = 1.5;
    return g;
  };
  D.hub = (o) => {
    const g = new THREE.Group();
    g.add(at(M.box(1.9, 0.32, 0.8, 0x6b7280), 0, 0.18, 0));
    for (let i = 0; i < 8; i++) g.add(at(M.box(0.14, 0.1, 0.03, 0x000000), -0.75 + i * 0.215, 0.14, 0.41));
    g.add(at(M.box(1.5, 0.05, 0.3, 0x111827), 0, 0.36, 0));
    g.userData.r = 1.0; g.userData.h = 0.4;
    return g;
  };
  D.repeater = (o) => {
    const g = new THREE.Group();
    g.add(at(M.box(0.8, 0.28, 0.5, 0x78716c), 0, 0.15, 0));
    g.add(at(M.cyl(0.03, 0.03, 0.8, 0x1f2937), -0.25, 0.65, 0)); g.add(at(M.cyl(0.03, 0.03, 0.8, 0x1f2937), 0.25, 0.65, 0));
    g.userData.r = 0.5; g.userData.h = 1.0;
    return g;
  };
  D.cloud = (o) => {
    const g = new THREE.Group();
    [[0, 0.5, 0, 0.6], [0.6, 0.35, 0.1, 0.45], [-0.6, 0.35, -0.1, 0.5], [0.2, 0.75, 0.2, 0.45]].forEach((p) => g.add(at(M.sph(p[3], 0xf1f5f9, { r: 0.9 }), p[0], p[1], p[2])));
    g.userData.r = 1.0; g.userData.h = 1.2;
    return g;
  };
  D.tv = (o) => { const g = D.pc(Object.assign({ screen: 0xa78bfa }, o)); return g; };

  M.device = function (type, o = {}) {
    const fn = D[type] || D.pc, g = fn(o);
    g.userData.type = type;
    if (g.userData.r == null) g.userData.r = 0.7;
    return g;
  };

  // ---------- cables ----------
  M.cable = function (a, b, o = {}) {
    const mesh = new THREE.Mesh(new THREE.BufferGeometry(), M.mat2(o.color || 0x94a3b8, { e: o.glow ? (o.color || 0x94a3b8) : undefined, ei: o.glow ? 0.6 : 0, r: 0.4 }));
    mesh.userData.setEnds = function (p, q, sag = o.sag != null ? o.sag : 0.12) {
      const mid = p.clone().add(q).multiplyScalar(0.5); mid.y -= sag * p.distanceTo(q) * 0.3 + sag; mid.z += o.lat || 0;
      const curve = new THREE.QuadraticBezierCurve3(p.clone(), mid, q.clone());
      mesh.geometry.dispose(); mesh.geometry = new THREE.TubeGeometry(curve, 20, o.r || 0.035, 6, false);
      mesh.userData.curve = curve;
    };
    mesh.userData.setEnds(a, b);
    mesh.userData.setColor = (hex, glow) => { mesh.material.color.setHex(hex); mesh.material.emissive.setHex(glow ? hex : 0); mesh.material.emissiveIntensity = glow ? 0.6 : 0; };
    return mesh;
  };

  // ---------- packets / frames ----------
  M.packet = function (o = {}) {
    const g = new THREE.Group(), s = o.size || 0.26;
    const body = new THREE.Mesh(new THREE.BoxGeometry(s * 1.6, s, s), M.mat2(o.color || 0xffffff, { e: o.color || 0xffffff, ei: 0.7 }));
    g.add(body); g.body = body;
    const tag = new THREE.Mesh(new THREE.BoxGeometry(s * 0.7, s * 0.4, s * 1.1), M.mat2(0xffffff, { e: 0xffffff, ei: 1 }));
    tag.position.set(0, s * 0.62, 0); tag.visible = false; g.add(tag); g.tag = tag;
    g.setTag = (hex) => { if (hex == null) { tag.visible = false; return; } tag.visible = true; tag.material.color.setHex(hex); tag.material.emissive.setHex(hex); };
    g.setColor = (hex) => { body.material.color.setHex(hex); body.material.emissive.setHex(hex); };
    const gl = M.glow(o.color || 0xffffff, s * 4, 0.55); g.add(gl); g.glowSprite = gl;
    if (o.tag != null) g.setTag(o.tag);
    return g;
  };

  // ---------- hero avatar ----------
  M.avatar = function (color = 0x38bdf8) {
    const g = new THREE.Group(), suit = M.mat2(color, { r: 0.5 });
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.36, 4, 12), suit); torso.position.y = 0.85; g.add(torso);
    const head = M.sph(0.27, 0xfde2c8, { r: 0.7 }); head.position.y = 1.45; g.add(head);
    const visor = at(M.box(0.36, 0.11, 0.1, 0x0f172a, { e: 0x22d3ee, ei: 0.6 }), 0, 1.47, 0.22); g.add(visor);
    const hat = new THREE.Mesh(new THREE.SphereGeometry(0.31, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), M.mat(0xfbbf24)); hat.position.y = 1.5; g.add(hat);
    g.add(at(M.cyl(0.36, 0.36, 0.04, 0xfbbf24, {}, 20), 0, 1.5, 0.02));
    const pack = at(M.box(0.36, 0.5, 0.18, 0x334155), 0, 0.9, -0.3); g.add(pack);
    const ant = at(M.cyl(0.015, 0.015, 0.4, 0x94a3b8), 0.12, 1.3, -0.3); g.add(ant);
    g.add(at(M.sph(0.05, 0x4ade80, { e: 0x4ade80, ei: 1 }, 8), 0.12, 1.52, -0.3));
    function limb(x, y, len, mat, r = 0.09) { const p = new THREE.Group(); p.position.set(x, y, 0); const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 3, 8), mat); m.position.y = -len / 2 - r * 0.6; p.add(m); g.add(p); return p; }
    const legMat = M.mat(0x1e293b);
    g.legL = limb(-0.13, 0.5, 0.32, legMat, 0.1); g.legR = limb(0.13, 0.5, 0.32, legMat, 0.1);
    g.armL = limb(-0.38, 1.1, 0.34, suit); g.armR = limb(0.38, 1.1, 0.34, suit);
    g.userData.walking = false; g.userData.t = 0; g.userData.cheer = 0;
    g.setColor = (hex) => suit.color.setHex(hex);
    g.tick = function (dt) {
      const u = g.userData; u.t += dt * (u.walking ? 9 : 2);
      const sw = u.walking ? Math.sin(u.t) * 0.7 : 0;
      g.legL.rotation.x = sw; g.legR.rotation.x = -sw;
      if (u.cheer > 0) { u.cheer -= dt; g.armL.rotation.x = g.armR.rotation.x = Math.PI - 0.3 + Math.sin(u.t * 4) * 0.4; g.position.y = Math.abs(Math.sin(u.t * 3)) * 0.18; }
      else { g.armL.rotation.x = -sw * 0.8; g.armR.rotation.x = sw * 0.8; g.position.y = u.walking ? Math.abs(Math.sin(u.t)) * 0.06 : Math.sin(u.t) * 0.02; }
    };
    g.userData.r = 0.5; g.userData.h = 1.8;
    return g;
  };

  // ---------- trophies ----------
  M.medal = function (hex) {
    const g = new THREE.Group();
    const d = M.cyl(0.32, 0.32, 0.07, hex, { m: 0.8, r: 0.25, e: hex, ei: 0.25 }, 24); d.rotation.x = Math.PI / 2; g.add(d);
    const s = M.cyl(0.19, 0.19, 0.085, hex, { m: 0.6, r: 0.4, e: 0xffffff, ei: 0.15 }, 5); s.rotation.x = Math.PI / 2; g.add(s);
    return g;
  };
  M.cup = function (hex = 0xfbbf24) {
    const g = new THREE.Group(), mt = { m: 0.9, r: 0.25, e: hex, ei: 0.3 };
    g.add(at(M.cyl(0.55, 0.3, 0.7, hex, mt), 0, 1.05, 0));
    g.add(at(M.cyl(0.08, 0.08, 0.4, hex, mt), 0, 0.5, 0));
    g.add(at(M.cyl(0.4, 0.45, 0.14, hex, mt), 0, 0.2, 0));
    g.add(at(M.box(0.7, 0.12, 0.7, 0x78350f), 0, 0.06, 0));
    const h1 = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.06, 8, 16), M.mat(hex, mt)); h1.position.set(-0.6, 1.1, 0); g.add(h1);
    const h2 = h1.clone(); h2.position.x = 0.6; g.add(h2);
    return g;
  };

  // ---------- environment ----------
  M.grid = function (stage, size = 80, color = 0x1e3a5f, y = -0.02) {
    const gr = new THREE.GridHelper(size, size, color, color); gr.position.y = y; gr.material.transparent = true; gr.material.opacity = 0.5; stage.add(gr);
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(size, size), M.mat(0x0b1226, { r: 1, m: 0 })); pl.rotation.x = -Math.PI / 2; pl.position.y = y - 0.01; stage.add(pl);
    return gr;
  };
  M.stars = function (stage, n = 500, r = 90) {
    const p = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, b = Math.acos(2 * Math.random() - 1), rr = r * (0.6 + Math.random() * 0.4); p[i * 3] = Math.sin(b) * Math.cos(a) * rr; p[i * 3 + 1] = Math.abs(Math.cos(b)) * rr * 0.7 + 8; p[i * 3 + 2] = Math.sin(b) * Math.sin(a) * rr; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    const pts = new THREE.Points(g, new THREE.PointsMaterial({ color: 0x9fb8ff, size: 0.35, transparent: true, opacity: 0.8, sizeAttenuation: true }));
    stage.add(pts); return pts;
  };
  M.platform = function (w, d, hex = 0x1e293b, edge = 0x22d3ee, h = 0.3) {
    const g = new THREE.Group();
    const b = M.box(w, h, d, hex, { r: 0.7 }); b.position.y = -h / 2; g.add(b);
    const e = new THREE.LineSegments(new THREE.EdgesGeometry(b.geometry), new THREE.LineBasicMaterial({ color: edge })); e.position.copy(b.position); g.add(e);
    return g;
  };
  M.zone = function (w, d, hex, op = 0.22) {  // translucent coloured floor patch
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ color: hex, transparent: true, opacity: op, depthWrite: false, side: THREE.DoubleSide }));
    m.rotation.x = -Math.PI / 2; m.position.y = 0.01; return m;
  };

  // ---------- fx ----------
  const fx = VQ.fx = {};
  fx.burst = function (stage, pos, hex = 0xffffff, n = 16, speed = 3, size = 0.16) {
    const p = new Float32Array(n * 3), vel = [];
    for (let i = 0; i < n; i++) { p[i * 3] = pos.x; p[i * 3 + 1] = pos.y; p[i * 3 + 2] = pos.z; const a = Math.random() * 6.283, b = Math.random() * Math.PI - Math.PI / 2, s = speed * (0.4 + Math.random()); vel.push(V3(Math.cos(a) * Math.cos(b) * s, Math.sin(b) * s + speed * 0.4, Math.sin(a) * Math.cos(b) * s)); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    const m = new THREE.PointsMaterial({ color: hex, size, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false });
    const pts = new THREE.Points(g, m); stage.add(pts);
    let life = 0;
    const fn = (dt) => {
      life += dt; const a = g.attributes.position.array;
      for (let i = 0; i < n; i++) { vel[i].y -= 6 * dt; a[i * 3] += vel[i].x * dt; a[i * 3 + 1] += vel[i].y * dt; a[i * 3 + 2] += vel[i].z * dt; }
      g.attributes.position.needsUpdate = true; m.opacity = Math.max(0, 1 - life / 0.9);
      if (life > 0.9) { stage.offUpdate(fn); stage.remove(pts); g.dispose(); m.dispose(); }
    };
    stage.onUpdate(fn);
  };
  fx.ring = function (stage, pos, hex = 0x22d3ee, r = 1.4, dur = 0.7) {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 32), new THREE.MeshBasicMaterial({ color: hex, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.copy(pos); m.scale.setScalar(0.1); stage.add(m);
    stage.tween(m.scale, { x: r, y: r, z: r }, dur, { ease: 'out' });
    stage.tween(m.material, { opacity: 0 }, dur, { ease: 'lin' }).then(() => { stage.remove(m); m.geometry.dispose(); m.material.dispose(); });
  };
  fx.float = function (stage, pos, text, color = '#fff', size = 0.5) {
    const l = M.label(text, { color, size, onTop: true }); l.position.copy(pos); stage.add(l);
    stage.tween(l.position, { y: pos.y + 1.4 }, 1.1, { ease: 'out' });
    stage.tween(l.material, { opacity: 0 }, 1.1, { ease: 'in' }).then(() => { stage.remove(l); l.material.map.dispose(); l.material.dispose(); });
    return l;
  };
  fx.confetti = function (stage, center, n = 60) {
    const cols = [0x38bdf8, 0x4ade80, 0xfbbf24, 0xf472b6, 0xc084fc, 0xfb923c];
    for (let i = 0; i < n; i++) {
      const c = cols[i % cols.length];
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 0.2), new THREE.MeshBasicMaterial({ color: c }));
      m.position.set(center.x + VQ.rand(-1, 1), center.y + VQ.rand(0, 1), center.z + VQ.rand(-1, 1)); stage.add(m);
      const v = V3(VQ.rand(-4, 4), VQ.rand(4, 9), VQ.rand(-4, 4)), rot = V3(VQ.rand(-8, 8), VQ.rand(-8, 8), VQ.rand(-8, 8));
      let life = 0;
      const fn = (dt) => { life += dt; v.y -= 12 * dt; m.position.addScaledVector(v, dt); m.rotation.x += rot.x * dt; m.rotation.y += rot.y * dt; if (life > 2.6 || m.position.y < -3) { stage.offUpdate(fn); stage.remove(m); m.geometry.dispose(); m.material.dispose(); } };
      stage.onUpdate(fn);
    }
  };
})(window.VQ);
