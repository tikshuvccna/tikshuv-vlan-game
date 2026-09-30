/* Game 8 – Config Commander (chapter: Cisco configuration). Real IOS simulator with mission objectives. */
(function (VQ) {
  const M = VQ.M, V3 = M.V3, h = VQ.h, T = VQ.T, sim = VQ.sim;
  const F = (n) => 'FastEthernet0/' + n, GI = (n) => 'GigabitEthernet0/' + n;
  const HOST = (t, id, name, ip, gw) => t.addHost(id, { name, ip, mask: '255.255.255.0', gw });
  const ifc = (t, d, n) => t.devs[d].ifaces[n];
  const acc = (d, ports, v) => (t) => ports.every((p) => { const i = ifc(t, d, F(p)); return i.mode === 'access' && i.accessVlan === v; });
  const hasV = (d, id, name) => (t) => { const v = t.devs[d].vlans.get(id); return !!v && v.name.toUpperCase() === name; };
  const sameSet = (a, b) => a && a.size === b.length && b.every((x) => a.has(x));
  const sub = (v, ip) => (t) => { const i = t.devs.r1.ifaces['GigabitEthernet0/0.' + v]; return !!i && i.encap === v && i.ip === ip && i.mask === '255.255.255.0' && !i.shut; };
  const ping = (a, ip) => (t) => t.hostPing(a, ip).ok;

  // ---------------- EASY: guided, one switch ----------------
  function topoEasy() {
    const t = T.make(); t.addDevice('sw1', { hostname: 'Switch', fa: 8, gi: 2 });
    HOST(t, 's1', 'דנה', '192.168.10.11'); HOST(t, 's2', 'רון', '192.168.10.12'); HOST(t, 'f1', 'יוסי', '192.168.20.11'); HOST(t, 'f2', 'נועה', '192.168.20.12');
    ['s1', 's2', 'f1', 'f2'].forEach((x, i) => T.h2s(t, x, 'sw1', 'Fa0/' + (i + 1)));
    return t;
  }
  const EASY = [
    { cmd: 'enable', why: 'נכנסים למצב Privileged', done: (t, s) => s.mode !== 'user' },
    { cmd: 'configure terminal', why: 'נכנסים למצב הגדרות', done: (t, s) => !['user', 'priv'].includes(s.mode) },
    { cmd: 'vlan 10', why: 'יוצרים VLAN 10', done: (t) => t.devs.sw1.vlans.has(10) },
    { cmd: 'name SALES', why: 'נותנים שם ל-VLAN 10', done: hasV('sw1', 10, 'SALES') },
    { cmd: 'vlan 20', why: 'יוצרים VLAN 20', done: (t) => t.devs.sw1.vlans.has(20) },
    { cmd: 'name FINANCE', why: 'נותנים שם ל-VLAN 20', done: hasV('sw1', 20, 'FINANCE') },
    { cmd: 'interface range fastEthernet 0/1 - 2', why: 'בוחרים את שני הפורטים של מכירות', done: (t, s) => (s.mode === 'ifrange' && s.curList && s.curList.length === 2 && s.curList[0].name === F(1)) || acc('sw1', [1, 2], 10)(t) },
    { cmd: 'switchport mode access', why: 'פורטים לציוד קצה', done: (t) => [1, 2].every((p) => ifc(t, 'sw1', F(p)).mode === 'access') },
    { cmd: 'switchport access vlan 10', why: 'משייכים ל-VLAN 10', done: acc('sw1', [1, 2], 10) },
    { cmd: 'interface range fastEthernet 0/3 - 4', why: 'בוחרים את פורטי הכספים', done: (t, s) => (s.mode === 'ifrange' && s.curList && s.curList[0].name === F(3)) || acc('sw1', [3, 4], 20)(t) },
    { cmd: 'switchport mode access', why: 'פורטים לציוד קצה', done: (t) => [3, 4].every((p) => ifc(t, 'sw1', F(p)).mode === 'access') },
    { cmd: 'switchport access vlan 20', why: 'משייכים ל-VLAN 20', done: acc('sw1', [3, 4], 20) },
    { cmd: 'end', why: 'חוזרים למצב Privileged', done: (t, s) => s.mode === 'priv' },
    { cmd: 'show vlan brief', why: 'בודקים שהכול הוגדר', done: (t, s) => !!s.stats.shows.vlanBrief && s.mode === 'priv' },
    { cmd: 'copy running-config startup-config', why: 'שומרים!', done: (t) => t.devs.sw1.isSaved() },
  ];

  // ---------------- MID: one switch + router ----------------
  function topoMid() {
    const t = T.make(); t.addDevice('sw1', { hostname: 'Switch', fa: 8, gi: 2 }); t.addDevice('r1', { kind: 'router', hostname: 'Router', gi: 2 });
    HOST(t, 's1', 'דנה', '192.168.10.11', '192.168.10.1'); HOST(t, 's2', 'רון', '192.168.10.12', '192.168.10.1'); HOST(t, 'f1', 'יוסי', '192.168.20.11', '192.168.20.1'); HOST(t, 'f2', 'נועה', '192.168.20.12', '192.168.20.1'); HOST(t, 'g1', 'אורח', '192.168.30.11', '192.168.30.1');
    ['s1', 's2', 'f1', 'f2', 'g1'].forEach((x, i) => T.h2s(t, x, 'sw1', 'Fa0/' + (i + 1)));
    T.s2s(t, 'sw1', 'Gi0/1', 'r1', 'Gi0/0');
    return t;
  }
  const MID = [
    { text: 'שם המתג SW1', hint: 'בהגדרות כלליות: hostname SW1', check: (t) => t.devs.sw1.hostname === 'SW1' },
    { text: 'VLAN 10 בשם SALES', hint: 'vlan 10  ← name SALES', check: hasV('sw1', 10, 'SALES') },
    { text: 'VLAN 20 בשם FINANCE', hint: 'vlan 20  ← name FINANCE', check: hasV('sw1', 20, 'FINANCE') },
    { text: 'VLAN 30 בשם GUEST', hint: 'vlan 30  ← name GUEST', check: hasV('sw1', 30, 'GUEST') },
    { text: 'Fa0/1–2 = Access VLAN 10', hint: 'interface range fa0/1 - 2 ← switchport mode access ← switchport access vlan 10', check: acc('sw1', [1, 2], 10) },
    { text: 'Fa0/3–4 = Access VLAN 20', hint: 'interface range fa0/3 - 4 ← switchport mode access ← switchport access vlan 20', check: acc('sw1', [3, 4], 20) },
    { text: 'Fa0/5 = Access VLAN 30', hint: 'interface fa0/5 ← switchport mode access ← switchport access vlan 30', check: acc('sw1', [5], 30) },
    { text: 'Gi0/1 = Trunk ל-VLAN 10,20,30', hint: 'interface gi0/1 ← switchport mode trunk ← switchport trunk allowed vlan 10,20,30', check: (t) => { const i = ifc(t, 'sw1', GI(1)); return i.mode === 'trunk' && sameSet(i.allowed, [10, 20, 30]); } },
    { text: 'בנתב: Gi0/0 פעיל (no shutdown)', hint: 'בנתב: interface g0/0 ← no shutdown', check: (t) => !t.devs.r1.ifaces[GI(0)].shut },
    { text: 'Sub-interface ל-VLAN 10: 192.168.10.1', hint: 'interface g0/0.10 ← encapsulation dot1Q 10 ← ip address 192.168.10.1 255.255.255.0', check: sub(10, '192.168.10.1') },
    { text: 'Sub-interface ל-VLAN 20: 192.168.20.1', hint: 'interface g0/0.20 ← encapsulation dot1Q 20 ← ip address 192.168.20.1 255.255.255.0', check: sub(20, '192.168.20.1') },
    { text: 'Sub-interface ל-VLAN 30: 192.168.30.1', hint: 'interface g0/0.30 ← encapsulation dot1Q 30 ← ip address 192.168.30.1 255.255.255.0', check: sub(30, '192.168.30.1') },
    { text: 'ping דנה ↔ יוסי עובד (בין VLAN-ים)', hint: 'כל ההגדרות למעלה חייבות להיות תקינות', check: ping('s1', '192.168.20.11') },
    { text: 'שמירת ההגדרות בשני ההתקנים', hint: 'copy running-config startup-config  (בכל אחד)', check: (t) => t.devs.sw1.isSaved() && t.devs.r1.isSaved() },
  ];

  // ---------------- HARD: two switches + router ----------------
  function topoHard() {
    const t = T.make(); t.addDevice('sw1', { hostname: 'Switch', fa: 8, gi: 2 }); t.addDevice('sw2', { hostname: 'Switch', fa: 8, gi: 2 }); t.addDevice('r1', { kind: 'router', hostname: 'Router', gi: 2 });
    HOST(t, 's1', 'דנה', '192.168.10.11', '192.168.10.1'); HOST(t, 's2', 'רון', '192.168.10.12', '192.168.10.1'); HOST(t, 'f1', 'יוסי', '192.168.20.11', '192.168.20.1');
    HOST(t, 's3', 'מיכל', '192.168.10.13', '192.168.10.1'); HOST(t, 'f2', 'נועה', '192.168.20.12', '192.168.20.1'); HOST(t, 'g1', 'אורח', '192.168.30.11', '192.168.30.1');
    T.h2s(t, 's1', 'sw1', 'Fa0/1'); T.h2s(t, 's2', 'sw1', 'Fa0/2'); T.h2s(t, 'f1', 'sw1', 'Fa0/3');
    T.h2s(t, 's3', 'sw2', 'Fa0/1'); T.h2s(t, 'f2', 'sw2', 'Fa0/2'); T.h2s(t, 'g1', 'sw2', 'Fa0/3');
    T.s2s(t, 'sw1', 'Gi0/1', 'sw2', 'Gi0/1'); T.s2s(t, 'sw1', 'Gi0/2', 'r1', 'Gi0/0');
    return t;
  }
  const trunkOk = (d) => (t) => { const i = ifc(t, d, GI(1)); return i.mode === 'trunk' && i.native === 999 && sameSet(i.allowed, [10, 20, 30, 99]); };
  const svi = (d, ip) => (t) => { const s = t.devs[d].ifaces.Vlan99; return !!s && s.ip === ip && s.mask === '255.255.255.0' && !s.shut; };
  const HARD = [
    { text: 'שמות: SW1 ו-SW2', hint: 'hostname בכל מתג', check: (t) => t.devs.sw1.hostname === 'SW1' && t.devs.sw2.hostname === 'SW2' },
    { text: 'ב-SW1: VLAN 10,20,30,99 עם שמות SALES/FINANCE/GUEST/MGMT', hint: 'vlan + name לכל אחד', check: (t) => hasV('sw1', 10, 'SALES')(t) && hasV('sw1', 20, 'FINANCE')(t) && hasV('sw1', 30, 'GUEST')(t) && hasV('sw1', 99, 'MGMT')(t) },
    { text: 'ב-SW2: אותם VLAN-ים והשמות', hint: 'אותה הגדרה כמו ב-SW1', check: (t) => hasV('sw2', 10, 'SALES')(t) && hasV('sw2', 20, 'FINANCE')(t) && hasV('sw2', 30, 'GUEST')(t) && hasV('sw2', 99, 'MGMT')(t) },
    { text: 'SW1: Fa0/1–2 = VLAN 10 ו-Fa0/3 = VLAN 20 (Access)', hint: 'switchport mode access + switchport access vlan', check: (t) => acc('sw1', [1, 2], 10)(t) && acc('sw1', [3], 20)(t) },
    { text: 'SW2: Fa0/1 = 10, Fa0/2 = 20, Fa0/3 = 30 (Access)', hint: 'switchport mode access + switchport access vlan', check: (t) => acc('sw2', [1], 10)(t) && acc('sw2', [2], 20)(t) && acc('sw2', [3], 30)(t) },
    { text: 'SW1: טלפון IP בפורט Fa0/4 — Voice VLAN 50', hint: 'interface fa0/4 ← switchport mode access ← switchport voice vlan 50', check: (t) => ifc(t, 'sw1', F(4)).voice === 50 },
    { text: 'Trunk SW1↔SW2: native 999 + allowed 10,20,30,99 (ב-SW1)', hint: 'interface gi0/1: mode trunk, native vlan 999, allowed vlan 10,20,30,99', check: trunkOk('sw1') },
    { text: 'אותו Trunk בצד של SW2 (בדיוק אותו native ו-allowed)', hint: 'אותן שלוש פקודות ב-SW2 על gi0/1', check: trunkOk('sw2') },
    { text: 'SW1 Gi0/2 = Trunk לנתב', hint: 'interface gi0/2 ← switchport mode trunk', check: (t) => ifc(t, 'sw1', GI(2)).mode === 'trunk' },
    { text: 'הנתב: Gi0/0 פעיל + Sub-interfaces 10,20,30 (כתובת .1)', hint: 'no shutdown + encapsulation dot1Q + ip address לכל sub-interface', check: (t) => !t.devs.r1.ifaces[GI(0)].shut && sub(10, '192.168.10.1')(t) && sub(20, '192.168.20.1')(t) && sub(30, '192.168.30.1')(t) },
    { text: 'ניהול: SVI vlan 99 — SW1: 192.168.99.2 • SW2: 192.168.99.3', hint: 'interface vlan 99 ← ip address … ← no shutdown', check: (t) => svi('sw1', '192.168.99.2')(t) && svi('sw2', '192.168.99.3')(t) },
    { text: 'Default gateway 192.168.99.1 בשני המתגים', hint: 'ip default-gateway 192.168.99.1 (בהגדרות כלליות)', check: (t) => t.devs.sw1.defaultGateway === '192.168.99.1' && t.devs.sw2.defaultGateway === '192.168.99.1' },
    { text: 'ping דנה ↔ מיכל ב-VLAN 10 (מתג אחר)', hint: 'בדקו Trunk, allowed ו-native בשני הצדדים, ושהפורטים ב-VLAN 10', check: (t) => { const a = t.hostDomain('s1'), b = t.hostDomain('s3'); return !!a && !!b && a.startVlan === 10 && b.startVlan === 10 && ping('s1', '192.168.10.13')(t); } },
    { text: 'ping דנה ↔ נועה (בין VLAN-ים)', hint: 'בדקו את הנתב ואת ה-Trunk אליו', check: ping('s1', '192.168.20.12') },
    { text: 'שמירת הכול בשלושת ההתקנים', hint: 'copy running-config startup-config בכל התקן', check: (t) => t.devs.sw1.isSaved() && t.devs.sw2.isSaved() && t.devs.r1.isSaved() },
  ];

  const LAY = {
    easy: { devices: { sw1: { type: 'switch', pos: [0, 0, -1.5], ports: 4, pitch: 1.5, map: { 'Fa0/1': 0, 'Fa0/2': 1, 'Fa0/3': 2, 'Fa0/4': 3 }, chipY: 2.0 } }, hosts: { s1: { pos: [-3.7, 0, 3] }, s2: { pos: [-1.25, 0, 3.6] }, f1: { pos: [1.25, 0, 3] }, f2: { pos: [3.7, 0, 3.6] } }, cam: [[0, 9, 10.5], [0, 0.5, 0.5]] },
    mid: { devices: { sw1: { type: 'switch', pos: [-2, 0, -1], ports: 6, pitch: 1.05, map: { 'Fa0/1': 0, 'Fa0/2': 1, 'Fa0/3': 2, 'Fa0/4': 3, 'Fa0/5': 4, 'Gi0/1': 5 }, chipY: 1.9 }, r1: { type: 'router', pos: [6.5, 0, -3.5] } }, hosts: { s1: { pos: [-5.2, 0, 3.4], scale: 0.8 }, s2: { pos: [-4.1, 0, 4.7], scale: 0.8 }, f1: { pos: [-3, 0, 3.4], scale: 0.8 }, f2: { pos: [-1.9, 0, 4.7], scale: 0.8 }, g1: { pos: [-0.8, 0, 3.4], type: 'laptop', scale: 0.8 } }, cam: [[0.8, 10.5, 13.5], [0.8, 0.3, 0.5]] },
    hard: { devices: { sw1: { type: 'switch', pos: [-5, 0, -1], ports: 6, pitch: 0.9, map: { 'Fa0/1': 0, 'Fa0/2': 1, 'Fa0/3': 2, 'Fa0/4': 3, 'Gi0/2': 4, 'Gi0/1': 5 }, chipY: 1.8 }, sw2: { type: 'switch', pos: [5.5, 0, -1], ports: 4, pitch: 0.9, map: { 'Fa0/1': 0, 'Fa0/2': 1, 'Fa0/3': 2, 'Gi0/1': 3 }, chipY: 1.8 }, r1: { type: 'router', pos: [-1.5, 0, -6.2] } }, hosts: { s1: { pos: [-7.2, 0, 3.4], scale: 0.75 }, s2: { pos: [-6.3, 0, 4.8], scale: 0.75 }, f1: { pos: [-5.4, 0, 3.4], scale: 0.75 }, s3: { pos: [3.7, 0, 3.4], scale: 0.75 }, f2: { pos: [5.2, 0, 4.8], scale: 0.75 }, g1: { pos: [6.7, 0, 3.4], type: 'laptop', scale: 0.75 } }, cam: [[0, 12.5, 15], [0, 0.3, 0.5]] },
  };

  VQ.game({
    id: 'commander', chapter: 'config', title: 'מפקד הקונפיגורציה',
    concept: 'הגדרת VLAN, Access, Trunk, Native, Allowed, Sub-interface ושמירה ב-Cisco IOS',
    tagline: 'סימולטור Cisco אמיתי! הגדירו VLAN-ים, פורטים, Trunk ונתב — ובדקו שהכול עובד. כל פקודה משנה את המודל התלת־ממדי.',
    howto: [
      '**מתחילים:** מודרך — הפקודה הבאה מוצעת כ"צ׳יפ" מתחת לטרמינל. לחצו עליו (או הקלידו), ואז Enter.',
      '**מתקדמים/אגדות:** רשימת משימות בצד. אתם מחליטים אילו פקודות להקליד. אפשר להשתמש ב-`?`, ב-Tab ובקיצורים (`conf t`, `sh vlan br`).',
      'כפתור **💡 רמז** עולה בנקודות. לחצו **🔎 בדוק חיבורים** כדי לראות את ה-ping בפעולה. בסוף — `copy running-config startup-config`!',
    ],
    stage: { bg: 0x0a1020 },
    levels: {
      easy: { mode: 'guided', lives: 0, stars: [350, 600, 800] },
      mid: { mode: 'free', lives: 0, limit: 600, hintCost: 30, stars: [900, 1500, 2100] },
      hard: { mode: 'free', lives: 0, limit: 900, hintCost: 60, stars: [2600, 4700, 6800] },
    },
    create(G) {
      const st = G.stage, cfg = G.cfg, lv = G.level;
      M.grid(st, 90, 0x16305a); M.stars(st, 200, 80);
      const topo = { easy: topoEasy, mid: topoMid, hard: topoHard }[lv]();
      const lay = LAY[lv]; st.setCam(lay.cam[0], lay.cam[1]);
      const net = new VQ.Net3D(st); const lab = new VQ.Lab3D(st, topo, lay, net);
      const sess = {}; Object.keys(topo.devs).forEach((d) => { sess[d] = new sim.Session(topo.devs[d]); });
      const hostSh = topo.hosts.s1 ? new sim.HostShell(topo, 's1') : null;
      const tabs = Object.keys(topo.devs).map((d) => ({ id: d, label: d === 'r1' ? 'R1' : d.toUpperCase(), session: sess[d] }));
      if (hostSh && lv !== 'easy') tabs.push({ id: 's1', label: '💻 דנה', session: hostSh });
      const objs = lv === 'easy' ? null : (lv === 'mid' ? MID : HARD).map((o, i) => Object.assign({ i, done: false }, o));
      let ptr = 0, hintsUsed = 0, errBefore = 0, elapsed = 0, wrongSince = 0;
      const stats = { objectives: 0, errors: 0 };
      // ---- UI
      const term = new VQ.Terminal({
        title: '⌨️ Cisco CLI', tabs, chips: (s) => (lv === 'easy' && EASY[ptr] ? [EASY[ptr].cmd] : []),
        onCommand: (s, line, out, tab) => { lab.sync(); after(s, line, out, tab); },
      });
      term.el.classList.add('low'); term.el.style.width = 'min(720px,96vw)'; term.el.style.insetInlineEnd = 'auto'; term.el.style.left = '50%'; term.el.style.transform = 'translateX(-50%)'; term.el.style.height = 'min(36vh,330px)';
      term.mount(G.ui.root);
      const box = h('div', { class: 'objs' }); G.ui.root.append(box);
      const btnRow = h('div', { class: 'row', style: { justifyContent: 'center', pointerEvents: 'auto' } });
      G.ui.task.innerHTML = ''; G.ui.task.append(btnRow);
      const hintBox = h('div', { class: 'box', style: { display: 'none', marginTop: '6px' } });
      const isNarrow = window.innerWidth < 900;
      st.setInset(isNarrow ? 240 : 340, isNarrow ? 150 : 90, isNarrow ? 0 : -150);
      function renderObjs() {
        box.innerHTML = '';
        box.append(h('h4', {}, lv === 'easy' ? '🧭 המסלול' : '🎯 משימות'));
        if (lv === 'easy') {
          EASY.forEach((s, i) => box.append(h('div', { class: 'o' + (i < ptr ? ' done' : '') + (i === ptr ? ' cur' : ''), style: i === ptr ? { color: '#fde047', fontWeight: 800 } : {} }, h('span', { class: 'ck' }, i < ptr ? '✔' : i === ptr ? '▶' : '○'), h('span', {}, s.why))));
        } else objs.forEach((o) => box.append(h('div', { class: 'o' + (o.done ? ' done' : '') }, h('span', { class: 'ck' }, o.done ? '✔' : '○'), h('span', {}, o.text))));
        const total = lv === 'easy' ? EASY.length : objs.length, done = lv === 'easy' ? ptr : objs.filter((o) => o.done).length;
        G.setMid('התקדמות', `${done}/${total}`);
      }
      function buttons() {
        btnRow.innerHTML = '';
        if (lv !== 'easy') btnRow.append(h('button', { class: 'btn amber sm', onClick: hint }, `💡 רמז (−${cfg.hintCost})`), h('button', { class: 'btn sm', onClick: runTests }, '🔎 בדוק חיבורים'));
        else btnRow.append(h('button', { class: 'btn sm', onClick: runTests }, '🔎 בדוק חיבורים'));
        btnRow.append(hintBox);
      }
      function hint() {
        if (!G.running) return; const o = objs.find((x) => !x.done); if (!o) return;
        hintsUsed++; G.hints++; G.addScore(-cfg.hintCost); VQ.sfx.play('bad');
        hintBox.style.display = ''; hintBox.innerHTML = '💡 <b>' + VQ.esc(o.text) + '</b><br><span dir="ltr" style="font-family:var(--mono);font-size:12px">' + VQ.esc(o.hint) + '</span>';
        setTimeout(() => { hintBox.style.display = 'none'; }, 9000);
      }
      async function runTests() {
        if (!G.running) return; VQ.sfx.play('click');
        const pairs = lv === 'easy' ? [['s1', '192.168.10.12'], ['s1', '192.168.20.11']] : lv === 'mid' ? [['s1', '192.168.10.12'], ['s1', '192.168.20.11'], ['g1', '192.168.10.11']] : [['s1', '192.168.10.13'], ['s1', '192.168.20.12'], ['g1', '192.168.10.11']];
        for (const [a, ip] of pairs) { if (G.ended) return; await lab.ping(a, ip, { speed: 7 }); await st.wait(0.3); }
        check();
      }
      // ---- progress logic
      function after(s, line, out, tab) {
        if (out.some((o) => o && o.err)) { stats.errors++; G.miss(0); wrongSince++; G.addScore(-5); }
        if (/^ping\s/i.test(line.trim()) && s.mode === 'host') lab.ping(tab.id, line.trim().split(/\s+/)[1], { speed: 7 });
        check(s, line);
        if (lv === 'easy') {
          const ctx = () => tab.session;
          while (ptr < EASY.length && EASY[ptr].done(topo, sess.sw1)) { const first = wrongSince === 0; G.hit(first ? 40 : 20, V3(0, 3, 0)); wrongSince = 0; ptr++; VQ.sfx.play('ok'); }
          renderObjs(); term.refreshChips();
          if (ptr >= EASY.length) win();
        }
      }
      function check() {
        if (lv === 'easy') return;
        let newly = 0;
        objs.forEach((o) => { if (!o.done && o.check(topo)) { o.done = true; newly++; stats.objectives++; G.hit(60, V3(0, 3, 0)); VQ.sfx.play('coin'); lab.sync(); } });
        if (newly) { renderObjs(); if (objs.every((o) => o.done)) win(); }
      }
      let won = false, poll = 0;
      function win() {
        if (won || G.ended) return; won = true;
        const timeBonus = cfg.limit ? Math.max(0, Math.round((cfg.limit - elapsed) * 1.5)) : 0;
        VQ.fx.confetti(st, V3(0, 4, 0), 80);
        setTimeout(() => G.end({ completed: true, perfect: stats.errors === 0, noHints: lv !== 'easy' && hintsUsed === 0, bonus: (lv === 'easy' ? 250 : 400) + timeBonus, title: 'הרשת מוגדרת! 🖧', stats: [['משימות', lv === 'easy' ? EASY.length : objs.length], ['פקודות שגויות', stats.errors], ['רמזים', hintsUsed], ['זמן', VQ.fmtTime(elapsed)]], note: 'זה בדיוק סדר העבודה של טכנאי אמיתי: VLAN → Access → Trunk → ניתוב → בדיקה → שמירה.' }), 700);
      }
      G.ctl = {
        start() { renderObjs(); buttons(); term.sys('# ברוכים הבאים! ' + (lv === 'easy' ? 'הפקודה הבאה מוצעת מתחת לטרמינל.' : 'בצעו את המשימות ברשימה. אפשר להשתמש ב-? וב-Tab.')); term.inp.focus(); },
        intro() { renderObjs(); },
        update(dt) { elapsed += dt; poll += dt; if (cfg.limit) G.setMid('זמן', VQ.fmtTime(cfg.limit - elapsed)); if (poll > 0.6) { poll = 0; check(); } },
        onEnd() { term.destroy(); },
      };
      G.term = term; G.topo = topo; G.sess = sess; G.objs = objs;
      renderObjs(); buttons();
      return G.ctl;
    },
  });
})(window.VQ);
