/* VLAN Quest – bootstrap */
(function (VQ) {
  function boot() {
    VQ.sfx.init(); VQ.store.load();
    const ok = VQ.engine.init(document.getElementById('c3d'));
    document.getElementById('boot').style.opacity = 0;
    setTimeout(() => document.getElementById('boot').remove(), 600);
    if (!ok) { document.getElementById('nogl').hidden = false; return; }
    // friend link:  index.html#f=VQ1.xxxx
    const m = location.hash.match(/f=(VQ1\.[A-Za-z0-9_.-]+)/);
    VQ.showTitle();
    if (m) setTimeout(() => { const p = VQ.store.addFriend(m[1]); if (p) VQ.ui.toast('נוסף חבר ללוח המובילים: ' + VQ.esc(p.n), '🤝'); }, 800);
    window.addEventListener('error', (e) => { if (VQ.QS.debug) console.log('ERR', e.message); });
  }
  if (document.fonts && document.fonts.ready) Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1200))]).then(boot); else boot();
})(window.VQ);
