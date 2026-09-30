/* VLAN Quest – Cisco IOS simulator (switches, L3 switches, routers) + tiny host shell.
   Pure logic – no DOM. Everything the student types is parsed by a real command tree
   (abbreviations, ?, Tab, error markers) and changes a real device model that the
   L2/L3 reachability engine then uses for ping / show commands. */
(function (VQ) {
  'use strict';
  const sim = VQ.sim = {};

  // ------------------------------------------------------------------ helpers
  const pad = (s, n) => { s = String(s); return s.length >= n ? s + ' ' : s + ' '.repeat(n - s.length); };
  const padE = (s, n) => { s = String(s); return s.length >= n ? s : s + ' '.repeat(n - s.length); };
  const ip2n = (ip) => ip.split('.').reduce((a, b) => (a << 8) + (+b), 0) >>> 0;
  const validIp = (s) => /^\d{1,3}(\.\d{1,3}){3}$/.test(s) && s.split('.').every((x) => +x <= 255);
  const sameNet = (ip1, ip2, mask) => ((ip2n(ip1) & ip2n(mask)) >>> 0) === ((ip2n(ip2) & ip2n(mask)) >>> 0);
  const maskLen = (m) => ip2n(m).toString(2).replace(/0/g, '').length;
  const netOf = (ip, m) => { const n = (ip2n(ip) & ip2n(m)) >>> 0; return [n >>> 24, (n >> 16) & 255, (n >> 8) & 255, n & 255].join('.'); };
  sim.helpers = { ip2n, validIp, sameNet, maskLen, netOf };
  sim.fullIf = (str) => { const p = parseIfName(str); return p ? p.name : null; };

  function parseVlanList(str) {
    const out = new Set();
    for (const part of str.split(',')) {
      if (!part) return null;
      const m = part.match(/^(\d+)(?:-(\d+))?$/); if (!m) return null;
      const a = +m[1], b = m[2] ? +m[2] : a;
      if (a < 1 || b > 4094 || a > b) return null;
      for (let i = a; i <= b; i++) out.add(i);
    }
    return out;
  }
  function compress(set, all) {
    const arr = [...set].sort((a, b) => a - b); if (!arr.length) return 'none';
    if (all && arr.length === 4094) return '1-4094';
    const out = []; let s = arr[0], p = arr[0];
    for (let i = 1; i <= arr.length; i++) {
      if (arr[i] === p + 1) { p = arr[i]; continue; }
      out.push(s === p ? '' + s : s + '-' + p); s = p = arr[i];
    }
    return out.join(',');
  }
  const ALL = new Set(Array.from({ length: 4094 }, (_, i) => i + 1));
  sim.compress = compress; sim.parseVlanList = parseVlanList;

  const TYPES = [['fastethernet', 'FastEthernet', 'Fa'], ['gigabitethernet', 'GigabitEthernet', 'Gi'], ['vlan', 'Vlan', 'Vl'], ['loopback', 'Loopback', 'Lo']];
  function parseIfName(str) {
    const m = String(str).trim().toLowerCase().match(/^([a-z]+)\s*(\d+(?:\/\d+)*(?:\.\d+)?)$/); if (!m) return null;
    const t = TYPES.find((x) => x[0].startsWith(m[1]) && m[1].length >= (m[1] === 'f' || m[1] === 'g' || m[1] === 'v' ? 1 : 2));
    if (!t) return null;
    return { type: t[1], short: t[2], num: m[2], name: t[1] + m[2] };
  }
  const shortOf = (name) => { const m = name.match(/^([A-Za-z]+)(.*)$/); const t = TYPES.find((x) => x[1] === m[1]); return (t ? t[2] : m[1]) + m[2]; };

  // ------------------------------------------------------------------ topology
  class Topo {
    constructor() { this.devs = {}; this.hosts = {}; this.links = []; this.listeners = []; this.log = []; }
    changed() { this.listeners.forEach((f) => f()); }
    addDevice(id, o) { const d = new Device(this, id, o); this.devs[id] = d; return d; }
    addHost(id, o) { const h = Object.assign({ id, name: id, ip: null, mask: '255.255.255.0', gw: null, mac: null }, o); h.mac = h.mac || genMac(id); this.hosts[id] = h; return h; }
    // end = {dev, ifn} or {host}
    link(a, b) { this.links.push([a, b]); this.changed(); }
    peerOf(devId, ifn) {
      for (const [a, b] of this.links) {
        if (a.dev === devId && a.ifn === ifn) return b;
        if (b.dev === devId && b.ifn === ifn) return a;
      }
      return null;
    }
    hostPort(hostId) { for (const [a, b] of this.links) { if (a.host === hostId) return b; if (b.host === hostId) return a; } return null; }
    ifUp(dev, ifn) { // physical link status (both ends admin up)
      const i = dev.ifaces[ifn]; if (!i || i.shut) return false;
      const p = this.peerOf(dev.id, ifn); if (!p) return false;
      if (p.host) return true;
      const pd = this.devs[p.dev], pi = pd && pd.ifaces[p.ifn];
      return !!pi && !pi.shut;
    }
    // operational mode of a switchport: 'access' | 'trunk'
    opMode(dev, ifn) {
      const i = dev.ifaces[ifn]; if (i.mode === 'access') return 'access'; if (i.mode === 'trunk') return 'trunk';
      const p = this.peerOf(dev.id, ifn); if (!p || p.host) return 'access';
      const pi = this.devs[p.dev] && this.devs[p.dev].ifaces[p.ifn]; if (!pi || pi.kind !== 'phys') return 'access';
      if (i.nonegotiate) return 'access';
      const pm = pi.mode;
      if (i.mode === 'desirable') return pm === 'trunk' || pm === 'desirable' || pm === 'auto' ? 'trunk' : 'access';
      return pm === 'trunk' || pm === 'desirable' ? 'trunk' : 'access'; // auto
    }
    // does switchport carry `vlan`? returns {mode, tagged} | null
    carries(dev, ifn, vlan) {
      const i = dev.ifaces[ifn]; if (!i || i.kind !== 'phys' || dev.isRouter) return null;
      if (!this.ifUp(dev, ifn)) return null;
      const m = this.opMode(dev, ifn);
      if (m === 'access') return i.accessVlan === vlan && dev.vlans.has(vlan) ? { mode: 'access', tagged: false } : null;
      if (!dev.vlans.has(vlan)) return null;
      if (i.allowed && !i.allowed.has(vlan)) return null;
      return { mode: 'trunk', tagged: vlan !== i.native };
    }
    sviUp(dev, v) {
      const s = dev.ifaces['Vlan' + v]; if (!s || s.shut || !s.ip || !dev.vlans.has(v)) return false;
      return Object.keys(dev.ifaces).some((n) => { const i = dev.ifaces[n]; return i.kind === 'phys' && this.carries(dev, n, v); });
    }
    // flood exploration inside one VLAN. Returns {hosts:Set, l3:[], arrivals:[]}
    explore(dev, inIf, vlan, res, seen) {
      res = res || { hosts: new Set(), l3: [], arrivals: [] }; seen = seen || new Set();
      const key = dev.id + ':' + vlan; if (seen.has(key)) return res; seen.add(key);
      res.arrivals.push({ dev: dev.id, ifn: inIf, vlan });
      if (dev.ifaces['Vlan' + vlan] && this.sviUp(dev, vlan)) { const s = dev.ifaces['Vlan' + vlan]; res.l3.push({ dev: dev.id, ifn: 'Vlan' + vlan, ip: s.ip, mask: s.mask, vlan }); }
      for (const j of dev.order) {
        if (j === inIf) continue;
        const c = this.carries(dev, j, vlan); if (!c) continue;
        const p = this.peerOf(dev.id, j); if (!p) continue;
        if (p.host) { res.hosts.add(p.host); continue; }
        const pd = this.devs[p.dev], pi = pd.ifaces[p.ifn];
        if (pd.isRouter) { // router or L3 routed port
          if (c.mode === 'trunk') {
            const sub = Object.values(pd.ifaces).find((x) => x.kind === 'sub' && x.parent === p.ifn && x.encap === vlan);
            if (sub && !sub.shut && !pi.shut && sub.ip) res.l3.push({ dev: pd.id, ifn: sub.name, ip: sub.ip, mask: sub.mask, vlan });
            else if (c.tagged === false && pi.ip && !pi.shut) res.l3.push({ dev: pd.id, ifn: p.ifn, ip: pi.ip, mask: pi.mask, vlan });
          } else if (pi.ip && !pi.shut) res.l3.push({ dev: pd.id, ifn: p.ifn, ip: pi.ip, mask: pi.mask, vlan });
          continue;
        }
        if (pi.kind !== 'phys') continue;
        const pm = this.opMode(pd, p.ifn);
        let nv = null;
        if (c.mode === 'access' || !c.tagged) nv = pm === 'trunk' ? pi.native : pi.accessVlan;   // untagged frame
        else { if (pm !== 'trunk') continue; nv = vlan; }                                        // tagged frame
        if (!pd.vlans.has(nv)) continue;
        if (pm === 'trunk' && c.tagged && pi.allowed && !pi.allowed.has(nv)) continue;
        this.explore(pd, p.ifn, nv, res, seen);
      }
      return res;
    }
    hostDomain(hostId) {
      const p = this.hostPort(hostId); if (!p) return null;
      const dev = this.devs[p.dev]; if (!dev || dev.isRouter) return null;
      const i = dev.ifaces[p.ifn]; if (!this.ifUp(dev, p.ifn)) return null;
      const m = this.opMode(dev, p.ifn);
      const v = m === 'trunk' ? i.native : i.accessVlan;
      if (!dev.vlans.has(v)) return null;
      if (m === 'trunk' && i.allowed && !i.allowed.has(v)) return null;
      const res = this.explore(dev, p.ifn, v);
      res.hosts.add(hostId); res.startVlan = v; res.startDev = dev.id; res.startIf = p.ifn;
      return res;
    }
    // domain reachable from an L3 interface of a router / l3 switch
    l3Domain(dev, ifn) {
      const i = dev.ifaces[ifn]; if (!i || i.shut) return null;
      if (i.kind === 'svi') return this.sviUp(dev, i.vlan) ? this.explore(dev, null, i.vlan) : null;
      const physName = i.kind === 'sub' ? i.parent : ifn, phys = dev.ifaces[physName];
      if (!phys || phys.shut) return null;
      const p = this.peerOf(dev.id, physName); if (!p || p.host) return null;
      const pd = this.devs[p.dev]; if (!pd || pd.isRouter || this.devs[p.dev].ifaces[p.ifn].shut) return null;
      const pi = pd.ifaces[p.ifn], pm = this.opMode(pd, p.ifn);
      let v;
      if (i.kind === 'sub') { if (pm !== 'trunk') return null; v = i.encap; if (v == null) return null; if (!pd.vlans.has(v) || (pi.allowed && !pi.allowed.has(v))) return null; if (v === pi.native && !i.encapNative) { /* tagged frame for native vlan: still ok in sim */ } }
      else v = pm === 'trunk' ? pi.native : pi.accessVlan;
      if (!pd.vlans.has(v)) return null;
      return this.explore(pd, p.ifn, v);
    }
    hostByIp(ip) { return Object.values(this.hosts).find((h) => h.ip === ip); }
    // one-way IP reachability from a host to an ip. returns {ok, why, via}
    hostPing1(h, ip) {
      if (!h.ip) return { ok: false, why: 'noip' };
      if (ip === h.ip) return { ok: true };
      const D = this.hostDomain(h.id); if (!D) return { ok: false, why: 'link' };
      const inDom = (d, target) => [...d.hosts].some((id) => this.hosts[id].ip === target) || d.l3.some((e) => e.ip === target);
      if (sameNet(h.ip, ip, h.mask)) return inDom(D, ip) ? { ok: true } : { ok: false, why: 'l2' };
      if (!h.gw) return { ok: false, why: 'nogw' };
      const g = D.l3.find((e) => e.ip === h.gw); if (!g) return { ok: false, why: 'gw-unreachable' };
      const gd = this.devs[g.dev];
      if (!gd.routing()) return { ok: false, why: 'no-routing', from: h.gw };
      if (gd.ownsIp(ip)) return { ok: true };
      const out = gd.l3ifaces().find((i) => !i.shut && i.ip && sameNet(i.ip, ip, i.mask) && (i.kind !== 'svi' || this.sviUp(gd, i.vlan)));
      if (!out) return { ok: false, why: 'no-route', from: h.gw };
      const D2 = this.l3Domain(gd, out.name); if (!D2) return { ok: false, why: 'l3-down', from: h.gw };
      return inDom(D2, ip) ? { ok: true } : { ok: false, why: 'l2-remote', from: h.gw };
    }
    hostPing(hid, ip) {
      const h = this.hosts[hid], fwd = this.hostPing1(h, ip);
      if (!fwd.ok) return fwd;
      const d = this.hostByIp(ip);
      if (d) { const back = this.hostPing1(d, h.ip); if (!back.ok) return { ok: false, why: 'return', from: null }; }
      else { // destination is a device address: reply goes back through connected route (assume fine if same-net) or via device routing
        const dev = Object.values(this.devs).find((x) => x.ownsIp(ip)); if (!dev) return { ok: false, why: 'nohost' };
      }
      return { ok: true };
    }
    devPing(dev, ip) {
      const ifc = dev.l3ifaces().find((i) => !i.shut && i.ip && sameNet(i.ip, ip, i.mask));
      if (dev.ownsIp(ip)) return true;
      if (!ifc) return false;
      const D = this.l3Domain(dev, ifc.name); if (!D) return false;
      const h = [...D.hosts].map((id) => this.hosts[id]).find((x) => x.ip === ip);
      if (h) return this.hostPing1(h, ifc.ip).ok;
      const e = D.l3.find((x) => x.ip === ip);
      return !!e;
    }
    macTable(dev) {
      const rows = [];
      for (const h of Object.values(this.hosts)) {
        const D = this.hostDomain(h.id); if (!D) continue;
        // arrival of the host's frames on this device
        const a = D.arrivals.find((x) => x.dev === dev.id && x.ifn);
        if (a) rows.push({ vlan: a.vlan, mac: h.mac, port: a.ifn, host: h.id });
      }
      return rows;
    }
  }
  sim.Topo = Topo;
  function genMac(id) { let h = 0; for (const c of id) h = (h * 131 + c.charCodeAt(0)) >>> 0; const x = (n) => ((h >> n) & 255).toString(16).padStart(2, '0'); return '0001.' + x(8) + x(0) + '.' + x(16) + x(4); }

  // ------------------------------------------------------------------ device
  class Device {
    constructor(topo, id, o = {}) {
      this.topo = topo; this.id = id; this.kind = o.kind || 'switch'; // switch | l3 | router
      this.isRouter = this.kind === 'router';
      this.model = o.model || (this.kind === 'router' ? 'ISR4321' : this.kind === 'l3' ? 'WS-C3560-24PS' : 'WS-C2960-24TT-L');
      this.hostname = o.hostname || (this.kind === 'router' ? 'Router' : 'Switch');
      this.ifaces = {}; this.order = []; this.vlans = new Map([[1, { id: 1, name: 'default' }]]);
      this.ipRouting = false; this.defaultGateway = null; this.saved = null; this.staticRoutes = [];
      this.mac = genMac(id + 'dev');
      if (this.isRouter) { for (let i = 0; i < (o.gi || 2); i++) this.addIf('GigabitEthernet', '0/' + i, { shut: true }); }
      else {
        for (let i = 1; i <= (o.fa == null ? 24 : o.fa); i++) this.addIf('FastEthernet', '0/' + i);
        for (let i = 1; i <= (o.gi == null ? 2 : o.gi); i++) this.addIf('GigabitEthernet', '0/' + i);
      }
      if (o.vlans) o.vlans.forEach(([id2, n]) => this.vlans.set(id2, { id: id2, name: n }));
    }
    blank(name, kind) {
      return { name, short: shortOf(name), kind, shut: false, mode: 'auto', accessVlan: 1, native: 1, allowed: null, voice: null, nonegotiate: false, trunkEncap: false, desc: '', ip: null, mask: null, encap: null, encapNative: false, parent: null, vlan: null };
    }
    addIf(type, num, o = {}) { const name = type + num, i = Object.assign(this.blank(name, 'phys'), o); this.ifaces[name] = i; this.order.push(name); return i; }
    getOrCreateIf(p) { // p from parseIfName
      if (p.type === 'Vlan') { if (this.isRouter) return null; const v = +p.num; if (v < 1 || v > 4094) return null; return this.ifaces[p.name] || (this.ifaces[p.name] = Object.assign(this.blank(p.name, 'svi'), { vlan: v, shut: true })); }
      if (this.ifaces[p.name]) return this.ifaces[p.name];
      const m = p.name.match(/^(.*)\.(\d+)$/);
      if (m && this.isRouter && this.ifaces[m[1]]) return (this.ifaces[p.name] = Object.assign(this.blank(p.name, 'sub'), { parent: m[1], shut: false }));
      return null;
    }
    l3ifaces() { return Object.values(this.ifaces).filter((i) => i.kind !== 'phys' || (this.isRouter && i.ip) || (this.kind === 'l3' && i.ip)); }
    routing() { return this.isRouter || (this.kind === 'l3' && this.ipRouting); }
    ownsIp(ip) { return Object.values(this.ifaces).some((i) => i.ip === ip && !i.shut); }
    physPorts() { return this.order; }
    isSaved() { return this.saved !== null && this.saved === this.runningConfig(); }
    // ---------- status helpers
    status(ifn) {
      const i = this.ifaces[ifn];
      if (i.kind === 'svi') return { line: i.shut ? 'administratively down' : this.topo.sviUp(this, i.vlan) ? 'up' : 'down', proto: i.shut ? 'down' : this.topo.sviUp(this, i.vlan) ? 'up' : 'down' };
      if (i.kind === 'sub') { const par = this.status(i.parent); return { line: i.shut ? 'administratively down' : par.line, proto: i.shut ? 'down' : par.proto }; }
      if (i.shut) return { line: 'administratively down', proto: 'down' };
      const up = this.topo.ifUp(this, ifn);
      return { line: up ? 'up' : 'down', proto: up ? 'up' : 'down' };
    }
    // ---------- text
    runningConfig() {
      const L = [];
      L.push('!', 'version 15.0', 'no service timestamps log datetime msec', 'no service timestamps debug datetime msec', 'service password-encryption', '!', 'hostname ' + this.hostname, '!');
      if (this.kind === 'l3' || this.isRouter) if (this.ipRouting || this.isRouter) { if (this.kind === 'l3') L.push('ip routing', '!'); }
      L.push('!', '!', 'spanning-tree mode pvst', '!');
      const emit = (i) => {
        const x = [];
        if (i.desc) x.push(' description ' + i.desc);
        if (i.kind === 'sub') { x.push(' encapsulation dot1Q ' + i.encap + (i.encapNative ? ' native' : '')); }
        if (i.kind === 'phys' && !this.isRouter) {
          if (i.trunkEncap) x.push(' switchport trunk encapsulation dot1q');
          if (i.accessVlan !== 1) x.push(' switchport access vlan ' + i.accessVlan);
          if (i.native !== 1) x.push(' switchport trunk native vlan ' + i.native);
          if (i.allowed) x.push(' switchport trunk allowed vlan ' + compress(i.allowed));
          if (i.mode === 'access') x.push(' switchport mode access'); else if (i.mode === 'trunk') x.push(' switchport mode trunk'); else if (i.mode === 'desirable') x.push(' switchport mode dynamic desirable');
          if (i.voice) x.push(' switchport voice vlan ' + i.voice);
          if (i.nonegotiate) x.push(' switchport nonegotiate');
        }
        if (i.kind !== 'phys' || this.isRouter || (this.kind === 'l3' && i.ip)) x.push(i.ip ? ' ip address ' + i.ip + ' ' + i.mask : ' no ip address');
        if (i.kind === 'svi' ? i.shut : i.shut) x.push(' shutdown');
        else if (this.isRouter && i.kind === 'phys' && !i.shut) { /* no shutdown is default display */ }
        return x;
      };
      for (const n of this.order) { L.push('interface ' + n); emit(this.ifaces[n]).forEach((l) => L.push(l)); L.push('!'); }
      const extra = Object.values(this.ifaces).filter((i) => i.kind !== 'phys').sort((a, b) => (a.kind === b.kind ? (a.vlan || 0) - (b.vlan || 0) : a.kind === 'sub' ? -1 : 1));
      for (const i of extra) { L.push('interface ' + i.name); emit(i).forEach((l) => L.push(l)); L.push('!'); }
      if (this.defaultGateway) L.push('ip default-gateway ' + this.defaultGateway, '!');
      this.staticRoutes.forEach((r) => L.push('ip route ' + r));
      L.push('line con 0', '!', 'line vty 0 4', ' login', '!', 'end');
      return L.join('\n');
    }
  }
  sim.Device = Device;

  // ------------------------------------------------------------------ command tree
  const DICT = {
    interfaces: 'Interface status and configuration', 'mac-address-table': 'MAC forwarding table', history: 'Display the session command history', ip: 'IP information', vlan: 'VLAN commands', brief: 'Brief summary', id: 'VTP VLAN status by VLAN id', trunk: 'Set trunking characteristics of the interface', switchport: 'Set switching mode characteristics', show: 'Show running system information', configure: 'Enter configuration mode', terminal: 'Configure from the terminal', enable: 'Turn on privileged commands', disable: 'Turn off privileged commands', exit: 'Exit from the EXEC', end: 'Exit configuration mode', ping: 'Send echo messages', copy: 'Copy from one file to another', write: 'Write running configuration to memory, network, or terminal', vlan: 'VLAN commands', interface: 'Select an interface to configure', hostname: 'Set system\'s network name', ip: 'Global IP configuration subcommands', no: 'Negate a command or set its defaults', name: 'Ascertain the name of the VLAN', switchport: 'Set switching mode characteristics', shutdown: 'Shutdown the selected interface', description: 'Interface specific description', mode: 'Set trunking mode of the interface', access: 'Set access mode characteristics of the interface', trunk: 'Set trunking characteristics of the interface', native: 'Set trunking native characteristics when interface is in trunking mode', allowed: 'Set allowed VLAN characteristics when interface is in trunking mode', brief: 'VLAN status in brief', trunk_: '', encapsulation: 'Set encapsulation type', address: 'Set the IP address of an interface', 'running-config': 'Current operating configuration', 'startup-config': 'Contents of startup configuration', 'mac': '', 'address-table': 'MAC forwarding table', version: 'System hardware and software status', do: 'To run exec commands in config mode', voice: 'Voice appliance attributes', add: 'add VLANs to the current list', remove: 'remove VLANs from the current list', all: 'all VLANs', none: 'no VLANs', except: 'all VLANs except the following', routing: 'Enable IP routing', 'default-gateway': 'Specify default gateway (if not routing IP)', dynamic: 'Set trunking mode to dynamically negotiate access or trunk mode', nonegotiate: 'Device will not engage in negotiation protocol on this interface', status: 'Display interface status', switchport_: '', neighbors: 'CDP neighbor entries', cdp: 'CDP information', route: 'IP routing table', memory: '', 'range': 'interface range command', dot1q: 'Interface uses only 802.1q trunking encapsulation when trunking', desirable: 'Set trunking mode dynamic desirable', auto: 'Set trunking mode dynamic auto',
  };
  const ARG = { vlan: '<1-4094>  VLAN ID', vlanlist: 'VLAN IDs, e.g. 10,20,30-40', word: 'WORD', ip: 'A.B.C.D', rest: 'LINE', name: 'WORD  VLAN name', int: 'Interface name' };

  const MODES = ['user', 'priv', 'config', 'if', 'rif', 'svi', 'sub', 'vlan'];
  const TRIES = {}; MODES.forEach((m) => { TRIES[m] = { kids: [], run: null }; });

  function reg(modes, spec, help, run, opts = {}) {
    const toks = spec.split(/\s+/);
    for (const mode of [].concat(modes)) {
      let node = TRIES[mode];
      for (const t of toks) {
        const am = t.match(/^<(\w+):(\w+)>$/);
        let kid = node.kids.find((k) => (am ? k.type === 'arg' && k.argType === am[2] && k.name === am[1] : k.type === 'kw' && k.word === t));
        if (!kid) { kid = am ? { type: 'arg', name: am[1], argType: am[2], kids: [], run: null } : { type: 'kw', word: t, kids: [], run: null }; node.kids.push(kid); }
        node = kid;
      }
      node.run = run; node.help = help; node.opts = opts;
    }
  }
  const validators = {
    vlan: (t) => /^\d+$/.test(t) && +t >= 1 && +t <= 4094,
    vlanlist: (t) => !!parseVlanList(t), word: () => true, name: () => true, ip: validIp, rest: () => true, int: () => true,
  };

  // parse returns {node, args, err, errIndex, tokens, ambiguous}
  function parse(mode, tokens) {
    let node = TRIES[mode]; const args = {};
    for (let i = 0; i < tokens.length; i++) {
      const tok = tokens[i], low = tok.toLowerCase();
      const kws = node.kids.filter((k) => k.type === 'kw' && k.word.startsWith(low));
      const exact = kws.find((k) => k.word === low);
      if (exact) { node = exact; continue; }
      if (kws.length === 1) { node = kws[0]; continue; }
      if (kws.length > 1) return { err: 'ambiguous', errIndex: i, tokens, cands: kws };
      const arg = node.kids.find((k) => k.type === 'arg');
      if (arg) {
        if (arg.argType === 'rest') { args[arg.name] = tokens.slice(i).join(' '); node = arg; break; }
        if (!validators[arg.argType](tok)) return { err: 'invalid', errIndex: i, tokens };
        args[arg.name] = tok; node = arg; continue;
      }
      return { err: 'invalid', errIndex: i, tokens };
    }
    return { node, args, tokens };
  }

  // ------------------------------------------------------------------ session
  const PR = { user: '>', priv: '#', config: '(config)#', if: '(config-if)#', ifrange: '(config-if-range)#', rif: '(config-if)#', svi: '(config-if)#', sub: '(config-subif)#', vlan: '(config-vlan)#' };
  class Session {
    constructor(dev) { this.dev = dev; this.topo = dev.topo; this.mode = 'user'; this.cur = null; this.curList = null; this.history = []; this.stats = { cmds: 0, errors: 0, shows: {}, used: {} }; this.pending = null; this.onMode = null; }
    prompt() { return this.dev.hostname + PR[this.mode]; }
    trie() { return this.mode === 'ifrange' ? 'if' : this.mode; }
    setMode(m) { this.mode = m; if (this.onMode) this.onMode(m); }
    // main entry: returns array of output lines (strings) ; may include {err:true} objects
    exec(line) {
      const out = []; const P = (s) => out.push(s);
      let raw = line.replace(/\s+$/, '');
      if (!raw.trim()) return out;
      // pipe filter
      let filter = null;
      const pi = raw.indexOf('|');
      if (pi >= 0) { const f = raw.slice(pi + 1).trim().split(/\s+/); raw = raw.slice(0, pi).trim(); if (f.length >= 2) filter = { op: f[0].toLowerCase(), pat: f.slice(1).join(' ') }; }
      const tokens = raw.trim().split(/\s+/);
      this.stats.cmds++;
      const lines = this.run(tokens, raw, P);
      let res = out;
      if (filter) res = this.applyFilter(out, filter);
      return res;
    }
    applyFilter(lines, f) {
      const all = lines.join('\n').split('\n'); const pat = f.pat.toLowerCase();
      if ('include'.startsWith(f.op)) return all.filter((l) => l.toLowerCase().includes(pat));
      if ('exclude'.startsWith(f.op)) return all.filter((l) => !l.toLowerCase().includes(pat));
      if ('begin'.startsWith(f.op)) { const i = all.findIndex((l) => l.toLowerCase().includes(pat)); return i < 0 ? [] : all.slice(i); }
      if ('section'.startsWith(f.op)) { const out = []; let on = false; for (const l of all) { if (!/^\s/.test(l) && l !== '!') on = l.toLowerCase().includes(pat); if (on) out.push(l); } return out; }
      return all;
    }
    err(P, tokens, idx, raw, kind) {
      this.stats.errors++;
      if (kind === 'ambiguous') { P({ err: '% Ambiguous command:  "' + tokens.join(' ') + '"' }); return; }
      // caret under offending token (prompt length + chars before it)
      const before = tokens.slice(0, idx).join(' ').length + (idx > 0 ? 1 : 0);
      P({ err: ' '.repeat(this.prompt().length + before) + '^' });
      P({ err: "% Invalid input detected at '^' marker.\n" });
    }
    run(tokens, raw, P) {
      const dev = this.dev;
      // `do` inside config modes
      if (this.mode !== 'user' && this.mode !== 'priv' && tokens[0].toLowerCase() === 'do' && tokens.length > 1) {
        const saveMode = this.mode; this.mode = 'priv'; const r = this.run(tokens.slice(1), raw, P); this.mode = saveMode; return r;
      }
      let modeKey = this.trie();
      let r = parse(modeKey, tokens);
      // config commands typed inside interface/vlan mode fall back to global config (IOS behaviour)
      if ((r.err || !r.node.run) && ['if', 'rif', 'svi', 'sub', 'vlan'].includes(modeKey)) {
        const r2 = parse('config', tokens);
        if (!r2.err && r2.node.run) { this.setMode('config'); this.cur = null; this.curList = null; r = r2; modeKey = 'config'; }
      }
      // priv commands are not available in user mode etc.
      if (r.err) return this.err(P, tokens, r.errIndex, raw, r.err);
      if (!r.node.run) { this.stats.errors++; P({ err: '% Incomplete command.' }); return; }
      const key = tokens.slice(0, 3).join(' ').toLowerCase(); this.stats.used[modeKey + ':' + key] = 1;
      r.node.run.call(this, r.args, P, tokens);
      this.topo.changed();
    }
    // ----- help / completion
    helpFor(text) {
      const endsSpace = /\s$/.test(text), tokens = text.trim() ? text.trim().split(/\s+/) : [];
      let mode = this.trie(); const prefix = endsSpace ? tokens : tokens.slice(0, -1), part = endsSpace ? '' : (tokens[tokens.length - 1] || '').toLowerCase();
      if (this.mode !== 'user' && this.mode !== 'priv' && prefix[0] === 'do') { mode = 'priv'; prefix.shift(); }
      const r = parse(mode, prefix);
      if (r.err) return ['% Unrecognized command'];
      const node = r.node, out = [];
      if (part) { node.kids.filter((k) => k.type === 'kw' && k.word.startsWith(part)).forEach((k) => out.push('  ' + padE(k.word, 20) + (DICT[k.word] || ''))); if (!out.length) { const a = node.kids.find((k) => k.type === 'arg'); if (a) out.push('  ' + (ARG[a.argType] || 'LINE')); } return out.length ? out : ['% Unrecognized command']; }
      node.kids.forEach((k) => { if (k.type === 'kw') out.push('  ' + padE(k.word, 20) + (DICT[k.word] || '')); else out.push('  ' + padE('<' + (k.argType === 'vlan' ? '1-4094' : k.name) + '>', 20) + (ARG[k.argType] || '').replace(/^<[^>]+>\s*/, '')); });
      if (node.run) out.push('  ' + padE('<cr>', 20));
      out.sort((a, b) => (a.trim()[0] === '<' ? 1 : 0) - (b.trim()[0] === '<' ? 1 : 0));
      return out;
    }
    complete(text) {
      const endsSpace = /\s$/.test(text); if (endsSpace) return text;
      const tokens = text.trim().split(/\s+/), last = tokens[tokens.length - 1].toLowerCase();
      let mode = this.trie(), pre = tokens.slice(0, -1);
      if (this.mode !== 'user' && this.mode !== 'priv' && pre[0] === 'do') { mode = 'priv'; pre = pre.slice(1); }
      const r = parse(mode, pre); if (r.err) return text;
      const c = r.node.kids.filter((k) => k.type === 'kw' && k.word.startsWith(last));
      if (c.length === 1) { const base = text.slice(0, text.length - tokens[tokens.length - 1].length); return base + c[0].word + ' '; }
      return text;
    }
    // ----- helpers used by command handlers
    targets() { return this.curList || (this.cur ? [this.cur] : []); }
    linkMsgs(P, i, wasUp) {
      const now = this.topo.ifUp(this.dev, i.name);
      if (i.kind === 'phys' && now !== wasUp) { const s = now ? 'up' : 'down'; P('%LINK-5-CHANGED: Interface ' + i.name + ', changed state to ' + (i.shut ? 'administratively down' : s)); P('%LINEPROTO-5-UPDOWN: Line protocol on Interface ' + i.name + ', changed state to ' + s); }
    }
  }
  sim.Session = Session;

  // ------------------------------------------------------------------ command definitions
  const SW = ['switch', 'l3'];
  const enterIf = function (a, P) {
    const dev = this.dev, s = a.if.trim();
    const rm = s.match(/^range\s+(.+)$/i);
    if (rm) {
      if (dev.isRouter) return this.err(P, ['interface', 'range'], 1, '', 'invalid');
      const list = []; let bad = false;
      rm[1].split(',').forEach((part) => {
        const m = part.trim().replace(/\s*-\s*/g, '-').match(/^([a-z]+)\s*(\d+)\/(\d+)(?:-(?:[a-z]+\s*\d+\/)?(\d+))?$/i);
        if (!m) { bad = true; return; }
        const p = parseIfName(m[1] + m[2] + '/' + m[3]); if (!p) { bad = true; return; }
        const a1 = +m[3], b1 = m[4] ? +m[4] : a1;
        for (let k = a1; k <= b1; k++) { const nm = p.type + m[2] + '/' + k; if (!dev.ifaces[nm]) { bad = true; return; } list.push(dev.ifaces[nm]); }
      });
      if (bad || !list.length) { this.stats.errors++; P({ err: "% Invalid input detected at '^' marker.\n" }); return; }
      this.curList = list; this.cur = list[0]; this.setMode('ifrange'); return;
    }
    const p = parseIfName(s);
    if (!p) { this.stats.errors++; P({ err: " ".repeat(this.prompt().length + 10) + '^' }); P({ err: "% Invalid input detected at '^' marker.\n" }); return; }
    const i = dev.getOrCreateIf(p);
    if (!i) { this.stats.errors++; P({ err: " ".repeat(this.prompt().length + 10) + '^' }); P({ err: "% Invalid input detected at '^' marker.\n" }); return; }
    this.cur = i; this.curList = null;
    this.setMode(i.kind === 'svi' ? 'svi' : i.kind === 'sub' ? 'sub' : dev.isRouter ? 'rif' : 'if');
  };
  reg('config', 'interface <if:rest>', 'Select an interface to configure', enterIf);
  reg(['if', 'rif', 'svi', 'sub'], 'interface <if:rest>', '', enterIf);

  // --- navigation
  reg('user', 'enable', 'Turn on privileged commands', function () { this.setMode('priv'); });
  reg('priv', 'disable', '', function () { this.setMode('user'); });
  reg(['user', 'priv'], 'exit', '', function () { this.setMode('user'); });
  reg('priv', 'logout', '', function () { this.setMode('user'); });
  reg('priv', 'configure terminal', 'Configure from the terminal', function (a, P) { P('Enter configuration commands, one per line.  End with CNTL/Z.'); this.setMode('config'); });
  reg('config', 'exit', '', function () { this.setMode('priv'); });
  reg(['if', 'rif', 'svi', 'sub', 'vlan'], 'exit', '', function () { this.cur = null; this.curList = null; this.setMode('config'); });
  reg(['config', 'if', 'rif', 'svi', 'sub', 'vlan'], 'end', '', function () { this.cur = null; this.curList = null; this.setMode('priv'); });
  reg('priv', 'terminal length <n:word>', '', function () {});
  reg('priv', 'clear mac address-table dynamic', '', function () {});

  // --- global config
  reg('config', 'hostname <name:word>', '', function (a) { this.dev.hostname = a.name; });
  reg('config', 'vlan <id:vlanlist>', 'VLAN commands', function (a, P) {
    const list = parseVlanList(a.id); const ids = [...list];
    if (a.id.match(/^\d+$/)) {
      const id = ids[0]; if (id >= 1002 && id <= 1005) { P({ err: '% Default VLAN ' + id + ' may not be configured.' }); this.stats.errors++; return; }
      if (!this.dev.vlans.has(id)) this.dev.vlans.set(id, { id, name: 'VLAN' + String(id).padStart(4, '0') });
      this.cur = { vlan: id }; this.setMode('vlan');
    } else ids.forEach((id) => { if (!this.dev.vlans.has(id)) this.dev.vlans.set(id, { id, name: 'VLAN' + String(id).padStart(4, '0') }); });
  });
  reg('config', 'no vlan <id:vlanlist>', '', function (a, P) {
    for (const id of parseVlanList(a.id)) {
      if (id === 1 || (id >= 1002 && id <= 1005)) { P({ err: '% Default VLAN ' + id + ' may not be deleted.' }); this.stats.errors++; continue; }
      this.dev.vlans.delete(id);
    }
  });
  reg('vlan', 'name <name:word>', '', function (a) { this.dev.vlans.get(this.cur.vlan).name = a.name.slice(0, 32); });
  reg('vlan', 'no name', '', function () { const v = this.cur.vlan; this.dev.vlans.get(v).name = 'VLAN' + String(v).padStart(4, '0'); });
  reg('vlan', 'state <s:word>', '', function () {});
  reg('config', 'ip default-gateway <ip:ip>', '', function (a) { if (this.dev.isRouter) return this.err(() => {}, [], 0); this.dev.defaultGateway = a.ip; });
  reg('config', 'no ip default-gateway', '', function () { this.dev.defaultGateway = null; });
  reg('config', 'ip routing', 'Enable IP routing', function (a, P, t) {
    if (this.dev.kind === 'switch') { this.stats.errors++; P({ err: " ".repeat(this.prompt().length + 3) + '^' }); P({ err: "% Invalid input detected at '^' marker.\n" }); return; }
    this.dev.ipRouting = true;
  });
  reg('config', 'no ip routing', '', function () { if (this.dev.kind === 'l3') this.dev.ipRouting = false; });
  reg('config', 'no ip domain-lookup', '', function () {});
  reg('config', 'ip domain-name <n:word>', '', function () {});
  reg('config', 'service password-encryption', '', function () {});
  reg('config', 'enable secret <p:word>', '', function () {});
  reg('config', 'enable password <p:word>', '', function () {});
  reg('config', 'spanning-tree mode <m:word>', '', function () {});
  reg('config', 'vtp mode <m:word>', '', function () {});
  reg('config', 'banner motd <t:rest>', '', function () {});
  reg('config', 'line <l:rest>', '', function () {});
  reg('config', 'ip route <net:ip> <mask:ip> <nh:ip>', '', function (a) { this.dev.staticRoutes.push(a.net + ' ' + a.mask + ' ' + a.nh); });

  // --- switchport commands
  const eachIf = function (fn) { this.targets().forEach(fn); };
  const swOnly = function (P) { if (this.dev.isRouter) { this.stats.errors++; P({ err: " ".repeat(this.prompt().length + 1) + '^' }); P({ err: "% Invalid input detected at '^' marker.\n" }); return false; } return true; };
  reg('if', 'switchport mode access', 'Set trunking mode to ACCESS unconditionally', function () { eachIf.call(this, (i) => { i.mode = 'access'; }); });
  reg('if', 'switchport mode trunk', 'Set trunking mode to TRUNK unconditionally', function (a, P) {
    eachIf.call(this, (i) => {
      if (this.dev.kind === 'l3' && !i.trunkEncap) { P({ err: 'Command rejected: An interface whose trunk encapsulation is "Auto" can not be configured to "trunk" mode.' }); this.stats.errors++; return; }
      i.mode = 'trunk';
    });
  });
  reg('if', 'switchport mode dynamic auto', '', function () { eachIf.call(this, (i) => { i.mode = 'auto'; }); });
  reg('if', 'switchport mode dynamic desirable', '', function () { eachIf.call(this, (i) => { i.mode = 'desirable'; }); });
  reg('if', 'switchport nonegotiate', '', function () { eachIf.call(this, (i) => { i.nonegotiate = true; }); });
  reg('if', 'no switchport nonegotiate', '', function () { eachIf.call(this, (i) => { i.nonegotiate = false; }); });
  reg('if', 'switchport', '', function () {});
  reg('if', 'switchport access vlan <v:vlan>', 'Set VLAN when interface is in access mode', function (a, P) {
    const v = +a.v;
    if (!this.dev.vlans.has(v)) { P('% Access VLAN does not exist. Creating vlan ' + v); this.dev.vlans.set(v, { id: v, name: 'VLAN' + String(v).padStart(4, '0') }); }
    eachIf.call(this, (i) => { i.accessVlan = v; });
  });
  reg('if', 'no switchport access vlan', '', function () { eachIf.call(this, (i) => { i.accessVlan = 1; }); });
  reg('if', 'no switchport mode', '', function () { eachIf.call(this, (i) => { i.mode = 'auto'; }); });
  reg('if', 'switchport trunk encapsulation dot1q', '', function (a, P) {
    if (this.dev.kind === 'switch') { this.stats.errors++; P({ err: " ".repeat(this.prompt().length + 17) + '^' }); P({ err: "% Invalid input detected at '^' marker.\n" }); return; }
    eachIf.call(this, (i) => { i.trunkEncap = true; });
  });
  reg('if', 'switchport trunk native vlan <v:vlan>', 'Set native VLAN when interface is in trunking mode', function (a) { eachIf.call(this, (i) => { i.native = +a.v; }); });
  reg('if', 'no switchport trunk native vlan', '', function () { eachIf.call(this, (i) => { i.native = 1; }); });
  reg('if', 'switchport trunk allowed vlan <l:vlanlist>', 'Set allowed VLANs when interface is in trunking mode', function (a) { const s = parseVlanList(a.l); eachIf.call(this, (i) => { i.allowed = new Set(s); }); });
  reg('if', 'switchport trunk allowed vlan all', '', function () { eachIf.call(this, (i) => { i.allowed = null; }); });
  reg('if', 'switchport trunk allowed vlan none', '', function () { eachIf.call(this, (i) => { i.allowed = new Set(); }); });
  reg('if', 'switchport trunk allowed vlan add <l:vlanlist>', '', function (a) { const s = parseVlanList(a.l); eachIf.call(this, (i) => { if (i.allowed) s.forEach((v) => i.allowed.add(v)); }); });
  reg('if', 'switchport trunk allowed vlan remove <l:vlanlist>', '', function (a) { const s = parseVlanList(a.l); eachIf.call(this, (i) => { const cur = i.allowed ? new Set(i.allowed) : new Set(ALL); s.forEach((v) => cur.delete(v)); i.allowed = cur; }); });
  reg('if', 'switchport trunk allowed vlan except <l:vlanlist>', '', function (a) { const s = parseVlanList(a.l); eachIf.call(this, (i) => { const cur = new Set(ALL); s.forEach((v) => cur.delete(v)); i.allowed = cur; }); });
  reg('if', 'no switchport trunk allowed vlan', '', function () { eachIf.call(this, (i) => { i.allowed = null; }); });
  reg('if', 'switchport voice vlan <v:vlan>', '', function (a, P) { const v = +a.v; if (!this.dev.vlans.has(v)) this.dev.vlans.set(v, { id: v, name: 'VLAN' + String(v).padStart(4, '0') }); eachIf.call(this, (i) => { i.voice = v; }); });
  reg('if', 'no switchport voice vlan', '', function () { eachIf.call(this, (i) => { i.voice = null; }); });
  reg('if', 'spanning-tree portfast', '', function () {});
  reg('if', 'spanning-tree bpduguard enable', '', function () {});
  reg('if', 'switchport port-security', '', function () {});
  // common interface commands
  const commonIf = ['if', 'rif', 'svi', 'sub'];
  reg(commonIf, 'shutdown', 'Shutdown the selected interface', function (a, P) { eachIf.call(this, (i) => { const w = this.topo.ifUp(this.dev, i.name); i.shut = true; this.linkMsgs(P, i, w); }); });
  reg(commonIf, 'no shutdown', '', function (a, P) { eachIf.call(this, (i) => { const w = this.topo.ifUp(this.dev, i.name); i.shut = false; this.linkMsgs(P, i, w); if (i.kind === 'svi' && this.topo.sviUp(this.dev, i.vlan)) { P('%LINK-5-CHANGED: Interface ' + i.name + ', changed state to up'); P('%LINEPROTO-5-UPDOWN: Line protocol on Interface ' + i.name + ', changed state to up'); } if (i.kind === 'sub' && !this.dev.ifaces[i.parent].shut) { P('%LINK-5-CHANGED: Interface ' + i.name + ', changed state to up'); } }); });
  reg(commonIf, 'description <d:rest>', '', function (a) { eachIf.call(this, (i) => { i.desc = a.d; }); });
  reg(commonIf, 'no description', '', function () { eachIf.call(this, (i) => { i.desc = ''; }); });
  reg(['rif', 'svi', 'sub'], 'ip address <ip:ip> <mask:ip>', 'Set the IP address of an interface', function (a, P) {
    if (!/^(255|254|252|248|240|224|192|128|0)\./.test(a.mask)) { this.stats.errors++; P({ err: '% Bad mask ' + a.mask }); return; }
    eachIf.call(this, (i) => { i.ip = a.ip; i.mask = a.mask; });
  });
  reg(['rif', 'svi', 'sub'], 'no ip address', '', function () { eachIf.call(this, (i) => { i.ip = null; i.mask = null; }); });
  reg('sub', 'encapsulation dot1q <v:vlan>', 'IEEE 802.1Q Virtual LAN', function (a) { eachIf.call(this, (i) => { i.encap = +a.v; i.encapNative = false; }); });
  reg('sub', 'encapsulation dot1q <v:vlan> native', '', function (a) { eachIf.call(this, (i) => { i.encap = +a.v; i.encapNative = true; }); });
  reg('sub', 'no encapsulation dot1q', '', function () { eachIf.call(this, (i) => { i.encap = null; }); });
  reg('rif', 'duplex <d:word>', '', function () {}); reg('rif', 'speed <d:word>', '', function () {});
  reg('if', 'duplex <d:word>', '', function () {}); reg('if', 'speed <d:word>', '', function () {});

  // --- save
  const saveCfg = function (a, P) { P('Destination filename [startup-config]? '); P('Building configuration...'); P('[OK]'); this.dev.saved = this.dev.runningConfig(); };
  reg('priv', 'copy running-config startup-config', '', saveCfg);
  reg('priv', 'write memory', '', function (a, P) { P('Building configuration...'); P('[OK]'); this.dev.saved = this.dev.runningConfig(); });
  reg('priv', 'write', '', function (a, P) { P('Building configuration...'); P('[OK]'); this.dev.saved = this.dev.runningConfig(); });
  reg('priv', 'erase startup-config', '', function (a, P) { P('Erase of nvram: complete'); this.dev.saved = null; });

  // --- ping
  const doPing = function (a, P) {
    const dev = this.dev, ok = this.topo.devPing(dev, a.ip);
    P('Type escape sequence to abort.'); P('Sending 5, 100-byte ICMP Echos to ' + a.ip + ', timeout is 2 seconds:');
    P(ok ? '!!!!!' : '.....'); P('Success rate is ' + (ok ? '100' : '0') + ' percent (' + (ok ? '5' : '0') + '/5)' + (ok ? ', round-trip min/avg/max = 1/1/2 ms' : ''));
    this.stats.used.ping = 1;
  };
  reg(['user', 'priv'], 'ping <ip:ip>', 'Send echo messages', doPing);

  // ------------------------------------------------------------------ show commands
  const SHOW_MODES = ['user', 'priv'];
  const sortIfs = (dev, list) => list.slice().sort((a, b) => dev.order.indexOf(a) - dev.order.indexOf(b));
  const shortPort = (n) => shortOf(n);

  function portsOfVlan(dev, v) {
    const out = [];
    for (const n of dev.order) {
      const i = dev.ifaces[n];
      if (dev.isRouter) continue;
      if (i.mode === 'trunk') continue;
      // dynamic ports that negotiated trunk are not listed either
      if (dev.topo.ifUp(dev, n) && dev.topo.opMode(dev, n) === 'trunk') continue;
      if (i.accessVlan === v) out.push(shortPort(n));
    }
    return out;
  }
  function wrapPorts(ports) { // wrap like IOS: ~31 char lines
    const lines = []; let cur = '';
    ports.forEach((p) => { const add = cur ? cur + ', ' + p : p; if (add.length > 31 && cur) { lines.push(cur); cur = p; } else cur = add; });
    if (cur) lines.push(cur);
    return lines;
  }
  function showVlanBrief(dev, filter) {
    const L = ['', 'VLAN Name                             Status    Ports', '---- -------------------------------- --------- -------------------------------'];
    const ids = [...dev.vlans.keys()].sort((a, b) => a - b);
    const std = [[1002, 'fddi-default'], [1003, 'token-ring-default'], [1004, 'fddinet-default'], [1005, 'trnet-default']];
    const rows = ids.map((id) => ({ id, name: dev.vlans.get(id).name, status: 'active', ports: portsOfVlan(dev, id) })).concat(std.map(([id, n]) => ({ id, name: n, status: 'act/unsup', ports: [] })));
    rows.sort((a, b) => a.id - b.id);
    rows.filter((r) => !filter || filter(r)).forEach((r) => {
      const pl = wrapPorts(r.ports);
      L.push(padE(String(r.id), 5) + padE(r.name, 33) + padE(r.status, 10) + (pl[0] || ''));
      pl.slice(1).forEach((l) => L.push(' '.repeat(48) + l));
    });
    return L;
  }
  const fmtVlanDetail = (dev, filter) => {
    const L = showVlanBrief(dev, filter);
    return L;
  };
  reg(SHOW_MODES, 'show vlan brief', 'VTP all VLAN status in brief', function (a, P) { this.stats.shows.vlanBrief = 1; showVlanBrief(this.dev).forEach(P); });
  reg(SHOW_MODES, 'show vlan', '', function (a, P) {
    this.stats.shows.vlanBrief = 1;
    const dev = this.dev; showVlanBrief(dev).forEach(P);
    P(''); P('VLAN Type  SAID       MTU   Parent RingNo BridgeNo Stp  BrdgMode Trans1 Trans2'); P('---- ----- ---------- ----- ------ ------ -------- ---- -------- ------ ------');
    [...dev.vlans.keys()].sort((x, y) => x - y).forEach((id) => P(padE(String(id), 5) + 'enet  ' + padE(String(100000 + id), 11) + '1500  -      -      -        -    -        0      0'));
    P(''); P('Remote SPAN VLANs'); P('------------------------------------------------------------------------------'); P(''); P('Primary Secondary Type              Ports'); P('------- --------- ----------------- ------------------------------------------');
  });
  reg(SHOW_MODES, 'show vlan id <id:vlan>', '', function (a, P) {
    this.stats.shows.vlanBrief = 1;
    const id = +a.id; if (!this.dev.vlans.has(id)) { P('VLAN id ' + id + ' not found in current VLAN database'); return; }
    showVlanBrief(this.dev, (r) => r.id === id).forEach(P);
  });
  reg(SHOW_MODES, 'show vlan name <n:word>', '', function (a, P) {
    const v = [...this.dev.vlans.values()].find((x) => x.name.toLowerCase() === a.n.toLowerCase());
    if (!v) { P('VLAN name ' + a.n + ' not found in current VLAN database'); return; }
    showVlanBrief(this.dev, (r) => r.id === v.id).forEach(P);
  });

  function trunkPorts(dev) { return dev.order.filter((n) => { const i = dev.ifaces[n]; return !dev.isRouter && dev.topo.ifUp(dev, n) && dev.topo.opMode(dev, n) === 'trunk'; }); }
  function showTrunk(dev) {
    const ports = trunkPorts(dev); if (!ports.length) return [];
    const L = [], sect = (title, fn) => { L.push(''); L.push(padE('Port', 12) + title); ports.forEach((n) => L.push(padE(shortPort(n), 12) + fn(n, dev.ifaces[n]))); };
    L.push(padE('Port', 12) + padE('Mode', 13) + padE('Encapsulation', 15) + padE('Status', 14) + 'Native vlan');
    ports.forEach((n) => { const i = dev.ifaces[n]; const mode = i.mode === 'trunk' ? 'on' : i.mode === 'desirable' ? 'desirable' : 'auto'; L.push(padE(shortPort(n), 12) + padE(mode, 13) + padE('802.1q', 15) + padE('trunking', 14) + i.native); });
    const act = (i) => { const s = new Set(); (i.allowed || ALL).forEach((v) => { if (dev.vlans.has(v)) s.add(v); }); return s; };
    sect('Vlans allowed on trunk', (n, i) => compress(i.allowed || ALL, true));
    sect('Vlans allowed and active in management domain', (n, i) => compress(act(i)));
    sect('Vlans in spanning tree forwarding state and not pruned', (n, i) => compress(act(i)));
    return L;
  }
  reg(SHOW_MODES, 'show interfaces trunk', 'Show interface trunk information', function (a, P) { this.stats.shows.trunk = 1; const r = showTrunk(this.dev); if (!r.length) return; r.forEach(P); });
  reg(SHOW_MODES, 'show interfaces status', '', function (a, P) {
    this.stats.shows.status = 1; const dev = this.dev;
    P(padE('Port', 10) + padE('Name', 19) + padE('Status', 13) + padE('Vlan', 11) + padE('Duplex', 8) + padE('Speed', 6) + 'Type');
    dev.order.forEach((n) => {
      const i = dev.ifaces[n], up = dev.topo.ifUp(dev, n); let st = 'notconnect', vl = '1';
      const om = dev.isRouter ? 'routed' : dev.topo.opMode(dev, n);
      if (i.shut) st = 'disabled'; else if (up) st = 'connected';
      if (dev.isRouter) vl = 'routed'; else if (om === 'trunk' && up) vl = 'trunk'; else { vl = String(i.accessVlan); if (up && !dev.vlans.has(i.accessVlan)) st = 'inactive'; else if (!up && !i.shut && !dev.vlans.has(i.accessVlan)) st = 'inactive'; }
      const fa = n.startsWith('Fast');
      P(padE(shortPort(n), 10) + padE(i.desc.slice(0, 18), 19) + padE(st, 13) + padE(vl, 11) + padE(up ? 'a-full' : 'auto', 8) + padE(up ? (fa ? 'a-100' : 'a-1000') : 'auto', 6) + (fa ? '10/100BaseTX' : '10/100/1000BaseTX'));
    });
  });
  const swport = (dev, i, P) => {
    const om = dev.topo.ifUp(dev, i.name) ? dev.topo.opMode(dev, i.name) : null;
    const admin = i.mode === 'auto' ? 'dynamic auto' : i.mode === 'desirable' ? 'dynamic desirable' : i.mode === 'trunk' ? 'trunk' : 'static access';
    const oper = om === null ? 'down' : om === 'trunk' ? 'trunk' : 'static access';
    const vn = (v) => v + ' (' + (dev.vlans.has(v) ? dev.vlans.get(v).name : 'Inactive') + ')';
    P('Name: ' + i.short); P('Switchport: Enabled'); P('Administrative Mode: ' + admin); P('Operational Mode: ' + oper);
    P('Administrative Trunking Encapsulation: dot1q'); P('Operational Trunking Encapsulation: ' + (om === 'trunk' ? 'dot1q' : 'native'));
    P('Negotiation of Trunking: ' + (i.mode === 'access' || i.mode === 'trunk' || i.nonegotiate ? 'Off' : 'On'));
    P('Access Mode VLAN: ' + i.accessVlan + ' (' + (dev.vlans.has(i.accessVlan) ? dev.vlans.get(i.accessVlan).name : 'Inactive') + ')');
    P('Trunking Native Mode VLAN: ' + vn(i.native).replace('Inactive', 'default')); P('Administrative Native VLAN tagging: enabled');
    P('Voice VLAN: ' + (i.voice || 'none')); P('Administrative private-vlan host-association: none'); P('Administrative private-vlan mapping: none'); P('Administrative private-vlan trunk native VLAN: none');
    P('Administrative private-vlan trunk Native VLAN tagging: enabled'); P('Administrative private-vlan trunk encapsulation: dot1q'); P('Administrative private-vlan trunk normal VLANs: none'); P('Administrative private-vlan trunk associations: none'); P('Administrative private-vlan trunk mappings: none'); P('Operational private-vlan: none');
    P('Trunking VLANs Enabled: ' + (i.allowed ? compress(i.allowed) : 'ALL')); P('Pruning VLANs Enabled: 2-1001'); P('Capture Mode Disabled'); P('Capture VLANs Allowed: ALL'); P(''); P('Protected: false'); P('Unknown unicast blocked: disabled'); P('Unknown multicast blocked: disabled'); P(''); P('Appliance trust: none');
  };
  reg(SHOW_MODES, 'show interfaces <if:rest>', '', function (a, P) {
    const dev = this.dev; const m = a.if.match(/^(.*?)\s+(switchport|trunk)$/i); const nm = m ? m[1] : a.if; const kind = m ? m[2].toLowerCase() : 'full';
    if (/^description$/i.test(a.if)) { P(padE('Interface', 31) + padE('Status', 17) + padE('Protocol', 9) + 'Description'); dev.order.forEach((n) => { const s = dev.status(n); P(padE(shortPort(n), 31) + padE(s.line === 'up' ? 'up' : s.line === 'administratively down' ? 'admin down' : 'down', 17) + padE(s.proto, 9) + dev.ifaces[n].desc); }); return; }
    if (/^switchport$/i.test(a.if)) { dev.order.forEach((n) => { swport(dev, dev.ifaces[n], P); P(''); }); return; }
    const p = parseIfName(nm); const i = p && dev.ifaces[p.name];
    if (!i) { this.stats.errors++; P({ err: " ".repeat(this.prompt().length + 16) + '^' }); P({ err: "% Invalid input detected at '^' marker.\n" }); return; }
    if (kind === 'switchport') { this.stats.shows.switchport = 1; if (dev.isRouter) { P('% Interface not switchport'); return; } swport(dev, i, P); return; }
    if (kind === 'trunk') { showTrunk(dev).filter((l, k) => k === 0 || l === '' || l.startsWith(i.short) || /^Port/.test(l)).forEach(P); return; }
    const s = dev.status(i.name);
    P(i.name + ' is ' + s.line + ', line protocol is ' + s.proto + (s.line === 'up' ? ' (connected)' : ''));
    P('  Hardware is ' + (i.kind === 'svi' ? 'EtherSVI' : 'Fast Ethernet') + ', address is ' + dev.mac + ' (bia ' + dev.mac + ')');
    if (i.desc) P('  Description: ' + i.desc);
    if (i.ip) P('  Internet address is ' + i.ip + '/' + maskLen(i.mask));
    P('  MTU 1500 bytes, BW 100000 Kbit/sec, DLY 100 usec,'); P('  Encapsulation ' + (i.kind === 'sub' ? '802.1Q Virtual LAN, Vlan ID ' + i.encap : 'ARPA') + ', loopback not set');
  });
  reg(SHOW_MODES, 'show interfaces', '', function (a, P) { this.dev.order.forEach((n) => { const s = this.dev.status(n); P(n + ' is ' + s.line + ', line protocol is ' + s.proto); }); });
  reg(SHOW_MODES, 'show ip interface brief', 'Brief summary of IP status and configuration', function (a, P) {
    this.stats.shows.ipbrief = 1; const dev = this.dev;
    P(padE('Interface', 23) + padE('IP-Address', 16) + padE('OK?', 4) + padE('Method', 7) + padE('Status', 22) + 'Protocol');
    const rows = dev.order.map((n) => dev.ifaces[n]);
    const subs = Object.values(dev.ifaces).filter((i) => i.kind === 'sub'), svis = Object.values(dev.ifaces).filter((i) => i.kind === 'svi').sort((x, y) => x.vlan - y.vlan);
    const all = dev.isRouter ? rows.concat(subs) : rows.concat(svis);
    all.forEach((i) => { if (!dev.isRouter && i.kind === 'phys' && false) return; const s = dev.status(i.name); P(padE(i.name, 23) + padE(i.ip || 'unassigned', 16) + padE('YES', 4) + padE(i.ip ? 'manual' : 'unset', 7) + padE(s.line, 22) + s.proto); });
  });
  reg(SHOW_MODES, 'show ip route', '', function (a, P) {
    const dev = this.dev; if (!dev.routing()) { P('Default gateway is ' + (dev.defaultGateway || 'not set')); return; }
    P('Codes: C - connected, S - static, L - local'); P(''); P('Gateway of last resort is not set'); P('');
    dev.l3ifaces().filter((i) => i.ip && !i.shut && (i.kind !== 'svi' || dev.topo.sviUp(dev, i.vlan)) && (dev.isRouter ? dev.status(i.name).line === 'up' : true)).forEach((i) => { P('C    ' + netOf(i.ip, i.mask) + '/' + maskLen(i.mask) + ' is directly connected, ' + i.name); P('L    ' + i.ip + '/32 is directly connected, ' + i.name); });
  });
  reg(SHOW_MODES, 'show mac address-table', '', function (a, P) {
    this.stats.shows.mac = 1; const dev = this.dev; const rows = dev.topo.macTable(dev);
    P('          Mac Address Table'); P('-------------------------------------------'); P(''); P('Vlan    Mac Address       Type        Ports'); P('----    -----------       --------    -----');
    rows.forEach((r) => P(String(r.vlan).padStart(4) + '    ' + padE(r.mac, 18) + padE('DYNAMIC', 12) + shortPort(r.port)));
    P('Total Mac Addresses for this criterion: ' + rows.length);
  });
  reg(SHOW_MODES, 'show mac address-table vlan <v:vlan>', '', function (a, P) {
    this.stats.shows.mac = 1; const rows = this.dev.topo.macTable(this.dev).filter((r) => r.vlan === +a.v);
    P('          Mac Address Table'); P('-------------------------------------------'); P(''); P('Vlan    Mac Address       Type        Ports'); P('----    -----------       --------    -----');
    rows.forEach((r) => P(String(r.vlan).padStart(4) + '    ' + padE(r.mac, 18) + padE('DYNAMIC', 12) + shortPort(r.port)));
    P('Total Mac Addresses for this criterion: ' + rows.length);
  });
  reg(SHOW_MODES, 'show mac-address-table', '', function (a, P) { this.stats.shows.mac = 1; this.dev.topo.macTable(this.dev).forEach((r) => P(padE(String(r.vlan), 6) + padE(r.mac, 16) + 'DYNAMIC  ' + shortPort(r.port))); });
  reg('priv', 'show running-config', 'Current operating configuration', function (a, P) { this.stats.shows.run = 1; P('Building configuration...'); P(''); const t = this.dev.runningConfig(); P('Current configuration : ' + (t.length + 40) + ' bytes'); t.split('\n').forEach(P); });
  reg('priv', 'show running-config interface <if:rest>', '', function (a, P) {
    this.stats.shows.run = 1; const p = parseIfName(a.if), i = p && this.dev.ifaces[p.name]; if (!i) { P({ err: "% Invalid input detected at '^' marker." }); return; }
    const t = this.dev.runningConfig().split('\n'); const idx = t.indexOf('interface ' + i.name); P('Building configuration...'); P(''); P('Current configuration : 150 bytes'); P('!');
    for (let k = idx; k < t.length && (k === idx || t[k] !== '!'); k++) P(t[k]); P('end');
  });
  reg('priv', 'show startup-config', '', function (a, P) { if (!this.dev.saved) { P('startup-config is not present'); return; } P('Using ' + this.dev.saved.length + ' out of 65536 bytes'); P(''); this.dev.saved.split('\n').forEach(P); });
  reg(SHOW_MODES, 'show version', '', function (a, P) { P('Cisco IOS Software, C2960 Software (C2960-LANBASEK9-M), Version 15.0(2)SE4, RELEASE SOFTWARE (fc1)'); P('ROM: Bootstrap program is C2960 boot loader'); P(this.dev.hostname + ' uptime is 1 hour, 12 minutes'); P('cisco ' + this.dev.model + ' (PowerPC405) processor with 65536K bytes of memory.'); P('Base ethernet MAC Address       : ' + this.dev.mac); });
  reg(SHOW_MODES, 'show cdp neighbors', '', function (a, P) {
    const dev = this.dev; P('Capability Codes: R - Router, S - Switch, H - Host'); P(''); P('Device ID        Local Intrfce     Holdtme    Capability  Platform  Port ID');
    dev.order.forEach((n) => { const p = dev.topo.peerOf(dev.id, n); if (p && p.dev && dev.topo.ifUp(dev, n)) { const pd = dev.topo.devs[p.dev]; P(padE(pd.hostname, 17) + padE(shortPort(n), 18) + padE('150', 11) + padE(pd.isRouter ? 'R' : 'S', 12) + padE(pd.model.slice(0, 8), 10) + shortPort(p.ifn)); } });
  });
  reg('priv', 'show history', '', function (a, P) { this.history.slice(-10).forEach(P); });

  // ------------------------------------------------------------------ host shell (Windows-like)
  class HostShell {
    constructor(topo, hid) { this.topo = topo; this.h = topo.hosts[hid]; this.stats = { cmds: 0, errors: 0, pings: 0, ok: 0 }; this.mode = 'host'; }
    prompt() { return 'C:\\>'; }
    exec(line) {
      const out = [], P = (s) => out.push(s), t = line.trim(); if (!t) return out;
      this.stats.cmds++;
      const [cmd, ...rest] = t.split(/\s+/), c = cmd.toLowerCase(), h = this.h;
      if (c === 'ipconfig') {
        P(''); P('Windows IP Configuration'); P('');
        P('Ethernet adapter Ethernet0:'); P('');
        if (rest[0] && rest[0].toLowerCase() === '/all') { P('   Physical Address. . . . . . . . . : ' + h.mac.replace(/\./g, '-').toUpperCase()); P('   DHCP Enabled. . . . . . . . . . . : No'); }
        const up = !!this.topo.hostPort(h.id) && this.topo.hostDomain(h.id) !== null;
        P('   Connection-specific DNS Suffix  . : ' + (up ? '' : '(media disconnected)'));
        P('   IPv4 Address. . . . . . . . . . . : ' + (h.ip || '0.0.0.0')); P('   Subnet Mask . . . . . . . . . . . : ' + (h.mask || '0.0.0.0')); P('   Default Gateway . . . . . . . . . : ' + (h.gw || '')); P('');
      } else if (c === 'ping') {
        const ip = rest[0]; if (!ip || !validIp(ip)) { this.stats.errors++; P({ err: 'Ping request could not find host ' + (ip || '') + '. Please check the name and try again.' }); return out; }
        this.stats.pings++;
        const r = this.topo.hostPing(h.id, ip);
        P(''); P('Pinging ' + ip + ' with 32 bytes of data:');
        for (let k = 0; k < 4; k++) {
          if (r.ok) P('Reply from ' + ip + ': bytes=32 time<1ms TTL=' + (sameNet(h.ip, ip, h.mask) ? 128 : 127));
          else if (r.why === 'no-route' || r.why === 'no-routing' || r.why === 'l3-down') P({ err: 'Reply from ' + (r.from || h.gw) + ': Destination host unreachable.' });
          else if (r.why === 'link') P({ err: 'PING: transmit failed. General failure.' });
          else P({ err: 'Request timed out.' });
        }
        P(''); P('Ping statistics for ' + ip + ':'); P('    Packets: Sent = 4, Received = ' + (r.ok ? 4 : 0) + ', Lost = ' + (r.ok ? 0 : 4) + ' (' + (r.ok ? 0 : 100) + '% loss),');
        if (r.ok) { P('Approximate round trip times in milli-seconds:'); P('    Minimum = 0ms, Maximum = 0ms, Average = 0ms'); this.stats.ok++; }
      } else if (c === 'help' || c === '?') { P('ipconfig [/all]   ping <ip>   exit'); }
      else if (c === 'exit') { P('(סגרו את החלון או בחרו התקן אחר בלשוניות)'); }
      else { this.stats.errors++; P({ err: "'" + cmd + "' is not recognized as an internal or external command,\noperable program or batch file." }); }
      return out;
    }
    helpFor() { return ['  ipconfig  ping  exit']; }
    complete(t) { return t; }
  }
  sim.HostShell = HostShell;
})(window.VQ);
