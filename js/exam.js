/* Final exam – boss battle against the Broadcast Storm monster. 15 random questions, pass with 70%+ */
(function (VQ) {
  const M = VQ.M, V3 = M.V3, h = VQ.h, ui = VQ.ui, S = VQ.store;
  // [chapter, question, correct answer, wrong answers..., explanation]
  const Q = [
    [1, 'מהו Broadcast?', 'הודעה שנשלחת לכל המכשירים באותו Broadcast Domain', ['הודעה ליעד יחיד', 'הודעה מוצפנת בין שני שרתים', 'פרוטוקול ניתוב'], 'Broadcast מגיע לכולם – כתובת היעד היא FF:FF:FF:FF:FF:FF.'],
    [1, 'מהי כתובת ה-MAC של Broadcast?', 'FF:FF:FF:FF:FF:FF', ['00:00:00:00:00:00', '01:00:5E:00:00:01', '192.168.1.255'], 'כל הביטים 1 – כולם קולטים את הפריים.'],
    [1, 'מה הבעיה העיקרית ברשת שטוחה גדולה?', 'Broadcast מגיע לכל המחשבים ואין הפרדה בין מחלקות', ['אין אפשרות לשלוח מידע', 'כל המחשבים חייבים IP זהה', 'המתג חוסם את כל התעבורה'], 'רשת אחת = Broadcast Domain אחד: עומס ובעיות אבטחה.'],
    [2, 'מה עושה Hub?', 'מעתיק כל אות לכל הפורטים האחרים (Collision Domain אחד)', ['לומד כתובות MAC ושולח רק ליעד', 'מנתב בין רשתות', 'מגדיר VLAN-ים'], 'Hub הוא התקן שכבה 1 – בלי ידע על פריימים.'],
    [2, 'מה Switch לומד ומשתמש בו כדי להעביר פריים ליעד הנכון?', 'טבלת כתובות MAC (MAC address table)', ['טבלת ניתוב IP', 'טבלת DNS', 'רשימת סיסמאות'], 'המתג משייך MAC לפורט ושולח רק לשם.'],
    [2, 'מה החיסרון בפתרון הישן "מתג פיזי נפרד לכל מחלקה"?', 'ציוד, כבלים ותחזוקה פיזית – ומעבר משתמש דורש עבודה בשטח', ['הוא לא מפריד בין המחלקות', 'הוא מגדיל את ה-Broadcast', 'הוא אינו תומך ב-Ethernet'], 'ההפרדה טובה אבל יקרה וסטטית.'],
    [2, 'איזה תקן מגדיר תיוג VLAN (Tagging)?', 'IEEE 802.1Q', ['IEEE 802.11', 'IEEE 802.3af', 'IEEE 802.1X'], '802.1Q הוא תקן ה-VLAN הפתוח (1998); ISL היה הקנייני של סיסקו.'],
    [3, 'מהו VLAN?', 'חלוקה לוגית של רשת פיזית לכמה רשתות (Broadcast Domains) נפרדות', ['סוג כבל מיוחד', 'פרוטוקול ניתוב בין ערים', 'תוכנה להצפנת קבצים'], 'Virtual LAN – הפרדה בתוכנה.'],
    [3, 'למתג אחד מוגדרים 3 VLAN-ים פעילים. כמה Broadcast Domains יש?', '3', ['1', '2', '4094'], 'כל VLAN = Broadcast Domain נפרד.'],
    [3, 'איך קובעים לאיזה VLAN שייך מחשב שמחובר ל-Access Port?', 'לפי ההגדרה של הפורט במתג', ['לפי צבע הכבל', 'לפי שם המחשב', 'לפי מערכת ההפעלה'], 'switchport access vlan X.'],
    [3, 'מהו VLAN ברירת המחדל במתג Cisco?', 'VLAN 1', ['VLAN 0', 'VLAN 10', 'VLAN 99'], 'כל הפורטים מתחילים ב-VLAN 1, ואי אפשר למחוק אותו.'],
    [3, 'מה הקשר המקובל בין VLAN ל-IP?', 'VLAN אחד = Subnet אחד', ['כל ה-VLAN-ים חולקים Subnet', 'VLAN אינו קשור ל-IP לעולם', 'לכל מחשב Subnet משלו'], 'כך מאפשרים ניתוב והפרדה ברורים.'],
    [4, 'מה ההבדל בין Access ל-Trunk?', 'Access – VLAN אחד בלי תג; Trunk – הרבה VLAN-ים עם תג', ['Access נושא הרבה VLAN-ים; Trunk – VLAN אחד', 'אין הבדל', 'Trunk הוא רק לחיבור מדפסות'], 'Trunk מחבר התקני רשת ונושא תגי 802.1Q.'],
    [4, 'מה גודל התג של 802.1Q?', '4 בייט', ['1 בייט', '16 בייט', '64 בייט'], 'TPID (2) + PCP/DEI/VID (2) = 4 בייט.'],
    [4, 'כמה ביטים יש בשדה VLAN ID?', '12 ביט', ['8 ביט', '16 ביט', '32 ביט'], '2^12 = 4096 (בפועל 4094 שמישים).'],
    [4, 'מהו Native VLAN?', 'ה-VLAN שהתעבורה שלו עוברת ב-Trunk בלי תג', ['ה-VLAN של המנהל בלבד', 'VLAN שנמחק', 'VLAN של אורחים'], 'פריים ללא תג ב-Trunk משויך ל-Native VLAN.'],
    [4, 'איזו פקודה מגבילה אילו VLAN-ים עוברים ב-Trunk?', 'switchport trunk allowed vlan 10,20', ['switchport access vlan 10,20', 'vlan allowed 10,20', 'trunk vlan only 10,20'], 'Allowed VLAN list.'],
    [4, 'אי־התאמה ב-Native VLAN בין שני צידי Trunk גורמת ל…', 'בעיות/דליפת תעבורה בין VLAN-ים והודעות CDP', ['שדרוג מהירות אוטומטי', 'מחיקת ה-VLAN-ים', 'אין שום השפעה אף פעם'], 'הצדדים חייבים להסכים על אותו Native.'],
    [5, 'איזה התקן **לא** תומך ב-VLAN?', 'Hub', ['מתג L3', 'AP', 'טלפון IP'], 'Hub הוא שכבה 1.'],
    [5, 'מה עושה AP בהקשר של VLAN?', 'ממפה כל SSID ל-VLAN', ['מנתק את הכבל', 'מוחק תגים תמיד', 'יוצר Hub'], 'רשת "אורחים" ל-VLAN אורחים וכו׳.'],
    [5, 'איך טלפון IP עובד עם VLAN?', 'מתייג קול ב-Voice VLAN ומעביר את המחשב שמאחוריו בלי תג', ['אינו יכול להתחבר למתג מנוהל', 'משתמש רק ב-VLAN 1', 'מחליף את המתג'], 'switchport voice vlan.'],
    [5, 'איך מתג L3 מנתב בין VLAN-ים?', 'בעזרת ממשקי SVI (interface vlan X) ו-ip routing', ['בעזרת Hub', 'רק בעזרת כבל מיוחד', 'אינו יכול לנתב'], 'SVI = Gateway של ה-VLAN.'],
    [6, 'מה נדרש כדי ש-VLAN 10 ידבר עם VLAN 20?', 'התקן שכבה 3 (נתב או מתג L3)', ['להחליף כבל', 'להפעיל Hub', 'להגדיל את ה-MTU'], 'VLAN-ים שונים = Subnets שונים.'],
    [6, 'מהו Router-on-a-Stick?', 'נתב עם ממשק פיזי אחד (Trunk) ו-Sub-interface לכל VLAN', ['נתב עם כבל נפרד לכל מחשב', 'שרת DHCP', 'סוג של Hub'], 'כבל Trunk אחד בין המתג לנתב.'],
    [6, 'איזו פקודה מקשרת Sub-interface ל-VLAN 10?', 'encapsulation dot1Q 10', ['switchport access vlan 10', 'vlan 10 subinterface', 'trunk encapsulation 10'], 'מגדירים על interface g0/0.10.'],
    [6, 'איזו פקודה מפעילה ניתוב במתג L3?', 'ip routing', ['switchport mode routed', 'no shutdown', 'vlan routing enable'], 'בלי ip routing ה-SVI לא ינתבו.'],
    [7, 'איזה מהבאים הוא **יתרון** של VLAN?', 'הקטנת Broadcast Domain ושיפור ביצועים', ['אין צורך בשום תכנון', 'ביטול הצורך בחומת אש', 'הפחתת מספר ה-VLAN-ים'], 'פחות Broadcast = רשת מהירה.'],
    [7, 'איזה מהבאים הוא **חיסרון** של VLAN?', 'דרוש ניתוב שכבה 3 ותכנון מסודר', ['הגדלת ה-Broadcast', 'ביטול הפרדה', 'עלות של מתג נפרד לכל מחלקה'], 'מורכבות ותשתית ניתוב.'],
    [7, 'מהי התקפת VLAN Hopping?', 'תוקף מצליח להגיע ל-VLAN שאינו שלו (למשל Double Tagging)', ['פריצת סיסמת Wi-Fi', 'מחיקת VLAN', 'הצפת Broadcast בלבד'], 'מנצלת Native VLAN וניהול Trunk לקוי.'],
    [7, 'איך מקשיחים מפני VLAN Hopping?', 'Native VLAN ייעודי שאינו בשימוש, וכיבוי פורטים לא בשימוש', ['להשאיר Native VLAN 1', 'לחבר Hub לפורט', 'לפתוח את כל ה-VLAN-ים ב-Trunk'], 'Best practices.'],
    [8, 'איזה זוג פקודות יוצר VLAN 10 בשם SALES?', 'vlan 10  ואז  name SALES', ['name SALES  ואז  vlan 10', 'interface vlan 10 ואז description SALES', 'switchport vlan 10 SALES'], 'נכנסים ל-config-vlan ומגדירים שם.'],
    [8, 'איזו פקודה משייכת פורט Access ל-VLAN 20?', 'switchport access vlan 20', ['switchport trunk vlan 20', 'vlan access 20', 'access-port vlan 20'], 'ברמת הממשק.'],
    [8, 'איזו פקודה הופכת פורט ל-Trunk?', 'switchport mode trunk', ['switchport trunk on', 'trunk enable', 'switchport access trunk'], 'ברמת הממשק.'],
    [8, 'איך שומרים את ההגדרות בין אתחולים?', 'copy running-config startup-config', ['save vlan', 'write terminal', 'reload'], 'running-config ב-RAM, startup-config ב-NVRAM.'],
    [8, 'בנתב, הממשק מוגדר וה-Sub-interfaces קיימים – אבל אין תקשורת. מה נשכח סביר?', 'no shutdown על הממשק הפיזי', ['switchport mode access', 'vlan 1', 'ip routing'], 'בנתב ממשקים כבויים כברירת מחדל.'],
    [8, 'איפה נשמרים מספרי ושמות ה-VLAN-ים במתג 2960?', 'בקובץ vlan.dat בזיכרון Flash', ['בתוך startup-config בלבד', 'בכרטיס הרשת של המחשב', 'בשרת DNS'], 'ולכן לא תמיד מופיעים ב-running-config.'],
    [9, 'איזו פקודה מציגה VLAN-ים והפורטים ששייכים אליהם?', 'show vlan brief', ['show ip route', 'show clock', 'show version brief'], 'הפקודה הראשונה לבדיקת VLAN.'],
    [9, 'איזו פקודה מציגה את ה-Trunk-ים, Native ו-Allowed?', 'show interfaces trunk', ['show vlan trunk', 'show trunk brief', 'show ip trunk'], 'ארבע טבלאות.'],
    [9, 'מדוע פורט Trunk לא מופיע ב-show vlan brief?', 'כי פורט Trunk משרת הרבה VLAN-ים ואינו שייך ל-VLAN יחיד', ['כי הוא כבוי', 'כי הוא שבור', 'כי VLAN 1 נמחק'], 'זו התנהגות תקינה.'],
    [9, 'ה-ping ל-Gateway נכשל (Request timed out). מה הבדיקה הראשונה הכי הגיונית?', 'שהפורט UP ובאמת ב-VLAN הנכון', ['להחליף את כל הכבלים', 'למחוק את ה-VLAN-ים', 'לאתחל את כל הרשת'], 'מתחילים מהשכבה התחתונה.'],
    [9, 'איזו פקודה מראה על איזה פורט ובאיזה VLAN נלמדה כתובת MAC?', 'show mac address-table', ['show arp vlan', 'show cdp neighbors', 'show version'], 'MAC לפי VLAN ופורט.'],
    [9, 'מה מציג show interfaces fa0/1 switchport?', 'Administrative/Operational Mode וה-Access VLAN של הפורט', ['את טבלת הניתוב', 'את גרסת ה-IOS', 'את הסיסמאות'], 'מראה מה הוגדר מול מה קורה בפועל.'],
  ];
  const TOTAL = 15, PASS = 0.7;
  function pickQuestions() {
    const byCh = {}; Q.forEach((q, i) => { (byCh[q[0]] = byCh[q[0]] || []).push(i); });
    const chosen = []; for (let c = 1; c <= 9; c++) chosen.push(VQ.pick(byCh[c]));
    const rest = VQ.shuffle(Q.map((_, i) => i).filter((i) => !chosen.includes(i)));
    while (chosen.length < TOTAL) chosen.push(rest.pop());
    return VQ.shuffle(chosen).map((i) => { const q = Q[i]; const opts = VQ.shuffle([{ t: q[2], ok: true }].concat(q[3].map((t) => ({ t, ok: false })))); return { ch: q[0], q: q[1], opts, why: q[4] }; });
  }
  VQ.examBank = Q;
  const ex = VQ.exam = {};
  ex.intro = function () {
    const best = S.data.exam.best;
    ui.modal(h('div', { style: { textAlign: 'center', maxWidth: '520px' } },
      h('div', { style: { fontSize: '64px' } }, '👾'), h('h2', {}, 'הקרב האחרון: מפלצת ה-Broadcast'),
      h('p', {}, `${TOTAL} שאלות מכל הנושאים שלמדתם. ענו נכון כדי לפגוע במפלצת. צריך לפחות ${Math.ceil(TOTAL * PASS)} תשובות נכונות (70%) כדי לעבור ולקבל את **תעודת ההבנה** 🎓 ואת גביע האלוף 👑.`.replace(/\*\*/g, '')),
      best ? h('p', { class: 'sub' }, `הציון הטוב ביותר שלכם: ${best}%`) : null,
      h('div', { class: 'row', style: { justifyContent: 'center' } },
        h('button', { class: 'btn green', onClick: ex.start }, '⚔️ לקרב!'), h('button', { class: 'btn ghost', onClick: () => ui.closeModal() }, 'עוד לא מוכן'))));
  };
  ex.start = function () {
    ui.clearAll(); VQ.sfx.music(true);
    const st = new VQ.Stage({ bg: 0x12060c, fogNear: 30, fogFar: 90 }); VQ.engine.setStage(st);
    M.grid(st, 80, 0x4a1d2e); M.stars(st, 300, 80);
    st.setCam([0, 5, 13], [0, 3, 0]); st.setInset(window.innerWidth < 700 ? 360 : 300, 50);
    // boss
    const boss = new THREE.Group(); boss.position.set(0, 3.8, -4); st.add(boss);
    const core = M.sph(2.2, 0x991b1b, { e: 0xdc2626, ei: 0.7, r: 0.4 }, 24); boss.add(core);
    for (let i = 0; i < 26; i++) { const a = Math.acos(1 - 2 * (i + 0.5) / 26), b = Math.PI * (1 + Math.sqrt(5)) * i; const s = M.cyl(0, 0.35, 1.3, 0xfb7185, { e: 0xef4444, ei: 0.6 }, 6); const n = V3(Math.sin(a) * Math.cos(b), Math.cos(a), Math.sin(a) * Math.sin(b)); s.position.copy(n.clone().multiplyScalar(2.6)); s.lookAt(n.clone().multiplyScalar(5)); s.rotateX(Math.PI / 2); boss.add(s); }
    [-0.8, 0.8].forEach((x) => { const e = M.sph(0.42, 0xffffff, { e: 0xffffff, ei: 0.9 }, 12); e.position.set(x, 0.4, 2.0); boss.add(e); const p = M.sph(0.2, 0x111111, {}, 8); p.position.set(x, 0.4, 2.35); boss.add(p); });
    const mouth = M.box(1.6, 0.25, 0.2, 0x111111); mouth.position.set(0, -0.7, 2.15); boss.add(mouth);
    const gl = M.glow(0xff2a2a, 12, 0.6); boss.add(gl);
    const hero = M.avatar(S.data.color); hero.position.set(-4.5, 0, 4.5); hero.scale.setScalar(1.5); hero.rotation.y = 0.5; st.add(hero);
    st.onUpdate((dt, t) => { boss.rotation.y += dt * 0.3; boss.position.y = 3.8 + Math.sin(t * 1.5) * 0.3; hero.tick(dt); });
    const qs = pickQuestions(); ex.debugQs = qs; let i = 0, ok = 0, score = 0; const wrongCh = new Set(); let qStart = 0;
    const gh = ui.layer('gamehud'); gh.innerHTML = '';
    const hpFill = h('i', { style: { width: '100%' } }), hp = h('div', { class: 'boss-hp' }, hpFill);
    const top = h('div', { class: 'gtop' }, h('div', { class: 'gstat' }, h('div', { class: 'l' }, 'שאלה'), h('div', { class: 'v', id: 'exq' }, `1/${TOTAL}`)), h('div', { style: { flex: 1, maxWidth: '420px', margin: '8px 14px' } }, h('div', { style: { fontSize: '12px', color: '#fca5a5', marginBottom: '3px' } }, '👾 מפלצת ה-Broadcast'), hp), h('div', { class: 'gstat' }, h('div', { class: 'l' }, 'נכונות'), h('div', { class: 'v', id: 'exok' }, '0')));
    const panel = h('div', { style: { position: 'absolute', bottom: 0, left: 0, right: 0, display: 'flex', justifyContent: 'center', padding: '0 10px 10px', pointerEvents: 'none' } });
    gh.append(top, panel);
    function laser(good) {
      const from = V3(hero.position.x + 0.6, 2.6, hero.position.z - 0.3), to = boss.position.clone();
      const beam = M.sph(0.35, good ? 0x67e8f9 : 0xf87171, { e: good ? 0x22d3ee : 0xef4444, ei: 1 }, 10); beam.position.copy(good ? from : to); st.add(beam);
      const a = good ? from : to, b = good ? to.clone().add(V3(0, 0, 2)) : V3(hero.position.x, 2, hero.position.z);
      st.tween(beam.position, { x: b.x, y: b.y, z: b.z }, 0.5, { ease: 'in' }).then(() => { st.remove(beam); VQ.fx.burst(st, b, good ? 0x67e8f9 : 0xf87171, 26, 5); if (good) { hpFill.style.width = Math.max(0, 100 - (ok / TOTAL) * 100) + '%'; st.shake = 0.7; core.material = M.mat(0xffffff, { e: 0xffffff, ei: 1 }); setTimeout(() => { core.material = M.mat(0x991b1b, { e: 0xdc2626, ei: 0.7, r: 0.4 }); }, 120); } else { st.shake = 0.9; hero.userData.cheer = 0; } });
      VQ.sfx.play(good ? 'zap' : 'boom');
    }
    function show() {
      const q = qs[i]; qStart = performance.now(); panel.innerHTML = '';
      document.getElementById('exq').textContent = `${i + 1}/${TOTAL}`;
      const box = h('div', { class: 'modal', style: { pointerEvents: 'auto', width: 'min(760px,100%)', maxHeight: '58vh' } });
      box.append(h('div', { class: 'sub' }, `${VQ.CHAPTERS[q.ch - 1].icon} נושא ${q.ch}: ${VQ.CHAPTERS[q.ch - 1].title}`), h('div', { class: 'q-big', html: VQ.rich(q.q) }));
      const opts = h('div', { class: 'opts' }); let locked = false;
      q.opts.forEach((o) => {
        const b = h('button', { class: 'opt', html: VQ.rich(o.t) });
        b.onclick = () => {
          if (locked) return; locked = true;
          const t = (performance.now() - qStart) / 1000;
          if (o.ok) { b.classList.add('ok'); ok++; const pts = 100 + Math.max(0, Math.round((20 - t) * 3)); score += pts; document.getElementById('exok').textContent = ok; hero.userData.cheer = 1; laser(true); }
          else { b.classList.add('bad'); [...opts.children].forEach((c, k) => { if (q.opts[k].ok) c.classList.add('ok'); }); wrongCh.add(q.ch); laser(false); }
          box.append(h('div', { class: 'fb ' + (o.ok ? 'ok' : 'bad') }, (o.ok ? '✔ נכון! ' : '✖ לא בדיוק. ') + q.why));
          box.append(h('div', { class: 'row', style: { justifyContent: 'flex-end' } }, h('button', { class: 'btn green sm', onClick: () => { VQ.sfx.play('click'); i++; if (i >= TOTAL) done(); else show(); } }, i + 1 >= TOTAL ? 'לתוצאות' : 'השאלה הבאה ◀')));
          VQ.sfx.play(o.ok ? 'ok' : 'bad');
        };
        opts.append(b);
      });
      box.append(opts); panel.append(box);
    }
    function done() {
      panel.innerHTML = ''; const pct = Math.round((ok / TOTAL) * 100), pass = ok / TOTAL >= PASS;
      S.data.exam.attempts++; S.data.exam.best = Math.max(S.data.exam.best, pct);
      if (pass) { S.data.exam.passed = true; S.data.exam.date = S.data.exam.date || Date.now(); }
      S.save(); S.checkAchievements();
      if (pass) { VQ.sfx.play('fanfare'); VQ.fx.confetti(st, V3(0, 5, 3), 90); boss.visible = false; VQ.fx.burst(st, boss.position.clone(), 0xfb7185, 80, 8, 0.3); } else VQ.sfx.play('lose');
      const weak = [...wrongCh].map((c) => `${VQ.CHAPTERS[c - 1].icon} ${VQ.CHAPTERS[c - 1].title}`);
      setTimeout(() => ui.modal(h('div', { style: { textAlign: 'center' } },
        h('div', { style: { fontSize: '60px' } }, pass ? '🏆' : '💪'), h('h2', {}, pass ? 'ניצחתם את המפלצת!' : 'כמעט…'),
        h('div', { class: 'bigscore' }, pct + '%'), h('p', {}, `${ok} מתוך ${TOTAL} תשובות נכונות • ${pass ? 'עברתם!' : `צריך ${Math.ceil(TOTAL * PASS)} כדי לעבור`}`),
        weak.length ? h('p', { class: 'sub' }, 'כדאי לחזור על: ' + weak.join(' • ')) : h('p', {}, 'בלי אף טעות! 🌟'),
        h('div', { class: 'row', style: { justifyContent: 'center', marginTop: '10px' } },
          pass ? h('button', { class: 'btn amber', onClick: () => VQ.social.certificate(true) }, '🎓 לתעודה שלי') : h('button', { class: 'btn green', onClick: ex.start }, '🔁 ניסיון נוסף'),
          h('button', { class: 'btn ghost', onClick: () => VQ.goHub() }, '🗺️ למפה')))), 900);
    }
    ui.modal(h('div', { style: { textAlign: 'center' } }, h('h2', {}, '👾 מפלצת ה-Broadcast מתקרבת!'), h('p', {}, 'ענו נכון כדי להילחם. בהצלחה!'), h('button', { class: 'btn green', onClick: () => { ui.closeModal(); show(); } }, '⚔️ מתחילים')), { dim: false });
  };
})(window.VQ);
