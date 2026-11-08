'use strict';
/* Planner: Today dashboard, Weekly to-do (Sun–Sat + Anytime), Monthly to-do (separate list + calendar), Duty roster. */

// ---------- Duty roster helpers ----------
const rosterGet = (ws) => db.roster[ws] || { days: {}, oncall: {}, notes: '' };
const rosterEnsure = (ws) => { const r = (db.roster[ws] ||= { days: {}, oncall: {}, notes: '' }); r.oncall ||= {}; return r; };
const rosterDay = (d) => rosterGet(weekStart(d)).days[parseYmd(d).getDay()] || [];
const rosterOncall = (d) => rosterGet(weekStart(d)).oncall?.[parseYmd(d).getDay()] || '';
const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const dutyHours = (x) => { if (!x.start || !x.end) return 0; let d = toMin(x.end) - toMin(x.start); if (d <= 0) d += 1440; return d / 60; };
const dutyWith = (x) => x.with || x.person || '';
const dutyChip = (x, ref) => `<span class="duty ${ref ? 'clickable' : ''}" style="--c:${esc(x.color || '#a43fc2')}" ${ref ? `data-action="editDuty" data-id="${ref}|${x.id}"` : ''}>
  <b>${esc(x.title)}</b>${x.start ? ` ${esc(x.start)}–${esc(x.end)}` : ''}${dutyWith(x) ? `<span class="duty-with">with ${esc(dutyWith(x))}</span>` : ''}${x.location ? ` · ${esc(x.location)}` : ''}</span>`;
const oncallLine = (d) => (rosterOncall(d) ? `<div class="oncall-line">${icon('badge')} On-call: <b>${esc(rosterOncall(d))}</b></div>` : '');
const dutyBlock = (d) => (rosterDay(d).length || rosterOncall(d) ? `<div class="duty-line">${rosterDay(d).map((x) => dutyChip(x)).join('')}</div>${oncallLine(d)}` : '');

// ---------- Today ----------
views.today = () => {
  const t = today(), ws = weekStart(), di = parseYmd(t).getDay();
  const hr = new Date().getHours();
  const greet = hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';
  const todays = db.tasks.filter((x) => x.due === t || (!x.done && x.due && x.due < t)).sort(sortTasks);
  const anytime = db.tasks.filter((x) => isWeekly(x) && !x.due && x.week === ws).sort(sortTasks);
  const weekAll = db.tasks.filter((x) => isWeekly(x) && taskWeek(x) === ws);
  const weekDone = weekAll.filter((x) => x.done).length;
  const evs = eventsOn(t), tomorrow = eventsOn(addDays(t, 1));
  const duties = rosterDay(t);
  const dm = dayMacros(ws, di);
  const T = db.settings.targets;
  const meds = db.meds.filter((m) => m.active !== false);
  const h = healthOf(t);
  const shop = db.lists.flatMap((l) => l.items.filter((i) => !i.done).map((i) => ({ ...i, list: l })));
  const shopTop = shop.sort((a, b) => !!b.important - !!a.important).slice(0, 6);
  const trip = db.trips.filter((x) => (x.end || x.start || '') >= t).sort((a, b) => (a.start || '').localeCompare(b.start || ''))[0];
  const sv = savingsTotals(), lo = loanTotals();
  const jToday = db.journal.find((j) => j.date === t);
  const sg = studyGoals(ws), sgDone = sg.filter((g) => g.done).length;
  const toRevise = db.study.topics.filter((x) => x.status !== 'done').sort((a, b) => !!b.important - !!a.important).slice(0, 3);

  return `
  <div class="section hello">
    <div class="hello-title">${greet}${db.settings.name ? ', ' + esc(db.settings.name) : ''}</div>
    <div class="muted">${esc(new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }))}</div>
  </div>
  <div class="stats">
    <a class="stat" href="#/weekly"><div class="label">Today's tasks</div><div class="value">${todays.filter((x) => !x.done).length}<small> left</small></div></a>
    <a class="stat" href="#/weekly"><div class="label">This week</div><div class="value">${weekDone}/${weekAll.length}</div>${bar(weekAll.length ? (weekDone / weekAll.length) * 100 : 0, 'done')}</a>
    <a class="stat" href="#/duties"><div class="label">Duty today</div><div class="value small-val">${duties.length ? esc(duties.map((d) => d.title).join(', ')) : '—'}</div>
      ${rosterOncall(t) ? `<div class="small muted">On-call: ${esc(rosterOncall(t))}</div>` : ''}</a>
    <a class="stat" href="#/meals"><div class="label">Planned today</div><div class="value">${Math.round(dm.kcal)}<small> / ${T.kcal} kcal</small></div></a>
  </div>
  <div class="grid">
    <div class="card">
      <h2>${hi('checkCircle')} Today <span class="spacer"></span><a class="card-link" href="#/weekly">Week ${icon('chevR')}</a></h2>
      <form class="quick-add" data-form="quickTask" data-id="${t}"><input name="title" placeholder="Add a task for today… (start with ! for priority)" autocomplete="off"><button class="btn primary">Add</button></form>
      ${todays.length ? `<ul class="items">${todays.map((x) => taskItem(x)).join('')}</ul>` : empty('sparkle', 'Nothing due today.')}
      ${anytime.length ? `<div class="section-title">Anytime this week</div><ul class="items">${anytime.slice(0, 6).map((x) => taskItem(x)).join('')}</ul>` : ''}
    </div>
    <div class="card">
      <h2>${hi('calendar')} Schedule <span class="spacer"></span><button class="btn sm" data-action="newEvent" data-id="${t}">+ Event</button></h2>
      ${dutyBlock(t)}
      ${evs.length ? `<ul class="items">${evs.map((e) => eventItem(e, t)).join('')}</ul>` : empty('calendar', 'No events today.')}
      ${tomorrow.length ? `<div class="section-title">Tomorrow</div><ul class="items">${tomorrow.map((e) => eventItem(e, addDays(t, 1))).join('')}</ul>` : ''}
    </div>
    ${meds.length ? `<div class="card"><h2>${hi('pill')} Meds today <span class="spacer"></span><a class="card-link" href="#/health" data-action="goHealth" data-id="meds">All ${icon('chevR')}</a></h2>
      <ul class="items">${meds.map((m) => medRow(m, t)).join('')}</ul></div>` : ''}
    <div class="card">
      <h2>${hi('bowl')} Meals today <span class="spacer"></span><a class="card-link" href="#/meals">Meal prep ${icon('chevR')}</a></h2>
      <ul class="items">${SLOTS.map((s) => { const m = getMeal(ws, di, s); return `<li class="item clickable" data-action="editMeal" data-id="${ws}|${di}|${s}">
        <div class="body"><div class="small muted">${s}</div><div class="title">${m && (m.name || m.items?.length) ? esc(mealTitle(m)) : '<span class="muted">+ Plan</span>'}</div></div>
        ${m ? `<span class="small muted">${Math.round(mealMacros(m).kcal)} kcal</span>` : ''}</li>`; }).join('')}</ul>
      <div class="small" style="margin-top:8px">${macroLine(dm)}</div>${bar(T.kcal ? (dm.kcal / T.kcal) * 100 : 0, dm.kcal > T.kcal * 1.05 ? 'over' : '')}
    </div>
    <div class="card">
      <h2>${hi('cart')} Shopping list <span class="spacer"></span><a class="card-link" href="#/shopping">${shop.length} to buy ${icon('chevR')}</a></h2>
      ${shopTop.length ? `<ul class="items">${shopTop.map((i) => shopItem(i.list, i)).join('')}</ul>` : empty('bag', 'Shopping list is clear.')}
    </div>
    <div class="card">
      <h2>${hi('grad')} Study this week <span class="spacer"></span><a class="card-link" href="#/study">Study plan ${icon('chevR')}</a></h2>
      ${sg.length ? `<div class="kv"><span>Weekly goals</span><b>${sgDone}/${sg.length}</b></div>${bar((sgDone / sg.length) * 100, 'done')}` : '<div class="small muted">No goals set for this week yet.</div>'}
      ${toRevise.length ? `<div class="section-title">Next to revise</div><ul class="items">${toRevise.map((x) => `<li class="item ${x.important ? 'important' : ''}"><div class="body"><div class="title">${esc(x.title)}</div>${x.subject ? `<div class="meta"><span>${esc(x.subject)}</span></div>` : ''}</div></li>`).join('')}</ul>` : ''}
    </div>
    <div class="card">
      <h2>${hi('heart')} Wellbeing <span class="spacer"></span><a class="card-link" href="#/health">Health ${icon('chevR')}</a></h2>
      <div class="small muted">How are you feeling?</div>
      <div class="moods" style="margin:6px 0 12px">${MOODS.map((e, i) => `<button class="mood-btn ${h.mood == i + 1 ? 'on' : ''}" data-action="setMood" data-id="${t}|${i + 1}" aria-label="${MOOD_LABELS[i]}">${e}</button>`).join('')}</div>
      <div class="row"><span class="small muted grow">Water ${h.water || 0}/${WATER_GOAL} glasses</span>
        <button class="btn sm" data-action="water" data-id="${t}|-1">−</button><button class="btn sm" data-action="water" data-id="${t}|1">+ ${icon('drop')}</button></div>
      <div style="margin-top:6px">${bar(((h.water || 0) / WATER_GOAL) * 100, (h.water || 0) >= WATER_GOAL ? 'done' : '')}</div>
    </div>
    <div class="card">
      <h2>${hi('wallet')} Finances <span class="spacer"></span><a class="card-link" href="#/finances">Details ${icon('chevR')}</a></h2>
      <div class="kv"><span>Savings (MVR)</span><b>${fmtCur(sv.MVR, 'MVR')}</b></div>
      <div class="kv"><span>Savings (USD)</span><b>${fmtCur(sv.USD, 'USD')}</b></div>
      ${lo.activeCount ? `<div class="kv"><span>I owe</span><b class="bad">${curList(lo.owe)}</b></div><div class="kv"><span>Owed to me</span><b class="good">${curList(lo.owed)}</b></div>` : ''}
    </div>
    ${trip ? `<div class="card clickable" data-action="openTrip" data-id="${trip.id}"><h2>${hi('plane')} Next trip</h2>
      <div style="font-size:18px;font-weight:600">${esc(trip.name)}</div><div class="muted small">${esc(trip.destination || '')} · ${esc(tripDates(trip))}</div>
      <div style="margin-top:8px">${tripCountdown(trip)}</div></div>` : ''}
    <div class="card">
      <h2>${hi('book')} Journal</h2>
      <div class="prompt small">${icon('chat')} ${esc(dailyPrompt())}</div>
      ${jToday ? `<button class="btn sm" data-action="editJournal" data-id="${jToday.id}">Continue today’s entry</button>` : '<button class="btn primary sm" data-action="newJournal">Write today’s entry</button>'}
    </div>
    ${db.habits.length ? `<div class="card"><h2>${hi('repeat')} Habits <span class="spacer"></span><a class="card-link" href="#/habits">Manage ${icon('chevR')}</a></h2>
      <ul class="items">${db.habits.map((x) => habitRow(x, true)).join('')}</ul></div>` : ''}
  </div>`;
};

// ---------- Weekly to-do (weekly tasks only) ----------
views.weekly = () => {
  const ws = state.week, cur = weekStart(), t = today();
  const inWeek = db.tasks.filter((x) => isWeekly(x) && taskWeek(x) === ws);
  const done = inWeek.filter((x) => x.done).length;
  const leftovers = ws === cur ? db.tasks.filter((x) => isWeekly(x) && !x.done && taskWeek(x) < cur) : [];
  const dayCard = (i) => {
    const d = addDays(ws, i);
    const list = inWeek.filter((x) => x.due === d).sort(sortTasks);
    return `<div class="card day-card ${d === t ? 'is-today' : ''} ${d < t ? 'past' : ''}">
      <h3><span>${DOW[i]}</span><span class="muted small">${esc(fmtDate(d, { month: 'short', day: 'numeric' }))}</span>${d === t ? '<span class="chip today-chip">Today</span>' : ''}
        <span class="spacer"></span><span class="small muted">${list.length ? `${list.filter((x) => x.done).length}/${list.length}` : ''}</span></h3>
      ${dutyBlock(d)}
      <ul class="items">${list.map((x) => taskItem(x)).join('')}</ul>
      <form class="quick-add" data-form="quickTask" data-id="${d}"><input name="title" placeholder="Add task…" autocomplete="off" aria-label="Add task for ${DOW[i]}"><button class="btn sm" aria-label="Add">+</button></form>
    </div>`;
  };
  const any = inWeek.filter((x) => !x.due).sort(sortTasks);
  return `
  <div class="toolbar">${weekNav('week')}<span class="grow"></span>
    <div class="progress-pill">${done}/${inWeek.length} done ${bar(inWeek.length ? (done / inWeek.length) * 100 : 0, 'done')}</div></div>
  ${leftovers.length ? `<div class="banner">${icon('box')} ${plural(leftovers.length, 'unfinished task')} from previous weeks.
    <button class="btn sm primary" data-action="carryOver">Move to this week</button></div>` : ''}
  <p class="hint">Week runs Sunday to Saturday and starts fresh every Sunday. Tick to cross off · tap ${icon('star')} to highlight priority · start with <b>!</b> to add as priority.</p>
  <div class="week-grid">
    ${[0, 1, 2, 3, 4, 5, 6].map(dayCard).join('')}
    <div class="card day-card anytime">
      <h3>${hi('pushpin')} Anytime this week<span class="spacer"></span><span class="small muted">${any.length ? `${any.filter((x) => x.done).length}/${any.length}` : ''}</span></h3>
      <div class="small muted" style="margin-bottom:6px">Things that can be done any day.</div>
      <ul class="items">${any.map((x) => taskItem(x)).join('')}</ul>
      <form class="quick-add" data-form="quickTask" data-id="any|${ws}"><input name="title" placeholder="Add task…" autocomplete="off" aria-label="Add anytime task"><button class="btn sm" aria-label="Add">+</button></form>
    </div>
  </div>`;
};
TOP_ACTIONS.weekly = () => ['newTask', '+ Task', `any|${state.week}`];
actions.carryOver = () => {
  const cur = weekStart();
  const n = db.tasks.filter((x) => isWeekly(x) && !x.done && taskWeek(x) < cur);
  n.forEach((x) => { x.due = ''; x.week = cur; });
  commit(); toast(`Moved ${plural(n.length, 'task')} to “Anytime this week”`);
};

// ---------- Monthly to-do (its own list — not linked to the weekly to-do) ----------
const monthTasksIn = (ym) => db.tasks.filter((x) => isMonthly(x) && x.month === ym);
const monthTasksOn = (d) => db.tasks.filter((x) => isMonthly(x) && x.due === d);
views.monthly = () => {
  const ym = state.calMonth, sel = state.calDay, t = today(), curM = t.slice(0, 7);
  const all = monthTasksIn(ym);
  const general = all.filter((x) => !x.due).sort(sortTasks);
  const leftovers = ym === curM ? db.tasks.filter((x) => isMonthly(x) && !x.done && x.month < curM) : [];
  const cal = monthGrid(ym, (s) => {
    const evs = eventsOn(s), tks = monthTasksOn(s).sort(sortTasks);
    const chips = [
      ...evs.map((e) => `<span class="ev ${e.important ? 'imp' : ''}">${e.time ? esc(e.time) + ' ' : ''}${esc(e.title)}</span>`),
      ...tks.map((x) => `<span class="tk ${x.done ? 'done' : ''} ${x.important ? 'imp' : ''}">${esc(x.title)}</span>`),
    ];
    return { html: chips.slice(0, 4).join('') + (chips.length > 4 ? `<span class="more">+${chips.length - 4}</span>` : '') };
  }, { selected: sel });

  const dayEvs = eventsOn(sel), dayTasks = monthTasksOn(sel).sort(sortTasks);
  const f = state.monthFilter;
  const keep = (x) => (f === 'todo' ? !x.done : f === 'done' ? x.done : f === 'priority' ? x.important : true);
  const groups = monthDays(ym).map((d) => {
    const tks = monthTasksOn(d).filter(keep).sort(sortTasks);
    let evs = eventsOn(d);
    if (f === 'todo') evs = evs.filter(() => d >= t);
    if (f === 'done') evs = [];
    if (f === 'priority') evs = evs.filter((e) => e.important);
    if (!tks.length && !evs.length) return '';
    return `<div class="group-h clickable ${d === t ? 'is-today' : ''}" data-action="pickDay" data-id="${d}">${esc(fmtDate(d, { weekday: 'short', day: 'numeric', month: 'short' }))}${d === t ? ' · Today' : ''}</div>
      <ul class="items">${evs.map((e) => eventItem(e, d)).join('')}${tks.map((x) => taskItem(x)).join('')}</ul>`;
  }).join('');
  const gen = general.filter(keep);
  const mDone = all.filter((x) => x.done).length;
  return `
  <div class="toolbar">${monthNav('calMonth')}<span class="grow"></span>
    <div class="progress-pill">${mDone}/${all.length} done ${bar(all.length ? (mDone / all.length) * 100 : 0, 'done')}</div></div>
  ${leftovers.length ? `<div class="banner">${icon('box')} ${plural(leftovers.length, 'unfinished task')} from previous months.
    <button class="btn sm primary" data-action="carryOverMonth">Move to this month</button></div>` : ''}
  ${cal}
  <p class="hint">Your monthly list is separate from the weekly to-do. Tap a day to add a task or event to it, or add general tasks for the month below. Set a reminder ${icon('bell')} on important ones.</p>
  <div class="grid wide" style="margin-top:12px">
    <div class="card">
      <h2>${hi('calendar')} ${esc(fmtDate(sel, { weekday: 'long', month: 'long', day: 'numeric' }))}<span class="spacer"></span>
        <button class="btn sm" data-action="newEvent" data-id="${sel}">+ Event</button><button class="btn sm" data-action="newTask" data-id="m|${sel}">+ Task</button></h2>
      <form class="quick-add" data-form="quickTask" data-id="m|${sel}"><input name="title" placeholder="Quick add a task to this day…" autocomplete="off"><button class="btn primary sm">Add</button></form>
      <ul class="items">${dayEvs.map((e) => eventItem(e, sel)).join('')}${dayTasks.map((x) => taskItem(x)).join('')}</ul>
      ${!dayEvs.length && !dayTasks.length ? empty('cloud', 'Nothing planned for this day.') : ''}
    </div>
    <div class="card">
      <h2>${hi('pushpin')} General to-do for ${esc(fmtMonth(ym))}</h2>
      <div class="small muted" style="margin-bottom:6px">Things to get done sometime this month.</div>
      <form class="quick-add" data-form="quickTask" data-id="m|${ym}"><input name="title" placeholder="Add a monthly task… (start with ! for priority)" autocomplete="off"><button class="btn primary sm">Add</button></form>
      ${gen.length ? `<ul class="items">${gen.map((x) => taskItem(x)).join('')}</ul>` : empty('inbox', f === 'all' ? 'No general tasks yet.' : 'Nothing matches this filter.')}
    </div>
    <div class="card">
      <h2>${hi('calWeek')} All of ${esc(fmtMonth(ym))}</h2>
      ${tabs('monthFilter', f, [['all', 'All'], ['todo', 'To do'], ['done', 'Done'], ['priority', `${starIcon(true)} Priority`]])}
      <div style="margin-top:10px">${groups || empty('inbox', 'No dated tasks or events.')}</div>
    </div>
  </div>`;
};
TOP_ACTIONS.monthly = () => ['newTask', '+ Task', `m|${state.calMonth}`];
actions.pickDay = (d) => { state.calDay = d; if (d.slice(0, 7) !== state.calMonth) state.calMonth = d.slice(0, 7); render(); };
actions.monthFilter = (k) => { state.monthFilter = k; render(); };
actions.carryOverMonth = () => {
  const cur = today().slice(0, 7);
  const n = db.tasks.filter((x) => isMonthly(x) && !x.done && x.month < cur);
  n.forEach((x) => { x.due = ''; x.month = cur; });
  commit(); toast(`Moved ${plural(n.length, 'task')} to this month’s general to-do`);
};

// ---------- Duty roster ----------
views.duties = () => {
  const ws = state.rosterWeek, r = rosterGet(ws), t = today();
  let hrs = 0;
  const rows = [0, 1, 2, 3, 4, 5, 6].map((i) => {
    const d = addDays(ws, i), list = r.days[i] || [];
    list.forEach((x) => { hrs += dutyHours(x); });
    return `<div class="roster-row ${d === t ? 'is-today' : ''}">
      <div class="roster-day"><b>${DOW[i]}</b><span class="small muted">${esc(fmtDate(d, { month: 'short', day: 'numeric' }))}</span></div>
      <div class="roster-main">
        <div class="roster-duties">${list.map((x) => dutyChip(x, `${ws}|${i}`)).join('') || '<span class="muted small">No duty</span>'}</div>
        <label class="oncall">${icon('badge')}<span>On-call</span><input value="${esc(r.oncall?.[i] || '')}" placeholder="On-call doctor" data-change="rosterOncall" data-id="${ws}|${i}" list="oncall-names" autocomplete="off"></label>
      </div>
      <select class="add-duty" data-change="addDuty" data-id="${ws}|${i}" aria-label="Add duty for ${DOW[i]}">
        <option value="">+ Add duty</option>${db.dutyTypes.map((x) => `<option value="${x.id}">${esc(x.name)}${x.start ? ` (${x.start}–${x.end})` : ''}</option>`).join('')}
        <option value="__custom">Custom…</option></select>
    </div>`;
  }).join('');
  const names = [...new Set(Object.values(db.roster).flatMap((w) => [...Object.values(w.oncall || {}), ...Object.values(w.days || {}).flatMap((l) => l.flatMap((x) => dutyWith(x).split(',').map((s) => s.trim())))]).filter(Boolean))];
  return `
  <div class="toolbar">${weekNav('rosterWeek')}<span class="grow"></span>
    <span class="progress-pill">${icon('clock')} ${round1(hrs)} h this week</span></div>
  <div class="card roster-file">
    <h2>${hi('upload')} Full roster for this week<span class="spacer"></span>
      ${r.file ? '<button class="btn sm ghost danger" data-action="removeRosterFile">Remove</button>' : ''}
      <label class="btn sm primary">${icon('upload')} ${r.file ? 'Replace' : 'Upload'}<input type="file" accept="image/*,application/pdf" data-change="rosterUpload" data-id="${ws}" hidden></label></h2>
    ${r.file ? `<div id="roster-file-preview" class="file-preview"><div class="muted small">Loading…</div></div>`
      : '<div class="small muted">Upload a photo, screenshot or PDF of the full roster. Then fill in your duties, who you are working with and the on-call doctor for each day below.</div>'}
  </div>
  <div class="row" style="margin:14px 0 10px">
    <button class="btn sm" data-action="copyRoster">${icon('copy')} Copy last week’s duties</button>
    <button class="btn sm" data-action="exportRoster">${icon('calPlus')} Add week to phone calendar</button>
    <button class="btn sm ghost danger" data-action="clearRoster">Clear week</button>
  </div>
  <div class="card roster">${rows}</div>
  <datalist id="oncall-names">${names.map((n) => `<option value="${esc(n)}">`).join('')}</datalist>
  <div class="grid" style="margin-top:16px">
    <div class="card"><h2>${hi('note')} Notes for this week</h2>
      <textarea rows="3" data-change="rosterNotes" data-id="${ws}" placeholder="Swaps, leave, reminders…">${esc(r.notes || '')}</textarea></div>
    <div class="card"><h2>${hi('badge')} Shift types<span class="spacer"></span><button class="btn sm" data-action="newDutyType">+ Type</button></h2>
      <ul class="items">${db.dutyTypes.map((x) => `<li class="item clickable" data-action="editDutyType" data-id="${x.id}" style="align-items:center">
        <span class="swatch" style="background:${esc(x.color)}"></span><div class="body"><div class="title">${esc(x.name)}</div>
        <div class="meta">${x.start ? `${esc(x.start)}–${esc(x.end)} · ${round1(dutyHours(x))} h` : 'No hours'}</div></div></li>`).join('')}</ul></div>
  </div>`;
};
let rosterUrl;
afterRender.push((v) => {
  if (v !== 'duties') return;
  const ws = state.rosterWeek;
  const meta = rosterGet(ws).file;
  if (!meta) return;
  fileStore.get('roster|' + ws).then((rec) => {
    const el = $('#roster-file-preview');
    if (!el || state.rosterWeek !== ws) return;
    if (!rec) { el.innerHTML = '<div class="small muted">The file isn’t stored on this device (backups don’t include uploaded files). Upload it again to view it here.</div>'; return; }
    if (rosterUrl) URL.revokeObjectURL(rosterUrl);
    rosterUrl = URL.createObjectURL(rec.blob);
    const info = `<div class="small muted">${esc(meta.name)} · added ${esc(fmtDate(meta.added, { day: 'numeric', month: 'short' }))}</div>`;
    el.innerHTML = rec.type.startsWith('image/')
      ? `<img class="roster-img clickable" src="${rosterUrl}" alt="Roster for the week of ${esc(fmtDate(ws))}" data-action="viewRosterFile">${info}<div class="small muted">Tap the image to view it full size.</div>`
      : `<a class="btn" href="${rosterUrl}" target="_blank" rel="noopener">${icon('note')} Open roster PDF</a>${info}`;
  }).catch(() => { const el = $('#roster-file-preview'); if (el) el.innerHTML = '<div class="small muted">Couldn’t load the file.</div>'; });
});
function dutyForm(ws, i, entry, preset = {}) {
  openForm({
    title: entry ? 'Edit duty' : `Add duty · ${DOW[i]}`,
    values: { color: '#a43fc2', ...preset, ...entry, with: entry ? dutyWith(entry) : preset.with },
    fields: [
      { name: 'title', label: 'Duty / shift', required: true, placeholder: 'Morning, Ward round, Night…' },
      { name: 'start', label: 'Start', type: 'time', half: true },
      { name: 'end', label: 'End', type: 'time', half: true },
      { name: 'with', label: 'Working with', placeholder: 'Names, separated by commas', list: 'oncall-names' },
      { name: 'location', label: 'Ward / location', half: true },
      { name: 'color', label: 'Colour', type: 'color', half: true },
      { name: 'notes', label: 'Notes', type: 'textarea', rows: 2 },
    ],
    onSave: (v) => {
      if (entry) { Object.assign(entry, v); delete entry.person; } else (rosterEnsure(ws).days[i] ||= []).push({ id: uid(), ...v });
    },
    onDelete: entry ? () => { const r = rosterEnsure(ws); r.days[i] = r.days[i].filter((x) => x.id !== entry.id); } : null,
  });
}
function dutyTypeForm(dt) {
  openForm({
    title: dt ? 'Edit shift type' : 'New shift type',
    values: { color: '#c55bd6', ...dt },
    fields: [
      { name: 'name', label: 'Name', required: true, placeholder: 'Morning, Night, Off…' },
      { name: 'start', label: 'Start', type: 'time', half: true },
      { name: 'end', label: 'End', type: 'time', half: true },
      { name: 'color', label: 'Colour', type: 'color', half: true },
    ],
    onSave: (v) => (dt ? Object.assign(dt, v) : db.dutyTypes.push({ id: uid(), ...v })),
    onDelete: dt ? () => remove('dutyTypes', dt.id) : null,
  });
}
Object.assign(actions, {
  editDuty: (id) => { const [ws, i, did] = split(id); dutyForm(ws, i, rosterGet(ws).days[i]?.find((x) => x.id === did)); },
  newDutyType: () => dutyTypeForm(null),
  editDutyType: (id) => dutyTypeForm(find('dutyTypes', id)),
  copyRoster: () => {
    const ws = state.rosterWeek, prev = db.roster[addDays(ws, -7)];
    if (!prev || !Object.values(prev.days).some((l) => l.length)) return toast('Last week’s roster is empty');
    const cur = rosterGet(ws);
    if (Object.values(cur.days).some((l) => l.length) && !confirm('Replace this week’s duties with last week’s?')) return;
    const days = {};
    for (const [k, l] of Object.entries(prev.days)) days[k] = l.map((x) => ({ ...x, id: uid() }));
    rosterEnsure(ws).days = days; commit(); toast('Copied last week’s duties — update the on-call doctors for this week');
  },
  clearRoster: () => { if (confirm('Clear all duties and on-call names for this week?')) { const r = rosterEnsure(state.rosterWeek); r.days = {}; r.oncall = {}; commit(); } },
  exportRoster: () => {
    const ws = state.rosterWeek, r = rosterGet(ws), list = [];
    for (const [i, l] of Object.entries(r.days)) {
      l.forEach((x) => x.start && list.push({
        item: { ...x, time: x.start, end: toMin(x.end) > toMin(x.start) ? x.end : '', id: x.id,
          notes: [dutyWith(x) && `With: ${dutyWith(x)}`, r.oncall?.[i] && `On-call: ${r.oncall[i]}`, x.notes].filter(Boolean).join('\n') },
        date: addDays(ws, Number(i)),
      }));
    }
    list.length ? downloadIcs(list, `roster-${ws}`) : toast('No timed duties this week');
  },
  viewRosterFile: (id, el) => {
    const dlg = $('#modal');
    dlg.innerHTML = `<div class="viewer"><img src="${el.src}" alt="Full roster"><div class="row end"><button class="btn primary" data-close>Close</button></div></div>`;
    $('[data-close]', dlg).onclick = () => dlg.close();
    dlg.showModal();
  },
  removeRosterFile: () => {
    if (!confirm('Remove the uploaded roster for this week?')) return;
    const ws = state.rosterWeek;
    fileStore.del('roster|' + ws).catch(() => {});
    delete rosterEnsure(ws).file; commit();
  },
});
Object.assign(changes, {
  addDuty: (el) => {
    const [ws, i] = split(el.dataset.id), v = el.value;
    el.value = '';
    if (!v) return;
    if (v === '__custom') return dutyForm(ws, i, null);
    const dt = find('dutyTypes', v);
    dutyForm(ws, i, null, { title: dt.name, start: dt.start, end: dt.end, color: dt.color });
  },
  rosterOncall: (el) => { const [ws, i] = split(el.dataset.id); rosterEnsure(ws).oncall[i] = el.value.trim(); save(); },
  rosterNotes: (el) => { rosterEnsure(el.dataset.id).notes = el.value; save(); },
  rosterUpload: (el) => {
    const file = el.files[0], ws = el.dataset.id;
    if (!file) return;
    if (file.size > 30 * 1024 * 1024) return toast('That file is too large (max 30 MB)');
    toast('Saving roster…');
    compressImage(file)
      .then((blob) => fileStore.put('roster|' + ws, { blob, name: file.name, type: blob.type || file.type }))
      .then(() => { rosterEnsure(ws).file = { name: file.name, type: file.type, added: today() }; commit(); toast('Roster uploaded'); })
      .catch((e) => toast('Upload failed: ' + (e?.message || 'storage not available')));
  },
});
