/* VLAN Quest – utilities */
window.VQ = window.VQ || {};
(function (VQ) {
  VQ.$ = (s, r = document) => r.querySelector(s);
  VQ.$$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  // tiny DOM builder: h('div', {class:'x', onClick:fn}, 'text', childNode)
  VQ.h = function (tag, props, ...kids) {
    const e = document.createElement(tag);
    for (const k in (props || {})) {
      const v = props[k];
      if (v == null || v === false) continue;
      if (k === 'class') e.className = v;
      else if (k === 'html') e.innerHTML = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
      else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2).toLowerCase(), v);
      else e.setAttribute(k, v === true ? '' : v);
    }
    const add = (c) => {
      if (c == null || c === false) return;
      if (Array.isArray(c)) c.forEach(add);
      else if (c instanceof Node) e.appendChild(c);
      else e.appendChild(document.createTextNode(String(c)));
    };
    kids.forEach(add);
    return e;
  };

  VQ.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  VQ.lerp = (a, b, t) => a + (b - a) * t;
  VQ.rand = (a, b) => a + Math.random() * (b - a);
  VQ.randInt = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
  VQ.pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  VQ.shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };
  VQ.fmt = (n) => Math.round(n).toLocaleString('he-IL');
  VQ.css = (hex) => '#' + hex.toString(16).padStart(6, '0');
  VQ.fmtTime = (s) => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  VQ.esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  // wrap latin technical text so bidi behaves inside Hebrew sentences
  VQ.code = (s) => '<code dir="ltr">' + VQ.esc(s) + '</code>';
  VQ.hasHeb = (s) => /[֐-׿]/.test(s);

  // parse "**bold**" and `code` inside lesson text
  VQ.rich = (s) => VQ.esc(s)
    .replace(/`([^`]+)`/g, '<code dir="ltr">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    .replace(/\n/g, '<br>');

  VQ.hash = (str) => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
  VQ.isTouch = () => matchMedia('(pointer:coarse)').matches;
})(window.VQ);
