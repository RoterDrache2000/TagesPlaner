/* store.js – Daten laden, speichern, Backup, Umzug der alten Morgenroutine.
   Alle Daten liegen in EINEM Objekt im Browser-Speicher (Schlüssel „tp.data“). */
window.TP = window.TP || {};
(function (TP) {
  const KEY = window.TP_KEY || 'tp.data';
  const VERSION = 1;

  // ---------- Datum ----------
  TP.offsetDays = 0; // nur für die Testversion („Neuen Tag simulieren“)
  TP.now = () => { const d = new Date(); d.setDate(d.getDate() + TP.offsetDays); return d; };
  const pad = (n) => String(n).padStart(2, '0');
  TP.iso = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  TP.parse = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  TP.addDays = (s, n) => { const d = TP.parse(s); d.setDate(d.getDate() + n); return TP.iso(d); };
  TP.weekday = (s) => (TP.parse(s).getDay() + 6) % 7; // 0 = Montag
  TP.dayStart = () => (TP.data ? TP.data.settings.dayStart : 3);
  // „Heute“ beginnt erst um 3:00 Uhr (einstellbar). Wer um 0:30 noch abhakt, bucht auf den alten Tag.
  TP.today = () => { const d = TP.now(); d.setHours(d.getHours() - TP.dayStart()); return TP.iso(d); };
  TP.minutesNow = () => { const d = TP.now(); return d.getHours() * 60 + d.getMinutes(); };
  TP.toMin = (hhmm) => { const [h, m] = String(hhmm || '0:0').split(':').map(Number); return (h || 0) * 60 + (m || 0); };
  TP.fmtMin = (m) => Math.floor(m / 60) + ':' + pad(Math.round(m % 60));
  TP.uid = () => Math.random().toString(36).slice(2, 9);
  TP.WD = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

  // ---------- Standarddaten ----------
  function defaults() {
    const t = TP.today();
    return {
      settings: { version: VERSION, dayStart: 3, bedtime: '23:00', graceDays: 2, lastBackup: null, created: t },
      routines: [
        { id: 'morgen', name: 'Morgen', start: '05:00', days: [0, 1, 2, 3, 4, 5, 6], steps: [
          { id: TP.uid(), text: 'Ein Glas Wasser', min: 1 },
          { id: TP.uid(), text: 'Bett machen', min: 2 },
          { id: TP.uid(), text: 'Duschen', min: 8 },
          { id: TP.uid(), text: 'Zähne putzen', min: 3 },
          { id: TP.uid(), text: 'Dehnen', min: 5 },
          { id: TP.uid(), text: 'Frühstück', min: 12 },
          { id: TP.uid(), text: 'Tag planen', min: 3 }
        ] },
        { id: 'abend', name: 'Abend', start: '21:00', days: [0, 1, 2, 3, 4, 5, 6], steps: [
          { id: TP.uid(), text: 'Küche aufräumen', min: 10 },
          { id: TP.uid(), text: 'Kleidung für morgen rauslegen', min: 3 },
          { id: TP.uid(), text: 'Morgen planen', min: 5 }
        ] }
      ],
      habits: [
        { id: 'wasser', name: 'Wasser trinken', kind: 'count', target: 8, unit: 'Gläser', days: [0, 1, 2, 3, 4, 5, 6], created: t, archived: false },
        { id: 'lesen', name: 'Lesen', kind: 'check', target: 1, unit: '', days: [0, 1, 2, 3, 4, 5, 6], created: t, archived: false }
      ],
      tasks: [],
      days: {}
    };
  }

  // Alte Morgenroutine (mr.steps / mr.state) übernehmen
  const EMOJI = /^(?:[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}️‍⃣]|\s)+/u;
  function migrate(d) {
    let old = null, st = null;
    try { old = JSON.parse(localStorage.getItem('mr.steps')); st = JSON.parse(localStorage.getItem('mr.state')); } catch (e) {}
    if (!Array.isArray(old) || !old.length) return false;
    d.routines[0].steps = old.map((s) => ({ id: s.id || TP.uid(), text: (String(s.text || '').replace(EMOJI, '').trim() || String(s.text || '')), min: 0 }));
    if (st && st.date === TP.iso(new Date()) && Array.isArray(st.done)) {
      d.days[TP.today()] = { steps: st.done.slice(), habits: {} };
    }
    d.settings.migrated = true;
    return true;
  }

  function normalize(d) {
    const def = defaults();
    d.settings = Object.assign({}, def.settings, d.settings || {});
    d.routines = Array.isArray(d.routines) ? d.routines : [];
    d.habits = Array.isArray(d.habits) ? d.habits : [];
    d.tasks = Array.isArray(d.tasks) ? d.tasks : [];
    d.days = d.days && typeof d.days === 'object' ? d.days : {};
    d.routines.forEach((r) => { r.steps = r.steps || []; r.days = r.days || [0, 1, 2, 3, 4, 5, 6]; r.start = r.start || '05:00'; });
    d.habits.forEach((h) => { h.days = h.days || [0, 1, 2, 3, 4, 5, 6]; h.target = h.target || 1; h.kind = h.kind || 'check'; });
    return d;
  }

  TP.load = function () {
    let d = null;
    try { d = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
    if (!d || !d.settings) {
      d = defaults();
      TP.data = d;
      d.justMigrated = migrate(d);
    }
    TP.data = normalize(d);
    const created = TP.data.settings.created || TP.today();
    TP.data.habits.forEach((h) => { if (!h.created) h.created = created; });
    TP.save();
    return TP.data;
  };

  TP.save = function () {
    try { const copy = Object.assign({}, TP.data); delete copy.justMigrated; localStorage.setItem(KEY, JSON.stringify(copy)); }
    catch (e) { TP.toast && TP.toast('Speichern nicht möglich. Ist der Speicher voll?'); }
  };

  TP.day = function (date) {
    const k = date || TP.today();
    if (!TP.data.days[k]) TP.data.days[k] = { steps: [], habits: {} };
    const o = TP.data.days[k];
    o.steps = o.steps || []; o.habits = o.habits || {};
    return o;
  };
  TP.peek = (date) => TP.data.days[date] || { steps: [], habits: {} };

  // ---------- Gewohnheiten: Werte und Serien (werden berechnet, nie gespeichert) ----------
  TP.hDue = (h, date) => h.days.includes(TP.weekday(date));
  TP.hVal = (h, date) => TP.peek(date).habits[h.id] || 0;
  TP.hDone = (h, date) => TP.hVal(h, date) >= (h.kind === 'count' ? h.target : 1);
  TP.setHabit = function (h, date, v) {
    const day = TP.day(date);
    v = Math.max(0, Math.min(v, h.kind === 'count' ? 999 : 1));
    if (v) day.habits[h.id] = v; else delete day.habits[h.id];
    TP.save();
  };
  TP.streak = function (h) {
    const today = TP.today();
    let d = TP.hDone(h, today) ? today : TP.addDays(today, -1);
    let s = 0;
    const stop = h.created || today;
    for (let i = 0; i < 3660 && d >= stop; i++) {
      if (TP.hDue(h, d)) { if (TP.hDone(h, d)) s++; else break; }
      d = TP.addDays(d, -1);
    }
    return s;
  };
  TP.bestStreak = function (h) {
    const today = TP.today();
    let d = h.created || today, best = 0, cur = 0;
    for (let i = 0; i < 3660 && d <= today; i++) {
      if (TP.hDue(h, d)) { if (TP.hDone(h, d)) { cur++; best = Math.max(best, cur); } else if (d !== today) cur = 0; }
      d = TP.addDays(d, 1);
    }
    return best;
  };
  TP.rhythm = (h) => {
    const n = h.days.length;
    const base = n === 7 ? 'Täglich' : (n === 5 && !h.days.includes(5) && !h.days.includes(6)) ? 'Werktags' : h.days.slice().sort().map((i) => TP.WD[i]).join(', ');
    return h.kind === 'count' ? base + ' · ' + h.target + ' ' + (h.unit || '') : base;
  };

  // ---------- Routinen ----------
  TP.routinesToday = (date) => TP.data.routines.filter((r) => r.days.includes(TP.weekday(date || TP.today())) && r.steps.length);
  // Welche Routine läuft gerade? Die letzte, deren Startzeit schon erreicht ist (Tag beginnt um dayStart).
  TP.activeRoutine = function () {
    const list = TP.routinesToday().slice();
    if (!list.length) return null;
    const ds = TP.dayStart() * 60;
    const rel = (m) => (m - ds + 1440) % 1440;
    list.sort((a, b) => rel(TP.toMin(a.start)) - rel(TP.toMin(b.start)));
    const now = rel(TP.minutesNow());
    let act = list[0];
    list.forEach((r) => { if (rel(TP.toMin(r.start)) <= now) act = r; });
    return act;
  };
  TP.rDone = (r, date) => { const done = TP.peek(date || TP.today()).steps; return r.steps.filter((s) => done.includes(s.id)).length; };
  TP.toggleStep = function (r, step, date) {
    const day = TP.day(date);
    const i = day.steps.indexOf(step.id);
    const on = i < 0;
    if (on) day.steps.push(step.id); else day.steps.splice(i, 1);
    if (r.steps.length && TP.rDone(r, date) === 1 && on) day['start_' + r.id] = TP.minutesNow();
    if (on && TP.rDone(r, date) === r.steps.length) day['end_' + r.id] = TP.minutesNow();
    // Verknüpfte Gewohnheit mit abhaken
    const h = step.habit && TP.data.habits.find((x) => x.id === step.habit);
    if (h) {
      const v = TP.hVal(h, date || TP.today());
      if (h.kind === 'count') TP.setHabit(h, date || TP.today(), v + (on ? 1 : -1));
      else TP.setHabit(h, date || TP.today(), on ? 1 : 0);
    }
    TP.save();
  };

  // ---------- Aufgaben ----------
  TP.tasksFor = (date) => TP.data.tasks.filter((t) => t.date === date);
  TP.overdue = () => { const t = TP.today(); return TP.data.tasks.filter((x) => x.date && x.date < t && !x.done); };

  // ---------- Backup ----------
  TP.backupName = () => 'tagesplaner-backup-' + TP.today() + '.json';
  TP.exportJSON = () => { const copy = Object.assign({}, TP.data); delete copy.justMigrated; return JSON.stringify(copy, null, 1); };
  TP.importJSON = function (text) {
    const d = JSON.parse(text);
    if (!d || !d.settings || !Array.isArray(d.routines) || !d.days) throw new Error('Das ist keine Backup-Datei dieser App.');
    TP.data = normalize(d);
    TP.save();
  };
  TP.wipe = function () { try { localStorage.removeItem(KEY); localStorage.removeItem('mr.steps'); localStorage.removeItem('mr.state'); } catch (e) {} TP.data = null; TP.load(); };
})(window.TP);
