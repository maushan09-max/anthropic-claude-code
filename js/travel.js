'use strict';
/* Travel plans: trips with day-by-day itineraries and packing lists. */

const TRIP_TYPES = [['flight', 'Flight'], ['stay', 'Stay'], ['transport', 'Transport'], ['activity', 'Activity'], ['food', 'Food'], ['other', 'Other']];
const TRIP_ICONS = { flight: 'plane', stay: 'bed', transport: 'car', activity: 'ticket', food: 'utensils', other: 'note' };
const typeIcon = (t) => icon(TRIP_ICONS[t] || 'note');
const typeLabel = (t) => (TRIP_TYPES.find((x) => x[0] === t) || TRIP_TYPES[5])[1];
const tripDates = (tr) => (tr.start ? `${fmtDate(tr.start, { day: 'numeric', month: 'short' })}${tr.end && tr.end !== tr.start ? ' – ' + fmtDate(tr.end, { day: 'numeric', month: 'short', year: 'numeric' }) : ''}` : 'Dates not set');
function tripCountdown(tr) {
  const t = today();
  if (!tr.start) return '';
  if (tr.start > t) { const n = daysBetween(t, tr.start); return `<span class="chip trip-chip">${n === 1 ? 'Tomorrow' : `In ${n} days`}</span>`; }
  if ((tr.end || tr.start) >= t) return `<span class="chip trip-chip now">Happening now · day ${daysBetween(tr.start, t) + 1}</span>`;
  return '<span class="chip">Past</span>';
}

views.travel = () => {
  const tr = state.tripId && find('trips', state.tripId);
  return tr ? tripDetail(tr) : tripList();
};
TOP_ACTIONS.travel = () => (state.tripId && find('trips', state.tripId) ? ['newTripItem', '+ Plan', `${state.tripId}|`] : ['newTrip', '+ Trip']);

function tripList() {
  if (!db.trips.length) return `<div class="card">${empty('plane', 'Plan your next trip — flights, stays, activities and a packing list, all in one itinerary.<br><br><button class="btn primary" data-action="newTrip">+ New trip</button>')}</div>`;
  const t = today();
  const upcoming = db.trips.filter((x) => (x.end || x.start || '9999') >= t).sort((a, b) => (a.start || '9999').localeCompare(b.start || '9999'));
  const past = db.trips.filter((x) => (x.end || x.start || '9999') < t).sort((a, b) => b.start.localeCompare(a.start));
  const card = (x) => {
    const packed = (x.packing || []).filter((p) => p.done).length;
    return `<div class="card trip-card clickable" data-action="openTrip" data-id="${x.id}">
      <div class="row"><b class="grow" style="font-size:17px">${esc(x.name)}</b>${tripCountdown(x)}</div>
      <div class="muted small">${icon('pin')} ${esc(x.destination || '—')} · ${esc(tripDates(x))}</div>
      <div class="small muted" style="margin-top:6px">${plural((x.items || []).length, 'plan')}${(x.packing || []).length ? ` · packed ${packed}/${x.packing.length}` : ''}</div>
    </div>`;
  };
  return `${upcoming.length ? `<div class="section-title">Upcoming</div><div class="grid">${upcoming.map(card).join('')}</div>` : ''}
    ${past.length ? `<div class="section-title">Past trips</div><div class="grid">${past.map(card).join('')}</div>` : ''}`;
}

function tripDetail(tr) {
  const items = tr.items || [];
  const days = [];
  if (tr.start) { const end = tr.end && tr.end >= tr.start ? tr.end : tr.start; for (let d = tr.start, i = 0; d <= end && i < 90; d = addDays(d, 1), i++) days.push(d); }
  const byTime = (a, b) => (a.time || '99').localeCompare(b.time || '99');
  const itemHtml = (it) => `<li class="item clickable ${it.important ? 'important' : ''}" data-action="editTripItem" data-id="${tr.id}|${it.id}">
    <span class="hicon">${typeIcon(it.type)}</span>
    <div class="body"><div class="title">${esc(it.title)}</div>
      <div class="meta">${it.time ? `<span>${icon('clock')} ${esc(fmtTime(it.time))}${it.end ? '–' + esc(fmtTime(it.end)) : ''}</span>` : ''}${it.location ? `<span>${icon('pin')} ${esc(it.location)}</span>` : ''}
      ${it.ref ? `<span>${icon('ticket')} ${esc(it.ref)}</span>` : ''}${hasReminder(it) ? `<span>${icon('bell')}</span>` : ''}${it.cost ? `<span>${icon('cash')} ${esc(it.cost)}</span>` : ''}</div>
      ${it.notes ? `<div class="small muted pre">${esc(it.notes)}</div>` : ''}</div></li>`;
  const unscheduled = items.filter((it) => !it.date || !days.includes(it.date)).sort((a, b) => (a.date || '').localeCompare(b.date || '') || byTime(a, b));
  const packed = (tr.packing || []).filter((p) => p.done).length;
  return `
  <div class="toolbar"><button class="btn" data-action="closeTrip">${icon('arrowL')} All trips</button><span class="grow"></span>
    <button class="btn sm" data-action="exportTrip" data-id="${tr.id}">${icon('calPlus')} Add itinerary to phone calendar</button>
    <button class="btn sm" data-action="editTrip" data-id="${tr.id}">${icon('edit')} Edit trip</button></div>
  <div class="card trip-hero">
    <div class="row"><div class="grow"><div style="font-size:22px;font-weight:700">${esc(tr.name)}</div>
      <div class="muted">${icon('pin')} ${esc(tr.destination || '—')} · ${esc(tripDates(tr))}${days.length > 1 ? ` · ${plural(days.length - 1, 'night')}` : ''}</div></div>${tripCountdown(tr)}</div>
    ${tr.notes ? `<div class="pre small" style="margin-top:10px">${esc(tr.notes)}</div>` : ''}
  </div>
  <div class="trip-layout">
    <div>
      ${days.map((d, i) => { const list = items.filter((it) => it.date === d).sort(byTime); return `<div class="card itin-day ${d === today() ? 'is-today' : ''}">
        <h3>Day ${i + 1} <span class="muted small">${esc(fmtDate(d, { weekday: 'long', day: 'numeric', month: 'short' }))}</span><span class="spacer"></span>
          <button class="btn sm" data-action="newTripItem" data-id="${tr.id}|${d}">+ Add</button></h3>
        ${list.length ? `<ul class="items">${list.map(itemHtml).join('')}</ul>` : '<div class="muted small">Nothing planned yet.</div>'}</div>`; }).join('')}
      ${unscheduled.length || !days.length ? `<div class="card itin-day"><h3>${days.length ? 'Other plans' : 'Plans'}<span class="spacer"></span><button class="btn sm" data-action="newTripItem" data-id="${tr.id}|">+ Add</button></h3>
        ${unscheduled.length ? `<ul class="items">${unscheduled.map(itemHtml).join('')}</ul>` : '<div class="muted small">Set trip dates to get a day-by-day itinerary.</div>'}</div>` : ''}
    </div>
    <div class="card packing"><h3>${hi('luggage')} Packing list<span class="spacer"></span><span class="small muted">${packed}/${(tr.packing || []).length}</span></h3>
      <form class="quick-add" data-form="addPack" data-id="${tr.id}"><input name="text" placeholder="Passport, charger…" autocomplete="off"><button class="btn sm">Add</button></form>
      <ul class="items">${(tr.packing || []).slice().sort((a, b) => a.done - b.done).map((p) => `<li class="item ${p.done ? 'done' : ''}">
        <input type="checkbox" ${p.done ? 'checked' : ''} data-action="togglePack" data-id="${tr.id}|${p.id}"><div class="body title">${esc(p.text)}</div>
        <div class="acts"><button class="icon-btn" data-action="delPack" data-id="${tr.id}|${p.id}" aria-label="Remove">${icon('x')}</button></div></li>`).join('')}</ul>
      ${!(tr.packing || []).length ? `<button class="btn sm ghost" data-action="packTemplate" data-id="${tr.id}">Use a starter list</button>` : ''}
    </div>
  </div>`;
}

function tripForm(tr) {
  openForm({
    title: tr ? 'Edit trip' : 'New trip', values: tr || {},
    fields: [
      { name: 'name', label: 'Trip name', required: true, placeholder: 'Colombo getaway' },
      { name: 'destination', label: 'Destination', placeholder: 'City, country' },
      { name: 'start', label: 'Start date', type: 'date', half: true },
      { name: 'end', label: 'End date', type: 'date', half: true },
      { name: 'notes', label: 'Notes', type: 'textarea', rows: 4, placeholder: 'Hotel address, visa info, emergency contacts, budget…' },
    ],
    onSave: (v) => { if (tr) Object.assign(tr, v); else { const id = uid(); db.trips.push({ id, items: [], packing: [], ...v }); state.tripId = id; } },
    onDelete: tr ? () => { remove('trips', tr.id); state.tripId = null; } : null,
  });
}
function tripItemForm(tr, it, date) {
  openForm({
    title: it ? 'Edit plan' : 'Add to itinerary', values: { type: 'activity', date: date || tr.start || '', remind: '', ...it },
    fields: [
      { name: 'type', label: 'Type', type: 'select', options: TRIP_TYPES, half: true },
      { name: 'date', label: 'Date', type: 'date', half: true },
      { name: 'title', label: 'What', required: true, placeholder: 'Flight MLE to CMB, Hotel check-in, City tour…' },
      { name: 'time', label: 'Start time', type: 'time', half: true },
      { name: 'end', label: 'End time', type: 'time', half: true },
      { name: 'location', label: 'Location / address', half: true },
      { name: 'ref', label: 'Booking ref / flight no.', half: true },
      { name: 'cost', label: 'Cost', half: true, placeholder: 'USD 120' },
      { name: 'remind', label: 'Reminder', type: 'select', options: REMINDS, half: true },
      { name: 'important', label: 'Priority — highlight this plan', type: 'checkbox' },
      { name: 'notes', label: 'Notes', type: 'textarea', rows: 3 },
    ],
    onSave: (v) => { if (hasReminder(v)) askNotify(); if (it) Object.assign(it, v); else (tr.items ||= []).push({ id: uid(), ...v }); },
    onDelete: it ? () => { tr.items = tr.items.filter((x) => x !== it); } : null,
    extra: [{ label: 'Add to phone calendar', icon: 'calPlus', onClick: (v) => (v.date ? downloadIcs([{ item: { ...it, ...v, id: it?.id || uid() }, date: v.date }]) : toast('Pick a date first')) }],
  });
}
const PACK_STARTER = ['Passport / ID', 'Tickets & bookings', 'Phone + charger', 'Power bank', 'Adapter', 'Medications', 'Toiletries', 'Clothes', 'Sunscreen', 'Cash / cards', 'Travel insurance'];
const tripSub = (id) => { const [tid, sid] = split(id); const tr = find('trips', tid); return [tr, sid]; };
Object.assign(actions, {
  newTrip: () => tripForm(null),
  editTrip: (id) => tripForm(find('trips', id)),
  openTrip: (id) => { state.tripId = id; if (location.hash !== '#/travel') location.hash = '#/travel'; else render(); window.scrollTo(0, 0); },
  closeTrip: () => { state.tripId = null; render(); },
  newTripItem: (id) => { const [tr, d] = tripSub(id); tripItemForm(tr, null, d); },
  editTripItem: (id) => { const [tr, iid] = tripSub(id); tripItemForm(tr, tr.items.find((x) => x.id === iid)); },
  exportTrip: (id) => {
    const tr = find('trips', id), list = (tr.items || []).filter((x) => x.date).map((x) => ({ item: { ...x, title: `${typeLabel(x.type)}: ${x.title}` }, date: x.date }));
    list.length ? downloadIcs(list, tr.name) : toast('Add dated plans first');
  },
  togglePack: (id) => { const [tr, pid] = tripSub(id); const p = tr.packing.find((x) => x.id === pid); p.done = !p.done; commit(); },
  delPack: (id) => { const [tr, pid] = tripSub(id); tr.packing = tr.packing.filter((x) => x.id !== pid); commit(); },
  packTemplate: (id) => { const tr = find('trips', id); tr.packing = PACK_STARTER.map((text) => ({ id: uid(), text, done: false })); commit(); },
});
forms.addPack = (f) => {
  const text = f.elements.text.value.trim(); if (!text) return;
  (find('trips', f.dataset.id).packing ||= []).push({ id: uid(), text, done: false });
  commit(); $(`form[data-form=addPack][data-id="${f.dataset.id}"] input`)?.focus();
};
