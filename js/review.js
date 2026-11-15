'use strict';
/* Search everything, and the weekly review. */

// ================= SEARCH =================
state.searchQuery = '';
function searchIndex() {
  const out = [];
  const add = (ic, title, sub, action, id, text = '') => out.push({ ic, title, sub, action, id, hay: `${title} ${sub} ${text}`.toLowerCase() });
  db.tasks.forEach((t) => add('checkCircle', t.title, `${isMonthly(t) ? 'Monthly' : 'Weekly'} task${t.due ? ' · ' + fmtDate(t.due) : ''}${t.done ? ' · done' : ''}`, 'editTask', t.id, t.notes));
  db.events.forEach((e) => add('calendar', e.title, `Event · ${fmtDate(e.date)}`, 'editEvent', e.id, `${e.location || ''} ${e.notes || ''}`));
  db.notes.forEach((n) => add('note', n.title, 'Note', 'editNote', n.id, `${n.body || ''} ${n.tags || ''}`));
  db.journal.forEach((j) => add('book', j.title || fmtDate(j.date, { day: 'numeric', month: 'long', year: 'numeric' }), `Journal · ${fmtDate(j.date)}`, 'editJournal', j.id, j.body));
  db.lists.forEach((l) => l.items.forEach((i) => add('cart', i.text, `${l.name}${i.done ? ' · bought' : ''}`, 'goShopping', l.id)));
  db.trips.forEach((tr) => {
    add('plane', tr.name, `Trip · ${tripDates(tr)}`, 'openTrip', tr.id, `${tr.destination || ''} ${tr.notes || ''}`);
    tr.legs.forEach((l) => add('plane', `${l.from || ''} → ${l.to || ''}`, `${tr.name} · ${l.carrier || ''} ${l.number || ''}${l.departDate ? ' · ' + fmtDate(l.departDate) : ''}`, 'openTrip', tr.id, `${l.ref || ''} ${l.notes || ''}`));
    tr.hotels.forEach((h) => add('bed', h.name, `${tr.name} · hotel${h.checkin ? ' · ' + fmtDate(h.checkin) : ''}`, 'openTrip', tr.id, `${h.city || ''} ${h.ref || ''} ${h.address || ''}`));
    tr.items.forEach((it) => add('pin', it.title, `${tr.name} · itinerary${it.date ? ' · ' + fmtDate(it.date) : ''}`, 'openTrip', tr.id, `${it.location || ''} ${it.notes || ''}`));
  });
  db.study.topics.forEach((x) => add('layers', x.title, `Study · ${x.subject || 'General'}`, 'editTopic', x.id, x.notes));
  db.recipes.forEach((r) => add('chef', r.name, 'Recipe', 'editRecipe', r.id, r.items.map((i) => i.name).join(' ')));
  db.dates.forEach((x) => add(DATE_ICONS[x.type] || 'gift', specialLabel(x), `Special date · ${fmtDate(specialNext(x))}`, 'editSpecial', x.id, `${x.gifts || ''} ${x.notes || ''}`));
  db.loans.forEach((l) => add('swap', l.person, `Loan ${l.direction === 'taken' ? 'taken' : 'given'} · ${fmtCur(l.amount, l.currency)}`, 'goFinance', 'loans', l.notes));
  db.accounts.forEach((a) => add('bank', a.name, `Savings · ${fmtCur(a.balance, a.currency)}`, 'goFinance', 'savings', a.notes));
  db.transactions.forEach((t) => add('receipt', t.note || t.category, `${t.type === 'income' ? 'Income' : 'Expense'} · ${money(t.amount)} · ${fmtDate(t.date)}`, 'editTx', t.id, t.category));
  db.meds.forEach((m) => add('pill', m.name, `Medication${m.dose ? ' · ' + m.dose : ''}`, 'editMed', m.id, m.notes));
  db.habits.forEach((h) => add('repeat', h.name, 'Habit', 'editHabit', h.id));
  db.goals.forEach((g) => add('target', g.title, 'Goal', 'editGoal', g.id, g.why));
  db.leave.entries.forEach((e) => add('palm', `${e.type} leave`, `${fmtDate(e.start)}${e.end && e.end !== e.start ? ' – ' + fmtDate(e.end) : ''}`, 'editLeave', e.id, e.notes));
  Object.entries(db.roster).forEach(([ws, r]) => Object.entries(r.days || {}).forEach(([i, l]) => l.forEach((x) => {
    const d = addDays(ws, Number(i));
    add('badge', `${x.title}${x.start ? ` ${x.start}–${x.end}` : ''}`, `Duty · ${fmtDate(d)}`, 'goRoster', ws, `${dutyWith(x)} ${r.oncall?.[i] || ''} ${x.location || ''}`);
  })));
  db.countdowns.forEach((c) => add('sparkle', c.title, `Countdown · ${fmtDate(c.date)}`, 'editCountdown', c.id));
  return out;
}
views.search = () => {
  const q = state.searchQuery.trim().toLowerCase();
  const words = q.split(/\s+/).filter(Boolean);
  const hits = q.length < 2 ? [] : searchIndex().filter((r) => words.every((w) => r.hay.includes(w))).slice(0, 80);
  return `<div class="card">
    <div class="search-box">${icon('search')}<input type="search" id="global-search" placeholder="Search tasks, notes, trips, duties, recipes…" value="${esc(state.searchQuery)}" data-input="searchQuery" autocomplete="off" aria-label="Search everything"></div>
    ${q.length < 2 ? '<p class="hint">Type at least 2 letters. Searches everything — tasks, events, notes, journal, shopping, trips & bookings, study topics, recipes, dates, money, meds and your roster.</p>'
      : hits.length ? `<div class="small muted" style="margin:8px 0">${plural(hits.length, 'result')}${hits.length === 80 ? ' (first 80)' : ''}</div><ul class="items">${hits.map((r) => `<li class="item clickable" data-action="${r.action}" data-id="${esc(r.id)}" style="align-items:center">
        <span class="hicon">${icon(r.ic)}</span><div class="body"><div class="title">${esc(r.title)}</div><div class="meta"><span>${esc(r.sub)}</span></div></div></li>`).join('')}</ul>`
      : empty('search', `Nothing found for “${esc(state.searchQuery)}”.`)}
  </div>`;
};
afterRender.push((v) => { if (v === 'search' && document.activeElement?.id !== 'global-search') $('#global-search')?.focus(); });
Object.assign(actions, {
  openSearch: () => { location.hash = '#/search'; },
  goShopping: () => { location.hash = '#/shopping'; },
  goFinance: (tab) => { state.financeTab = tab; location.hash = '#/finances'; render(); },
  goRoster: (ws) => { state.rosterWeek = ws; location.hash = '#/duties'; render(); },
});

// ================= WEEKLY REVIEW =================
state.reviewWeek = weekStart();
const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
function weekStats(ws) {
  const days = [0, 1, 2, 3, 4, 5, 6].map((i) => addDays(ws, i)), end = days[6], t = today();
  const inWeek = (d) => d && d >= ws && d <= end;
  const past = days.filter((d) => d <= t);
  const wTasks = db.tasks.filter((x) => isWeekly(x) && taskWeek(x) === ws);
  const mTasks = db.tasks.filter((x) => isMonthly(x) && inWeek(x.due));
  const r = rosterGet(ws);
  const duties = Object.values(r.days || {}).flat().filter((x) => !/off/i.test(x.title));
  const h = past.map((d) => healthOf(d));
  const nums = (k) => h.map((x) => Number(x[k])).filter((n) => n > 0);
  const medExp = past.reduce((s, d) => s + db.meds.reduce((a, m) => a + medExpected(m, d), 0), 0);
  const medGot = past.reduce((s, d) => s + db.meds.reduce((a, m) => a + (medExpected(m, d) ? medTakenCount(m, d) : 0), 0), 0);
  const prDays = past.filter(prayerCountable);
  const tx = db.transactions.filter((x) => inWeek(x.date));
  return {
    days, wTasks, mTasks,
    tasksDone: wTasks.filter((x) => x.done).length + mTasks.filter((x) => x.done).length, tasksAll: wTasks.length + mTasks.length,
    shifts: duties.length, hours: duties.reduce((s, x) => s + dutyHours(x), 0),
    leave: days.filter((d) => leaveOn(d)).length,
    sleep: avg(nums('sleep')), water: avg(nums('water')), mood: avg(nums('mood')), exercise: nums('exercise').reduce((a, b) => a + b, 0),
    meds: medExp ? Math.round((medGot / medExp) * 100) : null,
    prayers: prDays.length ? Math.round((prDays.reduce((s, d) => s + prayedCount(d), 0) / (prDays.length * 5)) * 100) : null,
    quran: days.reduce((s, d) => s + Number(db.quran.log[d] || 0), 0),
    studyHours: days.reduce((s, d) => s + Number(db.study.hours[d] || 0), 0),
    goals: studyGoals(ws), revisions: db.study.topics.reduce((s, x) => s + (x.revisions || []).filter(inWeek).length, 0),
    spent: tx.filter((x) => x.type === 'expense').reduce((s, x) => s + Number(x.amount), 0),
    income: tx.filter((x) => x.type === 'income').reduce((s, x) => s + Number(x.amount), 0),
    journal: db.journal.filter((j) => inWeek(j.date)).length,
  };
}
views.review = () => {
  const ws = state.reviewWeek, s = weekStats(ws), next = addDays(ws, 7);
  const nextDays = [0, 1, 2, 3, 4, 5, 6].map((i) => addDays(next, i));
  const rv = db.reviews[ws] || {};
  const tile = (label, value, sub = '') => `<div class="stat"><div class="label">${label}</div><div class="value">${value}</div>${sub ? `<div class="small muted">${sub}</div>` : ''}</div>`;
  const fmt1 = (n, u = '') => (n == null ? '–' : `${round1(n)}${u}`);
  const upcoming = [
    ...nextDays.flatMap((d) => rosterDay(d).filter((x) => !/off/i.test(x.title)).map((x) => [d, 'badge', `${x.title}${x.start ? ` ${x.start}–${x.end}` : ''}`])),
    ...nextDays.flatMap((d) => eventsOn(d).map((e) => [d, 'calendar', e.title])),
    ...nextDays.flatMap((d) => specialsOn(d).map((x) => [d, DATE_ICONS[x.type] || 'gift', specialLabel(x)])),
    ...db.tasks.filter((x) => !x.done && x.due && x.due >= next && x.due <= nextDays[6]).map((x) => [x.due, 'checkCircle', x.title]),
    ...allCountdowns().filter((c) => !c.approx && c.date >= next && c.date <= nextDays[6]).map((c) => [c.date, CD_ICONS[c.kind] || 'sparkle', c.title]),
  ].sort((a, b) => a[0].localeCompare(b[0]));
  const due = revisionsDue().length;
  return `
  <div class="toolbar">${weekNav('reviewWeek')}</div>
  <div class="section-title">${icon('checkCircle')} Tasks & work</div>
  <div class="stats">
    ${tile('Tasks done', `${s.tasksDone}/${s.tasksAll}`, s.tasksAll ? `${Math.round((s.tasksDone / s.tasksAll) * 100)}%` : '')}
    ${tile('Shifts', s.shifts, `${round1(s.hours)} hours`)}
    ${s.leave ? tile('Leave', `${s.leave}<small> days</small>`) : ''}
    ${tile('Journal entries', s.journal)}
  </div>
  <div class="section-title">${icon('heart')} Health & faith</div>
  <div class="stats">
    ${tile('Avg sleep', fmt1(s.sleep, '<small> h</small>'))}${tile('Avg water', fmt1(s.water, '<small> glasses</small>'))}
    ${tile('Avg mood', s.mood == null ? '–' : MOODS[Math.round(s.mood) - 1], s.mood == null ? '' : `${round1(s.mood)} / 5`)}${tile('Exercise', `${s.exercise}<small> min</small>`)}
    ${s.meds != null ? tile('Meds taken', `${s.meds}%`) : ''}${s.prayers != null ? tile('Prayers', `${s.prayers}%`) : ''}${tile('Quran', `${s.quran}<small> pages</small>`)}
  </div>
  <div class="section-title">${icon('grad')} Study & money</div>
  <div class="stats">
    ${tile('Study hours', round1(s.studyHours), db.study.target ? `target ${db.study.target} h` : '')}
    ${tile('Study goals', `${s.goals.filter((g) => g.done).length}/${s.goals.length}`)}
    ${tile('Revisions logged', s.revisions, due ? `${due} due now` : '')}
    ${tile('Spent', money(s.spent), s.income ? `income ${money(s.income)}` : '')}
  </div>
  <div class="grid wide" style="margin-top:16px">
    <div class="card"><h2>${hi('calendar')} Coming up next week</h2>
      ${upcoming.length ? `<ul class="items">${upcoming.map(([d, ic, txt]) => `<li class="item" style="align-items:center"><span class="hicon">${icon(ic)}</span><div class="body"><div class="title">${esc(txt)}</div><div class="meta"><span>${esc(fmtDate(d))}</span></div></div></li>`).join('')}</ul>` : empty('cloud', 'Nothing scheduled yet.')}
    </div>
    <div class="card"><h2>${hi('chat')} Reflect</h2>
      <label class="field"><span>What went well?</span><textarea rows="2" data-change="reviewNote" data-id="${ws}|wins">${esc(rv.wins || '')}</textarea></label>
      <label class="field" style="margin-top:8px"><span>What was hard?</span><textarea rows="2" data-change="reviewNote" data-id="${ws}|hard">${esc(rv.hard || '')}</textarea></label>
      <label class="field" style="margin-top:8px"><span>Focus for next week</span><textarea rows="2" data-change="reviewNote" data-id="${ws}|focus">${esc(rv.focus || '')}</textarea></label>
    </div>
  </div>`;
};
changes.reviewNote = (el) => { const [ws, k] = split(el.dataset.id); (db.reviews[ws] ||= {})[k] = el.value; save(); };
