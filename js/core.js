'use strict';
/* LifeOS core: utilities, storage, shared UI helpers (forms, calendars, charts), tasks/events, reminders. */

// ---------- Utilities ----------
const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const pad = (n) => String(n).padStart(2, '0');
const ymd = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseYmd = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (s, n) => { const d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d); };
const addMonths = (ym, n) => { const [y, m] = ym.split('-').map(Number); const d = new Date(y, m - 1 + n, 1); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; };
const daysBetween = (a, b) => Math.round((parseYmd(b) - parseYmd(a)) / 86400000);
const today = () => ymd();
/** Weeks start on Sunday. */
const weekStart = (s = today()) => { const d = parseYmd(s); d.setDate(d.getDate() - d.getDay()); return ymd(d); };
const daysInMonth = (ym) => { const [y, m] = ym.split('-').map(Number); return new Date(y, m, 0).getDate(); };
const monthDays = (ym) => Array.from({ length: daysInMonth(ym) }, (_, i) => `${ym}-${pad(i + 1)}`);
const DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DOW_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const fmtDate = (s, opts = { weekday: 'short', month: 'short', day: 'numeric' }) => (s ? parseYmd(s).toLocaleDateString(undefined, opts) : '');
const fmtMonth = (ym) => parseYmd(ym + '-01').toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
const fmtWeek = (ws) => `${fmtDate(ws, { month: 'short', day: 'numeric' })} – ${fmtDate(addDays(ws, 6), { month: 'short', day: 'numeric', year: 'numeric' })}`;
const fmtTime = (t) => { if (!t) return ''; const [h, m] = t.split(':').map(Number); const d = new Date(); d.setHours(h, m); return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }); };
const fmtNum = (n, dp = 2) => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: dp, maximumFractionDigits: dp });
const fmtCur = (n, c = 'MVR') => {
  const neg = Number(n) < 0 ? '−' : '';
  const v = fmtNum(Math.abs(Number(n) || 0));
  if (c === 'USD' || c === '$') return `${neg}$${v}`;
  return c.length === 1 ? `${neg}${c}${v}` : `${neg}${c} ${v}`;
};
const money = (n) => fmtCur(n, db.settings.currency || 'MVR');
const relDay = (s) => {
  const diff = daysBetween(today(), s);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff < 0) return `${-diff}d overdue`;
  if (diff < 7) return fmtDate(s, { weekday: 'long' });
  return fmtDate(s);
};
const plural = (n, w, p = w + 's') => `${n} ${n === 1 ? w : p}`;
const round1 = (n) => Math.round(n * 10) / 10;

// ---------- Constants ----------
const AREAS = ['Personal', 'Work', 'Home', 'Health', 'Finance', 'Learning', 'Social', 'Family'];
const AREA_COLORS = { Personal: '#6366f1', Work: '#0ea5e9', Home: '#f59e0b', Health: '#10b981', Finance: '#16a34a', Learning: '#a855f7', Social: '#ec4899', Family: '#ef4444' };
const REPEATS = [['none', 'Does not repeat'], ['daily', 'Daily'], ['weekly', 'Weekly'], ['monthly', 'Monthly'], ['yearly', 'Yearly']];
const REMINDS = [['', 'No reminder'], ['0', 'At the time'], ['10', '10 minutes before'], ['30', '30 minutes before'], ['60', '1 hour before'],
  ['120', '2 hours before'], ['1440', '1 day before'], ['2880', '2 days before'], ['10080', '1 week before']];
const MOODS = ['😞', '😕', '😐', '🙂', '😄'];
const WATER_GOAL = 8;

// ---------- Storage ----------
const KEY = 'lifeos.v1';
const defaults = () => ({
  tasks: [], events: [], habits: [], goals: [], transactions: [], budgets: {}, health: {}, journal: [], notes: [], lists: [],
  meals: {}, foods: [], body: [], cycle: {}, poop: {}, meds: [], accounts: [], loans: [], roster: {}, dutyTypes: null, trips: [], fired: {},
  settings: { name: '', currency: 'MVR', theme: 'auto', usdRate: 15.42, targets: { kcal: 2000, p: 120, c: 200, f: 65 } },
});
function migrate(d) {
  const base = defaults();
  const out = { ...base, ...d, settings: { ...base.settings, ...(d.settings || {}) } };
  out.settings.targets = { ...base.settings.targets, ...(d.settings?.targets || {}) };
  const ws = weekStart();
  out.tasks.forEach((t) => {
    if (t.important === undefined) t.important = t.priority === 'high';
    if (!t.due && !t.week) t.week = ws;
  });
  if (!out.lists.length) out.lists.push({ id: uid(), name: 'Things to buy', items: [] });
  if (!Array.isArray(out.dutyTypes)) {
    out.dutyTypes = [
      { id: uid(), name: 'Morning', start: '07:00', end: '15:00', color: '#f59e0b' },
      { id: uid(), name: 'Evening', start: '15:00', end: '23:00', color: '#6366f1' },
      { id: uid(), name: 'Night', start: '23:00', end: '07:00', color: '#334155' },
      { id: uid(), name: 'Day off', start: '', end: '', color: '#10b981' },
    ];
  }
  return out;
}
function load() {
  try { const raw = localStorage.getItem(KEY); if (raw) return migrate(JSON.parse(raw)); } catch (e) { console.warn('Load failed', e); }
  return migrate({});
}
let db = load();
function save() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { toast('Could not save: ' + e.message); } }
const remove = (coll, id) => { db[coll] = db[coll].filter((x) => x.id !== id); };
const find = (coll, id) => db[coll].find((x) => x.id === id);
const clone = (o) => JSON.parse(JSON.stringify(o));

// ---------- UI state & registries (extended by the other modules) ----------
const state = {
  week: weekStart(), calMonth: today().slice(0, 7), calDay: today(), monthFilter: 'all',
  moneyMonth: today().slice(0, 7), healthDay: today(), healthTab: 'daily', healthMonth: today().slice(0, 7),
  financeTab: 'savings', mealWeek: weekStart(), rosterWeek: weekStart(), tripId: null,
  journalQuery: '', noteQuery: '',
};
const views = {}, actions = {}, forms = {}, changes = {}, TOP_ACTIONS = {};
const split = (id) => String(id).split('|');
function commit() { save(); render(); }

// ---------- Toasts ----------
let toastTimer;
function toast(msg, actionLabel, onAction, ms) {
  const el = $('#toast');
  el.innerHTML = `<span>${esc(msg)}</span>` + (actionLabel ? `<button class="btn sm">${esc(actionLabel)}</button>` : '');
  if (actionLabel) $('button', el).onclick = () => { onAction(); el.classList.remove('show'); };
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), ms || (actionLabel ? 5000 : 2600));
}
const toastUndo = (msg, undo) => toast(msg, 'Undo', () => { undo(); commit(); });

// ---------- Generic modal form ----------
function fieldHtml(f, v) {
  v = v ?? f.default ?? '';
  const id = 'f_' + f.name;
  const cls = `field${f.half ? ' half' : ''}${f.third ? ' third' : ''}`;
  const hint = f.hint ? `<small class="muted">${esc(f.hint)}</small>` : '';
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
      input = `<input id="${id}" name="${f.name}" type="${f.type || 'text'}" value="${esc(v)}" ${f.list ? `list="${f.list}"` : ''}
        ${f.step ? `step="${f.step}"` : ''} ${f.min != null ? `min="${f.min}"` : ''} ${f.max != null ? `max="${f.max}"` : ''}
        placeholder="${esc(f.placeholder || '')}" ${f.type === 'number' ? 'inputmode="decimal"' : ''}>`;
  }
  return `<label class="${cls}" for="${id}"><span>${esc(f.label)}</span>${input}${hint}</label>`;
}
function openForm({ title, fields, values = {}, onSave, onDelete, extra = [], intro = '' }) {
  const dlg = $('#modal');
  dlg.innerHTML = `<form class="form" novalidate>
    <h2>${esc(title)}</h2>${intro}
    ${fields.map((f) => fieldHtml(f, values[f.name])).join('')}
    <div class="row end form-actions">
      ${onDelete ? '<button type="button" class="btn danger" data-del>Delete</button>' : ''}
      ${extra.map((x, i) => `<button type="button" class="btn" data-extra="${i}">${esc(x.label)}</button>`).join('')}
      <span class="grow"></span>
      <button type="button" class="btn ghost" data-cancel>Cancel</button>
      <button type="submit" class="btn primary">Save</button>
    </div></form>`;
  const form = $('form', dlg);
  const collect = (validate) => {
    const out = {};
    for (const f of fields) {
      const el = form.elements[f.name];
      if (f.type === 'checkbox') out[f.name] = el.checked;
      else if (f.type === 'number') out[f.name] = el.value === '' ? null : Number(el.value);
      else out[f.name] = el.value.trim();
      if (validate && f.required && (out[f.name] === '' || out[f.name] == null)) { el.focus(); toast(`${f.label} is required`); return null; }
    }
    return out;
  };
  form.onsubmit = (e) => {
    e.preventDefault();
    const out = collect(true);
    if (!out || onSave(out) === false) return;
    dlg.close(); commit();
  };
  $('[data-cancel]', dlg).onclick = () => dlg.close();
  extra.forEach((x, i) => { $(`[data-extra="${i}"]`, dlg).onclick = () => x.onClick(collect(false)); });
  if (onDelete) $('[data-del]', dlg).onclick = () => { if (confirm('Delete this permanently?')) { onDelete(); dlg.close(); commit(); toast('Deleted'); } };
  dlg.showModal();
  if (!matchMedia('(pointer: coarse)').matches) form.querySelector('input:not([type=checkbox]), textarea, select')?.focus();
}

// ---------- Shared renderers ----------
const empty = (icon, text) => `<div class="empty"><span class="big">${icon}</span>${text}</div>`;
const areaChip = (a) => (a ? `<span class="chip area" style="background:${AREA_COLORS[a] || '#64748b'}">${esc(a)}</span>` : '');
const tabs = (action, current, list) => `<div class="seg tabs">${list.map(([k, l]) => `<button class="${current === k ? 'on' : ''}" data-action="${action}" data-id="${k}">${l}</button>`).join('')}</div>`;
const bar = (pct, cls = '') => `<div class="bar ${cls}"><span style="width:${Math.max(0, Math.min(100, pct))}%"></span></div>`;

/** Sunday-first month calendar. cell(dateStr) -> {cls, html, title}. */
function monthGrid(ym, cell, opts = {}) {
  const [y, m] = ym.split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const start = new Date(first); start.setDate(1 - first.getDay());
  const weeks = Math.ceil((first.getDay() + daysInMonth(ym)) / 7);
  const t = today();
  const out = [];
  for (let i = 0; i < weeks * 7; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i);
    const s = ymd(d);
    const c = cell(s) || {};
    out.push(`<div class="day ${d.getMonth() !== m - 1 ? 'other' : ''} ${s === t ? 'today' : ''} ${s === opts.selected ? 'sel' : ''} ${c.cls || ''}"
      data-action="${opts.action || 'pickDay'}" data-id="${s}" ${c.title ? `title="${esc(c.title)}"` : ''}><span class="num">${d.getDate()}</span>${c.html || ''}</div>`);
  }
  return `<div class="cal ${opts.cls || ''}">${DOW_SHORT.map((d) => `<div class="dow">${d}</div>`).join('')}${out.join('')}</div>`;
}
const monthNav = (key) => `<div class="navgroup"><button class="btn" data-action="monthNav" data-id="${key}|-1" aria-label="Previous month">‹</button>
  <b class="nav-label">${esc(fmtMonth(state[key]))}</b><button class="btn" data-action="monthNav" data-id="${key}|1" aria-label="Next month">›</button></div>
  ${state[key] !== today().slice(0, 7) ? `<button class="btn ghost" data-action="monthNav" data-id="${key}|0">This month</button>` : ''}`;
const weekNav = (key) => `<div class="navgroup"><button class="btn" data-action="weekNav" data-id="${key}|-1" aria-label="Previous week">‹</button>
  <b class="nav-label">${esc(fmtWeek(state[key]))}</b><button class="btn" data-action="weekNav" data-id="${key}|1" aria-label="Next week">›</button></div>
  ${state[key] !== weekStart() ? `<button class="btn ghost" data-action="weekNav" data-id="${key}|0">This week</button>` : ''}`;
actions.monthNav = (id) => {
  const [k, n] = split(id);
  state[k] = n === '0' ? today().slice(0, 7) : addMonths(state[k], Number(n));
  if (k === 'calMonth') state.calDay = n === '0' ? today() : state[k] + '-01';
  render();
};
actions.weekNav = (id) => { const [k, n] = split(id); state[k] = n === '0' ? weekStart() : addDays(state[k], 7 * Number(n)); render(); };

/** Simple SVG line chart. pts: [{date, v}] sorted by date. */
function lineChart(pts, color, unit) {
  if (pts.length < 2) return `<div class="empty small">${pts.length ? 'Add another entry to see the trend.' : 'No data yet.'}</div>`;
  const W = 340, H = 150, L = 34, R = 10, T = 12, B = 22;
  const xs = pts.map((p) => parseYmd(p.date).getTime()), ys = pts.map((p) => p.v);
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  let y0 = Math.min(...ys), y1 = Math.max(...ys);
  if (y0 === y1) { y0 -= 1; y1 += 1; }
  const py = (y1 - y0) * 0.15; const lo = y0 - py, hi = y1 + py;
  const X = (x) => L + (x1 === x0 ? 0.5 : (x - x0) / (x1 - x0)) * (W - L - R);
  const Y = (y) => T + (1 - (y - lo) / (hi - lo)) * (H - T - B);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${X(xs[i]).toFixed(1)},${Y(p.v).toFixed(1)}`).join(' ');
  const fmt = (n) => round1(n).toString();
  return `<svg viewBox="0 0 ${W} ${H}" class="line-chart" role="img" aria-label="Trend chart">
    <line x1="${L}" x2="${W - R}" y1="${Y(y1)}" y2="${Y(y1)}" class="grid-line"/><line x1="${L}" x2="${W - R}" y1="${Y(y0)}" y2="${Y(y0)}" class="grid-line"/>
    <text x="${L - 4}" y="${Y(y1) + 3}" text-anchor="end">${fmt(y1)}</text><text x="${L - 4}" y="${Y(y0) + 3}" text-anchor="end">${fmt(y0)}</text>
    <path d="${d}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
    ${pts.map((p, i) => `<circle cx="${X(xs[i]).toFixed(1)}" cy="${Y(p.v).toFixed(1)}" r="3.5" fill="${color}"><title>${esc(fmtDate(p.date))}: ${p.v} ${unit}</title></circle>`).join('')}
    <text x="${L}" y="${H - 5}">${esc(fmtDate(pts[0].date, { month: 'short', day: 'numeric' }))}</text>
    <text x="${W - R}" y="${H - 5}" text-anchor="end">${esc(fmtDate(pts.at(-1).date, { month: 'short', day: 'numeric' }))}</text></svg>`;
}

// ---------- Tasks & events (shared by Today, Weekly, Monthly) ----------
const taskWeek = (t) => (t.due ? weekStart(t.due) : t.week);
const sortTasks = (a, b) => (a.done - b.done) || (!!b.important - !!a.important) || (a.due || '9999').localeCompare(b.due || '9999')
  || (a.time || '99').localeCompare(b.time || '99') || ((a.created || 0) - (b.created || 0));
const tasksDueOn = (d) => db.tasks.filter((t) => t.due === d);
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
const eventsOn = (d) => db.events.filter((e) => occursOn(e, d)).sort((a, b) => (!!b.important - !!a.important) || (a.time || '99').localeCompare(b.time || '99'));
const hasReminder = (x) => x.remind !== '' && x.remind != null;

function taskItem(t, o = {}) {
  const over = !t.done && t.due && t.due < today();
  const meta = [
    o.showDate && t.due ? `<span class="${over ? 'overdue' : ''}">📅 ${esc(relDay(t.due))}</span>` : over ? `<span class="overdue">${esc(relDay(t.due))}</span>` : '',
    t.time ? `<span>🕑 ${esc(fmtTime(t.time))}</span>` : '',
    hasReminder(t) ? '<span title="Reminder set">🔔</span>' : '',
    t.repeat && t.repeat !== 'none' ? `<span>🔁 ${esc(t.repeat)}</span>` : '',
    t.notes ? '<span title="Has notes">📝</span>' : '',
  ].join('');
  return `<li class="item ${t.done ? 'done' : ''} ${t.important ? 'important' : ''}">
    <input type="checkbox" ${t.done ? 'checked' : ''} data-action="toggleTask" data-id="${t.id}" aria-label="Mark done">
    <div class="body clickable" data-action="editTask" data-id="${t.id}">
      <div class="title">${esc(t.title)}</div>${meta ? `<div class="meta">${meta}</div>` : ''}
    </div>
    <div class="acts">
      <button class="icon-btn star ${t.important ? 'on' : ''}" data-action="toggleStar" data-id="${t.id}" title="Priority" aria-label="Toggle priority">${t.important ? '★' : '☆'}</button>
      <button class="icon-btn" data-action="delTask" data-id="${t.id}" aria-label="Delete">✕</button>
    </div></li>`;
}
function eventItem(e, date) {
  return `<li class="item event ${e.important ? 'important' : ''} clickable" data-action="editEvent" data-id="${e.id}">
    <div class="ev-time small"><b>${e.time ? esc(fmtTime(e.time)) : 'All day'}</b>${e.end ? `<div class="muted">${esc(fmtTime(e.end))}</div>` : ''}</div>
    <div class="body"><div class="title">${e.important ? '★ ' : ''}${esc(e.title)}</div>
      <div class="meta"><span class="chip ev-chip">Event</span>${e.location ? `<span>📍 ${esc(e.location)}</span>` : ''}${hasReminder(e) ? '<span>🔔</span>' : ''}
      ${e.repeat && e.repeat !== 'none' ? `<span>🔁 ${esc(e.repeat)}</span>` : ''}${date && date !== today() ? `<span>${esc(relDay(date))}</span>` : ''}</div>
    </div></li>`;
}

function taskForm(task, preset = {}) {
  openForm({
    title: task ? 'Edit task' : 'New task',
    values: { remind: '', repeat: 'none', ...preset, ...task },
    fields: [
      { name: 'title', label: 'Task', required: true, placeholder: 'What needs doing?' },
      { name: 'due', label: 'Day', type: 'date', half: true, hint: 'Leave empty = anytime this week' },
      { name: 'time', label: 'Time', type: 'time', half: true },
      { name: 'remind', label: 'Reminder', type: 'select', options: REMINDS, half: true },
      { name: 'repeat', label: 'Repeat', type: 'select', options: REPEATS, half: true },
      { name: 'important', label: '⭐ Priority — highlight this task', type: 'checkbox' },
      { name: 'notes', label: 'Notes', type: 'textarea', rows: 3 },
    ],
    onSave: (v) => {
      if (hasReminder(v)) askNotify();
      const week = v.due ? weekStart(v.due) : task ? taskWeek(task) : preset.week || state.week;
      if (task) Object.assign(task, v, { week });
      else db.tasks.push({ id: uid(), done: false, created: Date.now(), ...v, week });
    },
    onDelete: task ? () => remove('tasks', task.id) : null,
    extra: [{ label: '📲 Add to phone calendar', onClick: (v) => (v.due ? downloadIcs([{ item: { ...task, ...v, id: task?.id || uid() }, date: v.due }]) : toast('Pick a day first')) }],
  });
}
function eventForm(ev, preset = {}) {
  openForm({
    title: ev ? 'Edit event' : 'New event',
    values: { date: state.calDay, repeat: 'none', remind: '', ...preset, ...ev },
    fields: [
      { name: 'title', label: 'Event', required: true, placeholder: 'Appointment, birthday, meeting…' },
      { name: 'date', label: 'Date', type: 'date', half: true },
      { name: 'repeat', label: 'Repeat', type: 'select', options: REPEATS, half: true },
      { name: 'time', label: 'Start time', type: 'time', half: true },
      { name: 'end', label: 'End time', type: 'time', half: true },
      { name: 'remind', label: 'Reminder', type: 'select', options: REMINDS, half: true },
      { name: 'location', label: 'Location', half: true },
      { name: 'important', label: '⭐ Priority — highlight this event', type: 'checkbox' },
      { name: 'notes', label: 'Notes', type: 'textarea', rows: 3 },
    ],
    onSave: (v) => {
      if (!v.date) { toast('Date is required'); return false; }
      if (hasReminder(v)) askNotify();
      if (ev) Object.assign(ev, v); else db.events.push({ id: uid(), ...v });
    },
    onDelete: ev ? () => remove('events', ev.id) : null,
    extra: [{ label: '📲 Add to phone calendar', onClick: (v) => (v.date ? downloadIcs([{ item: { ...ev, ...v, id: ev?.id || uid() }, date: v.date }]) : toast('Pick a date first')) }],
  });
}

Object.assign(actions, {
  newTask: (id) => {
    if (id && /^\d{4}-\d\d-\d\d$/.test(id)) return taskForm(null, { due: id });
    if (id && id.startsWith('any|')) return taskForm(null, { week: split(id)[1] });
    taskForm(null);
  },
  editTask: (id) => taskForm(find('tasks', id)),
  delTask: (id) => { const t = find('tasks', id); remove('tasks', id); commit(); toastUndo('Task deleted', () => db.tasks.push(t)); },
  toggleStar: (id) => { const t = find('tasks', id); t.important = !t.important; commit(); },
  toggleTask: (id) => {
    const t = find('tasks', id);
    if (!t) return;
    t.done = !t.done;
    t.completed = t.done ? Date.now() : null;
    if (t.done && t.repeat && t.repeat !== 'none' && !t.spawned) {
      t.spawned = true;
      const n = { ...t, id: uid(), done: false, completed: null, spawned: false, created: Date.now() };
      if (t.due) { n.due = nextDate(t.due, t.repeat); n.week = weekStart(n.due); } else n.week = addDays(taskWeek(t), 7);
      db.tasks.push(n);
      toast(`🔁 Next one added for ${n.due ? relDay(n.due) : 'next week'}`);
    }
    commit();
  },
  newEvent: (d) => eventForm(null, d && /^\d{4}-/.test(d) ? { date: d } : {}),
  editEvent: (id) => eventForm(find('events', id)),
});
/** Quick-add: data-id is a date, "any|<weekStart>", or empty (= today). Prefix with "!" to mark priority. */
forms.quickTask = (f) => {
  let title = f.elements.title.value.trim();
  if (!title) return;
  const important = title.startsWith('!');
  if (important) title = title.slice(1).trim();
  const id = f.dataset.id || today();
  const t = { id: uid(), title, important, repeat: 'none', remind: '', done: false, created: Date.now() };
  if (id.startsWith('any|')) { t.due = ''; t.week = split(id)[1]; } else { t.due = id; t.week = weekStart(id); }
  db.tasks.push(t);
  commit();
  $(`form[data-form=quickTask][data-id="${f.dataset.id || ''}"] input`)?.focus();
};

// ---------- Reminders ----------
function reminderAt(item, date) {
  if (!hasReminder(item) || !date) return null;
  const [h, m] = (item.time || '09:00').split(':').map(Number);
  const d = parseYmd(date); d.setHours(h, m, 0, 0);
  return d.getTime() - Number(item.remind) * 60000;
}
function upcomingReminderItems() {
  const out = [];
  db.tasks.forEach((t) => { if (!t.done && t.due) out.push({ item: t, date: t.due, kind: 'Task' }); });
  db.events.forEach((e) => { if (hasReminder(e)) for (let i = -1; i <= 8; i++) { const d = addDays(today(), i); if (occursOn(e, d)) out.push({ item: e, date: d, kind: 'Event' }); } });
  db.trips.forEach((tr) => (tr.items || []).forEach((it) => it.date && out.push({ item: it, date: it.date, kind: tr.name })));
  return out;
}
function checkReminders() {
  const now = Date.now();
  let fired = false;
  for (const { item, date, kind } of upcomingReminderItems()) {
    const at = reminderAt(item, date);
    const key = `${item.id}|${date}`;
    if (at == null || at > now || now - at > 12 * 3600e3 || db.fired[key]) continue;
    db.fired[key] = now; fired = true;
    const when = `${relDay(date)}${item.time ? ' at ' + fmtTime(item.time) : ''}`;
    notify(`${item.important ? '⭐ ' : ''}${item.title}`, `${kind} · ${when}${item.location ? ' · ' + item.location : ''}`);
  }
  if (fired) {
    for (const [k, v] of Object.entries(db.fired)) if (now - v > 40 * 86400e3) delete db.fired[k];
    save();
  }
}
function notify(title, body) {
  toast(`🔔 ${title} — ${body}`, null, null, 10000);
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const opts = { body, icon: 'icon.svg', badge: 'icon.svg', tag: title };
  const fallback = () => { try { new Notification(title, opts); } catch { /* unsupported */ } };
  if (navigator.serviceWorker?.getRegistration) navigator.serviceWorker.getRegistration().then((r) => (r ? r.showNotification(title, opts) : fallback())).catch(fallback);
  else fallback();
}
function askNotify() {
  if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission().then(() => render());
}

// ---------- Calendar export (.ics) so your phone can remind you even when LifeOS is closed ----------
const icsEsc = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/[,;]/g, (m) => '\\' + m);
function vevent(item, date) {
  const d = date.replace(/-/g, '');
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const timed = item.time || hasReminder(item);
  const L = ['BEGIN:VEVENT', `UID:${item.id || uid()}-${d}@lifeos`, `DTSTAMP:${stamp}`];
  if (timed) {
    const st = (item.time || '09:00').replace(':', '');
    L.push(`DTSTART:${d}T${st}00`);
    L.push(item.end && item.end > (item.time || '') ? `DTEND:${d}T${item.end.replace(':', '')}00` : 'DURATION:PT30M');
  } else L.push(`DTSTART;VALUE=DATE:${d}`, `DTEND;VALUE=DATE:${addDays(date, 1).replace(/-/g, '')}`);
  L.push(`SUMMARY:${icsEsc((item.important ? '⭐ ' : '') + (item.title || 'Event'))}`);
  if (item.location) L.push(`LOCATION:${icsEsc(item.location)}`);
  const desc = [item.ref && `Ref: ${item.ref}`, item.notes].filter(Boolean).join('\n');
  if (desc) L.push(`DESCRIPTION:${icsEsc(desc)}`);
  const rr = { daily: 'DAILY', weekly: 'WEEKLY', monthly: 'MONTHLY', yearly: 'YEARLY' }[item.repeat];
  if (rr) L.push(`RRULE:FREQ=${rr}`);
  if (hasReminder(item)) L.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsEsc(item.title)}`, `TRIGGER:-PT${Number(item.remind)}M`, 'END:VALARM');
  L.push('END:VEVENT');
  return L;
}
function downloadIcs(list, name) {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//LifeOS//EN', 'CALSCALE:GREGORIAN', ...list.flatMap(({ item, date }) => vevent(item, date)), 'END:VCALENDAR'];
  const fname = (name || list[0]?.item.title || 'lifeos').replace(/[^\w-]+/g, '_').slice(0, 40) + '.ics';
  download(lines.join('\r\n'), fname, 'text/calendar');
  toast('Calendar file downloaded — open it to add to your phone calendar');
}
function download(text, name, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
