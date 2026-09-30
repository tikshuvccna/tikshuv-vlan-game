/* Game 3 – VLAN Painter (chapter: what is a VLAN). Assign ports to VLANs so each department is isolated. */
(function (VQ) {
  const M = VQ.M, V3 = M.V3, h = VQ.h;
  const NAMES = ['דנה', 'רון', 'מיכל', 'יוסי', 'נועה', 'אבי', 'גיל', 'שיר', 'עמית', 'הילה', 'תום', 'ליאור', 'נדב', 'רוני', 'אורי', 'מאיה', 'שחר', 'ענת'];
  const ROLE = { 10: ['מכירות', 'איש מכירות', 'טלפון מכירות'], 20: ['הנהלת חשבונות', 'מדפסת כספים', 'שרת שכר'], 30: ['אורח', 'מכשיר אורחים', 'לובי'], 99: ['ניהול רשת', 'מנהל מערכת', 'ציוד ניהול'] };
  const DEPT = { 10: 'מכירות', 20: 'כספים', 30: 'אורחים', 99: 'ניהול' };
  VQ.game({
    id: 'painter', chapter: 'what', title: 'צבע את הרשת',
    tagline: 'חלקו את הרשת ל-VLAN-ים! שייכו כל מחשב ל-VLAN של המחלקה שלו — ובדקו שה-Broadcast לא בורח.',
    howto: [
      '**בחרו צבע VLAN** בתחתית המסך, ואז **לחצו על מחשבים** כדי לשייך את הפורט שלהם ל-VLAN הזה (בדיוק כמו `switchport access vlan`).',
      'לחצו **✅ בדוק** — נשלח Broadcast מכל מחשב. אם הוא מגיע רק לחברי אותו VLAN — הצלחתם.',
      'ברמות הגבוהות יש שני מתגים: קישור ביניהם חייב להיות **Trunk** (לחצו על "🔗 הפכו Trunk").',
      'פחות בדיקות ופחות זמן = יותר נקודות. שימו לב לשמות התפקידים!',
    ],
    stage: { bg: 0x0a1020 },
    levels: {
      easy: { rounds: [{ n: 6, g: [10, 20] }, { n: 6, g: [10, 20, 30] }, { n: 8, g: [10, 20, 30] }], time: 100, ring: true, two: false, lives: 0, stars: [400, 800, 1200] },
      mid: { rounds: [{ n: 8, g: [10, 20, 30] }, { n: 9, g: [10, 20, 30, 99] }, { n: 10, g: [10, 20, 30, 99] }], time: 65, ring: false, two: false, lives: 3, stars: [1000, 2200, 3300] },
      hard: { rounds: [{ n: 10, g: [10, 20, 30] }, { n: 12, g: [10, 20, 30, 99] }, { n: 14, g: [10, 20, 30, 99] }], time: 60, ring: false, two: true, lives: 3, stars: [2400, 5000, 7600] },
    },
    create(G) {
      const st = G.stage, cfg = G.cfg;
      M.grid(st, 80, 0x16305a); M.stars(st, 200, 80);
      let net, hosts, sw, roundIdx = -1, palette = 0, tLeft = 0, attempts = 0, roundDone = false, sums = { checks: 0, rounds: 0, fails: 0 };
      let objs = [];
      const bar = h('div', { class: 'row', style: { justifyContent: 'center', width: '100%' } }); G.ui.bottom.append(bar);
      function clearRound() { objs.forEach((o) => st.remove(o)); objs = []; if (net) net.abort(); }
      function build(ri) {
        clearRound(); const R = cfg.rounds[ri]; roundDone = false; attempts = 0; tLeft = cfg.time;
        net = new VQ.Net3D(st); net.setVlanMode(true); objs.push(net.group);
        const names = VQ.shuffle(NAMES).slice(0, R.n); hosts = [];
        // group assignment (at least 2 per group)
        const gs = []; R.g.forEach((v) => { gs.push(v, v); }); while (gs.length < R.n) gs.push(VQ.pick(R.g)); const groups = VQ.shuffle(gs).slice(0, R.n);
        const two = cfg.two, per = two ? Math.ceil(R.n / 2) : R.n, pitch = two ? 1.25 : (R.n > 9 ? 1.25 : 1.5);
        const swDefs = two ? [{ id: 'A', x: -per * pitch / 2 - 1.8 }, { id: 'B', x: per * pitch / 2 + 1.8 }] : [{ id: 'A', x: 0 }];
        const ports = two ? per + 1 : R.n;
        swDefs.forEach((d) => { const n = net.addNode('sw' + d.id, 'switch', [d.x, 0, -2.2], { ports, pitch, label: two ? 'SW-' + d.id : 'Switch' }); d.node = n; });
        for (let i = 0; i < R.n; i++) {
          const isB = two && i >= per, sd = isB ? swDefs[1] : swDefs[0], li = two ? (isB ? i - per : i) : i, port = isB ? li + 1 : li, v = groups[i];
          const x = sd.node.pos.x + sd.node.obj.ports[port].x;
          const role = ROLE[v][i % ROLE[v].length];
          const node = net.addNode('h' + i, i % 3 === 2 ? 'laptop' : 'pc', [x, 0, 3.4 + (li % 2) * 1.3], { label: `${names[i]}\n${role}`, lsize: 0.3, scale: 0.85, screen: 0x94a3b8 });
          const lk = net.link(node.id, 'sw' + sd.id, { bPort: port }); net.setLinkMode(lk, 'access', 1);
          const hh = { i, node, want: v, link: lk, sw: sd.node, port, vlan: 1 };
          st.pickable(node.obj, () => paint(hh), { onHover: () => {} });
          if (cfg.ring) { const rg = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.06, 6, 24), M.mat(VQ.vhex(v), { e: VQ.vhex(v), ei: 1 })); rg.rotation.x = Math.PI / 2; rg.position.set(node.pos.x, 0.05, node.pos.z); net.group.add(rg); }
          hosts.push(hh);
        }
        if (two) { net.uplink = net.link('swA', 'swB', { aPort: ports - 1, bPort: 0, sag: 0.02 }); net.setLinkMode(net.uplink, 'access', 1); swDefs[0].node.obj.setPort(ports - 1, 0x94a3b8); swDefs[1].node.obj.setPort(0, 0x94a3b8); }
        const w = (two ? per * pitch * 2 + 4 : R.n * pitch + 1);
        st.setCam([0, 6 + w * 0.3, 6 + w * 0.44], [0, 0.5, 1.4]);
        renderBar(R); G.setMid('סיבוב', `${ri + 1}/${cfg.rounds.length}`);
        const mapTxt = R.g.map((v) => `<b style="color:${VQ.vcss(v)}">${DEPT[v]}=VLAN ${v}</b>`).join(' • ');
        G.setTask(`שייכו כל מחשב ל-VLAN של המחלקה שלו: ${mapTxt}` + (two ? '<br>💡 שני מתגים — קישור ה-Trunk ביניהם!' : ''));
      }
      function paint(hh) {
        if (!G.running || roundDone) return;
        const v = palette; if (v === 0) { G.msg('בחרו צבע VLAN קודם', '#94a3b8'); return; }
        hh.vlan = v; net.setLinkMode(hh.link, 'access', v);
        hh.sw.obj.setPort(hh.port + 0, VQ.vhex(v)); hh.node.setScreen(VQ.vhex(v)); hh.node.setBadge('VLAN ' + v, VQ.vcss(v)); hh.node.pulse(VQ.vhex(v)); VQ.sfx.play('pop');
      }
      function renderBar(R) {
        bar.innerHTML = '';
        R.g.forEach((v) => bar.append(h('button', { class: 'bigbtn', style: { background: VQ.vcss(v), outline: palette === v ? '4px solid #fff' : 'none' }, onClick: () => { palette = v; VQ.sfx.play('click'); renderBar(R); } }, 'VLAN ' + v, h('small', {}, DEPT[v]))));
        if (cfg.two) bar.append(h('button', { class: 'bigbtn', style: { background: '#fde047' }, onClick: toggleTrunk }, '🔗 Trunk', h('small', {}, 'בין המתגים')));
        bar.append(h('button', { class: 'btn green', style: { fontSize: '20px' }, onClick: check }, '✅ בדוק!'));
      }
      function toggleTrunk() {
        if (!G.running || roundDone) return; const L = net.uplink, on = L.mode !== 'trunk';
        net.setLinkMode(L, on ? 'trunk' : 'access', on ? 0 : 1, null); const c = on ? 0xfde047 : 0x94a3b8;
        const pi = net.nodes.swA.obj.ports.length - 1; net.nodes.swA.obj.setPort(pi, c); net.nodes.swB.obj.setPort(0, c); VQ.sfx.play('click');
      }
      async function check() {
        if (!G.running || roundDone) return; roundDone = true; sums.checks++; attempts++;
        let bad = 0; const list = [];
        hosts.forEach((hh) => {
          const got = net.floodSet(hh.node.id); const want = new Set(hosts.filter((o) => o !== hh && o.want === hh.want).map((o) => o.node.id));
          let ok = got.size === want.size; got.forEach((x) => { if (!want.has(x)) ok = false; });
          list.push([hh, ok, got, want]); if (!ok) bad++;
        });
        // demo flood from a random host
        const demo = VQ.pick(hosts); net.flood(demo.node.id, { colorByVlan: true, speed: 9 });
        await st.wait(1.0);
        list.forEach(([hh, ok]) => { hh.node.mark(ok, ok ? '✔' : '✖'); if (!ok) hh.node.setGlow(0xf87171); });
        if (!bad) {
          const t = Math.max(0, tLeft), bonus = Math.round(t * 3), pen = (attempts - 1) * 60;
          VQ.sfx.play('fanfare'); G.hit(Math.max(120, 250 + bonus - pen), V3(0, 3, 2)); sums.rounds++; G.msg('הרשת מחולקת בהצלחה! 🎨', '#4ade80');
          await st.wait(1.4);
          if (roundIdx + 1 >= cfg.rounds.length) finish(); else { roundIdx++; build(roundIdx); }
        } else {
          VQ.sfx.play('bad'); G.combo = 0; G.msg(`${bad} מחשבים לא במקום ✖`, '#f87171'); sums.fails++; G.addScore(-25);
          const twoHint = cfg.two && net.uplink.mode !== 'trunk' ? ' רמז: קישור בין מתגים צריך להיות Trunk.' : '';
          G.setTask(`חלק מהמחשבים מקבלים Broadcast שלא שלהם, או שחברי אותו VLAN לא רואים זה את זה.${twoHint}`);
          hosts.forEach((hh) => hh.node.setGlow(null)); await st.wait(0.4); roundDone = false;
          if (cfg.lives && attempts >= 3) { G.loseLife(); attempts = 0; }
        }
      }
      function finish() {
        const perfect = sums.fails === 0;
        G.end({ completed: true, perfect, bonus: perfect ? 200 : 0, title: perfect ? 'צבעתם בלי טעות! 🎨' : 'הרשת חולקה!', stats: [['סיבובים', sums.rounds], ['בדיקות', sums.checks], ['בדיקות שנכשלו', sums.fails]], note: 'כל מחלקה קיבלה Broadcast Domain משלה — בדיוק מה ש-VLAN עושה.' });
      }
      G.ctl = {
        intro() { roundIdx = 0; build(0); },
        start() { G.setTask(G.ui.task.textContent ? G.ui.task.firstChild.innerHTML : ''); },
        update(dt) {
          tLeft -= dt; G.setMid('זמן', VQ.fmtTime(tLeft));
          if (tLeft <= 0 && !roundDone && cfg.lives) { roundDone = true; G.miss(0); G.msg('⏰ נגמר הזמן לסיבוב', '#f87171'); if (G.loseLife() > 0) { if (roundIdx + 1 >= cfg.rounds.length) finish(); else { roundIdx++; build(roundIdx); } } }
        },
      };
      roundIdx = 0; build(0);
      return G.ctl;
    },
  });
})(window.VQ);
