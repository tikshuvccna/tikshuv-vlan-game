/* Lesson 8 – configuring VLANs on Cisco (a live IOS simulation the student can watch and then use) */
(function (VQ) {
  const M = VQ.M, V3 = M.V3, T = VQ.T, sim = VQ.sim;

  function buildTopo() {
    const t = T.make();
    t.addDevice('sw1', { hostname: 'Switch', fa: 8, gi: 2 });
    t.addDevice('sw2', { hostname: 'SW2', fa: 8, gi: 2 });
    t.addDevice('r1', { kind: 'router', hostname: 'Router', gi: 2 });
    const H = (id, name, ip, gw) => t.addHost(id, { name, ip, mask: '255.255.255.0', gw });
    H('s1', 'דנה', '192.168.10.11', '192.168.10.1'); H('s2', 'רון', '192.168.10.12', '192.168.10.1');
    H('f1', 'יוסי', '192.168.20.11', '192.168.20.1'); H('f2', 'נועה', '192.168.20.12', '192.168.20.1');
    H('g1', 'אורח', '192.168.30.11', '192.168.30.1');
    H('s3', 'מיכל', '192.168.10.13', '192.168.10.1'); H('f3', 'אבי', '192.168.20.13', '192.168.20.1');
    ['s1', 's2', 'f1', 'f2', 'g1'].forEach((h, i) => T.h2s(t, h, 'sw1', 'Fa0/' + (i + 1)));
    T.h2s(t, 's3', 'sw2', 'Fa0/1'); T.h2s(t, 'f3', 'sw2', 'Fa0/2');
    T.s2s(t, 'sw1', 'Gi0/1', 'sw2', 'Gi0/1'); T.s2s(t, 'sw1', 'Gi0/2', 'r1', 'Gi0/0');
    // SW2 is already configured by the "other admin"
    const s2 = T.cfg(t.devs.sw2, ['vlan 10', 'name SALES', 'vlan 20', 'name FINANCE', 'vlan 99', 'name MGMT', 'interface fastEthernet 0/1', 'switchport mode access', 'switchport access vlan 10', 'interface fastEthernet 0/2', 'switchport mode access', 'switchport access vlan 20']);
    return t;
  }
  const LAYOUT = {
    devices: {
      sw1: { type: 'switch', pos: [-4.6, 0, 0], ports: 7, pitch: 0.85, map: { 'Fa0/1': 0, 'Fa0/2': 1, 'Fa0/3': 2, 'Fa0/4': 3, 'Fa0/5': 4, 'Gi0/2': 5, 'Gi0/1': 6 }, chipY: 1.7, chipZ: -1.6 },
      sw2: { type: 'switch', pos: [4.8, 0, 0], ports: 4, pitch: 0.85, map: { 'Fa0/1': 0, 'Fa0/2': 1, 'Gi0/1': 3 }, chipY: 1.7, chipZ: -1.6 },
      r1: { type: 'router', pos: [-1.2, 0, -6], scale: 1.0 },
    },
    hosts: {
      s1: { pos: [-7.58, 0, 4.2], scale: 0.8 }, s2: { pos: [-6.59, 0, 5.4], scale: 0.8 }, f1: { pos: [-5.6, 0, 4.2], scale: 0.8 }, f2: { pos: [-4.6, 0, 5.4], scale: 0.8 }, g1: { pos: [-3.61, 0, 4.2], type: 'laptop', scale: 0.8 },
      s3: { pos: [3.1, 0, 4.2], scale: 0.8 }, f3: { pos: [4.6, 0, 5.4], scale: 0.8 },
    },
  };
  // ---- the script: what is typed (run) and what is applied silently when rebuilding (silent)
  const STEPS = [
    { run: [['sw1', ['enable', 'configure terminal', 'hostname SW1', 'exit', 'show version | include uptime']]] },
    { run: [['sw1', ['configure terminal', 'vlan 10', 'name SALES', 'vlan 20', 'name FINANCE', 'vlan 99', 'name MGMT', 'end', 'show vlan brief']]] },
    { run: [['sw1', ['configure terminal', 'interface range fastEthernet 0/1 - 2', 'switchport mode access', 'switchport access vlan 10', 'exit', 'interface range fastEthernet 0/3 - 4', 'switchport mode access', 'switchport access vlan 20', 'end', 'show vlan brief']]] },
    { silent: [['sw1', ['configure terminal', 'vlan 30', 'name GUEST', 'interface fastEthernet 0/5', 'switchport mode access', 'switchport access vlan 30', 'end']]] },
    { run: [['sw1', ['configure terminal', 'interface gigabitEthernet 0/1', 'switchport mode trunk', 'switchport trunk native vlan 999', 'switchport trunk allowed vlan 10,20,99', 'end', 'show interfaces trunk']], ['sw2', ['enable', 'configure terminal', 'interface gigabitEthernet 0/1', 'switchport mode trunk', 'switchport trunk native vlan 999', 'switchport trunk allowed vlan 10,20,99', 'end']]], ping: ['s1', '192.168.10.13'] },
    { run: [['sw1', ['configure terminal', 'interface gigabitEthernet 0/2', 'switchport mode trunk', 'end']], ['r1', ['enable', 'configure terminal', 'interface gigabitEthernet 0/0', 'no shutdown', 'interface gigabitEthernet 0/0.10', 'encapsulation dot1Q 10', 'ip address 192.168.10.1 255.255.255.0', 'interface gigabitEthernet 0/0.20', 'encapsulation dot1Q 20', 'ip address 192.168.20.1 255.255.255.0', 'end', 'show ip interface brief']]], ping: ['s1', '192.168.20.11'] },
    { run: [['sw1', ['configure terminal', 'interface vlan 99', 'ip address 192.168.99.2 255.255.255.0', 'no shutdown', 'exit', 'ip default-gateway 192.168.99.1', 'end', 'show ip interface brief']]] },
    { run: [['sw1', ['show running-config interface fastEthernet 0/1', 'copy running-config startup-config']]] },
  ];
  function silentApply(topo, sessions, upto) {
    for (let k = 0; k < upto; k++) {
      const st = STEPS[k];
      [].concat(st.run || [], st.silent || []).forEach(([d, cmds]) => { const s = sessions[d]; cmds.forEach((c) => { if (!/^show /.test(c)) s.exec(c); }); });
    }
  }

  VQ.lab8 = { buildTopo, LAYOUT, STEPS, silentApply };
  VQ.lesson('config', {
    narrow: true,
    build(L) {
      const st = L.stage; M.grid(st, 90, 0x16305a); M.stars(st, 300, 80);
      L.net = L.makeNet();
      const topo = buildTopo(); L.topo = topo;
      L.lab = new VQ.Lab3D(st, topo, LAYOUT, L.net);
      const mk = (t) => ({ sw1: new sim.Session(t.devs.sw1), sw2: new sim.Session(t.devs.sw2), r1: new sim.Session(t.devs.r1) });
      L.mk = mk; L.sess = mk(topo);
      L.term = new VQ.Terminal({
        title: '⌨️ Cisco CLI', tabs: [{ id: 'sw1', label: 'SW1', session: L.sess.sw1 }, { id: 'sw2', label: 'SW2', session: L.sess.sw2 }, { id: 'r1', label: 'R1', session: L.sess.r1 }],
        chips: VQ.Terminal.suggest, onCommand: () => { L.lab.sync(); },
      }).mount(VQ.ui.layer('gamehud'));
      L.term.setChipsEnabled(false);
      st.setCam([0.3, 12.5, 20], [0.3, 0.3, -1]);
      st.setInset(0, 0, window.innerWidth > 900 ? -Math.min(560, window.innerWidth * 0.46) : 0);
      L.rebuild = (upto) => {
        const t = buildTopo(); const s = mk(t); silentApply(t, s, upto);
        L.topo = t; L.sess = s; L.term.replaceSessions(s); L.lab.setTopo(t); L.term.select(L.term.cur.id);
      };
      L.play = async (step, tok) => {
        const alive = () => L.tok === tok;
        for (const [d, cmds] of step.run || []) {
          L.term.select(d); L.term.chips.style.display = 'none';
          for (const c of cmds) { if (!(await L.term.type(c, 30, alive))) return false; L.lab.sync(); await new Promise((r) => setTimeout(r, 200)); if (!alive()) return false; }
        }
        if (step.ping && alive()) { L.term.select('sw1'); const ok = await L.lab.ping(step.ping[0], step.ping[1], { speed: 6 }); }
        return alive();
      };
    },
    steps: [
      {
        t: 'מצבי ה-CLI ושמות',
        x: 'מתג Cisco מוגדר דרך שורת פקודה (**CLI**). יש כמה מצבים, וה-Prompt אומר לכם באיזה אתם: `Switch>` **User EXEC** • `Switch#` **Privileged EXEC** (אחרי `enable`) • `Switch(config)#` **הגדרות כלליות** (אחרי `configure terminal`) • `Switch(config-if)#` **הגדרות ממשק**. הטרמינל משמאל אמיתי — אפשר להשתמש ב-`?`, ב-Tab ובקיצורים כמו `conf t`.',
        enter(L) { const tok = L.tok; L.rebuild(0); L.term.setChipsEnabled(false); L.play(STEPS[0], tok); },
      },
      {
        t: 'יצירת VLAN-ים',
        x: 'ב-`vlan 10` יוצרים VLAN ונכנסים למצב `(config-vlan)#`. ב-`name SALES` נותנים לו שם ברור. VLAN 99 יהיה ה-VLAN של ניהול. `show vlan brief` מציג את כל ה-VLAN-ים ואת הפורטים ששייכים לכל אחד — כרגע כל הפורטים עדיין ב-VLAN 1 (default).',
        enter(L) { const tok = L.tok; L.rebuild(1); L.term.setChipsEnabled(false); L.play(STEPS[1], tok); },
      },
      {
        t: 'הקצאת פורטים (Access)',
        x: 'עכשיו משייכים פורטים: `switchport mode access` קובע שהפורט משרת ציוד קצה, ו-`switchport access vlan 10` קובע את ה-VLAN. עם `interface range` מגדירים כמה פורטים בבת אחת. שימו לב איך הנוריות והכבלים במודל התלת־ממדי נצבעים.',
        enter(L) { const tok = L.tok; L.rebuild(2); L.term.setChipsEnabled(false); L.play(STEPS[2], tok); },
      },
      {
        t: 'עכשיו תורכם! 🎮',
        x: 'האורח ב-`Fa0/5` עדיין ב-VLAN 1. **הקלידו בטרמינל** את הפקודות שיצרו VLAN 30 ויעבירו אליו את הפורט: `configure terminal` ← `interface fastEthernet 0/5` ← `switchport mode access` ← `switchport access vlan 30`. אפשר ללחוץ על ההצעות מתחת לטרמינל.',
        prompt: 'הקלידו את הפקודות (Fa0/5 → VLAN 30)',
        enter(L) {
          L.rebuild(3); L.term.select('sw1'); L.term.setChipsEnabled(true);
          // reset silent step 3 for this interactive step: undo what silent applied
          const dev = L.topo.devs.sw1; const i = dev.ifaces['FastEthernet0/5']; i.accessVlan = 1; i.mode = 'auto'; dev.vlans.delete(30); L.lab.sync();
          L.term.sys('# הקלידו: enable → configure terminal → interface fastEthernet 0/5 ...'); L.term.session.exec('enable'); L.term.pr.textContent = L.term.promptText();
          const tok = L.tok;
          L.term.opts.onCommand = () => {
            L.lab.sync(); const dv = L.topo.devs.sw1, ii = dv.ifaces['FastEthernet0/5'];
            if (L.tok === tok && ii.mode === 'access' && ii.accessVlan === 30 && !L.canNext) { L.unlock(); VQ.fx.confetti(L.stage, V3(-5, 3, 0), 30); L.term.sys('# ✔ מעולה! Fa0/5 שייך עכשיו ל-VLAN 30'); }
          };
          L.onCleanup(() => { L.term.opts.onCommand = () => L.lab.sync(); });
        },
      },
      {
        t: 'Trunk בין המתגים',
        x: '`switchport mode trunk` הופך פורט ל-Trunk. שני טיפים של מקצוענים: 1) `switchport trunk native vlan 999` — Native VLAN שלא בשימוש (חייב להיות זהה בשני הצדדים!). 2) `switchport trunk allowed vlan 10,20,99` — מגבילים רק ל-VLAN-ים הנחוצים. עכשיו דנה (SW1) ומיכל (SW2) — שניהם VLAN 10 — יכולים לדבר.',
        enter(L) { const tok = L.tok; L.rebuild(4); L.term.setChipsEnabled(false); L.play(STEPS[4], tok); },
      },
      {
        t: 'Router-on-a-Stick',
        x: 'הפורט אל הנתב מוגדר Trunk. בנתב: `no shutdown` על הממשק הפיזי (בנתב כל ממשק כבוי כברירת מחדל!), ואז **Sub-interface** לכל VLAN — `encapsulation dot1Q 10` מקשר אותו ל-VLAN 10, וה-`ip address` הוא ה-Default Gateway של אותו VLAN. עכשיו ping בין מכירות לכספים עובד.',
        enter(L) { const tok = L.tok; L.rebuild(5); L.term.setChipsEnabled(false); L.play(STEPS[5], tok); },
      },
      {
        t: 'כתובת ניהול (SVI)',
        x: 'כדי לנהל את המתג מרחוק נותנים לו כתובת IP ב-VLAN הניהול: `interface vlan 99` + `ip address` + `no shutdown`, ובסוף `ip default-gateway`. הממשק הווירטואלי הזה נקרא **SVI**. (במתג L3 אותו SVI גם משמש כ-Gateway לניתוב, עם `ip routing`.)',
        enter(L) { const tok = L.tok; L.rebuild(6); L.term.setChipsEnabled(false); L.play(STEPS[6], tok); },
      },
      {
        t: 'שמירה!',
        x: 'כל מה שהקלדנו נמצא ב-**running-config** (זיכרון RAM) ויימחק באתחול. כדי לשמור ל-**startup-config** (NVRAM): `copy running-config startup-config` (או `write memory`). הערה: הגדרות VLAN עצמן (מספר ושם) נשמרות בקובץ `vlan.dat` בזיכרון ה-Flash, ולכן לא מופיעות ב-running-config.',
        enter(L) { const tok = L.tok; L.rebuild(7); L.term.setChipsEnabled(false); L.play(STEPS[7], tok); },
      },
      {
        t: 'בדיקת הבנה',
        x: '',
        q: { q: 'איזו סדרת פקודות משייכת את הפורט Fa0/7 ל-VLAN 20?', o: ['`interface fa0/7` ← `switchport mode access` ← `switchport access vlan 20`', '`interface vlan 20` ← `switchport fa0/7`', '`vlan 20` ← `port fa0/7 access`', '`interface fa0/7` ← `switchport mode trunk` ← `vlan 20`'], a: 0, why: 'נכנסים לממשק, קובעים Access, ומצמידים VLAN.' },
        enter(L) { L.rebuild(8); L.term.setChipsEnabled(false); },
      },
    ],
  });
})(window.VQ);
