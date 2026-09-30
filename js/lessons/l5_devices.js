/* Lesson 5 – which devices work with VLANs */
(function (VQ) {
  const M = VQ.M, V3 = M.V3;
  const VERD = { aware: ['✅ מבין VLAN', 0x4ade80, '#4ade80'], unaware: ['🟡 חבר ב-VLAN, אבל לא מודע', 0xfbbf24, '#fbbf24'], no: ['⛔ לא תומך VLAN', 0xf87171, '#f87171'] };
  // tagIn/tagOut -> demo packet colours; 'garble' shows a device that can't read tags
  const DEV = [
    { id: 'l2', type: 'switch', o: { ports: 6, pitch: 0.5 }, v: 'aware', name: 'מתג L2 מנוהל', t: 'מתג שכבה 2 מנוהל', x: 'כאן VLAN נולד. המתג **יוצר VLAN-ים**, מקצה פורטים (Access), מפעיל Trunk עם תגי 802.1Q ומפריד Broadcast Domains. הוא **לא מנתב** בין VLAN-ים — רק מעביר בתוך כל VLAN. (דוגמה: Catalyst 2960)', demo: [10, 10], sub: 'Access + Trunk' },
    { id: 'l3', type: 'l3', o: { ports: 6, pitch: 0.5 }, v: 'aware', name: 'מתג L3', t: 'מתג L3 — מתג שגם מנתב', x: 'מתג שכבה 3 יודע גם לנתב. לכל VLAN יוצרים ממשק וירטואלי **SVI** (`interface vlan 10` + כתובת IP) ומפעילים `ip routing`. הוא מנתב בין ה-VLAN-ים במהירות חומרה, ומשמש כ-Default Gateway. (Catalyst 3560/3650/9300)', demo: [10, 20], sub: 'SVI + ניתוב' },
    { id: 'router', type: 'router', o: {}, v: 'aware', name: 'נתב', t: 'נתב — Router-on-a-Stick', x: 'נתב לא מפריד VLAN-ים, אבל יכול "להבין" תגים על **ממשק פיזי אחד**: לכל VLAN יוצרים Sub-interface (`interface g0/0.10`, `encapsulation dot1Q 10`). הוא משמש Default Gateway ומנתב בין ה-VLAN-ים.', demo: [10, 20], sub: 'Sub-interfaces' },
    { id: 'ap', type: 'ap', o: {}, v: 'aware', name: 'נקודת גישה (AP)', t: 'נקודת גישה אלחוטית (AP)', x: 'ה-AP ממפה כל **SSID ל-VLAN**: רשת "Staff" ל-VLAN 10, רשת "Guest" ל-VLAN 30. הוא מתחבר למתג ב-**Trunk**, ובצד האלחוטי המחשבים בכלל לא מודעים לתגים.', demo: [30, 30], sub: 'SSID ↔ VLAN', extra: 'ap' },
    { id: 'phone', type: 'phone', o: {}, v: 'aware', name: 'טלפון IP', t: 'טלפון IP — שני VLAN-ים בפורט אחד', x: 'בתוך הטלפון יש מתג קטן, והמחשב מתחבר אליו. הטלפון מתייג את תעבורת הקול ב-**Voice VLAN** (`switchport voice vlan 50`) ומעביר את המחשב **בלי תג** ב-Data VLAN. כך שני VLAN-ים חיים על אותו פורט.', demo: [50, 50], sub: 'Voice VLAN', extra: 'phone' },
    { id: 'fw', type: 'firewall', o: {}, v: 'aware', name: 'חומת אש', t: 'חומת אש (Firewall)', x: 'חומת אש מחלקת ממשק פיזי לתת־ממשקים לפי VLAN (אזורי אבטחה), ומחילה מדיניות בין VLAN-ים: מי מדבר עם מי, מה חוסמים, איפה ה-DMZ. כאן ההפרדה של VLAN הופכת לאבטחה אמיתית.', demo: [30, 20], sub: 'Zones + מדיניות' },
    { id: 'srv', type: 'hypervisor', o: {}, v: 'aware', name: 'שרת וירטואליזציה', t: 'שרת וירטואליזציה (ESXi / Hyper-V)', x: 'כרטיס הרשת של השרת עובד ב-**Trunk**, ולכל מכונה וירטואלית מוצמד VLAN משלה (Port Group). כאן דווקא ה-NIC של השרת הוא זה שמתייג.', demo: [20, 20], sub: 'NIC ב-Trunk' },
    { id: 'end', type: 'pc', o: { screen: 0x94a3b8 }, v: 'unaware', name: 'מחשב, מדפסת, מצלמה', t: 'ציוד קצה — לא יודע כלום', x: 'מחשבים, מדפסות ומצלמות שולחים פריימים **רגילים, בלי תג**. הם לא יודעים שיש VLAN. החברות ב-VLAN נקבעת אך ורק על-ידי הפורט במתג שאליו הם מחוברים.', demo: [0, 0], sub: 'הפורט מחליט', extra: 'end' },
    { id: 'old', type: 'hub', o: {}, v: 'no', name: 'Hub / Repeater / מתג לא מנוהל', t: 'מי לא יכול לעבוד עם VLAN', x: '**Hub** ו-**Repeater** מעתיקים אותות לכולם — אין להם שום הבנה של פריימים. **מתג לא מנוהל** (Unmanaged) מעביר פריימים אבל אי אפשר להגדיר בו VLAN-ים. כל מה שמחובר אחריו נמצא באותו VLAN של הפורט שמחובר אליו.', demo: 'garble', sub: 'אין הגדרות', extra: 'old' },
  ];
  const SP = 4.8;
  VQ.lesson('devices', {
    stage: { fogNear: 40, fogFar: 120 },
    build(L) {
      const st = L.stage; M.grid(st, 120, 0x16305a); M.stars(st, 400, 90);
      L.devs = {};
      const x0 = -(DEV.length - 1) * SP / 2;
      DEV.forEach((d, i) => {
        const g = new THREE.Group(); g.position.set(x0 + i * SP, 0, 0);
        const ped = M.cyl(2.2, 2.4, 0.35, 0x0f1a33, {}, 32); ped.position.y = 0.05; g.add(ped);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(2.25, 0.07, 8, 40), M.mat2(0x334155, { e: 0x334155, ei: 0.3 })); ring.rotation.x = Math.PI / 2; ring.position.y = 0.24; g.add(ring);
        let dev;
        if (d.id === 'end') {
          dev = new THREE.Group(); [['pc', -1.1], ['printer', 0.1], ['cam', 1.3]].forEach(([tp, x]) => { const m = M.device(tp, { screen: 0x94a3b8 }); m.position.set(x, 0.25, 0); m.scale.setScalar(0.8); dev.add(m); });
        } else if (d.id === 'old') {
          dev = new THREE.Group(); [['hub', -1.2], ['repeater', 0.1], ['unmanaged', 1.4]].forEach(([tp, x]) => { const m = M.device(tp, {}); m.position.set(x, 0.25, tp === 'unmanaged' ? 0.2 : 0); m.scale.setScalar(tp === 'unmanaged' ? 0.55 : 0.6); dev.add(m); });
        } else {
          dev = M.device(d.type, d.o); dev.position.y = 0.25; dev.scale.setScalar(d.type === 'switch' || d.type === 'l3' ? 1.15 : 1.35);
          if (d.extra === 'phone') { const pc = M.device('pc', { screen: 0x38bdf8 }); pc.position.set(1.4, 0.25, -0.6); pc.scale.setScalar(0.7); g.add(pc); dev.position.x = -0.8; }
        }
        g.add(dev);
        const name = M.label(d.name, { size: 0.5, bg: 'rgba(8,13,28,.88)', color: '#fff' }); name.position.set(0, 0.3, 3.0); g.add(name);
        const verdict = M.label(VERD[d.v][0], { size: 0.44, bg: VERD[d.v][2], color: '#04101a' }); verdict.position.set(0, 4.3, 0); verdict.visible = false; g.add(verdict);
        if (d.extra === 'ap') {
          [['Staff → VLAN 10', 10, -0.9], ['Guest → VLAN 30', 30, 0.9]].forEach(([t, v, x]) => { const l = M.label('📶 ' + t, { size: 0.36, bg: VQ.vcss(v), color: '#04101a' }); l.position.set(x * 1.6, 2.6, 0.8); l.visible = false; l.userData.ex = true; g.add(l); });
        }
        if (d.extra === 'phone') { const l = M.label('🎧 קול: VLAN 50 (עם תג)', { size: 0.34, bg: VQ.vcss(50), color: '#04101a' }); l.position.set(-0.8, 2, 0.8); l.visible = false; l.userData.ex = true; g.add(l); const l2 = M.label('💻 מחשב: VLAN 10 (בלי תג)', { size: 0.34, bg: VQ.vcss(10), color: '#04101a' }); l2.position.set(1.4, 2.2, 0.8); l2.visible = false; l2.userData.ex = true; g.add(l2); }
        st.add(g); L.devs[d.id] = { g, ring, verdict, x: g.position.x, dev };
        st.onUpdate((dt, t) => { dev.rotation.y = Math.sin(t * 0.7 + i) * 0.3; });
      });
      st.setCam([0, 13, 33], [0, 0, 0]);
    },
    steps: [].concat([{
      t: 'סיור בין המכשירים',
      x: 'לא כל מכשיר ברשת מכיר VLAN. חלקם **מגדירים ומבינים** תגי VLAN, חלקם **חברים ב-VLAN בלי לדעת**, וחלקם **לא יכולים בכלל**. בואו נכיר אחד אחד — לכל מכשיר נראה מה הוא עושה עם ה-VLAN.',
      enter(L) { Object.values(L.devs).forEach((d) => { d.verdict.visible = false; d.g.children.forEach((c) => { if (c.userData.ex) c.visible = false; }); d.ring.material.color.setHex(0x334155); d.ring.material.emissive.setHex(0x334155); }); L.cam([0, 13, 33], [0, 0, 0]); },
    }], DEV.map((d) => ({
      t: d.t, x: d.x,
      enter(L) {
        const D = L.devs[d.id];
        Object.values(L.devs).forEach((o) => { o.g.children.forEach((c) => { if (c.userData.ex) c.visible = false; }); });
        D.verdict.visible = true; D.ring.material.color.setHex(VERD[d.v][1]); D.ring.material.emissive.setHex(VERD[d.v][1]);
        L.cam([D.x, 4.4, 9.5], [D.x, 0.7, 0]); VQ.sfx.play('pop');
        D.g.children.forEach((c) => { if (c.userData.ex) c.visible = true; });
        VQ.fx.ring(L.stage, V3(D.x, 0.3, 0), VERD[d.v][1], 2.6, 0.9);
        const sub = VQ.bigNote(L, d.sub, [D.x, 3.4, 1.8], { size: 0.42, border: VERD[d.v][2] });
        // packet demo
        (async () => {
          while (true) {
            const p = M.packet({ color: 0xffffff, size: 0.3 }); L.addTemp(p);
            const y = 1.0, z = 1.6; p.position.set(D.x - 4, y, z);
            const dm = d.demo;
            if (dm === 'garble') { p.setTag(VQ.vhex(10)); p.setColor(VQ.vhex(10)); }
            else if (dm[0]) { p.setTag(VQ.vhex(dm[0])); p.setColor(VQ.vhex(dm[0])); }
            await L.tw(p.position, { x: D.x }, 1.1, { ease: 'lin' });
            if (dm === 'garble') { VQ.fx.float(L.stage, V3(D.x, 2.6, z), '❓ לא קורא תג', '#fca5a5', 0.45); p.setTag(null); p.setColor(0x64748b); }
            else if (dm[0] !== dm[1]) { p.setTag(dm[1] ? VQ.vhex(dm[1]) : null); p.setColor(dm[1] ? VQ.vhex(dm[1]) : 0xffffff); VQ.fx.ring(L.stage, V3(D.x, 0.4, z), dm[1] ? VQ.vhex(dm[1]) : 0xffffff, 1.2, 0.5); }
            else if (!dm[0]) { p.setTag(null); }
            await L.tw(p.position, { x: D.x + 4 }, 1.1, { ease: 'lin' });
            L.stage.remove(p);
            await L.wait(0.4);
          }
        })();
      },
    })), [{
      t: 'טבלת סיכום',
      x: 'זכרו: **מבינים VLAN** — מתג L2, מתג L3, נתב, AP, טלפון IP, חומת אש, שרת וירטואליזציה. **לא מודעים** — מחשבים, מדפסות, מצלמות. **לא תומכים** — Hub, Repeater, מתג לא מנוהל.',
      enter(L) {
        Object.values(L.devs).forEach((d, i) => { const dv = DEV[i]; d.verdict.visible = true; d.ring.material.color.setHex(VERD[dv.v][1]); d.ring.material.emissive.setHex(VERD[dv.v][1]); d.g.children.forEach((c) => { if (c.userData.ex) c.visible = false; }); });
        L.cam([0, 14, 36], [0, 1, 0]);
      },
    }, {
      t: 'בדיקת הבנה',
      x: '',
      q: { q: 'איזה התקן **לא** יכול לתמוך ב-VLAN בכלל?', o: ['מתג L3', 'נקודת גישה (AP)', 'Hub', 'טלפון IP'], a: 2, why: 'Hub הוא התקן שכבה 1: מעתיק אותות לכולם ואין לו יכולת להבין פריימים, תגים או VLAN-ים.' },
      enter(L) { L.cam([0, 14, 36], [0, 1, 0]); },
    }]),
  });
})(window.VQ);
