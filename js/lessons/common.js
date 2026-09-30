/* VLAN Quest – shared scene builders for lessons */
(function (VQ) {
  const M = VQ.M, V3 = M.V3;

  // 9 employees: 3 departments, deliberately mixed along the switch
  VQ.PEOPLE9 = [
    { id: 's1', name: 'דנה', dept: 10 }, { id: 'f1', name: 'יוסי', dept: 20 }, { id: 's2', name: 'רון', dept: 10 },
    { id: 'g1', name: 'אורח 1', dept: 30, type: 'laptop' }, { id: 'f2', name: 'נועה', dept: 20 }, { id: 's3', name: 'מיכל', dept: 10 },
    { id: 'f3', name: 'אבי', dept: 20 }, { id: 'g2', name: 'אורח 2', dept: 30, type: 'laptop' }, { id: 'g3', name: 'אורח 3', dept: 30, type: 'laptop' },
  ];

  // One switch + a row of PCs. Returns handles used by lessons 1, 2, 3
  VQ.office = function (L, o = {}) {
    const stage = L.stage;
    M.grid(stage, 70, 0x16305a); M.stars(stage, 300, 80);
    const net = L.makeNet(), people = o.people || VQ.PEOPLE9, n = people.length, sp = o.spacing || 1.35;
    const swZ = o.swZ != null ? o.swZ : -2.5;
    const sw = net.addNode('sw', 'switch', [0, 0, swZ], { ports: n, pitch: sp, label: o.swLabel || 'Switch', scale: 1 });
    const hosts = {};
    people.forEach((p, i) => {
      const x = (i - (n - 1) / 2) * sp;
      const h = net.addNode(p.id, p.type || 'pc', [x, 0, o.hostZ != null ? o.hostZ : 3.2], { label: p.name, screen: 0x94a3b8, vlan: p.dept, ip: p.ip, scale: o.hostScale || 1 });
      h.person = p; hosts[p.id] = h;
      net.link(p.id, 'sw', { bPort: i, sag: 0.1 });
    });
    return { net, sw, hosts, people };
  };
  VQ.deptColors = function (hosts, on) {
    Object.values(hosts).forEach((h) => h.setScreen(on ? VQ.vhex(h.person.dept) : 0x94a3b8));
  };
  VQ.resetCounters = function (net, badge = true) {
    Object.values(net.nodes).forEach((n) => { n.rx = 0; if (n.isHost) n.setBadge(badge ? '📨 0' : null, '#94a3b8'); });
  };
  VQ.bigNote = function (L, text, pos, o = {}) {
    const l = M.label(text, Object.assign({ size: 0.7, bg: 'rgba(8,13,28,.88)', color: '#fff', border: '#38bdf8', onTop: true }, o));
    l.position.set(...pos); L.addTemp(l); l.scale.multiplyScalar(0.01);
    const sc = l.scale.clone().multiplyScalar(100);
    L.stage.tween(l.scale, { x: sc.x, y: sc.y, z: sc.z }, 0.5, { ease: 'back' });
    return l;
  };
})(window.VQ);
