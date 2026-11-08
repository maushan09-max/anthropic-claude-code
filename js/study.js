'use strict';
/* Study plan: topics to revise (by subject) and weekly study goals with study hours. */

const TOPIC_STATUS = [['todo', 'To revise'], ['doing', 'Revising'], ['done', 'Confident']];
const statusLabel = (k) => (TOPIC_STATUS.find((x) => x[0] === k) || TOPIC_STATUS[0])[1];
const studyGoals = (ws) => db.study.goals[ws] || [];
state.studyTab = 'topics';
state.studyWeek = weekStart();
state.topicFilter = 'all';
state.topicSubject = '';

views.study = () => `${tabs('studyTab', state.studyTab, [['topics', `${icon('layers')} Topics to revise`], ['goals', `${icon('target')} Weekly goals`]])}
  <div style="margin-top:14px">${state.studyTab === 'topics' ? studyTopics() : studyWeekly()}</div>`;
TOP_ACTIONS.study = () => (state.studyTab === 'topics' ? ['newTopic', '+ Topic'] : ['newStudyGoal', '+ Goal']);
actions.studyTab = (k) => { state.studyTab = k; render(); };

// ---------- Topics to revise ----------
function studyTopics() {
  const all = db.study.topics;
  const subjects = [...new Set(all.map((x) => x.subject).filter(Boolean))].sort();
  const f = state.topicFilter, sub = state.topicSubject;
  const list = all.filter((x) => (f === 'all' ? true : f === 'priority' ? x.important : x.status === f) && (!sub || x.subject === sub));
  const count = (k) => all.filter((x) => x.status === k).length;
  const done = count('done');
  const groups = {};
  list.forEach((x) => (groups[x.subject || 'General'] ||= []).push(x));
  const order = { todo: 0, doing: 1, done: 2 };
  const item = (x) => {
    const revs = x.revisions || [];
    const last = revs.at(-1);
    return `<li class="item ${x.status === 'done' ? 'done' : ''} ${x.important ? 'important' : ''}">
      <input type="checkbox" ${x.status === 'done' ? 'checked' : ''} data-action="topicDone" data-id="${x.id}" aria-label="Mark as confident">
      <div class="body clickable" data-action="editTopic" data-id="${x.id}">
        <div class="title">${esc(x.title)}</div>
        <div class="meta"><span class="chip status-${x.status}">${statusLabel(x.status)}</span>
          ${revs.length ? `<span>${icon('repeat')} Revised ${revs.length}× · last ${esc(relDay(last).toLowerCase())}</span>` : '<span>Not revised yet</span>'}
          ${x.due ? `<span class="${x.due < today() && x.status !== 'done' ? 'overdue' : ''}">${icon('calendar')} by ${esc(fmtDate(x.due, { day: 'numeric', month: 'short' }))}</span>` : ''}
          ${x.notes ? `<span>${icon('note')}</span>` : ''}</div>
      </div>
      <div class="acts">
        <button class="btn sm" data-action="topicRevised" data-id="${x.id}" title="Log a revision today">${icon('check')} Revised</button>
        <button class="icon-btn star ${x.important ? 'on' : ''}" data-action="topicStar" data-id="${x.id}" aria-label="Toggle priority">${starIcon(x.important)}</button>
      </div></li>`;
  };
  return `
  <div class="stats">
    <div class="stat"><div class="label">Topics</div><div class="value">${all.length}</div></div>
    <div class="stat"><div class="label">To revise</div><div class="value">${count('todo')}</div></div>
    <div class="stat"><div class="label">Revising</div><div class="value">${count('doing')}</div></div>
    <div class="stat"><div class="label">Confident</div><div class="value">${done}</div>${bar(all.length ? (done / all.length) * 100 : 0, 'done')}</div>
  </div>
  <div class="card">
    <form class="quick-add topic-add" data-form="addTopic">
      <input name="title" placeholder="Add a topic to revise… (start with ! for priority)" autocomplete="off" aria-label="Topic">
      <input name="subject" placeholder="Subject" list="subject-list" autocomplete="off" aria-label="Subject" value="${esc(sub)}">
      <button class="btn primary">Add</button></form>
    <datalist id="subject-list">${subjects.map((x) => `<option value="${esc(x)}">`).join('')}</datalist>
    <div class="toolbar" style="margin:6px 0 0">
      ${tabs('topicFilter', f, [['all', 'All'], ['todo', 'To revise'], ['doing', 'Revising'], ['done', 'Confident'], ['priority', `${starIcon(true)} Priority`]])}
      ${subjects.length ? `<select data-change="topicSubject" aria-label="Subject"><option value="">All subjects</option>${subjects.map((x) => `<option ${x === sub ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select>` : ''}
    </div>
  </div>
  ${list.length ? Object.entries(groups).sort(([a], [b]) => a.localeCompare(b)).map(([g, xs]) => {
    const gd = xs.filter((x) => x.status === 'done').length;
    return `<div class="card" style="margin-top:14px"><h2>${hi('book')} ${esc(g)}<span class="spacer"></span><span class="small muted">${gd}/${xs.length} confident</span></h2>
      ${bar((gd / xs.length) * 100, 'done')}
      <ul class="items" style="margin-top:8px">${xs.sort((a, b) => order[a.status] - order[b.status] || (!!b.important - !!a.important) || (a.due || '9999').localeCompare(b.due || '9999')).map(item).join('')}</ul></div>`;
  }).join('') : `<div class="card" style="margin-top:14px">${empty('layers', all.length ? 'No topics match this filter.' : 'Add the topics you need to revise. Group them by subject, log each revision and mark them confident when you know them well.')}</div>`}
  <p class="hint">Tap <b>Revised</b> each time you go over a topic. Tick the box when you feel confident. Tap a topic to change its status, deadline or notes.</p>`;
}
function topicForm(x) {
  openForm({
    title: x ? 'Edit topic' : 'New topic', values: x || { status: 'todo', subject: state.topicSubject },
    fields: [
      { name: 'title', label: 'Topic', required: true, placeholder: 'e.g. Heart failure management' },
      { name: 'subject', label: 'Subject', half: true, list: 'subject-list', placeholder: 'e.g. Cardiology' },
      { name: 'status', label: 'Status', type: 'select', options: TOPIC_STATUS, half: true },
      { name: 'due', label: 'Revise by (optional)', type: 'date', half: true },
      { name: 'important', label: 'Priority — highlight this topic', type: 'checkbox' },
      { name: 'notes', label: 'Notes / resources', type: 'textarea', rows: 3, placeholder: 'Chapters, links, question banks…' },
    ],
    onSave: (v) => (x ? Object.assign(x, v) : db.study.topics.push({ id: uid(), revisions: [], created: today(), ...v })),
    onDelete: x ? () => { db.study.topics = db.study.topics.filter((t) => t !== x); } : null,
  });
}
const topic = (id) => db.study.topics.find((x) => x.id === id);
Object.assign(actions, {
  newTopic: () => topicForm(null),
  editTopic: (id) => topicForm(topic(id)),
  topicFilter: (k) => { state.topicFilter = k; render(); },
  topicStar: (id) => { const x = topic(id); x.important = !x.important; commit(); },
  topicDone: (id) => { const x = topic(id); x.status = x.status === 'done' ? 'doing' : 'done'; commit(); },
  topicRevised: (id) => {
    const x = topic(id);
    (x.revisions ||= []).push(today());
    if (x.status === 'todo') x.status = 'doing';
    commit(); toast(`Revision logged · ${plural(x.revisions.length, 'time')} so far`);
  },
});
changes.topicSubject = (el) => { state.topicSubject = el.value; render(); };
forms.addTopic = (f) => {
  let title = f.elements.title.value.trim(); if (!title) return;
  const important = title.startsWith('!'); if (important) title = title.slice(1).trim();
  const subject = f.elements.subject.value.trim();
  db.study.topics.push({ id: uid(), title, subject, status: 'todo', important, revisions: [], created: today() });
  commit(); $('form[data-form=addTopic] input[name=title]')?.focus();
};

// ---------- Weekly goals & study hours ----------
function studyWeekly() {
  const ws = state.studyWeek, cur = weekStart(), t = today();
  const goals = [...studyGoals(ws)].sort((a, b) => (a.done - b.done) || (!!b.important - !!a.important));
  const done = goals.filter((g) => g.done).length;
  const leftovers = ws === cur ? Object.entries(db.study.goals).filter(([w]) => w < cur).flatMap(([, gs]) => gs.filter((g) => !g.done)) : [];
  const hours = [0, 1, 2, 3, 4, 5, 6].map((i) => Number(db.study.hours[addDays(ws, i)] || 0));
  const total = hours.reduce((a, b) => a + b, 0), target = Number(db.study.target) || 0;
  const maxH = Math.max(1, ...hours);
  return `
  <div class="toolbar">${weekNav('studyWeek')}<span class="grow"></span>
    <div class="progress-pill">${done}/${goals.length} goals ${bar(goals.length ? (done / goals.length) * 100 : 0, 'done')}</div></div>
  ${leftovers.length ? `<div class="banner">${icon('box')} ${plural(leftovers.length, 'unfinished goal')} from previous weeks.
    <button class="btn sm primary" data-action="carryStudyGoals">Move to this week</button></div>` : ''}
  <div class="grid wide">
    <div class="card"><h2>${hi('target')} Goals for this week</h2>
      <form class="quick-add" data-form="addStudyGoal" data-id="${ws}"><input name="text" placeholder="e.g. Finish 100 MCQs on renal… (start with ! for priority)" autocomplete="off"><button class="btn primary sm">Add</button></form>
      ${goals.length ? `<ul class="items">${goals.map((g) => `<li class="item ${g.done ? 'done' : ''} ${g.important ? 'important' : ''}">
        <input type="checkbox" ${g.done ? 'checked' : ''} data-action="studyGoalDone" data-id="${ws}|${g.id}" aria-label="Done">
        <div class="body clickable" data-action="editStudyGoal" data-id="${ws}|${g.id}"><div class="title">${esc(g.text)}</div></div>
        <div class="acts"><button class="icon-btn star ${g.important ? 'on' : ''}" data-action="studyGoalStar" data-id="${ws}|${g.id}" aria-label="Toggle priority">${starIcon(g.important)}</button>
        <button class="icon-btn" data-action="studyGoalDel" data-id="${ws}|${g.id}" aria-label="Delete">${icon('x')}</button></div></li>`).join('')}</ul>`
        : empty('target', 'Set a few clear goals for this week.')}
    </div>
    <div class="card"><h2>${hi('clock')} Study hours<span class="spacer"></span><span class="small muted">${round1(total)}${target ? ` / ${target}` : ''} h</span></h2>
      ${target ? bar((total / target) * 100, total >= target ? 'done' : '') : ''}
      <div class="chart" style="margin-top:10px">${hours.map((h, i) => `<div class="col" title="${DOW[i]}: ${h} h"><i style="height:${(h / maxH) * 100}%;background:var(--grad)"></i><small>${DOW_SHORT[i][0]}</small></div>`).join('')}</div>
      <div class="hours-grid">${[0, 1, 2, 3, 4, 5, 6].map((i) => { const d = addDays(ws, i); return `<label class="${d === t ? 'is-today' : ''}"><span>${DOW_SHORT[i]}</span>
        <input type="number" min="0" max="24" step="0.5" inputmode="decimal" value="${db.study.hours[d] ?? ''}" placeholder="0" data-change="studyHours" data-id="${d}" aria-label="Hours studied ${DOW[i]}"></label>`; }).join('')}</div>
      <label class="row small muted" style="margin-top:10px">Weekly target
        <input type="number" class="inline-num" min="0" step="1" value="${target || ''}" data-change="studyTarget" aria-label="Weekly target hours"> hours</label>
    </div>
  </div>`;
}
const studyGoal = (id) => { const [ws, gid] = split(id); const list = (db.study.goals[ws] ||= []); return [list, list.find((g) => g.id === gid), ws]; };
Object.assign(actions, {
  newStudyGoal: () => openForm({
    title: 'New weekly goal', values: {},
    fields: [{ name: 'text', label: 'Goal', required: true, placeholder: 'e.g. Revise all of endocrinology' }, { name: 'important', label: 'Priority — highlight this goal', type: 'checkbox' }],
    onSave: (v) => { (db.study.goals[state.studyWeek] ||= []).push({ id: uid(), done: false, ...v }); },
  }),
  editStudyGoal: (id) => {
    const [list, g] = studyGoal(id);
    openForm({
      title: 'Edit goal', values: g,
      fields: [{ name: 'text', label: 'Goal', required: true }, { name: 'important', label: 'Priority — highlight this goal', type: 'checkbox' }],
      onSave: (v) => Object.assign(g, v),
      onDelete: () => list.splice(list.indexOf(g), 1),
    });
  },
  studyGoalDone: (id) => { const [, g] = studyGoal(id); g.done = !g.done; commit(); },
  studyGoalStar: (id) => { const [, g] = studyGoal(id); g.important = !g.important; commit(); },
  studyGoalDel: (id) => { const [list, g] = studyGoal(id); list.splice(list.indexOf(g), 1); commit(); toastUndo('Goal removed', () => list.push(g)); },
  carryStudyGoals: () => {
    const cur = weekStart(); let n = 0;
    for (const [w, gs] of Object.entries(db.study.goals)) {
      if (w >= cur) continue;
      const keep = gs.filter((g) => g.done), move = gs.filter((g) => !g.done);
      (db.study.goals[cur] ||= []).push(...move); db.study.goals[w] = keep; n += move.length;
    }
    commit(); toast(`Moved ${plural(n, 'goal')} to this week`);
  },
});
forms.addStudyGoal = (f) => {
  let text = f.elements.text.value.trim(); if (!text) return;
  const important = text.startsWith('!'); if (important) text = text.slice(1).trim();
  (db.study.goals[f.dataset.id] ||= []).push({ id: uid(), text, important, done: false });
  commit(); $('form[data-form=addStudyGoal] input')?.focus();
};
Object.assign(changes, {
  studyHours: (el) => { const v = el.value === '' ? null : Math.max(0, Number(el.value)); if (v == null) delete db.study.hours[el.dataset.id]; else db.study.hours[el.dataset.id] = v; commit(); },
  studyTarget: (el) => { db.study.target = Math.max(0, Number(el.value) || 0); commit(); },
});
