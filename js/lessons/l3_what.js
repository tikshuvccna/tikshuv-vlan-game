/* Lesson 3 – what a VLAN is and how it works (without vs with) */
(function (VQ) {
  const M = VQ.M, V3 = M.V3;
  const badge = (n) => n.setBadge('📨 ' + n.rx, '#94a3b8');
  function applyVlans(L, on) {
    const { net, sw, hosts, people } = L.o;
    people.forEach((p, i) => {
      const h = hosts[p.id], lk = h.links[0];
      h.vlan = p.dept;
      if (on) { net.setLinkMode(lk, 'access', h.vlan); sw.obj.setPort(i, VQ.vhex(h.vlan)); h.setScreen(VQ.vhex(h.vlan)); }
      else { net.setLinkMode(lk, 'plain', 0); sw.obj.setPort(i, 0x94a3b8); h.setScreen(VQ.vhex(p.dept)); }
    });
    net.setVlanMode(on);
  }
  function zones(L, on) {
    if (!on) return;
    Object.values(L.o.hosts).forEach((h) => { const z = M.zone(1.5, 1.7, VQ.vhex(h.vlan), 0.28); z.position.set(h.pos.x, 0.02, h.pos.z + 0.3); L.addTemp(z); });
  }
  VQ.lesson('what', {
    build(L) {
      L.o = VQ.office(L, { swLabel: 'Switch SW1' }); L.net = L.o.net;
      L.stage.setCam([0, 7.5, 12], [0, 0.8, 0.5]);
    },
    steps: [
      {
        t: 'מתג אחד — כמה רשתות',
        x: '**VLAN** (Virtual LAN) מחלק מתג פיזי אחד לכמה **מתגים וירטואליים**. כל VLAN הוא רשת נפרדת: מחשבים ב-VLAN אחד לא רואים את התעבורה של VLAN אחר — גם אם הם מחוברים לאותו מתג פיזי.',
        enter(L) {
          applyVlans(L, false); VQ.resetCounters(L.net, false); L.cam([0, 8, 13], [0, 2, 0.5]);
          L.o.sw.setBadge(null);
          [[10, 3.2], [20, 4.4], [30, 5.6]].forEach(([v, y], i) => {
            const b = M.box(9, 0.28, 1.4, VQ.vhex(v), { o: 0.55, e: VQ.vhex(v), ei: 0.5 }); b.position.set(0, 0.5, -2.5); L.addTemp(b);
            const t = M.label(`VLAN ${v} — ${VQ.VLANS[v].name}`, { size: 0.42, bg: VQ.vcss(v), color: '#04101a' }); t.position.set(0, 0, 1); b.add(t);
            L.tw(b.position, { y }, 0.9 + i * 0.25, { ease: 'back', delay: 0.3 + i * 0.25 }); VQ.sfx.play('whoosh');
          });
        },
      },
      {
        t: 'הקצאת פורטים (Access)',
        x: 'איך המתג יודע מי שייך לאיזה VLAN? **לפי הפורט**. מגדירים לכל פורט VLAN אחד — בפקודה `switchport access vlan 10`. פורט כזה נקרא **Access Port**, והמחשב שמחובר אליו לא יודע בכלל שיש VLAN. הפורט "צובע" את התעבורה שלו.',
        prompt: 'לחצו על 3 מחשבים כדי להחליף את ה-VLAN שלהם (10→20→30)',
        enter(L) {
          applyVlans(L, true); VQ.resetCounters(L.net, false); L.cam([0, 7.5, 12], [0, 0.8, 0.5]); zones(L, true);
          let changes = 0;
          L.o.people.forEach((p, i) => {
            const h = L.o.hosts[p.id];
            L.stage.pickable(h.obj, () => {
              const order = [10, 20, 30]; h.vlan = order[(order.indexOf(h.vlan) + 1) % 3];
              L.net.setLinkMode(h.links[0], 'access', h.vlan); L.o.sw.obj.setPort(i, VQ.vhex(h.vlan)); h.setScreen(VQ.vhex(h.vlan));
              h.setBadge('VLAN ' + h.vlan, VQ.vcss(h.vlan)); VQ.sfx.play('click'); h.pulse(VQ.vhex(h.vlan));
              if (++changes >= 3) L.unlock();
            });
          });
        },
      },
      {
        t: 'Broadcast עם VLAN',
        x: 'עכשיו נשלח Broadcast. המתג מעביר אותו **רק לפורטים שבאותו VLAN**. שאר הרשת בכלל לא מרגישה. כל VLAN הוא **Broadcast Domain** נפרד.',
        prompt: 'לחצו על מחשב ושלחו Broadcast',
        enter(L) {
          applyVlans(L, true); VQ.resetCounters(L.net); L.cam([0, 7.5, 12], [0, 0.8, 0.5]); zones(L, true);
          let busy = false, count = 0;
          Object.values(L.o.hosts).forEach((h) => L.stage.pickable(h.obj, async () => {
            if (busy) return; busy = true; VQ.sfx.play('whoosh');
            const r = await L.net.flood(h.id, { colorByVlan: true, onRx: (n) => { badge(n); VQ.sfx.play('pop'); } });
            VQ.fx.float(L.stage, V3(h.pos.x, 2.6, h.pos.z), `הגיע רק ל-${r.length}`, '#a7f3d0', 0.55);
            busy = false; if (++count >= 2) L.unlock();
          }));
        },
      },
      {
        t: 'בלי מול עם',
        x: 'אותו Broadcast, אותה רשת פיזית. **בלי VLAN** הוא הגיע ל-8 מחשבים. **עם VLAN** — רק ל-2. ככל שהרשת גדלה, ההבדל הזה הוא ההבדל בין רשת חנוקה לרשת מהירה.',
        enter(L) {
          VQ.resetCounters(L.net); L.cam([0, 7.5, 12], [0, 0.8, 0.5]);
          (async () => {
            applyVlans(L, false); await L.wait(0.6);
            const n1 = VQ.bigNote(L, '❌ בלי VLAN', [-5.2, 3.9, -3], { border: '#f87171', size: 0.7 });
            const r1 = await L.net.flood('s1', { color: 0xfb7185, onRx: badge });
            VQ.bigNote(L, `מקבלים: ${r1.length}`, [-5.2, 3, -3], { border: '#f87171', size: 0.55 });
            await L.wait(1.3); VQ.resetCounters(L.net);
            applyVlans(L, true); VQ.sfx.play('level'); zones(L, true); await L.wait(0.8);
            VQ.bigNote(L, '✅ עם VLAN', [5.2, 3.9, -3], { border: '#4ade80', size: 0.7 });
            const r2 = await L.net.flood('s1', { colorByVlan: true, onRx: badge });
            VQ.bigNote(L, `מקבלים: ${r2.length}`, [5.2, 3, -3], { border: '#4ade80', size: 0.55 });
          })();
        },
      },
      {
        t: 'אבטחה: הפרדה אמיתית',
        x: 'האורח ניסה לגשת להנהלת החשבונות — והחבילה נחסמת במתג. לעומת זאת דנה ורון (מכירות) מדברים בחופשיות **למרות שהם לא יושבים ליד זה** — כי החברות ב-VLAN נקבעת בפורט, לא במיקום.',
        enter(L) {
          applyVlans(L, true); VQ.resetCounters(L.net, false); L.cam([0, 7.5, 12], [0, 0.8, 0.5]); zones(L, true);
          (async () => {
            await L.wait(0.7);
            const bad = await L.net.ping('g1', 'f2', { colorByVlan: true });
            L.o.hosts.g1.mark(false, '🚫 נחסם'); VQ.sfx.play('bad');
            await L.wait(1.2);
            const ok = await L.net.ping('s1', 's3', { colorByVlan: true });
            if (ok) { L.o.hosts.s3.mark(true, '✔ עבר'); VQ.sfx.play('ok'); }
          })();
        },
      },
      {
        t: 'VLAN = תת־רשת (Subnet)',
        x: 'כל VLAN מקבל **תת־רשת IP משלו**: מכירות `192.168.10.0/24`, כספים `192.168.20.0/24`, אורחים `192.168.30.0/24`. כלל אצבע: **VLAN אחד = Broadcast Domain אחד = Subnet אחד**. מחשבים מ-Subnet שונה יצטרכו נתב כדי לדבר (נראה בתחנה 6).',
        enter(L) {
          applyVlans(L, true); VQ.resetCounters(L.net, false); L.cam([0, 7.5, 12], [0, 0.8, 0.5]); zones(L, true);
          const ctr = { 10: 10, 20: 20, 30: 30 };
          L.o.people.forEach((p, i) => { const h = L.o.hosts[p.id]; L.wait(i * 0.12).then(() => { h.setBadge(`192.168.${p.dept}.${ctr[p.dept]++}`, VQ.vcss(p.dept)); h.pulse(VQ.vhex(p.dept)); }); });
        },
      },
      {
        t: 'מספרים וסוגים של VLAN',
        x: '**מספרים:** `1` = default (ברירת מחדל, אי אפשר למחוק) • `2–1001` = טווח רגיל • `1002–1005` = שמורים (FDDI/Token Ring) • `1006–4094` = טווח מורחב. סה"כ 4094 VLAN-ים (12 ביט).\n**סוגים לפי תפקיד:** Data • Voice (טלפוניה) • Management (ניהול המתג) • Native (תעבורה בלי תג ב-Trunk) • Default.',
        enter(L) {
          applyVlans(L, true); VQ.resetCounters(L.net, false); L.cam([0, 8, 13], [0, 2.4, 0.5]);
          const rows = [[1, 'default'], [10, 'Data • SALES'], [20, 'Data • FINANCE'], [30, 'Data • GUEST'], [50, 'Voice'], [99, 'Management'], [999, 'Native']];
          rows.forEach(([v, t], i) => L.wait(i * 0.25).then(() => { const b = VQ.bigNote(L, `${v}  ${t}`, [(i % 2 ? 4.2 : -4.2), 3.4 + Math.floor(i / 2) * 1.05, -2.5], { bg: VQ.vcss(v), color: '#04101a', border: '#fff', size: 0.5 }); VQ.sfx.play('pop'); }));
        },
      },
      {
        t: 'בדיקת הבנה',
        x: '',
        q: { q: 'איך מגדירים לאיזה VLAN שייך מחשב שמחובר למתג?', o: ['מתקינים תוכנה מיוחדת על המחשב', 'מגדירים VLAN לפורט במתג (Access Port)', 'לפי כתובת ה-IP בלבד', 'לפי צבע הכבל'], a: 1, why: 'בדרך כלל החברות ב-VLAN נקבעת לפי הפורט: switchport access vlan X.' },
        enter(L) { applyVlans(L, true); VQ.resetCounters(L.net, false); L.cam([0, 7.5, 12], [0, 0.8, 0.5]); zones(L, true); },
      },
    ],
  });
})(window.VQ);
