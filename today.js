/* today.js – der Tab „Heute“ und der Fokus-Modus. */
(function (TP) {
  const h = TP.h;
  const open = new Set(); // aufgeklappte Routinen (nur für diese Sitzung)
  const closed = new Set();

  TP.views = TP.views || {};
  TP.views.heute = function (root) {
    const today = TP.today();
    const d = TP.data;
    root.append(TP.head(TP.longDate(today), TP.greeting(),
      h('button.iconbtn', { 'aria-label': 'Einstellungen und Backup', onclick: () => TP.settings(), html: TP.icon('gear') })));

    banners(root);
    root.append(arc());

    // Routinen
    const act = TP.activeRoutine();
    const list = TP.routinesToday();
    if (act) root.append(routineBlock(act, true));
    list.filter((r) => r !== act).forEach((r) => root.append(routineBlock(r, false)));
    if (!list.length) root.append(h('div.sec', null, TP.secH('Routine'), h('div.list', null, h('p.empty', null, 'Noch keine Routine. Unter Planen → Routinen legst du Schritte an.'))));

    // Von gestern
    const od = TP.overdue();
    if (od.length) {
      root.append(h('div.sec', null, TP.secH('Von gestern', h('span.tnum', null, od.length + ' offen')),
        h('div.list', null, od.map((t) => h('div.rowwrap', null,
          h('div.row', null, h('span.t', null, t.title, h('small', null, TP.longDate(t.date)))),
          h('button.btn.ghost.small', { onclick: () => { t.date = today; TP.save(); TP.render(); } }, 'Heute'),
          h('button.btn.ghost.small', { style: 'margin:0 10px 0 6px', onclick: () => { t.date = null; t.top = false; TP.save(); TP.render(); } }, 'Später'))))));
    }

    // Gewohnheiten
    const hs = d.habits.filter((x) => !x.archived && TP.hDue(x, today));
    root.append(h('div.sec', null,
      TP.secH('Gewohnheiten', h('button.link', { onclick: () => TP.go('gewohnheiten') }, 'Alle')),
      hs.length ? h('div.list', null, hs.map((x) => TP.habitRow(x, today, true)))
        : h('div.list', null, h('p.empty', null, 'Heute ist keine Gewohnheit fällig.'))));

    // Aufgaben
    root.append(TP.taskSection(today, 'Heute', true));
  };

  function banners(root) {
    const d = TP.data;
    if (d.justMigrated) {
      root.append(h('div.banner', null, h('p', null, 'Deine Morgenroutine ist übernommen. Gewohnheiten, Aufgaben und weitere Routinen kannst du jetzt dazu anlegen.'),
        h('button.btn.ghost.small', { onclick: () => { delete d.justMigrated; TP.render(); } }, 'OK')));
    }
    const last = d.settings.lastBackup;
    const usedDays = Object.keys(d.days).length;
    const age = last ? (TP.parse(TP.today()) - TP.parse(last)) / 864e5 : Infinity;
    if (usedDays >= 3 && age >= 7) {
      root.append(h('div.banner', null, h('p', null, last ? 'Dein letztes Backup ist ' + Math.round(age) + ' Tage alt.' : 'Du hast noch kein Backup gemacht.'),
        h('button.btn.accent.small', { onclick: () => TP.backup() }, 'Backup')));
    }
    let hinted = false; try { hinted = localStorage.getItem('tp.homehint'); } catch (e) {}
    if (navigator.standalone && !hinted) {
      root.append(h('div.banner', null, h('p', null, 'Hinweis: Das Home-Bildschirm-Icon hat einen eigenen Speicher. Der Wecker-Kurzbefehl öffnet Safari. Nutze am besten nur eins von beiden, oder übertrage per Backup.'),
        h('button.btn.ghost.small', { onclick: () => { try { localStorage.setItem('tp.homehint', '1'); } catch (e) {} TP.render(); } }, 'OK')));
    }
  }

  // Tagesbogen: vom Start der ersten Routine bis zur Schlafenszeit
  function arc() {
    const rs = TP.routinesToday().map((r) => TP.toMin(r.start));
    const ds = TP.dayStart() * 60;
    const rel = (m) => (m - ds + 1440) % 1440;
    const start = rs.length ? rs.reduce((a, b) => (rel(a) < rel(b) ? a : b)) : 6 * 60;
    const end = TP.toMin(TP.data.settings.bedtime);
    const len = (rel(end) - rel(start) + 1440) % 1440 || 1;
    const pos = (rel(TP.minutesNow()) - rel(start) + 1440) % 1440;
    let frac, big, small;
    if (rel(TP.minutesNow()) < rel(start)) { frac = 0; big = TP.fmtMin(start); small = 'beginnt dein Tag'; }
    else if (pos >= len) { frac = 1; big = 'Schlafenszeit'; small = 'Gute Nacht'; }
    else { frac = pos / len; big = TP.fmtMin(len - pos); small = 'Stunden bis zum Schlafen'; }
    const cx = 150, cy = 130, r = 115;
    let ticks = '';
    const hours = Math.round(len / 60);
    for (let i = 0; i <= hours; i++) {
      const a = Math.PI - (i / hours) * Math.PI; const r1 = r - 12, r2 = r - (i % 4 === 0 ? 20 : 16);
      ticks += '<line x1="' + (cx + r1 * Math.cos(a)).toFixed(1) + '" y1="' + (cy - r1 * Math.sin(a)).toFixed(1) + '" x2="' + (cx + r2 * Math.cos(a)).toFixed(1) + '" y2="' + (cy - r2 * Math.sin(a)).toFixed(1) + '" stroke="var(--faint)" stroke-width="' + (i % 4 === 0 ? 1.5 : 1) + '"/>';
    }
    const a = Math.PI - frac * Math.PI;
    const dot = '<circle cx="' + (cx + r * Math.cos(a)).toFixed(1) + '" cy="' + (cy - r * Math.sin(a)).toFixed(1) + '" r="7" fill="var(--surface)" stroke="var(--accent)" stroke-width="3"/>';
    const fs = big.length > 6 ? 24 : 30;
    const svg = '<svg viewBox="0 0 300 140" role="img" aria-label="Tagesbogen">' +
      '<path d="M35 130 A115 115 0 0 1 265 130" fill="none" stroke="var(--surface-2)" stroke-width="10" stroke-linecap="round"/>' +
      '<path d="M35 130 A115 115 0 0 1 265 130" fill="none" stroke="var(--accent)" stroke-width="10" stroke-linecap="round" pathLength="100" stroke-dasharray="' + Math.max(0.5, frac * 100).toFixed(1) + ' 100"/>' +
      ticks + dot +
      '<text x="150" y="100" text-anchor="middle" font-size="' + fs + '" font-weight="600" fill="var(--ink)" style="font-family:var(--display);font-variant-numeric:tabular-nums;letter-spacing:-.5px">' + big + '</text>' +
      '<text x="150" y="121" text-anchor="middle" font-size="11.5" fill="var(--muted)">' + small + '</text></svg>';
    return h('div.arc', null, h('div', { html: svg }),
      h('div.arc-meta.tnum', null, h('span', null, 'Start ', h('b', null, TP.fmtMin(start))), h('span', null, 'Ins Bett ', h('b', null, TP.data.settings.bedtime))));
  }

  function routineBlock(r, isActive) {
    const today = TP.today();
    const done = TP.peek(today).steps;
    const n = TP.rDone(r, today), total = r.steps.length;
    const complete = n === total;
    const expanded = open.has(r.id) || (isActive && !complete && !closed.has(r.id));
    const sec = h('div.sec');
    const label = r.name === 'Morgen' || r.name === 'Abend' ? r.name + 'routine' : r.name;
    if (!expanded) {
      const day = TP.peek(today);
      const dur = day['end_' + r.id] != null && day['start_' + r.id] != null ? Math.max(1, day['end_' + r.id] - day['start_' + r.id]) : null;
      sec.append(h('div.list', null, h('button.row', { onclick: () => { open.add(r.id); closed.delete(r.id); TP.render(); } },
        h('span.t', null, label, h('small', null, complete ? (dur ? 'Geschafft in ' + dur + ' min' : 'Geschafft') : 'ab ' + r.start + ' Uhr')),
        complete ? h('span.pill', null, 'Erledigt') : h('span.d', null, n + ' von ' + total),
        TP.ic('down', 'chev'))));
      return sec;
    }
    sec.append(TP.secH(label, h('button.link.tnum', { onclick: () => { open.delete(r.id); closed.add(r.id); TP.render(); }, 'aria-label': 'Zuklappen' }, n + ' von ' + total)));
    sec.append(h('div.hair', null, h('div', { style: 'width:' + (n / total * 100) + '%' })));
    sec.append(h('div.list', null, r.steps.map((s) => h('button.row' + (done.includes(s.id) ? '.done' : ''),
      { 'aria-pressed': String(done.includes(s.id)), onclick: () => { TP.toggleStep(r, s); if (TP.rDone(r, today) === total) { open.delete(r.id); TP.toast(label + ' geschafft.'); } TP.render(); } },
      TP.boxEl(), h('span.t', null, s.text), s.min ? h('span.d', null, s.min + ' min') : null))));
    if (!complete) sec.append(h('button.btn.primary', { style: 'margin-top:12px', onclick: () => TP.focus(r) }, TP.ic('play'), 'Fokus-Modus starten'));
    return sec;
  }

  // ---------- Fokus-Modus: ein Schritt pro Bildschirm ----------
  TP.focus = function (r) {
    const today = TP.today();
    let queue = r.steps.filter((s) => !TP.peek(today).steps.includes(s.id)).map((s) => s.id);
    const started = TP.minutesNow();
    let remain = null, total = null, running = true, timer = null;
    const ov = h('div.focus', { role: 'dialog', 'aria-label': 'Fokus-Modus' });
    const inner = h('div.focus-in');
    ov.append(inner);
    document.body.append(ov);
    document.body.style.overflow = 'hidden';

    function close() { clearInterval(timer); ov.remove(); document.body.style.overflow = ''; TP.render(); }
    function startTimer(step) {
      clearInterval(timer);
      total = step.min ? step.min * 60 : null; remain = total; running = true;
      if (!total) return;
      timer = setInterval(() => {
        if (!running || remain <= 0) return;
        remain--;
        const v = inner.querySelector('.ring .v'); const c = inner.querySelectorAll('.ring circle')[1];
        if (v) v.textContent = fmt(remain);
        if (c) c.setAttribute('stroke-dasharray', (remain / total * 100).toFixed(2) + ' 100');
        if (remain === 0 && navigator.vibrate) navigator.vibrate(200);
      }, 1000);
    }
    const fmt = (s) => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');

    function render() {
      inner.innerHTML = '';
      const doneIds = TP.peek(today).steps;
      const curId = queue[0];
      const bars = h('div.steps', null, r.steps.map((s) => h('i', { class: doneIds.includes(s.id) ? 'y' : (s.id === curId ? 'c' : '') })));
      if (!curId) {
        clearInterval(timer);
        const mins = Math.max(1, TP.minutesNow() - started);
        const next = TP.data.tasks.find((t) => t.date === today && !t.done && t.top) || TP.data.tasks.find((t) => t.date === today && !t.done);
        inner.append(h('div.f-top', null, bars),
          h('div.f-done', null, h('div.bigcheck', { html: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>' }),
            h('p.f-name', null, (r.name === 'Morgen' || r.name === 'Abend' ? r.name + 'routine' : r.name) + ' geschafft.'),
            h('p.f-note.tnum', null, r.steps.length + ' Schritte, diesmal ' + mins + ' min.')),
          h('div.f-bot', null, next ? h('p.f-next', null, 'Als Nächstes: ', h('b', null, next.title)) : null,
            h('button.btn.ghost', { onclick: close }, 'Zurück zu Heute')));
        return;
      }
      const step = r.steps.find((s) => s.id === curId);
      const pos = r.steps.indexOf(step) + 1;
      const nextStep = queue[1] ? r.steps.find((s) => s.id === queue[1]) : null;
      let ring;
      if (step.min) {
        ring = h('div.ring', { html: '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" fill="none" stroke="var(--surface-2)" stroke-width="5"/><circle cx="50" cy="50" r="44" fill="none" stroke="var(--accent)" stroke-width="5" stroke-linecap="round" pathLength="100" stroke-dasharray="' + (remain / total * 100).toFixed(2) + ' 100"/></svg><div class="v">' + fmt(remain) + '</div>' });
        ring.append(h('button', { onclick: (e) => { running = !running; e.currentTarget.textContent = running ? 'Pause' : 'Weiter'; } }, running ? 'Pause' : 'Weiter'));
      } else {
        ring = h('div.ring', { html: '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" fill="none" stroke="var(--surface-2)" stroke-width="5"/></svg><div class="v s">' + pos + ' / ' + r.steps.length + '</div>' });
      }
      inner.append(
        h('div.f-top', null, bars, h('div.lbl.tnum', null, h('span', null, 'Schritt ' + pos + ' von ' + r.steps.length), h('button', { onclick: close }, 'Schließen'))),
        h('div.f-mid', null, ring, h('div', null, h('p.f-name', null, step.text), step.min ? h('p.f-note', null, 'Etwa ' + step.min + (step.min === 1 ? ' Minute' : ' Minuten')) : null)),
        h('div.f-bot', null,
          h('p.f-next', null, nextStep ? ['Danach: ', h('b', null, nextStep.text)] : 'Letzter Schritt'),
          h('div.f-btns', null,
            h('button.btn.ghost', { onclick: () => { queue.push(queue.shift()); if (queue.length > 1) { const s2 = r.steps.find((s) => s.id === queue[0]); startTimer(s2); } render(); } }, 'Später'),
            h('button.btn.accent', { onclick: () => { TP.toggleStep(r, step); queue.shift(); const s2 = queue[0] && r.steps.find((s) => s.id === queue[0]); if (s2) startTimer(s2); render(); } }, TP.ic('check'), 'Erledigt'))));
    }
    if (queue[0]) startTimer(r.steps.find((s) => s.id === queue[0]));
    render();
  };
})(window.TP);
