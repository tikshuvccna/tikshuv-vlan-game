/* Game 1 – Broadcast Storm (chapter: flat network). Zap broadcast packets before they hit every PC. */
(function (VQ) {
  const M = VQ.M, V3 = M.V3;
  VQ.game({
    id: 'storm', chapter: 'flat', title: 'סערת השידורים',
    tagline: 'הרשת השטוחה קורסת! כל Broadcast מתרבה לכל המחשבים. עצרו את הסערה לפני שהמחשבים קורסים.',
    howto: [
      '**לחצו/הקישו על חבילות אדומות** כדי להשמיד אותן. חבילה "שורש" (גדולה) שיוצאת ממחשב היא הכי חשובה — אם תפילו אותה לפני שהיא מגיעה למתג, היא לא תתרבה!',
      'כל חבילה שמגיעה למחשב מעמיסה עליו (פס ה-CPU). מחשב ב-100% קורס ואתם מאבדים חיים.',
      'אספו את **⚡ VLAN** שצף על הרצפה: הוא מחלק את הרשת ל-3 קבוצות צבעוניות. ה-Broadcast **לא נעלם** – אבל המתג מעביר אותו רק לפורטים באותו VLAN, וההעתקים לקבוצות האחרות נחסמים על הגבול (✖). התוצאה: פי 3 פחות חבילות לכל מחשב.',
    ],
    stage: { bg: 0x070c1a, fogNear: 40, fogFar: 100 },
    levels: {
      easy: { dur: 45, n: 8, lives: 6, spawn: [2.8, 1.7], load: 5, decay: 9, shield: 8, shieldEvery: 12, speed: 4.2, stars: [350, 750, 1100] },
      mid: { dur: 60, n: 10, lives: 4, spawn: [2.0, 1.0], load: 8, decay: 5.5, shield: 7, shieldEvery: 15, speed: 5.2, stars: [1100, 2400, 3600] },
      hard: { dur: 75, n: 12, lives: 3, spawn: [1.3, 0.55], load: 11, decay: 4, shield: 6, shieldEvery: 18, speed: 6.2, stars: [2800, 6000, 9500] },
    },
    create(G) {
      const st = G.stage, cfg = G.cfg, R = 6.3;
      M.grid(st, 60, 0x16305a); M.stars(st, 300, 80);
      st.setCam([0, 15, 10.5], [0, 0, 0.6]);
      // arena
      const arena = M.cyl(8.3, 8.6, 0.3, 0x0e1730, { r: 0.7 }, 48); arena.position.y = -0.2; st.add(arena);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(8.4, 0.08, 8, 64), M.mat(0x22d3ee, { e: 0x22d3ee, ei: 1 })); ring.rotation.x = Math.PI / 2; ring.position.y = 0; st.add(ring);
      const sw = M.device('switch', { ports: 4, pitch: 0.5 }); sw.scale.set(1.5, 1.5, 1.5); st.add(sw);
      const swLabel = M.label('SWITCH', { size: 0.5, bg: 'rgba(8,13,28,.85)' }); swLabel.position.set(0, 1.5, 0); st.add(swLabel);
      const zones = [], walls = []; // coloured floor sectors + VLAN boundary walls (only while the VLAN split is active)
      const firstOf = (k) => Math.ceil((k * cfg.n) / 3), bound = (k) => Math.PI / 2 + (firstOf(k) - 0.5) * ((2 * Math.PI) / cfg.n);
      for (let g = 0; g < 3; g++) {
        const a0 = bound(g), a1 = g === 2 ? bound(3) : bound(g + 1);
        const m = new THREE.Mesh(new THREE.CircleGeometry(8.2, 32, a0, a1 - a0), new THREE.MeshBasicMaterial({ color: VQ.vhex([10, 20, 30][g]), transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
        m.rotation.x = Math.PI / 2; m.position.y = 0.03; st.add(m); zones.push(m);
        const w = M.box(8.2, 1.6, 0.14, 0xfde047, { e: 0xfacc15, ei: 0.9, o: 0.55 }); w.position.set(Math.cos(a0) * 4.1, 0.8, Math.sin(a0) * 4.1); w.rotation.y = -a0; w.scale.y = 0.01; w.visible = false; st.add(w); walls.push(w);
      }
      // PCs on a ring
      const N = cfg.n, pcs = [];
      for (let i = 0; i < N; i++) {
        const a = (i / N) * Math.PI * 2 + Math.PI / 2, g = Math.floor((i / N) * 3);
        const pc = M.device(i % 4 === 3 ? 'laptop' : 'pc', { screen: 0x64748b }); pc.scale.setScalar(1.3);
        pc.position.set(Math.cos(a) * R, 0, Math.sin(a) * R); pc.rotation.y = Math.atan2(-Math.cos(a), -Math.sin(a)) + 0; pc.lookAt(0, 0, 0); pc.rotateY(0);
        st.add(pc);
        const bg = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0x0f172a, depthTest: false })), fill = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0x4ade80, depthTest: false }));
        bg.scale.set(1.5, 0.24, 1); fill.scale.set(0.01, 0.16, 1); bg.renderOrder = 10; fill.renderOrder = 11;
        bg.position.set(pc.position.x, 2.4, pc.position.z); fill.position.copy(bg.position); st.add(bg); st.add(fill);
        pcs.push({ i, obj: pc, pos: pc.position.clone(), cpu: 0, dead: 0, group: g, bar: fill, bg, smoke: null });
      }
      const packets = []; let spawnT = 1.5, shieldT = cfg.shieldEvery * 0.55, shieldActive = 0, pickup = null;
      const stats = { roots: 0, copies: 0, crashes: 0, shields: 0, missedRoots: 0, blocked: 0 };
      G.ctl = {};
      function colorPcs(on) {
        pcs.forEach((p) => { const c = on ? VQ.vhex([10, 20, 30][p.group]) : 0x64748b; p.obj.screen.material.color.setHex(c); p.obj.screen.material.emissive.setHex(c); });
        zones.forEach((z) => st.tween(z.material, { opacity: on ? 0.2 : 0 }, 0.5));
        walls.forEach((w) => { if (on) w.visible = true; st.tween(w.scale, { y: on ? 1 : 0.01 }, 0.5, { ease: 'back' }).then(() => { if (!on) w.visible = false; }); });
      }
      function mkPacket(from, to, kind, src) {
        const big = kind === 'root';
        const g = new THREE.Group(); const core = M.sph(big ? 0.42 : 0.26, big ? 0xff4d4d : 0xfb7185, { e: 0xff2222, ei: 0.9 }, 12); g.add(core);
        const gl = M.glow(0xff3b3b, big ? 2.6 : 1.5, 0.8); g.add(gl);
        const hit = new THREE.Mesh(new THREE.SphereGeometry(big ? 0.95 : 0.8, 8, 8), new THREE.MeshBasicMaterial({ visible: false })); g.add(hit);
        g.position.copy(from); st.add(g);
        const p = { g, from: from.clone(), to: to.clone(), t: 0, dur: from.distanceTo(to) / cfg.speed, kind, src, dead: false, dst: null };
        st.pickable(g, () => zap(p), { onHover: () => {} });
        packets.push(p); return p;
      }
      function destroy(p) { p.dead = true; st.unpickable(p.g); st.remove(p.g); }
      function zap(p) {
        if (p.dead || G.ended) return;
        VQ.fx.burst(st, p.g.position.clone().add(V3(0, 0.3, 0)), 0xfde047, 14, 3); VQ.sfx.play('zap');
        if (p.kind === 'root') { stats.roots++; G.hit(50, p.g.position.clone().add(V3(0, 1, 0))); if (p.src) p.src.obj.userData.flash = 0; }
        else { stats.copies++; G.hit(10, p.g.position.clone().add(V3(0, 1, 0))); }
        destroy(p);
      }
      function emit() {
        const alive = pcs.filter((p) => !p.dead);
        if (!alive.length) return;
        const src = VQ.pick(alive);
        VQ.fx.float(st, src.pos.clone().add(V3(0, 3, 0)), '📢 Broadcast', '#fca5a5', 0.45);
        mkPacket(src.pos.clone().add(V3(0, 0.6, 0)), V3(0, 0.6, 0), 'root', src);
      }
      function arriveRoot(p) {
        stats.missedRoots++; VQ.fx.ring(st, V3(0, 0.1, 0), 0xff4d4d, 2.2, 0.5);
        pcs.forEach((d) => {
          if (d === p.src) return;
          if (shieldActive > 0 && d.group !== p.src.group) { blockedCopy(d); return; }
          const c = mkPacket(V3(0, 0.6, 0), d.pos.clone().add(V3(0, 0.6, 0)), 'copy', p.src); c.dst = d;
        });
        destroy(p);
      }
      // with VLANs the copy is still generated, but the switch drops it at the VLAN boundary
      function blockedCopy(d) {
        const from = V3(0, 0.6, 0), to = d.pos.clone().multiplyScalar(0.28).setY(0.6);
        const g = new THREE.Group(); g.add(M.sph(0.22, 0x94a3b8, { e: 0x64748b, ei: 0.5 }, 8)); g.position.copy(from); st.add(g);
        st.tween(g.position, { x: to.x, y: to.y, z: to.z }, 0.45, { ease: 'out' }).then(() => { VQ.fx.burst(st, to.clone(), 0x94a3b8, 8, 2, 0.12); VQ.fx.float(st, to.clone().add(V3(0, 0.8, 0)), '✖', '#cbd5e1', 0.5); st.remove(g); });
        stats.blocked++;
      }
      function hitPc(d) {
        if (d.dead > 0) return;
        d.cpu += cfg.load;
        d.obj.position.y = 0.15; st.tween(d.obj.position, { y: 0 }, 0.2);
        if (d.cpu >= 100) {
          d.cpu = 100; d.dead = 4.2; stats.crashes++; VQ.fx.burst(st, d.pos.clone().add(V3(0, 1, 0)), 0xff6b35, 26, 4); VQ.sfx.play('boom');
          VQ.fx.float(st, d.pos.clone().add(V3(0, 2.6, 0)), '💥 קרס!', '#fb7185', 0.7); d.obj.screen.material.emissiveIntensity = 0.05;
          G.combo = 0; G.loseLife();
        }
      }
      function spawnPickup() {
        if (pickup) return;
        const a = Math.random() * 6.283, r = VQ.rand(1.8, 4);
        const g = new THREE.Group(); const box = M.box(1.1, 1.1, 1.1, 0xfde047, { e: 0xfacc15, ei: 1 }); g.add(box);
        const lb = M.label('⚡ VLAN', { size: 0.5, bg: '#fde047', color: '#1f1500', onTop: true }); lb.position.y = 1.3; g.add(lb);
        const gl = M.glow(0xfde047, 4.2, 0.8); g.add(gl);
        const hit = new THREE.Mesh(new THREE.SphereGeometry(1.4, 8, 8), new THREE.MeshBasicMaterial({ visible: false })); g.add(hit);
        g.position.set(Math.cos(a) * r, 0.9, Math.sin(a) * r); st.add(g);
        pickup = { g, box, life: 9 }; VQ.sfx.play('coin');
        st.pickable(g, () => {
          if (!pickup) return; VQ.sfx.play('level'); st.unpickable(g); st.remove(g); pickup = null; stats.shields++;
          shieldActive = cfg.shield; colorPcs(true); G.msg('⚡ הרשת חולקה ל-3 VLAN-ים', '#fde047'); VQ.fx.ring(st, V3(0, 0.1, 0), 0xfde047, 9, 0.9); G.addScore(80, g.position.clone(), '#fde047');
        });
      }
      G.ctl.start = function () { G.setMid('זמן', VQ.fmtTime(cfg.dur)); G.setTask('צדו את החבילות האדומות! 🎯'); };
      G.ctl.idle = function (dt) { ring.rotation.z += dt * 0.2; };
      G.ctl.update = function (dt) {
        const left = cfg.dur - G.time; G.setMid('זמן', VQ.fmtTime(left));
        ring.rotation.z += dt * 0.2;
        // spawn
        spawnT -= dt;
        if (spawnT <= 0) { emit(); const k = VQ.clamp(G.time / cfg.dur, 0, 1); spawnT = VQ.lerp(cfg.spawn[0], cfg.spawn[1], k) * VQ.rand(0.8, 1.2); }
        // shield pickup timing
        shieldT -= dt; if (shieldT <= 0 && !pickup && shieldActive <= 0) { spawnPickup(); shieldT = cfg.shieldEvery; }
        if (pickup) { pickup.life -= dt; pickup.g.position.y = 0.9 + Math.sin(G.time * 4) * 0.25; pickup.box.rotation.y += dt * 2; if (pickup.life <= 0) { st.unpickable(pickup.g); st.remove(pickup.g); pickup = null; } }
        if (shieldActive > 0) { shieldActive -= dt; if (shieldActive <= 0) { colorPcs(false); G.setTask('צדו את החבילות האדומות! 🎯'); G.msg('בלי VLAN – שוב הכול מוצף!', '#fca5a5'); } else G.setTask(`<b>⚡ VLAN פעיל (${Math.ceil(shieldActive)})</b> — ה-Broadcast עדיין נשלח, אבל המתג מעביר אותו רק לפורטים באותו VLAN. שאר ההעתקים נחסמים ✖`); }
        // packets
        for (let i = packets.length - 1; i >= 0; i--) {
          const p = packets[i]; if (p.dead) { packets.splice(i, 1); continue; }
          p.t += dt / p.dur; const k = Math.min(1, p.t);
          p.g.position.lerpVectors(p.from, p.to, k); p.g.scale.setScalar(1 + Math.sin(G.time * 12 + i) * 0.08);
          if (k >= 1) { if (p.kind === 'root') arriveRoot(p); else { hitPc(p.dst); destroy(p); } }
        }
        // pcs
        pcs.forEach((d) => {
          if (d.dead > 0) { d.dead -= dt; if (d.dead <= 0) { d.cpu = 30; d.obj.screen.material.emissiveIntensity = 0.5; } }
          else d.cpu = Math.max(0, d.cpu - cfg.decay * dt);
          const f = d.cpu / 100; d.bar.scale.x = Math.max(0.01, 1.42 * f); d.bar.position.x = d.bg.position.x - (1.42 - d.bar.scale.x) / 2 * 1;
          d.bar.material.color.setHex(f < 0.5 ? 0x4ade80 : f < 0.8 ? 0xfbbf24 : 0xf87171);
          if (d.cpu >= 80 && d.dead <= 0) d.obj.position.x = d.pos.x + Math.sin(G.time * 40) * 0.05;
        });
        if (left <= 0) {
          const avg = 100 - pcs.reduce((a, d) => a + d.cpu, 0) / pcs.length;
          G.end({
            completed: true, title: G.lives === G.maxLives ? 'הרשת שרדה! 🛡️' : 'שרדתם את הסערה!', bonus: G.lives * 120 + Math.round(avg * 2), perfect: stats.crashes === 0,
            stats: [['שורשים שהושמדו', stats.roots], ['חבילות-בת שהושמדו', stats.copies], ['מחשבים שקרסו', stats.crashes], ['שימוש ב-⚡ VLAN', stats.shields]],
            note: stats.shields ? `VLAN לא מבטל Broadcast – הוא מצמצם את ה-Broadcast Domain: ${stats.blocked} העתקים נחסמו על גבולות ה-VLAN ולא הגיעו למחשבים שלא קשורים.` : 'טיפ: בפעם הבאה אספו את ⚡ VLAN וראו איך ההעתקים לקבוצות האחרות נחסמים במתג.',
          });
        }
      };
      return G.ctl;
    },
  });
})(window.VQ);
