/* Game 6 – Packet Maze (chapter: inter-VLAN routing). Deliver a packet across VLAN borders – only the router can change its tag. */
(function (VQ) {
  const M = VQ.M, V3 = M.V3, h = VQ.h;
  const T = 1.5;
  // Legend: # wall | a b c = room floors VLAN 10/20/30 | A B C = access-port doors of those VLANs | : trunk | R router | S start | D destination
  const MAPS = {
    easy: [
      { sV: 10, dV: 20, legs: 1, rows: [
        '###########', '#Saaa#bbbb#', '#a##a#b##b#', '#aaaaRbbbD#', '#a##a#b##b#', '#aaaa#bbbb#', '###########'] },
      { sV: 10, dV: 20, legs: 1, rows: [
        '#############', '#Saaaa#bbbbb#', '#a###a#b###b#', '#aaaaaRbbbbD#', '#a###a#b###b#', '#aaaaa#bbbbb#', '#############'] },
      { sV: 10, dV: 20, legs: 1, rows: [
        '#############', '#Saaaa#bbbbb#', '#aaaaa#bbbbD#', '###A#####B###', '#:::::R:::::#', '#############'] },
    ],
    mid: [
      { sV: 10, dV: 20, legs: 2, time: 90, blobs: [{ a: [2, 4], b: [5, 4], v: 1.6 }, { a: [9, 4], b: [12, 4], v: 1.8 }], rows: [
        '###############', '#Saaaa#bbbbbD##', '#aaaaa#bbbbbb##', '##A#####B######', '#::::::R:::::::#', '#:####:####:###', '#:#aaa:#ccc#:##', '#:#aaa:#ccc#:##', '###############'.replace(/./g, '#')] },
      { sV: 20, dV: 10, legs: 2, time: 90, blobs: [{ a: [2, 4], b: [6, 4], v: 2 }, { a: [10, 4], b: [13, 4], v: 1.5 }], rows: [
        '###############', '#Sbbbb#aaaaaD##', '#bbbbb#aaaaaa##', '##B#####A######', '#::::::R:::::::#', '###############'] },
      { sV: 10, dV: 30, legs: 2, time: 100, blobs: [{ a: [3, 4], b: [7, 4], v: 2 }, { a: [8, 4], b: [13, 4], v: 2.2 }], rows: [
        '###############', '#Saaaa#bbbbbb##', '#aaaaa#bbbbbb##', '##A#####B######', '#:::::R::::::::#', '##C############', '#cccccccccccD###', '###############'] },
    ],
    hard: [
      { sV: 10, dV: 30, legs: 2, time: 80, blobs: [{ a: [2, 4], b: [7, 4], v: 2.6 }, { a: [10, 4], b: [16, 4], v: 2.4 }, { a: [8, 6], b: [8, 8], v: 2 }], rows: [
        '#################', '#Saaaa##bbbbbb###', '#aaaaa##bbbbbb###', '##A######B#######', '#::::::R:::::::::#', '#:#######:#####C##', '#:#ccc###:##ccccD#', '#:#ccc###:##cccc##', '#:#######:#######', '#################'.slice(0, 17)] },
      { sV: 20, dV: 10, legs: 2, time: 80, blobs: [{ a: [2, 6], b: [8, 6], v: 2.8 }, { a: [10, 4], b: [16, 4], v: 2.6 }, { a: [4, 3], b: [4, 5], v: 2.2 }], rows: [
        '#################', '#Sbbbbb##aaaaaD###', '#bbbbbb##aaaaaa###', '##B#######A######', '#::::::::R::::::#', '#:######:#####:###', '#:#cccc#:##ccc:###', '#:#cccC#:##ccc:###', '#################'] },
      { sV: 10, dV: 20, legs: 2, time: 75, blobs: [{ a: [2, 4], b: [9, 4], v: 3 }, { a: [11, 4], b: [16, 4], v: 2.4 }, { a: [7, 6], b: [7, 7], v: 2 }], rows: [
        '#################', '#Saaaaa##bbbbbD###', '#aaaaaa##bbbbbb###', '##A########B#####', '#:::::::R:::::::#', '#:#####:#####:###', '#:#ccc#:#cccc:###', '#:#ccc#C#ccc#:###', '#################'] },
    ],
  };
  // normalise widths and validate maps
  Object.values(MAPS).forEach((arr) => arr.forEach((m) => { const w = Math.max(...m.rows.map((r) => r.length)); m.rows = m.rows.map((r) => r.padEnd(w, '#')); m.w = w; m.hgt = m.rows.length; }));
  const tileV = (m, ch) => ({ a: 10, A: 10, b: 20, B: 20, c: 30, C: 30, S: m.sV, D: m.dV }[ch] || 0);
  // BFS solvability check (used by tests)
  function solvable(m) {
    let S, D; m.rows.forEach((r, y) => [...r].forEach((ch, x) => { if (ch === 'S') S = [x, y]; if (ch === 'D') D = [x, y]; }));
    const leg = (from, to, tag0, target) => {
      const seen = new Set(), q = [[from[0], from[1], tag0]]; seen.add(from.join() + ',' + tag0);
      while (q.length) {
        const [x, y, tag] = q.shift(); if (x === to[0] && y === to[1]) return true;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy, ch = (m.rows[ny] || '')[nx]; if (!ch || ch === '#') continue;
          let nt = tag; if (ch === 'R') nt = target; else { const tv = tileV(m, ch); if (tv && tv !== tag) continue; }
          const k = nx + ',' + ny + ',' + nt; if (!seen.has(k)) { seen.add(k); q.push([nx, ny, nt]); }
        }
      }
      return false;
    };
    return leg(S, D, m.sV, m.dV) && (m.legs < 2 || leg(D, S, m.dV, m.sV));
  }
  VQ.mazeSolvable = () => Object.entries(MAPS).map(([k, arr]) => arr.map((m) => solvable(m)));

  VQ.game({
    id: 'maze', chapter: 'intervlan', title: 'מבוך החבילה',
    tagline: 'חבילה מ-VLAN אחד צריכה להגיע ל-VLAN אחר. רק הנתב יכול להחליף לה את התג — מצאו אותו!',
    howto: [
      'הזיזו את החבילה עם **החיצים / WASD**, החלקה על המסך, או כפתורי החצים.',
      'דלת של VLAN נפתחת **רק לחבילה עם התג המתאים**. התג נשאר קבוע — עד שעוברים דרך **🧭 הנתב (R)**, שמחליף אותו ל-VLAN של היעד (Router-on-a-Stick).',
      'ברמות הבאות צריך גם **לחזור** (ה-Reply של ה-ping) ולהתחמק מ**סערות Broadcast** אדומות בכביש ה-Trunk.',
    ],
    stage: { bg: 0x090e1d },
    levels: {
      easy: { maps: MAPS.easy, lives: 0, stars: [400, 800, 1200] },
      mid: { maps: MAPS.mid, lives: 4, stars: [1200, 2300, 3400] },
      hard: { maps: MAPS.hard, lives: 3, stars: [3000, 5800, 8800] },
    },
    create(G) {
      const st = G.stage, cfg = G.cfg;
      M.stars(st, 250, 80);
      let mapIdx = -1, map, world, pos, tag, leg, moving = false, blobs = [], tLeft = 0, startT = 0, stats = { maps: 0, hits: 0, bumps: 0 };
      let pk, ptr = null;
      const px = (x) => (x - (map.w - 1) / 2) * T, pz = (y) => (y - (map.hgt - 1) / 2) * T;
      const dpad = h('div', { style: { direction: 'ltr', display: 'grid', gridTemplateColumns: 'repeat(3,56px)', gridTemplateRows: 'repeat(2,56px)', gap: '6px' } });
      [['', ''], ['▲', 'up'], ['', ''], ['◀', 'left'], ['▼', 'down'], ['▶', 'right']].forEach(([t, d]) => dpad.append(t ? h('button', { class: 'bigbtn', style: { minWidth: 0, padding: 0, background: '#38bdf8', fontSize: '22px' }, onPointerDown: (e) => { e.preventDefault(); step(d); } }, t) : h('span')));
      G.ui.bottom.append(dpad);
      function build(i) {
        if (world) st.remove(world);
        map = cfg.maps[i]; world = new THREE.Group(); st.add(world); blobs = []; leg = 1; moving = false; tLeft = map.time || 0; startT = G.time;
        let S, D;
        map.rows.forEach((row, y) => [...row].forEach((ch, x) => {
          const X = px(x), Z = pz(y);
          if (ch === '#') { const w = M.box(T * 0.98, 1.1, T * 0.98, 0x162238, { m: 0.3 }); w.position.set(X, 0.55, Z); world.add(w); const e = new THREE.LineSegments(new THREE.EdgesGeometry(w.geometry), new THREE.LineBasicMaterial({ color: 0x1e4d8f })); e.position.copy(w.position); world.add(e); return; }
          let v = tileV(map, ch), col = v ? VQ.vhex(v) : ch === ':' || ch === 'R' ? 0xfde047 : 0x334155;
          const f = M.box(T * 0.96, 0.12, T * 0.96, col, { e: col, ei: ch === ':' ? 0.12 : 0.22, o: 0.9 }); f.position.set(X, 0.05, Z); world.add(f);
          if (ch === 'A' || ch === 'B' || ch === 'C') { const d = M.box(T * 0.9, 0.9, 0.2, col, { e: col, ei: 0.8, o: 0.75 }); d.position.set(X, 0.5, Z); world.add(d); const l = M.label('VLAN ' + v, { size: 0.32, bg: VQ.vcss(v), color: '#04101a' }); l.position.set(X, 1.5, Z); world.add(l); }
          if (ch === 'R') { const r = M.device('router'); r.scale.setScalar(0.95); r.position.set(X, 0.1, Z); world.add(r); const l = M.label('🧭 Router', { size: 0.34, bg: '#fde047', color: '#1f1500' }); l.position.set(X, 1.7, Z); world.add(l); }
          if (ch === 'S') { S = [x, y]; const p = M.device('pc', { screen: VQ.vhex(map.sV) }); p.scale.setScalar(0.9); p.position.set(X, 0.1, Z); p.rotation.y = Math.PI; world.add(p); const l = M.label(`💻 שולח • VLAN ${map.sV}`, { size: 0.32, bg: VQ.vcss(map.sV), color: '#04101a' }); l.position.set(X, 1.9, Z); world.add(l); }
          if (ch === 'D') { D = [x, y]; const p = M.device('server'); p.scale.setScalar(0.8); p.position.set(X, 0.1, Z); world.add(p); const l = M.label(`🗄️ יעד • VLAN ${map.dV}`, { size: 0.32, bg: VQ.vcss(map.dV), color: '#04101a' }); l.position.set(X, 2.4, Z); world.add(l); }
        }));
        map.S = S; map.D = D; pos = S.slice(); tag = map.sV;
        pk = M.packet({ color: VQ.vhex(tag), size: 0.5 }); pk.position.set(px(pos[0]), 0.6, pz(pos[1])); world.add(pk);
        (map.blobs || []).forEach((b, k) => {
          const g = new THREE.Group(); const core = M.sph(0.45, 0xff4d4d, { e: 0xff2222, ei: 0.9 }, 12); g.add(core); g.add(M.glow(0xff3b3b, 2.2, 0.8)); world.add(g);
          blobs.push({ g, a: b.a, b: b.b, v: b.v, t: Math.random() * 2, dir: 1 });
        });
        const W = map.w * T, H = map.hgt * T; st.setCam([0, Math.max(W * 0.62, H * 1.15) + 4, Math.max(H * 0.62, W * 0.35) + 5], [0, 0, 0.3]);
        G.setMid('מפה', `${i + 1}/${cfg.maps.length}`);
        say(`הגיעו מ-VLAN ${map.sV} אל ה-VLAN ${map.dV}${map.legs > 1 ? ' — ואז חזרה!' : ''}. מצאו את הנתב 🧭`);
        if (map.time) G.setMid('זמן', VQ.fmtTime(tLeft));
      }
      const say = (t) => G.setTask(t);
      function tileOk(nx, ny) {
        const ch = (map.rows[ny] || '')[nx]; if (!ch || ch === '#') return { ok: false };
        if (ch === 'R') return { ok: true, tag: leg === 1 ? map.dV : map.sV, router: true };
        const v = tileV(map, ch);
        if (v && v !== tag) return { ok: false, why: ch === 'A' || ch === 'B' || ch === 'C' ? `🚪 הדלת מקבלת רק VLAN ${v}, והחבילה מתויגת ${tag}. צריך לעבור בנתב!` : `🚧 שם VLAN ${v} — אתם ב-VLAN ${tag}. רק נתב יכול להעביר!` };
        return { ok: true, tag };
      }
      async function step(dir) {
        if (!G.running || moving || G.ended) return;
        const d = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[dir]; const nx = pos[0] + d[0], ny = pos[1] + d[1];
        const r = tileOk(nx, ny);
        if (!r.ok) { if (r.why) { say(r.why); stats.bumps++; VQ.sfx.play('bad'); G.combo = 0; const b = 0.25; await st.tween(pk.position, { x: pk.position.x + d[0] * b, z: pk.position.z + d[1] * b }, 0.06); await st.tween(pk.position, { x: px(pos[0]), z: pz(pos[1]) }, 0.08); } return; }
        moving = true; pos = [nx, ny]; VQ.sfx.play('tick');
        await st.tween(pk.position, { x: px(nx), z: pz(ny) }, 0.13, { ease: 'lin' });
        moving = false;
        const ch = map.rows[ny][nx];
        if (r.router && tag !== r.tag) { tag = r.tag; pk.setColor(VQ.vhex(tag)); VQ.fx.ring(st, V3(px(nx), 0.2, pz(ny)), 0xfde047, 2, 0.6); VQ.fx.float(st, V3(px(nx), 2.4, pz(ny)), `🧭 תג חדש: VLAN ${tag}`, '#fde047', 0.5); VQ.sfx.play('level'); say(`הנתב החליף את התג ל-VLAN ${tag}! עכשיו הדלת של VLAN ${tag} נפתחת.`); G.addScore(40); }
        const onTrunk = ch === ':' || ch === 'R';
        pk.setTag(onTrunk ? VQ.vhex(tag) : null); if (!onTrunk) pk.setColor(VQ.vhex(tag));
        if (ch === 'D' && leg === 1) { if (map.legs > 1) { leg = 2; G.hit(150, V3(px(nx), 2, pz(ny))); VQ.sfx.play('coin'); VQ.fx.burst(st, V3(px(nx), 1, pz(ny)), 0x86efac, 20, 3); say('✔ הבקשה הגיעה! עכשיו החזירו את ה-Reply בחזרה לשולח 🔁'); } else finishMap(); }
        else if (ch === 'S' && leg === 2) finishMap();
      }
      function finishMap() {
        stats.maps++; const t = G.time - startT; const bonus = Math.max(0, Math.round((map.time ? tLeft : 40 - t) * 4));
        G.hit(300 + bonus, V3(px(pos[0]), 2.5, pz(pos[1]))); VQ.sfx.play('fanfare'); VQ.fx.confetti(st, V3(px(pos[0]), 2, pz(pos[1])), 30); moving = true;
        st.wait(1.3).then(() => { moving = false; if (mapIdx + 1 >= cfg.maps.length) G.end({ completed: true, perfect: stats.hits === 0, bonus: stats.hits === 0 ? 200 : 0, title: 'החבילה הגיעה!', stats: [['מפות שהושלמו', stats.maps], ['פגיעות מסערות', stats.hits], ['חבטות בדלתות', stats.bumps]], note: 'ראיתם? החבילה לא יכלה לעבור בין VLAN-ים בלי נתב. בדיוק כמו ברשת אמיתית.' }); else { mapIdx++; build(mapIdx); } });
      }
      st.onPointerDown = (e) => { ptr = { x: e.clientX, y: e.clientY }; };
      st.onPointerUp = (e) => { if (!ptr) return; const dx = e.clientX - ptr.x, dy = e.clientY - ptr.y; ptr = null; if (Math.hypot(dx, dy) > 28) step(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up'); };
      G.ctl = {
        onKey(e) { const d = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' }[e.code]; if (d) { e.preventDefault(); step(d); } },
        start() { mapIdx = 0; build(0); },
        idle() {},
        update(dt) {
          if (!map) return;
          if (map.time) { tLeft -= dt; G.setMid('זמן', VQ.fmtTime(tLeft)); if (tLeft <= 0 && !G.ended) { G.msg('⏰ נגמר הזמן', '#f87171'); if (G.loseLife() > 0) build(mapIdx); } }
          // held keys
          const K = VQ.engine.keys; if (!moving) { if (K.ArrowUp || K.KeyW) step('up'); else if (K.ArrowDown || K.KeyS) step('down'); else if (K.ArrowLeft || K.KeyA) step('left'); else if (K.ArrowRight || K.KeyD) step('right'); }
          blobs.forEach((b) => {
            b.t += dt * b.v * b.dir; const len = Math.hypot(b.b[0] - b.a[0], b.b[1] - b.a[1]) || 1; const u = b.t / len;
            if (u > 1) { b.dir = -1; b.t = len; } else if (u < 0) { b.dir = 1; b.t = 0; }
            const k = VQ.clamp(b.t / len, 0, 1), x = VQ.lerp(b.a[0], b.b[0], k), y = VQ.lerp(b.a[1], b.b[1], k);
            b.g.position.set(px(x), 0.6 + Math.sin(G.time * 6) * 0.1, pz(y));
            if (!G.ended && !b.cool && Math.hypot(px(x) - pk.position.x, pz(y) - pk.position.z) < 0.85) {
              b.cool = 1.2; stats.hits++; G.combo = 0; G.addScore(-50); VQ.fx.burst(st, pk.position.clone(), 0xff4d4d, 24, 4); VQ.sfx.play('boom'); G.msg('💥 סערת Broadcast!', '#f87171');
              const cp = leg === 1 ? map.S : map.D; pos = cp.slice(); tag = leg === 1 ? map.sV : map.dV; pk.setColor(VQ.vhex(tag)); pk.setTag(null); pk.position.set(px(pos[0]), 0.6, pz(pos[1])); moving = false;
              if (cfg.lives) G.loseLife();
            }
            if (b.cool) b.cool -= dt;
          });
          pk.rotation.y += dt * 2;
        },
      };
      // pre-build the first map for the intro backdrop
      mapIdx = 0; build(0);
      return G.ctl;
    },
  });
})(window.VQ);
