const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = [];
  p.on('console', (m) => { if (m.type()==='error' && !/CERT|ERR_/.test(m.text())) errs.push(m.text()); });
  p.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message + ' ' + (e.stack||'').split('\n').slice(0,3).join('|')));
  await p.goto('http://localhost:8123/index.html?debug=1&unlock=1');
  await p.waitForTimeout(1200);
  const r = await p.evaluate(async () => {
    const out = {};
    VQ.store.data.name = 'x'; VQ.store.save();
    for (const lv of ['easy', 'mid', 'hard']) {
      const G = VQ.startGame('verify', lv); window.G = G;
      document.querySelectorAll('.modal .btn')[0].click(); await new Promise(r => setTimeout(r, 3300));
      out[lv] = [];
      for (let i = 0; i < 3; i++) {
        const c = G.getCase(), t0 = G.getTopo();
        const before = c.goals.map(([h, ip]) => t0.hostPing(h, ip).ok);
        // apply the reference fix through the real terminal sessions
        for (const [d, cmds] of c.fix) { G.term.select(d); G.term.run('configure terminal', false); cmds.forEach((cm) => G.term.run(cm, false)); G.term.run('end', false); }
        await new Promise(r => setTimeout(r, 400));
        const after = c.goals.map(([h, ip]) => G.getTopo().hostPing(h, ip).ok);
        out[lv].push({ t: c.title.slice(0, 12), before, after });
        await new Promise(r => setTimeout(r, i < 2 ? 2800 : 1500));
      }
      out[lv].push({ ended: G.ended, score: G.score });
    }
    return out;
  });
  console.log(JSON.stringify(r, null, 0));
  console.log(errs.length ? errs.join('\n') : 'NO ERRORS');
  await b.close();
})();
