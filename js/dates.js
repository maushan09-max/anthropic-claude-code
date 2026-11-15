'use strict';
/* Special dates (birthdays, anniversaries), countdowns (exams, events, trips) and the leave planner. */

// ================= SPECIAL DATES =================
const DATE_TYPES = [['birthday', 'Birthday'], ['anniversary', 'Anniversary'], ['other', 'Other']];
const DATE_ICONS = { birthday: 'gift', anniversary: 'heart', other: 'sparkle' };
const DATE_REMINDS = [['', 'No reminder'], ['0', 'On the day'], ['1', '1 day before'], ['3', '3 days before'], ['7', '1 week before'], ['14', '2 weeks before']];
/** Next date (today or later) a yearly date falls on. Feb 29 falls on Feb 28 in other years. */
function nextOccurrence(md, from = today()) {
  const y = Number(from.slice(0, 4));
  const fit = (yr) => { const [m, d] = md.split('-').map(Number); const last = new Date(yr, m, 0).getDate(); return `${yr}-${pad(m)}-${pad(Math.min(d, last))}`; };
  const t = fit(y);
  return t >= from ? t : fit(y + 1);
}
const specialMd = (x) => x.date.slice(5);
const specialNext = (x) => nextOccurrence(specialMd(x));
const specialTurning = (x) => (x.knowYear && x.type !== 'other' ? Number(specialNext(x).slice(0, 4)) - Number(x.date.slice(0, 4)) : null);
const specialLabel = (x) => {
  const n = specialTurning(x);
  if (x.type === 'birthday') return n ? `${x.name} turns ${n}` : `${x.name}’s birthday`;
  if (x.type === 'anniversary') return n ? `${x.name} · ${n} years` : `${x.name} anniversary`;
  return x.name;
};
const specialsOn = (d) => db.dates.filter((x) => specialMd(x) === d.slice(5) || (specialMd(x) === '02-29' && d.slice(5) === '02-28' && !isLeap(d)));
const isLeap = (d) => { const y = Number(d.slice(0, 4)); return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0; };
const upcomingSpecials = (days) => db.dates.map((x) => ({ x, d: specialNext(x) })).filter((o) => daysBetween(today(), o.d) <= days).sort((a, b) => a.d.localeCompare(b.d));

views.dates = () => {
  if (!db.dates.length) return `<div class="card">${empty('gift', 'Add birthdays, anniversaries and other dates you don’t want to forget — with gift ideas and reminders.<br><br><button class="btn primary" data-action="newSpecial">+ Add a date</button>')}</div>`;
  const items = db.dates.map((x) => ({ x, d: specialNext(x) })).sort((a, b) => a.d.localeCompare(b.d));
  const soon = items.filter((o) => daysBetween(today(), o.d) <= 30), later = items.filter((o) => daysBetween(today(), o.d) > 30);
  const card = ({ x, d }) => { const n = daysBetween(today(), d); return `<li class="item clickable" data-action="editSpecial" data-id="${x.id}" style="align-items:center">
    <span class="hicon">${icon(DATE_ICONS[x.type] || 'sparkle')}</span>
    <div class="body"><div class="title">${esc(specialLabel(x))}</div>
      <div class="meta"><span>${esc(fmtDate(d, { weekday: 'short', day: 'numeric', month: 'short' }))}</span>${x.remind !== '' && x.remind != null ? `<span>${icon('bell')}</span>` : ''}${x.gifts ? `<span>${icon('gift')} ${esc(x.gifts)}</span>` : ''}</div></div>
    <span class="chip ${n <= 7 ? 'trip-chip' : ''}">${n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : `in ${n} days`}</span></li>`; };
  return `${soon.length ? `<div class="card"><h2>${hi('gift')} Next 30 days</h2><ul class="items">${soon.map(card).join('')}</ul></div>` : ''}
    ${later.length ? `<div class="card" style="margin-top:14px"><h2>${hi('calendar')} Later</h2><ul class="items">${later.map(card).join('')}</ul></div>` : ''}`;
};
TOP_ACTIONS.dates = ['newSpecial', '+ Date'];
function specialForm(x) {
  openForm({
    title: x ? 'Edit date' : 'New special date', values: x || { type: 'birthday', knowYear: true, remind: '1' },
    fields: [
      { name: 'name', label: 'Name', required: true, placeholder: 'Mum, Aisha & Ali…' },
      { name: 'type', label: 'Type', type: 'select', options: DATE_TYPES, half: true },
      { name: 'date', label: 'Date', type: 'date', half: true },
      { name: 'knowYear', label: 'I know the year (shows age / years)', type: 'checkbox' },
      { name: 'remind', label: 'Remind me', type: 'select', options: DATE_REMINDS, half: true },
      { name: 'gifts', label: 'Gift ideas', half: true, placeholder: 'Perfume, book…' },
      { name: 'notes', label: 'Notes', type: 'textarea', rows: 2 },
    ],
    onSave: (v) => { if (!v.date) { toast('Pick the date'); return false; } if (v.remind !== '') askNotify(); if (x) Object.assign(x, v); else db.dates.push({ id: uid(), ...v }); },
    onDelete: x ? () => remove('dates', x.id) : null,
  });
}
actions.newSpecial = () => specialForm(null);
actions.editSpecial = (id) => specialForm(find('dates', id));

// ================= COUNTDOWNS =================
const CD_KINDS = [['exam', 'Exam'], ['event', 'Event'], ['travel', 'Travel'], ['other', 'Other']];
const CD_ICONS = { exam: 'grad', event: 'calendar', travel: 'plane', other: 'sparkle' };
/** Your countdowns plus upcoming trips (from Travel plans). */
function allCountdowns() {
  const t = today();
  const own = db.countdowns.filter((c) => c.date >= t).map((c) => ({ id: c.id, title: c.title, date: c.date, kind: c.kind, action: 'editCountdown' }));
  const trips = db.trips.filter((tr) => tripStartKey(tr) >= t).map((tr) => ({ id: tr.id, title: tr.name, date: tripStartKey(tr), kind: 'travel', approx: !tr.start, action: 'openTrip' }));
  return [...own, ...trips].sort((a, b) => a.date.localeCompare(b.date));
}
const countdownText = (c) => { const n = daysBetween(today(), c.date); return c.approx ? (n > 45 ? `~${Math.round(n / 30)} months` : `~${Math.max(1, Math.round(n / 7))} weeks`) : n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : `${n} days`; };
const countdownList = (list) => `<ul class="items">${list.map((c) => `<li class="item clickable" data-action="${c.action}" data-id="${c.id}" style="align-items:center">
  <span class="hicon">${icon(CD_ICONS[c.kind] || 'sparkle')}</span><div class="body"><div class="title">${esc(c.title)}</div>
  <div class="meta"><span>${esc(c.approx ? fmtMonth(c.date.slice(0, 7)) : fmtDate(c.date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }))}</span></div></div>
  <b class="cd-days">${esc(countdownText(c))}</b></li>`).join('')}</ul>`;
function countdownForm(c, preset = {}) {
  openForm({
    title: c ? 'Edit countdown' : 'New countdown', values: { kind: 'exam', ...preset, ...c },
    fields: [
      { name: 'title', label: 'What', required: true, placeholder: 'Part 1 exam, wedding…' },
      { name: 'kind', label: 'Type', type: 'select', options: CD_KINDS, half: true },
      { name: 'date', label: 'Date', type: 'date', half: true },
    ],
    onSave: (v) => { if (!v.date) { toast('Pick the date'); return false; } if (c) Object.assign(c, v); else db.countdowns.push({ id: uid(), ...v }); },
    onDelete: c ? () => remove('countdowns', c.id) : null,
  });
}
actions.newCountdown = (kind) => countdownForm(null, kind ? { kind } : {});
actions.editCountdown = (id) => countdownForm(find('countdowns', id));

// ================= LEAVE PLANNER =================
const LEAVE_TYPES = ['Annual', 'Sick', 'Emergency', 'Study', 'Other'];
const LEAVE_STATUS = [['planned', 'Planned'], ['approved', 'Approved'], ['taken', 'Taken']];
state.leaveYear = Number(today().slice(0, 4));
const leaveDays = (e) => (e.days != null && e.days !== '' ? Number(e.days) : e.start && e.end && e.end >= e.start ? daysBetween(e.start, e.end) + 1 : 1);
const leaveOn = (d) => db.leave.entries.find((e) => e.start && d >= e.start && d <= (e.end || e.start));
function leaveSummary(year) {
  const al = db.leave.allowances[year] || {};
  return LEAVE_TYPES.map((type) => {
    const es = db.leave.entries.filter((e) => e.type === type && (e.start || '').startsWith(String(year)));
    const used = es.filter((e) => e.status !== 'planned').reduce((s, e) => s + leaveDays(e), 0);
    const planned = es.filter((e) => e.status === 'planned').reduce((s, e) => s + leaveDays(e), 0);
    const allowance = Number(al[type] || 0) + (type === 'Annual' ? Number(al.carried || 0) : 0);
    return { type, allowance, used, planned, left: allowance - used - planned };
  });
}
views.leave = () => {
  const y = state.leaveYear, sum = leaveSummary(y), t = today();
  const entries = db.leave.entries.filter((e) => (e.start || '').startsWith(String(y))).sort((a, b) => (a.start || '').localeCompare(b.start || ''));
  const shown = sum.filter((s) => s.allowance || s.used || s.planned);
  return `
  <div class="toolbar"><div class="navgroup"><button class="btn" data-action="leaveYear" data-id="-1" aria-label="Previous year">${icon('chevL')}</button><b class="nav-label">${y}</b>
    <button class="btn" data-action="leaveYear" data-id="1" aria-label="Next year">${icon('chevR')}</button></div><span class="grow"></span>
    <button class="btn sm" data-action="editAllowances">Set ${y} allowances</button></div>
  ${shown.length ? `<div class="stats">${shown.map((s) => `<div class="stat"><div class="label">${s.type} leave</div>
    <div class="value ${s.left < 0 ? 'bad' : ''}">${s.left}<small> ${s.allowance ? `of ${s.allowance} left` : 'days'}</small></div>
    <div class="small muted">${s.used} used${s.planned ? ` · ${s.planned} planned` : ''}</div>${s.allowance ? bar(((s.used + s.planned) / s.allowance) * 100, s.left < 0 ? 'over' : '') : ''}</div>`).join('')}</div>`
    : `<div class="banner">${icon('palm')} Set your leave allowances for ${y} to see how many days you have left.</div>`}
  <div class="card"><h2>${hi('palm')} Leave in ${y}<span class="spacer"></span><button class="btn sm" data-action="newLeave">+ Leave</button></h2>
    ${entries.length ? `<ul class="items">${entries.map((e) => `<li class="item clickable" data-action="editLeave" data-id="${e.id}" style="align-items:center">
      <div class="body"><div class="title">${esc(e.type)} leave · ${plural(leaveDays(e), 'day')}</div>
      <div class="meta"><span>${esc(fmtDate(e.start, { day: 'numeric', month: 'short' }))}${e.end && e.end !== e.start ? ' – ' + esc(fmtDate(e.end, { day: 'numeric', month: 'short' })) : ''}</span>${e.notes ? `<span>${esc(e.notes)}</span>` : ''}</div></div>
      <span class="chip ${e.status === 'planned' ? '' : e.status === 'approved' ? 'trip-chip' : 'status-done'}">${(LEAVE_STATUS.find((s) => s[0] === e.status) || LEAVE_STATUS[0])[1]}${e.start <= t && (e.end || e.start) >= t ? ' · now' : ''}</span></li>`).join('')}</ul>`
      : empty('palm', 'No leave planned yet.')}
  </div>
  <p class="hint">Leave also shows on your duty roster. Days are counted from start to end date — edit the number if weekends or holidays don’t count.</p>`;
};
TOP_ACTIONS.leave = ['newLeave', '+ Leave'];
function leaveForm(e) {
  openForm({
    title: e ? 'Edit leave' : 'New leave', values: e || { type: 'Annual', status: 'planned', start: today() },
    fields: [
      { name: 'type', label: 'Type', type: 'select', options: LEAVE_TYPES, half: true },
      { name: 'status', label: 'Status', type: 'select', options: LEAVE_STATUS, half: true },
      { name: 'start', label: 'First day', type: 'date', half: true },
      { name: 'end', label: 'Last day', type: 'date', half: true },
      { name: 'days', label: 'Days counted (optional)', type: 'number', min: 0, step: '0.5', half: true, hint: 'Leave empty to count every day' },
      { name: 'notes', label: 'Notes', half: true, placeholder: 'Umrah, family visit…' },
    ],
    onSave: (v) => { if (!v.start) { toast('Pick the first day'); return false; } if (!v.end || v.end < v.start) v.end = v.start; if (e) Object.assign(e, v); else db.leave.entries.push({ id: uid(), ...v }); },
    onDelete: e ? () => { db.leave.entries = db.leave.entries.filter((x) => x !== e); } : null,
  });
}
Object.assign(actions, {
  newLeave: () => leaveForm(null),
  editLeave: (id) => leaveForm(db.leave.entries.find((x) => x.id === id)),
  leaveYear: (n) => { state.leaveYear += Number(n); render(); },
  editAllowances: () => {
    const y = state.leaveYear;
    openForm({
      title: `Leave allowances for ${y}`, values: db.leave.allowances[y] || {},
      fields: [...LEAVE_TYPES.map((t) => ({ name: t, label: `${t} (days)`, type: 'number', min: 0, step: '0.5', half: true })),
        { name: 'carried', label: 'Annual leave carried over', type: 'number', min: 0, step: '0.5', half: true }],
      onSave: (v) => { db.leave.allowances[y] = v; },
    });
  },
});
