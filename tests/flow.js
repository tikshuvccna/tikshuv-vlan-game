const { chromium } = require('playwright');
(async () => {
  const W = +(process.argv[2] || 1280), H = +(process.argv[3] || 720), tag = process.argv[4] || 'd';
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: W, height: H }, hasTouch: W < 600 });
  const errs = [];
  p.on('console', (m) => { if (m.type()==='error' && !/CERT|ERR_/.test(m.text())) errs.push(m.text()); if (m.text().startsWith('LOG')) console.log(m.text()); });
  p.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message + ' ' + (e.stack||'').split('\n').slice(0,3).join('|')));
  await p.goto('http://localhost:8123/index.html?debug=1');   // no unlock: real progression
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `${tag}_title.png` });
  await p.fill('.title input', 'נועה');
  await p.click('.title .btn.green'); await p.waitForTimeout(400);
  await p.screenshot({ path: `${tag}_story.png` });
  for (let i = 0; i < 3; i++) { await p.click('.modal .btn.green'); await p.waitForTimeout(300); }
  await p.waitForTimeout(1000);
  await p.screenshot({ path: `${tag}_hub.png` });
  // locked station
  await p.evaluate(() => VQ.hubState.onStation(3)); await p.waitForTimeout(500);
  console.log('toast', await p.evaluate(() => document.querySelector('.toast') && document.querySelector('.toast').textContent));
  // open station 1 panel
  await p.evaluate(() => VQ.hubState.onStation(0)); await p.waitForTimeout(3500);
  await p.screenshot({ path: `${tag}_station.png` });
  // start lesson from panel
  await p.click('.station .btn.green'); await p.waitForTimeout(1500);
  await p.screenshot({ path: `${tag}_lesson.png` });
  // finish lesson quickly and go to game via button
  const n = await p.evaluate(() => window.L && 0);
  await p.evaluate(() => { VQ.store.finishLesson('flat'); VQ.goHub('flat'); }); await p.waitForTimeout(800);
  await p.click('.lvcard'); await p.waitForTimeout(600);
  await p.screenshot({ path: `${tag}_intro.png` });
  await p.evaluate(() => { document.querySelectorAll('.modal .btn')[0].click(); }); await p.waitForTimeout(3500);
  await p.screenshot({ path: `${tag}_play.png` });
  // finish game by forcing end
  await p.evaluate(() => { const G = window.G || null; });
  await p.evaluate(() => { const st = VQ.engine.stage(); });
  // simulate results
  await p.evaluate(() => { VQ.store.recordGame('flat','easy',900,3,{combo:12,perfect:true}); VQ.store.checkAchievements(); });
  // unlock everything for exam
  await p.evaluate(() => { VQ.CHAPTERS.forEach((c) => { VQ.store.data.lessons[c.id] = true; VQ.LEVELS.forEach((l) => { VQ.store.data.games[c.id + ':' + l.id] = { best: 1200, stars: 2, plays: 1 }; }); }); VQ.store.save(); VQ.goHub(); }); await p.waitForTimeout(800);
  await p.screenshot({ path: `${tag}_hub2.png` });
  await p.evaluate(() => VQ.hubState.onStation(9)); await p.waitForTimeout(4500);
  await p.screenshot({ path: `${tag}_examintro.png` });
  await p.evaluate(() => VQ.exam.start()); await p.waitForTimeout(500);
  await p.click('.modal .btn.green'); await p.waitForTimeout(500);
  for (let i = 0; i < 15; i++) {
    await p.evaluate((i) => { const q = VQ.exam.debugQs[i]; const idx = q.opts.findIndex((o) => o.ok); const wrong = i === 3; const btns = document.querySelectorAll('.modal .opt'); btns[wrong ? (idx + 1) % 4 : idx].click(); }, i);
    if (i === 5) { await p.waitForTimeout(700); await p.screenshot({ path: `${tag}_exam.png` }); }
    await p.waitForTimeout(150);
    await p.evaluate(() => { const bs = document.querySelectorAll('.modal .btn.green'); bs[bs.length - 1].click(); });
    await p.waitForTimeout(150);
  }
  await p.waitForTimeout(1800);
  await p.screenshot({ path: `${tag}_examres.png` });
  console.log('exam', JSON.stringify(await p.evaluate(() => VQ.store.data.exam)));
  await p.click('.modal .btn.amber'); await p.waitForTimeout(2000);
  await p.screenshot({ path: `${tag}_cert.png` });
  await p.evaluate(() => VQ.goHub()); await p.waitForTimeout(600);
  await p.evaluate(() => VQ.social.leaderboard()); await p.waitForTimeout(400);
  await p.screenshot({ path: `${tag}_lb.png` });
  // add a friend code
  const added = await p.evaluate(() => { const c = VQ.store.makeCode(); const other = JSON.parse(JSON.stringify({})); return !!VQ.store.parseCode(c); });
  console.log('code roundtrip', added);
  await p.evaluate(() => { const d = VQ.store.data; const save = d.name; d.name = 'חבר'; const code = VQ.store.makeCode(); d.name = save; VQ.store.addFriend(code); VQ.social.leaderboard('fr'); }); await p.waitForTimeout(400);
  await p.screenshot({ path: `${tag}_friends.png` });
  await p.evaluate(() => VQ.social.achievements()); await p.waitForTimeout(400);
  await p.screenshot({ path: `${tag}_ach.png` });
  console.log(errs.length ? errs.join('\n') : 'NO ERRORS');
  await b.close();
})();
