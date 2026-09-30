/* VLAN Quest – lesson (guided simulation) shell */
(function (VQ) {
  const h = VQ.h, ui = VQ.ui;
  VQ.lessons = {};
  VQ.lesson = (id, def) => { VQ.lessons[id] = def; };
  const NEVER = () => new Promise(() => {});

  VQ.runLesson = function (id) {
    const def = VQ.lessons[id], ch = VQ.chapter(id);
    ui.clearAll(); VQ.sfx.music(true);
    const stage = new VQ.Stage(def.stage || {});
    VQ.engine.setStage(stage);
    const cleanups = [], temps = [];
    const L = {
      id, ch, stage, tok: 0, idx: -1, canNext: true, def,
      onCleanup: (fn) => temps.push(fn),
      addTemp(o) { stage.add(o); temps.push(() => { stage.remove(o); if (o.material && o.material.map && !o.material.map.userData.shared) o.material.map.dispose(); }); return o; },
      runTemps() { temps.splice(0).forEach((f) => f()); },
      makeNet(o) { const n = new VQ.Net3D(stage, o); cleanups.push(() => n.abort()); return n; },
      // guarded timers – they never resolve if the student already moved to another step
      async wait(s) { const t = L.tok; await stage.wait(s); if (t !== L.tok) await NEVER(); },
      async tw(obj, to, d, o) { const t = L.tok; await stage.tween(obj, to, d, o); if (t !== L.tok) await NEVER(); },
      cam(pos, look, dur) { return L.tw ? stage.camTo(pos, look, dur == null ? 1.2 : dur) : null; },
      unlock() { if (!L.canNext) { L.canNext = true; VQ.sfx.play('ok'); render(); } },
      flash(txt) { ui.toast(txt, '💡'); },
    };
    def.build(L);

    const root = ui.layer('lesson');
    const steps = def.steps;
    let answered = false, stepDone = {};

    function leave() {
      VQ.sfx.play('click');
      ui.confirm('לצאת מהשיעור וללכת חזרה למפה?', () => { VQ.goHub(); });
    }

    function go(i) {
      cleanups.forEach((f) => f()); L.runTemps();
      L.tok++; L.idx = i; answered = false;
      const s = steps[i];
      L.canNext = !(s.prompt || s.q) || !!stepDone[i];
      render();
      if (s.enter) { try { const r = s.enter(L, s); if (r && r.catch) r.catch((e) => console.error(e)); } catch (e) { console.error(e); } }
    }

    function render() {
      const i = L.idx, s = steps[i];
      root.innerHTML = '';
      const p = h('div', { class: 'lpanel' + (def.narrow ? ' narrow' : '') });
      p.appendChild(h('div', { class: 'dots' }, steps.map((_, k) => h('i', { class: k < i ? 'on' : k === i ? 'cur' : '' }))));
      p.appendChild(h('div', { class: 'lt' }, h('span', { style: { fontSize: '26px' } }, ch.icon),
        h('h3', {}, s.t), h('span', { class: 'sub' }, `${i + 1}/${steps.length}`),
        h('button', { class: 'iconbtn', style: { width: '34px', height: '34px', fontSize: '14px' }, title: 'יציאה', onClick: leave }, '✕')));
      if (s.x) p.appendChild(h('div', { class: 'lx', html: VQ.rich(s.x) }));
      if (s.prompt && !L.canNext) p.appendChild(h('div', { class: 'prompt' }, '👆 ' + s.prompt));
      if (s.q) {
        const q = s.q, box = h('div', {});
        box.appendChild(h('div', { class: 'lx', style: { fontWeight: 800 }, html: '❓ ' + VQ.rich(q.q) }));
        const opts = h('div', { class: 'opts' }), fb = h('div', { class: 'fb' });
        q.o.forEach((txt, k) => {
          const b = h('button', { class: 'opt', html: VQ.rich(txt) });
          b.onclick = () => {
            if (stepDone[i]) return;
            if (k === q.a) {
              b.classList.add('ok'); VQ.sfx.play('ok'); fb.className = 'fb ok'; fb.innerHTML = '✔ נכון! ' + VQ.rich(q.why || '');
              stepDone[i] = true; L.canNext = true;
              if (!answered) VQ.store.addBonus(30);
              nextBtn.disabled = false; nextBtn.className = 'btn green';
            } else { answered = true; b.classList.add('bad'); VQ.sfx.play('bad'); fb.className = 'fb bad'; fb.textContent = 'כמעט… נסו שוב 🙂'; }
          };
          opts.appendChild(b);
        });
        box.appendChild(opts); box.appendChild(fb);
        if (stepDone[i]) { fb.className = 'fb ok'; fb.innerHTML = '✔ ' + VQ.rich(q.why || ''); opts.children[q.a].classList.add('ok'); }
        p.appendChild(box);
      }
      const last = i === steps.length - 1;
      const nextBtn = h('button', { class: 'btn ' + (L.canNext ? 'green' : ''), disabled: !L.canNext, onClick: () => { VQ.sfx.play('click'); last ? finish() : go(i + 1); } }, last ? '🏁 סיום השיעור' : 'הבא ◀');
      p.appendChild(h('div', { class: 'row' },
        h('button', { class: 'btn ghost sm', disabled: i === 0, onClick: () => { VQ.sfx.play('click'); go(i - 1); } }, '▶ הקודם'),
        h('button', { class: 'btn ghost sm', onClick: () => { VQ.sfx.play('click'); go(i); } }, '↻ שוב'),
        h('span', { class: 'grow' }), nextBtn));
      root.appendChild(p);
      requestAnimationFrame(() => stage.setInset(p.offsetHeight + 8, 40, stage.insetLeft));
    }

    function finish() {
      cleanups.forEach((f) => f()); L.runTemps(); L.tok++;
      const first = VQ.store.finishLesson(id);
      VQ.sfx.play('fanfare'); VQ.fx.confetti(stage, VQ.M.V3(stage.camLook.x, 3, stage.camLook.z), 70);
      root.innerHTML = ''; stage.setInset(0, 0);
      const c = VQ.chapter(id);
      ui.modal(h('div', { style: { textAlign: 'center' } },
        h('div', { style: { fontSize: '64px' } }, '🎓'), h('h2', {}, 'השיעור הושלם!'),
        h('p', {}, `סיימתם את "${c.title}". ${first ? 'קיבלתם +200 נקודות!' : ''}`),
        h('p', { class: 'sub' }, 'עכשיו הזמן לבחון את מה שלמדתם במשחק — התחילו ברמת "מתחילים", גם אם אתם לא גיימרים 😉'),
        h('div', { class: 'row', style: { justifyContent: 'center', marginTop: '10px' } },
          h('button', { class: 'btn green', onClick: () => VQ.goHub(c.id) }, '🎮 למשחק של התחנה'),
          h('button', { class: 'btn ghost', onClick: () => go(0) }, '↻ שוב את השיעור'))));
    }

    go(0);
    return L;
  };
})(window.VQ);
