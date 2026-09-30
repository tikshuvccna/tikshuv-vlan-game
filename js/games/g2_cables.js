/* Game 2 – Cable Chaos (chapter: before VLAN). Re-plug cables between physical department switches under time pressure. */
(function (VQ) {
  const M = VQ.M, V3 = M.V3, h = VQ.h;
  const NAMES = ['דנה', 'רון', 'מיכל', 'יוסי', 'נועה', 'אבי', 'גיל', 'שיר', 'עמית', 'הילה', 'תום', 'ליאור', 'נדב', 'רוני', 'אורי', 'מאיה'];
  VQ.game({
    id: 'cables', chapter: 'before', title: 'משבר הכבלים',
    concept: 'מחיר ההפרדה הפיזית (מתג לכל מחלקה): ציוד, כבלים, זמן וחוסר גמישות – ומה VLAN חוסך',
    tagline: 'בעידן שלפני VLAN, כל מחלקה עם מתג משלה. עובדים עוברים בין מחלקות — ואתם הטכנאי שרץ עם הכבלים!',
    howto: [
      'מגיעות **בקשות מעבר**: "דנה עוברת לכספים". **לחצו על המחשב** (או על הכרטיס) ואז **על המתג של המחלקה החדשה**.',
      'הטכנאי הולך, מנתק ומחבר כבל — זה לוקח זמן וכסף (₪50). רק מעבר אחד בכל פעם!',
      'אין פורט פנוי במתג? **קנו הרחבה** (₪) בכפתורים למטה. אל תפספסו דדליין — שביעות הרצון יורדת.',
      'בסוף תגלו כמה זמן וכסף VLAN היה חוסך לכם 😉',
    ],
    stage: { bg: 0x0a1020 },
    levels: {
      easy: { depts: [10, 20, 30], per: 3, cap: 6, requests: 8, every: 8, deadline: 24, budget: 3500, lives: 5, ext: 500, stars: [350, 700, 1000] },
      mid: { depts: [10, 20, 30], per: 4, cap: 5, requests: 12, every: 5.8, deadline: 18, budget: 3000, lives: 4, ext: 650, stars: [900, 1700, 2500] },
      hard: { depts: [10, 20, 30, 99], per: 3, cap: 4, requests: 16, every: 4.2, deadline: 14, budget: 2600, lives: 3, ext: 800, stars: [2200, 4300, 6300] },
    },
    create(G) {
      const st = G.stage, cfg = G.cfg, D = cfg.depts;
      M.grid(st, 70, 0x16305a); M.stars(st, 200, 80);
      st.setCam([0, 20, 13], [0, 0, 1.2]);
      st.insetBottom = 0;
      // floor zones
      const office = M.zone(11, 15, 0x1e293b, 0.35); office.position.set(-7.5, 0.01, 0); st.add(office);
      const roomL = M.label('🏢 משרד', { size: 0.6, bg: 'rgba(8,13,28,.8)' }); roomL.position.set(-7.5, 0.3, -8.3); st.add(roomL);
      const rackL = M.label('🗄️ ארון תקשורת', { size: 0.6, bg: 'rgba(8,13,28,.8)' }); rackL.position.set(8.5, 0.3, -8.3); st.add(rackL);
      // racks
      const racks = D.map((v, k) => {
        const z = -6 + k * (12 / Math.max(1, D.length - 1)) * (D.length === 3 ? 1 : 1);
        const zz = D.length === 3 ? -6.5 + k * 6.5 : -8.2 + k * 5.5;
        const g = new THREE.Group(); g.position.set(8.5, 0, zz); g.rotation.y = -Math.PI / 2; st.add(g);
        const sw = M.device('switch', { ports: cfg.cap, pitch: 0.62, color: VQ.vhex(v) }); sw.scale.setScalar(1.0); g.add(sw);
        const ext = M.device('switch', { ports: 4, pitch: 0.62, color: VQ.vhex(v) }); ext.scale.setScalar(1.0); ext.position.set(0, 0.9, 0); ext.visible = false; g.add(ext);
        const lb = M.label(`SW ${VQ.VLANS[v].he}`, { size: 0.42, bg: VQ.vcss(v), color: '#04101a' }); lb.position.set(0, 2.0, 0.2); lb.rotation.set(0, 0, 0); g.add(lb);
        const hit = new THREE.Mesh(new THREE.BoxGeometry(cfg.cap * 0.85 + 0.6, 2.4, 1.6), new THREE.MeshBasicMaterial({ visible: false })); hit.position.set(0, 0.8, 0.4); g.add(hit);
        g.updateMatrixWorld(true);
        const slots = [];
        sw.ports.forEach((p, i) => slots.push({ node: sw, i, ok: true, pc: null, v }));
        ext.ports.forEach((p, i) => slots.push({ node: ext, i, ok: false, pc: null, v }));
        const r = { v, g, sw, ext, slots, hit, lb, extBought: false, tint: VQ.vhex(v) };
        slots.forEach((s) => { const w = s.node.localToWorld(s.node.ports[s.i].clone().add(V3(0, 0, 0.08))); s.pt = w; });
        return r;
      });
      // PCs (fixed desks)
      const pcs = []; let idx = 0;
      const cols = D.length, rows = cfg.per;
      const total = cols * rows; const pos = [];
      for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) pos.push([-11.5 + c * (cols === 4 ? 2.5 : 3.2), -5.5 + r * (rows === 4 ? 3.4 : 4.4) + (c % 2) * 0.6]);
      D.forEach((v, k) => { for (let r = 0; r < cfg.per; r++) {
        const name = NAMES[idx % NAMES.length], p = pos[idx];
        const obj = M.device('pc', { screen: VQ.vhex(v) }); obj.position.set(p[0], 0, p[1]); obj.rotation.y = Math.PI / 2 * 0.0 + Math.PI / 2; obj.scale.setScalar(1.05); st.add(obj);
        const lab = M.label(name, { size: 0.42, bg: 'rgba(8,13,28,.85)' }); lab.position.set(p[0], 1.9, p[1]); st.add(lab);
        const pcO = { id: idx, name, dept: v, obj, lab, cable: null, slot: null, pos: V3(p[0] + 0.6, 0.5, p[1]), busy: false, req: null, glow: null };
        st.pickable(obj, () => selectPc(pcO), { onHover: () => {} });
        pcs.push(pcO); idx++;
      } });
      // initial wiring
      pcs.forEach((pc) => { const rk = racks.find((r) => r.v === pc.dept); const s = rk.slots.find((x) => x.ok && !x.pc); plug(pc, rk, s, true); });
      function plug(pc, rk, slot, instant) {
        if (pc.cable) { st.remove(pc.cable); pc.cable.geometry.dispose(); }
        if (pc.slot) pc.slot.pc = null;
        slot.pc = pc; pc.slot = slot; pc.dept = rk.v;
        const lat = (Math.random() - 0.5) * 6;
        pc.cable = M.cable(pc.pos.clone(), slot.pt.clone(), { color: rk.tint, glow: true, sag: 0.02, lat, r: 0.05 }); st.add(pc.cable);
        slot.node.setPort(slot.i, rk.tint, true);
        pc.obj.screen.material.color.setHex(rk.tint); pc.obj.screen.material.emissive.setHex(rk.tint);
      }
      function unplug(pc) { if (pc.cable) { st.remove(pc.cable); pc.cable.geometry.dispose(); pc.cable = null; } if (pc.slot) { pc.slot.node.setPort(pc.slot.i, 0x334155, false); pc.slot.pc = null; pc.slot = null; } }
      racks.forEach((rk) => { st.pickable(rk.g, () => clickRack(rk), { onHover: () => {} }); });
      // hero
      const hero = M.avatar(VQ.store.data.color); hero.position.set(0, 0, 8); hero.scale.setScalar(1.2); st.add(hero);
      st.onUpdate((dt) => hero.tick(dt));
      // state
      let budget = cfg.budget, sel = null, busy = false, doneCount = 0, spawned = 0, spawnT = 2;
      const reqs = []; const stats = { done: 0, late: 0, minutes: 0, money: 0, purchases: 0 };
      const bar = h('div', { class: 'row', style: { justifyContent: 'center', width: '100%' } });
      G.ui.bottom.append(bar);
      const tickets = h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', pointerEvents: 'auto' } });
      G.ui.task.innerHTML = ''; G.ui.task.append(tickets); G.ui.task.style.top = '64px';
      const budgetEl = h('span', { class: 'chip', style: { pointerEvents: 'none' } }, '');
      function renderBar() {
        bar.innerHTML = ''; bar.append(budgetEl);
        racks.forEach((rk) => { if (!rk.extBought) bar.append(h('button', { class: 'btn amber sm', disabled: budget < cfg.ext, onClick: () => buyExt(rk) }, `🛒 הרחבה ל${VQ.VLANS[rk.v].he} ₪${cfg.ext}`)); });
        budgetEl.textContent = '💰 תקציב: ₪' + VQ.fmt(budget);
      }
      function buyExt(rk) {
        if (budget < cfg.ext || rk.extBought) return; budget -= cfg.ext; stats.money += cfg.ext; stats.purchases++; rk.extBought = true; VQ.sfx.play('coin');
        rk.ext.visible = true; rk.ext.scale.setScalar(0.01); st.tween(rk.ext.scale, { x: 1, y: 1, z: 1 }, 0.6, { ease: 'back' });
        rk.slots.forEach((s) => { if (s.node === rk.ext) s.ok = true; }); G.msg('🛒 הרחבה הותקנה', '#fbbf24'); renderBar();
      }
      function newReq() {
        const cand = pcs.filter((p) => !p.req && !p.busy); if (!cand.length) return;
        const pc = VQ.pick(cand); const tgts = D.filter((v) => v !== pc.dept); const target = VQ.pick(tgts);
        const r = { pc, target, left: cfg.deadline, el: null, done: false };
        pc.req = r; reqs.push(r); spawned++;
        r.el = h('div', { class: 'chip', style: { cursor: 'pointer', borderColor: VQ.vcss(target), flexDirection: 'column', gap: '2px', padding: '5px 10px' }, onClick: () => selectPc(pc) },
          h('div', { style: { fontSize: '13px' } }, `👤 ${pc.name} → `, h('b', { style: { color: VQ.vcss(target) } }, VQ.VLANS[target].he)), h('div', { class: 'tm', style: { fontSize: '12px', color: '#fbbf24' } }, ''));
        tickets.append(r.el);
        pc.glow = M.glow(VQ.vhex(target), 3.2, 0.9); pc.glow.position.set(pc.obj.position.x, 1, pc.obj.position.z); st.add(pc.glow);
        VQ.sfx.play('pop'); VQ.fx.float(st, V3(pc.obj.position.x, 2.6, pc.obj.position.z), '📥 בקשה חדשה', '#fde68a', 0.5);
      }
      function selectPc(pc) {
        if (busy || G.ended || !G.running) return;
        if (!pc.req) { G.msg('אין בקשה למחשב הזה', '#94a3b8'); return; }
        sel = pc; VQ.sfx.play('click');
        pcs.forEach((p) => { p.obj.scale.setScalar(p === pc ? 1.3 : 1.05); });
        G.setTask('');
        G.ui.task.append(tickets);
        VQ.fx.float(st, V3(pc.obj.position.x, 3.2, pc.obj.position.z), '👉 עכשיו לחצו על המתג', '#fde68a', 0.45);
      }
      async function clickRack(rk) {
        if (busy || G.ended || !G.running) return;
        if (!sel) { G.msg('קודם בחרו מחשב', '#94a3b8'); VQ.sfx.play('bad'); return; }
        const pc = sel, r = pc.req;
        if (rk.v !== r.target) { G.miss(0); G.msg('המתג הלא נכון! 🙈', '#f87171'); return; }
        const slot = rk.slots.find((s) => s.ok && !s.pc);
        if (!slot) { G.msg('אין פורט פנוי! קנו הרחבה 🛒', '#fbbf24'); VQ.sfx.play('bad'); return; }
        if (budget < 50) { G.msg('אין תקציב לכבל!', '#f87171'); return; }
        busy = true; sel = null; pcs.forEach((p) => p.obj.scale.setScalar(1.05));
        budget -= 50; stats.money += 50; renderBar();
        // hero: walk to pc, unplug, walk to rack, plug
        hero.userData.walking = true;
        const walk = async (x, z) => { const dx = x - hero.position.x, dz = z - hero.position.z; hero.rotation.y = Math.atan2(dx, dz); await st.tween(hero.position, { x, z }, Math.hypot(dx, dz) / 9, { ease: 'lin' }); };
        await walk(pc.obj.position.x + 1.8, pc.obj.position.z);
        hero.userData.walking = false; VQ.sfx.play('click'); unplug(pc); await st.wait(0.5);
        hero.userData.walking = true; await walk(rk.g.position.x - 2.6, rk.g.position.z + (slot.pt.x * 0));
        hero.userData.walking = false; await st.wait(0.4); VQ.sfx.play('ok');
        plug(pc, rk, slot);
        // finish request
        r.done = true; pc.req = null; if (pc.glow) { st.remove(pc.glow); pc.glow = null; } r.el.remove(); reqs.splice(reqs.indexOf(r), 1);
        const bonus = Math.max(0, Math.round(r.left * 6)); stats.done++;
        G.hit(100 + bonus, V3(pc.obj.position.x, 2.5, pc.obj.position.z));
        stats.minutes += 45; busy = false; check();
      }
      function check() {
        if (spawned >= cfg.requests && !reqs.length && !busy) {
          const left = Math.round(budget / 10);
          G.end({
            completed: true, bonus: left, perfect: stats.late === 0,
            title: stats.late === 0 ? 'טכנאי על! ⚡' : 'סיימתם את היום',
            stats: [['מעברים שבוצעו', stats.done], ['דדליינים שפוספסו', stats.late], ['זמן עבודה פיזית', stats.minutes + ' דקות'], ['כסף שהוצא', '₪' + VQ.fmt(stats.money)], ['הרחבות שנקנו', stats.purchases], ['עם VLAN: כבלים שהוזזו / זמן / עלות', `0 / 0 דקות / ₪0`]],
            review: [['הפרדה פיזית: מתג לכל מחלקה', 'כל מעבר = טכנאי, כבל וזמן; פורטים נגמרים – ומשלמים על מתג חדש'], ['עם VLAN', 'משנים את ה-VLAN של הפורט בהגדרה – בלי לזוז מהכיסא']],
            note: `עם VLAN, כל ${stats.done} המעברים האלה היו נעשים בשורה אחת בהגדרה — בלי טכנאי, בלי כבלים ובלי ₪${VQ.fmt(stats.money)}.`,
          });
        }
      }
      G.dbg = { pcs, racks, selectPc, clickRack, get reqs() { return reqs; } };
      G.ctl = {
        start() { renderBar(); G.setMid('בקשות', `0/${cfg.requests}`); },
        update(dt) {
          spawnT -= dt; if (spawnT <= 0 && spawned < cfg.requests && reqs.length < (cfg.lives >= 5 ? 3 : cfg.lives >= 4 ? 4 : 5)) { newReq(); spawnT = cfg.every * VQ.rand(0.8, 1.15); }
          for (let i = reqs.length - 1; i >= 0; i--) {
            const r = reqs[i]; if (busy && sel === null && r.pc.busy) continue; r.left -= dt;
            r.el.lastChild.textContent = '⏱ ' + Math.max(0, Math.ceil(r.left)) + ' שנ׳';
            r.el.style.background = r.left < 5 ? 'rgba(248,113,113,.3)' : '';
            if (r.left <= 0) {
              stats.late++; r.pc.req = null; if (r.pc.glow) { st.remove(r.pc.glow); r.pc.glow = null; } r.el.remove(); reqs.splice(i, 1);
              G.addScore(-60, V3(r.pc.obj.position.x, 2.5, r.pc.obj.position.z)); G.combo = 0; G.msg('⏰ פספסתם דדליין', '#f87171'); G.loseLife(); if (sel === r.pc) sel = null;
              if (!G.ended) check();
            }
          }
          G.setMid('בקשות', `${stats.done + stats.late}/${cfg.requests}`);
          if (budget < 50 && !busy && !G.ended) { /* out of money: fail */ if (reqs.length) G.end({ completed: false, title: 'נגמר התקציב 💸', note: 'הפרדה פיזית עולה בכסף — בדיוק הסיבה שהמציאו VLAN.' }); }
        },
      };
      return G.ctl;
    },
  });
})(window.VQ);
