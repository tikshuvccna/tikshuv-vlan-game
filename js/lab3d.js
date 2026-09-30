/* VLAN Quest – Lab3D: a 3D view that mirrors a sim.Topo (ports/cables/hosts change colour as the CLI changes state) */
(function (VQ) {
  const M = VQ.M, V3 = M.V3, sim = VQ.sim;
  const DARK = 0x334155;

  // Small helper for building topologies quickly
  VQ.T = {
    make() { return new sim.Topo(); },
    h2s(t, host, dev, ifn) { t.link({ host }, { dev, ifn: sim.fullIf(ifn) }); },
    s2s(t, d1, i1, d2, i2) { t.link({ dev: d1, ifn: sim.fullIf(i1) }, { dev: d2, ifn: sim.fullIf(i2) }); },
    silent(session, cmds) { cmds.forEach((c) => session.exec(c)); },
    cfg(dev, cmds) { const s = new sim.Session(dev); s.exec('enable'); s.exec('configure terminal'); cmds.forEach((c) => s.exec(c)); s.exec('end'); return s; },
  };

  class Lab3D {
    // layout: {devices:{id:{type,pos,ports,pitch,label,map:{'Fa0/1':0}}}, hosts:{id:{pos,label,type}}}
    constructor(stage, topo, layout, net) {
      this.stage = stage; this.topo = topo; this.layout = layout;
      this.net = net || new VQ.Net3D(stage); this.net.setVlanMode(true);
      this.maps = {}; this.chips = {}; this.links = [];
      for (const id in layout.devices) {
        const d = layout.devices[id], map = {}; Object.keys(d.map || {}).forEach((k) => { map[sim.fullIf(k)] = d.map[k]; }); this.maps[id] = map;
        const n = this.net.addNode(id, d.type || 'switch', d.pos, { ports: d.ports, pitch: d.pitch, label: d.label || topo.devs[id].hostname, scale: d.scale });
        const chip = M.label('', { size: 0.3, bg: 'rgba(8,13,28,.9)', color: '#e2e8f0', border: '#334155' }); chip.position.set(d.pos[0], (d.chipY != null ? d.chipY : 2.3), d.pos[2] + (d.chipZ || 0)); chip.visible = false; this.net.group.add(chip); this.chips[id] = chip;
        if (d.type === 'router' || d.type === 'l3') n.obj.userData.r = n.obj.userData.r;
      }
      for (const id in layout.hosts) {
        const h = layout.hosts[id]; const hh = topo.hosts[id];
        const n = this.net.addNode(id, h.type || 'pc', h.pos, { label: h.label || hh.name, scale: h.scale || 0.9, screen: DARK });
        n.host = true; if (hh.ip) n.setBadge(hh.ip, '#94a3b8');
      }
      topo.links.forEach(([a, b]) => {
        const aId = a.host || a.dev, bId = b.host || b.dev;
        const o = {};
        if (a.dev && this.maps[a.dev] && this.maps[a.dev][a.ifn] != null) o.aPort = this.maps[a.dev][a.ifn];
        if (b.dev && this.maps[b.dev] && this.maps[b.dev][b.ifn] != null) o.bPort = this.maps[b.dev][b.ifn];
        // hosts first so the host end is 'a'
        const l = a.host ? this.net.link(aId, bId, { bPort: o.bPort, sag: 0.12 }) : b.host ? this.net.link(bId, aId, { bPort: o.aPort, sag: 0.12 }) : this.net.link(aId, bId, { aPort: o.aPort, bPort: o.bPort, sag: 0.08 });
        this.links.push({ l, a, b });
      });
      this.sync();
    }
    setTopo(t) { this.topo = t; this.sync(); }
    ledFor(dev, ifn) {
      const i = dev.ifaces[ifn], t = this.topo;
      if (i.shut) return { hex: 0xef4444, on: false, mode: 'down' };
      if (!t.peerOf(dev.id, ifn)) return { hex: DARK, on: false, mode: 'down' };
      if (dev.isRouter) return { hex: 0x60a5fa, on: true, mode: 'router' };
      const om = t.opMode(dev, ifn);
      if (om === 'trunk') return { hex: 0xfde047, on: true, mode: 'trunk', allowed: i.allowed ? [...i.allowed] : null, native: i.native };
      if (!dev.vlans.has(i.accessVlan)) return { hex: 0x475569, on: false, mode: 'inactive' };
      return { hex: VQ.vhex(i.accessVlan), on: true, mode: 'access', vlan: i.accessVlan };
    }
    sync() {
      const t = this.topo, net = this.net;
      // device labels & ports
      for (const id in this.layout.devices) {
        const dev = t.devs[id], node = net.nodes[id], map = this.maps[id];
        if (node.label && node.label._t !== dev.hostname) { node.label.userData.set(dev.hostname); node.label._t = dev.hostname; }
        if (node.obj.setPort) node.obj.ports.forEach((_, k) => node.obj.setPort(k, DARK, false));
        for (const ifn in map) { const st = this.ledFor(dev, ifn); if (node.obj.setPort) node.obj.setPort(map[ifn], st.hex, st.on); }
        // vlan chip
        if (!dev.isRouter) {
          const ids = [...dev.vlans.keys()].filter((v) => v !== 1).sort((x, y) => x - y);
          const chip = this.chips[id];
          if (ids.length) { const txt = ids.map((v) => `VLAN ${v} ${dev.vlans.get(v).name}`).join('\n'); if (chip._t !== txt) { chip.userData.set(txt); chip._t = txt; } chip.visible = true; } else chip.visible = false;
        }
      }
      // links
      this.links.forEach(({ l, a, b }) => {
        const dev = t.devs[a.dev || b.dev], ifn = a.dev ? a.ifn : b.ifn; let st;
        if (a.host || b.host) st = this.ledFor(t.devs[(a.host ? b : a).dev], (a.host ? b : a).ifn);
        else {
          const sa = this.ledFor(t.devs[a.dev], a.ifn), sb = this.ledFor(t.devs[b.dev], b.ifn);
          st = (sa.mode === 'down' || sb.mode === 'down') ? sa.mode === 'down' ? sa : sb : (sa.mode === 'trunk' || sb.mode === 'trunk' || sa.mode === 'router' || sb.mode === 'router') ? (sa.mode === 'trunk' ? sa : sb.mode === 'trunk' ? sb : { hex: 0xfde047, mode: 'trunk', on: true }) : sa;
          if (st.mode === 'router') st = { hex: 0xfde047, mode: 'trunk', on: true };
          if (sa.mode === 'trunk' && sb.mode === 'trunk') st = { hex: 0xfde047, mode: 'trunk', on: true, allowed: sa.allowed, native: sa.native };
          else if ((sa.mode === 'trunk') !== (sb.mode === 'trunk') && !(sa.mode === 'router' || sb.mode === 'router')) st = { hex: 0xf59e0b, mode: 'plain', on: true };
        }
        if (st.mode === 'trunk') net.setLinkMode(l, 'trunk', 0, st.allowed); else if (st.mode === 'access') net.setLinkMode(l, 'access', st.vlan, undefined); else net.setLinkMode(l, 'plain', 0);
        if (st.mode === 'trunk' && st.native) l.native = st.native;
        l.cable.userData.setColor(st.on ? st.hex : (st.mode === 'down' ? 0x3b4a63 : st.hex), st.on);
        [l.aLed, l.bLed].forEach((led) => { if (led) { led.material.color.setHex(st.hex); led.material.emissive.setHex(st.hex); } });
        // host look
        const hostEnd = a.host ? a : b.host ? b : null;
        if (hostEnd) {
          const hn = net.nodes[hostEnd.host], hh = t.hosts[hostEnd.host];
          const D = t.hostDomain(hostEnd.host);
          hn.vlan = D ? D.startVlan : 0;
          hn.setScreen(D ? VQ.vhex(D.startVlan) : 0x1f2937);
          hn.setBadge(hh.ip ? hh.ip : null, D ? VQ.vcss(D.startVlan) : '#64748b');
        }
      });
    }
    // animate a ping using the simulator's verdict. resolves to ok
    async ping(hostId, ip, o = {}) {
      const t = this.topo, net = this.net, r = t.hostPing(hostId, ip);
      const dst = t.hostByIp(ip);
      this.sync();
      if (r.ok && dst) {
        const path = net.findPath(hostId, dst.id);
        if (path) { await net.sendPath(path, { color: o.color || 0x67e8f9, speed: o.speed || 5 }); if (!o.noReply) await net.sendPath(path.slice().reverse().map((c, i, arr) => ({ node: c.node, vlan: c.vlan, link: i === 0 ? null : arr[i - 1].link })), { color: 0x86efac, speed: o.speed || 5 }); }
        net.nodes[dst.id].mark(true, '✔'); VQ.sfx.play('ok');
      } else if (r.ok) { VQ.sfx.play('ok'); net.nodes[hostId].mark(true, '✔'); }
      else {
        const src = net.nodes[hostId], L0 = src.links[0];
        if (L0) { await net.hop(src, L0, { color: 0xf87171, speed: 5 }); const sw = net.other(L0, src); sw.pulse(0xf87171); }
        net.nodes[hostId].mark(false, '✖'); VQ.sfx.play('bad');
      }
      return r.ok;
    }
  }
  VQ.Lab3D = Lab3D;
})(window.VQ);
