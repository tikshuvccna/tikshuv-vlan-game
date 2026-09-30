/* Game 7 – VLAN Runner (chapter: pros & cons). Run through the right gate: advantage, disadvantage or myth. */
(function (VQ) {
  const M = VQ.M, V3 = M.V3, h = VQ.h;
  const S = [
    // [type, text, tier]  type: p = advantage, c = disadvantage, m = myth (false claim)
    ['p', 'מצמצם את ה-Broadcast Domain', 1], ['p', 'מאפשר הפרדה בין מחלקות על אותו מתג', 1], ['p', 'מעבירים משתמש למחלקה אחרת בלי להחליף כבל', 1], ['p', 'חוסך רכישת מתג נפרד לכל מחלקה', 1],
    ['p', 'מאפשר לתעדף תעבורת קול (Voice VLAN)', 2], ['p', 'מקל על ארגון הרשת לפי תפקידים', 2], ['p', 'פחות Broadcast = ביצועים טובים יותר', 1], ['p', 'מגביל נזק של מחשב פרוץ לקבוצה אחת', 2],
    ['c', 'דורש נתב או מתג L3 כדי לתקשר בין VLAN-ים', 1], ['c', 'טעות בהגדרת Trunk עלולה לנתק קומה שלמה', 1], ['c', 'דורש תכנון ותיעוד מסודרים', 1], ['c', 'בלי הקשחה חשוף להתקפת VLAN Hopping', 2],
    ['c', 'איתור תקלות מורכב יותר', 1], ['c', 'ציוד מנוהל יקר יותר ממתג לא מנוהל', 2], ['c', 'אי־התאמה ב-Native VLAN גורמת לבעיות', 3], ['c', 'בלי ACL/חומת אש אין הפרדה מלאה של מדיניות', 3],
    ['m', 'VLAN מחליף חומת אש לחלוטין', 1], ['m', 'מחשבים ב-VLAN-ים שונים מדברים ישירות בלי נתב', 1], ['m', 'VLAN מגדיל את ה-Broadcast Domain', 1], ['m', 'אפשר להגדיר VLAN במתג לא מנוהל', 2],
    ['m', 'Access Port נושא הרבה VLAN-ים עם תג', 2], ['m', 'מספר ה-VLAN-ים המקסימלי הוא 256', 3], ['m', 'לכל VLAN חייב להיות כבל פיזי משלו', 2], ['m', 'ה-Native VLAN הוא תמיד VLAN 10', 3],
    ['m', 'Hub תומך ב-VLAN', 2], ['m', 'אפשר למחוק את VLAN 1', 3], ['m', 'ב-Trunk התעבורה עוברת בלי שום תג', 3], ['m', 'כדי להעביר משתמש ל-VLAN אחר חייבים להחליף כבל', 2],
  ];
  const LANES = [{ t: 'p', label: '✅ יתרון', color: 0x4ade80, css: '#4ade80', x: -3.2 }, { t: 'c', label: '⚠️ חיסרון', color: 0xfb923c, css: '#fb923c', x: 0 }, { t: 'm', label: '❌ מיתוס', color: 0xf87171, css: '#f87171', x: 3.2 }];
  VQ.game({
    id: 'runner', chapter: 'proscons', title: 'רץ ה-VLAN',
    tagline: 'רצים במסלול ומתקרבים לשערים. קראו את הטענה והחליפו נתיב: יתרון, חיסרון — או מיתוס שגוי!',
    howto: [
      'עברו בין 3 הנתיבים עם **← →** (או A / D), החלקה על המסך או הכפתורים. **✅ יתרון** ← שמאל • **⚠️ חיסרון** ← אמצע • **❌ מיתוס** (טענה לא נכונה) ← ימין.',
      'הטענה מופיעה למעלה. רוצו דרך השער הנכון. אספו 🪙 בדרך לבונוס.',
      'ברמה הקשה יש גם מכשולי Broadcast אדומים – התחמקו מהם!',
    ],
    stage: { bg: 0x090e1d, fogNear: 30, fogFar: 90 },
    levels: {
      easy: { n: 10, tier: 1, speed: 8, gap: 52, lives: 0, obstacles: false, stars: [350, 700, 1000] },
      mid: { n: 16, tier: 2, speed: 11, gap: 46, lives: 4, obstacles: false, stars: [1100, 2200, 3300] },
      hard: { n: 24, tier: 3, speed: 14, gap: 46, lives: 3, obstacles: true, stars: [3000, 6000, 9400] },
    },
    create(G) {
      const st = G.stage, cfg = G.cfg;
      M.stars(st, 300, 90);
      st.setCam([0, 4.6, 8.5], [0, 1.6, -12]);
      st.parallax = 0.2;
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 400), M.mat(0x0d1530, { r: 0.9 })); floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, -150); st.add(floor);
      [-4.8, -1.6, 1.6, 4.8].forEach((x) => { const l = M.box(0.08, 0.02, 400, 0x22d3ee, { e: 0x22d3ee, ei: 0.8 }); l.position.set(x, 0.02, -150); st.add(l); });
      const dashes = []; for (let i = 0; i < 30; i++) { [-1.6, 1.6].forEach((x) => { const d = M.box(0.12, 0.03, 1.2, 0x334155); d.position.set(x, 0.03, -i * 4); st.add(d); dashes.push(d); }); }
      const hero = M.avatar(VQ.store.data.color); hero.scale.setScalar(1.25); hero.rotation.y = Math.PI; hero.position.set(0, 0, 0); hero.userData.walking = true; st.add(hero);
      let lane = 1, targetX = 0, gates = [], coins = [], obst = [], asked = 0, idx = 0, hurt = 0, missed = [];
      const stats = { ok: 0, wrong: 0, coins: 0, hits: 0 };
      const picks = (() => { const pool = S.filter((s) => s[2] <= cfg.tier); const by = { p: [], c: [], m: [] }; VQ.shuffle(pool).forEach((s) => by[s[0]].push(s)); const out = []; let k = 0; const keys = ['p', 'c', 'm']; while (out.length < cfg.n) { const t = keys[k++ % 3]; const s = by[t].pop() || by[keys[(k) % 3]].pop() || by[keys[(k + 1) % 3]].pop(); if (!s) break; out.push(s); } return VQ.shuffle(out); })();
      const stmt = h('div', { class: 'box', style: { fontSize: '19px', fontWeight: 800, minWidth: 'min(520px,92vw)' } }, 'מוכנים?');
      G.ui.task.append(stmt); G.ui.task.style.top = '64px';
      const btns = h('div', { class: 'row', style: { justifyContent: 'space-between', width: '100%', direction: 'ltr' } }, h('button', { class: 'bigbtn', style: { background: '#38bdf8' }, onPointerDown: (e) => { e.preventDefault(); move(-1); } }, '◀'), h('button', { class: 'bigbtn', style: { background: '#38bdf8' }, onPointerDown: (e) => { e.preventDefault(); move(1); } }, '▶'));
      G.ui.bottom.append(btns);
      function move(d) { if (!G.running) return; const nl = VQ.clamp(lane + d, 0, 2); if (nl !== lane) { lane = nl; targetX = LANES[lane].x; VQ.sfx.play('whoosh'); } }
      function mkGate(i, z) {
        const g = new THREE.Group(); g.position.z = z;
        LANES.forEach((L) => {
          [-1.3, 1.3].forEach((dx) => { const p = M.box(0.28, 3.6, 0.28, L.color, { e: L.color, ei: 0.5 }); p.position.set(L.x + dx, 1.8, 0); g.add(p); });
          const top = M.box(2.9, 0.4, 0.3, L.color, { e: L.color, ei: 0.7 }); top.position.set(L.x, 3.6, 0); g.add(top);
          const lb = M.label(L.label, { size: 0.7, bg: L.css, color: '#04101a' }); lb.position.set(L.x, 4.5, 0); g.add(lb);
          const beam = M.box(2.4, 0.02, 0.5, L.color, { e: L.color, ei: 0.6, o: 0.5 }); beam.position.set(L.x, 0.05, 0); g.add(beam);
        });
        st.add(g); return { g, i, z, s: picks[i], done: false };
      }
      const firstZ = -(cfg.gap + 24);
      for (let i = 0; i < Math.min(2, picks.length); i++) gates.push(mkGate(i, firstZ - i * cfg.gap));
      function spawnCoins(z0, z1) { for (let z = z0; z > z1; z -= 4) { if (Math.random() < 0.6) { const l = LANES[VQ.randInt(0, 2)]; const c = M.cyl(0.4, 0.4, 0.1, 0xfde047, { e: 0xfacc15, ei: 0.9 }); c.rotation.x = Math.PI / 2; c.position.set(l.x, 1.1, z); st.add(c); coins.push(c); } } }
      spawnCoins(-8, firstZ + 8);
      function spawnObst(z0, z1) { if (!cfg.obstacles) return; for (let z = z0; z > z1; z -= 12) { const ln = VQ.randInt(0, 2); const b = M.box(2.4, 1.6, 0.6, 0xef4444, { e: 0xdc2626, ei: 0.7 }); b.position.set(LANES[ln].x, 0.8, z); st.add(b); const l = M.label('📢', { size: 0.6, onTop: false }); l.position.set(0, 1.4, 0.4); b.add(l); obst.push(b); } }
      spawnObst(-16, firstZ + 10);
      function showNext() { const g = gates.find((x) => !x.done); if (g) stmt.innerHTML = VQ.esc(g.s[1]); }
      function judge(gt) {
        gt.done = true; const l = LANES[lane], good = l.t === gt.s[0]; asked++;
        if (good) { stats.ok++; G.hit(100, V3(l.x, 4, -2)); VQ.sfx.play('ok'); VQ.fx.burst(st, V3(l.x, 2, -1), l.color, 24, 4); G.msg('✔ ' + l.label, l.css); }
        else { stats.wrong++; missed.push(gt.s); G.miss(cfg.lives ? 0 : 20, V3(l.x, 4, -2)); const right = LANES.find((x) => x.t === gt.s[0]); G.msg('✖ זה היה ' + right.label, '#f87171'); VQ.fx.ring(st, V3(right.x, 0.1, -1), right.color, 3, 0.8); if (cfg.lives) G.loseLife(); }
        showNext();
        // spawn next gate ahead
        const nextI = gt.i + 2; if (nextI < picks.length) { const z = gates[gates.length - 1].z - cfg.gap; gates.push(mkGate(nextI, z)); spawnCoins(z + cfg.gap - 6, z + 8); spawnObst(z + cfg.gap - 12, z + 10); }
        if (asked >= picks.length) setTimeout(() => G.ended || finish(), 900);
      }
      function finish() { const perfect = stats.wrong === 0 && stats.hits === 0; G.end({ completed: true, perfect, bonus: perfect ? 300 : 0, title: perfect ? 'ריצה מושלמת! 🏅' : 'סיימתם את המסלול', stats: [['תשובות נכונות', `${stats.ok}/${picks.length}`], ['מטבעות', stats.coins], ['התנגשויות', stats.hits]], note: missed.length ? 'לחזרה: ' + missed.slice(0, 3).map((m) => `"${m[1]}" (${m[0] === 'p' ? 'יתרון' : m[0] === 'c' ? 'חיסרון' : 'מיתוס'})`).join(' • ') : 'הבנה מעולה של יתרונות וחסרונות!' }); }
      G.ctl = {
        onKey(e) { if (['ArrowLeft', 'KeyA'].includes(e.code)) { e.preventDefault(); move(-1); } else if (['ArrowRight', 'KeyD'].includes(e.code)) { e.preventDefault(); move(1); } },
        start() { showNext(); G.setMid('שערים', `0/${picks.length}`); },
        idle(dt) { hero.tick(dt); },
        update(dt) {
          const sp = cfg.speed * (1 + asked / picks.length * 0.25) * (hurt > 0 ? 0.6 : 1);
          if (hurt > 0) hurt -= dt;
          hero.position.x += (targetX - hero.position.x) * Math.min(1, dt * 12); hero.tick(dt); hero.rotation.z = (targetX - hero.position.x) * -0.15;
          dashes.forEach((d) => { d.position.z += sp * dt; if (d.position.z > 6) d.position.z -= 120; });
          gates.forEach((g) => { g.z += sp * dt; g.g.position.z = g.z; if (!g.done && g.z > 0) judge(g); });
          gates = gates.filter((g) => { if (g.z > 14) { st.remove(g.g); return false; } return true; });
          coins = coins.filter((c) => { c.position.z += sp * dt; c.rotation.z += dt * 4; if (Math.abs(c.position.z) < 0.9 && Math.abs(c.position.x - hero.position.x) < 1.2) { stats.coins++; G.addScore(5, c.position.clone()); VQ.sfx.play('coin'); st.remove(c); return false; } if (c.position.z > 8) { st.remove(c); return false; } return true; });
          obst = obst.filter((o) => { o.position.z += sp * dt; if (!hurt && Math.abs(o.position.z) < 0.8 && Math.abs(o.position.x - hero.position.x) < 1.3) { hurt = 1.4; stats.hits++; G.combo = 0; VQ.fx.burst(st, hero.position.clone().add(V3(0, 1, 0)), 0xef4444, 20, 4); VQ.sfx.play('boom'); G.msg('💥 Broadcast!', '#f87171'); if (cfg.lives) G.loseLife(); else G.addScore(-30); } if (o.position.z > 8) { st.remove(o); return false; } return true; });
          hero.visible = !(hurt > 0 && Math.floor(G.time * 12) % 2 === 0);
          G.setMid('שערים', `${asked}/${picks.length}`);
        },
      };
      // swipe support
      let sx = null; st.onPointerDown = (e) => { sx = e.clientX; }; st.onPointerUp = (e) => { if (sx != null && Math.abs(e.clientX - sx) > 30) move(e.clientX > sx ? 1 : -1); sx = null; };
      showNext();
      return G.ctl;
    },
  });
})(window.VQ);
