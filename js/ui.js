/* VLAN Quest – shared UI helpers (modals, toasts, HUD layers) */
(function (VQ) {
  const h = VQ.h, ui = VQ.ui = {};
  ui.layer = (id) => document.getElementById(id);
  ui.starsHtml = (n, max = 3) => '<span class="stars">' + '★'.repeat(n) + '<span class="off">' + '★'.repeat(max - n) + '</span></span>';

  ui.modal = function (content, o = {}) {
    const scr = ui.layer('screen');
    scr.innerHTML = ''; scr.className = o.dim === false ? '' : 'dim';
    const box = h('div', { class: 'modal ' + (o.wide ? 'wide ' : '') + (o.cls || ''), style: { position: 'relative' } });
    if (typeof content === 'string') box.innerHTML = content; else box.appendChild(content);
    if (o.closable) box.prepend(h('button', { class: 'iconbtn close', onClick: () => { ui.closeModal(); o.onClose && o.onClose(); } }, '✕'));
    scr.appendChild(box);
    return { el: box, close: ui.closeModal };
  };
  ui.closeModal = function () { const s = ui.layer('screen'); s.innerHTML = ''; s.className = ''; };
  ui.clearHud = function () { ['hud', 'gamehud', 'lesson'].forEach((i) => { ui.layer(i).innerHTML = ''; }); };
  ui.clearAll = function () { ui.clearHud(); ui.closeModal(); };

  const tq = []; let tBusy = false;
  function pump() {
    if (tBusy || !tq.length) return; tBusy = true;
    const [html, icon] = tq.shift();
    const t = h('div', { class: 'toast' }, h('span', { class: 'i' }, icon || '✨'), h('div', { html }));
    const L = ui.layer('toasts'); while (L.children.length > 2) L.firstChild.remove();
    L.appendChild(t); setTimeout(() => t.remove(), 3700); setTimeout(() => { tBusy = false; pump(); }, tq.length > 2 ? 900 : 1500);
  }
  ui.toast = function (html, icon) { tq.push([html, icon]); if (tq.length > 6) tq.shift(); pump(); };
  ui.achToast = function (a) { VQ.sfx.play('level'); ui.toast('<div style="font-size:12px;color:#a5b4fc">הישג חדש!</div>' + VQ.esc(a.name) + '<div style="font-size:12px;color:#c7d2fe;font-weight:400">' + VQ.esc(a.desc) + '</div>', a.icon); };

  ui.confirm = function (msg, yes, no) {
    const m = ui.modal(h('div', { style: { textAlign: 'center' } }, h('p', { style: { fontSize: '18px' } }, msg),
      h('div', { class: 'row', style: { justifyContent: 'center', marginTop: '14px' } },
        h('button', { class: 'btn green', onClick: () => { yes && yes(); } }, 'כן'),
        h('button', { class: 'btn ghost', onClick: () => { ui.closeModal(); no && no(); } }, 'ביטול'))));
    return m;
  };

  // count-up animation for numbers
  ui.countUp = function (el, to, dur = 900) {
    const t0 = performance.now();
    (function f(t) { const p = Math.min(1, (t - t0) / dur); el.textContent = VQ.fmt(to * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(f); })(t0);
  };

  ui.shareText = function (title, score) {
    return `🎮 מסע ה-VLAN: קיבלתי ${VQ.fmt(score)} נקודות ב"${title}"! תצליחו לנצח אותי?\nהקוד שלי: ${VQ.store.makeCode()}`;
  };
  ui.copy = async function (text) {
    try { await navigator.clipboard.writeText(text); ui.toast('הועתק ללוח ✔', '📋'); return true; }
    catch (e) {
      const ta = h('textarea', { style: { position: 'fixed', opacity: 0 } }); ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); ui.toast('הועתק ללוח ✔', '📋'); } catch (e2) { /* ignore */ } ta.remove(); return true;
    }
  };
})(window.VQ);
