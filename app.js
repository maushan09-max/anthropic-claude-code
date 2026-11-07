'use strict';
/* LifeOS — a single-page personal life organiser. All data lives in localStorage. */

// ---------- Utilities ----------
const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const pad = (n) => String(n).padStart(2, '0');
const ymd = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseYmd = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (s, n) => { const d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d); };
const addMonths = (ym, n) => { const [y, m] = ym.split('-').map(Number); const d = new Date(y, m - 1 + n, 1); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; };
const today = () => ymd();
const fmtDate = (s, opts = { weekday: 'short', month: 'short', day: 'numeric' }) => (s ? parseYmd(s).toLocaleDateString(undefined, opts) : '');
const fmtMonth = (ym) => parseYmd(ym + '-01').toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
const fmtTime = (t) => { if (!t) return ''; const [h, m] = t.split(':').map(Number); const d = new Date(); d.setHours(h, m); return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }); };
const money = (n) => (db.settings.currency || '$') + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const relDay = (s) => {
  const diff = Math.round((parseYmd(s) - parseYmd(today())) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff < 0) return `${-diff}d overdue`;
  if (diff < 7) return fmtDate(s, { weekday: 'long' });
  return fmtDate(s);
};

// ---------- Constants ----------
const AREAS = ['Personal', 'Work', 'Home', 'Health', 'Finance', 'Learning', 'Social', 'Family'];
const AREA_COLORS = { Personal: '#6366f1', Work: '#0ea5e9', Home: '#f59e0b', Health: '#10b981', Finance: '#16a34a', Learning: '#a855f7', Social: '#ec4899', Family: '#ef4444' };
const REPEATS = [['none', 'Does not repeat'], ['daily', 'Daily'], ['weekly', 'Weekly'], ['monthly', 'Monthly'], ['yearly', 'Yearly']];
const PRIORITIES = [['low', 'Low'], ['med', 'Medium'], ['high', 'High']];
const EXPENSE_CATS = ['Housing', 'Food', 'Transport', 'Utilities', 'Health', 'Entertainment', 'Shopping', 'Education', 'Savings', 'Debt', 'Gifts', 'Other'];
const INCOME_CATS = ['Salary', 'Freelance', 'Investments', 'Gifts', 'Refunds', 'Other'];
const MOODS = ['😞', '😕', '😐', '🙂', '😄'];
const WATER_GOAL = 8;
const PROMPTS = [
  'What are three things you are grateful for today?', 'What would make today great?', 'What did you learn today?',
  'What is one thing you want to let go of?', 'Who made a difference to you recently, and how?', 'What drained your energy today? What gave you energy?',
  'What is a small win you had this week?', 'If today were your last day, what would you do differently?', 'What are you looking forward to?',
  'Describe a moment today you want to remember.', 'What habit is serving you well? Which one is not?', 'What is worrying you, and what can you control about it?',
];

const VIEWS = [
  ['today', 'Today', '☀️'], ['tasks', 'Tasks', '✅'], ['calendar', 'Calendar', '📅'], ['habits', 'Habits', '🔁'],
  ['goals', 'Goals', '🎯'], ['money', 'Money', '💰'], ['health', 'Health', '❤️'], ['journal', 'Journal', '📔'],
  ['notes', 'Notes', '📝'], ['lists', 'Lists', '🛒'], ['settings', 'Settings', '⚙️'],
];

// ---------- Storage ----------
const KEY = 'lifeos.v1';
const defaults = () => ({
  tasks: [], events: [], habits: [], goals: [], transactions: [], budgets: {}, health: {},
  journal: [], notes: [], lists: [], settings: { name: '', currency: '$', theme: 'auto' },
});
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { const d = JSON.parse(raw); return { ...defaults(), ...d, settings: { ...defaults().settings, ...(d.settings || {}) } }; }
  } catch (e) { console.warn('Load failed', e); }
  return defaults();
}
let db = load();
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { toast('Could not save: ' + e.message); }
}
const remove = (coll, id) => { db[coll] = db[coll].filter((x) => x.id !== id); };
const find = (coll, id) => db[coll].find((x) => x.id === id);

// ---------- UI state ----------
const state = {
  taskFilter: 'open', taskArea: 'All', taskQuery: '',
  calMonth: today().slice(0, 7), calDay: today(),
  moneyMonth: today().slice(0, 7), healthDay: today(),
  journalQuery: '', noteQuery: '',
};

// ---------- Domain helpers ----------
function nextDate(s, rep) {
  const d = parseYmd(s);
  if (rep === 'daily') d.setDate(d.getDate() + 1);
  else if (rep === 'weekly') d.setDate(d.getDate() + 7);
  else if (rep === 'monthly') d.setMonth(d.getMonth() + 1);
  else if (rep === 'yearly') d.setFullYear(d.getFullYear() + 1);
  return ymd(d);
}
function occursOn(ev, date) {
  if (!ev.date || date < ev.date) return false;
  if (date === ev.date) return true;
  const a = parseYmd(ev.date), b = parseYmd(date);
  switch (ev.repeat) {
    case 'daily': return true;
    case 'weekly': return a.getDay() === b.getDay();
    case 'monthly': return a.getDate() === b.getDate();
    case 'yearly': return a.getDate() === b.getDate() && a.getMonth() === b.getMonth();
    default: return false;
  }
}
const eventsOn = (d) => db.events.filter((e) => occursOn(e, d)).sort((a, b) => (a.time || '99').localeCompare(b.time || '99'));
const tasksDueOn = (d) => db.tasks.filter((t) => t.due === d);
const prioRank = { high: 0, med: 1, low: 2 };
const taskSort = (a, b) => (a.done - b.done) || ((a.due || '9999') .localeCompare(b.due || '9999')) || (prioRank[a.priority] - prioRank[b.priority]);
function streak(h) {
  let d = today();
  if (!h.log[d]) d = addDays(d, -1);
  let n = 0;
  while (h.log[d]) { n++; d = addDays(d, -1); }
  return n;
}
const habitRate = (h, days = 30) => { let n = 0; for (let i = 0; i < days; i++) if (h.log[addDays(today(), -i)]) n++; return Math.round((n / days) * 100); };
const goalProgress = (g) => (g.milestones?.length ? Math.round((g.milestones.filter((m) => m.done).length / g.milestones.length) * 100) : Number(g.progress || 0));
const healthOf = (d) => db.health[d] || {};
function setHealth(d, patch) { db.health[d] = { ...healthOf(d), ...patch }; }
function monthTotals(ym) {
  const tx = db.transactions.filter((t) => t.date?.startsWith(ym));
  const income = tx.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const expense = tx.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
  const byCat = {};
  tx.filter((t) => t.type === 'expense').forEach((t) => { byCat[t.category] = (byCat[t.category] || 0) + Number(t.amount); });
  return { tx, income, expense, net: income - expense, byCat };
}
const areaChip = (a) => (a ? `<span class="chip area" style="background:${AREA_COLORS[a] || '#64748b'}">${esc(a)}</span>` : '');
const empty = (icon, text) => `<div class="empty"><span class="big">${icon}</span>${text}</div>`;

// ---------- Generic modal form ----------
function fieldHtml(f, v) {
  v = v ?? f.default ?? '';
  const id = 'f_' + f.name;
  const cls = `field${f.half ? ' half' : ''}`;
  let input;
  switch (f.type) {
    case 'textarea':
      input = `<textarea id="${id}" name="${f.name}" rows="${f.rows || 4}" placeholder="${esc(f.placeholder || '')}">${esc(v)}</textarea>`; break;
    case 'select':
      input = `<select id="${id}" name="${f.name}">${f.options.map((o) => {
        const [val, lab] = Array.isArray(o) ? o : [o, o];
        return `<option value="${esc(val)}" ${String(val) === String(v) ? 'selected' : ''}>${esc(lab)}</option>`;
      }).join('')}</select>`; break;
    case 'checkbox':
      return `<label class="check"><input type="checkbox" name="${f.name}" ${v ? 'checked' : ''}> ${esc(f.label)}</label>`;
    default:
      input = `<input id="${id}" name="${f.name}" type="${f.type || 'text'}" value="${esc(v)}" ${f.required ? 'required' : ''}
        ${f.step ? `step="${f.step}"` : ''} ${f.min != null ? `min="${f.min}"` : ''} ${f.max != null ? `max="${f.max}"` : ''} placeholder="${esc(f.placeholder || '')}">`;
  }
  return `<label class="${cls}" for="${id}"><span>${esc(f.label)}</span>${input}</label>`;
}
function openForm({ title, fields, values = {}, onSave, onDelete }) {
  const dlg = $('#modal');
  dlg.innerHTML = `<form class="form" novalidate>
    <h2>${esc(title)}</h2>
    ${fields.map((f) => fieldHtml(f, values[f.name])).join('')}
    <div class="row end">
      ${onDelete ? '<button type="button" class="btn danger" data-del>Delete</button><span class="grow"></span>' : ''}
      <button type="button" class="btn ghost" data-cancel>Cancel</button>
      <button type="submit" class="btn primary">Save</button>
    </div></form>`;
  const form = $('form', dlg);
  form.onsubmit = (e) => {
    e.preventDefault();
    const out = {};
    for (const f of fields) {
      const el = form.elements[f.name];
      if (f.type === 'checkbox') out[f.name] = el.checked;
      else if (f.type === 'number') out[f.name] = el.value === '' ? null : Number(el.value);
      else out[f.name] = el.value.trim();
      if (f.required && (out[f.name] === '' || out[f.name] == null)) { el.focus(); toast(`${f.label} is required`); return; }
    }
    onSave(out);
    dlg.close(); save(); render();
  };
  $('[data-cancel]', dlg).onclick = () => dlg.close();
  if (onDelete) $('[data-del]', dlg).onclick = () => { if (confirm('Delete this permanently?')) { onDelete(); dlg.close(); save(); render(); toast('Deleted'); } };
  dlg.showModal();
  form.querySelector('input:not([type=checkbox]), textarea, select')?.focus();
}

// ---------- Forms per entity ----------
function taskForm(task, preset = {}) {
  openForm({
    title: task ? 'Edit task' : 'New task',
    values: { area: 'Personal', priority: 'med', repeat: 'none', ...preset, ...task },
    fields: [
      { name: 'title', label: 'Task', required: true, placeholder: 'What needs doing?' },
      { name: 'area', label: 'Area of life', type: 'select', options: AREAS, half: true },
      { name: 'priority', label: 'Priority', type: 'select', options: PRIORITIES, half: true },
      { name: 'due', label: 'Due date', type: 'date', half: true },
      { name: 'repeat', label: 'Repeat', type: 'select', options: REPEATS, half: true },
      { name: 'notes', label: 'Notes', type: 'textarea', rows: 3 },
    ],
    onSave: (v) => (task ? Object.assign(task, v) : db.tasks.push({ id: uid(), done: false, created: Date.now(), ...v })),
    onDelete: task ? () => remove('tasks', task.id) : null,
  });
}
function eventForm(ev, preset = {}) {
  openForm({
    title: ev ? 'Edit event' : 'New event',
    values: { date: state.calDay, area: 'Personal', repeat: 'none', ...preset, ...ev },
    fields: [
      { name: 'title', label: 'Event', required: true, placeholder: 'Dentist, birthday, meeting…' },
      { name: 'date', label: 'Date', type: 'date', required: true, half: true },
      { name: 'repeat', label: 'Repeat', type: 'select', options: REPEATS, half: true },
      { name: 'time', label: 'Start time', type: 'time', half: true },
      { name: 'end', label: 'End time', type: 'time', half: true },
      { name: 'location', label: 'Location', half: true },
      { name: 'area', label: 'Area of life', type: 'select', options: AREAS, half: true },
      { name: 'notes', label: 'Notes', type: 'textarea', rows: 3 },
    ],
    onSave: (v) => (ev ? Object.assign(ev, v) : db.events.push({ id: uid(), ...v })),
    onDelete: ev ? () => remove('events', ev.id) : null,
  });
}
function habitForm(h) {
  openForm({
    title: h ? 'Edit habit' : 'New habit',
    values: { area: 'Health', ...h },
    fields: [
      { name: 'name', label: 'Habit', required: true, placeholder: 'Read 20 minutes, meditate, walk…' },
      { name: 'area', label: 'Area of life', type: 'select', options: AREAS, half: true },
      { name: 'cue', label: 'When / cue', half: true, placeholder: 'After morning coffee' },
    ],
    onSave: (v) => (h ? Object.assign(h, v) : db.habits.push({ id: uid(), log: {}, created: today(), ...v })),
    onDelete: h ? () => remove('habits', h.id) : null,
  });
}
function goalForm(g) {
  openForm({
    title: g ? 'Edit goal' : 'New goal',
    values: { area: 'Personal', ...g },
    fields: [
      { name: 'title', label: 'Goal', required: true, placeholder: 'Run a half marathon' },
      { name: 'area', label: 'Area of life', type: 'select', options: AREAS, half: true },
      { name: 'target', label: 'Target date', type: 'date', half: true },
      { name: 'why', label: 'Why does this matter?', type: 'textarea', rows: 3 },
    ],
    onSave: (v) => (g ? Object.assign(g, v) : db.goals.push({ id: uid(), milestones: [], progress: 0, created: today(), ...v })),
    onDelete: g ? () => remove('goals', g.id) : null,
  });
}
function txForm(tx, type = 'expense') {
  const t = tx?.type || type;
  openForm({
    title: `${tx ? 'Edit' : 'Add'} ${t}`,
    values: { date: today(), category: t === 'income' ? INCOME_CATS[0] : EXPENSE_CATS[1], ...tx },
    fields: [
      { name: 'amount', label: 'Amount', type: 'number', step: '0.01', min: 0, required: true, half: true },
      { name: 'date', label: 'Date', type: 'date', required: true, half: true },
      { name: 'category', label: 'Category', type: 'select', options: t === 'income' ? INCOME_CATS : EXPENSE_CATS, half: true },
      { name: 'note', label: 'Description', half: true, placeholder: 'Groceries, rent…' },
    ],
    onSave: (v) => (tx ? Object.assign(tx, v) : db.transactions.push({ id: uid(), type: t, ...v })),
    onDelete: tx ? () => remove('transactions', tx.id) : null,
  });
}
function budgetForm() {
  openForm({
    title: 'Monthly budgets',
    values: db.budgets,
    fields: EXPENSE_CATS.map((c) => ({ name: c, label: c, type: 'number', step: '1', min: 0, half: true, placeholder: 'No limit' })),
    onSave: (v) => { db.budgets = Object.fromEntries(Object.entries(v).filter(([, n]) => n)); },
  });
}
function journalForm(j) {
  openForm({
    title: j ? 'Edit entry' : 'New journal entry',
    values: { date: today(), mood: '3', ...j },
    fields: [
      { name: 'date', label: 'Date', type: 'date', required: true, half: true },
      { name: 'mood', label: 'Mood', type: 'select', options: MOODS.map((m, i) => [String(i + 1), m]), half: true },
      { name: 'title', label: 'Title', placeholder: 'Optional' },
      { name: 'body', label: 'Entry', type: 'textarea', rows: 10, required: true, placeholder: dailyPrompt() },
    ],
    onSave: (v) => (j ? Object.assign(j, v) : db.journal.push({ id: uid(), ...v })),
    onDelete: j ? () => remove('journal', j.id) : null,
  });
}
function noteForm(n) {
  openForm({
    title: n ? 'Edit note' : 'New note',
    values: n || {},
    fields: [
      { name: 'title', label: 'Title', required: true },
      { name: 'body', label: 'Note', type: 'textarea', rows: 10 },
      { name: 'tags', label: 'Tags (comma separated)', placeholder: 'ideas, recipes, passwords-hints' },
      { name: 'pinned', label: 'Pin to top', type: 'checkbox' },
    ],
    onSave: (v) => (n ? Object.assign(n, v, { updated: Date.now() }) : db.notes.push({ id: uid(), updated: Date.now(), ...v })),
    onDelete: n ? () => remove('notes', n.id) : null,
  });
}
function listForm(l) {
  openForm({
    title: l ? 'Rename list' : 'New list',
    values: l || {},
    fields: [{ name: 'name', label: 'List name', required: true, placeholder: 'Groceries, packing, books to read…' }],
    onSave: (v) => (l ? Object.assign(l, v) : db.lists.push({ id: uid(), items: [], ...v })),
    onDelete: l ? () => remove('lists', l.id) : null,
  });
}
const dailyPrompt = (d = today()) => PROMPTS[[...d].reduce((s, c) => s + c.charCodeAt(0), 0) % PROMPTS.length];

// ---------- Shared renderers ----------
function taskItem(t) {
  const isOver = !t.done && t.due && t.due < today();
  return `<li class="item ${t.done ? 'done' : ''}">
    <input type="checkbox" ${t.done ? 'checked' : ''} data-action="toggleTask" data-id="${t.id}" aria-label="Complete">
    <div class="body" data-action="editTask" data-id="${t.id}" style="cursor:pointer">
      <div class="title">${esc(t.title)}</div>
      <div class="meta">${areaChip(t.area)}
        ${t.due ? `<span class="${isOver ? 'overdue' : ''}">📅 ${esc(relDay(t.due))}</span>` : ''}
        ${t.priority === 'high' ? '<span class="prio-high">● High</span>' : t.priority === 'med' ? '<span class="prio-med">● Med</span>' : ''}
        ${t.repeat && t.repeat !== 'none' ? `<span>🔁 ${esc(t.repeat)}</span>` : ''}
        ${t.notes ? '<span>📝</span>' : ''}
      </div>
    </div>
    <div class="acts"><button class="icon-btn" data-action="delTask" data-id="${t.id}" aria-label="Delete">✕</button></div>
  </li>`;
}
function eventItem(e) {
  return `<li class="item" data-action="editEvent" data-id="${e.id}" style="cursor:pointer">
    <div style="min-width:62px" class="small"><b>${e.time ? esc(fmtTime(e.time)) : 'All day'}</b>${e.end ? `<div class="muted">${esc(fmtTime(e.end))}</div>` : ''}</div>
    <div class="body"><div class="title">${esc(e.title)}</div>
      <div class="meta">${areaChip(e.area)}${e.location ? `<span>📍 ${esc(e.location)}</span>` : ''}${e.repeat && e.repeat !== 'none' ? `<span>🔁 ${esc(e.repeat)}</span>` : ''}</div>
    </div></li>`;
}
function habitRow(h, compact = false) {
  const days = [];
  for (let i = compact ? 0 : 6; i >= 0; i--) {
    const d = addDays(today(), -i);
    const dt = parseYmd(d);
    days.push(`<button class="hday ${h.log[d] ? 'on' : ''}" data-action="toggleHabit" data-id="${h.id}|${d}" title="${esc(fmtDate(d))}">
      ${compact ? (h.log[d] ? '✓' : '') : `${dt.toLocaleDateString(undefined, { weekday: 'narrow' })}<b>${dt.getDate()}</b>`}</button>`);
  }
  const s = streak(h);
  return `<li class="item habit-row" style="align-items:center">
    <div class="body"><div class="title">${esc(h.name)}</div>
      <div class="meta">${areaChip(h.area)}${h.cue ? `<span>⏰ ${esc(h.cue)}</span>` : ''}${s ? `<span class="streak">🔥 ${s}</span>` : ''}</div></div>
    <div class="habit-days">${days.join('')}</div>
  </li>`;
}

// ---------- Views ----------
const views = {};

views.today = () => {
  const t = today();
  const hr = new Date().getHours();
  const greet = hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';
  const due = db.tasks.filter((x) => !x.done && x.due && x.due <= t).sort(taskSort);
  const upcoming = db.tasks.filter((x) => !x.done && x.due && x.due > t && x.due <= addDays(t, 7)).sort(taskSort);
  const evs = eventsOn(t);
  const tomorrowEvs = eventsOn(addDays(t, 1));
  const h = healthOf(t);
  const m = monthTotals(t.slice(0, 7));
  const goals = db.goals.filter((g) => goalProgress(g) < 100).slice(0, 3);
  const jToday = db.journal.find((j) => j.date === t);
  const habitsDone = db.habits.filter((x) => x.log[t]).length;

  return `
  <div class="section">
    <div style="font-size:26px;font-weight:700">${greet}${db.settings.name ? ', ' + esc(db.settings.name) : ''} 👋</div>
    <div class="muted">${esc(new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }))}</div>
  </div>
  <div class="stats">
    <div class="stat"><div class="label">Due today</div><div class="value">${due.length}</div></div>
    <div class="stat"><div class="label">Events</div><div class="value">${evs.length}</div></div>
    <div class="stat"><div class="label">Habits</div><div class="value">${habitsDone}/${db.habits.length}</div></div>
    <div class="stat"><div class="label">Spent this month</div><div class="value">${money(m.expense)}</div></div>
  </div>
  <div class="grid">
    <div class="card">
      <h2>✅ Tasks <span class="spacer"></span><a class="card-link" href="#/tasks">All tasks →</a></h2>
      <form class="quick-add" data-form="quickTask"><input name="title" placeholder="Add a task for today…" autocomplete="off"><button class="btn primary">Add</button></form>
      ${due.length ? `<ul class="items">${due.map(taskItem).join('')}</ul>` : empty('🎉', 'Nothing due today.')}
      ${upcoming.length ? `<div class="section-title">Next 7 days</div><ul class="items">${upcoming.slice(0, 5).map(taskItem).join('')}</ul>` : ''}
    </div>
    <div class="card">
      <h2>📅 Schedule <span class="spacer"></span><button class="btn sm" data-action="newEvent" data-id="${t}">+ Event</button></h2>
      ${evs.length ? `<ul class="items">${evs.map(eventItem).join('')}</ul>` : empty('🗓️', 'No events today.')}
      ${tomorrowEvs.length ? `<div class="section-title">Tomorrow</div><ul class="items">${tomorrowEvs.map(eventItem).join('')}</ul>` : ''}
    </div>
    <div class="card">
      <h2>🔁 Habits <span class="spacer"></span><a class="card-link" href="#/habits">Manage →</a></h2>
      ${db.habits.length ? `<ul class="items">${db.habits.map((x) => habitRow(x, true)).join('')}</ul>` : empty('🌱', 'Build a routine — <a href="#/habits">add your first habit</a>.')}
    </div>
    <div class="card">
      <h2>❤️ Wellbeing <span class="spacer"></span><a class="card-link" href="#/health">Health log →</a></h2>
      <div class="small muted">How are you feeling?</div>
      <div class="moods" style="margin:6px 0 12px">${MOODS.map((e, i) => `<button class="mood-btn ${h.mood == i + 1 ? 'on' : ''}" data-action="setMood" data-id="${t}|${i + 1}">${e}</button>`).join('')}</div>
      <div class="row"><span class="small muted grow">Water ${h.water || 0}/${WATER_GOAL} glasses</span>
        <button class="btn sm" data-action="water" data-id="${t}|-1">−</button><button class="btn sm" data-action="water" data-id="${t}|1">+ 💧</button></div>
      <div class="bar ${(h.water || 0) >= WATER_GOAL ? 'done' : ''}" style="margin-top:6px"><span style="width:${Math.min(100, ((h.water || 0) / WATER_GOAL) * 100)}%"></span></div>
    </div>
    <div class="card">
      <h2>💰 This month <span class="spacer"></span><a class="card-link" href="#/money">Money →</a></h2>
      <div class="row" style="justify-content:space-between">
        <div><div class="small muted">Income</div><b class="good">${money(m.income)}</b></div>
        <div><div class="small muted">Spent</div><b class="bad">${money(m.expense)}</b></div>
        <div><div class="small muted">Net</div><b class="${m.net >= 0 ? 'good' : 'bad'}">${money(m.net)}</b></div>
      </div>
      <div class="row" style="margin-top:12px"><button class="btn sm" data-action="newTx" data-id="expense">+ Expense</button><button class="btn sm" data-action="newTx" data-id="income">+ Income</button></div>
    </div>
    <div class="card">
      <h2>🎯 Goals <span class="spacer"></span><a class="card-link" href="#/goals">All goals →</a></h2>
      ${goals.length ? goals.map((g) => { const p = goalProgress(g); return `<div style="margin-bottom:10px"><div class="row"><span class="grow">${esc(g.title)}</span><span class="small muted">${p}%</span></div><div class="bar"><span style="width:${p}%"></span></div></div>`; }).join('') : empty('🏔️', 'What do you want to achieve? <a href="#/goals">Set a goal</a>.')}
    </div>
    <div class="card">
      <h2>📔 Journal</h2>
      <div class="prompt small">💭 ${esc(dailyPrompt())}</div>
      ${jToday ? `<div class="small muted">You wrote today: “${esc((jToday.title || jToday.body).slice(0, 80))}…”</div><button class="btn sm" style="margin-top:8px" data-action="editJournal" data-id="${jToday.id}">Continue writing</button>` : '<button class="btn primary sm" data-action="newJournal">Write today’s entry</button>'}
    </div>
  </div>`;
};

views.tasks = () => {
  const t = today();
  const q = state.taskQuery.toLowerCase();
  let list = db.tasks.filter((x) => state.taskArea === 'All' || x.area === state.taskArea)
    .filter((x) => !q || x.title.toLowerCase().includes(q) || (x.notes || '').toLowerCase().includes(q));
  const f = state.taskFilter;
  if (f === 'open') list = list.filter((x) => !x.done);
  if (f === 'today') list = list.filter((x) => !x.done && x.due && x.due <= t);
  if (f === 'upcoming') list = list.filter((x) => !x.done && x.due && x.due > t);
  if (f === 'someday') list = list.filter((x) => !x.done && !x.due);
  if (f === 'done') list = list.filter((x) => x.done);
  list.sort(taskSort);
  const filters = [['open', 'All open'], ['today', 'Today & overdue'], ['upcoming', 'Upcoming'], ['someday', 'No date'], ['done', 'Completed']];
  const doneCount = db.tasks.filter((x) => x.done).length;
  return `
  <div class="toolbar">
    <div class="seg">${filters.map(([k, l]) => `<button class="${f === k ? 'on' : ''}" data-action="taskFilter" data-id="${k}">${l}</button>`).join('')}</div>
    <select data-change="taskArea" aria-label="Area"><option>All</option>${AREAS.map((a) => `<option ${a === state.taskArea ? 'selected' : ''}>${a}</option>`).join('')}</select>
    <input type="search" id="task-search" placeholder="Search tasks…" value="${esc(state.taskQuery)}" data-input="taskQuery">
  </div>
  <div class="card">
    <form class="quick-add" data-form="quickTask"><input name="title" placeholder="Quick add a task and press Enter…" autocomplete="off"><button class="btn primary">Add</button></form>
    ${list.length ? `<ul class="items">${list.map(taskItem).join('')}</ul>` : empty('📭', f === 'done' ? 'No completed tasks yet.' : 'No tasks here. Enjoy the calm.')}
    ${f === 'done' && doneCount ? '<div class="row end" style="margin-top:10px"><button class="btn sm danger" data-action="clearDone">Clear completed</button></div>' : ''}
  </div>`;
};

views.calendar = () => {
  const [y, m] = state.calMonth.split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const start = new Date(first);
  start.setDate(1 - ((first.getDay() + 6) % 7)); // weeks start Monday
  const t = today();
  const cells = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i);
    const s = ymd(d);
    const evs = eventsOn(s), tks = tasksDueOn(s).filter((x) => !x.done);
    const shown = evs.slice(0, 3);
    cells.push(`<div class="day ${d.getMonth() !== m - 1 ? 'other' : ''} ${s === t ? 'today' : ''} ${s === state.calDay ? 'sel' : ''}" data-action="pickDay" data-id="${s}">
      <span class="num">${d.getDate()}</span>
      ${shown.map((e) => `<span class="ev">${e.time ? esc(e.time) + ' ' : ''}${esc(e.title)}</span>`).join('')}
      ${evs.length > 3 ? `<span class="tk">+${evs.length - 3} more</span>` : ''}
      ${tks.slice(0, 2).map((x) => `<span class="tk">☐ ${esc(x.title)}</span>`).join('')}
    </div>`);
  }
  const dow = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const dayEvs = eventsOn(state.calDay), dayTasks = tasksDueOn(state.calDay).sort(taskSort);
  return `
  <div class="toolbar">
    <button class="btn" data-action="calNav" data-id="-1">‹</button>
    <b style="min-width:160px;text-align:center">${esc(fmtMonth(state.calMonth))}</b>
    <button class="btn" data-action="calNav" data-id="1">›</button>
    <button class="btn ghost" data-action="calNav" data-id="0">Today</button>
  </div>
  <div class="cal">${dow.map((d) => `<div class="dow">${d}</div>`).join('')}${cells.join('')}</div>
  <div class="grid" style="margin-top:18px">
    <div class="card">
      <h2>${esc(fmtDate(state.calDay, { weekday: 'long', month: 'long', day: 'numeric' }))}<span class="spacer"></span>
        <button class="btn sm" data-action="newEvent" data-id="${state.calDay}">+ Event</button>
        <button class="btn sm" data-action="newTaskOn" data-id="${state.calDay}">+ Task</button></h2>
      ${dayEvs.length ? `<ul class="items">${dayEvs.map(eventItem).join('')}</ul>` : ''}
      ${dayTasks.length ? `<div class="section-title">Tasks due</div><ul class="items">${dayTasks.map(taskItem).join('')}</ul>` : ''}
      ${!dayEvs.length && !dayTasks.length ? empty('🌤️', 'Nothing planned.') : ''}
    </div>
  </div>`;
};

views.habits = () => {
  if (!db.habits.length) return `<div class="card">${empty('🌱', 'Habits are small actions repeated daily. Start with one.<br><br><button class="btn primary" data-action="newHabit">+ New habit</button>')}</div>`;
  return `
  <div class="card"><h2>Last 7 days</h2><ul class="items">${db.habits.map((h) => habitRow(h)).join('')}</ul></div>
  <div class="section-title">Insights</div>
  <div class="grid">${db.habits.map((h) => {
    const heat = []; for (let i = 29; i >= 0; i--) { const d = addDays(today(), -i); heat.push(`<span class="${h.log[d] ? 'on' : ''}" title="${esc(fmtDate(d))}"></span>`); }
    let best = 0, run = 0; Object.keys(h.log).sort().forEach((d, i, arr) => { run = i && addDays(arr[i - 1], 1) === d ? run + 1 : 1; best = Math.max(best, run); });
    return `<div class="card"><h3>${esc(h.name)}<span class="spacer"></span><button class="icon-btn" data-action="editHabit" data-id="${h.id}" aria-label="Edit">✎</button></h3>
      <div class="row small"><span>🔥 Current: <b>${streak(h)}</b></span><span>🏆 Best: <b>${best}</b></span><span>📈 30-day: <b>${habitRate(h)}%</b></span></div>
      <div class="heat">${heat.join('')}</div></div>`;
  }).join('')}</div>`;
};

views.goals = () => {
  if (!db.goals.length) return `<div class="card">${empty('🎯', 'Goals give your days direction. Break them into milestones.<br><br><button class="btn primary" data-action="newGoal">+ New goal</button>')}</div>`;
  const sorted = [...db.goals].sort((a, b) => (goalProgress(a) === 100) - (goalProgress(b) === 100) || (a.target || '9999').localeCompare(b.target || '9999'));
  return `<div class="grid wide">${sorted.map((g) => {
    const p = goalProgress(g);
    const ms = g.milestones || [];
    return `<div class="card">
      <h3>${p === 100 ? '🏆' : '🎯'} ${esc(g.title)}<span class="spacer"></span><button class="icon-btn" data-action="editGoal" data-id="${g.id}" aria-label="Edit">✎</button></h3>
      <div class="meta row small muted" style="margin-bottom:8px">${areaChip(g.area)}${g.target ? `<span>🗓 ${esc(fmtDate(g.target, { month: 'short', day: 'numeric', year: 'numeric' }))}</span>` : ''}</div>
      ${g.why ? `<div class="small muted" style="margin-bottom:8px">💡 ${esc(g.why)}</div>` : ''}
      <div class="row"><div class="bar grow ${p === 100 ? 'done' : ''}"><span style="width:${p}%"></span></div><b class="small">${p}%</b></div>
      ${!ms.length ? `<input type="range" min="0" max="100" step="5" value="${p}" data-change="goalProgress" data-id="${g.id}" style="width:100%;margin-top:8px" aria-label="Progress">` : ''}
      <ul class="items" style="margin-top:8px">${ms.map((m) => `<li class="item ${m.done ? 'done' : ''}">
        <input type="checkbox" ${m.done ? 'checked' : ''} data-action="toggleMilestone" data-id="${g.id}|${m.id}"><div class="body title">${esc(m.text)}</div>
        <div class="acts"><button class="icon-btn" data-action="delMilestone" data-id="${g.id}|${m.id}" aria-label="Delete">✕</button></div></li>`).join('')}</ul>
      <form class="quick-add" data-form="addMilestone" data-id="${g.id}" style="margin-top:8px"><input name="text" placeholder="Add a milestone…" autocomplete="off"><button class="btn sm">Add</button></form>
    </div>`;
  }).join('')}</div>`;
};

views.money = () => {
  const ym = state.moneyMonth;
  const m = monthTotals(ym);
  const cats = [...new Set([...Object.keys(db.budgets), ...Object.keys(m.byCat)])].sort((a, b) => (m.byCat[b] || 0) - (m.byCat[a] || 0));
  const budgetTotal = Object.values(db.budgets).reduce((s, n) => s + Number(n), 0);
  const tx = [...m.tx].sort((a, b) => b.date.localeCompare(a.date));
  // last 6 months trend
  const trend = []; for (let i = 5; i >= 0; i--) { const k = addMonths(ym, -i); trend.push([k, monthTotals(k)]); }
  const maxT = Math.max(1, ...trend.map(([, x]) => Math.max(x.income, x.expense)));
  return `
  <div class="toolbar">
    <button class="btn" data-action="moneyNav" data-id="-1">‹</button><b style="min-width:150px;text-align:center">${esc(fmtMonth(ym))}</b><button class="btn" data-action="moneyNav" data-id="1">›</button>
    <span class="grow"></span><button class="btn" data-action="editBudgets">Set budgets</button>
  </div>
  <div class="stats">
    <div class="stat"><div class="label">Income</div><div class="value good">${money(m.income)}</div></div>
    <div class="stat"><div class="label">Expenses</div><div class="value bad">${money(m.expense)}</div></div>
    <div class="stat"><div class="label">Net</div><div class="value ${m.net >= 0 ? 'good' : 'bad'}">${money(m.net)}</div></div>
    <div class="stat"><div class="label">Savings rate</div><div class="value">${m.income ? Math.round((m.net / m.income) * 100) : 0}%</div></div>
  </div>
  <div class="grid wide">
    <div class="card"><h2>Spending by category${budgetTotal ? `<span class="spacer"></span><span class="small muted">Budget ${money(budgetTotal)}</span>` : ''}</h2>
      ${cats.length ? cats.map((c) => {
        const spent = m.byCat[c] || 0, b = Number(db.budgets[c] || 0);
        const pct = b ? Math.min(100, (spent / b) * 100) : (m.expense ? (spent / m.expense) * 100 : 0);
        return `<div style="margin-bottom:10px"><div class="row small"><span class="grow">${esc(c)}</span><b>${money(spent)}</b>${b ? `<span class="muted">/ ${money(b)}</span>` : ''}</div>
          <div class="bar ${b && spent > b ? 'over' : ''}"><span style="width:${pct}%"></span></div></div>`;
      }).join('') : empty('🧾', 'No spending recorded this month.')}
    </div>
    <div class="card"><h2>6-month trend</h2>
      <div class="chart" style="height:150px">${trend.map(([k, x]) => `<div class="col" title="${esc(fmtMonth(k))}: +${money(x.income)} / −${money(x.expense)}">
        <div style="display:flex;gap:2px;align-items:flex-end;height:100%;width:100%;justify-content:center">
          <i style="height:${(x.income / maxT) * 100}%;background:var(--good)"></i><i style="height:${(x.expense / maxT) * 100}%;background:var(--bad)"></i></div>
        <small>${esc(parseYmd(k + '-01').toLocaleDateString(undefined, { month: 'short' }))}</small></div>`).join('')}</div>
      <div class="small muted row"><span><span style="color:var(--good)">■</span> Income</span><span><span style="color:var(--bad)">■</span> Expenses</span></div>
    </div>
  </div>
  <div class="card" style="margin-top:16px"><h2>Transactions<span class="spacer"></span>
    <button class="btn sm" data-action="newTx" data-id="expense">+ Expense</button><button class="btn sm" data-action="newTx" data-id="income">+ Income</button></h2>
    ${tx.length ? `<ul class="items">${tx.map((x) => `<li class="item" data-action="editTx" data-id="${x.id}" style="cursor:pointer;align-items:center">
      <div class="body"><div class="title">${esc(x.note || x.category)}</div><div class="meta"><span>${esc(fmtDate(x.date))}</span><span class="chip">${esc(x.category)}</span></div></div>
      <b class="${x.type === 'income' ? 'good' : 'bad'}">${x.type === 'income' ? '+' : '−'}${money(x.amount)}</b></li>`).join('')}</ul>` : empty('💸', 'No transactions this month.')}
  </div>`;
};

views.health = () => {
  const d = state.healthDay;
  const h = healthOf(d);
  const days = []; for (let i = 13; i >= 0; i--) days.push(addDays(today(), -i));
  const chart = (key, max, color, unit) => {
    const vals = days.map((x) => Number(healthOf(x)[key] || 0));
    const top = Math.max(max, ...vals);
    const logged = vals.filter(Boolean);
    const avg = logged.length ? (logged.reduce((s, n) => s + n, 0) / logged.length).toFixed(1) : '–';
    return `<div class="small muted">14-day average: <b>${avg}${logged.length ? ' ' + unit : ''}</b></div>
      <div class="chart">${days.map((x, i) => `<div class="col" title="${esc(fmtDate(x))}: ${vals[i]} ${unit}"><i style="height:${(vals[i] / top) * 100}%;background:${color}"></i><small>${parseYmd(x).getDate()}</small></div>`).join('')}</div>`;
  };
  return `
  <div class="toolbar">
    <button class="btn" data-action="healthNav" data-id="-1">‹</button><b style="min-width:180px;text-align:center">${esc(relDay(d) === 'Today' ? 'Today' : fmtDate(d, { weekday: 'long', month: 'short', day: 'numeric' }))}</b>
    <button class="btn" data-action="healthNav" data-id="1" ${d >= today() ? 'disabled' : ''}>›</button>
  </div>
  <div class="grid">
    <div class="card"><h2>😊 Mood</h2>
      <div class="moods">${MOODS.map((e, i) => `<button class="mood-btn ${h.mood == i + 1 ? 'on' : ''}" data-action="setMood" data-id="${d}|${i + 1}">${e}</button>`).join('')}</div></div>
    <div class="card"><h2>💧 Water<span class="spacer"></span><span class="small muted">${h.water || 0} / ${WATER_GOAL}</span></h2>
      <div class="water">${Array.from({ length: Math.max(WATER_GOAL, h.water || 0) }, (_, i) => `<span class="${i < (h.water || 0) ? 'on' : ''}">💧</span>`).join('')}</div>
      <div class="row"><button class="btn sm" data-action="water" data-id="${d}|-1">− Glass</button><button class="btn sm primary" data-action="water" data-id="${d}|1">+ Glass</button></div></div>
    <div class="card"><h2>📋 Daily log</h2>
      <div class="form-grid">
        <label class="field"><span>Sleep (hours)</span><input type="number" step="0.5" min="0" max="24" value="${esc(h.sleep ?? '')}" data-change="health" data-id="${d}|sleep"></label>
        <label class="field"><span>Exercise (min)</span><input type="number" step="5" min="0" value="${esc(h.exercise ?? '')}" data-change="health" data-id="${d}|exercise"></label>
        <label class="field"><span>Steps</span><input type="number" step="100" min="0" value="${esc(h.steps ?? '')}" data-change="health" data-id="${d}|steps"></label>
        <label class="field"><span>Weight</span><input type="number" step="0.1" min="0" value="${esc(h.weight ?? '')}" data-change="health" data-id="${d}|weight"></label>
      </div>
      <label class="field" style="margin-top:10px"><span>Notes (symptoms, meds, meals…)</span><textarea rows="2" data-change="health" data-id="${d}|notes">${esc(h.notes || '')}</textarea></label>
    </div>
  </div>
  <div class="section-title">Trends</div>
  <div class="grid">
    <div class="card"><h3>😴 Sleep</h3>${chart('sleep', 8, '#6366f1', 'h')}</div>
    <div class="card"><h3>🏃 Exercise</h3>${chart('exercise', 30, '#10b981', 'min')}</div>
    <div class="card"><h3>💧 Water</h3>${chart('water', WATER_GOAL, '#0ea5e9', 'glasses')}</div>
    <div class="card"><h3>😊 Mood</h3>${chart('mood', 5, '#f59e0b', '/5')}</div>
  </div>`;
};

views.journal = () => {
  const q = state.journalQuery.toLowerCase();
  const list = db.journal.filter((j) => !q || (j.title + ' ' + j.body).toLowerCase().includes(q)).sort((a, b) => b.date.localeCompare(a.date));
  return `
  <div class="prompt">💭 <b>Today's prompt:</b> ${esc(dailyPrompt())}</div>
  <div class="toolbar"><input type="search" id="journal-search" placeholder="Search entries…" value="${esc(state.journalQuery)}" data-input="journalQuery">
    <span class="muted small">${db.journal.length} entr${db.journal.length === 1 ? 'y' : 'ies'}</span></div>
  ${list.length ? list.map((j) => `<div class="card journal-entry" style="margin-bottom:12px;cursor:pointer" data-action="editJournal" data-id="${j.id}">
    <div class="row"><span style="font-size:22px">${MOODS[(j.mood || 3) - 1]}</span><div class="grow"><b>${esc(j.title || fmtDate(j.date, { weekday: 'long' }))}</b>
    <div class="small muted">${esc(fmtDate(j.date, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }))}</div></div></div>
    <div class="text">${esc(j.body)}</div></div>`).join('') : `<div class="card">${empty('📔', q ? 'No matching entries.' : 'Your journal is empty. Writing a few lines a day builds clarity.')}</div>`}`;
};

views.notes = () => {
  const q = state.noteQuery.toLowerCase();
  const list = db.notes.filter((n) => !q || (n.title + ' ' + (n.body || '') + ' ' + (n.tags || '')).toLowerCase().includes(q))
    .sort((a, b) => (!!b.pinned - !!a.pinned) || b.updated - a.updated);
  const tags = [...new Set(db.notes.flatMap((n) => (n.tags || '').split(',').map((s) => s.trim()).filter(Boolean)))].sort();
  return `
  <div class="toolbar"><input type="search" id="note-search" placeholder="Search notes…" value="${esc(state.noteQuery)}" data-input="noteQuery">
    ${tags.map((t) => `<button class="chip" style="border:none;cursor:pointer" data-action="tagFilter" data-id="${esc(t)}">#${esc(t)}</button>`).join('')}</div>
  ${list.length ? `<div class="grid">${list.map((n) => `<div class="card note ${n.pinned ? 'pinned' : ''}" data-action="editNote" data-id="${n.id}">
    <b>${n.pinned ? '📌 ' : ''}${esc(n.title)}</b><div class="text">${esc(n.body || '')}</div>
    <div class="row">${(n.tags || '').split(',').map((s) => s.trim()).filter(Boolean).map((t) => `<span class="chip">#${esc(t)}</span>`).join('')}
    <span class="grow"></span><span class="small muted">${esc(new Date(n.updated).toLocaleDateString())}</span></div></div>`).join('')}</div>`
    : `<div class="card">${empty('📝', q ? 'No matching notes.' : 'Capture ideas, recipes, references — anything you want to remember.')}</div>`}`;
};

views.lists = () => {
  if (!db.lists.length) return `<div class="card">${empty('🛒', 'Groceries, packing, gift ideas, books to read…<br><br><button class="btn primary" data-action="newList">+ New list</button>')}</div>`;
  return `<div class="grid">${db.lists.map((l) => {
    const done = l.items.filter((i) => i.done).length;
    const items = [...l.items].sort((a, b) => a.done - b.done);
    return `<div class="card"><h3>${esc(l.name)}<span class="small muted">${done}/${l.items.length}</span><span class="spacer"></span>
      <button class="icon-btn" data-action="editList" data-id="${l.id}" aria-label="Edit">✎</button></h3>
      <form class="quick-add" data-form="addListItem" data-id="${l.id}"><input name="text" placeholder="Add item…" autocomplete="off"><button class="btn sm">Add</button></form>
      <ul class="items">${items.map((i) => `<li class="item ${i.done ? 'done' : ''}">
        <input type="checkbox" ${i.done ? 'checked' : ''} data-action="toggleListItem" data-id="${l.id}|${i.id}"><div class="body title">${esc(i.text)}</div>
        <div class="acts"><button class="icon-btn" data-action="delListItem" data-id="${l.id}|${i.id}" aria-label="Delete">✕</button></div></li>`).join('')}</ul>
      ${done ? `<div class="row end" style="margin-top:8px"><button class="btn sm ghost" data-action="clearListDone" data-id="${l.id}">Clear checked</button></div>` : ''}
    </div>`;
  }).join('')}</div>`;
};

views.settings = () => {
  const s = db.settings;
  const counts = [['Tasks', db.tasks.length], ['Events', db.events.length], ['Habits', db.habits.length], ['Goals', db.goals.length],
    ['Transactions', db.transactions.length], ['Health days', Object.keys(db.health).length], ['Journal', db.journal.length], ['Notes', db.notes.length], ['Lists', db.lists.length]];
  return `<div class="grid">
    <div class="card"><h2>Profile</h2>
      <label class="field"><span>Your name</span><input value="${esc(s.name)}" data-change="setting" data-id="name" placeholder="For your greeting"></label>
      <div class="form-grid" style="margin-top:10px">
        <label class="field"><span>Currency symbol</span><input value="${esc(s.currency)}" data-change="setting" data-id="currency" maxlength="4"></label>
        <label class="field"><span>Theme</span><select data-change="setting" data-id="theme">${[['auto', 'System'], ['light', 'Light'], ['dark', 'Dark']].map(([v, l]) => `<option value="${v}" ${s.theme === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      </div></div>
    <div class="card"><h2>Backup & restore</h2>
      <p class="small muted">Everything is stored privately in this browser. Export a backup regularly, or to move to another device.</p>
      <div class="row"><button class="btn primary" data-action="exportData">⬇ Export backup</button>
        <label class="btn">⬆ Import backup<input type="file" accept="application/json,.json" data-change="importData" hidden></label></div></div>
    <div class="card"><h2>Your data</h2>
      <ul class="items">${counts.map(([k, v]) => `<li class="item"><span class="grow">${k}</span><b>${v}</b></li>`).join('')}</ul>
      <div class="row end" style="margin-top:10px"><button class="btn danger sm" data-action="resetData">Erase all data</button></div></div>
  </div>`;
};

// Primary action button per view
const TOP_ACTIONS = {
  tasks: ['newTask', '+ Task'], calendar: ['newEvent', '+ Event'], habits: ['newHabit', '+ Habit'], goals: ['newGoal', '+ Goal'],
  money: ['newTx', '+ Expense'], journal: ['newJournal', '+ Entry'], notes: ['newNote', '+ Note'], lists: ['newList', '+ List'],
};

// ---------- Rendering ----------
const currentView = () => { const v = location.hash.replace(/^#\/?/, ''); return views[v] ? v : 'today'; };
function render() {
  const v = currentView();
  const active = document.activeElement;
  const focusId = active?.id, selStart = active?.selectionStart;

  document.documentElement.dataset.theme = db.settings.theme === 'auto' ? '' : db.settings.theme;
  const overdue = db.tasks.filter((t) => !t.done && t.due && t.due <= today()).length;
  $('#nav').innerHTML = VIEWS.map(([k, label, ico]) => `<a href="#/${k}" class="${k === v ? 'active' : ''}"><span class="ico">${ico}</span>${label}
    ${k === 'tasks' && overdue ? `<span class="badge">${overdue}</span>` : ''}</a>`).join('');
  const meta = VIEWS.find((x) => x[0] === v);
  $('#page-title').textContent = meta[1];
  document.title = `${meta[1]} · LifeOS`;
  const ta = TOP_ACTIONS[v];
  $('#top-actions').innerHTML = ta ? `<button class="btn primary" data-action="${ta[0]}" ${v === 'money' ? 'data-id="expense"' : ''}>${ta[1]}</button>` : '';
  $('#main').innerHTML = views[v]();

  if (focusId) {
    const el = document.getElementById(focusId);
    if (el) { el.focus(); try { el.setSelectionRange(selStart, selStart); } catch { /* not a text input */ } }
  }
}

// ---------- Actions ----------
const split = (id) => id.split('|');
const actions = {
  toggleNav: () => document.body.classList.toggle('nav-open'),
  closeNav: () => document.body.classList.remove('nav-open'),

  newTask: () => taskForm(null),
  newTaskOn: (d) => taskForm(null, { due: d }),
  editTask: (id) => taskForm(find('tasks', id)),
  delTask: (id) => { const t = find('tasks', id); remove('tasks', id); commit(); toastUndo('Task deleted', () => db.tasks.push(t)); },
  toggleTask: (id) => {
    const t = find('tasks', id);
    t.done = !t.done;
    t.completed = t.done ? Date.now() : null;
    if (t.done && t.repeat && t.repeat !== 'none' && t.due && !t.spawned) {
      t.spawned = true;
      db.tasks.push({ ...t, id: uid(), done: false, completed: null, spawned: false, due: nextDate(t.due, t.repeat), created: Date.now() });
      toast(`Next one scheduled for ${relDay(nextDate(t.due, t.repeat))}`);
    }
    commit();
  },
  taskFilter: (k) => { state.taskFilter = k; render(); },
  clearDone: () => { if (confirm('Remove all completed tasks?')) { db.tasks = db.tasks.filter((t) => !t.done); commit(); } },

  newEvent: (d) => eventForm(null, d && /^\d{4}-/.test(d) ? { date: d } : {}),
  editEvent: (id) => eventForm(find('events', id)),
  pickDay: (d) => { state.calDay = d; if (d.slice(0, 7) !== state.calMonth) state.calMonth = d.slice(0, 7); render(); },
  calNav: (n) => {
    if (n === '0') { state.calMonth = today().slice(0, 7); state.calDay = today(); } else state.calMonth = addMonths(state.calMonth, Number(n));
    render();
  },

  newHabit: () => habitForm(null),
  editHabit: (id) => habitForm(find('habits', id)),
  toggleHabit: (id) => { const [hid, d] = split(id); const h = find('habits', hid); if (h.log[d]) delete h.log[d]; else h.log[d] = true; commit(); },

  newGoal: () => goalForm(null),
  editGoal: (id) => goalForm(find('goals', id)),
  toggleMilestone: (id) => {
    const [gid, mid] = split(id); const g = find('goals', gid); const m = g.milestones.find((x) => x.id === mid);
    m.done = !m.done; commit(); if (goalProgress(g) === 100) toast('🏆 Goal complete! Amazing work.');
  },
  delMilestone: (id) => { const [gid, mid] = split(id); const g = find('goals', gid); g.milestones = g.milestones.filter((x) => x.id !== mid); commit(); },

  newTx: (type) => txForm(null, type === 'income' ? 'income' : 'expense'),
  editTx: (id) => txForm(find('transactions', id)),
  editBudgets: () => budgetForm(),
  moneyNav: (n) => { state.moneyMonth = addMonths(state.moneyMonth, Number(n)); render(); },

  setMood: (id) => { const [d, n] = split(id); setHealth(d, { mood: healthOf(d).mood == n ? null : Number(n) }); commit(); },
  water: (id) => { const [d, n] = split(id); setHealth(d, { water: Math.max(0, (healthOf(d).water || 0) + Number(n)) }); commit(); },
  healthNav: (n) => { const d = addDays(state.healthDay, Number(n)); if (d <= today()) { state.healthDay = d; render(); } },

  newJournal: () => journalForm(null),
  editJournal: (id) => journalForm(find('journal', id)),

  newNote: () => noteForm(null),
  editNote: (id) => noteForm(find('notes', id)),
  tagFilter: (t) => { state.noteQuery = state.noteQuery === t ? '' : t; render(); },

  newList: () => listForm(null),
  editList: (id) => listForm(find('lists', id)),
  toggleListItem: (id) => { const [lid, iid] = split(id); const i = find('lists', lid).items.find((x) => x.id === iid); i.done = !i.done; commit(); },
  delListItem: (id) => { const [lid, iid] = split(id); const l = find('lists', lid); l.items = l.items.filter((x) => x.id !== iid); commit(); },
  clearListDone: (id) => { const l = find('lists', id); l.items = l.items.filter((x) => !x.done); commit(); },

  exportData: () => {
    const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `lifeos-backup-${today()}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast('Backup downloaded');
  },
  resetData: () => {
    if (confirm('Erase ALL LifeOS data on this device? Export a backup first if unsure.') && confirm('Really erase everything? This cannot be undone.')) {
      db = defaults(); commit(); toast('All data erased');
    }
  },
};
function commit() { save(); render(); }

const forms = {
  quickTask: (f) => {
    const title = f.elements.title.value.trim(); if (!title) return;
    db.tasks.push({ id: uid(), title, area: 'Personal', priority: 'med', repeat: 'none', due: currentView() === 'today' ? today() : '', done: false, created: Date.now() });
    commit(); $('form[data-form=quickTask] input')?.focus();
  },
  addMilestone: (f) => {
    const text = f.elements.text.value.trim(); if (!text) return;
    find('goals', f.dataset.id).milestones.push({ id: uid(), text, done: false }); commit();
    $(`form[data-form=addMilestone][data-id="${f.dataset.id}"] input`)?.focus();
  },
  addListItem: (f) => {
    const text = f.elements.text.value.trim(); if (!text) return;
    find('lists', f.dataset.id).items.push({ id: uid(), text, done: false }); commit();
    $(`form[data-form=addListItem][data-id="${f.dataset.id}"] input`)?.focus();
  },
};

const changes = {
  taskArea: (el) => { state.taskArea = el.value; render(); },
  goalProgress: (el) => { find('goals', el.dataset.id).progress = Number(el.value); commit(); },
  health: (el) => {
    const [d, key] = split(el.dataset.id);
    setHealth(d, { [key]: key === 'notes' ? el.value : el.value === '' ? null : Number(el.value) });
    save(); // no re-render so typing isn't interrupted
  },
  setting: (el) => { db.settings[el.dataset.id] = el.value.trim(); commit(); },
  importData: (el) => {
    const file = el.files[0]; if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const data = JSON.parse(r.result);
        if (typeof data !== 'object' || !Array.isArray(data.tasks)) throw new Error('Not a LifeOS backup');
        if (!confirm('Replace your current data with this backup?')) return;
        db = { ...defaults(), ...data, settings: { ...defaults().settings, ...(data.settings || {}) } };
        commit(); toast('Backup restored');
      } catch (e) { toast('Import failed: ' + e.message); }
    };
    r.readAsText(file);
  },
};

// ---------- Toasts ----------
let toastTimer;
function toast(msg, actionLabel, onAction) {
  const el = $('#toast');
  el.innerHTML = esc(msg) + (actionLabel ? ` <button class="btn sm" style="margin-left:8px;pointer-events:auto">${esc(actionLabel)}</button>` : '');
  if (actionLabel) $('button', el).onclick = () => { onAction(); el.classList.remove('show'); };
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), actionLabel ? 5000 : 2500);
}
const toastUndo = (msg, undo) => toast(msg, 'Undo', () => { undo(); commit(); });

// ---------- Event wiring ----------
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-action]');
  if (!t || !actions[t.dataset.action]) return;
  if (t.tagName === 'A') e.preventDefault();
  e.stopPropagation();
  actions[t.dataset.action](t.dataset.id, t, e);
});
document.addEventListener('submit', (e) => {
  const f = e.target.closest('form[data-form]');
  if (!f) return;
  e.preventDefault();
  forms[f.dataset.form]?.(f);
});
document.addEventListener('change', (e) => {
  const el = e.target.closest('[data-change]');
  if (el) changes[el.dataset.change]?.(el);
});
document.addEventListener('input', (e) => {
  const el = e.target.closest('[data-input]');
  if (el) { state[el.dataset.input] = el.value; render(); }
});
document.addEventListener('keydown', (e) => {
  if (e.target.matches('input, textarea, select') || e.metaKey || e.ctrlKey || e.altKey || $('#modal').open) return;
  const keyMap = { n: () => actions.newTask(), e: () => actions.newEvent(), j: () => actions.newJournal(), '/': () => $('input[type=search]')?.focus() };
  const nums = VIEWS.map((v) => v[0]);
  if (keyMap[e.key]) { e.preventDefault(); keyMap[e.key](); }
  else if (/^[1-9]$/.test(e.key)) location.hash = '#/' + nums[Number(e.key) - 1];
});
$('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') e.target.close(); }); // click backdrop to close
window.addEventListener('hashchange', () => { document.body.classList.remove('nav-open'); render(); $('#main').focus({ preventScroll: true }); window.scrollTo(0, 0); });
window.addEventListener('storage', (e) => { if (e.key === KEY) { db = load(); render(); } }); // sync across tabs

// Re-render at midnight so "today" stays correct for long-open tabs
let lastDay = today();
setInterval(() => { if (today() !== lastDay) { lastDay = today(); state.healthDay = lastDay; render(); } }, 60000);

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

render();
