const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = [];
  p.on('console', (m) => { if (m.type()==='error' && !/CERT|ERR_/.test(m.text())) errs.push(m.text()); if (m.text().startsWith('LOG')) console.log(m.text()); });
  p.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message + ' ' + (e.stack||'').split('\n').slice(0,3).join('|')));
  await p.goto('http://localhost:8123/index.html?debug=1&unlock=1');
  await p.waitForTimeout(1200);
  const start = async (c, lv) => { await p.evaluate(([c, lv]) => { VQ.store.data.name = 'x'; window.G = VQ.startGame(c, lv); }, [c, lv]); await p.waitForTimeout(300); await p.evaluate(() => document.querySelectorAll('.modal .btn')[0].click()); await p.waitForTimeout(3300); };
  // ---- painter easy: solve all rounds
  await start('what', 'easy');
  for (let r = 0; r < 3; r++) {
    const res = await p.evaluate(async () => { const d = G.dbg; d.hosts.forEach((h) => { d.setPalette(h.want); d.paint(h); }); const before = d.roundIdx; await d.check(); await new Promise(r => setTimeout(r, 2800)); return [before, d.roundIdx, G.ended]; });
    console.log('painter round', r, JSON.stringify(res));
  }
  await p.waitForTimeout(1500);
  console.log('painter ended', await p.evaluate(() => [G.ended, G.score]));
  // ---- painter hard round 1 (needs trunk)
  await start('what', 'hard');
  console.log('painter hard w/o trunk', await p.evaluate(async () => { const d = G.dbg; d.hosts.forEach((h) => { d.setPalette(h.want); d.paint(h); }); await d.check(); await new Promise(r => setTimeout(r, 1800)); return [d.roundIdx, G.score]; }));
  console.log('painter hard with trunk', await p.evaluate(async () => { const d = G.dbg; d.toggleTrunk(); await d.check(); await new Promise(r => setTimeout(r, 3000)); return [d.roundIdx, G.score]; }));
  // ---- cables: do requests
  await start('before', 'easy');
  const cab = await p.evaluate(async () => {
    const d = G.dbg; let done = 0;
    for (let i = 0; i < 40 && done < 2; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const rq = d.reqs[0]; if (!rq) continue;
      d.selectPc(rq.pc); const rk = d.racks.find((r) => r.v === rq.target); await d.clickRack(rk); done++;
    }
    return [done, G.score];
  });
  console.log('cables', JSON.stringify(cab));
  // ---- devices sorter: sort using hidden info: click bin 1 always, ensure no crash
  await start('devices', 'easy');
  await p.evaluate(async () => { for (let i = 0; i < 12; i++) { await new Promise(r => setTimeout(r, 900)); window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Digit' + (1 + (i % 3)) })); } });
  console.log('sorter', await p.evaluate(() => [G.score, G.misses, G.hits]));
  // ---- tags: press keys
  await start('trunk', 'easy');
  await p.evaluate(async () => { for (let i = 0; i < 12; i++) { await new Promise(r => setTimeout(r, 1200)); window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Digit' + (1 + (i % 3)) })); } });
  console.log('tags', await p.evaluate(() => [G.score, G.misses, G.hits]));
  // ---- runner: move lanes
  await start('proscons', 'easy');
  await p.evaluate(async () => { for (let i = 0; i < 8; i++) { await new Promise(r => setTimeout(r, 1500)); window.dispatchEvent(new KeyboardEvent('keydown', { code: i % 2 ? 'ArrowLeft' : 'ArrowRight' })); } });
  console.log('runner', await p.evaluate(() => [G.score, G.misses, G.hits]));
  console.log(errs.length ? errs.join('\n') : 'NO ERRORS');
  await b.close();
})();
