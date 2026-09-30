/* VLAN Quest – terminal widget (Cisco-like console) that talks to sim.Session / sim.HostShell */
(function (VQ) {
  const h = VQ.h;
  class Terminal {
    // opts: { tabs: [{id,label,session}], chips: fn(session)->[cmd], onCommand(session, line, out), title }
    constructor(opts) {
      this.opts = opts; this.tabs = opts.tabs; this.buf = {}; this.hist = {}; this.hi = {};
      this.tabs.forEach((t) => { this.buf[t.id] = []; this.hist[t.id] = []; this.hi[t.id] = 0; });
      this.cur = this.tabs[0];
      this.el = h('div', { class: 'term' });
      this.head = h('div', { class: 'th' });
      this.out = h('div', { class: 'out' });
      this.pr = h('span', { class: 'pr' });
      this.inp = h('input', { type: 'text', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', 'aria-label': 'terminal' });
      this.chips = h('div', { class: 'chips' });
      this.el.append(this.head, this.out, h('div', { class: 'inp' }, this.pr, this.inp), this.chips);
      this.el.addEventListener('pointerdown', (e) => e.stopPropagation());
      this.inp.addEventListener('keydown', (e) => this.key(e));
      this.out.addEventListener('click', () => { if (!getSelection().toString()) this.inp.focus(); });
      this.renderHead(); this.renderAll(); this.refreshChips();
    }
    mount(parent) { parent.appendChild(this.el); setTimeout(() => this.inp.focus(), 50); return this; }
    destroy() { this.el.remove(); }
    setChipsEnabled(v) { this.chips.style.display = v ? '' : 'none'; }
    renderHead() {
      this.head.innerHTML = '';
      this.head.appendChild(h('span', {}, this.opts.title || '🖥️ Console'));
      const tabs = h('span', { style: { display: 'flex', gap: '4px', flexWrap: 'wrap' } });
      if (this.tabs.length > 1) this.tabs.forEach((t) => tabs.appendChild(h('span', { class: 'tbtn' + (t === this.cur ? ' on' : ''), onClick: () => this.select(t.id) }, t.label)));
      this.head.appendChild(tabs);
    }
    select(id) { this.cur = this.tabs.find((t) => t.id === id); this.renderHead(); this.renderAll(); this.refreshChips(); this.inp.focus(); if (this.opts.onSelect) this.opts.onSelect(this.cur); }
    get session() { return this.cur.session; }
    promptText() { return this.session.prompt(); }
    renderAll() {
      this.out.innerHTML = '';
      this.buf[this.cur.id].forEach((l) => this.out.appendChild(this.lineEl(l)));
      this.pr.textContent = this.promptText(); this.out.scrollTop = this.out.scrollHeight;
    }
    lineEl(l) { return h('div', { class: l.cls || '' }, l.text); }
    print(text, cls, id) {
      id = id || this.cur.id; const l = { text, cls }; this.buf[id].push(l);
      if (this.buf[id].length > 400) this.buf[id].shift();
      if (id === this.cur.id) { this.out.appendChild(this.lineEl(l)); this.out.scrollTop = this.out.scrollHeight; }
    }
    sys(text) { this.print(text, 'sys'); }
    refreshChips() {
      this.chips.innerHTML = '';
      const list = this.opts.chips ? this.opts.chips(this.session) : [];
      list.forEach((c) => this.chips.appendChild(h('span', { class: 'chip2', onClick: () => { this.inp.value = c; this.inp.focus(); VQ.sfx.play('click'); } }, c)));
      this.chips.style.display = list.length ? '' : 'none';
    }
    run(line, echo = true) {
      const s = this.session, pr = this.promptText();
      if (echo) this.print(pr + line, 'cmd');
      if (line.trim()) { this.hist[this.cur.id].push(line); this.hi[this.cur.id] = this.hist[this.cur.id].length; if (s.history) s.history.push(line); }
      let out = [];
      try { out = s.exec(line) || []; } catch (e) { console.error(e); out = [{ err: '% Internal simulator error' }]; }
      out.forEach((o) => (typeof o === 'string' ? o.split('\n').forEach((x) => this.print(x)) : this.print(o.err, 'err')));
      this.pr.textContent = this.promptText();
      if (this.opts.onCommand) this.opts.onCommand(s, line, out, this.cur);
      this.refreshChips();
    }
    key(e) {
      const id = this.cur.id;
      if (e.key === 'Enter') { const v = this.inp.value; this.inp.value = ''; VQ.sfx.play('type'); this.run(v); }
      else if (e.key === 'Tab') { e.preventDefault(); this.inp.value = this.session.complete(this.inp.value); }
      else if (e.key === '?' && this.session.helpFor) {
        e.preventDefault(); const v = this.inp.value;
        this.print(this.promptText() + v + '?', 'cmd'); this.session.helpFor(v).forEach((l) => this.print(l)); this.stats && 0;
        if (this.session.stats) this.session.stats.help = (this.session.stats.help || 0) + 1;
      }
      else if (e.key === 'ArrowUp') { e.preventDefault(); const H = this.hist[id]; if (this.hi[id] > 0) { this.hi[id]--; this.inp.value = H[this.hi[id]]; } }
      else if (e.key === 'ArrowDown') { e.preventDefault(); const H = this.hist[id]; if (this.hi[id] < H.length - 1) { this.hi[id]++; this.inp.value = H[this.hi[id]]; } else { this.hi[id] = H.length; this.inp.value = ''; } }
      else if (e.key === 'z' && e.ctrlKey) { e.preventDefault(); this.print(this.promptText() + '^Z', 'cmd'); if (this.session.mode && !['user', 'priv', 'host'].includes(this.session.mode)) this.run('end', false); }
      else if (e.key === 'c' && e.ctrlKey && !getSelection().toString()) { e.preventDefault(); this.inp.value = ''; }
      e.stopPropagation();
    }
    // animate typing a command (for "watch me" mode). resolves when finished
    async type(line, cps = 26, alive = () => true) {
      for (let i = 1; i <= line.length; i++) { if (!alive()) return false; this.inp.value = line.slice(0, i); VQ.sfx.play('type'); await new Promise((r) => setTimeout(r, 1000 / cps)); }
      await new Promise((r) => setTimeout(r, 260));
      if (!alive()) return false;
      this.inp.value = ''; this.run(line); return true;
    }
    replaceSessions(map) {
      this.tabs.forEach((t) => { if (map[t.id]) t.session = map[t.id]; this.buf[t.id] = []; this.hist[t.id] = []; this.hi[t.id] = 0; });
      this.inp.value = ''; this.renderAll(); this.refreshChips();
    }
  }
  VQ.Terminal = Terminal;

  // helper: create a topology with one switch and hosts – used by several scenes
  VQ.Terminal.suggest = function (session) {
    const m = session.mode; const S = {
      user: ['enable', 'show vlan brief'], priv: ['configure terminal', 'show vlan brief', 'show interfaces trunk', 'show running-config', 'copy running-config startup-config'],
      config: ['vlan 10', 'interface fastEthernet 0/1', 'interface range fastEthernet 0/1 - 4', 'hostname SW1', 'end'],
      if: ['switchport mode access', 'switchport access vlan 10', 'switchport mode trunk', 'switchport trunk allowed vlan 10,20', 'switchport trunk native vlan 99', 'no shutdown', 'exit'],
      ifrange: ['switchport mode access', 'switchport access vlan 10', 'exit'], vlan: ['name SALES', 'exit'],
      sub: ['encapsulation dot1Q 10', 'ip address 192.168.10.1 255.255.255.0', 'exit'], rif: ['no shutdown', 'ip address 192.168.1.1 255.255.255.0', 'exit'], svi: ['ip address 192.168.99.2 255.255.255.0', 'no shutdown', 'exit'],
      host: ['ipconfig', 'ping 192.168.10.1'],
    };
    return S[m] || [];
  };
})(window.VQ);
