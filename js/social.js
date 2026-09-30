/* Leaderboard (friend codes), achievements & trophies, certificate */
(function (VQ) {
  const h = VQ.h, ui = VQ.ui, S = VQ.store, M = VQ.M, V3 = M.V3;
  const soc = VQ.social = {};

  function chapterSum(bests, k) { return bests[k * 3] + bests[k * 3 + 1] + bests[k * 3 + 2]; }
  function myBests() { const b = []; for (const c of VQ.CHAPTERS) for (const l of VQ.LEVELS) b.push(S.game(c.id, l.id).best); return b; }
  function meCard() { return { n: S.data.name, t: S.totalScore(), s: S.totalStars(), b: myBests(), m: [S.medalCount('easy'), S.medalCount('mid'), S.medalCount('hard')], e: S.data.exam.best || 0, c: S.data.cert ? 1 : 0, me: true }; }

  soc.leaderboard = function (tab = 'me') {
    VQ.sfx.play('click');
    const root = h('div', {});
    const code = S.makeCode(), link = location.href.split('#')[0] + '#f=' + code;
    function render() {
      root.innerHTML = '';
      root.append(h('h2', {}, '📊 לוח מובילים'), h('div', { class: 'sub' }, 'משווים ניקוד עם חברים — בלי הרשמה. כל אחד מעתיק את הקוד שלו ושולח לחבר; החבר מדביק אותו כאן.'));
      root.append(h('div', { class: 'tabs' }, h('span', { class: 'tab' + (tab === 'me' ? ' on' : ''), onClick: () => { tab = 'me'; render(); } }, '🎮 השיאים שלי'), h('span', { class: 'tab' + (tab === 'fr' ? ' on' : ''), onClick: () => { tab = 'fr'; render(); } }, '🤝 חברים (' + S.data.friends.length + ')')));
      if (tab === 'me') {
        const t = h('table', { class: 'lb' }, h('tr', {}, h('th', {}, 'תחנה'), VQ.LEVELS.map((l) => h('th', {}, l.medal + ' ' + l.name)), h('th', {}, 'סה״כ')));
        VQ.CHAPTERS.forEach((c) => { const row = h('tr', {}, h('td', {}, c.icon + ' ' + c.title)); let sum = 0; VQ.LEVELS.forEach((l) => { const g = S.game(c.id, l.id); sum += g.best; row.append(h('td', {}, g.best ? h('span', {}, VQ.fmt(g.best), ' ', h('span', { class: 'stars', style: { fontSize: '12px' } }, '★'.repeat(g.stars))) : '—')); }); row.append(h('td', {}, h('b', {}, VQ.fmt(sum)))); t.append(row); });
        t.append(h('tr', {}, h('td', {}, h('b', {}, 'מבחן סיום + שיעורים')), h('td', { colspan: 3 }, S.data.exam.best ? `מבחן ${S.data.exam.best}%` : 'עוד לא נבחנתם'), h('td', {}, h('b', {}, VQ.fmt(S.totalScore())))));
        root.append(h('div', { style: { overflowX: 'auto' } }, t));
        root.append(h('h3', {}, '📣 הקוד שלי לשיתוף'), h('textarea', { class: 'code', readonly: true, onClick: (e) => e.target.select() }, code));
        root.append(h('div', { class: 'row', style: { marginTop: '8px' } },
          h('button', { class: 'btn sm', onClick: () => ui.copy(code) }, '📋 העתק קוד'),
          h('button', { class: 'btn sm ghost', onClick: () => ui.copy(link) }, '🔗 העתק קישור'),
          navigator.share ? h('button', { class: 'btn sm amber', onClick: () => navigator.share({ title: 'מסע ה-VLAN', text: ui.shareText('המסע', S.totalScore()).split('\n')[0], url: link }).catch(() => {}) }, '📤 שתף') : null));
      } else {
        const inp = h('input', { class: 'txt', placeholder: 'הדביקו כאן קוד של חבר (VQ1.…)', style: { flex: 1, minWidth: '200px', direction: 'ltr' } });
        root.append(h('div', { class: 'row' }, inp, h('button', { class: 'btn sm green', onClick: () => { const p = S.addFriend(inp.value); if (p) { ui.toast('נוסף: ' + VQ.esc(p.n), '🤝'); VQ.sfx.play('level'); render(); } else { VQ.sfx.play('bad'); inp.style.borderColor = '#f87171'; ui.toast('הקוד לא תקין. העתיקו את כולו, מ-VQ1 ועד הסוף.', '⚠️'); } } }, '➕ הוסף חבר')));
        const all = S.data.friends.map((f) => Object.assign({}, f)).concat([meCard()]).sort((a, b) => b.t - a.t);
        const t = h('table', { class: 'lb', style: { marginTop: '10px' } }, h('tr', {}, h('th', {}, '#'), h('th', {}, 'שחקן'), h('th', {}, 'נקודות'), h('th', {}, '⭐'), h('th', {}, '🥉🥈🥇'), h('th', {}, 'מבחן'), h('th', {}, '')));
        all.forEach((p, i) => t.append(h('tr', { class: p.me ? 'me' : '' }, h('td', {}, i === 0 ? '👑' : String(i + 1)), h('td', {}, (p.c ? '🎓 ' : '') + p.n + (p.me ? ' (אני)' : '')), h('td', {}, h('b', {}, VQ.fmt(p.t))), h('td', {}, p.s), h('td', {}, p.m.join(' • ')), h('td', {}, p.e ? p.e + '%' : '—'), h('td', {}, p.me ? '' : h('button', { class: 'btn ghost sm', onClick: () => cmp(p) }, '⚔️'), ' ', p.me ? '' : h('button', { class: 'iconbtn', style: { width: '30px', height: '30px', fontSize: '12px', display: 'inline-grid' }, onClick: () => { S.removeFriend(p.n); render(); } }, '✕')))));
        root.append(h('div', { style: { overflowX: 'auto' } }, t));
        if (!S.data.friends.length) root.append(h('p', { class: 'sub' }, 'עוד אין חברים. בקשו מחבר את הקוד שלו (מתוך "השיאים שלי").'));
      }
      root.append(h('div', { class: 'row', style: { justifyContent: 'flex-end', marginTop: '10px' } }, h('button', { class: 'btn ghost sm', onClick: () => ui.closeModal() }, 'סגירה')));
    }
    function cmp(p) {
      const me = meCard(); const t = h('table', { class: 'lb' }, h('tr', {}, h('th', {}, 'תחנה'), h('th', {}, 'אני'), h('th', {}, p.n), h('th', {}, '')));
      let w = 0, l = 0;
      VQ.CHAPTERS.forEach((c, k) => { const a = chapterSum(me.b, k), b = chapterSum(p.b, k); if (a > b) w++; else if (b > a) l++; t.append(h('tr', {}, h('td', {}, c.icon + ' ' + c.title), h('td', { style: { color: a >= b ? '#4ade80' : '' } }, VQ.fmt(a)), h('td', { style: { color: b > a ? '#f87171' : '' } }, VQ.fmt(b)), h('td', {}, a > b ? '👍' : a < b ? '😤' : '🤝'))); });
      ui.modal(h('div', {}, h('h2', {}, `⚔️ אני מול ${p.n}`), h('p', { class: 'sub' }, `ניצחתי ב-${w} תחנות • הפסדתי ב-${l}`), h('div', { style: { overflowX: 'auto' } }, t), h('div', { class: 'row', style: { justifyContent: 'flex-end', marginTop: '8px' } }, h('button', { class: 'btn ghost sm', onClick: () => soc.leaderboard('fr') }, '↩ חזרה'))), { wide: true });
    }
    render(); ui.modal(root, { wide: true });
  };

  soc.achievements = function () {
    VQ.sfx.play('click'); S.checkAchievements();
    const root = h('div', {}, h('h2', {}, '🏆 הישגים וגביעים'));
    const trophies = S.trophies();
    root.append(h('h3', {}, 'ארון הגביעים'));
    const cab = h('div', { class: 'agrid' });
    [['easy', 'גביע ארד', '🥉 ארד בכל 9 התחנות'], ['mid', 'גביע כסף', '🥈 כסף בכל 9 התחנות'], ['hard', 'גביע זהב', '🥇 זהב בכל 9 התחנות']].forEach(([lv, n, d]) => { const got = trophies.some((t) => t.id === lv); cab.append(h('div', { class: 'ach' + (got ? '' : ' lock') }, h('div', { class: 'i' }, '🏆'), h('div', {}, h('div', { class: 'n' }, n), h('div', { class: 'd' }, d + ` (${S.medalCount(lv)}/9)`)))); });
    cab.append(h('div', { class: 'ach' + (S.data.exam.passed ? '' : ' lock') }, h('div', { class: 'i' }, '📜'), h('div', {}, h('div', { class: 'n' }, 'גביע המבחן'), h('div', { class: 'd' }, 'עברו את מבחן הסיום'))));
    cab.append(h('div', { class: 'ach' + (S.data.cert ? '' : ' lock') }, h('div', { class: 'i' }, '👑'), h('div', {}, h('div', { class: 'n' }, 'גביע האלוף'), h('div', { class: 'd' }, 'תעודה מלאה'))));
    root.append(cab);
    root.append(h('h3', {}, 'מדליות לפי תחנה'));
    const mt = h('table', { class: 'lb' });
    VQ.CHAPTERS.forEach((c) => mt.append(h('tr', {}, h('td', {}, c.icon + ' ' + c.title), h('td', {}, VQ.LEVELS.map((l, i) => (S.game(c.id, l.id).stars ? l.medal : '⚪')).join(' ')), h('td', {}, h('span', { class: 'stars', style: { fontSize: '14px' } }, '★'.repeat(S.chapterStars(c.id)) + '☆'.repeat(9 - S.chapterStars(c.id)))))));
    root.append(h('div', { style: { overflowX: 'auto' } }, mt));
    root.append(h('h3', {}, `הישגים (${Object.keys(S.data.ach).length}/${VQ.ACHIEVEMENTS.length})`));
    const g = h('div', { class: 'agrid' });
    VQ.ACHIEVEMENTS.forEach((a) => g.append(h('div', { class: 'ach' + (S.data.ach[a.id] ? '' : ' lock') }, h('div', { class: 'i' }, a.icon), h('div', {}, h('div', { class: 'n' }, a.name), h('div', { class: 'd' }, a.desc)))));
    root.append(g, h('div', { class: 'row', style: { justifyContent: 'flex-end', marginTop: '10px' } }, h('button', { class: 'btn ghost sm', onClick: () => ui.closeModal() }, 'סגירה')));
    ui.modal(root, { wide: true });
  };

  // ------------------------------------------------------------ certificate
  function certId() { return 'VQ-' + VQ.hash(S.data.name + '|' + S.data.created).toUpperCase().slice(0, 6); }
  function drawCert(cv) {
    const W = 1600, H = 1130; cv.width = W; cv.height = H; const c = cv.getContext('2d');
    const grd = c.createLinearGradient(0, 0, W, H); grd.addColorStop(0, '#0b1226'); grd.addColorStop(0.5, '#141b3d'); grd.addColorStop(1, '#0a0f1e'); c.fillStyle = grd; c.fillRect(0, 0, W, H);
    // subtle grid + glow
    c.strokeStyle = 'rgba(56,189,248,.07)'; c.lineWidth = 1; for (let x = 0; x < W; x += 40) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); } for (let y = 0; y < H; y += 40) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
    const rg = c.createRadialGradient(W / 2, H / 2, 50, W / 2, H / 2, 700); rg.addColorStop(0, 'rgba(99,102,241,.25)'); rg.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = rg; c.fillRect(0, 0, W, H);
    // gold frames
    const gold = c.createLinearGradient(0, 0, W, 0); gold.addColorStop(0, '#fde68a'); gold.addColorStop(0.5, '#f59e0b'); gold.addColorStop(1, '#fde68a');
    c.strokeStyle = gold; c.lineWidth = 10; c.strokeRect(36, 36, W - 72, H - 72); c.lineWidth = 3; c.strokeRect(58, 58, W - 116, H - 116);
    [[58, 58], [W - 58, 58], [58, H - 58], [W - 58, H - 58]].forEach(([x, y]) => { c.fillStyle = '#fbbf24'; c.beginPath(); c.arc(x, y, 14, 0, 7); c.fill(); });
    c.direction = 'rtl'; c.textAlign = 'center'; c.textBaseline = 'middle';
    const F = (w, s) => `${w} ${s}px Heebo, "Segoe UI", Arial, sans-serif`;
    c.fillStyle = '#7dd3fc'; c.font = F(600, 30); c.fillText('תקשוב CCNA  •  מסע ה-VLAN', W / 2, 120);
    const tg = c.createLinearGradient(400, 0, 1200, 0); tg.addColorStop(0, '#22d3ee'); tg.addColorStop(0.5, '#a78bfa'); tg.addColorStop(1, '#f472b6');
    c.fillStyle = tg; c.font = F(900, 118); c.fillText('תעודת הבנה', W / 2, 235);
    c.fillStyle = '#e2e8f0'; c.font = F(700, 46); c.fillText('VLAN — Virtual LAN', W / 2, 325);
    c.fillStyle = '#94a3b8'; c.font = F(400, 34); c.fillText('מוענקת בזאת ל', W / 2, 415);
    c.fillStyle = gold; c.font = F(900, 110); c.fillText(S.data.name, W / 2, 525);
    c.strokeStyle = 'rgba(251,191,36,.5)'; c.lineWidth = 3; c.beginPath(); c.moveTo(380, 590); c.lineTo(W - 380, 590); c.stroke();
    c.fillStyle = '#cbd5e1'; c.font = F(500, 34);
    c.fillText('על השלמת מסע הלמידה המלא: מה זה VLAN ולמה צריך אותו, איך הוא עובד, מכשירים התומכים בו,', W / 2, 650);
    c.fillText('יתרונות וחסרונות, הגדרה ב-Cisco ובדיקה ואימות – ועל מעבר מבחן הסיום בהצלחה.', W / 2, 702);
    // stats boxes
    const rk = S.rank(), items = [['ניקוד כולל', VQ.fmt(rk.total)], ['כוכבים', S.totalStars() + '/81'], ['מדליות', `🥉${S.medalCount('easy')}  🥈${S.medalCount('mid')}  🥇${S.medalCount('hard')}`], ['ציון מבחן', S.data.exam.best + '%'], ['דרגה', rk.icon + ' ' + rk.name]];
    items.forEach(([l, v], i) => { const bw = 268, gap = 22, x0 = W / 2 - (items.length * bw + (items.length - 1) * gap) / 2, x = x0 + i * (bw + gap); c.fillStyle = 'rgba(15,23,42,.8)'; c.strokeStyle = 'rgba(148,163,184,.35)'; c.lineWidth = 2; c.beginPath(); c.roundRect ? c.roundRect(x, 770, bw, 150, 22) : c.rect(x, 770, bw, 150); c.fill(); c.stroke(); c.fillStyle = '#94a3b8'; c.font = F(500, 26); c.fillText(l, x + bw / 2, 810); c.fillStyle = '#fde68a'; c.font = F(800, v.length > 12 ? 30 : 42); c.fillText(v, x + bw / 2, 870); });
    // seal
    const sx = 260, sy = 1010; c.save(); c.translate(sx, sy); const sg = c.createRadialGradient(0, 0, 5, 0, 0, 80); sg.addColorStop(0, '#fde68a'); sg.addColorStop(1, '#d97706'); c.fillStyle = sg; c.beginPath(); for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2, r = i % 2 ? 66 : 82; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.fill(); c.fillStyle = '#7c2d12'; c.font = F(900, 60); c.direction = 'ltr'; c.fillText('★', 0, -4); c.font = F(800, 20); c.fillText('VLAN', 0, 34); c.restore(); c.direction = 'rtl';
    c.fillStyle = '#94a3b8'; c.font = F(500, 26); c.fillText('תאריך: ' + new Date(S.data.cert.date).toLocaleDateString('he-IL'), W / 2, 1000);
    c.fillText('מספר תעודה: ' + certId(), W / 2, 1042);
    c.fillStyle = '#e2e8f0'; c.font = F(700, 30); c.textAlign = 'center'; c.fillText('👑 אלוף ה-VLAN 👑', W - 300, 1010);
    c.strokeStyle = '#64748b'; c.lineWidth = 2; c.beginPath(); c.moveTo(W - 460, 1035); c.lineTo(W - 140, 1035); c.stroke();
    c.fillStyle = '#64748b'; c.font = F(400, 22); c.fillText('הענקת התעודה אוטומטית ע״י המשחק', W - 300, 1062);
  }
  function certStage() {
    ui.clearHud();
    const st = new VQ.Stage({ bg: 0x0a0e22, fogNear: 25, fogFar: 80 }); VQ.engine.setStage(st);
    M.grid(st, 60, 0x2a2660); M.stars(st, 300, 70);
    st.setCam([0, 4.5, 12], [0, 2.2, 0]);
    const tr = S.trophies(); const n = Math.max(1, tr.length);
    const cups = [];
    tr.forEach((t, i) => { const cup = M.cup(parseInt((t.color || '#fbbf24').replace('#', ''), 16)); cup.position.set((i - (n - 1) / 2) * 3.2, 0, 0); cup.scale.setScalar(t.id === 'cert' ? 2.4 : 1.6); st.add(cup); cups.push(cup); });
    st.onUpdate((dt) => cups.forEach((c) => { c.rotation.y += dt * 0.8; }));
    VQ.fx.confetti(st, V3(0, 5, 0), 90);
    const sp = new THREE.PointLight(0xfde68a, 1.2, 30); sp.position.set(0, 8, 6); st.add(sp);
    return st;
  }
  soc.certificate = function (fresh) {
    VQ.sfx.play('click');
    if (!S.data.exam.passed) {
      const ls = S.lessonsCount(), gs = S.medalCount('easy');
      ui.modal(h('div', { style: { textAlign: 'center', maxWidth: '520px' } }, h('div', { style: { fontSize: '60px' } }, '🔒'), h('h2', {}, 'התעודה עדיין נעולה'),
        h('p', {}, 'כדי לקבל את תעודת ההבנה על VLAN:'),
        h('div', { style: { textAlign: 'right' } },
          h('div', { class: 'rrow' }, h('span', {}, '📘 שיעורים שהושלמו'), h('b', {}, ls + '/9')),
          h('div', { class: 'rrow' }, h('span', {}, '🥉 משחקים ברמת "מתחילים"'), h('b', {}, gs + '/9')),
          h('div', { class: 'rrow' }, h('span', {}, '👾 מבחן הסיום'), h('b', {}, S.data.exam.best ? S.data.exam.best + '% (צריך 70%)' : 'עוד לא'))),
        h('div', { class: 'row', style: { justifyContent: 'center', marginTop: '12px' } }, h('button', { class: 'btn ghost', onClick: () => ui.closeModal() }, 'חזרה למסע')))); return;
    }
    if (!S.data.cert) { S.data.cert = { id: certId(), date: Date.now() }; S.save(); S.checkAchievements(); }
    ui.closeModal(); certStage(); VQ.sfx.play('fanfare');
    const cv = h('canvas', {});
    const draw = () => drawCert(cv);
    try { (document.fonts && document.fonts.load ? document.fonts.load('900 60px Heebo') : Promise.resolve()).then(draw, draw); } catch (e) { draw(); }
    draw();
    const box = h('div', { class: 'cert-wrap' }, cv,
      h('div', { class: 'row', style: { justifyContent: 'center', marginTop: '12px' } },
        h('button', { class: 'btn green', onClick: () => { const a = h('a', { href: cv.toDataURL('image/png'), download: `VLAN-certificate-${S.data.name}.png` }); document.body.append(a); a.click(); a.remove(); } }, '⬇️ הורדה (PNG)'),
        h('button', { class: 'btn amber', onClick: () => { const pa = document.getElementById('printarea') || h('div', { id: 'printarea' }); pa.innerHTML = ''; pa.append(h('img', { src: cv.toDataURL('image/png') })); document.body.append(pa); setTimeout(() => window.print(), 200); } }, '🖨️ הדפסה'),
        h('button', { class: 'btn ghost', onClick: () => ui.copy(ui.shareText('תעודת VLAN', S.totalScore())) }, '📣 שתפו הישג'),
        h('button', { class: 'btn ghost', onClick: () => VQ.goHub() }, '🗺️ למפה')));
    ui.modal(box, { wide: true, dim: false });
  };
})(window.VQ);
