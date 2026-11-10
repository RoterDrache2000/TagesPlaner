/* plan.js – der Tab „Planen“: Aufgaben für heute, morgen, später und die Routinen bearbeiten. */
(function (TP) {
  const h = TP.h;
  let target = 'heute';
  let topNew = false;

  const dateOf = (key) => key === 'heute' ? TP.today() : key === 'morgen' ? TP.addDays(TP.today(), 1) : null;

  TP.views.planen = function (root) {
    const today = TP.today();
    root.append(TP.head(TP.longDate(today), 'Planen'));

    // Neue Aufgabe
    const input = h('input.input#newTask', { type: 'text', placeholder: 'Neue Aufgabe', autocomplete: 'off', enterkeyhint: 'done', 'aria-label': 'Neue Aufgabe' });
    const topBtn = h('button.btn.ghost.small', { type: 'button', 'aria-pressed': String(topNew), onclick: (e) => { topNew = !topNew; e.currentTarget.setAttribute('aria-pressed', String(topNew)); e.currentTarget.style.cssText = topNew ? 'background:var(--accent-soft);color:var(--accent)' : ''; } }, 'Wichtig');
    if (topNew) topBtn.style.cssText = 'background:var(--accent-soft);color:var(--accent)';
    const form = h('form.sec', { onsubmit: (e) => {
      e.preventDefault();
      const title = input.value.trim(); if (!title) return;
      const date = dateOf(target);
      let top = topNew && !!date;
      if (top && TP.tasksFor(date).filter((t) => t.top && !t.done).length >= 3) { top = false; TP.toast('Schon 3 wichtige Aufgaben an diesem Tag.'); }
      TP.data.tasks.push({ id: TP.uid(), title, date, top, done: null, created: today });
      topNew = false;
      TP.save(); TP.render();
      setTimeout(() => { const i = document.getElementById('newTask'); if (i) i.focus(); }, 0);
    } },
      h('div.addbar', null, input, h('button.btn.accent', { type: 'submit', 'aria-label': 'Hinzufügen', html: TP.icon('plus') })),
      h('div', { style: 'display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:10px' },
        TP.seg([['heute', 'Heute'], ['morgen', 'Morgen'], ['inbox', 'Später']], target, (v) => { target = v; }), topBtn));
    root.append(form);

    root.append(TP.taskSection(today, 'Heute'));
    root.append(TP.taskSection(TP.addDays(today, 1), 'Morgen'));
    root.append(TP.taskSection(null, 'Später'));

    // Routinen
    root.append(h('div.sec', null, TP.secH('Routinen'),
      h('div.list', null, TP.data.routines.map((r) => h('button.row', { onclick: () => TP.editRoutine(r) },
        h('span.t', null, r.name, h('small', null, 'ab ' + r.start + ' Uhr · ' + r.steps.length + ' Schritte · ' + (r.days.length === 7 ? 'täglich' : r.days.map((i) => TP.WD[i]).join(', ')))),
        TP.ic('chev', 'chev'))),
        h('button.row', { style: 'color:var(--accent);font-weight:600', onclick: () => {
          const r = { id: TP.uid(), name: 'Neue Routine', start: '12:00', days: [0, 1, 2, 3, 4, 5, 6], steps: [] };
          TP.data.routines.push(r); TP.save(); TP.editRoutine(r, true);
        } }, TP.ic('plus'), 'Routine hinzufügen'))));
  };

  // Aufgabenliste für einen Tag (date) oder für „Später“ (null)
  TP.taskSection = function (date, title, onToday) {
    const today = TP.today();
    const list = TP.data.tasks.filter((t) => date ? t.date === date : !t.date)
      .filter((t) => !t.done || t.done === today || date) // erledigte aus „Später“ verschwinden am nächsten Tag
      .sort((a, b) => (!!a.done - !!b.done) || (b.top - a.top) || 0);
    const openN = list.filter((t) => !t.done).length;
    const sec = h('div.sec');
    sec.append(TP.secH(onToday ? 'Aufgaben heute' : title,
      onToday ? h('button.link', { onclick: () => TP.go('planen') }, 'Planen') : h('span.tnum', null, list.length ? openN + ' offen' : '')));
    if (!list.length) {
      sec.append(h('div.list', null, h('p.empty', null, onToday ? 'Noch nichts geplant. Unter Planen legst du Aufgaben an.' : date ? 'Nichts geplant.' : 'Hier landet alles ohne Datum.')));
      return sec;
    }
    let rank = 0;
    sec.append(h('div.list', null, list.map((t) => {
      const num = t.top && !t.done ? ++rank : null;
      return h('div.rowwrap', null,
        h('button.row' + (t.done ? '.done' : ''), { 'aria-pressed': String(!!t.done), onclick: () => { t.done = t.done ? null : today; TP.save(); TP.render(); } },
          TP.boxEl(), h('span.t', null, t.title, t.top && !t.done ? h('small', { style: 'color:var(--accent)' }, 'Wichtig') : null)),
        h('button.more', { 'aria-label': 'Optionen für ' + t.title, html: TP.icon('more'), onclick: () => taskMenu(t) }));
    })));
    return sec;
  };

  function taskMenu(t) {
    const today = TP.today(), tomorrow = TP.addDays(today, 1);
    const items = [];
    if (t.date !== today) items.push({ label: 'Auf heute', run: () => { t.date = today; TP.save(); TP.render(); } });
    if (t.date !== tomorrow) items.push({ label: 'Auf morgen', run: () => { t.date = tomorrow; TP.save(); TP.render(); } });
    if (t.date) items.push({ label: 'Auf später (ohne Datum)', run: () => { t.date = null; t.top = false; TP.save(); TP.render(); } });
    if (t.date) items.push({ label: t.top ? 'Nicht mehr wichtig' : 'Als wichtig markieren', run: () => {
      if (!t.top && TP.tasksFor(t.date).filter((x) => x.top && !x.done).length >= 3) return TP.toast('Höchstens 3 wichtige Aufgaben pro Tag.');
      t.top = !t.top; TP.save(); TP.render(); } });
    items.push({ label: 'Umbenennen', run: () => renameTask(t) });
    items.push({ label: 'Löschen', danger: true, run: () => { TP.data.tasks = TP.data.tasks.filter((x) => x !== t); TP.save(); TP.render(); TP.toast('Aufgabe gelöscht.'); } });
    TP.actions(t.title, items);
  }

  function renameTask(t) {
    const inp = h('input.input', { type: 'text', value: t.title, 'aria-label': 'Titel' });
    const s = TP.sheet('Aufgabe umbenennen', h('form', { style: 'display:flex;flex-direction:column;gap:16px', onsubmit: (e) => {
      e.preventDefault(); const v = inp.value.trim(); if (v) { t.title = v; TP.save(); } s.close(); TP.render();
    } }, inp, h('button.btn.accent', { type: 'submit' }, 'Speichern')));
    setTimeout(() => inp.focus(), 50);
  }

  // ---------- Routine bearbeiten ----------
  TP.editRoutine = function (r, isNew) {
    const body = h('div', { style: 'display:flex;flex-direction:column;gap:16px' });
    const s = TP.sheet(isNew ? 'Neue Routine' : 'Routine bearbeiten', body, { onClose: () => { r.steps = r.steps.filter((x) => x.text.trim()); TP.save(); TP.render(); } });
    function draw() {
      body.innerHTML = '';
      body.append(
        h('div', { style: 'display:grid;grid-template-columns:1fr 110px;gap:10px' },
          h('label.field', null, h('span', null, 'Name'), h('input.input', { type: 'text', value: r.name, oninput: (e) => { r.name = e.target.value.trim() || 'Routine'; TP.save(); } })),
          h('label.field', null, h('span', null, 'Ab'), h('input.input', { type: 'time', value: r.start, onchange: (e) => { r.start = e.target.value || r.start; TP.save(); } }))),
        h('div.field', null, h('span', null, 'An diesen Tagen'), TP.dayChips(r.days, (v) => { r.days = v; TP.save(); })),
        h('div.field', null, h('span', null, 'Schritte (Minuten sind optional und starten im Fokus-Modus einen Timer)'),
          h('div.list', null,
            r.steps.map((st, i) => h('div.steped', null,
              h('input', { type: 'text', value: st.text, 'aria-label': 'Schritt ' + (i + 1), oninput: (e) => { st.text = e.target.value; TP.save(); } }),
              h('input.min', { type: 'number', inputmode: 'numeric', min: 0, max: 120, value: st.min || '', placeholder: '–', 'aria-label': 'Minuten', oninput: (e) => { st.min = Math.max(0, Math.min(120, parseInt(e.target.value, 10) || 0)); TP.save(); } }),
              h('span.u', null, 'min'),
              habitSelect(st),
              h('button', { type: 'button', 'aria-label': 'Nach oben', disabled: i === 0, html: TP.icon('up'), onclick: () => { [r.steps[i - 1], r.steps[i]] = [r.steps[i], r.steps[i - 1]]; TP.save(); draw(); } }),
              TP.armBtn(TP.icon('trash'), 'Löschen?', () => { r.steps.splice(i, 1); TP.save(); draw(); }))),
            !r.steps.length ? h('p.empty', null, 'Noch keine Schritte.') : null)),
        h('form.addbar', { onsubmit: (e) => {
          e.preventDefault(); const inp = e.target.querySelector('input'); const v = inp.value.trim(); if (!v) return;
          r.steps.push({ id: TP.uid(), text: v, min: 0 }); TP.save(); draw();
          setTimeout(() => { const n = body.querySelector('#newStep'); if (n) n.focus(); }, 0);
        } }, h('input.input#newStep', { type: 'text', placeholder: 'Neuer Schritt', 'aria-label': 'Neuer Schritt', enterkeyhint: 'done' }),
          h('button.btn.accent', { type: 'submit', 'aria-label': 'Schritt hinzufügen', html: TP.icon('plus') })),
        h('button.btn.primary', { onclick: () => s.close() }, 'Fertig'),
        TP.data.routines.length > 1 ? TP.armBtn('Routine löschen', 'Wirklich löschen?', () => {
          TP.data.routines = TP.data.routines.filter((x) => x !== r); TP.save(); s.close(); TP.toast('Routine gelöscht.');
        }, 'btn.danger') : null);
    }
    draw();
  };

  // Schritt mit Gewohnheit verknüpfen
  function habitSelect(st) {
    const hs = TP.data.habits.filter((x) => !x.archived);
    if (!hs.length) return null;
    const sel = h('select', { 'aria-label': 'Mit Gewohnheit verknüpfen', title: 'Mit Gewohnheit verknüpfen', onchange: (e) => { st.habit = e.target.value || undefined; TP.save(); } },
      h('option', { value: '' }, 'ohne Gewohnheit'), hs.map((x) => h('option', { value: x.id }, x.name)));
    sel.value = st.habit || '';
    return sel;
  }
})(window.TP);
