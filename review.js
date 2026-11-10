/* review.js – der Tab „Rückblick“ sowie Einstellungen und Backup. */
(function (TP) {
  const h = TP.h;
  let monthOffset = 0;

  // Wie viel von einem Tag geschafft ist (0 bis 1), oder null wenn nichts fällig war
  function dayScore(date) {
    const day = TP.peek(date);
    let total = 0, done = 0;
    TP.routinesToday(date).forEach((r) => { total += r.steps.length; done += r.steps.filter((s) => day.steps.includes(s.id)).length; });
    TP.data.habits.filter((x) => !x.archived && TP.hDue(x, date) && (x.created || '') <= date).forEach((x) => { total++; if (TP.hDone(x, date)) done++; });
    return total ? done / total : null;
  }

  function lastDays(n) {
    const today = TP.today();
    const first = TP.data.settings.created || today;
    const out = [];
    for (let i = n - 1; i >= 0; i--) { const d = TP.addDays(today, -i); if (d >= first) out.push(d); }
    return out;
  }

  TP.views.rueckblick = function (root) {
    const today = TP.today();
    const days = lastDays(30);
    const past = days.filter((d) => d < today); // heute zählt erst, wenn er vorbei ist
    const range = past;

    // Kennzahlen
    let rDays = 0, rFull = 0;
    range.forEach((d) => { const rs = TP.routinesToday(d); if (!rs.length) return; rDays++; if (rs.every((r) => TP.rDone(r, d) === r.steps.length)) rFull++; });
    let hDue = 0, hOk = 0;
    const active = TP.data.habits.filter((x) => !x.archived);
    range.forEach((d) => active.forEach((x) => { if (TP.hDue(x, d) && (x.created || '') <= d) { hDue++; if (TP.hDone(x, d)) hOk++; } }));
    let best = null;
    active.forEach((x) => { const s = TP.streak(x); if (!best || s > best.s) best = { s, n: x.name }; });
    const first = TP.data.routines[0];
    const durs = first ? range.map((d) => { const o = TP.peek(d); return o['end_' + first.id] != null && o['start_' + first.id] != null ? o['end_' + first.id] - o['start_' + first.id] : null; }).filter((x) => x != null && x >= 0 && x < 300) : [];
    const pct = (a, b) => b ? Math.round(a / b * 100) + ' %' : '–';

    const m = TP.parse(today); m.setDate(1); m.setMonth(m.getMonth() + monthOffset);
    root.append(TP.head(past.length ? 'Letzte ' + range.length + ' Tage' : 'Ab morgen gibt es Zahlen', 'Rückblick'));
    root.append(h('div.kpis', null,
      h('div.kpi', null, h('small', null, 'Routinen komplett'), h('b', null, pct(rFull, rDays)), h('em', null, rDays ? ' ' + rFull + ' von ' + rDays + ' Tagen' : '')),
      h('div.kpi', null, h('small', null, 'Gewohnheiten erfüllt'), h('b', null, pct(hOk, hDue))),
      h('div.kpi', null, h('small', null, 'Längste laufende Serie'), h('b', null, best ? best.s : '–'), best ? h('em', null, ' ' + best.n) : null),
      h('div.kpi', null, h('small', null, first ? 'Ø ' + first.name + 'routine' : 'Ø Routine'), h('b', null, durs.length ? Math.round(durs.reduce((a, b) => a + b, 0) / durs.length) + ' min' : '–'))));

    // Heatmap Monat
    const monthName = m.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
    const grid = h('div.hgrid', { role: 'img', 'aria-label': 'Wie viel pro Tag geschafft wurde, ' + monthName });
    TP.WD.forEach((d) => grid.append(h('span', null, d.charAt(0))));
    const lead = (m.getDay() + 6) % 7;
    for (let i = 0; i < lead; i++) grid.append(h('i.x'));
    const dim = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
    const created = TP.data.settings.created || today;
    for (let i = 1; i <= dim; i++) {
      const d = TP.iso(new Date(m.getFullYear(), m.getMonth(), i));
      let cls = '';
      if (d > today || d < created) cls = 'fut';
      else { const s = dayScore(d); cls = s == null || s === 0 ? '' : s < 0.5 ? 'l1' : s < 1 ? 'l2' : 'l3'; }
      if (d === today) cls += ' now';
      grid.append(h('i', { class: cls, title: TP.longDate(d) }));
    }
    root.append(h('div.card', null,
      h('div.sec-h', null, h('h3', null, monthName),
        h('div.monthnav', null,
          h('button.iconbtn', { style: 'width:30px;height:30px', 'aria-label': 'Vorheriger Monat', html: TP.icon('left'), onclick: () => { monthOffset--; TP.render(); } }),
          h('button.iconbtn', { style: 'width:30px;height:30px', 'aria-label': 'Nächster Monat', disabled: monthOffset >= 0, html: TP.icon('chev'), onclick: () => { if (monthOffset < 0) { monthOffset++; TP.render(); } } }))),
      grid,
      h('div.legend', null, 'nichts ', h('i', { style: 'background:var(--h0)' }), h('i', { style: 'background:var(--h1)' }), h('i', { style: 'background:var(--h2)' }), h('i', { style: 'background:var(--h3)' }), ' alles')));

    // Pro Gewohnheit
    if (active.length) {
      root.append(h('div.sec', null, TP.secH('Gewohnheiten, letzte 30 Tage'),
        h('div.list', null, active.map((x) => {
          let due = 0, ok = 0;
          range.forEach((d) => { if (TP.hDue(x, d) && (x.created || '') <= d) { due++; if (TP.hDone(x, d)) ok++; } });
          const p = due ? Math.round(ok / due * 100) : 0;
          return h('div.rate', null, h('b', null, x.name),
            h('span', null, (due ? p + ' %' : '–') + ' · Serie ' + TP.streak(x) + ' · Beste ' + TP.bestStreak(x)),
            h('div.bar', null, h('div', { style: 'width:' + p + '%' })));
        }))));
    }

    root.append(h('div.sec', null, TP.secH('Daten'),
      h('div.list', null,
        h('button.row', { onclick: () => TP.backup() }, h('span.t', null, 'Backup speichern', h('small', null, TP.data.settings.lastBackup ? 'Zuletzt am ' + TP.longDate(TP.data.settings.lastBackup) : 'Noch nie')), TP.ic('chev', 'chev')),
        h('button.row', { onclick: () => TP.restore() }, h('span.t', null, 'Backup wiederherstellen'), TP.ic('chev', 'chev')),
        h('button.row', { onclick: () => TP.settings() }, h('span.t', null, 'Einstellungen'), TP.ic('chev', 'chev')))));
  };

  // ---------- Backup ----------
  TP.backup = async function () {
    const text = TP.exportJSON();
    const name = TP.backupName();
    const mark = () => { TP.data.settings.lastBackup = TP.today(); TP.save(); TP.render(); };
    try {
      const file = new File([text], name, { type: 'application/json' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: name });
        mark(); TP.toast('Backup gespeichert.');
        return;
      }
    } catch (e) { if (e && e.name === 'AbortError') return; }
    try {
      const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
      const a = h('a', { href: url, download: name }); document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      mark(); TP.toast('Backup-Datei wird gespeichert.');
    } catch (e) { TP.toast('Backup konnte nicht gespeichert werden.'); }
  };

  TP.restore = function () {
    const inp = h('input', { type: 'file', accept: '.json,application/json', style: 'display:none' });
    inp.onchange = () => {
      const f = inp.files && inp.files[0]; inp.remove(); if (!f) return;
      const rd = new FileReader();
      rd.onload = async () => {
        let ok = false;
        try { JSON.parse(rd.result); ok = true; } catch (e) {}
        if (!ok) return TP.toast('Die Datei ist kein gültiges Backup.');
        const yes = await TP.ask('Backup wiederherstellen?', 'Alle jetzigen Daten auf diesem Gerät werden durch das Backup ersetzt.', 'Wiederherstellen', true);
        if (!yes) return;
        try { TP.importJSON(rd.result); TP.render(); TP.toast('Backup wiederhergestellt.'); }
        catch (e) { TP.toast(e.message || 'Die Datei ist kein gültiges Backup.'); }
      };
      rd.readAsText(f);
    };
    document.body.append(inp); inp.click();
  };

  // ---------- Einstellungen ----------
  TP.settings = function () {
    const st = TP.data.settings;
    const ds = h('select.input', { 'aria-label': 'Neuer Tag beginnt um', onchange: (e) => { st.dayStart = parseInt(e.target.value, 10); TP.save(); } },
      [0, 1, 2, 3, 4, 5].map((n) => h('option', { value: n }, n + ':00 Uhr' + (n === 0 ? ' (Mitternacht)' : ''))));
    ds.value = String(st.dayStart);
    const s = TP.sheet('Einstellungen', h('div', { style: 'display:flex;flex-direction:column;gap:16px' },
      h('label.field', null, h('span', null, 'Neuer Tag beginnt um'), ds),
      h('label.field', null, h('span', null, 'Schlafenszeit (für den Tagesbogen)'), h('input.input', { type: 'time', value: st.bedtime, onchange: (e) => { st.bedtime = e.target.value || st.bedtime; TP.save(); } })),
      h('div.list', null,
        h('button.row', { onclick: () => { s.close(); TP.backup(); } }, h('span.t', null, 'Backup speichern', h('small', null, 'Als Datei, z. B. in iCloud Drive')), TP.ic('chev', 'chev')),
        h('button.row', { onclick: () => { s.close(); TP.restore(); } }, h('span.t', null, 'Backup wiederherstellen'), TP.ic('chev', 'chev'))),
      h('button.btn.primary', { onclick: () => { s.close(); TP.render(); } }, 'Fertig'),
      TP.armBtn('Alle Daten löschen', 'Wirklich alles löschen?', () => { TP.wipe(); s.close(); TP.render(); TP.toast('Alles zurückgesetzt.'); }, 'btn.danger'),
      h('p.note', { style: 'text-align:center' }, 'Tag · Version ' + st.version + ' · Alle Daten bleiben auf diesem Gerät.')));
  };
})(window.TP);
