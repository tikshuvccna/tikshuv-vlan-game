/* Lesson 2 – before VLAN: hubs, switches, a physical switch per department */
(function (VQ) {
  const M = VQ.M, V3 = M.V3;
  VQ.lesson('before', {
    build(L) {
      const st = L.stage;
      M.grid(st, 80, 0x16305a); M.stars(st, 300, 80);
      // --- scene A: hub ---
      const a = L.a = L.makeNet(); a.addNode('hub', 'hub', [0, 0, -1.2], { label: 'Hub (רכזת)' });
      ['A', 'B', 'C', 'D'].forEach((k, i) => { a.addNode(k, 'pc', [(i - 1.5) * 3, 0, 3], { label: 'מחשב ' + k, screen: 0x94a3b8 }); a.link(k, 'hub', {}); });
      // --- scene B: switch ---
      const b = L.b = L.makeNet(); b.addNode('sw', 'switch', [0, 0, -1.2], { ports: 4, pitch: 0.9, label: 'Switch' });
      ['A', 'B', 'C', 'D'].forEach((k, i) => { b.addNode(k, 'pc', [(i - 1.5) * 3, 0, 3], { label: 'מחשב ' + k, screen: 0x94a3b8 }); b.link(k, 'sw', { bPort: i }); });
      L.macBox = M.label('MAC table\nA → Fa0/1\nB → Fa0/2\nC → Fa0/3\nD → Fa0/4', { size: 0.36, bg: 'rgba(8,13,28,.9)', border: '#38bdf8', color: '#bae6fd' }); L.macBox.position.set(0, 3.2, -1.2); b.group.add(L.macBox);
      // --- scene C: switch per department ---
      const c = L.c = L.makeNet();
      const depts = [[10, 'מכירות', -7.8, ['דנה', 'רון', 'מיכל']], [20, 'כספים', 0, ['יוסי', 'נועה', 'אבי']], [30, 'אורחים', 7.8, ['אורח 1', 'אורח 2', 'אורח 3']]];
      L.dsw = {};
      depts.forEach(([v, name, x, people]) => {
        const sid = 'sw' + v; const s = c.addNode(sid, 'switch', [x, 0, -2], { ports: 4, pitch: 0.9, label: 'SW ' + name, lborder: VQ.vcss(v) }); L.dsw[v] = s;
        s.obj.children[0].material = M.mat(VQ.vhex(v), { m: 0.3 });
        people.forEach((pn, i) => { const id = v + '_' + i; const h = c.addNode(id, i === 0 && v === 30 ? 'laptop' : v === 30 ? 'laptop' : 'pc', [x + (i - 1) * 2.3, 0, 3.4], { label: pn, screen: VQ.vhex(v), vlan: v, scale: 0.85 }); c.link(id, sid, { bPort: i }); });
      });
      L.cost = null; L.moved = 0;
      L.show = (w) => { L.a.group.visible = w === 'a'; L.b.group.visible = w === 'b'; L.c.group.visible = w === 'c'; L.merge && (L.merge.visible = w === 'm'); };
      L.show('a');
      st.setCam([0, 7.5, 12], [0, 0.5, 0.5]);
    },
    steps: [
      {
        t: 'עידן ה-Hub (רכזת)',
        x: 'בהתחלה היה ה-**Hub**: מכשיר טיפש שמעתיק כל אות שהוא מקבל לכל הפורטים האחרים. כולם חולקים אותו "כביש": כששני מחשבים שולחים יחד — **התנגשות** (Collision). זה נקרא Collision Domain אחד גדול.',
        enter(L) {
          L.show('a'); L.cam([0, 7.5, 12], [0, 0.5, 0.5]);
          (async () => {
            const n = L.a;
            await L.wait(0.6);
            await n.flood('A', { color: 0xfbbf24, onRx: (x) => x.setGlow(0xfbbf24) });
            await L.wait(0.5); Object.values(n.nodes).forEach((x) => x.setGlow(null));
            // collision
            const A = n.nodes.A, C = n.nodes.C, hub = n.nodes.hub;
            await Promise.all([n.hop(A, A.links[0], { color: 0xf87171, speed: 4 }), n.hop(C, C.links[0], { color: 0xf87171, speed: 4 })]);
            VQ.fx.burst(L.stage, V3(hub.pos.x, 0.6, hub.pos.z), 0xf87171, 30, 4); VQ.sfx.play('boom');
            VQ.fx.float(L.stage, V3(0, 2.4, -1.2), '💥 התנגשות!', '#fca5a5', 0.7);
          })();
        },
      },
      {
        t: 'עידן ה-Switch (מתג)',
        x: 'ה-**Switch** למד לזכור איזו כתובת MAC נמצאת על איזה פורט (טבלת MAC). הוא שולח תעבורה רק ליעד הנכון — וסיים את בעיית ההתנגשויות. אבל שימו לב: **Broadcast** עדיין מוצף לכולם. עדיין רשת אחת גדולה.',
        prompt: 'לחצו על מחשב לשליחת Broadcast',
        enter(L) {
          L.show('b'); L.cam([0, 7.5, 12], [0, 1, 0.5]);
          const n = L.b; Object.values(n.nodes).forEach((x) => { x.rx = 0; x.setGlow(null); });
          (async () => {
            await L.wait(0.6);
            n.nodes.C.setGlow(0x4ade80);
            await n.ping('A', 'C', { color: 0x4ade80, noReply: true });
            VQ.fx.float(L.stage, V3(n.nodes.C.pos.x, 2.4, 3), 'רק C קיבל ✔', '#86efac', 0.55);
            await L.wait(0.8); n.nodes.C.setGlow(null);
          })();
          let busy = false;
          ['A', 'B', 'C', 'D'].forEach((k) => L.stage.pickable(n.nodes[k].obj, async () => {
            if (busy) return; busy = true;
            VQ.fx.float(L.stage, V3(n.nodes[k].pos.x, 2.4, 3), 'Broadcast 📢', '#fca5a5', 0.5);
            const r = await n.flood(k, { color: 0xfb7185, onRx: (x) => x.setGlow(0xfb7185) });
            await L.wait(0.6); Object.values(n.nodes).forEach((x) => x.setGlow(null)); busy = false; L.unlock();
          }));
        },
      },
      {
        t: 'הפתרון הישן: מתג לכל מחלקה',
        x: 'רוצים הפרדה אמיתית בין מכירות, כספים ואורחים? **מתג פיזי נפרד לכל מחלקה**. שלושה מתגים, שלוש רשתות. ה-Broadcast של מכירות לא יוצא מהמתג שלהם. זה עובד מצוין — אבל יש מחיר.',
        enter(L) {
          L.show('c'); L.cam([0, 8.5, 13], [0, 0.5, 0.5]);
          Object.values(L.c.nodes).forEach((x) => { x.rx = 0; x.setGlow(null); });
          (async () => {
            await L.wait(0.7);
            await L.c.flood('10_0', { color: 0x38bdf8, speed: 8, onRx: (x) => x.setGlow(0x38bdf8) });
            VQ.fx.float(L.stage, V3(-7.8, 3.4, 3), 'נשאר במכירות 👍', '#7dd3fc', 0.55);
            await L.wait(1.5); Object.values(L.c.nodes).forEach((x) => x.setGlow(null));
            await L.c.flood('30_0', { color: 0xfb923c, speed: 8, onRx: (x) => x.setGlow(0xfb923c) });
            VQ.fx.float(L.stage, V3(7.8, 3.4, 3), 'נשאר באורחים 👍', '#fdba74', 0.55);
          })();
        },
      },
      {
        t: 'והמחיר: דנה עוברת מחלקה',
        x: 'דנה עוברת ממכירות לכספים. עם מתגים נפרדים זה אומר **להזיז את המחשב ולהעביר כבל פיזית** לארון של הכספים. ואם במתג של הכספים אין פורט פנוי? קונים מתג חדש.',
        prompt: 'לחצו על דנה, ואז על רון, כדי להעביר אותם לכספים',
        enter(L) {
          L.show('c'); L.cam([0, 9.5, 14], [0, 0.5, 0]); L.moved = 0;
          const n = L.c; Object.values(n.nodes).forEach((x) => x.setGlow(null));
          const mk = () => { if (L.cost) L.stage.remove(L.cost); L.cost = VQ.bigNote(L, `⏱ ${L.moved * 45} דקות עבודה   💰 ₪${L.moved * 350 + (L.moved > 1 ? 900 : 0)}`, [0, 6, 1], { border: '#fbbf24', size: 0.6 }); };
          mk();
          const slots = [[3.6, 3.4], [-3.6, 3.4]];
          const tryMove = async (id, hostLabel) => {
            const node = n.nodes[id]; if (L.moved >= 2 || node.moved) return; node.moved = true;
            const old = node.links[0]; const dst = L.dsw[20];
            const freePorts = 4 - dst.links.length;
            n.unlink(old); node.setGlow(0xfbbf24);
            VQ.fx.float(L.stage, V3(node.pos.x, 3, node.pos.z), '🔌 מנתקים כבל…', '#fde68a', 0.5);
            await L.tw(node.pos, { x: (L.moved === 0 ? 4.4 : -4.4), z: 5.6 }, 1.6);
            node.obj.position.copy(node.pos); if (node.label) node.label.position.set(node.pos.x, node.h + 0.45, node.pos.z);
            if (freePorts > 0) {
              n.link(id, 'sw20', { bPort: 3, sag: 0.4 }); node.setGlow(null); VQ.sfx.play('ok'); VQ.fx.float(L.stage, V3(node.pos.x, 3, node.pos.z), '🔌 כבל ארוך חדש', '#86efac', 0.5);
            } else {
              VQ.fx.float(L.stage, V3(dst.pos.x, 2, dst.pos.z), '🚫 אין פורט פנוי!', '#fca5a5', 0.7); VQ.sfx.play('bad'); await L.wait(1);
              const ns = n.addNode('swN', 'switch', [0, 0, -8], { ports: 4, pitch: 0.9, label: 'מתג חדש 💸 ₪900' });
              await L.wait(0.6); n.link(id, 'swN', { bPort: 0, sag: 0.5 }); n.link('swN', 'sw20', { bPort: 3, aPort: 3, sag: 0.4 });
              node.setGlow(null); VQ.sfx.play('coin');
            }
            L.moved++; mk(); if (L.moved >= 2) { L.unlock(); L.flash('בשביל שני אנשים: כבלים, זמן טכנאי, ומתג חדש.'); }
          };
          L.stage.pickable(n.nodes['10_0'].obj, () => tryMove('10_0'));
          L.stage.pickable(n.nodes['10_1'].obj, () => tryMove('10_1'));
        },
      },
      {
        t: 'סיכום העלויות',
        x: '💸 **ציוד** — מתג (ולעיתים גם נתב) לכל מחלקה.\n🔌 **כבלים ומקום** — ארונות, חשמל, סבך כבלים.\n📉 **ניצול נמוך** — מתג של 24 פורטים שמשתמשים ב-6 מהם.\n🐢 **חוסר גמישות** — כל מעבר משרד = טכנאי בשטח.\n\nחייבים פתרון שמפריד לוגית, בלי להפריד פיזית.',
        enter(L) {
          L.show('c'); L.cam([0, 9.5, 14], [0, 0.5, 0]);
          [[-7.8, 'ניצול 3/24 (12%)'], [0, 'ניצול 4/24 (16%)'], [7.8, 'ניצול 3/24 (12%)']].forEach(([x, t], i) => { VQ.bigNote(L, t, [x, 4.4, -2], { border: '#f87171', size: 0.5 }); });
        },
      },
      {
        t: '1998: הרעיון — VLAN',
        x: 'שנות ה-80: Hub. שנות ה-90: Switch. אז סיסקו המציאה פרוטוקול קנייני (**ISL**), ובשנת **1998** התקן הפתוח **IEEE 802.1Q** הפך למשותף לכל היצרנים. הרעיון: מתג אחד שמתנהג כמו כמה מתגים נפרדים — **Virtual LAN**.',
        enter(L) {
          L.show('c'); L.cam([0, 9, 15], [0, 1.5, 0]);
          const tl = [['1980s', 'Hub', '#94a3b8'], ['1990s', 'Switch', '#38bdf8'], ['1995', 'ISL (Cisco)', '#fbbf24'], ['1998', 'IEEE 802.1Q', '#4ade80']];
          tl.forEach(([y, t, c], i) => { L.wait(0.35 * i).then(() => { VQ.bigNote(L, y + '\n' + t, [-6 + i * 4, 4.6, -5], { border: c, size: 0.55 }); VQ.sfx.play('pop'); }); });
          L.wait(2.2).then(() => {
            VQ.bigNote(L, '❓ מה אם מתג אחד יהפוך לשלושה מתגים וירטואליים?', [0, 6.6, -6], { border: '#a78bfa', size: 0.6 });
          });
        },
      },
      {
        t: 'בדיקת הבנה',
        x: '',
        q: { q: 'מהי הבעיה העיקרית בפתרון "מתג פיזי נפרד לכל מחלקה"?', o: ['הוא לא מפריד בין המחלקות', 'הוא יקר, תופס מקום, וכל שינוי דורש עבודה פיזית', 'הוא מגדיל את ה-Broadcast', 'הוא לא עובד עם כבלי רשת'], a: 1, why: 'ההפרדה מצוינת, אבל היא כרוכה בציוד, כבלים ותחזוקה פיזית — ו-VLAN עושה אותה בתוכנה.' },
        enter(L) { L.show('c'); L.cam([0, 9, 14], [0, 0.5, 0]); },
      },
    ],
  });
})(window.VQ);
