/* VLAN Quest – mini-game shell: HUD, countdown, pause, scoring, results */
(function (VQ) {
  const h = VQ.h, ui = VQ.ui;
  VQ.games = {};
  VQ.game = (def) => { VQ.games[def.id] = def; };
  const byChapter = (ch) => Object.values(VQ.games).find((g) => g.chapter === ch);
  VQ.gameFor = byChapter;

  VQ.startGame = function (chId, lvId) {
    const def = byChapter(chId), ch = VQ.chapter(chId), lv = VQ.level(lvId);
    if (!def) { ui.toast('המשחק הזה עוד לא מוכן', '🚧'); return; }
    ui.clearAll(); VQ.sfx.music(true);
    const stage = new VQ.Stage(def.stage || {});
    VQ.engine.setStage(stage);
    const cfg = Object.assign({}, def.levels[lvId]);

    const G = {
      def, ch, lv, level: lvId, cfg, mult: lv.mult, stage, score: 0, running: false, ended: false, over: false,
      lives: cfg.lives || 0, maxLives: cfg.lives || 0, combo: 0, bestCombo: 0, hits: 0, misses: 0, time: 0, hints: 0,
      ctl: null, ui: {},
    };
    // ---------- HUD ----------
    const gh = ui.layer('gamehud');
    const top = h('div', { class: 'gtop' });
    const hudScore = h('div', { class: 'gstat' }, h('div', { class: 'l' }, 'ניקוד'), h('div', { class: 'v' }, '0'));
    const hudMid = h('div', { class: 'gstat', style: { display: 'none' } }, h('div', { class: 'l' }, ''), h('div', { class: 'v' }, ''));
    const hudLives = h('div', { class: 'gstat', style: { display: cfg.lives ? '' : 'none' } }, h('div', { class: 'l' }, 'חיים'), h('div', { class: 'v hearts' }, ''));
    const hudCombo = h('div', { class: 'gstat combo', style: { visibility: 'hidden' } }, h('div', { class: 'l' }, 'קומבו'), h('div', { class: 'v' }, ''));
    const pauseBtn = h('button', { class: 'iconbtn', style: { pointerEvents: 'auto' }, onClick: () => pause() }, '⏸');
    top.append(h('div', { class: 'row' }, pauseBtn, hudScore), hudMid, h('div', { class: 'row' }, hudLives, hudCombo));
    const bottom = h('div', { class: 'gbottom' }), task = h('div', { class: 'gtask' });
    gh.append(top, task, bottom);
    G.ui = { top, bottom, task, root: gh };

    G.render = function () {
      hudScore.lastChild.textContent = VQ.fmt(G.score);
      if (G.maxLives) hudLives.lastChild.textContent = '❤️'.repeat(Math.max(0, G.lives)) + '🖤'.repeat(Math.max(0, G.maxLives - G.lives));
      hudCombo.style.visibility = G.combo >= 3 ? 'visible' : 'hidden'; hudCombo.lastChild.textContent = 'x' + G.combo;
    };
    G.setMid = (label, val) => { hudMid.style.display = ''; hudMid.firstChild.textContent = label; hudMid.lastChild.textContent = val; };
    G.setTask = (html) => { task.innerHTML = ''; if (html) task.appendChild(h('div', { class: 'box', html })); };
    G.msg = (text, color = '#fff') => { const m = h('div', { class: 'gmsg', style: { color } }, text); gh.appendChild(m); setTimeout(() => m.remove(), 1200); };
    G.addScore = function (base, worldPos, color) {
      const pts = Math.round(base * G.mult); G.score = Math.max(0, G.score + pts); G.render();
      if (worldPos) VQ.fx.float(stage, worldPos, (pts >= 0 ? '+' : '') + pts, color || (pts >= 0 ? '#fde047' : '#f87171'), 0.5);
      return pts;
    };
    // hit = success in a row (combo), miss = mistake
    G.hit = function (base, worldPos) {
      G.combo++; G.hits++; G.bestCombo = Math.max(G.bestCombo, G.combo);
      const bonus = 1 + Math.min(1, Math.floor(G.combo / 5) * 0.2);
      if (G.combo > 0 && G.combo % 5 === 0) { G.msg('🔥 קומבו x' + G.combo, '#fbbf24'); VQ.sfx.play('coin'); }
      G.render();
      return G.addScore(base * bonus, worldPos);
    };
    G.miss = function (penalty = 0, worldPos) {
      G.combo = 0; G.misses++; VQ.sfx.play('bad'); stage.shake = 0.5;
      if (penalty) G.addScore(-penalty, worldPos); else G.render();
    };
    G.loseLife = function () {
      G.lives--; G.render(); VQ.sfx.play('bad'); stage.shake = 0.8;
      if (G.lives <= 0 && G.running) { G.end({ completed: false, title: 'נגמרו החיים!', note: 'זה חלק מהלמידה — נסו שוב, אפשר גם ברמה קלה יותר.' }); }
      return G.lives;
    };
    G.stars = () => { const t = cfg.stars || [0, 0, 0]; return (G.score >= t[0] ? 1 : 0) + (G.score >= t[1] ? 1 : 0) + (G.score >= t[2] ? 1 : 0); };

    // ---------- end / results ----------
    G.end = function (r) {
      if (G.ended) return; G.ended = true; G.running = false;
      const completed = r.completed !== false;
      if (r.bonus) G.addScore(r.bonus);
      let stars = completed ? Math.max(1, G.stars()) : 0;
      if (r.stars != null) stars = r.stars;
      const perfect = completed && !!r.perfect;
      const rec = completed ? VQ.store.recordGame(chId, lvId, G.score, stars, { combo: G.bestCombo, perfect }) : { record: false };
      if (completed) {
        if (r.noHints) VQ.store.unlock('no_hints');
        VQ.store.checkAchievements();
      }
      VQ.sfx.play(completed ? 'fanfare' : 'lose');
      if (completed) VQ.fx.confetti(stage, VQ.M.V3(stage.camLook.x, 4, stage.camLook.z), 60);
      const nextLv = VQ.LEVELS[VQ.LEVELS.findIndex((l) => l.id === lvId) + 1];
      const box = h('div', { class: 'result', style: { textAlign: 'center' } });
      box.append(h('div', { style: { fontSize: '13px', color: 'var(--dim)' } }, `${ch.icon} ${def.title} • ${lv.medal} ${lv.name}`),
        h('h2', {}, r.title || (completed ? (stars === 3 ? 'מושלם! 🌟' : 'כל הכבוד!') : 'לא הפעם…')),
        h('div', { html: ui.starsHtml(stars) }));
      const sc = h('div', { class: 'bigscore' }, '0'); box.append(sc);
      if (rec.record) box.append(h('span', { class: 'badge-new' }, '🏆 שיא חדש!'));
      if (completed && !rec.record) box.append(h('div', { class: 'sub' }, `השיא שלכם: ${VQ.fmt(VQ.store.game(chId, lvId).best)}`));
      if (r.note) box.append(h('p', {}, r.note));
      const stats = (r.stats || []).concat(G.bestCombo >= 3 ? [['רצף הצלחות מקסימלי', G.bestCombo]] : []);
      stats.forEach(([a, b]) => box.append(h('div', { class: 'rrow' }, h('span', {}, a), h('b', {}, String(b)))));
      if (completed) box.append(h('div', { class: 'rrow' }, h('span', {}, `כפולת רמה (${lv.name})`), h('b', {}, 'x' + lv.mult)));
      const t = cfg.stars; if (completed && t && stars < 3) box.append(h('div', { class: 'sub', style: { marginTop: '6px' } }, `עוד ${VQ.fmt(t[stars] - G.score)} נקודות לכוכב הבא`));
      const btns = h('div', { class: 'row', style: { justifyContent: 'center', marginTop: '14px' } },
        h('button', { class: 'btn green', onClick: () => VQ.startGame(chId, lvId) }, '🔁 שוב'),
        completed && nextLv ? h('button', { class: 'btn amber', onClick: () => VQ.startGame(chId, nextLv.id) }, `${nextLv.medal} לרמת "${nextLv.name}"`) : null,
        completed ? h('button', { class: 'btn ghost', onClick: () => ui.copy(ui.shareText(def.title, G.score)) }, '📣 אתגרו חבר') : null,
        !completed && lvId !== 'easy' ? h('button', { class: 'btn amber', onClick: () => VQ.startGame(chId, lvId === 'hard' ? 'mid' : 'easy') }, 'לרמה קלה יותר') : null,
        h('button', { class: 'btn ghost', onClick: () => VQ.goHub(chId) }, '🗺️ למפה'));
      box.append(btns);
      setTimeout(() => { ui.modal(box); ui.countUp(sc, G.score); }, completed ? 900 : 500);
      if (G.ctl && G.ctl.onEnd) G.ctl.onEnd();
    };

    // ---------- pause ----------
    function pause() {
      if (!G.running || G.ended) return;
      stage.paused = true; VQ.sfx.play('click');
      ui.modal(h('div', { style: { textAlign: 'center' } }, h('h2', {}, '⏸ הפסקה'),
        h('div', { class: 'row', style: { justifyContent: 'center', marginTop: '10px' } },
          h('button', { class: 'btn green', onClick: () => { ui.closeModal(); stage.paused = false; } }, '▶ המשך'),
          h('button', { class: 'btn amber', onClick: () => VQ.startGame(chId, lvId) }, '🔁 התחל מחדש'),
          h('button', { class: 'btn ghost', onClick: () => VQ.goHub(chId) }, '🗺️ למפה'))));
    }
    G.pause = pause;

    // ---------- build game world ----------
    G.ctl = def.create(G) || {};
    stage.onUpdate((dt) => { if (G.running && !G.ended) { G.time += dt; G.ctl.update && G.ctl.update(dt); } else if (G.ctl.idle) G.ctl.idle(dt); });
    stage.onKey = (e) => {
      if (e.code === 'Escape') { pause(); return; }
      if (G.running && G.ctl.onKey) G.ctl.onKey(e);
    };
    G.render();

    // ---------- intro & countdown ----------
    const intro = h('div', {},
      h('div', { class: 'sub' }, `${ch.icon} תחנה ${ch.n} • ${lv.medal} רמה: ${lv.name} (x${lv.mult})`),
      h('h2', {}, '🎮 ' + def.title), h('p', {}, def.tagline || ''),
      h('h3', {}, 'איך משחקים'),
      h('ul', { class: 'learn' }, def.howto.map((t) => h('li', { html: VQ.rich(t) }))),
      cfg.note ? h('p', { class: 'sub', html: VQ.rich(cfg.note) }) : null,
      h('div', { class: 'sub' }, cfg.stars ? `כוכבים: ${cfg.stars.map((s) => VQ.fmt(s)).join(' / ')} נקודות` : ''),
      h('div', { class: 'row', style: { justifyContent: 'center', marginTop: '14px' } },
        h('button', { class: 'btn green', onClick: begin }, '▶ מתחילים!'),
        h('button', { class: 'btn ghost', onClick: () => VQ.goHub(chId) }, '↩ חזרה')));
    if (G.ctl.intro) G.ctl.intro();
    ui.modal(intro);

    function begin() {
      VQ.sfx.play('click'); ui.closeModal();
      let n = 3;
      const cd = h('div', { class: 'countdown' }, String(n)); gh.appendChild(cd);
      const iv = setInterval(() => {
        n--; VQ.sfx.play('tick');
        if (n > 0) cd.textContent = n;
        else { clearInterval(iv); cd.textContent = 'קדימה!'; VQ.sfx.play('level'); setTimeout(() => cd.remove(), 600); G.running = true; if (G.ctl.start) G.ctl.start(); }
      }, 700);
      VQ.sfx.play('tick');
    }
    G.begin = begin;
    return G;
  };
})(window.VQ);
