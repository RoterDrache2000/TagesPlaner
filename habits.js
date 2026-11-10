/* habits.js – der Tab „Gewohnheiten“: Woche im Blick, Serien, anlegen und bearbeiten. */
(function (TP) {
  const h = TP.h;

  // Eine Gewohnheit als Zeile (im Heute-Tab)
  TP.habitRow = function (x, date) {
    const v = TP.hVal(x, date), ok = TP.hDone(x, date);
    const row = h('div.hrow' + (ok ? '.ok' : ''));
    const streak = TP.streak(x);
    const sub = x.kind === 'count' ? (streak ? streak + ' Tage Serie' : x.target + ' ' + (x.unit || '') + ' als Ziel') : (streak ? streak + ' Tage Serie' : TP.rhythm(x));
    if (x.kind === 'count') {
      row.append(
        h('button.hn', { onclick: () => { TP.setHabit(x, date, v + 1); TP.render(); }, 'aria-label': x.name + ' plus eins' },
          TP.boxEl(), h('span', null, x.name, h('small', null, sub))),
        h('div.count', null,
          h('button', { 'aria-label': x.name + ' minus eins', disabled: !v, onclick: () => { TP.setHabit(x, date, v - 1); TP.render(); } }, '−'),
          h('b', null, v + '/' + x.target),
          h('button.plus', { 'aria-label': x.name + ' plus eins', onclick: () => { TP.setHabit(x, date, v + 1); TP.render(); } }, '+')));
    } else {
      row.append(h('button.hn', { 'aria-pressed': String(ok), onclick: () => { TP.setHabit(x, date, ok ? 0 : 1); TP.render(); } },
        TP.boxEl(), h('span', null, x.name, h('small', null, sub))), weekDots(x));
    }
    return row;
  };

  function weekDots(x) {
    const today = TP.today();
    const wrap = h('span.dots', { 'aria-hidden': 'true' });
    for (let i = 6; i >= 0; i--) {
      const d = TP.addDays(today, -i);
      const due = TP.hDue(x, d);
      wrap.append(h('i', { class: i === 0 ? (TP.hDone(x, d) ? 'y' : 't') : !due ? 'n' : TP.hDone(x, d) ? 'y' : '' }));
    }
    return wrap;
  }

  // Kalenderwoche nach ISO
  function kw(s) {
    const d = TP.parse(s); d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
    const w1 = new Date(d.getFullYear(), 0, 4);
    return 1 + Math.round(((d - w1) / 864e5 - 3 + ((w1.getDay() + 6) % 7)) / 7);
  }

  TP.views.gewohnheiten = function (root) {
    const today = TP.today();
    const monday = TP.addDays(today, -TP.weekday(today));
    const yesterday = TP.addDays(today, -1);
    root.append(TP.head('KW ' + kw(today), 'Gewohnheiten'));
    const list = TP.data.habits.filter((x) => !x.archived);
    const wrap = h('div', { style: 'display:flex;flex-direction:column;gap:12px' });
    list.forEach((x) => {
      const streak = TP.streak(x);
      const week = h('div.week');
      for (let i = 0; i < 7; i++) {
        const d = TP.addDays(monday, i);
        const future = d > today;
        const due = TP.hDue(x, d);
        const v = TP.hVal(x, d), ok = TP.hDone(x, d);
        const canTap = (d === today || d === yesterday) && !future;
        const cls = 'day' + (ok ? ' y' : (v ? ' part' : '')) + (d === today ? ' today' : '') + (!due ? ' off' : '') + (future ? ' future' : '') + (canTap ? ' tap' : '');
        const label = x.kind === 'count' && v && !ok ? String(v) : '';
        const el = h(canTap ? 'button' : 'div', { class: cls, 'aria-label': canTap ? x.name + ', ' + (d === today ? 'heute' : 'gestern') + (ok ? ' erledigt' : ' offen') : null },
          h('i', null, label), TP.WD[i]);
        if (canTap) el.onclick = () => {
          if (x.kind === 'count') TP.setHabit(x, d, ok ? 0 : x.target); else TP.setHabit(x, d, ok ? 0 : 1);
          TP.render();
        };
        week.append(el);
      }
      wrap.append(h('div.hcard', null,
        h('div.hc-top', null,
          h('button', { onclick: () => TP.editHabit(x), 'aria-label': x.name + ' bearbeiten' }, h('b', null, x.name), h('small', null, TP.rhythm(x))),
          h('div.streak', null, h('b', null, streak), h('small', null, streak === 1 ? 'Tag Serie' : 'Tage Serie'))),
        week));
    });
    if (!list.length) wrap.append(h('div.list', null, h('p.empty', null, 'Noch keine Gewohnheiten.')));
    root.append(wrap);
    root.append(h('button.add-h', { onclick: () => {
      const x = { id: TP.uid(), name: '', kind: 'check', target: 1, unit: '', days: [0, 1, 2, 3, 4, 5, 6], created: TP.today(), archived: false };
      TP.editHabit(x, true);
    } }, '+ Neue Gewohnheit'));
    root.append(h('p.note', null, 'Heute und gestern kannst du in der Woche direkt antippen. Schraffierte Tage sind nicht fällig und unterbrechen keine Serie.'));
    const arch = TP.data.habits.filter((x) => x.archived);
    if (arch.length) root.append(h('div.sec', null, TP.secH('Archiviert'), h('div.list', null, arch.map((x) => h('button.row', { onclick: () => TP.editHabit(x) }, h('span.t', null, x.name, h('small', null, 'Beste Serie: ' + TP.bestStreak(x) + ' Tage')), TP.ic('chev', 'chev'))))));
  };

  // Anlegen / bearbeiten
  TP.editHabit = function (x, isNew) {
    const draft = JSON.parse(JSON.stringify(x));
    const body = h('div', { style: 'display:flex;flex-direction:column;gap:16px' });
    const s = TP.sheet(isNew ? 'Neue Gewohnheit' : 'Gewohnheit bearbeiten', body);
    function draw() {
      body.innerHTML = '';
      const name = h('input.input', { type: 'text', value: draft.name, placeholder: 'z. B. Meditieren', oninput: (e) => { draft.name = e.target.value; } });
      body.append(
        h('label.field', null, h('span', null, 'Name'), name),
        h('div.field', null, h('span', null, 'Art'), TP.seg([['check', 'Ja / Nein'], ['count', 'Menge']], draft.kind, (v) => { draft.kind = v; if (v === 'count' && draft.target < 2) draft.target = 8; draw(); })),
        draft.kind === 'count' ? h('div', { style: 'display:grid;grid-template-columns:110px 1fr;gap:10px' },
          h('label.field', null, h('span', null, 'Ziel pro Tag'), h('input.input', { type: 'number', inputmode: 'numeric', min: 1, max: 999, value: draft.target, oninput: (e) => { draft.target = Math.max(1, parseInt(e.target.value, 10) || 1); } })),
          h('label.field', null, h('span', null, 'Einheit'), h('input.input', { type: 'text', value: draft.unit || '', placeholder: 'Gläser, Seiten, Minuten', oninput: (e) => { draft.unit = e.target.value; } }))) : null,
        h('div.field', null, h('span', null, 'Fällig an'), TP.dayChips(draft.days, (v) => { draft.days = v; })),
        h('button.btn.accent', { onclick: () => {
          draft.name = draft.name.trim();
          if (!draft.name) { name.focus(); return TP.toast('Bitte einen Namen eingeben.'); }
          if (draft.kind === 'check') draft.target = 1;
          if (isNew) TP.data.habits.push(draft); else Object.assign(x, draft);
          TP.save(); s.close(); TP.render();
        } }, isNew ? 'Hinzufügen' : 'Speichern'),
        !isNew ? h('button.btn.ghost', { onclick: () => { x.archived = !x.archived; TP.save(); s.close(); TP.render(); TP.toast(x.archived ? 'Archiviert. Der Verlauf bleibt erhalten.' : 'Wieder aktiv.'); } }, x.archived ? 'Wieder aktivieren' : 'Archivieren') : null,
        !isNew ? TP.armBtn('Löschen', 'Wirklich löschen? Auch der Verlauf geht verloren.', () => {
          TP.data.habits = TP.data.habits.filter((y) => y !== x);
          TP.data.routines.forEach((r) => r.steps.forEach((st) => { if (st.habit === x.id) delete st.habit; }));
          TP.save(); s.close(); TP.render(); TP.toast('Gewohnheit gelöscht.');
        }, 'btn.danger') : null);
      if (isNew) setTimeout(() => name.focus(), 50);
    }
    draw();
  };
})(window.TP);
