'use strict';
/* Navigation, rendering and global event wiring. Loaded last. */

const NAV = [
  ['Planner', [['today', 'Today', '☀️'], ['weekly', 'Weekly to-do', '🗓️'], ['monthly', 'Monthly to-do', '📅'], ['duties', 'Duty roster', '🧑‍💼']]],
  ['Home & health', [['meals', 'Meal prep', '🍱'], ['shopping', 'Things to buy', '🛒'], ['health', 'Health', '❤️']]],
  ['Money & travel', [['finances', 'Finances', '💰'], ['travel', 'Travel plans', '✈️']]],
  ['Personal', [['journal', 'Journal', '📔'], ['habits', 'Habits', '🔁'], ['goals', 'Goals', '🎯'], ['notes', 'Notes', '📝']]],
  ['', [['settings', 'Settings', '⚙️']]],
];
const VIEWS = NAV.flatMap((g) => g[1]);
const ALIASES = { tasks: 'weekly', calendar: 'monthly', money: 'finances', lists: 'shopping' };

const currentView = () => {
  let v = location.hash.replace(/^#\/?/, '');
  v = ALIASES[v] || v;
  return views[v] ? v : 'today';
};
function render() {
  const v = currentView();
  const active = document.activeElement;
  const focusId = active?.id, selStart = active?.selectionStart;

  document.documentElement.dataset.theme = db.settings.theme === 'auto' ? '' : db.settings.theme;
  const t = today();
  const badges = {
    weekly: db.tasks.filter((x) => !x.done && x.due && x.due <= t).length,
    shopping: db.lists.reduce((s, l) => s + l.items.filter((i) => !i.done && i.important).length, 0),
  };
  $('#nav').innerHTML = NAV.map(([group, items]) => `${group ? `<div class="nav-group">${group}</div>` : '<div class="nav-sep"></div>'}
    ${items.map(([k, label, ico]) => `<a href="#/${k}" class="${k === v ? 'active' : ''}"><span class="ico">${ico}</span>${label}${badges[k] ? `<span class="badge">${badges[k]}</span>` : ''}</a>`).join('')}`).join('');
  const meta = VIEWS.find((x) => x[0] === v);
  const title = v === 'travel' && state.tripId && find('trips', state.tripId) ? find('trips', state.tripId).name : meta[1];
  $('#page-title').textContent = title;
  document.title = `${title} · LifeOS`;
  let ta = TOP_ACTIONS[v];
  if (typeof ta === 'function') ta = ta();
  $('#top-actions').innerHTML = ta ? `<button class="btn primary" data-action="${ta[0]}" ${ta[2] != null ? `data-id="${esc(ta[2])}"` : ''}>${ta[1]}</button>` : '';
  const prevScroll = $('#main table.meds')?.parentElement.scrollLeft;
  $('#main').innerHTML = views[v]();
  // Keep horizontal table scroll (meds grid); on first show, scroll today's column into view
  const sc = $('#main table.meds')?.parentElement;
  if (sc) {
    if (prevScroll != null) sc.scrollLeft = prevScroll;
    else { const tc = sc.querySelector('th.today'); if (tc) sc.scrollLeft = Math.max(0, tc.offsetLeft - sc.clientWidth / 2); }
  }

  if (focusId) {
    const el = document.getElementById(focusId);
    if (el) { el.focus(); try { el.setSelectionRange(selStart, selStart); } catch { /* not a text input */ } }
  }
}

// ---------- Global event delegation ----------
Object.assign(actions, {
  toggleNav: () => document.body.classList.toggle('nav-open'),
  closeNav: () => document.body.classList.remove('nav-open'),
});
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el || !actions[el.dataset.action] || el.closest('dialog')) return;
  if (el.tagName === 'A') e.preventDefault();
  actions[el.dataset.action](el.dataset.id, el, e);
});
document.addEventListener('submit', (e) => {
  const f = e.target.closest('form[data-form]');
  if (!f) return;
  e.preventDefault();
  forms[f.dataset.form]?.(f);
});
document.addEventListener('change', (e) => {
  const el = e.target.closest('[data-change]');
  if (el && !el.closest('dialog')) changes[el.dataset.change]?.(el);
});
document.addEventListener('input', (e) => {
  const el = e.target.closest('[data-input]');
  if (el) { state[el.dataset.input] = el.value; render(); }
});
document.addEventListener('keydown', (e) => {
  if (e.target.matches('input, textarea, select') || e.metaKey || e.ctrlKey || e.altKey || $('#modal').open) return;
  const keyMap = { n: () => actions.newTask(), e: () => actions.newEvent(), j: () => actions.newJournal(), '/': () => $('input[type=search]')?.focus() };
  if (keyMap[e.key]) { e.preventDefault(); keyMap[e.key](); }
  else if (/^[1-9]$/.test(e.key)) location.hash = '#/' + VIEWS[Number(e.key) - 1][0];
});
$('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') e.target.close(); }); // backdrop closes
window.addEventListener('hashchange', () => {
  if (currentView() !== 'travel') state.tripId = null;
  document.body.classList.remove('nav-open');
  render(); $('#main').focus({ preventScroll: true }); window.scrollTo(0, 0);
});
window.addEventListener('storage', (e) => { if (e.key === KEY) { db = load(); render(); } }); // sync across tabs
document.addEventListener('visibilitychange', () => { if (!document.hidden) { checkReminders(); if (today() !== lastDay) rollover(); } });

// New day / new week rollover for long-open tabs
let lastDay = today();
function rollover() {
  const prevWeek = weekStart(lastDay);
  lastDay = today();
  state.healthDay = lastDay; state.calDay = lastDay;
  if (state.week === prevWeek) state.week = weekStart();
  if (state.mealWeek === prevWeek) state.mealWeek = weekStart();
  if (state.rosterWeek === prevWeek) state.rosterWeek = weekStart();
  render();
}
setInterval(() => { checkReminders(); if (today() !== lastDay) rollover(); }, 30000);

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});

render();
checkReminders();
