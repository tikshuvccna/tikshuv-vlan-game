/* Lesson 7 – pros and cons of VLANs (a balance scale) */
(function (VQ) {
  const M = VQ.M, V3 = M.V3;
  const PROS = ['⚡ פחות Broadcast\nרשת מהירה יותר', '🔒 אבטחה\nהפרדה בין מחלקות', '🧩 גמישות\nמעבירים משתמש בהגדרה', '💰 חיסכון\nמתג אחד במקום כמה', '🗂️ ניהול לוגי\nלפי תפקיד ומחלקה', '📞 QoS\nתעדוף קול (Voice VLAN)'];
  const CONS = ['🧠 מורכבות\nתכנון ותיעוד', '💥 טעות בהגדרה\nמשפיעה רחב', '🧭 צריך ניתוב L3\nבין VLAN-ים', '🦘 VLAN Hopping\nאם לא מקשיחים', '🔧 פתרון תקלות\nמורכב יותר', '🛡️ לא מחליף\nחומת אש'];
  function stacks(L, np, nc, light) {
    L.items.forEach((o) => { o.parent && o.parent.remove(o); if (o.material.map) o.material.map.dispose(); o.material.dispose(); }); L.items = [];
    const add = (pan, txt, k, col) => { const l = M.label(txt, { size: 0.3, bg: col, color: '#04101a' }); l.position.set(0, 0.55 + k * 0.78, 0.4); pan.add(l); L.items.push(l); if (pan === L.panR && light) l.material.opacity = 0.55; };
    for (let i = 0; i < np; i++) add(L.panL, PROS[i], i, '#4ade80');
    for (let i = 0; i < nc; i++) add(L.panR, CONS[i], i, '#fb923c');
    L.wp = np; L.wc = nc * (light ? 0.45 : 1);
    if (np + nc) VQ.sfx.play('pop');
  }
  function hop(L, on) {
    L.scale.visible = !on; L.hopG.visible = on;
    if (on) L.cam([0, 6.5, 14], [0, 1, 0]); else L.cam([0, 4.2, 15], [0, 3, 0]);
  }
  VQ.lesson('proscons', {
    build(L) {
      const st = L.stage; M.grid(st, 80, 0x16305a); M.stars(st, 300, 80);
      const sc = L.scale = new THREE.Group(); st.add(sc);
      sc.add((() => { const m = M.cyl(0.22, 0.4, 4.4, 0x64748b, { m: 0.6 }); m.position.y = 2.2; return m; })());
      sc.add((() => { const m = M.cyl(1.4, 1.6, 0.3, 0x334155); m.position.y = 0.05; return m; })());
      L.beam = new THREE.Group(); L.beam.position.y = 4.5; sc.add(L.beam);
      L.beam.add(M.box(10, 0.24, 0.32, 0xfbbf24, { m: 0.6, r: 0.3 })); L.beam.add((() => { const b = M.sph(0.3, 0xfde047, { e: 0xfbbf24, ei: 0.5 }); return b; })());
      const mkPan = (col) => { const g = new THREE.Group(); const d = M.cyl(2.5, 2.2, 0.18, col, { m: 0.5, e: col, ei: 0.25 }, 32); g.add(d); [-1.9, 1.9].forEach((x) => { const r = M.cyl(0.03, 0.03, 2.4, 0x94a3b8); r.position.set(x * 0.5, 1.15, 0); r.rotation.z = x > 0 ? 0.35 : -0.35; g.add(r); }); sc.add(g); return g; };
      L.panL = mkPan(0x16a34a); L.panR = mkPan(0xea580c);
      const tl = M.label('✅ יתרונות', { size: 0.6, bg: '#16a34a', color: '#fff' }); tl.position.set(-4.8, 0.2, 1.2); sc.add(tl);
      const tr = M.label('⚠️ חסרונות', { size: 0.6, bg: '#ea580c', color: '#fff' }); tr.position.set(4.8, 0.2, 1.2); sc.add(tr);
      L.items = []; L.wp = 0; L.wc = 0; L.ang = 0;
      st.onUpdate((dt) => {
        const target = VQ.clamp((L.wp - L.wc) * 0.045, -0.3, 0.3);
        L.ang += (target - L.ang) * Math.min(1, dt * 2.5);
        L.beam.rotation.z = L.ang;
        const a = L.ang, arm = 4.7;
        L.panL.position.set(-arm * Math.cos(a), 4.5 - arm * Math.sin(a) - 2.5, 0);
        L.panR.position.set(arm * Math.cos(a), 4.5 + arm * Math.sin(a) - 2.5, 0);
      });
      // VLAN hopping demo network
      const net = L.net = L.makeNet(); const hg = L.hopG = net.group; hg.visible = false;
      net.addNode('sw1', 'switch', [-4.5, 0, 0], { ports: 3, pitch: 1.2, label: 'SW1  (native VLAN 1)' });
      net.addNode('sw2', 'switch', [4.5, 0, 0], { ports: 3, pitch: 1.2, label: 'SW2' });
      net.addNode('att', 'laptop', [-6.5, 0, 3.6], { label: '😈 תוקף (VLAN 1)', screen: 0xf87171 });
      net.addNode('vic', 'pc', [6.5, 0, 3.6], { label: 'קורבן (VLAN 20)', screen: VQ.vhex(20), vlan: 20 });
      const l1 = net.link('att', 'sw1', { bPort: 0 }); net.setLinkMode(l1, 'access', 1);
      const l2 = net.link('vic', 'sw2', { bPort: 2 }); net.setLinkMode(l2, 'access', 20);
      L.tr = net.link('sw1', 'sw2', { aPort: 2, bPort: 0, sag: 0.02 }); net.setLinkMode(L.tr, 'trunk', 0, null); L.tr.native = 1;
      net.setVlanMode(true);
      L.scale.visible = true;
      st.setCam([0, 4.2, 15], [0, 3, 0]);
    },
    steps: [
      {
        t: 'מאזניים: האם זה שווה את זה?',
        x: 'שום טכנולוגיה אינה מושלמת. לפני שממליצים על VLAN — צריך לשקול יתרונות מול חסרונות. בואו נניח אותם על המאזניים אחד אחד.',
        enter(L) { hop(L, false); stacks(L, 0, 0); },
      },
      { t: 'יתרונות (1): ביצועים ואבטחה', x: '**פחות Broadcast** — כל VLAN הוא Broadcast Domain קטן, ולכן פחות רעש ומהירות גבוהה יותר.\n**אבטחה** — מחלקות שונות לא רואות אחת את השנייה, וכל מעבר ביניהן עובר בנקודת בקרה (נתב/חומת אש).\n**גמישות** — עובד עבר משרד? משנים הגדרה בפורט, בלי כבלים.', enter(L) { hop(L, false); stacks(L, 3, 0); } },
      { t: 'יתרונות (2): עלות וניהול', x: '**חיסכון** — מתג אחד מחזיק הרבה רשתות לוגיות.\n**ניהול לוגי** — מארגנים לפי תפקיד/מחלקה ולא לפי מיקום פיזי.\n**QoS** — Voice VLAN מאפשר לתעדף שיחות טלפון על פני גלישה.', enter(L) { hop(L, false); stacks(L, 6, 0); } },
      { t: 'חסרונות (1): מורכבות', x: '**מורכבות** — צריך לתכנן מספרים, שמות ותת־רשתות, ולתעד.\n**טעות משפיעה רחב** — פורט ב-VLAN הלא נכון או Trunk שגוי יכולים לנתק קומה שלמה.\n**צריך ניתוב** — כדי שהמחלקות ידברו, חייבים נתב או מתג L3.', enter(L) { hop(L, false); stacks(L, 6, 3); } },
      { t: 'חסרונות (2): תחזוקה ואבטחה', x: '**VLAN Hopping** — תוקף עלול לקפוץ בין VLAN-ים אם ההגדרות ברירת מחדל.\n**איתור תקלות** — צריך לבדוק פורט, VLAN, Trunk, Native ו-Gateway.\n**VLAN אינו חומת אש** — הוא מפריד, לא מסנן. את המדיניות מיישמים ב-ACL/Firewall.', enter(L) { hop(L, false); stacks(L, 6, 6); } },
      {
        t: 'VLAN Hopping: התקפת Double Tagging',
        x: 'התוקף יושב ב-**Native VLAN** ושולח פריים עם **שני תגים**. SW1 מסיר את התג החיצוני (כי זה ה-Native) ומעביר הלאה עם התג הפנימי — VLAN 20. SW2 מוסר לקורבן. התוקף "קפץ" ל-VLAN שלא שלו! ההגנה: Native VLAN ייעודי ולא בשימוש, ופורטים לא בשימוש כבויים.',
        prompt: 'לחצו על התוקף לשלוח את הפריים',
        enter(L) {
          hop(L, true); stacks(L, 0, 0);
          const n = L.net; let busy = false;
          L.stage.pickable(n.nodes.att.obj, async () => {
            if (busy) return; busy = true;
            const cap = (t, x, c) => VQ.fx.float(L.stage, V3(x, 2.8, 0.5), t, c, 0.5);
            const pk = M.packet({ color: 0xf87171, size: 0.34 }); n.group.add(pk);
            const t2 = M.box(0.3, 0.14, 0.4, VQ.vhex(1), { e: VQ.vhex(1), ei: 1 }); t2.position.set(0, 0.42, 0); pk.add(t2);
            pk.setTag(VQ.vhex(20));
            const seq = async (a, b, sp = 4) => { const L1 = n.linkBetween(a, b); pk.position.copy(n.endpoint(L1, a)); pk.scale.setScalar(1); const p1 = n.endpoint(L1, b); await L.tw(pk.position, { x: p1.x, y: p1.y, z: p1.z }, pk.position.distanceTo(p1) / sp, { ease: 'lin' }); };
            cap('🎯 פריים עם 2 תגים: [1][20]', -6.5, '#fca5a5');
            await seq(n.nodes.att, n.nodes.sw1);
            cap('SW1 מסיר את תג ה-Native (1)', -4.5, '#fde047'); t2.visible = false; VQ.fx.burst(L.stage, pk.position.clone(), 0xfde047, 14, 3); VQ.sfx.play('pop');
            const p2 = n.endpoint(L.tr, n.nodes.sw1); const p3 = n.endpoint(L.tr, n.nodes.sw2);
            pk.position.copy(p2); await L.tw(pk.position, { x: p3.x, y: p3.y, z: p3.z }, 1.6, { ease: 'lin' });
            cap('SW2 קורא: VLAN 20 ← מעביר', 4.5, '#86efac');
            const L3 = n.linkBetween(n.nodes.vic, n.nodes.sw2); pk.setTag(null); const q0 = n.endpoint(L3, n.nodes.sw2), q1 = n.endpoint(L3, n.nodes.vic);
            pk.position.copy(q0); await L.tw(pk.position, { x: q1.x, y: q1.y, z: q1.z }, 1, { ease: 'lin' });
            n.nodes.vic.mark(false, '⚠️ נפרץ'); VQ.sfx.play('alarm'); n.nodes.vic.setGlow(0xf87171);
            n.group.remove(pk); busy = false; L.unlock();
          });
        },
      },
      { t: 'ההקשחה מקלה על המשקל', x: 'רוב החסרונות **ניתנים לצמצום** בפרקטיקה נכונה: Native VLAN ייעודי (`999`), כיבוי פורטים לא בשימוש והצבתם ב-VLAN "חור שחור", `switchport nonegotiate`, תיעוד מסודר, ו-ACL/Firewall בין ה-VLAN-ים. שימו לב איך החסרונות "מתקלים".', enter(L) { hop(L, false); stacks(L, 6, 6, true); } },
      { t: 'הפסק: מתי כן, מתי לא?', x: '**כן** — כמעט בכל רשת ארגונית: יותר ממחלקה אחת, אורחים, טלפוניה, שרתים.\n**אולי לא** — רשת ביתית או משרד זעיר עם 5 מחשבים ואף דרישת אבטחה.\nהכלל: ככל שהרשת גדלה ומגוונת יותר — היתרון של VLAN גדל.', enter(L) { hop(L, false); stacks(L, 6, 6, true); VQ.fx.confetti(L.stage, V3(-4, 5, 0), 30); } },
      {
        t: 'בדיקת הבנה', x: '',
        q: { q: 'מה מתוך אלה הוא **חיסרון** של שימוש ב-VLAN?', o: ['הקטנת Broadcast Domain', 'הפרדה בין מחלקות', 'צורך בניתוב שכבה 3 כדי לתקשר בין VLAN-ים', 'חיסכון בציוד'], a: 2, why: 'VLAN-ים שונים לא מדברים בלי נתב/מתג L3 — וזו מורכבות נוספת שצריך לתכנן.' },
        enter(L) { hop(L, false); stacks(L, 6, 6, true); },
      },
    ],
  });
})(window.VQ);
