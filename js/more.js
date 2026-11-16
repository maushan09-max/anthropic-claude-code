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
    ['Duty roster weeks', Object.keys(db.roster).length], ['Study topics', db.study.topics.length], ['Trips', db.trips.length], ['Journal entries', db.journal.length], ['Notes', db.notes.length]];
  return `<div class="grid">
    <div class="card"><h2>${hi('sliders')} Profile</h2>
      <label class="field"><span>Your name</span><input value="${esc(s.name)}" data-change="setting" data-id="name" placeholder="For your greeting"></label>
      <div class="form-grid" style="margin-top:10px">
        <label class="field"><span>Spending currency</span><input value="${esc(s.currency)}" data-change="setting" data-id="currency" maxlength="4"></label>
        <label class="field"><span>1 USD in MVR</span><input type="number" step="0.01" value="${esc(s.usdRate)}" data-change="setting" data-id="usdRate"></label>
        <label class="field"><span>Theme</span><select data-change="setting" data-id="theme">${[['auto', 'System'], ['light', 'Light'], ['dark', 'Dark']].map(([v, l]) => `<option value="${v}" ${s.theme === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      </div></div>
    ${gdriveSettingsCard()}
    <div class="card"><h2>${hi('sliders')} Menu sections</h2>
      <p class="small muted">Untick sections you don’t use to hide them from the menu. Your data in them is kept.</p>
      <div class="menu-toggles">${NAV.flatMap((g) => g[1]).filter(([k]) => !ALWAYS_SHOWN.includes(k)).map(([k, label, ic]) => `<label class="check"><input type="checkbox" ${!(s.hidden || []).includes(k) ? 'checked' : ''} data-change="toggleSection" data-id="${k}"> ${icon(ic)} ${label}</label>`).join('')}</div></div>
    ${rosterAiSettingsCard()}
    <div class="card"><h2>${hi('bell')} Reminders</h2>
      <p class="small muted">LifeOS shows reminders while it is open (or open in a background tab). For reminders that always reach you, even when the app is closed,
        use <b>Add to phone calendar</b> on any task or event — your phone's calendar app will alert you.</p>
      <div class="row"><span class="grow small">Browser notifications: <b>${{ granted: 'On', denied: 'Blocked in browser settings', default: 'Not enabled yet', unsupported: 'Not supported here' }[perm]}</b></span>
        ${perm === 'default' ? '<button class="btn sm primary" data-action="enableNotify">Enable</button>' : ''}
        ${perm === 'granted' ? '<button class="btn sm" data-action="testNotify">Test</button>' : ''}</div></div>
    <div class="card"><h2>${hi('download')} Backup & restore</h2>
      <div class="kv"><span>Last backup</span><b class="${!s.lastBackup || daysBetween(s.lastBackup, today()) > 14 ? 'warn' : ''}">${s.lastBackup ? esc(fmtDate(s.lastBackup, { day: 'numeric', month: 'short', year: 'numeric' })) + (s.lastBackup === today() ? ' (today)' : ` (${plural(daysBetween(s.lastBackup, today()), 'day')} ago)`) : 'Never'}</b></div>
      <div class="kv"><span>Storage</span><b id="storage-info" class="small">Checking…</b></div>
      <p class="small muted">Your data is saved only on this device — not online. A backup is a single file with everything except roster photos and your API key. Save it to Files, iCloud Drive or Google Drive, or email it to yourself. To move to a new phone, install LifeOS there and use Import backup.</p>
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
  exportData: async () => {
    const text = JSON.stringify(db, null, 2), name = `lifeos-backup-${today()}.json`;
    const mark = () => { db.settings.lastBackup = today(); db.settings.backupSnooze = ''; commit(); };
    // On phones, open the share sheet so the file can go straight to Files / iCloud Drive / Google Drive / email
    try {
      const file = new File([text], name, { type: 'application/json' });
      if (matchMedia('(pointer: coarse)').matches && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'LifeOS backup' });
        mark(); toast('Backup saved'); return;
      }
    } catch (e) { if (e?.name === 'AbortError') return; }
    download(text, name, 'application/json'); mark();
    toast('Backup downloaded — keep it somewhere safe, like Files, iCloud Drive, Google Drive or email', null, null, 6000);
  },
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
        db = migrate(data); if ($('#modal').open) $('#modal').close(); commit(); toast('Backup restored');
      } catch (e) { toast('Import failed: ' + e.message); }
    };
    r.readAsText(file);
  },
});

// ---------- Storage status (Settings) ----------
afterRender.push((v) => {
  if (v !== 'settings') return;
  const el = $('#storage-info');
  if (!el) return;
  const kb = Math.max(1, Math.round(new Blob([JSON.stringify(db)]).size / 1024));
  const size = kb < 1024 ? `${kb} KB` : `${(kb / 1024).toFixed(1)} MB`;
  const done = (p) => { if (el.isConnected) el.textContent = `${size} · ${p ? 'kept permanently' : 'may be cleared if the phone runs low on space'}`; };
  navigator.storage?.persisted ? navigator.storage.persisted().then(done, () => done(false)) : done(false);
});

changes.toggleSection = (el) => { const h = new Set(db.settings.hidden || []); if (el.checked) h.delete(el.dataset.id); else h.add(el.dataset.id); db.settings.hidden = [...h]; commit(); };
