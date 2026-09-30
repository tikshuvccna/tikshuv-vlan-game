/* VLAN Quest – reusable 3D network topology with animated frames, broadcast flooding and VLAN-aware forwarding */
(function (VQ) {
  const M = VQ.M, V3 = M.V3;
  const SW = ['switch', 'l3', 'unmanaged'];

  class Net3D {
    constructor(stage, o = {}) {
      this.stage = stage; this.group = new THREE.Group(); stage.add(this.group);
      this.nodes = {}; this.links = []; this.vlanMode = false; this.speed = o.speed || 6;
      this.trunkHex = 0xfde047; this.epoch = 0; this.live = new Set();
    }
    abort() { this.epoch++; this.live.forEach((p) => { this.group.remove(p); }); this.live.clear(); }

    addNode(id, type, pos, o = {}) {
      const obj = M.device(type, o);
      obj.position.set(pos[0], pos[1] || 0, pos[2]);
      if (o.rot) obj.rotation.y = o.rot;
      if (o.scale) obj.scale.setScalar(o.scale);
      this.group.add(obj);
      const n = { id, type, obj, pos: obj.position, vlan: o.vlan || 0, ip: o.ip, name: o.name, links: [], rx: 0, isSwitch: SW.includes(type) || type === 'hub', isRouter: type === 'router' || type === 'l3', isHost: !(SW.includes(type) || type === 'hub' || type === 'router' || type === 'l3' || type === 'firewall'), net: this, scale: o.scale || 1 };
      n.h = (obj.userData.h || 1) * n.scale;
      if (o.label) {
        n.label = M.label(o.label, { size: o.lsize || 0.34, bg: o.lbg || 'rgba(15,23,42,.82)', color: o.lcolor || '#e2e8f0', border: o.lborder });
        n.label.position.set(pos[0], (pos[1] || 0) + n.h + 0.45, pos[2]); this.group.add(n.label);
      }
      n.setLabel = (t, over) => { if (!n.label) { n.label = M.label(t, { size: 0.34, bg: 'rgba(15,23,42,.82)', color: '#e2e8f0' }); n.label.position.set(pos[0], (pos[1] || 0) + n.h + 0.45, pos[2]); this.group.add(n.label); } else n.label.userData.set(t, over); };
      n.setBadge = (t, color = '#38bdf8') => {
        if (!t) { if (n.badge) { n.badge.visible = false; } return; }
        if (!n.badge) { n.badge = M.label(t, { size: 0.3, bg: color, color: '#0b1220', onTop: false }); n.badge.position.set(pos[0], (pos[1] || 0) + n.h + 1.2, pos[2]); this.group.add(n.badge); }
        n.badge.visible = true; n.badge.userData.set(t, { bg: color });
      };
      n.setScreen = (hex) => { const s = obj.screen; if (s) { s.material.color.setHex(hex); s.material.emissive.setHex(hex); } };
      n.pulse = (hex = 0xffffff) => { VQ.fx.ring(this.stage, V3(pos[0], 0.05, pos[2]), hex, 1.6, 0.6); const s = n.scale; this.stage.tween(obj.scale, { x: s * 1.12, y: s * 1.12, z: s * 1.12 }, 0.12).then(() => this.stage.tween(obj.scale, { x: s, y: s, z: s }, 0.2)); };
      n.mark = (ok, txt) => VQ.fx.float(this.stage, V3(pos[0], n.h + 0.9, pos[2]), txt || (ok ? '✔' : '✖'), ok ? '#4ade80' : '#f87171', 0.7);
      n.setGlow = (hex) => {
        if (n.glow) { this.group.remove(n.glow); n.glow.material.dispose(); n.glow = null; }
        if (hex == null) return;
        n.glow = M.glow(hex, 3.6, 0.8); n.glow.position.set(pos[0], n.h * 0.5, pos[2]); this.group.add(n.glow);
      };
      n.setVisible = (v) => { obj.visible = v; if (n.label) n.label.visible = v; if (n.badge && !v) n.badge.visible = false; };
      this.nodes[id] = n;
      return n;
    }

    anchor(n, toward, portIdx) {
      if (portIdx != null && n.obj.ports) return n.pos.clone().add(n.obj.ports[portIdx].clone().multiplyScalar(n.scale)).add(V3(0, 0, 0.02));
      const dx = toward.x - n.pos.x, dz = toward.z - n.pos.z, len = Math.hypot(dx, dz) || 1, ux = dx / len, uz = dz / len;
      let t;
      if (SW.includes(n.type) || n.type === 'hub') {
        const hw = (n.obj.userData.w || 1.9) / 2 * n.scale, hd = 0.45 * n.scale;
        t = 1 / Math.sqrt((ux / hw) * (ux / hw) + (uz / hd) * (uz / hd));
      } else t = (n.obj.userData.r || 0.7) * 0.7 * n.scale;
      return V3(n.pos.x + ux * t, n.pos.y + Math.max(0.2, n.h * 0.3), n.pos.z + uz * t);
    }

    link(aId, bId, o = {}) {
      const a = this.nodes[aId], b = this.nodes[bId];
      const aPt = this.anchor(a, b.pos, o.aPort), bPt = this.anchor(b, a.pos, o.bPort);
      const L = { a, b, aPt, bPt, mode: o.mode || 'plain', vlan: o.vlan || 0, allowed: o.allowed || null, native: o.native || 1, aLed: null, bLed: null, net: this };
      L.cable = M.cable(aPt, bPt, { color: 0x94a3b8, sag: o.sag != null ? o.sag : 0.1, r: 0.035 });
      this.group.add(L.cable);
      [[a, aPt, 'aLed'], [b, bPt, 'bLed']].forEach(([n, pt, k]) => {
        if (n.isSwitch || n.type === 'hub' || n.isRouter) { const led = M.sph(0.075, 0x94a3b8, { e: 0x94a3b8, ei: 1 }, 8); led.material = led.material.clone(); led.position.copy(pt); this.group.add(led); L[k] = led; }
      });
      a.links.push(L); b.links.push(L);
      this.paintLink(L);
      this.links.push(L);
      return L;
    }
    unlink(L) {
      this.group.remove(L.cable); L.cable.geometry.dispose();
      [L.aLed, L.bLed].forEach((l) => l && this.group.remove(l));
      L.a.links = L.a.links.filter((x) => x !== L); L.b.links = L.b.links.filter((x) => x !== L); this.links = this.links.filter((x) => x !== L);
    }
    linkBetween(x, y) { return this.links.find((l) => (l.a === x && l.b === y) || (l.a === y && l.b === x)); }
    other(L, n) { return L.a === n ? L.b : L.a; }
    endpoint(L, n) { return L.a === n ? L.aPt : L.bPt; }

    paintLink(L) {
      let hex = 0x94a3b8, glow = false;
      if (this.vlanMode) {
        if (L.mode === 'access') { hex = VQ.vhex(L.vlan); glow = true; } else if (L.mode === 'trunk') { hex = this.trunkHex; glow = true; }
      }
      L.cable.userData.setColor(hex, glow);
      [L.aLed, L.bLed].forEach((led) => { if (led) { led.material.color.setHex(hex); led.material.emissive.setHex(hex); } });
      if (L.mode === 'trunk' && this.vlanMode) L.cable.scale.set(1, 1, 1);
    }
    setLinkMode(L, mode, vlan, allowed) { L.mode = mode; if (vlan != null) L.vlan = vlan; if (allowed !== undefined) L.allowed = allowed; this.paintLink(L); }
    setVlanMode(on) {
      this.vlanMode = on; this.links.forEach((l) => this.paintLink(l));
      if (on) Object.values(this.nodes).forEach((n) => { if (n.isHost && n.obj.screen && n.vlan) n.setScreen(VQ.vhex(n.vlan)); });
    }

    // ---------- forwarding rules ----------
    vlanIn(L) { return this.vlanMode ? (L.mode === 'access' ? L.vlan : 0) : 0; }
    canOut(sw, L, vlan) {
      if (sw.type === 'hub' || !this.vlanMode) return true;
      if (L.mode === 'access') return L.vlan === vlan;
      if (L.mode === 'trunk') return !L.allowed || L.allowed.includes(vlan) || vlan === L.native;
      return vlan === 0;
    }
    tagOn(L, vlan) { return this.vlanMode && L.mode === 'trunk' && vlan && vlan !== L.native ? VQ.vhex(vlan) : null; }

    // ---------- packet animation ----------
    _polyline(ptsList) {
      const segs = []; let total = 0;
      for (let i = 0; i < ptsList.length - 1; i++) { const l = ptsList[i].distanceTo(ptsList[i + 1]); segs.push(l); total += l; }
      return { pts: ptsList, segs, total };
    }
    _along(pl, d) {
      if (d <= 0) return { p: pl.pts[0].clone(), i: 0 };
      let acc = 0;
      for (let i = 0; i < pl.segs.length; i++) {
        if (d <= acc + pl.segs[i] || i === pl.segs.length - 1) { const t = pl.segs[i] ? Math.min(1, (d - acc) / pl.segs[i]) : 1; return { p: pl.pts[i].clone().lerp(pl.pts[i + 1], t), i }; }
        acc += pl.segs[i];
      }
    }
    // single hop along one link, from node `from`
    async hop(from, L, o = {}) {
      const to = this.other(L, from), p0 = this.endpoint(L, from), p1 = this.endpoint(L, to);
      const pk = o.packet || M.packet({ color: o.color || 0xffffff, size: o.size });
      const ep = this.epoch; this.live.add(pk);
      pk.position.copy(p0); if (!o.packet) { this.group.add(pk); pk.scale.setScalar(0.01); this.stage.tween(pk.scale, { x: 1, y: 1, z: 1 }, 0.15); }
      pk.setTag(o.tag != null ? o.tag : null);
      if (o.color != null) pk.setColor(o.color);
      const d = p0.distanceTo(p1), dur = Math.max(0.15, d / (o.speed || this.speed));
      pk.lookAt(pk.position.clone().add(p1.clone().sub(p0)));
      await this.stage.tween(pk.position, { x: p1.x, y: p1.y, z: p1.z }, dur, { ease: 'lin' });
      if (ep !== this.epoch) return new Promise(() => {});
      this.live.delete(pk);
      if (o.keep) return pk;
      this.group.remove(pk); pk.traverse((c) => { if (c.material && !c.material.userData.shared) c.material.dispose(); }); pk.body.geometry.dispose();
      return null;
    }

    // Broadcast flood from a host. Respects VLAN mode. Returns list of receiving node ids.
    async flood(srcId, o = {}) {
      const src = this.nodes[srcId], recv = [], seen = new Set();
      const L0 = src.links[0]; if (!L0) return recv;
      const vlan0 = this.vlanIn(L0);
      const colorOf = (v) => (o.colorByVlan && v ? VQ.vhex(v) : o.color != null ? o.color : 0xfb7185);
      const walk = async (from, L, vlan) => {
        const to = this.other(L, from);
        await this.hop(from, L, { color: colorOf(vlan), tag: this.tagOn(L, vlan), size: o.size, speed: o.speed });
        if (to.isSwitch || to.type === 'hub') {
          if (seen.has(to.id)) return; seen.add(to.id);
          if (o.pulseSwitch !== false) to.pulse(colorOf(vlan));
          const outs = to.links.filter((l) => l !== L && this.canOut(to, l, vlan));
          if (o.onBlocked) to.links.filter((l) => l !== L && !this.canOut(to, l, vlan)).forEach((l) => o.onBlocked(to, l));
          await Promise.all(outs.map((l) => walk(to, l, vlan)));
        } else {
          recv.push(to.id); to.rx++;
          if (to.isHost) to.pulse(colorOf(vlan));
          if (o.onRx) o.onRx(to, vlan);
        }
      };
      seen.add(src.id);
      await walk(src, L0, vlan0);
      return recv;
    }

    // unicast path finder with VLAN + router awareness. returns [{node, vlan, link}] or null
    findPath(srcId, dstId) {
      const src = this.nodes[srcId]; if (!src || !src.links[0]) return null;
      const v0 = this.vlanIn(src.links[0]);
      const q = [{ node: src, link: null, vlan: v0, prev: null }], seen = new Set([src.id + ':' + v0]);
      while (q.length) {
        const c = q.shift();
        if (c.node.id === dstId) { const out = []; for (let x = c; x; x = x.prev) out.unshift(x); return out; }
        if (c.node !== src && c.node.isHost) continue;
        for (const L of c.node.links) {
          if (L === c.link && !c.node.isRouter) continue;
          let vl = [];
          if (c.node === src) vl = [c.vlan];
          else if (c.node.isRouter || c.node.type === 'firewall') {
            if (!this.vlanMode) vl = [0]; else if (L.mode === 'trunk') vl = (L.allowed || Object.keys(VQ.VLANS).map(Number)).slice(); else vl = [L.mode === 'access' ? L.vlan : 0];
          } else if (c.node.isSwitch || c.node.type === 'hub') { if (this.canOut(c.node, L, c.vlan)) vl = [c.vlan]; }
          for (const v of vl) {
            const nx = this.other(L, c.node), key = nx.id + ':' + v;
            if (seen.has(key)) continue; seen.add(key);
            // entering a node through an access link must match the link's vlan
            if (nx.isHost && this.vlanMode && L.mode === 'access' && L.vlan !== v) continue;
            q.push({ node: nx, link: L, vlan: v, prev: c });
          }
        }
      }
      return null;
    }
    // animate one packet along a found path. returns true when it arrived.
    async sendPath(path, o = {}) {
      const pk = M.packet({ color: o.color || 0xffffff, size: o.size });
      this.group.add(pk); const ep = this.epoch; this.live.add(pk);
      for (let i = 1; i < path.length; i++) {
        const c = path[i], from = path[i - 1].node;
        const L = c.link;
        pk.position.copy(this.endpoint(L, from));
        pk.setTag(this.tagOn(L, c.vlan));
        if (o.colorByVlan) pk.setColor(c.vlan ? VQ.vhex(c.vlan) : (o.color || 0xffffff));
        if (i === 1) { pk.scale.setScalar(0.01); this.stage.tween(pk.scale, { x: 1, y: 1, z: 1 }, 0.15); }
        const p1 = this.endpoint(L, c.node), d = pk.position.distanceTo(p1);
        pk.lookAt(p1);
        await this.stage.tween(pk.position, { x: p1.x, y: p1.y, z: p1.z }, Math.max(0.15, d / (o.speed || this.speed)), { ease: 'lin' });
        if (ep !== this.epoch) return new Promise(() => {});
        if (o.onNode) o.onNode(c.node, i);
        if (c.node.isSwitch || c.node.isRouter) { c.node.pulse(o.color || 0xffffff); }
        // walk through the device to the next link's endpoint
        if (i < path.length - 1) { const nl = path[i + 1].link, p2 = this.endpoint(nl, c.node); const d2 = p1.distanceTo(p2); await this.stage.tween(pk.position, { x: p2.x, y: p2.y, z: p2.z }, Math.max(0.1, d2 / (o.speed || this.speed)), { ease: 'lin' }); if (ep !== this.epoch) return new Promise(() => {}); }
      }
      this.live.delete(pk); this.group.remove(pk);
      return true;
    }
    // ping animation: request there, reply back. resolves true if reachable
    async ping(srcId, dstId, o = {}) {
      const path = this.findPath(srcId, dstId);
      if (!path) {
        // travel to first blocking device then bounce
        const src = this.nodes[srcId], L = src.links[0];
        if (L) { await this.hop(src, L, { color: 0xf87171, speed: o.speed }); const sw = this.other(L, src); sw.pulse(0xf87171); sw.mark(false, '🚫'); }
        return false;
      }
      await this.sendPath(path, { color: o.color || 0x67e8f9, colorByVlan: o.colorByVlan, speed: o.speed });
      if (!o.noReply) { const back = path.slice().reverse().map((c, i, a) => ({ node: c.node, vlan: c.vlan, link: i === 0 ? null : a[i - 1].link })); await this.sendPath(back, { color: 0x86efac, colorByVlan: o.colorByVlan, speed: o.speed }); }
      return true;
    }
    setDim(ids, dim) {
      ids.forEach((id) => { const n = this.nodes[id]; if (!n) return; this.stage.tween(n.obj.scale, { x: n.scale * (dim ? 0.82 : 1), y: n.scale * (dim ? 0.82 : 1), z: n.scale * (dim ? 0.82 : 1) }, 0.25); });
    }
    dispose() { this.stage.remove(this.group); }
  }
  VQ.Net3D = Net3D;
})(window.VQ);
