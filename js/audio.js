/* VLAN Quest – synthesized sound (no assets needed) */
(function (VQ) {
  let ctx = null, master = null, muted = false, musicOn = false, musicTimer = null, step = 0;
  function ac() {
    if (!ctx) {
      try { ctx = new (window.AudioContext || window.webkitAudioContext)(); master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination); } catch (e) { ctx = null; }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function tone(f, d = 0.12, type = 'sine', vol = 0.2, slide = 0, delay = 0) {
    const c = ac(); if (!c || muted) return;
    const t = c.currentTime + delay;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + d + 0.02);
  }
  function noise(d = 0.15, vol = 0.15, freq = 1200, delay = 0) {
    const c = ac(); if (!c || muted) return;
    const t = c.currentTime + delay, n = Math.floor(c.sampleRate * d), buf = c.createBuffer(1, n, c.sampleRate), data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = c.createBufferSource(); s.buffer = buf;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq;
    const g = c.createGain(); g.gain.value = vol;
    s.connect(f); f.connect(g); g.connect(master); s.start(t);
  }
  const S = {
    click: () => tone(520, 0.06, 'triangle', 0.15),
    ok: () => { tone(660, 0.09, 'triangle', 0.18); tone(990, 0.12, 'triangle', 0.16, 0, 0.07); },
    bad: () => { tone(200, 0.22, 'sawtooth', 0.16, -80); },
    pop: () => tone(300 + Math.random() * 200, 0.08, 'square', 0.08, 300),
    zap: () => { noise(0.12, 0.16, 2500); tone(900, 0.1, 'square', 0.08, -600); },
    whoosh: () => noise(0.3, 0.1, 700),
    coin: () => { tone(880, 0.07, 'square', 0.1); tone(1320, 0.14, 'square', 0.1, 0, 0.06); },
    tick: () => tone(1000, 0.03, 'square', 0.05),
    type: () => tone(700 + Math.random() * 300, 0.025, 'square', 0.04),
    alarm: () => { tone(440, 0.15, 'sawtooth', 0.12); tone(330, 0.15, 'sawtooth', 0.12, 0, 0.17); },
    level: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, 'triangle', 0.18, 0, i * 0.09)),
    fanfare: () => { [523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'triangle', 0.2, 0, i * 0.13)); tone(1568, 0.6, 'sine', 0.15, 0, 0.8); },
    lose: () => [400, 330, 262, 196].forEach((f, i) => tone(f, 0.25, 'sawtooth', 0.12, 0, i * 0.16)),
    boom: () => { noise(0.4, 0.3, 200); tone(90, 0.3, 'sine', 0.3, -50); },
  };
  VQ.sfx = {
    play(n) { try { (S[n] || S.click)(); } catch (e) { /* ignore */ } },
    get muted() { return muted; },
    setMuted(m) { muted = m; try { localStorage.setItem('vq_muted', m ? '1' : '0'); } catch (e) { /* ignore */ } if (m) VQ.sfx.music(false); },
    music(on) {
      musicOn = on;
      if (!on) { clearInterval(musicTimer); musicTimer = null; return; }
      if (musicTimer || muted) return;
      const scale = [0, 3, 5, 7, 10, 12, 15, 12, 10, 7, 5, 3];
      musicTimer = setInterval(() => {
        if (muted || !musicOn) return;
        const base = 110 * Math.pow(2, ((step >> 4) % 4 === 3 ? 5 : (step >> 4) % 4 === 2 ? 3 : 0) / 12);
        if (step % 2 === 0) tone(base, 0.28, 'triangle', 0.05);
        if (step % 4 === 0) tone(base * 2 * Math.pow(2, scale[(step / 2) % scale.length] / 12), 0.2, 'sine', 0.035);
        step++;
      }, 240);
    },
    unlock() { ac(); },
    init() { try { muted = localStorage.getItem('vq_muted') === '1'; } catch (e) { /* ignore */ } },
  };
})(window.VQ);
