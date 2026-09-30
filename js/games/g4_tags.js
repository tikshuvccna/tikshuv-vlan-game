/* Game 4 – Tag Sorter (chapter: trunk & 802.1Q). Decide the correct tag for every frame entering the trunk. */
(function (VQ) {
  const M = VQ.M, V3 = M.V3, h = VQ.h;
  VQ.game({
    id: 'tags', chapter: 'trunk', title: 'מיון תגיות',
    concept: 'תיוג 802.1Q: התג הוא ה-VLAN של פורט ה-Access • Native יוצא בלי תג • VLAN שלא ב-Allowed נחסם',
    tagline: 'פריימים נכנסים מפורטי Access אל ה-Trunk. אתם המתג: בחרו את התג הנכון לכל פריים לפני שהתור מתמלא!',
    howto: [
      'הפריים הראשון בתור מסומן. **התג = ה-VLAN של הפורט ממנו הגיע.** לחצו על הכפתור המתאים (או מקש 1–5).',
      'ברמות מתקדמות: פריים מה-**Native VLAN** יוצא **ללא תג** (`ללא תג`), ופריים של VLAN שאינו ב-**Allowed** נזרק (`Drop`).',
      'חוקי ה-Trunk מוצגים למעלה בצורת פקודות Cisco — קראו אותם! הם יכולים להשתנות תוך כדי משחק.',
    ],
    stage: { bg: 0x0a1020 },
    levels: {
      easy: { frames: 18, every: 3.4, limit: 8, vlans: [10, 20, 30], hasNone: false, hasDrop: false, change: false, lives: 0, stars: [350, 700, 1000] },
      mid: { frames: 28, every: 2.5, limit: 5.2, vlans: [10, 20, 30, 1], hasNone: true, hasDrop: false, change: false, lives: 4, stars: [1000, 2000, 3000] },
      hard: { frames: 40, every: 1.8, limit: 3.6, vlans: [10, 20, 30, 1, 99], hasNone: true, hasDrop: true, change: true, lives: 3, stars: [2600, 5200, 8200] },
    },
    create(G) {
      const st = G.stage, cfg = G.cfg;
      M.grid(st, 80, 0x16305a); M.stars(st, 250, 80);
      st.setCam([0, 15, 9.5], [0, 0, 0.2]);
      const V = cfg.vlans, PZ = V.map((_, i) => (i - (V.length - 1) / 2) * 2.5);
      // source ports (left) and delivery ports (right)
      const src = V.map((v, i) => {
        const g = new THREE.Group(); g.position.set(-9.2, 0, PZ[i]); st.add(g);
        const base = M.box(1.6, 0.4, 1.5, VQ.vhex(v), { e: VQ.vhex(v), ei: 0.35, o: 0.9 }); base.position.y = 0.2; g.add(base);
        const lb = M.label(`Fa0/${i + 1}\nVLAN ${v}`, { size: 0.36, bg: 'rgba(8,13,28,.85)', color: '#fff' }); lb.position.set(-0.2, 1.0, 0); g.add(lb);
        const cab = M.cable(V3(-8.4, 0.3, PZ[i]), V3(-4, 0.3, 0), { color: VQ.vhex(v), glow: true, sag: 0.01, r: 0.05 }); st.add(cab);
        return { v, pos: g.position.clone() };
      });
      const dst = V.map((v, i) => {
        const g = new THREE.Group(); g.position.set(9.4, 0, PZ[i]); st.add(g);
        const base = M.box(1.6, 0.4, 1.5, VQ.vhex(v), { e: VQ.vhex(v), ei: 0.35, o: 0.9 }); base.position.y = 0.2; g.add(base);
        const lb = M.label(`VLAN ${v}`, { size: 0.36, bg: 'rgba(8,13,28,.85)' }); lb.position.set(0.3, 1.0, 0); g.add(lb);
        return { v, pos: g.position.clone(), flash: 0 };
      });
      const swA = M.device('switch', { ports: 2, pitch: 0.6 }); swA.position.set(-4, 0, 0); swA.rotation.y = -Math.PI / 2; swA.scale.setScalar(1.3); st.add(swA);
      const swB = M.device('switch', { ports: 2, pitch: 0.6 }); swB.position.set(6.3, 0, 0); swB.rotation.y = Math.PI / 2; swB.scale.setScalar(1.3); st.add(swB);
      const trunk = M.cable(V3(-3.3, 0.35, 0), V3(5.6, 0.35, 0), { color: 0xfde047, glow: true, sag: 0.0, r: 0.14 }); st.add(trunk);
      // gate
      const gate = new THREE.Group(); gate.position.set(-1.0, 0, 0); st.add(gate);
      [-1.7, 1.7].forEach((z) => { const p = M.box(0.3, 2.2, 0.3, 0x475569, { m: 0.6 }); p.position.set(0, 1.1, z); gate.add(p); });
      const bar = M.box(0.35, 0.3, 3.7, 0xfbbf24, { e: 0xfbbf24, ei: 0.8 }); bar.position.set(0, 2.2, 0); gate.add(bar);
      const gateL = M.label('TAG GATE', { size: 0.4, bg: '#fbbf24', color: '#1f1500' }); gateL.position.set(0, 3.0, 0); gate.add(gateL);
      const zoneRing = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.2, 32), new THREE.MeshBasicMaterial({ color: 0xfde047, transparent: true, opacity: 0.6, side: THREE.DoubleSide })); zoneRing.rotation.x = -Math.PI / 2; zoneRing.position.set(-2.4, 0.05, 0); st.add(zoneRing);

      let rule = { native: 1, allowed: null }, queue = [], spawned = 0, spawnT = 1, activeT = 0, decided = 0, ruleT = 12;
      const stats = { ok: 0, wrong: 0, timeouts: 0 }; const rev = new Map();
      const ruleBox = h('div', { style: { fontFamily: 'var(--mono)', direction: 'ltr', textAlign: 'left', fontSize: '13px', lineHeight: 1.5, color: '#7ee7fb' } });
      const timerBar = h('div', { style: { height: '6px', borderRadius: '6px', background: '#22d3ee', width: '100%', marginTop: '4px', transformOrigin: 'left' } });
      G.ui.task.append(h('div', { class: 'box' }, ruleBox, timerBar));
      function showRule() {
        const nat = rule.native, al = rule.allowed ? [...rule.allowed].sort((a, b) => a - b).join(',') : 'all';
        ruleBox.innerHTML = `interface gi0/1<br>&nbsp;switchport mode trunk<br>&nbsp;switchport trunk native vlan <b style="color:#fde047">${nat}</b><br>&nbsp;switchport trunk allowed vlan <b style="color:#fde047">${al}</b>`;
      }
      showRule();
      const actions = [...V.filter((v) => v !== 1 || true).filter((v) => cfg.hasNone ? true : v !== 1).map((v) => ({ id: v, label: 'Tag ' + v, color: VQ.vcss(v) }))];
      if (cfg.hasNone) actions.push({ id: 'none', label: 'ללא תג', color: '#e2e8f0' });
      if (cfg.hasDrop) actions.push({ id: 'drop', label: 'Drop', color: '#f87171' });
      const btns = h('div', { class: 'row', style: { justifyContent: 'center' } });
      actions.forEach((a, i) => btns.append(h('button', { class: 'bigbtn', style: { background: a.color }, onClick: () => decide(a.id) }, a.label, h('small', {}, '[' + (i + 1) + ']'))));
      G.ui.bottom.append(btns);
      const expected = (v) => (rule.allowed && !rule.allowed.has(v) ? 'drop' : v === rule.native ? 'none' : v);
      function spawn() {
        const s = VQ.pick(src); spawned++;
        const pk = M.packet({ color: 0xf8fafc, size: 0.4 }); pk.position.copy(s.pos).add(V3(1, 0.5, 0)); st.add(pk);
        const info = M.label(cfg.vlans.length && `מ-Fa0/${V.indexOf(s.v) + 1}\nVLAN ${s.v}`, { size: 0.3, bg: VQ.vcss(s.v), color: '#04101a' }); info.position.y = 1.0; pk.add(info);
        queue.push({ pk, v: s.v, info, born: G.time });
        VQ.sfx.play('pop');
      }
      function decide(action) {
        if (!G.running || !queue.length) return;
        const f = queue[0]; if (f.busy) return;
        const want = expected(f.v); f.busy = true; queue.shift(); decided++;
        const good = action === want;
        activeT = 0;
        const left = Math.max(0, 1 - (G.time - f.start) / cfg.limit);
        if (good) {
          stats.ok++; G.hit(40 + Math.round(left * 40), f.pk.position.clone().add(V3(0, 1.5, 0))); VQ.sfx.play('ok');
          if (want === 'drop') { VQ.fx.burst(st, f.pk.position.clone(), 0xf87171, 18, 3); st.remove(f.pk); }
          else {
            if (want !== 'none') { f.pk.setTag(VQ.vhex(want)); VQ.fx.ring(st, V3(-1, 0.1, 0), VQ.vhex(want), 1.6, 0.5); }
            f.info.visible = false;
            const d = dst[V.indexOf(f.v)];
            st.tween(f.pk.position, { x: 5.6, y: 0.6, z: 0 }, 0.6, { ease: 'lin' }).then(() => { f.pk.setTag(null); return st.tween(f.pk.position, { x: d.pos.x - 0.6, z: d.pos.z, y: 0.6 }, 0.45, { ease: 'lin' }); }).then(() => { VQ.fx.burst(st, d.pos.clone().add(V3(0, 0.6, 0)), VQ.vhex(f.v), 12, 2.5); st.remove(f.pk); });
          }
        } else {
          stats.wrong++; rev.set(want + ':' + f.v, [`פריים מ-VLAN ${f.v}: ${want === 'drop' ? 'Drop' : want === 'none' ? 'ללא תג' : 'Tag ' + want}`, want === 'drop' ? 'VLAN שלא ב-Allowed של ה-Trunk נחסם.' : want === 'none' ? 'ה-Native VLAN יוצא ב-Trunk בלי תג.' : 'התג = ה-VLAN של פורט ה-Access שממנו הגיע הפריים.']); G.miss(cfg.lives ? 0 : 10, f.pk.position.clone().add(V3(0, 1.5, 0)));
          VQ.fx.burst(st, f.pk.position.clone(), 0xf87171, 20, 4); VQ.fx.float(st, f.pk.position.clone().add(V3(0, 2, 0)), want === 'drop' ? 'צריך Drop!' : want === 'none' ? 'צריך ללא תג!' : 'צריך Tag ' + want, '#fca5a5', 0.5);
          st.remove(f.pk); if (cfg.lives) G.loseLife();
        }
        checkEnd();
      }
      function checkEnd() { if (spawned >= cfg.frames && !queue.length && !G.ended) { const perfect = stats.wrong === 0 && stats.timeouts === 0; G.end({ completed: true, perfect, bonus: perfect ? 300 : 0, title: perfect ? 'תיוג מושלם! 🏷️' : 'התור התרוקן', stats: [['תויגו נכון', stats.ok], ['טעויות', stats.wrong], ['פספוסים (זמן)', stats.timeouts]], note: 'זכרו: התג = ה-VLAN של פורט ה-Access. ה-Native יוצא בלי תג, ומה שלא ב-Allowed לא עובר.', review: [...rev.values()] }); } }
      G.ctl = {
        onKey(e) { const m = e.code.match(/^(Digit|Numpad)(\d)$/); if (m) { const a = actions[+m[2] - 1]; if (a) decide(a.id); } },
        start() { G.setMid('פריימים', `0/${cfg.frames}`); },
        update(dt) {
          spawnT -= dt;
          if (spawned < cfg.frames && spawnT <= 0) { spawn(); spawnT = cfg.every * VQ.rand(0.85, 1.15); }
          if (cfg.change) { ruleT -= dt; if (ruleT <= 0) { ruleT = 14; const opts = [{ native: 1, allowed: null }, { native: 20, allowed: null }, { native: 1, allowed: new Set([10, 20, 99]) }, { native: 30, allowed: new Set([10, 30, 1, 99]) }, { native: 99, allowed: new Set([10, 20, 30, 1]) }]; rule = VQ.pick(opts.filter((o) => o.native !== rule.native)); showRule(); G.msg('⚠️ חוקי ה-Trunk השתנו!', '#fbbf24'); VQ.sfx.play('alarm'); } }
          // queue movement
          queue.forEach((f, i) => {
            const tx = -2.6 - i * 0.95, ty = 0.5, tz = 0, p = f.pk.position;
            p.x += (tx - p.x) * Math.min(1, dt * 4); p.y += (ty - p.y) * Math.min(1, dt * 4); p.z += (tz - p.z) * Math.min(1, dt * 4);
            if (i === 0 && f.start == null && Math.abs(p.x - tx) < 0.5) { f.start = G.time; }
            f.pk.scale.setScalar(i === 0 ? 1.4 : 1);
          });
          const f0 = queue[0];
          if (f0 && f0.start != null) {
            const k = 1 - (G.time - f0.start) / cfg.limit; timerBar.style.width = Math.max(0, k * 100) + '%'; timerBar.style.background = k < 0.3 ? '#f87171' : '#22d3ee';
            zoneRing.material.opacity = 0.4 + Math.sin(G.time * 8) * 0.3;
            if (k <= 0) { stats.timeouts++; queue.shift(); VQ.fx.burst(st, f0.pk.position.clone(), 0xfbbf24, 14, 3); st.remove(f0.pk); G.miss(cfg.lives ? 0 : 10); G.msg('⏰ איטי מדי', '#fbbf24'); if (cfg.lives) G.loseLife(); checkEnd(); }
          } else timerBar.style.width = '100%';
          if (queue.length > 7) { queue.forEach((q) => st.remove(q.pk)); queue = []; G.msg('התור עלה על גדותיו! 💥', '#f87171'); if (cfg.lives) G.loseLife(); else G.addScore(-40); }
          G.setMid('פריימים', `${Math.min(spawned, cfg.frames)}/${cfg.frames}`);
        },
      };
      return G.ctl;
    },
  });
})(window.VQ);
