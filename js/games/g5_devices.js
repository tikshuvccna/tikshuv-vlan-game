/* Game 5 – Device Sorter (chapter: devices). Sort network devices by how they relate to VLANs. */
(function (VQ) {
  const M = VQ.M, V3 = M.V3, h = VQ.h;
  const CATS = [
    { id: 'A', name: 'מבין VLAN', sub: 'מגדיר / מתייג / מנתב', color: 0x4ade80, css: '#4ade80', key: 'ArrowLeft' },
    { id: 'U', name: 'חבר ב-VLAN, לא מודע', sub: 'הפורט מחליט', color: 0xfbbf24, css: '#fbbf24', key: 'ArrowDown' },
    { id: 'N', name: 'לא תומך VLAN', sub: 'אי אפשר להגדיר', color: 0xf87171, css: '#f87171', key: 'ArrowRight' },
  ];
  const DEV = [
    { n: 'מתג L2 מנוהל', en: 'Managed Switch', t: 'switch', c: 'A', lv: 1, why: 'מתג מנוהל יוצר VLAN-ים ומפעיל Trunk.' },
    { n: 'נתב', en: 'Router', t: 'router', c: 'A', lv: 1, why: 'נתב מבין תגים דרך Sub-interfaces (Router-on-a-Stick).' },
    { n: 'מתג L3', en: 'Layer 3 Switch', t: 'l3', c: 'A', lv: 1, why: 'מתג L3 מנתב בין VLAN-ים עם SVI.' },
    { n: 'מחשב אישי', en: 'PC', t: 'pc', c: 'U', lv: 1, why: 'מחשב שולח פריימים בלי תג – הפורט קובע את ה-VLAN.' },
    { n: 'מדפסת', en: 'Printer', t: 'printer', c: 'U', lv: 1, why: 'מדפסת לא יודעת על VLAN – הפורט במתג מחליט.' },
    { n: 'Hub', en: 'Hub', t: 'hub', c: 'N', lv: 1, why: 'Hub הוא שכבה 1 – מעתיק אותות, אין לו VLAN.' },
    { n: 'מחשב נייד', en: 'Laptop', t: 'laptop', c: 'U', lv: 1, why: 'ציוד קצה רגיל – לא מודע ל-VLAN.' },
    { n: 'נקודת גישה AP', en: 'Wireless AP', t: 'ap', c: 'A', lv: 2, why: 'ה-AP ממפה SSID ל-VLAN ומתחבר ב-Trunk.' },
    { n: 'מצלמת IP', en: 'IP Camera', t: 'cam', c: 'U', lv: 2, why: 'מצלמה היא ציוד קצה – לא מתייגת.' },
    { n: 'חומת אש', en: 'Firewall', t: 'firewall', c: 'A', lv: 2, why: 'חומת אש עובדת עם תתי־ממשקים לפי VLAN.' },
    { n: 'Repeater', en: 'Repeater', t: 'repeater', c: 'N', lv: 2, why: 'Repeater מגביר אות בלבד – אין לו מושג של VLAN.' },
    { n: 'טלפון IP', en: 'IP Phone', t: 'phone', c: 'A', lv: 2, why: 'טלפון IP מתייג את הקול ב-Voice VLAN.' },
    { n: 'שרת קבצים', en: 'File Server', t: 'server', c: 'U', lv: 2, why: 'שרת רגיל שולח בלי תג (הפורט מחליט).' },
    { n: 'מתג לא מנוהל', en: 'Unmanaged Switch', t: 'unmanaged', c: 'N', lv: 2, why: 'מתג לא מנוהל – אי אפשר להגדיר בו VLAN-ים.' },
    { n: 'טלוויזיה חכמה', en: 'Smart TV', t: 'tv', c: 'U', lv: 2, why: 'ציוד קצה – לא מודע ל-VLAN.' },
    { n: 'שרת ESXi (Trunk)', en: 'ESXi Host', t: 'hypervisor', c: 'A', lv: 3, why: 'שרת וירטואליזציה מקבל Trunk ומתייג ל-VM-ים.' },
  ];
  VQ.game({
    id: 'sorter', chapter: 'devices', title: 'מיון מכשירים',
    tagline: 'סרט נע מביא מכשירי רשת. שלחו כל מכשיר לפח הנכון — מי מבין VLAN, מי סתם חבר, ומי לא יכול בכלל.',
    howto: [
      'המכשיר הקרוב ביותר לפחים הוא זה שעליו מחליטים. **לחצו על הפח** (או ← ↓ →  /  1 2 3).',
      '🟢 **מבין VLAN** — מתגים מנוהלים/L3, נתבים, AP, טלפון IP, חומת אש, שרת וירטואליזציה. 🟡 **חבר, לא מודע** — מחשבים, מדפסות, מצלמות. 🔴 **לא תומך** — Hub, Repeater, מתג לא מנוהל.',
      'על טעות תקבלו הסבר קצר — זו הזדמנות ללמוד. ככל שהסרט מהיר יותר, הבונוס גדול יותר!',
    ],
    stage: { bg: 0x090e1d },
    levels: {
      easy: { items: 12, speed: 2.4, every: 3.4, tier: 1, lives: 0, stars: [300, 620, 900] },
      mid: { items: 20, speed: 3.6, every: 2.3, tier: 2, lives: 4, stars: [900, 1900, 2800] },
      hard: { items: 32, speed: 5.2, every: 1.5, tier: 3, lives: 3, stars: [2400, 5000, 7800] },
    },
    create(G) {
      const st = G.stage, cfg = G.cfg;
      M.stars(st, 300, 80);
      st.setCam([0, 8.5, 12.5], [0, 0.2, -2.5]);
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 80), M.mat(0x0b1226, { r: 1 })); floor.rotation.x = -Math.PI / 2; floor.position.y = -0.3; st.add(floor);
      const belt = M.box(6.4, 0.3, 40, 0x111a30, { m: 0.3 }); belt.position.set(0, -0.05, -14); st.add(belt);
      [-3.3, 3.3].forEach((x) => { const r = M.box(0.2, 0.5, 40, 0x22d3ee, { e: 0x22d3ee, ei: 0.7 }); r.position.set(x, 0.1, -14); st.add(r); });
      const stripes = []; for (let i = 0; i < 26; i++) { const s = M.box(6, 0.02, 0.18, 0x1e3a5f); s.position.set(0, 0.11, -30 + i * 1.6); st.add(s); stripes.push(s); }
      // bins
      const bins = CATS.map((c, i) => {
        const x = (i - 1) * 4.6, g = new THREE.Group(); g.position.set(x, 0, 3.6); g.scale.setScalar(0.85); st.add(g);
        const b = M.box(3.9, 1.1, 2.2, c.color, { e: c.color, ei: 0.25, o: 0.9 }); b.position.y = 0.55; g.add(b);
        const inner = M.box(3.4, 1.0, 1.8, 0x050914); inner.position.y = 0.9; g.add(inner);
        const lb = M.label(c.name + '\n' + c.sub, { size: 0.3, bg: c.css, color: '#04101a' }); lb.position.set(0, 1.9, 0.6); g.add(lb);
        const k = M.label(String(i + 1), { size: 0.4, bg: 'rgba(0,0,0,.6)' }); k.position.set(0, 0.6, 1.15); g.add(k);
        const hit = new THREE.Mesh(new THREE.BoxGeometry(4.6, 3, 3), new THREE.MeshBasicMaterial({ visible: false })); hit.position.y = 1; g.add(hit);
        st.pickable(g, () => sort(c.id), { onHover: () => {} });
        return { c, g, x };
      });
      const pool = DEV.filter((d) => d.lv <= cfg.tier);
      let list = [], spawned = 0, spawnT = 1, seq = [];
      const stats = { ok: 0, wrong: 0, missed: 0 }; const mistakes = new Set();
      function nextDev() { if (!seq.length) seq = VQ.shuffle(pool); return seq.pop(); }
      function spawn() {
        const d = nextDev(); spawned++;
        const o = M.device(d.t, { screen: 0x94a3b8 }); const g = new THREE.Group(); g.add(o); g.scale.setScalar(d.t === 'switch' || d.t === 'l3' || d.t === 'unmanaged' ? 1.4 : 2.0);
        g.position.set(0, 0.05, -16); st.add(g);
        const lb = M.label(d.n + '\n' + d.en, { size: 0.36, bg: 'rgba(8,13,28,.9)', color: '#fff' }); lb.position.set(0, 1.6, 0); lb.scale.multiplyScalar(1.6 / g.scale.x); g.add(lb);
        list.push({ d, g, lb, dead: false });
      }
      function sort(cid) {
        if (!G.running) return; const f = list[0]; if (!f || f.g.position.z < -9) return;
        list.shift(); const good = f.d.c === cid; const bin = bins[CATS.findIndex((c) => c.id === cid)];
        
        if (good) {
          stats.ok++; G.hit(60 + Math.round((cfg.speed - 2) * 8), f.g.position.clone().add(V3(0, 2, 0))); VQ.sfx.play('coin');
          st.tween(f.g.position, { x: bin.x, y: 1.6, z: 3.6 }, 0.35, { ease: 'out' }).then(() => { VQ.fx.burst(st, V3(bin.x, 1.5, 3.6), bin.c.color, 14, 3); st.remove(f.g); });
        } else {
          stats.wrong++; mistakes.add(f.d.n); G.miss(cfg.lives ? 0 : 12, f.g.position.clone().add(V3(0, 2, 0)));
          const cat = CATS.find((c) => c.id === f.d.c);
          VQ.fx.float(st, f.g.position.clone().add(V3(0, 3.6, 1)), `${f.d.n}: ${cat.name}`, '#fca5a5', 0.45);
          G.setTask(`❌ <b>${VQ.esc(f.d.n)}</b> — ${VQ.esc(f.d.why)}`);
          VQ.fx.burst(st, f.g.position.clone(), 0xf87171, 18, 4); st.remove(f.g); if (cfg.lives) G.loseLife();
        }
        endCheck();
      }
      function endCheck() { if (spawned >= cfg.items && !list.length && !G.ended) { const perfect = stats.wrong === 0 && stats.missed === 0; G.end({ completed: true, perfect, bonus: perfect ? 250 : 0, title: perfect ? 'מיון מושלם! 🏭' : 'המשמרת הסתיימה', stats: [['מוינו נכון', stats.ok], ['טעויות', stats.wrong], ['התפספסו', stats.missed]], note: mistakes.size ? 'כדאי לחזור על: ' + [...mistakes].join(', ') : 'שליטה מלאה במכשירים!' }); } }
      G.ctl = {
        onKey(e) { const i = { ArrowLeft: 0, ArrowDown: 1, ArrowRight: 2, Digit1: 0, Digit2: 1, Digit3: 2, Numpad1: 0, Numpad2: 1, Numpad3: 2, KeyA: 0, KeyS: 1, KeyD: 2 }[e.code]; if (i != null) { e.preventDefault(); sort(CATS[i].id); } },
        start() { G.setMid('מכשירים', `0/${cfg.items}`); G.setTask('שלחו את המכשיר הקרוב לפח הנכון'); },
        idle(dt) { stripes.forEach((s) => { s.position.z += dt * 2; if (s.position.z > 4) s.position.z -= 41.6; }); },
        update(dt) {
          const sp = cfg.speed * (1 + (spawned / cfg.items) * 0.35);
          stripes.forEach((s) => { s.position.z += dt * sp; if (s.position.z > 4) s.position.z -= 41.6; });
          spawnT -= dt; if (spawned < cfg.items && spawnT <= 0) { spawn(); spawnT = cfg.every * (1 - (spawned / cfg.items) * 0.25) * VQ.rand(0.9, 1.1); }
          list.forEach((f, i) => { f.g.position.z += dt * sp; f.g.children[0].rotation.y = Math.sin(G.time * 1.5 + i) * 0.2; });
          const f0 = list[0];
          
          if (f0 && f0.g.position.z > 2.2) { list.shift(); stats.missed++; G.miss(cfg.lives ? 0 : 12, f0.g.position.clone().add(V3(0, 2, 0))); G.msg('⏰ פספסתם: ' + f0.d.n, '#fbbf24'); st.remove(f0.g); if (cfg.lives) G.loseLife(); endCheck(); }
          G.setMid('מכשירים', `${Math.min(spawned, cfg.items)}/${cfg.items}`);
        },
      };
      return G.ctl;
    },
  });
})(window.VQ);
