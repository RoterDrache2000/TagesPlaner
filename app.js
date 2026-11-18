/* app.js – startet die App und schaltet zwischen den Tabs um. */
(function (TP) {
  const h = TP.h;
  const TABS = [
    ['heute', 'Heute', 'sun'],
    ['planen', 'Planen', 'cal'],
    ['gewohnheiten', 'Gewohnheiten', 'habit'],
    ['listen', 'Listen', 'list'],
    ['rueckblick', 'Rückblick', 'chart']
  ];
  let current = 'heute';
  let lastDay = null;

  TP.go = function (tab) {
    if (location.hash !== '#' + tab) location.hash = tab; else route();
  };

  function route() {
    const t = location.hash.slice(1);
    const next = TABS.some((x) => x[0] === t) ? t : 'heute';
    const changed = next !== current;
    current = next;
    TP.render();
    if (changed) window.scrollTo(0, 0);
  }

  TP.render = function () {
    const root = document.getElementById('view');
    const y = window.scrollY;
    root.innerHTML = '';
    lastDay = TP.today();
    TP.views[current](root);
    document.querySelectorAll('.tab').forEach((b) => b.toggleAttribute('aria-current', false));
    const cur = document.querySelector('.tab[data-tab="' + current + '"]');
    if (cur) cur.setAttribute('aria-current', 'page');
    window.scrollTo(0, y);
  };

  function start() {
    TP.load();
    const bar = document.getElementById('tabbar');
    TABS.forEach(([id, label, icon]) => bar.append(h('button.tab', { 'data-tab': id, onclick: () => { if (id === current && TP.resetTab && TP.resetTab[id]) TP.resetTab[id](); TP.go(id); }, html: TP.icon(icon) + '<span>' + label + '</span>' })));
    window.addEventListener('hashchange', route);
    // Kein Zoomen: Zwei-Finger-Zoom (Safari ignoriert user-scalable=no) und Doppeltippen (über CSS touch-action)
    ['gesturestart', 'gesturechange', 'gestureend'].forEach((n) => document.addEventListener(n, (e) => e.preventDefault(), { passive: false }));
    document.addEventListener('touchmove', (e) => { if (e.touches.length > 1 || (e.scale && e.scale !== 1)) e.preventDefault(); }, { passive: false });
    // iPhone: Tippen neben ein Eingabefeld schließt die Tastatur
    document.addEventListener('touchstart', (e) => {
      const a = document.activeElement;
      if (!a || !/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) return;
      if (e.target.closest('input,textarea,select,button,label,a')) return;
      a.blur();
    }, { passive: true });
    document.addEventListener('mousedown', (e) => {
      const a = document.activeElement;
      if (a && /^(INPUT|TEXTAREA)$/.test(a.tagName) && !e.target.closest('input,textarea,select,button,label,a')) a.blur();
    });
    // Neuer Tag oder neue Tageszeit: beim Zurückkehren in die App neu zeichnen
    document.addEventListener('visibilitychange', () => { if (!document.hidden && !document.querySelector('.scrim,.focus')) TP.render(); });
    setInterval(() => { if (TP.today() !== lastDay && !document.querySelector('.scrim,.focus')) TP.render(); }, 60000);
    route();
    if ('serviceWorker' in navigator && location.protocol === 'https:' && !window.TP_DEV) navigator.serviceWorker.register('sw.js').catch(() => {});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})(window.TP);
