/* VLAN Quest – 3D engine: renderer, stages, tweens, picking */
(function (VQ) {
  const E = VQ.engine = { keys: {}, ptr: { x: 0, y: 0, nx: 0, ny: 0, down: false } };
  let renderer, canvas, current = null, last = 0, W = 1, H = 1;

  const EASE = {
    lin: (t) => t,
    in: (t) => t * t * t,
    out: (t) => 1 - Math.pow(1 - t, 3),
    io: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    back: (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
    bounce: (t) => { const n = 7.5625, d = 2.75; if (t < 1 / d) return n * t * t; if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75; if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375; return n * (t -= 2.625 / d) * t + 0.984375; },
    elastic: (t) => (t === 0 || t === 1 ? t : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI / 3)) + 1),
  };

  class Stage {
    constructor(o = {}) {
      this.opts = o;
      this.scene = new THREE.Scene();
      const bg = o.bg != null ? o.bg : 0x0a0f1e;
      this.scene.background = new THREE.Color(bg);
      if (o.fog !== false) this.scene.fog = new THREE.Fog(bg, o.fogNear || 30, o.fogFar || 90);
      this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 400);
      this.baseFov = o.fov || 50;
      this.camPos = new THREE.Vector3(0, 8, 14);
      this.camLook = new THREE.Vector3(0, 0, 0);
      this.parallax = o.parallax != null ? o.parallax : 0.5;
      this.shake = 0;
      this.time = 0; this.paused = false; this.alive = true;
      this.tweens = []; this.waits = []; this.updaters = []; this.pickables = [];
      this.hover = null;
      this.insetBottom = 0; this.insetTop = 0; this.insetLeft = 0;
      if (o.lights !== false) this.lights();
    }
    lights() {
      this.scene.add(new THREE.HemisphereLight(0xcfe3ff, 0x231a3d, 0.95));
      const d = new THREE.DirectionalLight(0xffffff, 0.85); d.position.set(6, 14, 9); this.scene.add(d);
      const p = new THREE.PointLight(0x22d3ee, 0.6, 40); p.position.set(-8, 6, 4); this.scene.add(p);
    }
    add(o) { this.scene.add(o); return o; }
    remove(o) { this.scene.remove(o); }
    onUpdate(fn) { this.updaters.push(fn); return fn; }
    offUpdate(fn) { this.updaters = this.updaters.filter((f) => f !== fn); }

    // ----- camera -----
    setCam(pos, look) { this.camPos.set(...pos); this.camLook.set(...look); }
    camTo(pos, look, dur = 1.1, ease = 'io') {
      const a = this.tween(this.camPos, { x: pos[0], y: pos[1], z: pos[2] }, dur, { ease });
      this.tween(this.camLook, { x: look[0], y: look[1], z: look[2] }, dur, { ease });
      return a;
    }

    // ----- tweens & timers (die with the stage) -----
    tween(obj, to, dur = 0.5, o = {}) {
      return new Promise((res) => {
        this.tweens.push({ obj, to, dur: Math.max(0.0001, dur), t: -(o.delay || 0), ease: EASE[o.ease || 'io'], from: null, res, onUpdate: o.onUpdate });
      });
    }
    kill(obj) { this.tweens = this.tweens.filter((t) => t.obj !== obj); }
    tweenColor(color, hex, dur = 0.4) {
      const c = new THREE.Color(hex), f = color.clone();
      return this.tween({ p: 0 }, { p: 1 }, dur, { ease: 'lin', onUpdate: (p) => color.copy(f).lerp(c, p) });
    }
    wait(sec) { return new Promise((res) => this.waits.push({ t: sec, res })); }

    // ----- picking -----
    pickable(obj, onClick, o = {}) {
      obj.userData.onClick = onClick; obj.userData.pickOpts = o;
      if (!this.pickables.includes(obj)) this.pickables.push(obj);
      return obj;
    }
    unpickable(obj) { this.pickables = this.pickables.filter((p) => p !== obj); if (obj.userData) obj.userData.onClick = null; }
    clearPickables() { this.pickables.forEach((p) => { if (p.userData) p.userData.onClick = null; }); this.pickables = []; }
    rayHit(cx, cy) {
      const r = canvas.getBoundingClientRect();
      const v = new THREE.Vector2(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
      const ray = new THREE.Raycaster(); ray.setFromCamera(v, this.camera);
      // keep view offset in mind – Raycaster.setFromCamera uses the projection matrix, which already includes it
      const hits = ray.intersectObjects(this.pickables.filter((p) => p.visible), true);
      for (const h of hits) {
        let o = h.object;
        while (o) { if (o.userData && o.userData.onClick) return { obj: o, point: h.point, hit: h }; o = o.parent; }
      }
      return null;
    }
    ground(cx, cy, y = 0) {
      const r = canvas.getBoundingClientRect();
      const v = new THREE.Vector2(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
      const ray = new THREE.Raycaster(); ray.setFromCamera(v, this.camera);
      const pl = new THREE.Plane(new THREE.Vector3(0, 1, 0), -y), out = new THREE.Vector3();
      return ray.ray.intersectPlane(pl, out) ? out : null;
    }
    project(v3) {
      const v = v3.clone().project(this.camera), r = canvas.getBoundingClientRect();
      return { x: r.left + (v.x * 0.5 + 0.5) * r.width, y: r.top + (-v.y * 0.5 + 0.5) * r.height };
    }

    // ----- frame -----
    update(dt) {
      if (this.paused) return;
      this.time += dt;
      for (let i = this.tweens.length - 1; i >= 0; i--) {
        const tw = this.tweens[i];
        tw.t += dt;
        if (tw.t < 0) continue;
        if (!tw.from) { tw.from = {}; for (const k in tw.to) tw.from[k] = tw.obj[k]; }
        const p = Math.min(1, tw.t / tw.dur), e = tw.ease(p);
        for (const k in tw.to) tw.obj[k] = tw.from[k] + (tw.to[k] - tw.from[k]) * e;
        if (tw.onUpdate) tw.onUpdate(e);
        if (p >= 1) { this.tweens.splice(i, 1); tw.res(); }
      }
      for (let i = this.waits.length - 1; i >= 0; i--) {
        const w = this.waits[i]; w.t -= dt;
        if (w.t <= 0) { this.waits.splice(i, 1); w.res(); }
      }
      for (const fn of this.updaters.slice()) fn(dt, this.time);
      this.shake = Math.max(0, this.shake - dt * 2);
    }
    applyCamera() {
      const c = this.camera, px = E.ptr.nx * this.parallax, py = E.ptr.ny * this.parallax * 0.6;
      c.position.copy(this.camPos);
      c.position.x += px; c.position.y += py;
      if (this.shake > 0) { c.position.x += (Math.random() - 0.5) * this.shake * 0.5; c.position.y += (Math.random() - 0.5) * this.shake * 0.5; }
      c.lookAt(this.camLook);
    }
    resize(w, h) {
      const a = w / h, c = this.camera;
      c.aspect = a;
      // keep the horizontal field of view usable on portrait / narrow screens
      const ref = 1.55;
      c.fov = a >= ref || this.opts.noWiden ? this.baseFov : Math.min(100, (2 * Math.atan(Math.tan((this.baseFov * Math.PI) / 360) * ref / a) * 180) / Math.PI);
      const shift = (this.insetBottom - this.insetTop) / 2, sx = -(this.insetLeft || 0) / 2;
      if (shift || sx) c.setViewOffset(w, h, sx, shift, w, h); else c.clearViewOffset();
      c.updateProjectionMatrix();
    }
    setInset(bottom, top = 0, left = 0) { this.insetBottom = bottom; this.insetTop = top; this.insetLeft = left; this.resize(W, H); }

    dispose() {
      this.alive = false;
      this.scene.traverse((o) => {
        if (o.geometry && !o.geometry.userData.shared) o.geometry.dispose();
        const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
        ms.forEach((m) => { if (!m.userData.shared) { if (m.map && !m.map.userData.shared) m.map.dispose(); m.dispose(); } });
      });
      this.tweens = []; this.waits = []; this.updaters = []; this.pickables = [];
    }
  }
  VQ.Stage = Stage;

  E.init = function (cv) {
    canvas = cv;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    } catch (e) { return false; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    window.addEventListener('resize', E.resize);
    E.resize();

    let sx = 0, sy = 0, st = 0, moved = 0;
    canvas.addEventListener('pointerdown', (e) => {
      VQ.sfx.unlock();
      E.ptr.down = true; sx = e.clientX; sy = e.clientY; st = performance.now(); moved = 0;
      if (current && current.onPointerDown) current.onPointerDown(e);
    });
    window.addEventListener('pointermove', (e) => {
      const r = canvas.getBoundingClientRect();
      E.ptr.x = e.clientX; E.ptr.y = e.clientY;
      E.ptr.nx = ((e.clientX - r.left) / r.width) * 2 - 1; E.ptr.ny = -(((e.clientY - r.top) / r.height) * 2 - 1);
      if (E.ptr.down) moved = Math.max(moved, Math.hypot(e.clientX - sx, e.clientY - sy));
      if (current && current.onPointerMove) current.onPointerMove(e);
      if (current && e.target === canvas && !E.ptr.down) {
        const h = current.rayHit(e.clientX, e.clientY);
        const o = h ? h.obj : null;
        if (o !== current.hover) {
          if (current.hover && current.hover.userData.pickOpts && current.hover.userData.pickOpts.onHover) current.hover.userData.pickOpts.onHover(false);
          current.hover = o;
          if (o && o.userData.pickOpts && o.userData.pickOpts.onHover) o.userData.pickOpts.onHover(true);
          canvas.style.cursor = o ? 'pointer' : 'default';
        }
      }
    });
    window.addEventListener('pointerup', (e) => {
      const wasDown = E.ptr.down; E.ptr.down = false;
      if (current && current.onPointerUp) current.onPointerUp(e);
      if (wasDown && e.target === canvas && moved < 10 && performance.now() - st < 700 && current) {
        const h = current.rayHit(e.clientX, e.clientY);
        if (h) { h.obj.userData.onClick(h); }
        else if (current.onTap) current.onTap(e);
      }
    });
    window.addEventListener('keydown', (e) => {
      if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
      E.keys[e.code] = true;
      if (current && current.onKey) current.onKey(e);
    });
    window.addEventListener('keyup', (e) => { E.keys[e.code] = false; if (current && current.onKeyUp) current.onKeyUp(e); });
    window.addEventListener('blur', () => { E.keys = {}; });
    requestAnimationFrame(loop);
    return true;
  };

  E.resize = function () {
    W = window.innerWidth; H = window.innerHeight;
    renderer.setSize(W, H, false);
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    if (current) current.resize(W, H);
  };

  E.setStage = function (stage) {
    if (current && current !== stage) current.dispose();
    current = stage;
    if (stage) { stage.resize(W, H); canvas.style.cursor = 'default'; }
    return stage;
  };
  E.stage = () => current;
  E.size = () => ({ W, H });

  function loop(t) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, (t - last) / 1000 || 0.016); last = t;
    if (!current) return;
    current.update(dt);
    current.applyCamera();
    renderer.render(current.scene, current.camera);
  }
})(window.VQ);
