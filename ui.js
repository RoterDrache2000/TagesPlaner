/* ui.js – kleine Bausteine: Elemente bauen, Icons, Bottom-Sheet, Rückfrage, Hinweis. */
(function (TP) {
  // h('div.class', {attrs}, kinder...) baut ein Element
  TP.h = function (tag, attrs, ...kids) {
    const [base, id] = tag.split('#');
    const [name, ...cls] = base.split('.');
    const e = document.createElement(name || 'div');
    if (id) e.id = id;
    if (cls.length) e.className = cls.join(' ');
    if (attrs) for (const k in attrs) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else if (k === 'html') e.innerHTML = v;
      else if (k === 'style') e.style.cssText = v;
      else e.setAttribute(k, v === true ? '' : v);
    }
    kids.flat(9).forEach((c) => { if (c == null || c === false) return; e.append(c.nodeType ? c : document.createTextNode(String(c))); });
    return e;
  };
  const h = TP.h;

  const P = {
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    cal: '<rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    habit: '<path d="M5 12l4 4 10-10"/><path d="M5 19h14" opacity=".5"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    play: '<path d="M7 5v14l11-7z"/>',
    more: '<circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/>',
    chev: '<path d="M9 6l6 6-6 6"/>',
    down: '<path d="M6 9l6 6 6-6"/>',
    up: '<path d="M6 15l6-6 6 6"/>',
    left: '<path d="M15 6l-6 6 6 6"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/>'
  };
  TP.icon = (name, cls) => '<svg class="ico' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" aria-hidden="true">' + P[name] + '</svg>';
  TP.ic = (name, cls) => h('span', { html: TP.icon(name, cls), style: 'display:contents' });
  TP.boxEl = () => h('span.box', { html: '<svg viewBox="0 0 24 24">' + P.check + '</svg>' });

  // Seitenkopf
  TP.head = (eyebrow, title, right) => h('div.head', null, h('div', null, h('p.eyebrow', null, eyebrow), h('h1.big', null, title)), right || null);
  TP.secH = (title, right) => h('div.sec-h', null, h('h3', null, title), right || null);

  // Hinweis unten
  let toastT;
  TP.toast = function (text) {
    document.querySelectorAll('.toast').forEach((t) => t.remove());
    const t = h('div.toast', { role: 'status' }, text);
    document.body.append(t);
    clearTimeout(toastT); toastT = setTimeout(() => t.remove(), 2600);
  };

  // Bottom-Sheet
  TP.sheet = function (title, body, opts) {
    opts = opts || {};
    const scrim = h('div.scrim');
    const close = () => { scrim.remove(); document.removeEventListener('keydown', esc); if (opts.onClose) opts.onClose(); };
    const esc = (e) => { if (e.key === 'Escape') close(); };
    const sheet = h('div.sheet', { role: 'dialog', 'aria-modal': 'true', 'aria-label': title }, h('div.grab'), title ? h('h2', null, title) : null, body);
    scrim.append(sheet);
    scrim.addEventListener('click', (e) => { if (e.target === scrim) close(); });
    document.addEventListener('keydown', esc);
    document.body.append(scrim);
    return { close, el: sheet };
  };

  // Rückfrage (statt confirm(), das in manchen Ansichten nicht geht)
  TP.ask = function (title, text, okLabel, danger) {
    return new Promise((res) => {
      let answered = false;
      const s = TP.sheet(title, h('div', { style: 'display:flex;flex-direction:column;gap:16px' },
        text ? h('p', null, text) : null,
        h('div.btnrow', null,
          h('button.btn.ghost', { onclick: () => { answered = true; s.close(); res(false); } }, 'Abbrechen'),
          h('button.btn.' + (danger ? 'primary' : 'accent'), { onclick: () => { answered = true; s.close(); res(true); }, style: danger ? 'background:var(--danger);color:#fff' : null }, okLabel || 'OK'))),
        { onClose: () => { if (!answered) res(false); } });
    });
  };

  // Aktionsliste (z. B. „Auf morgen“, „Löschen“)
  TP.actions = function (title, items) {
    const s = TP.sheet(title, h('div.list', null, items.map((it) =>
      h('button.row', { onclick: () => { s.close(); it.run(); }, style: it.danger ? 'color:var(--danger)' : null }, h('span.t', null, it.label)))));
  };

  // Segment-Schalter
  TP.seg = function (options, value, onChange) {
    const wrap = h('div.seg', { role: 'group' });
    options.forEach(([v, label]) => wrap.append(h('button', { type: 'button', 'aria-pressed': String(v === value), onclick: () => {
      wrap.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', 'false'));
      wrap.querySelector('[data-v="' + v + '"]').setAttribute('aria-pressed', 'true'); onChange(v);
    }, 'data-v': v }, label)));
    return wrap;
  };

  // Wochentag-Auswahl
  TP.dayChips = function (days, onChange) {
    const sel = days.slice();
    const wrap = h('div.chips');
    TP.WD.forEach((d, i) => wrap.append(h('button', { type: 'button', 'aria-pressed': String(sel.includes(i)), onclick: (e) => {
      const k = sel.indexOf(i);
      if (k >= 0) { if (sel.length > 1) sel.splice(k, 1); } else sel.push(i);
      e.currentTarget.setAttribute('aria-pressed', String(sel.includes(i)));
      onChange(sel.slice().sort());
    } }, d)));
    return wrap;
  };

  // Zweimal tippen zum Löschen
  TP.armBtn = function (label, armedLabel, fn, cls) {
    let t;
    const b = h('button' + (cls ? '.' + cls : ''), { type: 'button', 'aria-label': label, html: label.startsWith('<') ? label : null }, label.startsWith('<') ? null : label);
    const orig = b.innerHTML;
    b.addEventListener('click', () => {
      if (b.classList.contains('armed')) { clearTimeout(t); return fn(); }
      b.classList.add('armed'); b.textContent = armedLabel;
      t = setTimeout(() => { b.classList.remove('armed'); b.innerHTML = orig; }, 2500);
    });
    return b;
  };

  TP.greeting = function () {
    const m = TP.minutesNow();
    if (m < 4 * 60) return 'Gute Nacht.';
    if (m < 11 * 60) return 'Guten Morgen.';
    if (m < 17 * 60 + 30) return 'Guten Tag.';
    return 'Guten Abend.';
  };
  TP.longDate = (s) => TP.parse(s).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
})(window.TP);
