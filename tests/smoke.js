const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = [];
  p.on('console', (m) => { if (m.type()==='error' && !/CERT|ERR_/.test(m.text())) errs.push(m.text()); if (m.text().startsWith('LOG')) console.log(m.text()); });
  p.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message + ' ' + (e.stack||'').split('\n').slice(0,3).join('|')));
  await p.goto('http://localhost:8123/index.html?debug=1&unlock=1');
  await p.waitForTimeout(1500);
  // title -> hub
  await p.fill('.title input', 'בדיקה');
  await p.click('.title .btn.green');
  await p.waitForTimeout(500);
  for (let i = 0; i < 3; i++) { await p.click('.modal .btn.green'); await p.waitForTimeout(300); }
  await p.waitForTimeout(800);
  console.log('hub ok', await p.evaluate(() => !!VQ.hubState));
  // lessons
  for (const c of ['flat','before','what','trunk','devices','intervlan','proscons','config','verify']) {
    await p.evaluate((c) => { window.L = VQ.runLesson(c); }, c);
    const n = await p.evaluate(() => window.L.def.steps.length);
    for (let i = 0; i < n; i++) {
      await p.waitForTimeout(350);
      await p.evaluate(() => { const L = window.L; const s = L.def.steps[L.idx]; if (s.q) { const o = document.querySelectorAll('.opt'); o[s.q.a] && o[s.q.a].click(); } L.canNext = true; const bs = [...document.querySelectorAll('.lpanel .btn')]; const nb = bs[bs.length - 1]; nb.disabled = false; nb.click(); });
    }
    await p.waitForTimeout(300);
    const done = await p.evaluate((c) => VQ.store.lessonDone(c), c);
    console.log('lesson', c, done);
    await p.evaluate(() => VQ.goHub()); await p.waitForTimeout(200);
  }
  // games
  for (const c of ['flat','before','what','trunk','devices','intervlan','proscons','config','verify']) {
    for (const lv of ['easy','mid','hard']) {
      await p.evaluate(([c, lv]) => { window.G = VQ.startGame(c, lv); }, [c, lv]);
      await p.waitForTimeout(250);
      await p.evaluate(() => { const b = document.querySelectorAll('.modal .btn')[0]; b && b.click(); });
      await p.waitForTimeout(3300);
      await p.evaluate(() => { const K = new KeyboardEvent('keydown', { code: 'ArrowRight' }); window.dispatchEvent(K); window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowRight' })); });
      await p.waitForTimeout(900);
      const s = await p.evaluate(() => ({ r: G.running, sc: G.score, e: G.ended }));
      // pause + resume via Escape
      await p.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape' }))); await p.waitForTimeout(150);
      await p.evaluate(() => { const b = document.querySelector('.modal .btn.green'); b && b.click(); });
      console.log('game', c, lv, JSON.stringify(s));
    }
  }
  await p.evaluate(() => VQ.goHub());
  console.log(errs.length ? errs.join('\n') : 'NO ERRORS');
  await b.close();
})();
