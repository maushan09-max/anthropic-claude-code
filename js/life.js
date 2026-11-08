'use strict';
/* Meal prep (weekly, with macros), Things to buy, Health (daily log, body, cycle, poop, meds). */

// ================= MEAL PREP =================
const SLOTS = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'];
const UNITS = ['g', 'ml', 'piece', 'serving', 'cup', 'tbsp', 'tsp', 'slice'];
const per100 = (u) => u === 'g' || u === 'ml';
const num = (v) => (v === '' || v == null || isNaN(+v) ? 0 : +v);
/** Macros are stored per 100 g/ml, or per 1 unit for piece/serving/cup/etc. kcal auto = 4P + 4C + 9F if not given. */
function itemMacros(it) {
  const k = per100(it.unit) ? num(it.amount) / 100 : num(it.amount);
  const base = it.kcal !== '' && it.kcal != null && !isNaN(+it.kcal) ? +it.kcal : 4 * num(it.p) + 4 * num(it.c) + 9 * num(it.f);
  return { p: num(it.p) * k, c: num(it.c) * k, f: num(it.f) * k, kcal: base * k };
}
const sumMacros = (arr) => arr.reduce((s, m) => ({ p: s.p + m.p, c: s.c + m.c, f: s.f + m.f, kcal: s.kcal + m.kcal }), { p: 0, c: 0, f: 0, kcal: 0 });
const mealMacros = (meal) => sumMacros((meal?.items || []).map(itemMacros));
const getMeal = (ws, i, slot) => db.meals[ws]?.[i]?.[slot];
const dayMacros = (ws, i) => sumMacros(SLOTS.map((s) => mealMacros(getMeal(ws, i, s))));
const mealTitle = (m) => m.name || (m.items || []).map((x) => x.name).join(', ');
const macroLine = (m) => `<span class="mac p">P ${Math.round(m.p)}g</span> <span class="mac c">C ${Math.round(m.c)}g</span> <span class="mac f">F ${Math.round(m.f)}g</span> <b>${Math.round(m.kcal)} kcal</b>`;
function macroBars(m, T) {
  const row = (lab, v, t, u, cls) => `<div class="mbar"><span>${lab}</span>${bar(t ? (v / t) * 100 : 0, v > t * 1.05 ? 'over' : cls)}<small>${Math.round(v)}/${t}${u}</small></div>`;
  return row('kcal', m.kcal, T.kcal, '', '') + row('P', m.p, T.p, 'g', 'p') + row('C', m.c, T.c, 'g', 'c') + row('F', m.f, T.f, 'g', 'f');
}

views.meals = () => {
  const ws = state.mealWeek, T = db.settings.targets, t = today();
  const week = db.meals[ws] || {};
  const days = [0, 1, 2, 3, 4, 5, 6].map((i) => dayMacros(ws, i));
  const total = sumMacros(days);
  const planned = days.filter((d) => d.kcal > 0).length;
  // Aggregated prep / shopping list for the week
  const agg = {};
  Object.values(week).forEach((day) => Object.values(day || {}).forEach((m) => (m.items || []).forEach((it) => {
    const k = it.name.toLowerCase() + '|' + it.unit;
    (agg[k] ||= { name: it.name, unit: it.unit, amount: 0, times: 0 }); agg[k].amount += num(it.amount); agg[k].times++;
  })));
  const prep = Object.values(agg).sort((a, b) => a.name.localeCompare(b.name));
  return `
  <div class="toolbar">${weekNav('mealWeek')}<span class="grow"></span>
    <button class="btn sm" data-action="mealTargets">${icon('target')} Daily targets</button>
    <button class="btn sm" data-action="copyMeals">${icon('copy')} Copy last week</button></div>
  <div class="stats">
    <div class="stat"><div class="label">Week total</div><div class="value">${Math.round(total.kcal).toLocaleString()}<small> kcal</small></div></div>
    <div class="stat"><div class="label">Avg / planned day</div><div class="value">${planned ? Math.round(total.kcal / planned) : 0}<small> kcal</small></div></div>
    <div class="stat"><div class="label">Avg protein</div><div class="value">${planned ? Math.round(total.p / planned) : 0}<small> g</small></div></div>
    <div class="stat"><div class="label">Avg carbs · fat</div><div class="value">${planned ? Math.round(total.c / planned) : 0}<small>g</small> · ${planned ? Math.round(total.f / planned) : 0}<small>g</small></div></div>
  </div>
  <div class="week-grid">
    ${[0, 1, 2, 3, 4, 5, 6].map((i) => {
      const d = addDays(ws, i);
      return `<div class="card day-card ${d === t ? 'is-today' : ''}">
        <h3><span>${DOW[i]}</span><span class="muted small">${esc(fmtDate(d, { month: 'short', day: 'numeric' }))}</span>${d === t ? '<span class="chip today-chip">Today</span>' : ''}</h3>
        ${SLOTS.map((s) => {
          const m = getMeal(ws, i, s);
          const has = m && (m.name || m.items?.length);
          return `<div class="meal-slot clickable" data-action="editMeal" data-id="${ws}|${i}|${s}">
            <div class="slot-name">${s}</div>
            ${has ? `<div class="meal-name">${esc(mealTitle(m))}</div><div class="small">${macroLine(mealMacros(m))}</div>` : '<div class="muted small">+ Add meal</div>'}
          </div>`;
        }).join('')}
        <div class="day-total">${macroBars(days[i], T)}</div>
      </div>`;
    }).join('')}
    <div class="card day-card">
      <h3>${hi('receipt')} Prep & shopping list</h3>
      ${prep.length ? `<ul class="items">${prep.map((x) => `<li class="item"><div class="body title">${esc(x.name)}</div><span class="small muted">${round1(x.amount)} ${esc(x.unit)}${x.times > 1 ? ` · ${x.times} meals` : ''}</span></li>`).join('')}</ul>
        <button class="btn sm primary" style="margin-top:8px" data-action="prepToShop">${icon('cart')} Add all to Things to buy</button>` : empty('leaf', 'Plan meals to build your prep list.')}
    </div>
  </div>`;
};

function openMealEditor(ws, i, slot) {
  const meal = getMeal(ws, i, slot) || { name: '', items: [] };
  const numIn = (cls, label, v) => `<label class="mf"><span>${label}</span><input class="${cls}" type="number" step="any" min="0" inputmode="decimal" placeholder="${label}" value="${esc(v ?? '')}" aria-label="${label}"></label>`;
  const rowHtml = (it = { unit: 'g' }) => `<div class="mrow">
    <label class="mf m-name-wrap"><span>Food</span><input class="m-name" list="food-lib" placeholder="Food" value="${esc(it.name || '')}" aria-label="Food"></label>
    ${numIn('m-amt', 'Amount', it.amount)}
    <label class="mf"><span>Unit</span><select class="m-unit" aria-label="Unit">${UNITS.map((u) => `<option ${u === it.unit ? 'selected' : ''}>${u}</option>`).join('')}</select></label>
    ${numIn('m-p', 'Protein', it.p)}${numIn('m-c', 'Carbs', it.c)}${numIn('m-f', 'Fat', it.f)}${numIn('m-k', 'kcal', it.kcal)}
    <span class="m-out small muted"></span>
    <button type="button" class="icon-btn m-del" aria-label="Remove food">${icon('x')}</button></div>`;
  const dlg = $('#modal');
  dlg.innerHTML = `<form class="form meal-form" novalidate>
    <h2>${DOW[i]} · ${slot}</h2>
    <label class="field"><span>Meal name</span><input name="mname" value="${esc(meal.name || '')}" placeholder="e.g. Chicken rice bowl"></label>
    <div class="mhead"><span>Food</span><span>Amount</span><span>Unit</span><span>Protein</span><span>Carbs</span><span>Fat</span><span>kcal</span><span></span><span></span></div>
    <div class="mrows">${(meal.items.length ? meal.items : [undefined]).map(rowHtml).join('')}</div>
    <button type="button" class="btn sm" data-addrow>+ Add food</button>
    <div class="small muted" style="width:100%">Protein / carbs / fat / kcal are <b>per 100 g or ml</b>, or <b>per 1</b> piece, serving, cup, etc.
      Leave kcal blank to calculate it (4·P + 4·C + 9·F). Foods you enter are remembered for next time.</div>
    <div class="meal-total"></div>
    <datalist id="food-lib">${db.foods.map((f) => `<option value="${esc(f.name)}">`).join('')}</datalist>
    <div class="row end form-actions">
      ${meal.items.length || meal.name ? '<button type="button" class="btn danger" data-clear>Clear meal</button>' : ''}
      <span class="grow"></span><button type="button" class="btn ghost" data-cancel>Cancel</button><button type="submit" class="btn primary">Save</button></div>
  </form>`;
  const form = $('form', dlg), box = $('.mrows', form);
  const readRow = (r) => ({
    name: r.querySelector('.m-name').value.trim(), unit: r.querySelector('.m-unit').value,
    amount: num(r.querySelector('.m-amt').value), p: num(r.querySelector('.m-p').value), c: num(r.querySelector('.m-c').value),
    f: num(r.querySelector('.m-f').value), kcal: r.querySelector('.m-k').value === '' ? '' : num(r.querySelector('.m-k').value),
  });
  const read = () => [...box.querySelectorAll('.mrow')].map(readRow).filter((x) => x.name);
  const update = () => {
    box.querySelectorAll('.mrow').forEach((r) => { const m = itemMacros(readRow(r)); r.querySelector('.m-out').textContent = m.kcal ? `= ${Math.round(m.kcal)} kcal` : ''; });
    $('.meal-total', form).innerHTML = `<b>Meal total:</b> ${macroLine(sumMacros(read().map(itemMacros)))}`;
  };
  form.addEventListener('input', update);
  form.addEventListener('change', (e) => {
    if (!e.target.classList.contains('m-name')) return;
    const f = db.foods.find((x) => x.name.toLowerCase() === e.target.value.trim().toLowerCase());
    if (!f) return;
    const r = e.target.closest('.mrow');
    r.querySelector('.m-unit').value = f.unit;
    ['p', 'c', 'f'].forEach((k) => { r.querySelector('.m-' + k).value = f[k]; });
    r.querySelector('.m-k').value = f.kcal ?? '';
    if (!r.querySelector('.m-amt').value) r.querySelector('.m-amt').value = f.lastAmount || (per100(f.unit) ? 100 : 1);
    update();
  });
  box.addEventListener('click', (e) => { if (e.target.closest('.m-del')) { e.target.closest('.mrow').remove(); if (!box.children.length) box.insertAdjacentHTML('beforeend', rowHtml()); update(); } });
  $('[data-addrow]', form).onclick = () => { box.insertAdjacentHTML('beforeend', rowHtml()); box.lastElementChild.querySelector('input').focus(); };
  $('[data-cancel]', form).onclick = () => dlg.close();
  const clr = $('[data-clear]', form);
  if (clr) clr.onclick = () => { if (db.meals[ws]?.[i]) delete db.meals[ws][i][slot]; dlg.close(); commit(); };
  form.onsubmit = (e) => {
    e.preventDefault();
    const items = read(), name = form.elements.mname.value.trim();
    const day = ((db.meals[ws] ||= {})[i] ||= {});
    if (!items.length && !name) delete day[slot]; else day[slot] = { name, items };
    items.forEach((it) => { // remember foods
      const ex = db.foods.find((x) => x.name.toLowerCase() === it.name.toLowerCase());
      const rec = { name: it.name, unit: it.unit, p: it.p, c: it.c, f: it.f, kcal: it.kcal, lastAmount: it.amount };
      if (ex) Object.assign(ex, rec); else db.foods.push({ id: uid(), ...rec });
    });
    dlg.close(); commit();
  };
  dlg.showModal(); update();
}
Object.assign(actions, {
  editMeal: (id) => { const [ws, i, s] = split(id); openMealEditor(ws, Number(i), s); },
  mealTargets: () => openForm({
    title: 'Daily macro targets', values: db.settings.targets,
    fields: [{ name: 'kcal', label: 'Calories (kcal)', type: 'number', half: true, min: 0 }, { name: 'p', label: 'Protein (g)', type: 'number', half: true, min: 0 },
      { name: 'c', label: 'Carbs (g)', type: 'number', half: true, min: 0 }, { name: 'f', label: 'Fat (g)', type: 'number', half: true, min: 0 }],
    onSave: (v) => { for (const k in v) if (v[k] != null) db.settings.targets[k] = v[k]; },
  }),
  copyMeals: () => {
    const ws = state.mealWeek, prev = db.meals[addDays(ws, -7)];
    if (!prev || !Object.keys(prev).length) return toast('Last week has no meals planned');
    if (db.meals[ws] && Object.keys(db.meals[ws]).length && !confirm('Replace this week’s meals with last week’s plan?')) return;
    db.meals[ws] = clone(prev); commit(); toast('Copied last week’s meal plan');
  },
  prepToShop: () => {
    const week = db.meals[state.mealWeek] || {}, agg = {};
    Object.values(week).forEach((d) => Object.values(d || {}).forEach((m) => (m.items || []).forEach((it) => {
      const k = it.name.toLowerCase() + '|' + it.unit; (agg[k] ||= { name: it.name, unit: it.unit, amount: 0 }).amount += num(it.amount);
    })));
    const list = shoppingList();
    let n = 0;
    Object.values(agg).forEach((x) => {
      const text = `${x.name} (${round1(x.amount)} ${x.unit})`;
      if (!list.items.some((i) => !i.done && i.text.toLowerCase().startsWith(x.name.toLowerCase() + ' ('))) { list.items.push({ id: uid(), text, done: false }); n++; }
    });
    commit(); toast(n ? `Added ${plural(n, 'item')} to “${list.name}”` : 'Everything is already on your list');
  },
});

// ================= THINGS TO BUY =================
const shoppingList = () => db.lists.find((l) => /buy|shop|grocer/i.test(l.name)) || db.lists[0] || (db.lists.push({ id: uid(), name: 'Things to buy', items: [] }), db.lists[0]);
const shopSort = (a, b) => (a.done - b.done) || (!!b.important - !!a.important);
const shopItem = (l, i) => `<li class="item ${i.done ? 'done' : ''} ${i.important ? 'important' : ''}">
  <input type="checkbox" ${i.done ? 'checked' : ''} data-action="toggleListItem" data-id="${l.id}|${i.id}" aria-label="Bought">
  <div class="body title">${esc(i.text)}</div>
  <div class="acts"><button class="icon-btn star ${i.important ? 'on' : ''}" data-action="starListItem" data-id="${l.id}|${i.id}" aria-label="Toggle priority">${starIcon(i.important)}</button>
  <button class="icon-btn" data-action="delListItem" data-id="${l.id}|${i.id}" aria-label="Delete">${icon('x')}</button></div></li>`;
views.shopping = () => `
  <p class="hint">Tick to cross off · tap ${icon('star')} to highlight priority · start with <b>!</b> to add as priority.</p>
  <div class="grid">${db.lists.map((l) => {
    const done = l.items.filter((i) => i.done).length;
    return `<div class="card"><h2>${hi('cart')} ${esc(l.name)}<span class="small muted">${l.items.length - done} left</span><span class="spacer"></span>
      <button class="icon-btn" data-action="editList" data-id="${l.id}" aria-label="Rename list">${icon('edit')}</button></h2>
      <form class="quick-add" data-form="addListItem" data-id="${l.id}"><input name="text" placeholder="Add item…" autocomplete="off"><button class="btn primary sm">Add</button></form>
      <ul class="items">${[...l.items].sort(shopSort).map((i) => shopItem(l, i)).join('')}</ul>
      ${!l.items.length ? empty('bag', 'Nothing to buy yet.') : ''}
      ${done ? `<div class="row end" style="margin-top:8px"><button class="btn sm ghost" data-action="clearListDone" data-id="${l.id}">Clear ${done} bought</button></div>` : ''}
    </div>`;
  }).join('')}</div>`;
TOP_ACTIONS.shopping = ['newList', '+ List'];
function listForm(l) {
  openForm({
    title: l ? 'Rename list' : 'New list', values: l || {},
    fields: [{ name: 'name', label: 'List name', required: true, placeholder: 'Groceries, pharmacy, home…' }],
    onSave: (v) => (l ? Object.assign(l, v) : db.lists.push({ id: uid(), items: [], ...v })),
    onDelete: l && db.lists.length > 1 ? () => remove('lists', l.id) : null,
  });
}
const listItem = (id) => { const [lid, iid] = split(id); const l = find('lists', lid); return [l, l.items.find((x) => x.id === iid)]; };
Object.assign(actions, {
  newList: () => listForm(null),
  editList: (id) => listForm(find('lists', id)),
  toggleListItem: (id) => { const [, i] = listItem(id); i.done = !i.done; commit(); },
  starListItem: (id) => { const [, i] = listItem(id); i.important = !i.important; commit(); },
  delListItem: (id) => { const [l, i] = listItem(id); l.items = l.items.filter((x) => x !== i); commit(); toastUndo('Item removed', () => l.items.push(i)); },
  clearListDone: (id) => { const l = find('lists', id); l.items = l.items.filter((x) => !x.done); commit(); },
});
forms.addListItem = (f) => {
  let text = f.elements.text.value.trim(); if (!text) return;
  const important = text.startsWith('!'); if (important) text = text.slice(1).trim();
  find('lists', f.dataset.id).items.push({ id: uid(), text, done: false, important });
  commit(); $(`form[data-form=addListItem][data-id="${f.dataset.id}"] input`)?.focus();
};

// ================= HEALTH =================
const healthOf = (d) => db.health[d] || {};
const setHealth = (d, patch) => { db.health[d] = { ...healthOf(d), ...patch }; };
const HEALTH_TABS = [['daily', 'clipboard', 'Daily'], ['body', 'ruler', 'Body'], ['cycle', 'flower', 'Cycle'], ['poop', 'bowel', 'Poop'], ['meds', 'pill', 'Meds']].map(([k, ic, l]) => [k, `${icon(ic)} ${l}`]);

views.health = () => `${tabs('healthTab', state.healthTab, HEALTH_TABS)}<div style="margin-top:14px">${healthTabs[state.healthTab]()}</div>`;
TOP_ACTIONS.health = () => ({ body: ['newBody', '+ Measurement'], meds: ['newMed', '+ Medication'] }[state.healthTab]);
actions.healthTab = (k) => { state.healthTab = k; render(); };
actions.goHealth = (k) => { state.healthTab = k; location.hash = '#/health'; render(); };
const healthTabs = {};

healthTabs.daily = () => {
  const d = state.healthDay, h = healthOf(d);
  const days = []; for (let i = 13; i >= 0; i--) days.push(addDays(today(), -i));
  const chart = (key, max, color, unit) => {
    const vals = days.map((x) => Number(healthOf(x)[key] || 0));
    const top = Math.max(max, ...vals), logged = vals.filter(Boolean);
    const avg = logged.length ? round1(logged.reduce((s, n) => s + n, 0) / logged.length) : '–';
    return `<div class="small muted">14-day average: <b>${avg}${logged.length ? ' ' + unit : ''}</b></div>
      <div class="chart">${days.map((x, i) => `<div class="col" title="${esc(fmtDate(x))}: ${vals[i]} ${unit}"><i style="height:${(vals[i] / top) * 100}%;background:${color}"></i><small>${parseYmd(x).getDate()}</small></div>`).join('')}</div>`;
  };
  return `
  <div class="toolbar"><div class="navgroup"><button class="btn" data-action="healthNav" data-id="-1" aria-label="Previous day">${icon('chevL')}</button>
    <b class="nav-label">${d === today() ? 'Today' : esc(fmtDate(d, { weekday: 'long', month: 'short', day: 'numeric' }))}</b>
    <button class="btn" data-action="healthNav" data-id="1" ${d >= today() ? 'disabled' : ''} aria-label="Next day">${icon('chevR')}</button></div></div>
  <div class="grid">
    <div class="card"><h2>${hi('mood4')} Mood</h2><div class="moods">${MOODS.map((e, i) => `<button class="mood-btn ${h.mood == i + 1 ? 'on' : ''}" data-action="setMood" data-id="${d}|${i + 1}" title="${MOOD_LABELS[i]}" aria-label="${MOOD_LABELS[i]}">${e}</button>`).join('')}</div></div>
    <div class="card"><h2>${hi('drop')} Water<span class="spacer"></span><span class="small muted">${h.water || 0} / ${WATER_GOAL}</span></h2>
      <div class="water">${Array.from({ length: Math.max(WATER_GOAL, h.water || 0) }, (_, i) => `<span class="${i < (h.water || 0) ? 'on' : ''}">${icon('drop', 'fill')}</span>`).join('')}</div>
      <div class="row"><button class="btn sm" data-action="water" data-id="${d}|-1">− Glass</button><button class="btn sm primary" data-action="water" data-id="${d}|1">+ Glass</button></div></div>
    <div class="card"><h2>${hi('clipboard')} Daily log</h2>
      <div class="form-grid">
        <label class="field"><span>Sleep (hours)</span><input type="number" step="0.5" min="0" max="24" inputmode="decimal" value="${esc(h.sleep ?? '')}" data-change="health" data-id="${d}|sleep"></label>
        <label class="field"><span>Exercise (min)</span><input type="number" step="5" min="0" inputmode="numeric" value="${esc(h.exercise ?? '')}" data-change="health" data-id="${d}|exercise"></label>
        <label class="field"><span>Steps</span><input type="number" step="100" min="0" inputmode="numeric" value="${esc(h.steps ?? '')}" data-change="health" data-id="${d}|steps"></label>
      </div>
      <label class="field" style="margin-top:10px"><span>Notes (symptoms, meals…)</span><textarea rows="2" data-change="health" data-id="${d}|notes">${esc(h.notes || '')}</textarea></label></div>
  </div>
  <div class="section-title">Trends</div>
  <div class="grid">
    <div class="card"><h3>${hi('moon')} Sleep</h3>${chart('sleep', 8, 'var(--c1)', 'h')}</div>
    <div class="card"><h3>${hi('activity')} Exercise</h3>${chart('exercise', 30, 'var(--c2)', 'min')}</div>
    <div class="card"><h3>${hi('drop')} Water</h3>${chart('water', WATER_GOAL, 'var(--c3)', 'glasses')}</div>
    <div class="card"><h3>${hi('mood4')} Mood</h3>${chart('mood', 5, 'var(--c4)', '/5')}</div>
  </div>`;
};

// ---- Body measurements ----
const bodySorted = () => [...db.body].sort((a, b) => a.date.localeCompare(b.date));
const lastOf = (key) => { const e = bodySorted().reverse().find((x) => x[key] != null && x[key] !== ''); return e ? Number(e[key]) : null; };
function bmiCat(b) { return b < 18.5 ? ['Underweight', 'warn'] : b < 25 ? ['Healthy', 'good'] : b < 30 ? ['Overweight', 'warn'] : ['Obese', 'bad']; }
healthTabs.body = () => {
  const list = bodySorted(), H = lastOf('height'), W = lastOf('weight'), Wa = lastOf('waist');
  const firstW = list.find((x) => x.weight != null)?.weight;
  const bmi = H && W ? W / (H / 100) ** 2 : null;
  const whtr = H && Wa ? Wa / H : null;
  const series = (k) => list.filter((x) => x[k] != null && x[k] !== '').map((x) => ({ date: x.date, v: Number(x[k]) }));
  const bmiSeries = list.filter((x) => x.weight != null).map((x) => { const h = x.height || H; return h ? { date: x.date, v: round1(x.weight / (h / 100) ** 2) } : null; }).filter(Boolean);
  if (!list.length) return `<div class="card">${empty('ruler', 'Track height, weight and waist over time to see your trends.<br><br><button class="btn primary" data-action="newBody">+ Add measurement</button>')}</div>`;
  const delta = W != null && firstW != null && W !== firstW ? ` <small class="${W < firstW ? 'good' : 'bad'}">${W > firstW ? '+' : ''}${round1(W - firstW)}</small>` : '';
  return `
  <div class="stats">
    <div class="stat"><div class="label">Height</div><div class="value">${H ?? '–'}<small> cm</small></div></div>
    <div class="stat"><div class="label">Weight</div><div class="value">${W ?? '–'}<small> kg</small>${delta}</div></div>
    <div class="stat"><div class="label">Waist</div><div class="value">${Wa ?? '–'}<small> cm</small></div></div>
    <div class="stat"><div class="label">BMI</div><div class="value">${bmi ? round1(bmi) : '–'}</div>${bmi ? `<div class="small ${bmiCat(bmi)[1]}">${bmiCat(bmi)[0]}</div>` : ''}</div>
    <div class="stat"><div class="label">Waist ÷ height</div><div class="value">${whtr ? whtr.toFixed(2) : '–'}</div>${whtr ? `<div class="small ${whtr < 0.5 ? 'good' : 'warn'}">${whtr < 0.5 ? 'Healthy (< 0.5)' : 'Above 0.5'}</div>` : ''}</div>
  </div>
  <div class="grid">
    <div class="card"><h3>${hi('scale')} Weight (kg)</h3>${lineChart(series('weight'), '#a43fc2', 'kg')}</div>
    <div class="card"><h3>${hi('tape')} Waist (cm)</h3>${lineChart(series('waist'), '#e6489b', 'cm')}</div>
    <div class="card"><h3>${hi('chart')} BMI</h3>${lineChart(bmiSeries, '#7c4dcc', '')}</div>
    <div class="card"><h3>${hi('ruler')} Height (cm)</h3>${lineChart(series('height'), '#c55bd6', 'cm')}</div>
  </div>
  <div class="card" style="margin-top:16px"><h2>History</h2>
    <div class="table-scroll"><table class="table"><thead><tr><th>Date</th><th>Height</th><th>Weight</th><th>Waist</th><th>Notes</th></tr></thead>
    <tbody>${[...list].reverse().map((x) => `<tr class="clickable" data-action="editBody" data-id="${x.id}"><td>${esc(fmtDate(x.date, { day: 'numeric', month: 'short', year: 'numeric' }))}</td>
      <td>${x.height ?? ''}</td><td>${x.weight ?? ''}</td><td>${x.waist ?? ''}</td><td class="muted">${esc(x.notes || '')}</td></tr>`).join('')}</tbody></table></div></div>`;
};
function bodyForm(e) {
  openForm({
    title: e ? 'Edit measurement' : 'New measurement',
    values: e || { date: today(), height: lastOf('height') },
    fields: [
      { name: 'date', label: 'Date', type: 'date', half: true },
      { name: 'height', label: 'Height (cm)', type: 'number', step: '0.1', min: 0, half: true },
      { name: 'weight', label: 'Weight (kg)', type: 'number', step: '0.1', min: 0, half: true },
      { name: 'waist', label: 'Waist circumference (cm)', type: 'number', step: '0.1', min: 0, half: true },
      { name: 'notes', label: 'Notes', placeholder: 'Morning, after workout…' },
    ],
    onSave: (v) => { if (!v.date) v.date = today(); if (e) Object.assign(e, v); else db.body.push({ id: uid(), ...v }); },
    onDelete: e ? () => remove('body', e.id) : null,
  });
}
actions.newBody = () => bodyForm(null);
actions.editBody = (id) => bodyForm(find('body', id));

// ---- Cycle tracking ----
const FLOWS = [['', 'No period'], ['spotting', 'Spotting'], ['light', 'Light'], ['medium', 'Medium'], ['heavy', 'Heavy']];
const isPeriod = (d) => ['light', 'medium', 'heavy'].includes(db.cycle[d]?.flow);
function cycleStats() {
  const days = Object.keys(db.cycle).filter(isPeriod).sort();
  const starts = days.filter((d) => !isPeriod(addDays(d, -1)));
  const lens = starts.map((s) => { let n = 0; while (isPeriod(addDays(s, n))) n++; return n; });
  const cycles = starts.slice(1).map((s, i) => daysBetween(starts[i], s)).filter((n) => n >= 15 && n <= 60).slice(-6);
  const avgCycle = cycles.length ? Math.round(cycles.reduce((a, b) => a + b, 0) / cycles.length) : 28;
  const avgPeriod = lens.length ? Math.round(lens.slice(-6).reduce((a, b) => a + b, 0) / Math.min(6, lens.length)) : 5;
  const last = starts.at(-1);
  const t = today();
  let next = last ? addDays(last, avgCycle) : null;
  const late = next && next < t ? daysBetween(next, t) : 0;
  const predicted = new Set(), fertile = new Set(), ovulation = new Set();
  if (last) {
    for (let k = 1; k <= 3; k++) {
      const s = addDays(last, avgCycle * k);
      for (let j = 0; j < avgPeriod; j++) predicted.add(addDays(s, j));
      const ov = addDays(s, -14); ovulation.add(ov);
      for (let j = -5; j <= 1; j++) fertile.add(addDays(ov, j));
    }
  }
  return { starts, last, avgCycle, avgPeriod, next, late, cycleDay: last ? daysBetween(last, t) + 1 : null, predicted, fertile, ovulation, counted: cycles.length };
}
healthTabs.cycle = () => {
  const s = cycleStats(), t = today();
  const cal = monthGrid(state.healthMonth, (d) => {
    const e = db.cycle[d];
    const cls = e?.flow ? `flow-${e.flow}` : d > t && s.predicted.has(d) ? 'pred' : s.ovulation.has(d) && d >= (s.last || '') ? 'ovul' : s.fertile.has(d) && d >= (s.last || '') ? 'fertile' : '';
    const sym = e?.notes ? '<span class="dot-note">•</span>' : '';
    return { cls, html: sym, title: e ? `${e.flow || ''} ${e.notes || ''}` : '' };
  }, { action: 'cycleDay', cls: 'cal-compact' });
  return `
  <div class="stats">
    <div class="stat"><div class="label">Cycle day</div><div class="value">${s.cycleDay ?? '–'}</div></div>
    <div class="stat"><div class="label">Next period</div><div class="value small-val">${s.next ? (s.late ? `<span class="warn">${s.late}d late</span>` : esc(relDay(s.next))) : '–'}</div>${s.next ? `<div class="small muted">${esc(fmtDate(s.next))}</div>` : ''}</div>
    <div class="stat"><div class="label">Avg cycle</div><div class="value">${s.avgCycle}<small> days</small></div><div class="small muted">${s.counted ? `from ${plural(s.counted, 'cycle')}` : 'default'}</div></div>
    <div class="stat"><div class="label">Avg period</div><div class="value">${s.avgPeriod}<small> days</small></div></div>
  </div>
  <div class="toolbar">${monthNav('healthMonth')}</div>
  ${cal}
  <div class="legend"><span><i class="lg flow-light"></i>Light</span><span><i class="lg flow-medium"></i>Medium</span><span><i class="lg flow-heavy"></i>Heavy</span>
    <span><i class="lg flow-spotting"></i>Spotting</span><span><i class="lg pred"></i>Predicted</span><span><i class="lg fertile"></i>Fertile window</span><span><i class="lg ovul"></i>Ovulation (est.)</span></div>
  <p class="hint">Tap a day to log flow and symptoms. Predictions improve after a few cycles and are estimates only — not contraception.</p>`;
};
actions.cycleDay = (d) => {
  const e = db.cycle[d] || {};
  openForm({
    title: `Cycle · ${fmtDate(d, { weekday: 'short', month: 'short', day: 'numeric' })}`, values: e,
    fields: [
      { name: 'flow', label: 'Flow', type: 'select', options: FLOWS },
      { name: 'notes', label: 'Symptoms / notes', placeholder: 'Cramps, headache, bloating, mood…' },
    ],
    onSave: (v) => { if (!v.flow && !v.notes) delete db.cycle[d]; else db.cycle[d] = v; },
    onDelete: db.cycle[d] ? () => { delete db.cycle[d]; } : null,
  });
};

// ---- Poop tracking ----
const BRISTOL = [['', 'Not recorded'], ['1', 'Type 1 · Hard lumps'], ['2', 'Type 2 · Lumpy sausage'], ['3', 'Type 3 · Cracked sausage'],
  ['4', 'Type 4 · Smooth & soft (ideal)'], ['5', 'Type 5 · Soft blobs'], ['6', 'Type 6 · Mushy'], ['7', 'Type 7 · Watery']];
const bristolGroup = (t) => (!t ? 'ok' : t <= 2 ? 'hard' : t <= 5 ? 'ok' : 'loose');
healthTabs.poop = () => {
  const ym = state.healthMonth;
  const entries = monthDays(ym).map((d) => [d, db.poop[d]]).filter(([, e]) => e);
  const total = entries.reduce((s, [, e]) => s + num(e.count), 0);
  const none = entries.filter(([, e]) => !num(e.count)).length;
  const types = {}; entries.forEach(([, e]) => { if (e.type) types[e.type] = (types[e.type] || 0) + 1; });
  const common = Object.entries(types).sort((a, b) => b[1] - a[1])[0];
  const cal = monthGrid(ym, (d) => {
    const e = db.poop[d];
    if (!e) return {};
    const n = num(e.count);
    return { cls: n ? `bristol-${bristolGroup(+e.type)}` : 'poop-none', html: `<span class="poop">${n ? `${icon('bowel')}${n > 1 ? '×' + n : ''}` : '–'}</span>`, title: e.type ? BRISTOL[e.type][1] : '' };
  }, { action: 'poopDay', cls: 'cal-compact' });
  return `
  <div class="stats">
    <div class="stat"><div class="label">Days logged</div><div class="value">${entries.length}</div></div>
    <div class="stat"><div class="label">Avg per day</div><div class="value">${entries.length ? round1(total / entries.length) : '–'}</div></div>
    <div class="stat"><div class="label">Days with none</div><div class="value">${none}</div></div>
    <div class="stat"><div class="label">Most common</div><div class="value small-val">${common ? 'Type ' + common[0] : '–'}</div></div>
  </div>
  <div class="toolbar">${monthNav('healthMonth')}</div>
  ${cal}
  <div class="legend"><span><i class="lg bristol-hard"></i>Hard (1–2)</span><span><i class="lg bristol-ok"></i>Normal (3–5)</span><span><i class="lg bristol-loose"></i>Loose (6–7)</span><span><i class="lg poop-none"></i>None</span></div>
  <p class="hint">Tap a day to log. Uses the Bristol stool scale.</p>`;
};
actions.poopDay = (d) => {
  const e = db.poop[d];
  openForm({
    title: `Bowel movement · ${fmtDate(d, { weekday: 'short', month: 'short', day: 'numeric' })}`, values: e || { count: 1, type: '4' },
    fields: [
      { name: 'count', label: 'How many times', type: 'number', min: 0, step: '1', half: true },
      { name: 'type', label: 'Type (Bristol scale)', type: 'select', options: BRISTOL, half: true },
      { name: 'notes', label: 'Notes', placeholder: 'Pain, blood, urgency, food triggers…' },
    ],
    onSave: (v) => { db.poop[d] = { ...v, count: v.count ?? 0 }; },
    onDelete: e ? () => { delete db.poop[d]; } : null,
  });
};

// ---- Meds ----
healthTabs.meds = () => {
  const ym = state.healthMonth, days = monthDays(ym), t = today();
  const active = db.meds.filter((m) => m.active !== false), stopped = db.meds.filter((m) => m.active === false);
  if (!db.meds.length) return `<div class="card">${empty('pill', 'Add your medications and tick them off each day.<br><br><button class="btn primary" data-action="newMed">+ Add medication</button>')}</div>`;
  const adherence = (m) => {
    const from = [m.created || days[0], days[0]].sort()[1], to = [t, days.at(-1)].sort()[0];
    if (from > to) return null;
    const ds = days.filter((d) => d >= from && d <= to);
    const taken = ds.reduce((s, d) => s + Math.min(m.log?.[d] || 0, m.times), 0);
    return Math.round((taken / (ds.length * m.times)) * 100);
  };
  return `
  <div class="toolbar">${monthNav('healthMonth')}</div>
  <div class="card"><div class="table-scroll">
    <table class="meds"><thead><tr><th class="sticky">Medication</th>${days.map((d) => `<th class="${d === t ? 'today' : ''}">${parseYmd(d).getDate()}<small>${DOW_SHORT[parseYmd(d).getDay()][0]}</small></th>`).join('')}<th>%</th></tr></thead>
    <tbody>${active.map((m) => { const a = adherence(m); return `<tr><th class="sticky clickable" data-action="editMed" data-id="${m.id}">${esc(m.name)}<small>${esc(m.dose || '')}${m.times > 1 ? ` · ${m.times}×/day` : ''}</small></th>
      ${days.map((d) => { const n = m.log?.[d] || 0, full = n >= m.times, fut = d > t;
        return `<td class="${d === t ? 'today' : ''}"><button class="mcell ${full ? 'full' : n ? 'part' : ''}" data-action="medDose" data-id="${m.id}|${d}" ${fut ? 'disabled' : ''} aria-label="${esc(m.name)} ${d}">${full ? icon('check') : n ? `${n}/${m.times}` : ''}</button></td>`; }).join('')}
      <td><b class="${a == null ? '' : a >= 90 ? 'good' : a >= 60 ? 'warn' : 'bad'}">${a == null ? '–' : a + '%'}</b></td></tr>`; }).join('')}</tbody></table></div>
    <p class="hint">Tap a day to mark it taken. For meds taken several times a day, tap again for each dose.</p></div>
  ${stopped.length ? `<div class="section-title">Stopped</div><div class="card"><ul class="items">${stopped.map((m) => `<li class="item clickable" data-action="editMed" data-id="${m.id}"><div class="body title">${esc(m.name)} <span class="muted small">${esc(m.dose || '')}</span></div></li>`).join('')}</ul></div>` : ''}`;
};
function medForm(m) {
  openForm({
    title: m ? 'Edit medication' : 'New medication',
    values: m || { times: 1, active: true },
    fields: [
      { name: 'name', label: 'Medication', required: true, placeholder: 'Vitamin D, Metformin…' },
      { name: 'dose', label: 'Dose', half: true, placeholder: '500 mg, 1 tablet' },
      { name: 'times', label: 'Times per day', type: 'number', min: 1, max: 8, step: '1', half: true },
      { name: 'notes', label: 'Notes', placeholder: 'With food, before bed…' },
      { name: 'active', label: 'Currently taking', type: 'checkbox' },
    ],
    onSave: (v) => { v.times = Math.max(1, Math.min(8, v.times || 1)); if (m) Object.assign(m, v); else db.meds.push({ id: uid(), log: {}, created: today(), ...v }); },
    onDelete: m ? () => remove('meds', m.id) : null,
  });
}
Object.assign(actions, {
  newMed: () => medForm(null),
  editMed: (id) => medForm(find('meds', id)),
  medDose: (id) => {
    const [mid, d] = split(id); const m = find('meds', mid);
    m.log ||= {};
    const n = ((m.log[d] || 0) + 1) % (m.times + 1);
    if (n) m.log[d] = n; else delete m.log[d];
    commit();
  },
  setMood: (id) => { const [d, n] = split(id); setHealth(d, { mood: healthOf(d).mood == n ? null : Number(n) }); commit(); },
  water: (id) => { const [d, n] = split(id); setHealth(d, { water: Math.max(0, (healthOf(d).water || 0) + Number(n)) }); commit(); },
  healthNav: (n) => { const d = addDays(state.healthDay, Number(n)); if (d <= today()) { state.healthDay = d; render(); } },
});
changes.health = (el) => {
  const [d, key] = split(el.dataset.id);
  setHealth(d, { [key]: key === 'notes' ? el.value : el.value === '' ? null : Number(el.value) });
  save();
};
