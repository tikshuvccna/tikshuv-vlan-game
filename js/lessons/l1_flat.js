/* Lesson 1 – life without VLAN: the flat network */
(function (VQ) {
  const M = VQ.M, V3 = M.V3;
  const badge = (n) => n.setBadge('📨 ' + n.rx, n.rx > 12 ? '#f87171' : n.rx > 5 ? '#fbbf24' : '#94a3b8');
  VQ.lesson('flat', {
    build(L) {
      const o = VQ.office(L, { swLabel: 'Switch SW1' });
      L.o = o; L.net = o.net;
      L.stage.setCam([0, 7.5, 12], [0, 0.5, 0.5]);
    },
    steps: [
      {
        t: 'משרד אחד, מתג אחד',
        x: 'בחברה 9 מחשבים ואחד המתג (**Switch**) שמחבר ביניהם. כשלא מגדירים VLAN, כל הפורטים במתג שייכים לרשת אחת (בפועל VLAN 1 — ברירת המחדל). לזה קוראים **רשת שטוחה** (Flat Network).',
        enter(L) {
          VQ.deptColors(L.o.hosts, false); VQ.resetCounters(L.net, false);
          L.net.setVlanMode(false); L.cam([0, 7.5, 12], [0, 0.5, 0.5]);
          L.o.sw.setBadge('כל הפורטים = רשת אחת', '#94a3b8'); L.o.sw.badge.position.y += 0.2;
        },
      },
      {
        t: 'אבל האנשים שונים…',
        x: 'המחשבים שייכים לשלוש מחלקות: **מכירות** (כחול), **כספים** (ירוק) ו**אורחים** (כתום). אנחנו רואים את ההבדל — אבל המתג לא. בעיניו כולם אותו דבר.',
        enter(L) {
          VQ.deptColors(L.o.hosts, true); VQ.resetCounters(L.net, false); L.net.setVlanMode(false);
          L.o.sw.setBadge('המתג לא מכיר מחלקות', '#94a3b8');
          Object.values(L.o.hosts).forEach((h, i) => L.wait(i * 0.08).then(() => h.pulse(VQ.vhex(h.person.dept))));
        },
      },
      {
        t: 'מהו Broadcast?',
        x: 'מחשב שרוצה לדבר עם מחשב אחר, אבל לא מכיר את כתובת ה-MAC שלו, "צועק" לכולם: **מי בעל הכתובת `192.168.1.20`?** (בקשת ARP). זו הודעת **Broadcast** — כתובת יעד `FF:FF:FF:FF:FF:FF`. המתג חייב להעביר אותה לכל הפורטים.',
        prompt: 'לחצו על מחשב כדי שישלח Broadcast',
        enter(L) {
          VQ.deptColors(L.o.hosts, true); VQ.resetCounters(L.net); L.net.setVlanMode(false);
          L.o.sw.setBadge(null);
          let busy = false;
          Object.values(L.o.hosts).forEach((h) => L.stage.pickable(h.obj, async () => {
            if (busy) return; busy = true; VQ.sfx.play('whoosh');
            VQ.fx.float(L.stage, V3(h.pos.x, 2.3, h.pos.z), 'מי זה 192.168.1.20? 📢', '#fca5a5', 0.45);
            const r = await L.net.flood(h.id, { color: 0xfb7185, onRx: (n) => { badge(n); VQ.sfx.play('pop'); } });
            L.flash(`ההודעה הגיעה ל-${r.length} מחשבים — כולם! גם למי שלא קשור לעניין.`);
            busy = false; L.unlock();
          }, { onHover: () => {} }));
        },
      },
      {
        t: 'יותר מחשבים = יותר רעש',
        x: 'ARP, DHCP, ועוד פרוטוקולים שולחים Broadcast כל הזמן. כל מחשב חייב לעצור ולבדוק כל הודעה כזו. ברשת של 9 מחשבים זה קטן. ברשת של 500? **אלפי הודעות בשנייה** על כל מחשב — ולפעמים אפילו "סערת שידורים" (Broadcast Storm) שמפילה את הרשת.',
        enter(L) {
          VQ.deptColors(L.o.hosts, true); VQ.resetCounters(L.net); L.net.setVlanMode(false); L.o.sw.setBadge(null);
          const ids = Object.keys(L.o.hosts);
          (async () => {
            for (let round = 0; round < 6; round++) {
              VQ.shuffleIds = VQ.shuffle(ids).slice(0, 3);
              VQ.shuffleIds.forEach((id, k) => L.wait(k * 0.25).then(() => L.net.flood(id, { speed: 9, size: 0.2, onRx: badge })));
              await L.wait(1.4);
            }
            VQ.bigNote(L, '💥 כל מחשב מעבד הודעות של כולם', [0, 3.6, -3]);
          })();
        },
      },
      {
        t: 'הבעיה השנייה: אין גבולות',
        x: 'אורח חיבר מחשב נייד לשקע בחדר הישיבות. הוא באותה רשת עם **הנהלת החשבונות**! הוא יכול לסרוק מחשבים, לנחש סיסמאות ולהאזין לתעבורה. אין שום גבול בין המחלקות.',
        enter(L) {
          VQ.deptColors(L.o.hosts, true); VQ.resetCounters(L.net, false); L.net.setVlanMode(false); L.o.sw.setBadge(null);
          const g = L.o.hosts.g1, f = L.o.hosts.f2;
          g.setGlow(0xfb923c); 
          (async () => {
            for (let k = 0; k < 3; k++) {
              f.setGlow(null);
              const ok = await L.net.ping('g1', 'f2', { color: 0xf87171, noReply: true });
              if (ok) { f.setGlow(0xf87171); f.mark(false, '🔓 נפרץ?'); VQ.sfx.play('alarm'); }
              await L.wait(1.2);
            }
            VQ.bigNote(L, '⚠️ אורח ↔ כספים: גישה חופשית', [0, 3.6, -3], { border: '#f87171' });
          })();
        },
      },
      {
        t: 'שלוש בעיות, פתרון אחד',
        x: '🐌 **ביצועים** — Broadcast מגיע לכולם.\n🔓 **אבטחה** — אין הפרדה בין מחלקות.\n🧩 **ניהול** — אי אפשר להחיל מדיניות שונה לכל קבוצה.\n\nהפתרון: לחלק את הרשת הפיזית לכמה רשתות **לוגיות**. אבל לפני שנראה איך — בואו נבין איך פתרו את זה פעם.',
        enter(L) {
          VQ.deptColors(L.o.hosts, true); VQ.resetCounters(L.net, false); L.net.setVlanMode(false); L.o.sw.setBadge(null);
          Object.values(L.o.hosts).forEach((h) => h.setGlow(null));
          [['🐌 ביצועים', -5, '#fbbf24'], ['🔓 אבטחה', 0, '#f87171'], ['🧩 ניהול', 5, '#a78bfa']].forEach(([t, x, c], i) => {
            const l = VQ.bigNote(L, t, [x, 3.6 + (i === 1 ? 0.9 : 0), -3], { border: c, size: 0.9 }); L.wait(i * 0.3);
          });
        },
      },
      {
        t: 'בדיקת הבנה',
        x: '',
        q: { q: 'מחשב ברשת שטוחה שולח הודעת Broadcast. מי מקבל אותה?', o: ['רק המחשב שאליו התכוון', 'כל המחשבים ברשת', 'רק המחשבים מאותה מחלקה', 'המתג חוסם אותה'], a: 1, why: 'Broadcast מוצף על-ידי המתג לכל הפורטים באותו Broadcast Domain.' },
        enter(L) { VQ.deptColors(L.o.hosts, true); VQ.resetCounters(L.net, false); L.cam([0, 7.5, 12], [0, 0.5, 0.5]); },
      },
    ],
  });
})(window.VQ);
