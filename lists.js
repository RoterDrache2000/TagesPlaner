/* lists.js – der Tab „Listen“: eigene Listen (z. B. „Wohnung“, „Küche“) mit Punkten zum Abhaken. */
(function (TP) {
  const h = TP.h;
  TP.views = TP.views || {};
  let openId = null; // welche Liste gerade offen ist (null = Übersicht)

  // Nochmal auf den Tab tippen führt zurück zur Übersicht
  TP.resetTab = TP.resetTab || {};
  TP.resetTab.listen = () => { openId = null; };

  const focusLater = (id) => setTimeout(() => { const i = document.getElementById(id); if (i) i.focus(); }, 0);
  const countText = (l) => {
    const done = l.items.filter((x) => x.done).length;
    if (!l.items.length) return 'Noch leer';
    return done === l.items.length ? 'Alles erledigt' : (l.items.length - done) + ' offen' + (done ? ' · ' + done + ' erledigt' : '');
  };

  TP.views.listen = function (root) {
    const list = openId && TP.data.lists.find((l) => l.id === openId);
    if (list) return detail(root, list);
    openId = null;
    overview(root);
  };

  // ---------- Übersicht ----------
  function overview(root) {
    root.append(TP.head('Notizen zum Abhaken', 'Listen'));
    const input = h('input.input#newList', { type: 'text', placeholder: 'Neue Liste, z. B. Küche', autocomplete: 'off', enterkeyhint: 'done', 'aria-label': 'Neue Liste' });
    root.append(h('form.addbar', { onsubmit: (e) => {
      e.preventDefault();
      const name = input.value.trim(); if (!name) return;
      const l = { id: TP.uid(), name, items: [], created: TP.today() };
      TP.data.lists.push(l);
      TP.save();
      openId = l.id; TP.render(); window.scrollTo(0, 0);
      focusLater('newItem');
    } }, input, h('button.btn.accent', { type: 'submit', 'aria-label': 'Liste anlegen', html: TP.icon('plus') })));

    const lists = TP.data.lists;
    if (!lists.length) {
      root.append(h('div.list', null, h('p.empty', null, 'Noch keine Listen. Lege oben eine an, z. B. „Wohnung“ oder „Einkaufen“.')));
      return;
    }
    root.append(h('div.list', null, lists.map((l) => {
      const all = l.items.length, done = l.items.filter((x) => x.done).length;
      const fin = all && done === all;
      return h('button.row' + (fin ? '.ok' : ''), { onclick: () => { openId = l.id; TP.render(); window.scrollTo(0, 0); } },
        h('span.lprog', { 'aria-hidden': 'true', style: '--p:' + (all ? Math.round(done / all * 100) : 0) }),
        h('span.t', null, l.name, h('small', null, countText(l))),
        TP.ic('chev', 'chev'));
    })));
  }

  // ---------- Eine Liste ----------
  function detail(root, l) {
    root.append(h('button.back', { onclick: () => { openId = null; TP.render(); window.scrollTo(0, 0); } }, TP.ic('left'), 'Listen'));
    root.append(TP.head(countText(l), l.name, h('button.iconbtn', { 'aria-label': 'Optionen für die Liste', html: TP.icon('more'), onclick: () => listMenu(l) })));

    const input = h('input.input#newItem', { type: 'text', placeholder: 'Punkt hinzufügen, z. B. Couch', autocomplete: 'off', enterkeyhint: 'done', 'aria-label': 'Punkt hinzufügen' });
    root.append(h('form.addbar', { onsubmit: (e) => {
      e.preventDefault();
      const text = input.value.trim(); if (!text) return;
      l.items.push({ id: TP.uid(), text, done: null });
      TP.save(); TP.render();
      focusLater('newItem');
    } }, input, h('button.btn.accent', { type: 'submit', 'aria-label': 'Hinzufügen', html: TP.icon('plus') })));

    const open = l.items.filter((x) => !x.done), done = l.items.filter((x) => x.done);
    if (!l.items.length) root.append(h('div.list', null, h('p.empty', null, 'Noch nichts drin. Tipp oben ein, was du brauchst oder erledigen willst.')));
    if (open.length) root.append(h('div.sec', null, TP.secH('Offen', h('span.tnum', null, String(open.length))), h('div.list', null, open.map((x) => itemRow(l, x)))));
    else if (l.items.length) root.append(h('div.list', null, h('p.empty', null, 'Alles abgehakt.')));
    if (done.length) root.append(h('div.sec', null,
      TP.secH('Erledigt', h('button.link', { onclick: () => clearDone(l) }, 'Entfernen')),
      h('div.list', null, done.map((x) => itemRow(l, x)))));
  }

  function itemRow(l, x) {
    return h('div.rowwrap', null,
      h('button.row' + (x.done ? '.done' : ''), { 'aria-pressed': String(!!x.done), onclick: () => { x.done = x.done ? null : TP.today(); TP.save(); TP.render(); } },
        TP.boxEl(), h('span.t', null, x.text)),
      h('button.more', { 'aria-label': 'Optionen für ' + x.text, html: TP.icon('more'), onclick: () => itemMenu(l, x) }));
  }

  function itemMenu(l, x) {
    const items = [];
    const i = l.items.indexOf(x);
    const opens = l.items.filter((y) => !y.done);
    if (!x.done && opens[0] !== x) items.push({ label: 'Ganz nach oben', run: () => { l.items.splice(i, 1); l.items.unshift(x); TP.save(); TP.render(); } });
    items.push({ label: 'Umbenennen', run: () => rename('Punkt umbenennen', x.text, (v) => { x.text = v; }) });
    if (TP.data.lists.length > 1) items.push({ label: 'In andere Liste verschieben', run: () => moveItem(l, x) });
    items.push({ label: 'Löschen', danger: true, run: () => { l.items = l.items.filter((y) => y !== x); TP.save(); TP.render(); TP.toast('Punkt gelöscht.'); } });
    TP.actions(x.text, items);
  }

  function moveItem(l, x) {
    TP.actions('Verschieben nach', TP.data.lists.filter((o) => o !== l).map((o) => ({ label: o.name, run: () => {
      l.items = l.items.filter((y) => y !== x); o.items.push(x); TP.save(); TP.render(); TP.toast('Nach „' + o.name + '“ verschoben.');
    } })));
  }

  function listMenu(l) {
    const i = TP.data.lists.indexOf(l);
    const items = [{ label: 'Umbenennen', run: () => rename('Liste umbenennen', l.name, (v) => { l.name = v; }) }];
    if (i > 0) items.push({ label: 'Ganz nach oben in der Übersicht', run: () => { TP.data.lists.splice(i, 1); TP.data.lists.unshift(l); TP.save(); TP.render(); } });
    if (l.items.some((x) => x.done)) items.push({ label: 'Erledigte entfernen', run: () => clearDone(l) });
    if (l.items.some((x) => x.done)) items.push({ label: 'Alle wieder offen', run: () => { l.items.forEach((x) => { x.done = null; }); TP.save(); TP.render(); } });
    items.push({ label: 'Liste löschen', danger: true, run: () => deleteList(l) });
    TP.actions(l.name, items);
  }

  function clearDone(l) {
    const n = l.items.filter((x) => x.done).length;
    TP.ask('Erledigte entfernen?', n === 1 ? '1 abgehakter Punkt wird gelöscht.' : n + ' abgehakte Punkte werden gelöscht.', 'Entfernen', true).then((ok) => {
      if (!ok) return;
      l.items = l.items.filter((x) => !x.done); TP.save(); TP.render();
    });
  }

  function deleteList(l) {
    TP.ask('„' + l.name + '“ löschen?', l.items.length ? 'Die Liste und alle ' + l.items.length + ' Punkte darin werden gelöscht.' : null, 'Löschen', true).then((ok) => {
      if (!ok) return;
      TP.data.lists = TP.data.lists.filter((y) => y !== l);
      openId = null; TP.save(); TP.render(); TP.toast('Liste gelöscht.');
    });
  }

  function rename(title, value, apply) {
    const inp = h('input.input', { type: 'text', value, 'aria-label': 'Name' });
    const s = TP.sheet(title, h('form', { style: 'display:flex;flex-direction:column;gap:16px', onsubmit: (e) => {
      e.preventDefault(); const v = inp.value.trim(); if (v) { apply(v); TP.save(); } s.close(); TP.render();
    } }, inp, h('button.btn.accent', { type: 'submit' }, 'Speichern')));
    setTimeout(() => inp.focus(), 50);
  }
})(window.TP);
