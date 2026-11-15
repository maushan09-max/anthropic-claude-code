'use strict';
/* Prayer tracker (five daily prayers) and Quran reading progress. */

const PRAYERS = [['fajr', 'Fajr'], ['dhuhr', 'Dhuhr'], ['asr', 'Asr'], ['maghrib', 'Maghrib'], ['isha', 'Isha']];
const PRAYER_STATES = ['', 'on', 'late', 'missed']; // tap to cycle
const PRAYER_LABELS = { on: 'On time', late: 'Late / qadha', missed: 'Missed' };
const QURAN_PAGES = 604;
state.faithTab = 'prayer';
state.prayerDay = today();
state.prayerMonth = today().slice(0, 7);

const prayerDay = (d) => db.prayer.log[d] || {};
/** Prayers are excused on period days logged in the cycle tracker. */
const prayerExcused = (d) => typeof isPeriod === 'function' && isPeriod(d);
/** Stats only count days from when you started tracking. */
const prayerStart = () => Object.keys(db.prayer.log).sort()[0] || today();
const prayerCountable = (d) => d >= prayerStart() && d <= today() && !prayerExcused(d);
const prayedCount = (d) => PRAYERS.filter(([k]) => ['on', 'late'].includes(prayerDay(d)[k])).length;
const juzOf = (page) => (page < 22 ? 1 : Math.min(30, Math.floor((page - 22) / 20) + 2));
const quranToday = () => Number(db.quran.log[today()] || 0);

views.faith = () => `${tabs('faithTab', state.faithTab, [['prayer', `${icon('moonStar')} Prayer`], ['quran', `${icon('bookOpen')} Quran`]])}
  <div style="margin-top:14px">${state.faithTab === 'quran' ? quranView() : prayerView()}</div>`;
TOP_ACTIONS.faith = () => (state.faithTab === 'quran' ? ['logQuran', '+ Log reading'] : null);
actions.faithTab = (k) => { state.faithTab = k; render(); };

const prayerButtons = (d) => `<div class="prayers">${PRAYERS.map(([k, l]) => {
  const st = prayerDay(d)[k] || '';
  return `<button class="prayer-btn ${st}" data-action="cyclePrayer" data-id="${d}|${k}" ${d > today() ? 'disabled' : ''} aria-label="${l}: ${PRAYER_LABELS[st] || 'not marked'}">
    <span class="pb-ic">${st === 'on' ? icon('check') : st === 'late' ? icon('clock') : st === 'missed' ? icon('x') : icon('moonStar')}</span><b>${l}</b><small>${PRAYER_LABELS[st] || 'Tap'}</small></button>`;
}).join('')}</div>`;

function prayerView() {
  const d = state.prayerDay, ym = state.prayerMonth, t = today();
  const days = monthDays(ym).filter((x) => x <= t);
  const counted = days.filter(prayerCountable);
  const onTime = counted.reduce((s, x) => s + PRAYERS.filter(([k]) => prayerDay(x)[k] === 'on').length, 0);
  const done = counted.reduce((s, x) => s + prayedCount(x), 0);
  const missedAll = Object.entries(db.prayer.log).reduce((s, [x, v]) => s + (prayerExcused(x) ? 0 : Object.values(v).filter((st) => st === 'missed').length), 0);
  let streak = 0;
  for (let x = prayedCount(t) === 5 ? t : addDays(t, -1); prayedCount(x) === 5 || prayerExcused(x); x = addDays(x, -1)) { if (!prayerExcused(x)) streak++; if (streak > 3650) break; }
  const cal = monthGrid(ym, (x) => {
    if (x > t) return {};
    if (prayerExcused(x)) return { cls: 'pr-excused', html: '<span class="pr-count">—</span>' };
    const n = prayedCount(x), any = Object.keys(prayerDay(x)).length;
    if (!any) return {};
    return { cls: n === 5 ? 'pr-full' : n ? 'pr-part' : 'pr-none', html: `<span class="pr-count">${n}/5</span>` };
  }, { action: 'pickPrayerDay', cls: 'cal-compact', selected: d });
  return `
  <div class="stats">
    <div class="stat"><div class="label">This month</div><div class="value">${counted.length ? Math.round((done / (counted.length * 5)) * 100) : 0}%</div><div class="small muted">${done} of ${counted.length * 5} prayed</div></div>
    <div class="stat"><div class="label">On time</div><div class="value">${done ? Math.round((onTime / done) * 100) : 0}%</div></div>
    <div class="stat"><div class="label">Full-day streak</div><div class="value">${streak}<small> days</small></div></div>
    <div class="stat clickable" data-action="qadhaDone" title="Tap after making up a prayer"><div class="label">Qadha to make up</div><div class="value">${Math.max(0, missedAll - (db.prayer.qadhaDone || 0))}</div><div class="small muted">Tap when you make one up</div></div>
  </div>
  <div class="split-layout">
    <div><div class="toolbar">${monthNav('prayerMonth')}</div>${cal}
      <div class="legend"><span><i class="lg pr-full"></i>All 5</span><span><i class="lg pr-part"></i>Some</span><span><i class="lg pr-none"></i>None</span><span><i class="lg pr-excused"></i>Excused (period)</span></div></div>
    <div class="card day-detail"><h2>${hi('moonStar')} ${d === t ? 'Today' : esc(fmtDate(d, { weekday: 'long', day: 'numeric', month: 'short' }))}</h2>
      ${prayerExcused(d) ? `<div class="banner small">${icon('flower')} Period day — prayers are excused and not counted.</div>` : ''}
      ${prayerButtons(d)}
      <p class="hint">Tap a prayer to mark it: on time → late / qadha → missed → clear.</p></div>
  </div>`;
}
Object.assign(actions, {
  cyclePrayer: (id) => {
    const [d, k] = split(id);
    const day = (db.prayer.log[d] ||= {});
    const next = PRAYER_STATES[(PRAYER_STATES.indexOf(day[k] || '') + 1) % PRAYER_STATES.length];
    if (next) day[k] = next; else delete day[k];
    if (!Object.keys(day).length) delete db.prayer.log[d];
    commit();
  },
  pickPrayerDay: (d) => { if (d > today()) return; state.prayerDay = d; render(); },
  qadhaDone: () => { db.prayer.qadhaDone = (db.prayer.qadhaDone || 0) + 1; commit(); toast('Qadha prayer marked as made up'); },
});

function quranView() {
  const q = db.quran, t = today(), page = Number(q.page || 0);
  const days = []; for (let i = 13; i >= 0; i--) days.push(addDays(t, -i));
  const vals = days.map((x) => Number(q.log[x] || 0)), top = Math.max(5, ...vals);
  let streak = 0; for (let x = q.log[t] ? t : addDays(t, -1); q.log[x]; x = addDays(x, -1)) streak++;
  const left = QURAN_PAGES - page;
  const goalDays = q.goalDate && q.goalDate > t ? daysBetween(t, q.goalDate) : 0;
  const perDay = goalDays ? Math.ceil(left / goalDays) : 0;
  return `
  <div class="card quran-hero">
    <div class="q-ring" style="--p:${(page / QURAN_PAGES) * 100}"><span>${Math.round((page / QURAN_PAGES) * 100)}%</span></div>
    <div class="grow"><div class="cycle-title">Page ${page} of ${QURAN_PAGES}</div><div class="muted">Juz ${juzOf(Math.max(1, page))} · ${left} pages to finish${q.khatams ? ` · completed ${plural(q.khatams, 'time')}` : ''}</div>
      <div class="row" style="margin-top:10px">${[1, 2, 5, 10, 20].map((n) => `<button class="btn sm" data-action="quranAdd" data-id="${n}">+${n}</button>`).join('')}
        <button class="btn sm primary" data-action="logQuran">Log reading</button></div></div>
  </div>
  <div class="stats" style="margin-top:12px">
    <div class="stat"><div class="label">Today</div><div class="value">${quranToday()}<small> pages</small></div></div>
    <div class="stat"><div class="label">Reading streak</div><div class="value">${streak}<small> days</small></div></div>
    <div class="stat clickable" data-action="quranGoal"><div class="label">Finish by</div><div class="value small-val">${q.goalDate ? esc(fmtDate(q.goalDate, { day: 'numeric', month: 'short', year: 'numeric' })) : 'Set a goal'}</div>${perDay ? `<div class="small muted">${perDay} pages a day</div>` : ''}</div>
  </div>
  <div class="card"><h3>${hi('chart')} Last 14 days</h3>
    <div class="chart">${days.map((x, i) => `<div class="col" title="${esc(fmtDate(x))}: ${vals[i]} pages"><i style="height:${(vals[i] / top) * 100}%;background:var(--grad)"></i><small>${parseYmd(x).getDate()}</small></div>`).join('')}</div></div>`;
}
function quranAddPages(n, date = today()) {
  const q = db.quran;
  q.log[date] = Number(q.log[date] || 0) + n;
  if (q.log[date] <= 0) delete q.log[date];
  q.page = Number(q.page || 0) + n;
  if (q.page >= QURAN_PAGES) { q.page -= QURAN_PAGES; q.khatams = (q.khatams || 0) + 1; toast('Mashallah — you completed the Quran!'); }
  if (q.page < 0) q.page = 0;
}
Object.assign(actions, {
  quranAdd: (n) => { quranAddPages(Number(n)); commit(); },
  logQuran: () => openForm({
    title: 'Log Quran reading', values: { date: today(), upto: '' },
    fields: [
      { name: 'pages', label: 'Pages read', type: 'number', min: 0, step: '1', half: true },
      { name: 'upto', label: 'or: I read up to page', type: 'number', min: 1, max: QURAN_PAGES, step: '1', half: true },
      { name: 'date', label: 'Date', type: 'date', half: true },
    ],
    onSave: (v) => {
      const n = v.upto ? Number(v.upto) - Number(db.quran.page || 0) : Number(v.pages || 0);
      if (!n) { toast('Enter pages read or the page you reached'); return false; }
      quranAddPages(n, v.date || today());
    },
  }),
  quranGoal: () => openForm({
    title: 'Quran goal', values: { goalDate: db.quran.goalDate, page: db.quran.page },
    fields: [{ name: 'goalDate', label: 'Finish by', type: 'date', half: true }, { name: 'page', label: 'Current page', type: 'number', min: 0, max: QURAN_PAGES, step: '1', half: true }],
    onSave: (v) => { db.quran.goalDate = v.goalDate; if (v.page != null) db.quran.page = Math.max(0, Math.min(QURAN_PAGES, v.page)); },
  }),
});
