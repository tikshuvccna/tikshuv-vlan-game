/* Lesson 4 – trunks and 802.1Q tagging */
(function (VQ) {
  const M = VQ.M, V3 = M.V3;
  const NAMES = { s1: 'דנה', f1: 'יוסי', g1: 'אורח 1', s2: 'רון', f2: 'נועה', g2: 'אורח 2' };
  const VL = { s1: 10, f1: 20, g1: 30, s2: 10, f2: 20, g2: 30 };
  function reset(L) {
    L.net.group.visible = true; if (L.frame) L.frame.visible = false;
    L.trunk.allowed = null; L.trunk.native = 1; L.net.paintLink(L.trunk);
    Object.values(L.net.nodes).forEach((n) => { n.setBadge(null); n.setGlow(null); });
  }
  VQ.lesson('trunk', {
    build(L) {
      const st = L.stage; M.grid(st, 80, 0x16305a); M.stars(st, 300, 80);
      const net = L.net = L.makeNet();
      const sw1 = net.addNode('sw1', 'switch', [-6, 0, -2], { ports: 4, pitch: 1.2, label: 'SW1 • קומה 1' });
      const sw2 = net.addNode('sw2', 'switch', [6, 0, -2], { ports: 4, pitch: 1.2, label: 'SW2 • קומה 2' });
      const offs = [-2.4, -0.8, 0.8, 2.4];
      [['s1', 0], ['f1', 1], ['g1', 2]].forEach(([id, i]) => { const h = net.addNode(id, id === 'g1' ? 'laptop' : 'pc', [-6 + offs[i], 0, 3], { label: NAMES[id], vlan: VL[id], screen: VQ.vhex(VL[id]), scale: 0.9 }); const l = net.link(id, 'sw1', { bPort: i }); l.mode = 'access'; l.vlan = VL[id]; sw1.obj.setPort(i, VQ.vhex(VL[id])); });
      [['s2', 1], ['f2', 2], ['g2', 3]].forEach(([id, i]) => { const h = net.addNode(id, id === 'g2' ? 'laptop' : 'pc', [6 + offs[i], 0, 3], { label: NAMES[id], vlan: VL[id], screen: VQ.vhex(VL[id]), scale: 0.9 }); const l = net.link(id, 'sw2', { bPort: i }); l.mode = 'access'; l.vlan = VL[id]; sw2.obj.setPort(i, VQ.vhex(VL[id])); });
      L.trunk = net.link('sw1', 'sw2', { aPort: 3, bPort: 0, sag: 0.02, mode: 'trunk' });
      net.setVlanMode(true); sw1.obj.setPort(3, 0xfde047); sw2.obj.setPort(0, 0xfde047);
      // frame anatomy (hidden until step 5)
      const fr = L.frame = new THREE.Group(); fr.visible = false; st.add(fr);
      L.blocks = {};
      [['DA', 1.7, 0x475569, 'יעד MAC\n6 בייט'], ['SA', 1.7, 0x64748b, 'מקור MAC\n6 בייט'], ['TAG', 1.5, 0xfde047, 'תג 802.1Q\n4 בייט'], ['TYPE', 1.1, 0x7c3aed, 'Type\n2 בייט'], ['DATA', 3.4, 0x0e7490, 'מטען (IP…)\n46–1500 בייט'], ['FCS', 1.2, 0x9f1239, 'FCS\n4 בייט']].forEach(([k, w, c, t]) => {
        const g = new THREE.Group(); const b = M.box(w - 0.08, 0.8, 0.5, c, { e: c, ei: 0.25 }); g.add(b);
        const lb = M.label(k, { size: 0.5, color: '#fff' }); lb.position.set(0, 0, 0.35); g.add(lb);
        const sub = M.label(t, { size: 0.3, color: '#cbd5e1' }); sub.position.set(0, -0.85, 0.2); g.add(sub);
        g.userData.w = w; fr.add(g); L.blocks[k] = g;
      });
      st.setCam([0, 8, 13.5], [0, 0.5, 0.5]);
    },
    steps: [
      {
        t: 'שתי קומות, אותם VLAN-ים',
        x: 'בקומה 1 ובקומה 2 יש עובדי מכירות, כספים ואורחים. כל VLAN צריך להתחבר גם בין המתגים. **בלי Trunk** זה אומר כבל נפרד (ופורט נפרד בשני המתגים) לכל VLAN — 3 VLAN-ים, 3 כבלים. ועם 50 VLAN-ים?',
        enter(L) {
          reset(L); L.cam([0, 8, 13.5], [0, 0.5, 0.5]);
          L.trunk.cable.visible = false;
          [[10, 0.35], [20, 0.75], [30, 1.15]].forEach(([v, dz], i) => {
            const a = V3(-3.9, 0.3 + i * 0.05, -1.55 + dz * 0.0), b = V3(3.9, 0.3 + i * 0.05, -1.55);
            const c = M.cable(V3(-4.1, 0.25, -1.4 + i * 0.35), V3(4.1, 0.25, -1.4 + i * 0.35), { color: VQ.vhex(v), glow: true, sag: 0.0, r: 0.05 });
            c.scale.set(1, 1, 1); c.position.y = 0; L.addTemp(c);
            const lb = M.label('כבל VLAN ' + v, { size: 0.32, bg: VQ.vcss(v), color: '#04101a' }); lb.position.set(0, 0.7 + i * 0.6, -1.4 + i * 0.35); L.addTemp(lb);
          });
          L.onCleanup(() => { L.trunk.cable.visible = true; });
          VQ.bigNote(L, '3 VLAN = 3 כבלים = 6 פורטים 😩', [0, 3.4, -3], { border: '#f87171' });
        },
      },
      {
        t: 'Trunk: כבל אחד לכולם',
        x: '**Trunk** הוא קישור אחד שנושא **את כל ה-VLAN-ים יחד**. כמו אוטוסטרדה עם נתיבים צבעוניים. כדי שהמתג הקולט ידע לאיזה VLAN שייכת כל חבילה, כל פריים מקבל **תג** (Tag). מגדירים: `switchport mode trunk`.',
        enter(L) {
          reset(L); L.cam([0, 7, 11], [0, 0.5, -1]);
          L.trunk.cable.scale.set(1, 1, 1);
          VQ.bigNote(L, 'Trunk 🛣️ 802.1Q', [0, 3.4, -2], { border: '#fde047' });
          (async () => {
            const t = L.trunk, vs = [10, 20, 30, 10, 20, 30];
            let i = 0;
            while (true) {
              const v = vs[i % vs.length], fwd = i % 2 === 0;
              L.net.hop(fwd ? t.a : t.b, t, { color: VQ.vhex(v), tag: VQ.vhex(v), speed: 3.2, size: 0.28 });
              i++; await L.wait(0.55);
            }
          })();
        },
      },
      {
        t: 'Access מול Trunk',
        x: '**Access Port** — VLAN אחד, פריימים **בלי תג**, מחובר למחשב/מדפסת/טלפון.\n**Trunk Port** — הרבה VLAN-ים, פריימים **עם תג**, מחבר בין מתגים/נתבים/AP.\nהמחשב בכלל לא יודע על VLAN — התג נוסף ומוסר על-ידי המתג.',
        prompt: 'לחצו על 3 כבלים כדי לגלות את סוגם',
        enter(L) {
          reset(L); L.cam([0, 8, 13.5], [0, 0.5, 0.5]);
          const seen = new Set();
          L.net.links.forEach((lk, idx) => {
            L.stage.pickable(lk.cable, () => {
              const trunk = lk.mode === 'trunk', mid = lk.cable.userData.curve.getPoint(0.5);
              const txt = trunk ? 'Trunk • הרבה VLAN • עם תג' : `Access • VLAN ${lk.vlan} • בלי תג`;
              const lb = M.label(txt, { size: 0.36, bg: trunk ? '#fde047' : VQ.vcss(lk.vlan), color: '#04101a' }); lb.position.set(mid.x, mid.y + 1.2, mid.z + (trunk ? -1.5 : 0)); L.addTemp(lb); VQ.sfx.play('click');
              seen.add(idx); if (seen.size >= 3) L.unlock();
            }, { onHover: () => {} });
          });
        },
      },
      {
        t: 'מסע של פריים',
        x: 'עקבו אחרי הפריים: יוצא מהמחשב **בלי תג** ← נכנס ל-Access Port ב-SW1 ← SW1 **מוסיף תג** עם מספר ה-VLAN ← עובר ב-Trunk ← SW2 קורא את התג, **מסיר אותו**, ומוסר רק לפורטים של אותו VLAN.',
        prompt: 'לחצו על מחשב בקומה 1 כדי לשלוח פריים',
        enter(L) {
          reset(L); L.cam([0, 8, 13.5], [0, 0.5, 0.5]);
          let busy = false;
          ['s1', 'f1', 'g1'].forEach((id) => L.stage.pickable(L.net.nodes[id].obj, async () => {
            if (busy) return; busy = true;
            const dst = { s1: 's2', f1: 'f2', g1: 'g2' }[id], path = L.net.findPath(id, dst);
            const cap = (txt, pos, col = '#fff') => VQ.fx.float(L.stage, V3(pos.x, 2.6, pos.z), txt, col, 0.5);
            cap('1️⃣ פריים רגיל, בלי תג', L.net.nodes[id].pos);
            await L.net.sendPath(path, {
              colorByVlan: false, color: 0xffffff, speed: 3.6,
              onNode: (n, i) => {
                if (n.id === 'sw1') { cap(`2️⃣ SW1 מוסיף תג VLAN ${VL[id]}`, V3(-2, 0, -2), '#fde047'); VQ.sfx.play('pop'); }
                if (n.id === 'sw2') { cap('3️⃣ SW2 מסיר את התג', V3(2, 0, -2), '#86efac'); VQ.sfx.play('pop'); }
                if (n.id === dst) { n.mark(true, '4️⃣ נמסר!'); n.pulse(VQ.vhex(VL[id])); VQ.sfx.play('ok'); }
              },
            });
            busy = false; L.unlock();
          }));
        },
      },
      {
        t: 'איך נראה התג?',
        x: 'התג של **802.1Q** מוסיף לפריים **4 בייט** בין כתובת ה-MAC המקור ל-Type: **TPID** (16 ביט, תמיד `0x8100`), **PCP** (3 ביט, עדיפות/QoS), **DEI** (1 ביט) ו-**VLAN ID** (12 ביט) — מכאן 4094 VLAN-ים אפשריים.',
        enter(L) {
          reset(L); L.net.group.visible = false; L.frame.visible = true; L.cam([0, 3.6, 10], [0, 1.6, 0]);
          const order = ['DA', 'SA', 'TYPE', 'DATA', 'FCS'];
          const place = (withTag) => {
            const seq = withTag ? ['DA', 'SA', 'TAG', 'TYPE', 'DATA', 'FCS'] : order;
            const total = seq.reduce((a, k) => a + L.blocks[k].userData.w, 0); let x = -total / 2;
            seq.forEach((k) => { const g = L.blocks[k], w = g.userData.w; L.stage.tween(g.position, { x: x + w / 2 }, 0.7, { ease: 'io' }); x += w; });
          };
          Object.values(L.blocks).forEach((g) => { g.position.set(0, 2, 0); g.visible = true; });
          L.blocks.TAG.position.set(0, 4.2, 0); L.blocks.TAG.visible = false;
          place(false);
          const note = VQ.bigNote(L, 'פריים Ethernet רגיל', [0, 4.2, 0], { size: 0.5 });
          L.wait(1.6).then(() => {
            L.blocks.TAG.visible = true; place(true); L.tw(L.blocks.TAG.position, { y: 2 }, 0.7, { ease: 'bounce' });
            VQ.sfx.play('level');
            VQ.bigNote(L, 'נוסף תג!', [0, 5.1, 0], { size: 0.5, border: '#fde047' });
            [['TPID\n0x8100', -3.6], ['PCP\n3 ביט', -1.2], ['DEI\n1 ביט', 1.2], ['VLAN ID\n12 ביט', 3.6]].forEach(([t, x], i) => L.wait(0.9 + i * 0.3).then(() => VQ.bigNote(L, t, [x, 0.2, 0.6], { size: 0.42, border: '#fde047' })));
          });
        },
      },
      {
        t: 'Native VLAN — התעבורה ללא תג',
        x: 'פריים שמגיע ב-Trunk **בלי תג** מקבל את ה-**Native VLAN** (ברירת מחדל: VLAN 1). חשוב ששני צידי ה-Trunk יסכימו על אותו Native VLAN, אחרת התעבורה "מדלגת" ל-VLAN הלא נכון. Best practice: להחליף ל-VLAN שלא בשימוש (למשל 999): `switchport trunk native vlan 999`.',
        enter(L) {
          reset(L); L.cam([0, 7, 11], [0, 0.5, -1]);
          (async () => {
            const t = L.trunk;
            VQ.bigNote(L, 'Native VLAN 1 = ללא תג', [0, 3.6, -2], { border: '#e2e8f0' });
            for (let k = 0; k < 3; k++) { L.net.hop(t.a, t, { color: 0xe2e8f0, speed: 3, size: 0.3 }); await L.wait(0.9); }
            await L.wait(1);
            VQ.bigNote(L, '⚠️ SW1: native 1  |  SW2: native 99  ← אי־התאמה!', [0, 5.2, -2], { border: '#f87171', size: 0.5 });
            VQ.sfx.play('alarm');
            L.net.hop(t.a, t, { color: 0xe2e8f0, speed: 3, size: 0.3 }).then(() => { L.net.nodes.sw2.mark(false, 'VLAN לא נכון!'); });
          })();
        },
      },
      {
        t: 'Allowed VLANs — מי עובר ב-Trunk',
        x: 'ברירת המחדל: כל ה-VLAN-ים מורשים ב-Trunk. מטעמי אבטחה ויעילות מגבילים: `switchport trunk allowed vlan 10,20`. VLAN 30 (אורחים) כבר לא יעבור לקומה 2.',
        prompt: 'לחצו על אורח 1 כדי לנסות לשלוח דרך ה-Trunk',
        enter(L) {
          reset(L); L.cam([0, 8, 13.5], [0, 0.5, 0.5]);
          L.trunk.allowed = [10, 20];
          const lb = M.label('Trunk: allowed vlan 10,20', { size: 0.4, bg: '#fde047', color: '#04101a' }); lb.position.set(0, 2.4, -1.5); L.addTemp(lb);
          const g = L.net.nodes.g1; let busy = false;
          L.stage.pickable(g.obj, async () => {
            if (busy) return; busy = true;
            const ok = await L.net.ping('g1', 'g2', { colorByVlan: true });
            VQ.fx.float(L.stage, V3(-2, 2.6, -2), '🚫 VLAN 30 לא מורשה ב-Trunk', '#fca5a5', 0.55); VQ.sfx.play('bad');
            const ok2 = await L.net.ping('s1', 's2', { colorByVlan: true });
            if (ok2) { L.net.nodes.s2.mark(true); VQ.sfx.play('ok'); }
            busy = false; L.unlock();
          });
        },
      },
      {
        t: 'בדיקת הבנה',
        x: '',
        q: { q: 'מה ההבדל העיקרי בין Access Port ל-Trunk Port?', o: ['Access נושא הרבה VLAN עם תג, Trunk נושא VLAN אחד', 'Access שייך ל-VLAN אחד (בלי תג), Trunk נושא הרבה VLAN-ים עם תג', 'אין הבדל, זה רק שם', 'Trunk עובד רק מול מחשבים'], a: 1, why: 'Access = VLAN יחיד לציוד קצה. Trunk = הרבה VLAN-ים עם תג 802.1Q בין התקני רשת.' },
        enter(L) { reset(L); L.cam([0, 8, 13.5], [0, 0.5, 0.5]); },
      },
    ],
  });
})(window.VQ);
