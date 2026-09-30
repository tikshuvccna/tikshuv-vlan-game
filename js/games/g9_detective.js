/* Game 9 – Network Detective (chapter: verification & troubleshooting). Find and fix injected faults with show commands and pings. */
(function (VQ) {
  const M = VQ.M, V3 = M.V3, h = VQ.h, T = VQ.T, sim = VQ.sim;
  const CASES = {
    easy: [
      { title: 'תיק #1: דנה לא מגיעה לרון', story: 'דנה ורון שניהם במכירות, אבל ה-ping מהמחשב של דנה לרון נכשל. הם מחוברים לאותו מתג (SW1).', faults: [['sw1', ['interface fastEthernet 0/2', 'switchport access vlan 20']]], goals: [['s1', '192.168.10.12', 'דנה ← רון']], hints: ['הריצו show vlan brief ב-SW1: באיזה VLAN נמצא Fa0/2 (הפורט של רון)?', 'Fa0/2 שייך ל-FINANCE במקום SALES. תקנו: interface fa0/2 ← switchport access vlan 10'], fix: [['sw1', ['interface fa0/2', 'switchport access vlan 10']]] },
      { title: 'תיק #2: יוסי אבד חיבור', story: 'המחשב של יוסי (מחובר ל-Fa0/3 ב-SW1) לא מגיע לאף אחד, גם לא לנועה שיושבת לידו.', faults: [['sw1', ['interface fastEthernet 0/3', 'shutdown']]], goals: [['f1', '192.168.20.12', 'יוסי ← נועה']], hints: ['הריצו show ip interface brief או show interfaces status ב-SW1 – מה הסטטוס של Fa0/3?', 'הפורט במצב administratively down / disabled. תקנו: interface fa0/3 ← no shutdown'], fix: [['sw1', ['interface fa0/3', 'no shutdown']]] },
      { title: 'תיק #3: מיכל בקומה השנייה מנותקת', story: 'מיכל (SW2) נמצאת ב-VLAN 10 כמו דנה (SW1), אבל אין תקשורת ביניהן. המתגים מחוברים ב-Trunk.', faults: [['sw2', ['interface gigabitEthernet 0/1', 'switchport trunk allowed vlan 20,99']]], goals: [['s1', '192.168.10.13', 'דנה ← מיכל']], hints: ['הריצו show interfaces trunk ב-SW2. אילו VLAN-ים מורשים ב-Trunk?', 'VLAN 10 חסר ברשימת ה-Allowed. תקנו: interface gi0/1 ← switchport trunk allowed vlan add 10'], fix: [['sw2', ['interface gi0/1', 'switchport trunk allowed vlan add 10']]] },
    ],
    mid: [
      { title: 'תיק #4: כל הכספים נעלמו', story: 'אף אחד מהכספים לא מצליח לתקשר: לא בינם לבין עצמם ולא עם שאר המחלקות. במשרד אמרו ש"מישהו ניקה הגדרות".', faults: [['sw1', ['no vlan 20']]], goals: [['f1', '192.168.20.12', 'יוסי ← נועה'], ['s1', '192.168.20.11', 'דנה ← יוסי']], hints: ['השוו את show vlan brief למה שצריך להיות. מה חסר?', 'VLAN 20 נמחק. צרו אותו מחדש: vlan 20 ← name FINANCE (הפורטים עדיין משויכים אליו).'], fix: [['sw1', ['vlan 20', 'name FINANCE']]] },
      { title: 'תיק #5: אין ניתוב לכספים', story: 'כל VLAN עובד בפני עצמו, אבל דנה (מכירות) לא מצליחה להגיע לשרתי הכספים דרך הנתב. הממשקים בנתב נראים "up".', faults: [['r1', ['interface gigabitEthernet 0/0.20', 'encapsulation dot1Q 30']]], goals: [['s1', '192.168.20.11', 'דנה ← יוסי']], hints: ['ב-R1 הריצו show running-config (או show run | section 0/0). מה ה-encapsulation של כל Sub-interface?', 'ל-g0/0.20 הוגדר dot1Q 30 במקום 20. תקנו: interface g0/0.20 ← encapsulation dot1Q 20'], fix: [['r1', ['interface g0/0.20', 'encapsulation dot1Q 20']]] },
      { title: 'תיק #6: הקומה השנייה בודדה', story: 'אף מחשב בקומה 2 (SW2) לא מדבר עם קומה 1, למרות שהכבל תקין ונורית הקישור דולקת.', faults: [['sw1', ['interface gigabitEthernet 0/1', 'switchport mode access']]], goals: [['s1', '192.168.10.13', 'דנה ← מיכל'], ['f1', '192.168.20.13', 'יוסי ← אבי']], hints: ['הריצו show interfaces trunk ב-SW1. האם Gi0/1 מופיע שם?', 'הפורט הוגדר Access ולכן לא נושא VLAN-ים מרובים. תקנו: interface gi0/1 ← switchport mode trunk'], fix: [['sw1', ['interface gi0/1', 'switchport mode trunk']]] },
    ],
    hard: [
      { title: 'תיק #7: שתי תקלות ביום אחד', story: 'דנה לא מגיעה לרון וגם לא לכספים, ובקומה 2 מיכל לא מגיעה לאבי (כספים). זה נראה כמו כמה תקלות יחד.', faults: [['sw1', ['interface fastEthernet 0/1', 'switchport access vlan 20']], ['r1', ['interface gigabitEthernet 0/0', 'shutdown']]], goals: [['s1', '192.168.10.12', 'דנה ← רון'], ['s1', '192.168.20.11', 'דנה ← יוסי'], ['s3', '192.168.20.13', 'מיכל ← אבי']], hints: ['שני מקומות לבדוק: פורט Fa0/1 של דנה (show vlan brief) והנתב (show ip interface brief).', 'Fa0/1 ב-VLAN 20 במקום 10, וממשק g0/0 בנתב כבוי (shutdown). תקנו את שניהם.'], fix: [['sw1', ['interface fa0/1', 'switchport access vlan 10']], ['r1', ['interface g0/0', 'no shutdown']]] },
      { title: 'תיק #8: Trunk פגום ונתב מנותק', story: 'הכספים בשתי הקומות לא מדברים ביניהם, ובנוסף אף VLAN לא מצליח להגיע לנתב.', faults: [['sw2', ['interface gigabitEthernet 0/1', 'switchport trunk allowed vlan 10,99']], ['sw1', ['interface gigabitEthernet 0/2', 'switchport mode access']]], goals: [['f1', '192.168.20.13', 'יוסי ← אבי'], ['s1', '192.168.20.11', 'דנה ← יוסי'], ['s3', '192.168.10.11', 'מיכל ← דנה']], hints: ['בדקו show interfaces trunk בשני המתגים. שימו לב גם לפורט של הנתב (Gi0/2 ב-SW1).', 'ב-SW2 חסר VLAN 20 ב-Allowed, וב-SW1 הפורט Gi0/2 לא Trunk. תקנו את שניהם.'], fix: [['sw2', ['interface gi0/1', 'switchport trunk allowed vlan add 20']], ['sw1', ['interface gi0/2', 'switchport mode trunk']]] },
      { title: 'תיק #9: הכתובת והפורט', story: 'אבי (כספים, קומה 2) לא מגיע ליוסי, ודנה לא מצליחה להגיע לשום מחלקה אחרת. הנתב "up/up" בכל הממשקים.', faults: [['sw2', ['interface fastEthernet 0/2', 'shutdown']], ['r1', ['interface gigabitEthernet 0/0.10', 'ip address 192.168.10.2 255.255.255.0']]], goals: [['f1', '192.168.20.13', 'יוסי ← אבי'], ['s1', '192.168.20.11', 'דנה ← יוסי']], hints: ['SW2: show interfaces status – איזה פורט disabled? נתב: show ip interface brief – בדקו את הכתובות מול ה-Gateway של המחשבים (192.168.10.1).', 'Fa0/2 ב-SW2 כבוי, ולכתובת של g0/0.10 בנתב יש .2 במקום .1. תקנו את שניהם.'], fix: [['sw2', ['interface fa0/2', 'no shutdown']], ['r1', ['interface g0/0.10', 'ip address 192.168.10.1 255.255.255.0']]] },
    ],
  };
  VQ.detectiveCases = CASES;
  VQ.game({
    id: 'detective', chapter: 'verify', title: 'הבלש של הרשת',
    concept: 'בדיקת VLAN בפקודות show וב-ping, ואיתור תקלות שכבה אחר שכבה',
    tagline: 'פתחו תיקי תקלות! חקרו עם פקודות show ו-ping, מצאו מה שבור — ותקנו, עד שהכול עובד.',
    howto: [
      'כל תיק כולל סיפור תקלה ורשימת **בדיקות (ping)** שצריכות לעבור. חקרו בטרמינל: בחרו התקן בלשוניות (SW1, SW2, R1, מחשבים).',
      'כלי החקירה: `show vlan brief` • `show interfaces trunk` • `show ip interface brief` • `show interfaces status` • `show running-config` • ping מהמחשבים. **כל כלי חדש שתשתמשו בו מוסיף בונוס חקירה!**',
      'תקנו את ההגדרות עד שכל הבדיקות ✔. רמז עולה בנקודות. ברמות הקשות יש כמה תקלות בתיק אחד.',
    ],
    stage: { bg: 0x0a1020 },
    levels: {
      easy: { cases: CASES.easy, hintCost: 40, limit: 0, stars: [700, 1200, 1700] },
      mid: { cases: CASES.mid, hintCost: 70, limit: 300, stars: [2000, 3500, 5000] },
      hard: { cases: CASES.hard, hintCost: 110, limit: 300, stars: [4600, 8600, 12500] },
    },
    create(G) {
      const st = G.stage, cfg = G.cfg, lv = G.level;
      M.grid(st, 90, 0x16305a); M.stars(st, 200, 80);
      const { buildTopo, LAYOUT, STEPS, silentApply } = VQ.lab8;
      function freshTopo(c) {
        const t = buildTopo(); const s = { sw1: new sim.Session(t.devs.sw1), sw2: new sim.Session(t.devs.sw2), r1: new sim.Session(t.devs.r1) };
        silentApply(t, s, STEPS.length);
        c.faults.forEach(([d, cmds]) => T.cfg(t.devs[d], cmds));
        Object.values(t.devs).forEach((d) => { d.saved = d.runningConfig(); });
        return t;
      }
      let ci = -1, topo, sess, hosts, lab, term, c, caseStart = 0, hintN = 0, used = new Set(), solved = false, poll = 0, stats = { solved: 0, hints: 0, errors: 0, tools: 0 };
      const lay = Object.assign({}, LAYOUT);
      st.setCam([0.3, 11.5, 15], [0.3, 0.3, 0.4]);
      const isNarrow = window.innerWidth < 900;
      st.setInset(isNarrow ? 250 : 350, isNarrow ? 190 : 60, isNarrow ? 0 : -140);
      const net = new VQ.Net3D(st);
      topo = freshTopo(CASES[lv][0]); lab = new VQ.Lab3D(st, topo, lay, net);
      const mkSess = () => {
        sess = { sw1: new sim.Session(topo.devs.sw1), sw2: new sim.Session(topo.devs.sw2), r1: new sim.Session(topo.devs.r1) };
        hosts = { s1: new sim.HostShell(topo, 's1'), f1: new sim.HostShell(topo, 'f1'), s3: new sim.HostShell(topo, 's3') };
        [sess.sw1, sess.sw2, sess.r1].forEach((s) => { s.exec('enable'); });
      };
      mkSess();
      const NAMES = { s1: '💻 דנה', f1: '💻 יוסי', s3: '💻 מיכל' };
      term = new VQ.Terminal({
        title: '🕵️ מרכז חקירות', tabs: [{ id: 'sw1', label: 'SW1', session: sess.sw1 }, { id: 'sw2', label: 'SW2', session: sess.sw2 }, { id: 'r1', label: 'R1', session: sess.r1 }, ...Object.keys(hosts).map((k) => ({ id: k, label: NAMES[k], session: hosts[k] }))],
        chips: (s) => (lv === 'easy' ? (s.mode === 'host' ? ['ipconfig', 'ping 192.168.10.12'] : s.mode === 'priv' ? ['show vlan brief', 'show interfaces trunk', 'show ip interface brief', 'show interfaces status', 'configure terminal'] : VQ.Terminal.suggest(s)) : []),
        onCommand: (s, line, out, tab) => { lab.sync(); after(s, line, out, tab); },
      });
      term.el.classList.add('low'); term.el.style.width = 'min(760px,96vw)'; term.el.style.insetInlineEnd = 'auto'; term.el.style.left = '50%'; term.el.style.transform = 'translateX(-50%)'; term.el.style.height = 'min(37vh,340px)';
      term.mount(G.ui.root);
      const panel = h('div', { class: 'objs', style: { width: 'min(330px,44vw)' } }); G.ui.root.append(panel);
      const btnRow = h('div', { class: 'row', style: { justifyContent: 'center', pointerEvents: 'auto' } });
      G.ui.task.innerHTML = ''; G.ui.task.append(btnRow);
      const hintBox = h('div', { class: 'box', style: { display: 'none', maxWidth: 'min(640px,94vw)' } });
      btnRow.append(h('button', { class: 'btn amber sm', onClick: hint }, `💡 רמז (−${cfg.hintCost})`), h('button', { class: 'btn sm', onClick: runTests }, '🔎 הרצת בדיקות'), hintBox);
      const TOOLS = [['vlanBrief', 'show vlan brief'], ['trunk', 'show interfaces trunk'], ['ipbrief', 'show ip interface brief'], ['status', 'show interfaces status'], ['run', 'show running-config'], ['ping', 'ping מהמחשב']];
      function toolsUsed() { const u = new Set(); [sess.sw1, sess.sw2, sess.r1].forEach((s) => Object.keys(s.stats.shows).forEach((k) => u.add(k))); if (Object.values(hosts).some((x) => x.stats.pings)) u.add('ping'); return u; }
      function goalsState() { return c.goals.map(([hid, ip, label]) => ({ label, ok: topo.hostPing(hid, ip).ok, hid, ip })); }
      function render() {
        const gs = goalsState();
        panel.innerHTML = '';
        panel.append(h('h4', {}, c.title), h('div', { style: { fontSize: '13px', color: '#cbd5e1', marginBottom: '6px', lineHeight: 1.45 } }, c.story));
        panel.append(h('div', { style: { color: '#a3e635', fontWeight: 700, fontSize: '13px' } }, '🎯 בדיקות שצריכות לעבור'));
        gs.forEach((g) => panel.append(h('div', { class: 'o' + (g.ok ? ' done' : '') }, h('span', { class: 'ck' }, g.ok ? '✔' : '✖'), h('span', {}, g.label))));
        panel.append(h('div', { style: { color: '#7dd3fc', fontWeight: 700, fontSize: '13px', marginTop: '6px' } }, '🧰 ארגז כלים (בונוס חקירה)'));
        const u = toolsUsed(); const tw = h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '4px' } });
        TOOLS.forEach(([k, l]) => tw.append(h('span', { class: 'chip2', style: { background: u.has(k) ? 'rgba(74,222,128,.25)' : '#12233f', color: u.has(k) ? '#86efac' : '#7dd3fc', fontSize: '11px', padding: '2px 7px', borderRadius: '7px', fontFamily: 'var(--mono)' } }, (u.has(k) ? '✔ ' : '') + l)));
        panel.append(tw);
        G.setMid('תיק', `${ci + 1}/${cfg.cases.length}`);
        return gs;
      }
      function hint() {
        if (!G.running || solved) return; const k = Math.min(hintN, 1); hintN++; stats.hints++; G.hints++; G.addScore(-cfg.hintCost * (k + 1)); VQ.sfx.play('bad');
        hintBox.style.display = ''; hintBox.innerHTML = '💡 ' + VQ.esc(c.hints[k]); clearTimeout(hint.t); hint.t = setTimeout(() => { hintBox.style.display = 'none'; }, 12000);
      }
      async function runTests() {
        if (!G.running) return; VQ.sfx.play('click');
        for (const g of goalsState()) { if (G.ended || solved) return; await lab.ping(g.hid, g.ip, { speed: 7 }); await st.wait(0.25); }
        check();
      }
      function after(s, line, out, tab) {
        if (out.some((o) => o && o.err)) { stats.errors++; G.miss(0); G.addScore(-5); }
        if (/^ping\s/i.test(line.trim()) && s.mode === 'host') lab.ping(tab.id, line.trim().split(/\s+/)[1], { speed: 7 });
        const u = toolsUsed(); u.forEach((k) => { if (!used.has(k)) { used.add(k); G.addScore(20, null); VQ.sfx.pop && VQ.sfx.play('pop'); stats.tools++; } });
        check();
      }
      function check() {
        if (solved || !c) return; const gs = render();
        if (gs.every((g) => g.ok)) {
          solved = true; stats.solved++;
          const t = G.time - caseStart, tb = cfg.limit ? Math.max(0, Math.round((cfg.limit - t) * 0.6)) : 60;
          VQ.sfx.play('fanfare'); VQ.fx.confetti(st, V3(0, 4, 0), 50); G.msg('✅ התיק נסגר!', '#4ade80'); G.hit(250 + tb, V3(0, 3, 0));
          term.sys('# ✔ כל הבדיקות עוברות! התיק נסגר.');
          setTimeout(() => { if (G.ended) return; if (ci + 1 >= cfg.cases.length) finish(); else load(ci + 1); }, 2200);
        }
      }
      function load(i) {
        ci = i; c = cfg.cases[i]; solved = false; hintN = 0; used = new Set(); caseStart = G.time; hintBox.style.display = 'none';
        topo = freshTopo(c); lab.setTopo(topo); mkSess();
        term.replaceSessions({ sw1: sess.sw1, sw2: sess.sw2, r1: sess.r1, s1: hosts.s1, f1: hosts.f1, s3: hosts.s3 });
        term.select('sw1'); term.sys('# ' + c.title + ' — התחילו לחקור!'); render(); term.refreshChips();
        if (G.running) VQ.sfx.play('level');
      }
      function finish() {
        const perfect = stats.hints === 0 && stats.errors <= 2;
        G.end({ completed: true, perfect, noHints: stats.hints === 0, bonus: perfect ? 300 : 0, title: stats.hints === 0 ? 'בלש על! 🕵️' : 'כל התיקים נסגרו', stats: [['תיקים שנסגרו', stats.solved], ['כלי חקירה שנוצלו', stats.tools], ['רמזים', stats.hints], ['פקודות שגויות', stats.errors]], note: 'השיטה: קישור פיזי ← VLAN של הפורט ← קיום ה-VLAN ← Trunk (Allowed/Native) ← Gateway וניתוב ← ping. עברו על הרשימה לפי הסדר.' });
      }
      G.ctl = {
        intro() { ci = 0; c = cfg.cases[0]; render(); },
        start() { load(0); term.inp.focus(); },
        update(dt) { poll += dt; if (poll > 0.7) { poll = 0; check(); } if (cfg.limit && c && !solved) G.setMid('זמן לתיק', VQ.fmtTime(cfg.limit - (G.time - caseStart))); },
        onEnd() { term.destroy(); },
      };
      G.term = term; G.getTopo = () => topo; G.getCase = () => c;
      ci = 0; c = cfg.cases[0]; topo = freshTopo(c); lab.setTopo(topo); mkSess(); term.replaceSessions({ sw1: sess.sw1, sw2: sess.sw2, r1: sess.r1, s1: hosts.s1, f1: hosts.f1, s3: hosts.s3 }); render();
      return G.ctl;
    },
  });
})(window.VQ);
