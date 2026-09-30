/* Game 1 – Broadcast Storm (chapter: flat network).
   Phase 1: feel why a flat network suffers – every broadcast is copied to EVERY host.
   Phase 2: the player fixes it by assigning each host to the VLAN of its department. Broadcasts still exist,
   but the switch confines them to their own VLAN – and the game measures the difference. */
(function (VQ) {
  const M = VQ.M, V3 = M.V3, h = VQ.h;
  const DEPT = { 10: { he: 'מכירות', role: 's' }, 20: { he: 'כספים', role: 'f' }, 30: { he: 'אורחים', role: 'g' } };
  const ROLES = ['s', 'f', 'g'], ROLE_V = { s: 10, f: 20, g: 30 }, ROLE_HE = { s: 'מכירות', f: 'כספים', g: 'אורח' };
  VQ.game({
    id: 'storm', chapter: 'flat', title: 'סערת השידורים',
    concept: 'Broadcast מגיע לכל המחשבים בכל הרשת השטוחה • VLAN מחלק לרשתות לפי מחלקה ומצמצם את ה-Broadcast Domain',
    tagline: 'הרשת השטוחה קורסת: כל Broadcast מגיע לכל המחשבים. שרדו את הסערה — ואז תקנו אותה בעצמכם בעזרת VLAN-ים.',
    howto: [
      '**שלב 1 – רשת שטוחה:** לחצו על חבילות ה-Broadcast האדומות כדי להשמיד אותן. שימו לב: חבילה אחת שיוצאת ממחשב מועתקת **לכל** שאר המחשבים. כל חבילה שמגיעה מעמיסה על ה-CPU, ומחשב ב-100% קורס.',
      '**שלב 2 – חלוקה ל-VLAN:** לחצו **🔧 חלק ל-VLAN** (או חכו שהמערכת תבקש). לחצו על כל מחשב כדי לשייך אותו ל-VLAN לפי המחלקה שלו: מכירות / כספים / אורחים. אותה מחלקה = אותו VLAN, מחלקות שונות = VLAN-ים שונים (אורחים לעולם לא עם הכספים!).',
      '**אחרי החלוקה:** ה-Broadcast **עדיין נשלח**, אבל המתג מעביר אותו רק לפורטים באותו VLAN וחוסם את שאר ההעתקים (✖). ראו איך העומס יורד — המשחק מודד לפני ואחרי.',
    ],
    stage: { bg: 0x070c1a, fogNear: 40, fogFar: 100 },
    levels: {
      easy: { dur: 55, n: 9, lives: 6, spawn: [2.6, 1.6], load: 5, decay: 9, speed: 4.2, splitAt: 0.35, hints: true, stars: [500, 950, 1400] },
      mid: { dur: 70, n: 9, lives: 4, spawn: [1.9, 1.0], load: 8, decay: 5.5, speed: 5.2, splitAt: 0.42, hints: false, stars: [1500, 2800, 4000] },
      hard: { dur: 80, n: 12, lives: 3, spawn: [1.2, 0.55], load: 11, decay: 4, speed: 6.2, splitAt: 0.5, hints: false, stars: [3400, 6500, 10000] },
    },
    create(G) {
      const st = G.stage, cfg = G.cfg, R = 6.3, N = cfg.n;
      M.grid(st, 60, 0x16305a); M.stars(st, 300, 80);
      st.setCam([0, 15, 10.5], [0, 0, 0.6]);
      const arena = M.cyl(8.3, 8.6, 0.3, 0x0e1730, { r: 0.7 }, 48); arena.position.y = -0.2; st.add(arena);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(8.4, 0.08, 8, 64), M.mat(0x22d3ee, { e: 0x22d3ee, ei: 1 })); ring.rotation.x = Math.PI / 2; ring.position.y = 0; st.add(ring);
      const sw = M.device('switch', { ports: 4, pitch: 0.5 }); sw.scale.set(1.5, 1.5, 1.5); st.add(sw);
      const swLabel = M.label('SWITCH\nרשת שטוחה (VLAN 1)', { size: 0.42, bg: 'rgba(8,13,28,.9)' }); swLabel.position.set(0, 2.1, 0); st.add(swLabel);
      const counter = M.label('', { size: 0.4, bg: 'rgba(8,13,28,.9)', color: '#fca5a5', border: '#f87171' }); counter.position.set(0, 3.3, 0); st.add(counter);

      // PCs on a ring; departments are shuffled around it (so the split is by role, not by position)
      const roles = []; for (let i = 0; i < N; i++) roles.push(ROLES[i % 3]); VQ.shuffle(roles).forEach((r, i) => { roles[i] = r; });
      const pcs = [];
      for (let i = 0; i < N; i++) {
        const a = (i / N) * Math.PI * 2 + Math.PI / 2, role = roles[i];
        const pc = M.device(role === 'g' ? 'laptop' : 'pc', { screen: 0x64748b }); pc.scale.setScalar(1.3);
        pc.position.set(Math.cos(a) * R, 0, Math.sin(a) * R); st.add(pc); pc.lookAt(0, 0, 0);
        const bg = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0x0f172a, depthTest: false })), fill = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0x4ade80, depthTest: false }));
        bg.scale.set(1.5, 0.24, 1); fill.scale.set(0.01, 0.16, 1); bg.renderOrder = 10; fill.renderOrder = 11;
        bg.position.set(pc.position.x, 2.4, pc.position.z); st.add(bg); st.add(fill);
        const lb = M.label(ROLE_HE[role], { size: 0.36, bg: cfg.hints ? VQ.vcss(ROLE_V[role]) : 'rgba(8,13,28,.9)', color: cfg.hints ? '#04101a' : '#fff' }); lb.position.set(pc.position.x * 1.16, 3.1, pc.position.z * 1.16); st.add(lb);
        const ringM = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.07, 6, 28), M.mat2(0x64748b, { e: 0x64748b, ei: 0.9 })); ringM.rotation.x = Math.PI / 2; ringM.position.set(pc.position.x, 0.05, pc.position.z); ringM.visible = false; st.add(ringM);
        const pcO = { i, obj: pc, pos: pc.position.clone(), cpu: 0, dead: 0, role, vlan: 1, bar: fill, bg, lb, ring: ringM };
        st.pickable(pc, () => onPc(pcO), { onHover: () => {} });
        pcs.push(pcO);
      }
      const packets = []; let spawnT = 1.5, planning = false, planningForced = false, divided = false, elapsed = 0, nextPrompt = cfg.dur * cfg.splitAt, attempts = 0;
      const stats = { roots: 0, copies: 0, crashes: 0, blocked: 0, splitAt: 0, bonus: 0, flat: { t: 0, delivered: 0 }, vlan: { t: 0, delivered: 0 }, copiesFlat: N - 1, copiesVlan: 0 };
      const bar = h('div', { class: 'row', style: { justifyContent: 'center', width: '100%' } }); G.ui.bottom.append(bar);
      const say = (t) => G.setTask(t);

      function renderBar() {
        bar.innerHTML = '';
        if (planning) {
          bar.append(h('button', { class: 'btn green', style: { fontSize: '19px' }, onClick: apply }, '✅ החל את ה-VLAN-ים'));
          if (!planningForced) bar.append(h('button', { class: 'btn ghost', onClick: () => setPlanning(false) }, 'ביטול'));
        } else if (!divided) bar.append(h('button', { class: 'btn amber', style: { fontSize: '18px' }, onClick: () => setPlanning(true) }, '🔧 חלק ל-VLAN'));
      }
      function setPlanning(on, forced) {
        if (divided || G.ended || !G.running) return;
        planning = on; planningForced = !!forced; VQ.sfx.play('click');
        pcs.forEach((p) => { p.ring.visible = on || p.vlan !== 1; });
        if (on) {
          say('🔧 <b>מצב חלוקה</b> (המשחק מוקפא): לחצו על כל מחשב כדי לשייך אותו ל-VLAN <b style="color:#38bdf8">10</b> / <b style="color:#4ade80">20</b> / <b style="color:#fb923c">30</b>.<br>אותה מחלקה = אותו VLAN • מחלקות שונות = VLAN-ים שונים • אורחים בנפרד מהכספים!');
        } else { nextPrompt = elapsed + 10; say('צדו את החבילות האדומות! 🎯'); }
        renderBar();
      }
      function colorPc(p) {
        const c = p.vlan === 1 ? 0x64748b : VQ.vhex(p.vlan);
        p.obj.screen.material.color.setHex(c); p.obj.screen.material.emissive.setHex(c);
        p.ring.material.color.setHex(c); p.ring.material.emissive.setHex(c); p.ring.visible = planning || p.vlan !== 1;
        p.lb.userData.set(ROLE_HE[p.role] + (p.vlan !== 1 ? '\nVLAN ' + p.vlan : ''), { bg: p.vlan !== 1 ? VQ.vcss(p.vlan) : (cfg.hints ? VQ.vcss(ROLE_V[p.role]) : 'rgba(8,13,28,.9)'), color: p.vlan !== 1 || cfg.hints ? '#04101a' : '#fff' });
      }
      function onPc(p) {
        if (!planning) return;
        const order = [1, 10, 20, 30]; p.vlan = order[order.indexOf(p.vlan) + 1] || 10;
        colorPc(p); p.obj.position.y = 0.2; st.tween(p.obj.position, { y: 0 }, 0.2); VQ.sfx.play('pop');
      }
      function validate() {
        if (pcs.some((p) => p.vlan === 1)) return 'יש מחשבים שעוד לא שויכו ל-VLAN (אפורים).';
        const byRole = {}; pcs.forEach((p) => { (byRole[p.role] = byRole[p.role] || new Set()).add(p.vlan); });
        for (const r of ROLES) if (byRole[r].size > 1) return `מחשבי ה${ROLE_HE[r]} מפוצלים בין כמה VLAN-ים — הם צריכים להיות באותו VLAN כדי לדבר ביניהם.`;
        const used = {}; for (const r of ROLES) { const v = [...byRole[r]][0]; if (used[v]) return used[v] === 'g' || r === 'g' ? '🔓 האורחים באותו VLAN עם מחלקה אחרת — הם יראו את התעבורה שלה! אורחים חייבים VLAN נפרד.' : `המחלקות ${ROLE_HE[used[v]]} ו${ROLE_HE[r]} באותו VLAN — הן לא מופרדות.`; used[v] = r; }
        return null;
      }
      function apply() {
        if (!planning) return; attempts++;
        const err = validate();
        if (err) { VQ.sfx.play('bad'); G.combo = 0; G.addScore(-30); say('❌ ' + err); return; }
        planning = false; divided = true; stats.splitAt = elapsed;
        const sizes = {}; pcs.forEach((p) => { sizes[p.vlan] = (sizes[p.vlan] || 0) + 1; });
        stats.copiesVlan = Math.round((pcs.reduce((a, p) => a + sizes[p.vlan] - 1, 0) / N) * 10) / 10;
        const b = Math.round(Math.max(0, 1 - elapsed / cfg.dur) * 300) + (attempts === 1 ? 150 : 0); stats.bonus = b; G.addScore(b, V3(0, 3.5, 0), '#fde047');
        VQ.sfx.play('level'); VQ.fx.ring(st, V3(0, 0.1, 0), 0xfde047, 9, 0.9); G.msg('⚡ הרשת חולקה ל-VLAN-ים!', '#fde047');
        swLabel.userData.set('SWITCH\nVLAN 10 | 20 | 30'); counter.userData.set(`כל Broadcast: ${N - 1} העתקים ← ~${stats.copiesVlan}`); counter.visible = true;
        pcs.forEach((p) => { p.ring.visible = true; });
        say('✅ ה-Broadcast <b>עדיין נשלח</b> — אבל המתג מעביר אותו רק לפורטים באותו VLAN, ושאר ההעתקים נחסמים ✖. שימו לב כמה העומס יורד.');
        renderBar();
      }
      counter.visible = false;

      function mkPacket(from, to, kind, src) {
        const big = kind === 'root';
        const g = new THREE.Group(); g.add(M.sph(big ? 0.42 : 0.26, big ? 0xff4d4d : 0xfb7185, { e: 0xff2222, ei: 0.9 }, 12)); g.add(M.glow(0xff3b3b, big ? 2.6 : 1.5, 0.8));
        const hit = new THREE.Mesh(new THREE.SphereGeometry(big ? 0.95 : 0.8, 8, 8), new THREE.MeshBasicMaterial({ visible: false })); g.add(hit);
        g.position.copy(from); st.add(g);
        const p = { g, from: from.clone(), to: to.clone(), t: 0, dur: from.distanceTo(to) / cfg.speed, kind, src, dead: false, dst: null };
        st.pickable(g, () => zap(p), { onHover: () => {} });
        packets.push(p); return p;
      }
      function destroy(p) { p.dead = true; st.unpickable(p.g); st.remove(p.g); }
      function zap(p) {
        if (p.dead || G.ended || planning) return;
        VQ.fx.burst(st, p.g.position.clone().add(V3(0, 0.3, 0)), 0xfde047, 14, 3); VQ.sfx.play('zap');
        if (p.kind === 'root') { stats.roots++; G.hit(50, p.g.position.clone().add(V3(0, 1, 0))); } else { stats.copies++; G.hit(10, p.g.position.clone().add(V3(0, 1, 0))); }
        destroy(p);
      }
      function emit() {
        const alive = pcs.filter((p) => !p.dead); if (!alive.length) return;
        const src = VQ.pick(alive);
        VQ.fx.float(st, src.pos.clone().add(V3(0, 3.6, 0)), '📢 Broadcast', '#fca5a5', 0.42);
        mkPacket(src.pos.clone().add(V3(0, 0.6, 0)), V3(0, 0.6, 0), 'root', src);
      }
      // with VLANs the copy is still generated, but the switch drops it at the VLAN boundary
      function blockedCopy(d) {
        const to = d.pos.clone().multiplyScalar(0.28).setY(0.6);
        const g = new THREE.Group(); g.add(M.sph(0.22, 0x94a3b8, { e: 0x64748b, ei: 0.5 }, 8)); g.position.set(0, 0.6, 0); st.add(g);
        st.tween(g.position, { x: to.x, y: to.y, z: to.z }, 0.45, { ease: 'out' }).then(() => { VQ.fx.burst(st, to.clone(), 0x94a3b8, 8, 2, 0.12); VQ.fx.float(st, to.clone().add(V3(0, 0.8, 0)), '✖', '#cbd5e1', 0.5); st.remove(g); });
        stats.blocked++;
      }
      function arriveRoot(p) {
        VQ.fx.ring(st, V3(0, 0.1, 0), 0xff4d4d, 2.2, 0.5);
        pcs.forEach((d) => {
          if (d === p.src) return;
          if (divided && d.vlan !== p.src.vlan) { blockedCopy(d); return; }
          const c = mkPacket(V3(0, 0.6, 0), d.pos.clone().add(V3(0, 0.6, 0)), 'copy', p.src); c.dst = d;
        });
        destroy(p);
      }
      function hitPc(d) {
        (divided ? stats.vlan : stats.flat).delivered++;
        if (d.dead > 0) return;
        d.cpu += cfg.load; d.obj.position.y = 0.15; st.tween(d.obj.position, { y: 0 }, 0.2);
        if (d.cpu >= 100) {
          d.cpu = 100; d.dead = 4.2; stats.crashes++; VQ.fx.burst(st, d.pos.clone().add(V3(0, 1, 0)), 0xff6b35, 26, 4); VQ.sfx.play('boom');
          VQ.fx.float(st, d.pos.clone().add(V3(0, 2.8, 0)), '💥 קרס!', '#fb7185', 0.7); d.obj.screen.material.emissiveIntensity = 0.05;
          G.combo = 0; G.loseLife();
        }
      }
      function finish() {
        const rate = (o) => (o.t > 0 ? Math.round((o.delivered / o.t / N) * 100) / 100 : 0);
        const fr = rate(stats.flat), vr = rate(stats.vlan);
        const avg = 100 - pcs.reduce((a, d) => a + d.cpu, 0) / N;
        const perfect = stats.crashes === 0 && divided && attempts === 1;
        G.end({
          completed: divided, bonus: G.lives * 100 + Math.round(avg * 2), perfect,
          title: !divided ? 'הרשת נשארה שטוחה…' : stats.crashes === 0 ? 'הרשת שרדה! 🛡️' : 'שרדתם את הסערה!',
          stats: [['העתקים לכל Broadcast — רשת שטוחה', N - 1], ['העתקים לכל Broadcast — אחרי VLAN', '~' + stats.copiesVlan], ['Broadcast שהתקבל למחשב בשנייה: לפני → אחרי', divided ? `${fr} → ${vr}` : '—'], ['העתקים שנחסמו על גבולות ה-VLAN', stats.blocked], ['מחשבים שקרסו', stats.crashes]],
          note: divided ? 'VLAN לא מבטל Broadcast — הוא מצמצם את ה-Broadcast Domain: כל Broadcast מגיע רק לחברי אותו VLAN, ולכן העומס יורד. וכשהאורחים ב-VLAN נפרד הם גם לא רואים את הכספים.' : 'לא חילקתם ל-VLAN-ים, ולכן כל Broadcast המשיך להגיע לכולם. נסו שוב וחלקו לפי מחלקות.',
          review: divided ? [] : [['מה לעשות עם רשת שטוחה עמוסה?', 'לחלק ל-VLAN-ים לפי מחלקה']],
        });
      }
      G.dbg = { pcs, setPlanning, apply, onPc, stats, get divided() { return divided; } };
      G.ctl = {
        start() { renderBar(); G.setMid('זמן', VQ.fmtTime(cfg.dur)); say('צדו את החבילות האדומות! כל חבילה מועתקת לכל המחשבים 🎯'); },
        idle(dt) { ring.rotation.z += dt * 0.2; },
        update(dt) {
          ring.rotation.z += dt * 0.2;
          if (planning) { pcs.forEach((p) => { p.ring.rotation.z += dt; }); return; }
          elapsed += dt; (divided ? stats.vlan : stats.flat).t += dt;
          G.setMid('זמן', VQ.fmtTime(cfg.dur - elapsed));
          if (!divided && elapsed >= nextPrompt) { setPlanning(true, true); G.msg('הרשת קורסת! חלקו ל-VLAN-ים', '#fbbf24'); VQ.sfx.play('alarm'); return; }
          spawnT -= dt;
          if (spawnT <= 0) { emit(); const k = VQ.clamp(elapsed / cfg.dur, 0, 1); spawnT = VQ.lerp(cfg.spawn[0], cfg.spawn[1], k) * VQ.rand(0.8, 1.2); }
          for (let i = packets.length - 1; i >= 0; i--) {
            const p = packets[i]; if (p.dead) { packets.splice(i, 1); continue; }
            p.t += dt / p.dur; const k = Math.min(1, p.t);
            p.g.position.lerpVectors(p.from, p.to, k); p.g.scale.setScalar(1 + Math.sin(G.time * 12 + i) * 0.08);
            if (k >= 1) { if (p.kind === 'root') arriveRoot(p); else { hitPc(p.dst); destroy(p); } }
          }
          pcs.forEach((d) => {
            if (d.dead > 0) { d.dead -= dt; if (d.dead <= 0) { d.cpu = 30; d.obj.screen.material.emissiveIntensity = 0.5; } } else d.cpu = Math.max(0, d.cpu - cfg.decay * dt);
            const f = d.cpu / 100; d.bar.scale.x = Math.max(0.01, 1.42 * f); d.bar.position.x = d.bg.position.x - (1.42 - d.bar.scale.x) / 2;
            d.bar.material.color.setHex(f < 0.5 ? 0x4ade80 : f < 0.8 ? 0xfbbf24 : 0xf87171);
            if (d.cpu >= 80 && d.dead <= 0) d.obj.position.x = d.pos.x + Math.sin(G.time * 40) * 0.05;
          });
          if (elapsed >= cfg.dur) { if (!divided) { setPlanning(true, true); G.msg('חלקו ל-VLAN-ים כדי לסיים!', '#fbbf24'); } else finish(); }
        },
      };
      return G.ctl;
    },
  });
})(window.VQ);
