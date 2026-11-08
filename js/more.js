'use strict';
/* Journal, Habits, Goals, Notes, Settings. */

// ---------- Journal ----------
const PROMPTS = [
  'What are three things you are grateful for today?', 'What would make today great?', 'What did you learn today?',
  'What is one thing you want to let go of?', 'Who made a difference to you recently, and how?', 'What drained your energy today? What gave you energy?',
  'What is a small win you had this week?', 'What are you looking forward to?', 'Describe a moment today you want to remember.',
  'What habit is serving you well? Which one is not?', 'What is worrying you, and what can you control about it?', 'How did you take care of yourself today?',
];
const dailyPrompt = (d = today()) => PROMPTS[[...d].reduce((s, c) => s + c.charCodeAt(0), 0) % PROMPTS.length];
views.journal = () => {
  const q = state.journalQuery.toLowerCase();
  const list = db.journal.filter((j) => !q || ((j.title || '') + ' ' + j.body).toLowerCase().includes(q)).sort((a, b) => b.date.localeCompare(a.date));
  return `
  <div class="prompt">${icon('chat')} <b>Today's prompt:</b> ${esc(dailyPrompt())}</div>
  <div class="toolbar"><input type="search" id="journal-search" placeholder="Search entries…" value="${esc(state.journalQuery)}" data-input="journalQuery">
    <span class="muted small">${plural(db.journal.length, 'entry', 'entries')}</span></div>
  ${list.length ? list.map((j) => `<div class="card journal-entry clickable" data-action="editJournal" data-id="${j.id}">
    <div class="row"><span style="font-size:22px">${MOODS[(j.mood || 3) - 1]}</span><div class="grow"><b>${esc(j.title || fmtDate(j.date, { weekday: 'long' }))}</b>
    <div class="small muted">${esc(fmtDate(j.date, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }))}</div></div></div>
    <div class="text">${esc(j.body)}</div></div>`).join('') : `<div class="card">${empty('book', q ? 'No matching entries.' : 'Your journal is empty. A few lines a day builds clarity.')}</div>`}`;
};
TOP_ACTIONS.journal = ['newJournal', '+ Entry'];
function journalForm(j) {
  openForm({
    title: j ? 'Edit entry' : 'New journal entry', values: { date: today(), mood: '3', ...j },
    fields: [
      { name: 'date', label: 'Date', type: 'date', half: true },
      { name: 'mood', label: 'Mood', type: 'select', options: MOOD_LABELS.map((m, i) => [String(i + 1), m]), half: true },
      { name: 'title', label: 'Title', placeholder: 'Optional' },
      { name: 'body', label: 'Entry', type: 'textarea', rows: 10, required: true, placeholder: dailyPrompt() },
    ],
    onSave: (v) => { v.date ||= today(); if (j) Object.assign(j, v); else db.journal.push({ id: uid(), ...v }); },
    onDelete: j ? () => remove('journal', j.id) : null,
  });
}
actions.newJournal = () => journalForm(null);
actions.editJournal = (id) => journalForm(find('journal', id));

// ---------- Habits ----------
function streak(h) {
  let d = today();
  if (!h.log[d]) d = addDays(d, -1);
  let n = 0;
  while (h.log[d]) { n++; d = addDays(d, -1); }
  return n;
}
const habitRate = (h, days = 30) => { let n = 0; for (let i = 0; i < days; i++) if (h.log[addDays(today(), -i)]) n++; return Math.round((n / days) * 100); };
function habitRow(h, compact = false) {
  const days = [];
  for (let i = compact ? 0 : 6; i >= 0; i--) {
    const d = addDays(today(), -i), dt = parseYmd(d);
    days.push(`<button class="hday ${h.log[d] ? 'on' : ''}" data-action="toggleHabit" data-id="${h.id}|${d}" title="${esc(fmtDate(d))}">
      ${compact ? (h.log[d] ? icon('check') : '') : `${DOW_SHORT[dt.getDay()][0]}<b>${dt.getDate()}</b>`}</button>`);
  }
  const s = streak(h);
  return `<li class="item habit-row" style="align-items:center">
    <div class="body"><div class="title">${esc(h.name)}</div>
      <div class="meta">${areaChip(h.area)}${h.cue ? `<span>${icon('clock')} ${esc(h.cue)}</span>` : ''}${s ? `<span class="streak">${icon('flame')} ${s}</span>` : ''}</div></div>
    <div class="habit-days">${days.join('')}</div></li>`;
}
views.habits = () => {
  if (!db.habits.length) return `<div class="card">${empty('sprout', 'Habits are small actions repeated daily. Start with one.<br><br><button class="btn primary" data-action="newHabit">+ New habit</button>')}</div>`;
  return `<div class="card"><h2>${hi('calWeek')} Last 7 days</h2><ul class="items">${db.habits.map((h) => habitRow(h)).join('')}</ul></div>
  <div class="section-title">Insights</div>
  <div class="grid">${db.habits.map((h) => {
    const heat = []; for (let i = 29; i >= 0; i--) { const d = addDays(today(), -i); heat.push(`<span class="${h.log[d] ? 'on' : ''}" title="${esc(fmtDate(d))}"></span>`); }
    let best = 0, run = 0; Object.keys(h.log).sort().forEach((d, i, arr) => { run = i && addDays(arr[i - 1], 1) === d ? run + 1 : 1; best = Math.max(best, run); });
    return `<div class="card"><h3>${esc(h.name)}<span class="spacer"></span><button class="icon-btn" data-action="editHabit" data-id="${h.id}" aria-label="Edit">${icon('edit')}</button></h3>
      <div class="row small"><span>${icon('flame')} Current: <b>${streak(h)}</b></span><span>${icon('trophy')} Best: <b>${best}</b></span><span>${icon('trend')} 30-day: <b>${habitRate(h)}%</b></span></div>
      <div class="heat">${heat.join('')}</div></div>`;
  }).join('')}</div>`;
};
TOP_ACTIONS.habits = ['newHabit', '+ Habit'];
function habitForm(h) {
  openForm({
    title: h ? 'Edit habit' : 'New habit', values: { area: 'Health', ...h },
    fields: [
      { name: 'name', label: 'Habit', required: true, placeholder: 'Read 20 minutes, walk, pray on time…' },
      { name: 'area', label: 'Area of life', type: 'select', options: AREAS, half: true },
      { name: 'cue', label: 'When / cue', half: true, placeholder: 'After morning coffee' },
    ],
    onSave: (v) => (h ? Object.assign(h, v) : db.habits.push({ id: uid(), log: {}, created: today(), ...v })),
    onDelete: h ? () => remove('habits', h.id) : null,
  });
}
Object.assign(actions, {
  newHabit: () => habitForm(null),
  editHabit: (id) => habitForm(find('habits', id)),
  toggleHabit: (id) => { const [hid, d] = split(id); const h = find('habits', hid); if (h.log[d]) delete h.log[d]; else h.log[d] = true; commit(); },
});

// ---------- Goals ----------
const goalProgress = (g) => (g.milestones?.length ? Math.round((g.milestones.filter((m) => m.done).length / g.milestones.length) * 100) : Number(g.progress || 0));
views.goals = () => {
  if (!db.goals.length) return `<div class="card">${empty('target', 'Goals give your days direction. Break them into milestones.<br><br><button class="btn primary" data-action="newGoal">+ New goal</button>')}</div>`;
  const sorted = [...db.goals].sort((a, b) => (goalProgress(a) === 100) - (goalProgress(b) === 100) || (a.target || '9999').localeCompare(b.target || '9999'));
  return `<div class="grid wide">${sorted.map((g) => {
    const p = goalProgress(g), ms = g.milestones || [];
    return `<div class="card">
      <h3>${hi(p === 100 ? 'trophy' : 'target')} ${esc(g.title)}<span class="spacer"></span><button class="icon-btn" data-action="editGoal" data-id="${g.id}" aria-label="Edit">${icon('edit')}</button></h3>
      <div class="meta row small muted" style="margin-bottom:8px">${areaChip(g.area)}${g.target ? `<span>${icon('calendar')} ${esc(fmtDate(g.target, { month: 'short', day: 'numeric', year: 'numeric' }))}</span>` : ''}</div>
      ${g.why ? `<div class="small muted" style="margin-bottom:8px">${icon('bulb')} ${esc(g.why)}</div>` : ''}
      <div class="row"><div class="grow">${bar(p, p === 100 ? 'done' : '')}</div><b class="small">${p}%</b></div>
      ${!ms.length ? `<input type="range" min="0" max="100" step="5" value="${p}" data-change="goalProgress" data-id="${g.id}" style="width:100%;margin-top:8px" aria-label="Progress">` : ''}
      <ul class="items" style="margin-top:8px">${ms.map((m) => `<li class="item ${m.done ? 'done' : ''}">
        <input type="checkbox" ${m.done ? 'checked' : ''} data-action="toggleMilestone" data-id="${g.id}|${m.id}"><div class="body title">${esc(m.text)}</div>
        <div class="acts"><button class="icon-btn" data-action="delMilestone" data-id="${g.id}|${m.id}" aria-label="Delete">${icon('x')}</button></div></li>`).join('')}</ul>
      <form class="quick-add" data-form="addMilestone" data-id="${g.id}" style="margin-top:8px"><input name="text" placeholder="Add a milestone…" autocomplete="off"><button class="btn sm">Add</button></form>
    </div>`;
  }).join('')}</div>`;
};
TOP_ACTIONS.goals = ['newGoal', '+ Goal'];
function goalForm(g) {
  openForm({
    title: g ? 'Edit goal' : 'New goal', values: { area: 'Personal', ...g },
    fields: [
      { name: 'title', label: 'Goal', required: true, placeholder: 'Save USD 5,000' },
      { name: 'area', label: 'Area of life', type: 'select', options: AREAS, half: true },
      { name: 'target', label: 'Target date', type: 'date', half: true },
      { name: 'why', label: 'Why does this matter?', type: 'textarea', rows: 3 },
    ],
    onSave: (v) => (g ? Object.assign(g, v) : db.goals.push({ id: uid(), milestones: [], progress: 0, created: today(), ...v })),
    onDelete: g ? () => remove('goals', g.id) : null,
  });
}
Object.assign(actions, {
  newGoal: () => goalForm(null),
  editGoal: (id) => goalForm(find('goals', id)),
  toggleMilestone: (id) => {
    const [gid, mid] = split(id); const g = find('goals', gid); const m = g.milestones.find((x) => x.id === mid);
    m.done = !m.done; commit(); if (goalProgress(g) === 100) toast('Goal complete! Amazing work.');
  },
  delMilestone: (id) => { const [gid, mid] = split(id); const g = find('goals', gid); g.milestones = g.milestones.filter((x) => x.id !== mid); commit(); },
});
forms.addMilestone = (f) => {
  const text = f.elements.text.value.trim(); if (!text) return;
  find('goals', f.dataset.id).milestones.push({ id: uid(), text, done: false }); commit();
  $(`form[data-form=addMilestone][data-id="${f.dataset.id}"] input`)?.focus();
};
changes.goalProgress = (el) => { find('goals', el.dataset.id).progress = Number(el.value); commit(); };

// ---------- Notes ----------
views.notes = () => {
  const q = state.noteQuery.toLowerCase();
  const list = db.notes.filter((n) => !q || (n.title + ' ' + (n.body || '') + ' ' + (n.tags || '')).toLowerCase().includes(q))
    .sort((a, b) => (!!b.pinned - !!a.pinned) || b.updated - a.updated);
  const tagsOf = (n) => (n.tags || '').split(',').map((s) => s.trim()).filter(Boolean);
  const tags = [...new Set(db.notes.flatMap(tagsOf))].sort();
  return `
  <div class="toolbar"><input type="search" id="note-search" placeholder="Search notes…" value="${esc(state.noteQuery)}" data-input="noteQuery">
    ${tags.map((t) => `<button class="chip chip-btn" data-action="tagFilter" data-id="${esc(t)}">#${esc(t)}</button>`).join('')}</div>
  ${list.length ? `<div class="grid">${list.map((n) => `<div class="card note clickable ${n.pinned ? 'pinned' : ''}" data-action="editNote" data-id="${n.id}">
    <b>${n.pinned ? icon('pushpin') + ' ' : ''}${esc(n.title)}</b><div class="text">${esc(n.body || '')}</div>
    <div class="row">${tagsOf(n).map((t) => `<span class="chip">#${esc(t)}</span>`).join('')}
    <span class="grow"></span><span class="small muted">${esc(new Date(n.updated).toLocaleDateString())}</span></div></div>`).join('')}</div>`
    : `<div class="card">${empty('note', q ? 'No matching notes.' : 'Capture ideas, recipes, references — anything you want to remember.')}</div>`}`;
};
TOP_ACTIONS.notes = ['newNote', '+ Note'];
function noteForm(n) {
  openForm({
    title: n ? 'Edit note' : 'New note', values: n || {},
    fields: [
      { name: 'title', label: 'Title', required: true },
      { name: 'body', label: 'Note', type: 'textarea', rows: 10 },
      { name: 'tags', label: 'Tags (comma separated)', placeholder: 'ideas, recipes' },
      { name: 'pinned', label: 'Pin to top', type: 'checkbox' },
    ],
    onSave: (v) => (n ? Object.assign(n, v, { updated: Date.now() }) : db.notes.push({ id: uid(), updated: Date.now(), ...v })),
    onDelete: n ? () => remove('notes', n.id) : null,
  });
}
Object.assign(actions, {
  newNote: () => noteForm(null),
  editNote: (id) => noteForm(find('notes', id)),
  tagFilter: (t) => { state.noteQuery = state.noteQuery === t ? '' : t; render(); },
});

// ---------- Settings ----------
views.settings = () => {
  const s = db.settings;
  const perm = 'Notification' in window ? Notification.permission : 'unsupported';
  const counts = [['Tasks', db.tasks.length], ['Events', db.events.length], ['Meal plans (weeks)', Object.keys(db.meals).length], ['Saved foods', db.foods.length],
    ['Body measurements', db.body.length], ['Medications', db.meds.length], ['Savings accounts', db.accounts.length], ['Loans', db.loans.length],
    ['Duty roster weeks', Object.keys(db.roster).length], ['Trips', db.trips.length], ['Journal entries', db.journal.length], ['Notes', db.notes.length]];
  return `<div class="grid">
    <div class="card"><h2>${hi('sliders')} Profile</h2>
      <label class="field"><span>Your name</span><input value="${esc(s.name)}" data-change="setting" data-id="name" placeholder="For your greeting"></label>
      <div class="form-grid" style="margin-top:10px">
        <label class="field"><span>Spending currency</span><input value="${esc(s.currency)}" data-change="setting" data-id="currency" maxlength="4"></label>
        <label class="field"><span>1 USD in MVR</span><input type="number" step="0.01" value="${esc(s.usdRate)}" data-change="setting" data-id="usdRate"></label>
        <label class="field"><span>Theme</span><select data-change="setting" data-id="theme">${[['auto', 'System'], ['light', 'Light'], ['dark', 'Dark']].map(([v, l]) => `<option value="${v}" ${s.theme === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      </div></div>
    <div class="card"><h2>${hi('bell')} Reminders</h2>
      <p class="small muted">LifeOS shows reminders while it is open (or open in a background tab). For reminders that always reach you, even when the app is closed,
        use <b>Add to phone calendar</b> on any task or event — your phone's calendar app will alert you.</p>
      <div class="row"><span class="grow small">Browser notifications: <b>${{ granted: 'On', denied: 'Blocked in browser settings', default: 'Not enabled yet', unsupported: 'Not supported here' }[perm]}</b></span>
        ${perm === 'default' ? '<button class="btn sm primary" data-action="enableNotify">Enable</button>' : ''}
        ${perm === 'granted' ? '<button class="btn sm" data-action="testNotify">Test</button>' : ''}</div></div>
    <div class="card"><h2>${hi('download')} Backup & restore</h2>
      <p class="small muted">Everything is stored privately in this browser. Export a backup regularly, and to move to another device.</p>
      <div class="row"><button class="btn primary" data-action="exportData">${icon('download')} Export backup</button>
        <label class="btn">${icon('upload')} Import backup<input type="file" accept="application/json,.json" data-change="importData" hidden></label></div></div>
    <div class="card"><h2>${hi('chart')} Your data</h2>
      <ul class="items">${counts.map(([k, v]) => `<li class="item"><span class="grow">${k}</span><b>${v}</b></li>`).join('')}</ul>
      <div class="row end" style="margin-top:10px"><button class="btn danger sm" data-action="resetData">Erase all data</button></div></div>
  </div>`;
};
Object.assign(actions, {
  enableNotify: () => askNotify(),
  testNotify: () => notify('LifeOS reminder test', 'Notifications are working'),
  exportData: () => { download(JSON.stringify(db, null, 2), `lifeos-backup-${today()}.json`, 'application/json'); toast('Backup downloaded'); },
  resetData: () => {
    if (confirm('Erase ALL LifeOS data on this device? Export a backup first if unsure.') && confirm('Really erase everything? This cannot be undone.')) {
      db = migrate({}); commit(); toast('All data erased');
    }
  },
});
Object.assign(changes, {
  setting: (el) => { db.settings[el.dataset.id] = el.type === 'number' ? Number(el.value) || 0 : el.value.trim(); commit(); },
  importData: (el) => {
    const file = el.files[0]; if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const data = JSON.parse(r.result);
        if (typeof data !== 'object' || !Array.isArray(data.tasks)) throw new Error('Not a LifeOS backup');
        if (!confirm('Replace your current data with this backup?')) return;
        db = migrate(data); commit(); toast('Backup restored');
      } catch (e) { toast('Import failed: ' + e.message); }
    };
    r.readAsText(file);
  },
});
