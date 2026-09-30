/* VLAN Quest – title screen and the 3D journey map */
(function (VQ) {
  const h = VQ.h, ui = VQ.ui, M = VQ.M, S = VQ.store, V3 = M.V3;
  const POS = [[-16, 5], [-8, 6.5], [0, 5], [8, 6.5], [16, 5], [16, -7], [8, -8.5], [0, -7], [-8, -8.5], [-16, -7]];
  const MODEL = ['hub', 'repeater', 'switch', 'l3', 'ap', 'router', 'firewall', 'pc', 'laptop'];
  let curIdx = 0;

  function buildHub(opts = {}) {
    const stage = new VQ.Stage({ bg: 0x070c1a, fogNear: 40, fogFar: 110, parallax: 1 });
    VQ.engine.setStage(stage);
    M.grid(stage, 120, 0x16305a); M.stars(stage, 600, 95);
    stage.setCam([0, 25, 21], [0, 0, -1]);
    const nodes = [];
    const pts = POS.map((p) => V3(p[0], 0, p[1]));
    // glowing path
    const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.4);
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 200, 0.14, 8, false), M.glowMat(0x22d3ee, 0.55)); tube.position.y = 0.15; stage.add(tube);
    const tube2 = new THREE.Mesh(new THREE.TubeGeometry(curve, 200, 0.5, 8, false), M.glowMat(0x22d3ee, 0.07)); tube2.position.y = 0.1; stage.add(tube2);
    // travelling packets along the path
    const dots = [];
    for (let i = 0; i < 6; i++) { const d = M.glow(i % 2 ? 0xf472b6 : 0x67e8f9, 1.1); stage.add(d); dots.push({ d, t: i / 6 }); }
    stage.onUpdate((dt) => dots.forEach((o) => { o.t = (o.t + dt * 0.03) % 1; const p = curve.getPointAt(o.t); o.d.position.set(p.x, 0.5, p.z); }));

    VQ.CHAPTERS.forEach((c, i) => {
      const g = new THREE.Group(); g.position.copy(pts[i]);
      const open = S.unlocked(i), done = S.chapterDone(c.id);
      const col = open ? c.color : 0x334155;
      const pl = M.cyl(2.3, 2.5, 0.5, 0x0f1a33, { r: 0.6 }, 32); pl.position.y = 0.05; g.add(pl);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(2.35, 0.09, 8, 48), M.mat(col, { e: col, ei: open ? 1 : 0.15 })); ring.rotation.x = Math.PI / 2; ring.position.y = 0.32; g.add(ring);
      const dev = M.device(MODEL[i], { screen: c.color, ports: 8 }); dev.scale.setScalar(1.3); dev.position.y = 0.3; if (!open) dev.traverse((o) => { if (o.material && o.material.color) { o.material = o.material.clone(); o.material.color.multiplyScalar(0.35); if (o.material.emissive) o.material.emissiveIntensity *= 0.2; } });
      g.add(dev);
      const num = M.label(open ? String(c.n) : '🔒', { size: 1.3, bg: open ? VQ.css(c.color) : '#334155', color: '#0b1220', onTop: true }); num.position.set(0, 4.3, 0); g.add(num);
      const title = M.label(c.title, { size: 0.78, bg: 'rgba(8,13,28,.85)', color: open ? '#fff' : '#64748b', border: open ? VQ.css(c.color) : '#334155' }); title.position.set(0, 0.9, 3.6); g.add(title);
      // medals
      const ms = S.medals(c.id);
      VQ.LEVELS.forEach((l, k) => { const m = M.medal(ms[k] ? parseInt(l.color.slice(1), 16) : 0x1e293b); m.position.set((k - 1) * 0.95, 3.35, 0.2); m.scale.setScalar(1.05); g.add(m); m.userData.spin = ms[k]; });
      if (done) { const ck = M.label('✔', { size: 0.9, color: '#4ade80', onTop: true }); ck.position.set(1.9, 2.6, 1); g.add(ck); }
      stage.add(g);
      const hit = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 5, 12), new THREE.MeshBasicMaterial({ visible: false })); hit.position.y = 2; g.add(hit);
      stage.pickable(g, () => onStation(i), { onHover: (v) => { dev.scale.setScalar(v ? 1.45 : 1.3); } });
      nodes.push({ g, dev, open, i });
      stage.onUpdate((dt, t) => { dev.rotation.y = Math.sin(t * 0.6 + i) * 0.35; g.children.forEach((o) => { if (o.userData.spin) o.rotation.y += dt * 2; }); });
    });

    // final exam castle
    {
      const i = 9, g = new THREE.Group(); g.position.copy(pts[9]);
      const open = S.allChaptersDone() || VQ.QS.unlockAll, done = !!S.data.cert;
      const col = done ? 0xfde047 : open ? 0xf87171 : 0x334155;
      const pl = M.cyl(2.6, 2.8, 0.5, 0x1a0f1f, { r: 0.6 }, 32); g.add(pl);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.1, 8, 48), M.mat(col, { e: col, ei: open ? 1.2 : 0.15 })); ring.rotation.x = Math.PI / 2; ring.position.y = 0.3; g.add(ring);
      const cup = M.cup(done ? 0xfbbf24 : open ? 0xf87171 : 0x475569); cup.scale.setScalar(1.7); cup.position.y = 0.3; g.add(cup);
      const lab = M.label(open ? '🏁 מבחן הסיום' : '🔒 מבחן הסיום', { size: 0.9, bg: 'rgba(8,13,28,.85)', color: open ? '#fff' : '#64748b', border: VQ.css(col) }); lab.position.set(0, 0.9, 3.9); g.add(lab);
      if (open && !done) { const gl = M.glow(0xf87171, 8, 0.5); gl.position.y = 2; g.add(gl); }
      const hit = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 2.8, 5, 12), new THREE.MeshBasicMaterial({ visible: false })); hit.position.y = 2; g.add(hit);
      stage.add(g); stage.pickable(g, () => onStation(9));
      stage.onUpdate((dt) => { cup.rotation.y += dt * 0.8; });
    }

    // hero
    const hero = M.avatar(S.data.color); hero.scale.setScalar(1.15); stage.add(hero);
    const startIdx = opts.at != null ? opts.at : curIdx;
    hero.position.copy(pts[startIdx]).add(V3(2.7, 0.3, 1.5)); curIdx = startIdx;
    const nameTag = M.label(S.data.name || '', { size: 0.6, bg: 'rgba(8,13,28,.8)', color: '#fff' }); stage.add(nameTag);
    stage.onUpdate((dt) => { hero.tick(dt); nameTag.position.set(hero.position.x, hero.position.y + 2.9, hero.position.z); });

    const hubState = { stage, hero, pts, walking: false, orbit: false };

    async function walkTo(idx) {
      if (hubState.walking) return; hubState.walking = true;
      const step = idx > curIdx ? 1 : -1;
      hero.userData.walking = true;
      while (curIdx !== idx) {
        const nxt = curIdx + step, tgt = pts[nxt].clone().add(V3(2.7, 0.3, 1.5));
        const from = hero.position, dx = tgt.x - from.x, dz = tgt.z - from.z;
        hero.rotation.y = Math.atan2(dx, dz);
        await stage.tween(hero.position, { x: tgt.x, y: tgt.y, z: tgt.z }, Math.hypot(dx, dz) / 11, { ease: 'lin' });
        curIdx = nxt;
      }
      hero.userData.walking = false; hero.rotation.y = 0.5; hubState.walking = false;
    }

    async function onStation(i) {
      if (hubState.walking || hubState.orbit) return;
      VQ.sfx.play('click');
      if (i === 9) {
        if (!(S.allChaptersDone() || VQ.QS.unlockAll)) { ui.toast('מבחן הסיום ייפתח אחרי שתסיימו את כל 9 התחנות (שיעור + משחק ברמת מתחילים)', '🔒'); VQ.sfx.play('bad'); return; }
        await walkTo(9); VQ.exam.intro(); return;
      }
      if (!S.unlocked(i)) { VQ.sfx.play('bad'); stage.shake = 0.4; ui.toast('התחנה נעולה 🔒 השלימו קודם את תחנה ' + i + ' (שיעור + משחק ברמת "מתחילים")', '🔒'); return; }
      await walkTo(i);
      hero.userData.cheer = 1.2;
      openStationPanel(VQ.CHAPTERS[i]);
    }
    hubState.onStation = onStation;
    return hubState;
  }

  function openStationPanel(c) {
    const lessonDone = S.lessonDone(c.id), game = VQ.gameFor(c.id);
    const box = h('div', { class: 'station' });
    box.append(h('div', { class: 'head' }, h('div', { class: 'big-ico' }, c.icon),
      h('div', {}, h('div', { class: 'sub' }, 'תחנה ' + c.n + ' מתוך 9'), h('h2', { style: { margin: 0 } }, c.title), h('div', { class: 'sub' }, c.sub))));
    box.append(h('h3', {}, 'מה תלמדו כאן'), h('ul', { class: 'learn' }, c.learn.map((t) => h('li', {}, t))));
    box.append(h('h3', {}, '1️⃣ שיעור־סימולציה'),
      h('div', { class: 'row' },
        h('button', { class: 'btn ' + (lessonDone ? 'ghost' : 'green'), onClick: () => VQ.runLesson(c.id) }, lessonDone ? '↻ חזרה על השיעור ✔' : '▶ התחילו את השיעור'),
        h('span', { class: 'sub' }, 'הסבר תלת־ממדי אינטראקטיבי, צעד אחר צעד')));
    box.append(h('h3', {}, '2️⃣ המשחק: ' + c.gameTitle + (lessonDone || VQ.QS.unlockAll ? '' : '  🔒 (נפתח אחרי השיעור)')));
    const grid = h('div', { class: 'lv-grid' });
    VQ.LEVELS.forEach((l) => {
      const g = S.game(c.id, l.id), lock = !(lessonDone || VQ.QS.unlockAll);
      grid.append(h('div', { class: 'lvcard' + (lock ? ' lock' : ''), onClick: () => { if (lock) { VQ.sfx.play('bad'); ui.toast('קודם עוברים את השיעור 🙂', '📘'); return; } VQ.startGame(c.id, l.id); } },
        h('div', { class: 'm' }, g.stars ? l.medal : '⬜'), h('div', { class: 'n', style: { color: l.color } }, l.name), h('div', { class: 's' }, l.blurb + ' • x' + l.mult),
        h('div', { html: ui.starsHtml(g.stars) }), h('div', { class: 's' }, g.best ? 'שיא: ' + VQ.fmt(g.best) : 'עוד לא שיחקתם')));
    });
    box.append(grid);
    box.append(h('div', { class: 'row', style: { marginTop: '14px', justifyContent: 'space-between' } },
      h('span', { class: 'sub' }, 'לא גיימרים? ברמת "מתחילים" מספיק לסיים כדי להמשיך במסע 💙'),
      h('button', { class: 'btn ghost sm', onClick: () => ui.closeModal() }, 'סגירה')));
    ui.modal(box, { closable: false });
  }

  function hubHud() {
    const root = ui.layer('hud'); root.innerHTML = '';
    const rk = S.rank(), d = S.data;
    const bar = h('div', { class: 'topbar' });
    bar.append(h('div', { class: 'row' },
      h('div', { class: 'chip' }, h('span', { style: { fontSize: '26px' } }, rk.icon),
        h('div', {}, h('div', {}, d.name), h('div', { class: 'sm' }, rk.name + (rk.next ? ' • הבא: ' + rk.next.name : '')),
          h('div', { class: 'xpbar' }, h('i', { style: { width: Math.round(rk.progress * 100) + '%' } })))),
      h('div', { class: 'chip' }, '⭐ ' + VQ.fmt(rk.total), h('span', { class: 'sm' }, 'נקודות')),
      h('div', { class: 'chip' }, '🥉' + S.medalCount('easy') + ' 🥈' + S.medalCount('mid') + ' 🥇' + S.medalCount('hard'))));
    bar.append(h('div', { class: 'row' },
      h('button', { class: 'iconbtn big', title: 'לוח מובילים', onClick: () => VQ.social.leaderboard() }, '📊', h('span', {}, 'מובילים')),
      h('button', { class: 'iconbtn big', title: 'הישגים', onClick: () => VQ.social.achievements() }, '🏆', h('span', {}, 'הישגים')),
      h('button', { class: 'iconbtn big', title: 'תעודה', onClick: () => VQ.social.certificate() }, '🎓', h('span', {}, 'תעודה')),
      h('button', { class: 'iconbtn', title: 'צליל', onClick: (e) => { VQ.sfx.setMuted(!VQ.sfx.muted); e.target.textContent = VQ.sfx.muted ? '🔇' : '🔊'; VQ.sfx.music(!VQ.sfx.muted); } }, VQ.sfx.muted ? '🔇' : '🔊'),
      h('button', { class: 'iconbtn', title: 'הגדרות', onClick: settings }, '⚙️')));
    root.append(bar);
    root.append(h('div', { style: { position: 'absolute', bottom: '14px', inset: 'auto 0 14px 0', textAlign: 'center', pointerEvents: 'none' } },
      h('span', { class: 'chip', style: { display: 'inline-flex' } }, '👆 לחצו על תחנה במפה כדי להתחיל את המסע')));
  }

  function settings() {
    const box = h('div', {}, h('h2', {}, '⚙️ הגדרות'),
      h('p', { class: 'sub' }, 'שמירה אוטומטית בדפדפן הזה. אפשר לאפס את ההתקדמות ולהתחיל מחדש.'),
      h('div', { class: 'row' },
        h('button', { class: 'btn ghost', onClick: () => { ui.closeModal(); VQ.showTitle(); } }, '👤 החלפת שם/דמות'),
        h('button', { class: 'btn pink', onClick: () => ui.confirm('למחוק את כל ההתקדמות? אי אפשר לבטל.', () => { S.reset(); ui.closeModal(); curIdx = 0; VQ.showTitle(); }) }, '🗑️ איפוס התקדמות'),
        h('button', { class: 'btn ghost', onClick: () => ui.closeModal() }, 'סגירה')));
    ui.modal(box);
  }

  VQ.goHub = function (chId) {
    ui.clearAll(); VQ.sfx.music(true);
    const idx = chId ? VQ.CHAPTERS.findIndex((c) => c.id === chId) : null;
    const hs = buildHub(idx != null && idx >= 0 ? { at: idx } : {});
    VQ.hubState = hs; hubHud();
    S.checkAchievements();
    if (idx != null && idx >= 0) setTimeout(() => openStationPanel(VQ.CHAPTERS[idx]), 350);
    else if (VQ.QS.debug) window.hub = hs;
  };

  // ---------- title / profile ----------
  VQ.showTitle = function () {
    ui.clearAll();
    const hs = buildHub(); hs.orbit = true;
    const st = hs.stage; let a = 0;
    st.onUpdate((dt) => { a += dt * 0.08; st.camPos.set(Math.sin(a) * 6, 20, 30); });
    const cont = S.exists();
    let color = S.data.color || VQ.AVATAR_COLORS[0];
    const inp = h('input', { placeholder: 'איך קוראים לך?', maxlength: 18, value: cont ? S.data.name : '' });
    const sw = h('div', { class: 'swatches' });
    const paint = () => { sw.innerHTML = ''; VQ.AVATAR_COLORS.forEach((c) => sw.append(h('div', { class: 'sw' + (c === color ? ' on' : ''), style: { background: VQ.css(c) }, onClick: () => { color = c; hs.hero.setColor(c); VQ.sfx.play('click'); paint(); } }))); };
    paint(); hs.hero.setColor(color);
    const go = () => {
      const name = inp.value.trim();
      if (!name) { inp.style.borderColor = '#f87171'; inp.focus(); VQ.sfx.play('bad'); return; }
      VQ.sfx.unlock(); VQ.sfx.play('level');
      if (!cont) S.reset();
      S.data.name = name; S.data.color = color; S.save();
      if (!S.data.seenIntro) story(); else VQ.goHub();
    };
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
    const box = h('div', { class: 'title' },
      h('div', { style: { fontSize: '13px', letterSpacing: '4px', color: 'var(--cyan)' } }, 'תקשוב CCNA • הרפתקה תלת־ממדית'),
      h('h1', { class: 'logo' }, 'מסע ה-VLAN'),
      h('p', { class: 'tag' }, 'למדו מה זה VLAN, למה צריך אותו, איך מגדירים ואיך בודקים — דרך סימולציות, משחקים ואתגרים. בסוף מחכים לכם תעודה וגביע 🏆'),
      inp, sw,
      h('div', { class: 'row', style: { justifyContent: 'center' } },
        h('button', { class: 'btn green', style: { fontSize: '20px', padding: '13px 34px' }, onClick: go }, cont ? '▶ להמשיך במסע' : '🚀 יוצאים לדרך!')),
      h('p', { class: 'sub', style: { marginTop: '14px' } }, '🎧 מומלץ עם צליל • ' + (VQ.isTouch() ? 'מסך מגע נתמך' : 'עכבר/מקלדת/מגע')));
    ui.modal(box, { dim: false });
  };

  function story() {
    const slides = [
      ['🏙️', 'ברוכים הבאים ל-TikNet City', 'עיר שכולה רשתות. חברת "תקשוב־טק" סובלת מרשת איטית, משתמשים שרואים מה שלא צריך, וכבלים בכל פינה. אתם הטכנאים החדשים — והפתרון נקרא VLAN.'],
      ['🗺️', '9 תחנות, בכל תחנה שני חלקים', 'קודם סימולציה תלת־ממדית שמסבירה בפועל מה קורה ברשת. אחריה משחקון — ב-3 רמות: מתחילים, מתקדמים ואגדות. גיימרים ילכו על אגדות, כולם יכולים להתקדם עם מתחילים.'],
      ['🏆', 'מדליות, גביעים וחברים', 'אוספים כוכבים ומדליות, משווים ניקוד עם חברים בעזרת קוד אישי, ובסוף עוברים מבחן מול "מפלצת ה-Broadcast" — ומקבלים תעודת הבנה על VLAN.'],
    ];
    let i = 0;
    const show = () => {
      const [ic, t, x] = slides[i];
      ui.modal(h('div', { style: { textAlign: 'center', maxWidth: '520px' } }, h('div', { style: { fontSize: '68px' } }, ic), h('h2', {}, t), h('p', {}, x),
        h('div', { class: 'row', style: { justifyContent: 'center', marginTop: '12px' } },
          h('button', { class: 'btn green', onClick: () => { VQ.sfx.play('click'); if (++i < slides.length) show(); else { S.data.seenIntro = true; S.save(); VQ.goHub(); } } }, i < slides.length - 1 ? 'הבא ◀' : '🚀 למפה!'))), { dim: false });
    };
    show();
  }
})(window.VQ);
