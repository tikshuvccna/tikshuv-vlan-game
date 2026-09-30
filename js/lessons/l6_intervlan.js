/* Lesson 6 – inter-VLAN routing */
(function (VQ) {
  const M = VQ.M, V3 = M.V3;
  const H = [['s1', 'דנה', 10, '192.168.10.11'], ['s2', 'רון', 10, '192.168.10.12'], ['f1', 'יוסי', 20, '192.168.20.11'], ['g1', 'אורח', 30, '192.168.30.11']];
  function wire(L, kind) {
    const net = L.net; net.links.slice().forEach((l) => net.unlink(l));
    const core = kind === 'l3' ? net.nodes.l3 : net.nodes.sw;
    net.nodes.sw.setVisible(kind !== 'l3'); net.nodes.l3.setVisible(kind === 'l3');
    net.nodes.r.setVisible(kind !== 'l3' && kind !== 'none');
    if (L.rlabel) L.rlabel.visible = false; if (L.svi) L.svi.visible = false;
    H.forEach(([id, , v], i) => { const l = net.link(id, core.id, { bPort: i }); net.setLinkMode(l, 'access', v); net.nodes[id].vlan = v; core.obj.setPort(i, VQ.vhex(v)); net.nodes[id].setGlow(null); });
    if (kind === 'multi') { [[10, 4], [20, 5]].forEach(([v, p]) => { const l = net.link('sw', 'r', { aPort: p, sag: 0.3 }); net.setLinkMode(l, 'access', v); core.obj.setPort(p, VQ.vhex(v)); }); }
    if (kind === 'stick') { const l = net.link('sw', 'r', { aPort: 5, sag: 0.2 }); net.setLinkMode(l, 'trunk', 0, [10, 20, 30]); core.obj.setPort(5, 0xfde047); core.obj.setPort(4, 0x334155, false); L.trunkL = l; }
    net.setVlanMode(true);
    net.nodes.sw.obj.ports.forEach((_, i) => { if (kind !== 'multi' && i === 4) net.nodes.sw.obj.setPort(4, 0x334155, false); if (kind === 'none' && i === 5) net.nodes.sw.obj.setPort(5, 0x334155, false); });
  }
  function ips(L, on) { H.forEach(([id, , v, ip]) => L.net.nodes[id].setBadge(on ? ip : null, VQ.vcss(v))); }
  async function tryPing(L, a, b, o = {}) {
    const ok = await L.net.ping(a, b, Object.assign({ colorByVlan: false, color: 0x67e8f9, speed: 5 }, o));
    if (ok) { L.net.nodes[b].mark(true, 'ping ✔'); VQ.sfx.play('ok'); } else { L.net.nodes[a].mark(false, 'ping ✖'); VQ.sfx.play('bad'); }
    return ok;
  }
  VQ.lesson('intervlan', {
    build(L) {
      const st = L.stage; M.grid(st, 80, 0x16305a); M.stars(st, 300, 80);
      const net = L.net = L.makeNet();
      net.addNode('sw', 'switch', [-3.5, 0, -1.5], { ports: 6, pitch: 1.1, label: 'SW1' });
      net.addNode('l3', 'l3', [-3.5, 0, -1.5], { ports: 6, pitch: 1.1, label: 'מתג L3' });
      net.addNode('r', 'router', [7.5, 0, -4], { label: 'R1', scale: 1.2 });
      const sx = (6 * 1.1 + 0.5 - 0.5) / 5, x0 = -3.5 - (6 * 1.1) / 2;
      H.forEach(([id, name, v], i) => net.addNode(id, id === 'g1' ? 'laptop' : 'pc', [-3.5 - 3.3 + i * 1.32, 0, 3.2], { label: name, vlan: v, screen: VQ.vhex(v), scale: 0.9 }));
      L.rlabel = M.label('g0/0.10 → 192.168.10.1\ng0/0.20 → 192.168.20.1', { size: 0.34, bg: 'rgba(8,13,28,.9)', border: '#38bdf8', color: '#bae6fd' }); L.rlabel.position.set(7.5, 3, -4); L.rlabel.visible = false; st.add(L.rlabel);
      L.svi = M.label('interface vlan 10 → 192.168.10.1\ninterface vlan 20 → 192.168.20.1', { size: 0.34, bg: 'rgba(8,13,28,.9)', border: '#a78bfa', color: '#ddd6fe' }); L.svi.position.set(-3.5, 2.6, -1.5); L.svi.visible = false; st.add(L.svi);
      wire(L, 'none'); st.setCam([0.5, 9, 14.5], [0.5, 0.5, 0]);
    },
    steps: [
      {
        t: 'VLAN-ים לא רואים זה את זה',
        x: 'דנה ורון ב-VLAN 10 מדברים בקלות. אבל כשדנה מנסה לשלוח משהו ליוסי ב-VLAN 20 — **שום דבר לא עובר**. לכל VLAN יש Broadcast Domain ותת־רשת משלו, והמתג לא מעביר תעבורה בין VLAN-ים.',
        prompt: 'לחצו על דנה כדי לשלוח ping לרון (אותו VLAN) ואחר כך ליוסי',
        enter(L) {
          wire(L, 'none'); ips(L, true); L.cam([0.5, 9, 14.5], [0.5, 0.5, 0]);
          let busy = false, n = 0;
          L.stage.pickable(L.net.nodes.s1.obj, async () => {
            if (busy) return; busy = true;
            const target = n % 2 === 0 ? 's2' : 'f1'; n++;
            VQ.fx.float(L.stage, V3(-6.8, 2.7, 3.2), `ping ${target === 's2' ? 'רון' : 'יוסי'}`, '#e2e8f0', 0.5);
            await tryPing(L, 's1', target); busy = false; if (n >= 2) L.unlock();
          });
        },
      },
      {
        t: 'צריך שכבה 3',
        x: 'מחשב ששולח ל-Subnet אחר לא שולח ישירות ליעד. הוא שולח ל-**Default Gateway** — כתובת של **נתב** (או מתג L3) ב-VLAN שלו. הנתב מחליט לאן להעביר. בלי התקן שכבה 3, VLAN-ים נשארים מבודדים לצמיתות.',
        enter(L) {
          wire(L, 'none'); ips(L, true); L.cam([0.5, 9, 14.5], [0.5, 0.5, 0]);
          VQ.bigNote(L, 'IP: 192.168.10.11/24\nGateway: 192.168.10.1', [-6.8, 3.3, -2], { size: 0.4, border: '#38bdf8' });
          VQ.bigNote(L, '❓ מי ה-Gateway?', [3, 3.6, -3], { border: '#fbbf24' });
        },
      },
      {
        t: 'פתרון א׳: כבל לכל VLAN (הדרך הישנה)',
        x: 'הנתב מחובר למתג בכבל נפרד **לכל VLAN**: פורט אחד במתג + ממשק פיזי אחד בנתב לכל VLAN. עובד, אבל מבזבז פורטים וממשקים, ולא מתאים ל-50 VLAN-ים.',
        prompt: 'לחצו על דנה כדי לשלוח ping ליוסי דרך הנתב',
        enter(L) {
          wire(L, 'multi'); ips(L, true); L.cam([0.5, 9, 14.5], [0.5, 0.5, -1]);
          let busy = false;
          L.stage.pickable(L.net.nodes.s1.obj, async () => { if (busy) return; busy = true; await tryPing(L, 's1', 'f1'); busy = false; L.unlock(); });
        },
      },
      {
        t: 'פתרון ב׳: Router-on-a-Stick',
        x: 'כבל **Trunk אחד** בין המתג לנתב. בנתב מגדירים **Sub-interface** לכל VLAN, עם `encapsulation dot1Q`. החבילה עולה לנתב, מנותבת, **מקבלת תג של ה-VLAN החדש** וחוזרת באותו כבל — כמו "מקל" עם קצה אחד. שימו לב לצבע התג.',
        prompt: 'לחצו על דנה כדי לשלוח ping ליוסי',
        enter(L) {
          wire(L, 'stick'); ips(L, true); L.cam([0.5, 9, 14.5], [0.5, 0.5, -1]); L.rlabel.visible = true;
          let busy = false;
          L.stage.pickable(L.net.nodes.s1.obj, async () => { if (busy) return; busy = true; VQ.fx.float(L.stage, V3(-6.8, 2.7, 3.2), 'ping יוסי', '#e2e8f0', 0.5); await tryPing(L, 's1', 'f1', { colorByVlan: false, speed: 4 }); busy = false; L.unlock(); });
        },
      },
      {
        t: 'פתרון ג׳: מתג L3 עם SVI',
        x: 'במשרדים מודרניים משתמשים ב-**מתג שכבה 3**. לכל VLAN יוצרים ממשק וירטואלי **SVI** (`interface vlan 10`) עם כתובת IP — זו כתובת ה-Gateway. הניתוב קורה בתוך המתג, בחומרה, בלי כבל "מקל". פקודה חשובה: `ip routing`.',
        prompt: 'לחצו על דנה כדי לשלוח ping ליוסי',
        enter(L) {
          wire(L, 'l3'); ips(L, true); L.cam([-1, 9, 14], [-1, 0.5, 0]); L.svi.visible = true;
          let busy = false;
          L.stage.pickable(L.net.nodes.s1.obj, async () => { if (busy) return; busy = true; await tryPing(L, 's1', 'f1', { speed: 5 }); busy = false; L.unlock(); });
        },
      },
      {
        t: 'בונוס: שליטה במי מדבר עם מי',
        x: 'כשהתעבורה בין VLAN-ים עוברת דרך נתב/מתג L3, אפשר להחיל **ACL** (רשימת גישה): לתת לאורחים גישה לאינטרנט אבל לחסום אותם מהכספים. זו הסיבה ש-VLAN + ניתוב = אבטחה אמיתית ולא רק הפרדה.',
        prompt: 'לחצו על האורח לנסות לשלוח ping ליוסי, ואז על דנה',
        enter(L) {
          wire(L, 'stick'); ips(L, true); L.cam([0.5, 9, 14.5], [0.5, 0.5, -1]); L.rlabel.visible = true;
          VQ.bigNote(L, 'ACL: deny 30 → 20   |   permit 10 ↔ 20', [7.5, 4.6, -4], { size: 0.42, border: '#f87171' });
          let busy = false, seen = 0;
          L.stage.pickable(L.net.nodes.g1.obj, async () => {
            if (busy) return; busy = true;
            const path = L.net.findPath('g1', 'f1');
            // travel up to the router, then get blocked by the ACL
            const cut = path.slice(0, path.findIndex((c) => c.node.id === 'r') + 1);
            await L.net.sendPath(cut, { color: 0xfb923c, speed: 5 });
            L.net.nodes.r.mark(false, '🚫 ACL: חסום'); VQ.sfx.play('bad'); L.net.nodes.r.pulse(0xf87171);
            busy = false; if (++seen >= 2) L.unlock(); else seen = 1;
          });
          L.stage.pickable(L.net.nodes.s1.obj, async () => { if (busy) return; busy = true; await tryPing(L, 's1', 'f1', { speed: 5 }); busy = false; if (++seen >= 2) L.unlock(); });
        },
      },
      {
        t: 'בדיקת הבנה',
        x: '',
        q: { q: 'מה צריך כדי שמחשב ב-VLAN 10 יוכל לדבר עם מחשב ב-VLAN 20?', o: ['להחליף כבל', 'התקן שכבה 3 (נתב או מתג L3) שינתב בין ה-VLAN-ים', 'להפעיל Trunk בין המחשבים', 'להגדיל את מספר ה-VLAN'], a: 1, why: 'VLAN-ים שונים הם Subnets שונים — הניתוב ביניהם נעשה בשכבה 3 (Router-on-a-Stick או SVI).' },
        enter(L) { wire(L, 'stick'); ips(L, true); L.cam([0.5, 9, 14.5], [0.5, 0.5, -1]); },
      },
    ],
  });
})(window.VQ);
