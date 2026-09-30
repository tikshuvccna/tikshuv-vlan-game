const { chromium } = require('playwright');
const SOL = {
 easy: { sw1: ['enable','configure terminal','vlan 10','name SALES','vlan 20','name FINANCE','interface range fastEthernet 0/1 - 2','switchport mode access','switchport access vlan 10','interface range fastEthernet 0/3 - 4','switchport mode access','switchport access vlan 20','end','show vlan brief','copy running-config startup-config'] },
 mid: { sw1: ['en','conf t','hostname SW1','vlan 10','name SALES','vlan 20','name FINANCE','vlan 30','name GUEST','int range fa0/1 - 2','sw mo ac','sw ac vl 10','int range fa0/3 - 4','sw mo ac','sw ac vl 20','int fa0/5','sw mo ac','sw ac vl 30','int gi0/1','sw mo tr','sw tr allowed vlan 10,20,30','end','copy run start'],
   r1: ['en','conf t','int g0/0','no shut','int g0/0.10','encapsulation dot1Q 10','ip add 192.168.10.1 255.255.255.0','int g0/0.20','encapsulation dot1Q 20','ip add 192.168.20.1 255.255.255.0','int g0/0.30','encapsulation dot1Q 30','ip add 192.168.30.1 255.255.255.0','end','wr'] },
 hard: { sw1: ['en','conf t','hostname SW1','vlan 10','name SALES','vlan 20','name FINANCE','vlan 30','name GUEST','vlan 99','name MGMT','int range fa0/1 - 2','sw mo ac','sw ac vl 10','int fa0/3','sw mo ac','sw ac vl 20','int fa0/4','sw mo ac','sw voice vlan 50','int gi0/1','sw mo tr','sw tr native vlan 999','sw tr allowed vlan 10,20,30,99','int gi0/2','sw mo tr','int vlan 99','ip add 192.168.99.2 255.255.255.0','no shut','exit','ip default-gateway 192.168.99.1','end','copy run start'],
   sw2: ['en','conf t','hostname SW2','vlan 10','name SALES','vlan 20','name FINANCE','vlan 30','name GUEST','vlan 99','name MGMT','int fa0/1','sw mo ac','sw ac vl 10','int fa0/2','sw mo ac','sw ac vl 20','int fa0/3','sw mo ac','sw ac vl 30','int gi0/1','sw mo tr','sw tr native vlan 999','sw tr allowed vlan 10,20,30,99','int vlan 99','ip add 192.168.99.3 255.255.255.0','no shut','exit','ip default-gateway 192.168.99.1','end','copy run start'],
   r1: ['en','conf t','int g0/0','no shut','int g0/0.10','encapsulation dot1Q 10','ip add 192.168.10.1 255.255.255.0','int g0/0.20','encapsulation dot1Q 20','ip add 192.168.20.1 255.255.255.0','int g0/0.30','encapsulation dot1Q 30','ip add 192.168.30.1 255.255.255.0','end','wr'] },
};
(async () => {
  const lv = process.argv[2];
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = [];
  p.on('console', (m) => { if (m.type()==='error' && !/CERT|ERR_/.test(m.text())) errs.push(m.text()); if (m.text().startsWith('LOG')) console.log(m.text()); });
  p.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message + ' ' + (e.stack||'').split('\n').slice(0,3).join('|')));
  await p.goto('http://localhost:8123/index.html?debug=1&unlock=1');
  await p.waitForTimeout(1200);
  await p.evaluate((lv) => { VQ.store.data.name='דני'; VQ.store.save(); window.G = VQ.startGame('config', lv); }, lv);
  await p.waitForTimeout(400);
  await p.evaluate(() => { document.querySelectorAll('.modal .btn')[0].click(); });
  await p.waitForTimeout(3200);
  const res = await p.evaluate(async ([sol]) => {
    const out = [];
    for (const dev of Object.keys(sol)) { G.term.select(dev); for (const c of sol[dev]) { G.term.run(c); await new Promise(r => setTimeout(r, 30)); } }
    await new Promise(r => setTimeout(r, 1500));
    const errs = []; for (const d of Object.keys(G.topo.devs)) { const b = G.term.buf[d].filter(l => l.cls === 'err').map(l => d+': '+l.text); errs.push(...b); }
    return { score: G.score, ended: G.ended, errors: errs.slice(0, 12) };
  }, [SOL[lv]]);
  console.log(JSON.stringify(res));
  await p.waitForTimeout(2500);
  await p.screenshot({ path: 'sol_' + lv + '.png' });
  console.log(errs.length ? errs.join('\n') : 'NO ERRORS');
  await b.close();
})();
