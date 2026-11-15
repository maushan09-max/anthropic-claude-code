'use strict';
/* Travel plans: each trip has Flights & trains, Hotels, Itinerary, Packing list, and Budget & expenses. */

const TRIP_CURRENCIES = ['MVR', 'USD', 'SAR', 'CNY', 'AED', 'EUR', 'GBP', 'INR', 'LKR', 'MYR', 'SGD', 'THB', 'TRY', 'JPY'];
const LEG_MODES = [['flight', 'Flight'], ['train', 'Train'], ['bus', 'Bus'], ['ferry', 'Ferry'], ['car', 'Car / transfer']];
const LEG_ICONS = { flight: 'plane', train: 'train', bus: 'car', ferry: 'ferry', car: 'car' };
const ITIN_TYPES = [['activity', 'Activity'], ['visit', 'Visit / Ziyarat'], ['food', 'Food'], ['transport', 'Local transport'], ['shopping', 'Shopping'], ['other', 'Other']];
const ITIN_ICONS = { activity: 'ticket', visit: 'pin', food: 'utensils', transport: 'car', shopping: 'bag', other: 'note' };
const EXPENSE_CATS_TRIP = ['Flights & transport', 'Hotels', 'Food', 'Local transport', 'Activities', 'Shopping', 'Gifts', 'Visa & fees', 'Other'];
const TRIP_TABS = [['flights', 'plane', 'Flights & trains'], ['hotels', 'bed', 'Hotels'], ['itinerary', 'calWeek', 'Itinerary'], ['packing', 'luggage', 'Packing list'], ['budget', 'wallet', 'Budget']];
state.tripTab = 'flights';

const tripStartKey = (tr) => tr.start || (tr.month ? tr.month + '-01' : '');
const tripEndKey = (tr) => tr.end || tr.start || (tr.month ? tr.month + '-31' : '');
const nextTrip = () => db.trips.filter((x) => tripEndKey(x) >= today()).sort((a, b) => (tripStartKey(a) || '9999').localeCompare(tripStartKey(b) || '9999'))[0];
const tripDates = (tr) => (tr.start ? `${fmtDate(tr.start, { day: 'numeric', month: 'short' })}${tr.end && tr.end !== tr.start ? ' – ' + fmtDate(tr.end, { day: 'numeric', month: 'short', year: 'numeric' }) : ''}`
  : tr.month ? fmtMonth(tr.month) : 'Dates not set');
function tripCountdown(tr) {
  const t = today(), st = tripStartKey(tr);
  if (!st) return '';
  if (st > t) {
    const n = daysBetween(t, st);
    const label = !tr.start ? (n > 45 ? `In about ${Math.round(n / 30)} months` : `In about ${Math.max(1, Math.round(n / 7))} weeks`) : n === 1 ? 'Tomorrow' : `In ${n} days`;
    return `<span class="chip trip-chip">${label}</span>`;
  }
  if (tripEndKey(tr) >= t) return `<span class="chip trip-chip now">Happening now${tr.start ? ` · day ${daysBetween(tr.start, t) + 1}` : ''}</span>`;
  return '<span class="chip">Past</span>';
}
const legCost = (tr) => tr.legs.reduce((s, l) => s + (Number(l.cost) || 0), 0);
const hotelCost = (tr) => tr.hotels.reduce((s, h) => s + (Number(h.cost) || 0), 0);
const expenseTotal = (tr) => tr.expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
const nights = (h) => (h.checkin && h.checkout && h.checkout > h.checkin ? daysBetween(h.checkin, h.checkout) : 0);
const splitDetail = (text) => { const m = text.match(/^(.*?)\s*\((.*)\)\s*$/); return m ? [m[1], m[2]] : [text, '']; };
const packCats = (tr) => { const order = (db.settings.packTemplate || PACK_TEMPLATE).map((c) => c[0]); return [...new Set([...order, ...tr.packing.map((p) => p.cat)])].filter((c) => order.includes(c) || tr.packing.some((p) => p.cat === c)); };

views.travel = () => {
  const tr = state.tripId && find('trips', state.tripId);
  return tr ? tripDetail(tr) : tripList();
};
TOP_ACTIONS.travel = () => {
  const tr = state.tripId && find('trips', state.tripId);
  if (!tr) return ['newTrip', '+ Trip'];
  return { flights: ['newLeg', '+ Flight / train', tr.id], hotels: ['newHotel', '+ Hotel', tr.id], itinerary: ['newTripItem', '+ Plan', `${tr.id}|`], budget: ['newExpense', '+ Expense', tr.id] }[state.tripTab];
};

// ---------- Trip list ----------
function tripList() {
  if (!db.trips.length) return `<div class="card">${empty('plane', 'Plan your next trip — flights, hotels, itinerary, packing and budget in one place.<br><br><button class="btn primary" data-action="newTrip">+ New trip</button>')}</div>`;
  const t = today();
  const upcoming = db.trips.filter((x) => (tripEndKey(x) || '9999') >= t).sort((a, b) => (tripStartKey(a) || '9999').localeCompare(tripStartKey(b) || '9999'));
  const past = db.trips.filter((x) => tripEndKey(x) && tripEndKey(x) < t).sort((a, b) => tripStartKey(b).localeCompare(tripStartKey(a)));
  const card = (x) => {
    const packed = x.packing.filter((p) => p.done).length;
    const spent = legCost(x) + hotelCost(x) + expenseTotal(x);
    const firstLeg = [...x.legs].sort((a, b) => (a.departDate + a.departTime).localeCompare(b.departDate + b.departTime))[0];
    return `<div class="card trip-card clickable" data-action="openTrip" data-id="${x.id}">
      <div class="row"><span class="hicon">${icon('plane')}</span><b class="grow" style="font-size:18px">${esc(x.name)}</b>${tripCountdown(x)}</div>
      <div class="muted small" style="margin-top:4px">${icon('pin')} ${esc(x.destination || '—')} · ${esc(tripDates(x))}</div>
      <div class="trip-facts">
        <span>${icon('plane')} ${x.legs.length ? (firstLeg?.departDate ? `${esc(firstLeg.from || '')} → ${esc(firstLeg.to || '')} · ${esc(fmtDate(firstLeg.departDate, { day: 'numeric', month: 'short' }))}` : plural(x.legs.length, 'journey')) : 'No flights yet'}</span>
        <span>${icon('bed')} ${x.hotels.length ? plural(x.hotels.length, 'hotel') : 'No hotels yet'}</span>
        <span>${icon('luggage')} Packed ${packed}/${x.packing.length}</span>
        <span>${icon('wallet')} ${x.budget ? `${fmtCur(spent, x.currency)} of ${fmtCur(x.budget, x.currency)}` : spent ? fmtCur(spent, x.currency) : 'No budget set'}</span>
      </div>
      ${x.packing.length ? bar((packed / x.packing.length) * 100, packed === x.packing.length ? 'done' : '') : ''}
    </div>`;
  };
  return `${upcoming.length ? `<div class="section-title">Upcoming trips</div><div class="grid wide">${upcoming.map(card).join('')}</div>` : ''}
    ${past.length ? `<div class="section-title">Past trips</div><div class="grid wide">${past.map(card).join('')}</div>` : ''}`;
}

// ---------- Trip detail ----------
function tripDetail(tr) {
  const body = { flights: tripFlights, hotels: tripHotels, itinerary: tripItinerary, packing: tripPacking, budget: tripBudget }[state.tripTab] || tripFlights;
  return `
  <div class="toolbar"><button class="btn" data-action="closeTrip">${icon('arrowL')} All trips</button><span class="grow"></span>
    <button class="btn sm" data-action="exportTrip" data-id="${tr.id}">${icon('calPlus')} Add to phone calendar</button>
    <button class="btn sm" data-action="editTrip" data-id="${tr.id}">${icon('edit')} Edit trip</button></div>
  <div class="card trip-hero">
    <div class="row"><div class="grow"><div style="font-size:22px;font-weight:700">${esc(tr.name)}</div>
      <div class="muted">${icon('pin')} ${esc(tr.destination || '—')} · ${esc(tripDates(tr))}${tr.start && tr.end && tr.end > tr.start ? ` · ${plural(daysBetween(tr.start, tr.end), 'night')}` : ''}</div></div>${tripCountdown(tr)}</div>
    ${tr.notes ? `<div class="pre small" style="margin-top:10px">${esc(tr.notes)}</div>` : ''}
  </div>
  <div style="margin:14px 0">${tabs('tripTab', state.tripTab, TRIP_TABS.map(([k, ic, l]) => [k, `${icon(ic)} ${l}`]))}</div>
  ${body(tr)}`;
}
actions.tripTab = (k) => { state.tripTab = k; render(); };

// Flights & trains
function tripFlights(tr) {
  const legs = [...tr.legs].sort((a, b) => ((a.departDate || '9999') + a.departTime).localeCompare((b.departDate || '9999') + b.departTime));
  if (!legs.length) return `<div class="card">${empty('plane', `Add your flights or trains for ${esc(tr.name)} — times, airports and booking references.<br><br><button class="btn primary" data-action="newLeg" data-id="${tr.id}">+ Add flight / train</button>`)}</div>`;
  const when = (d, tm) => (d ? `${fmtDate(d, { weekday: 'short', day: 'numeric', month: 'short' })}${tm ? ' · ' + fmtTime(tm) : ''}` : tm ? fmtTime(tm) : 'Time not set');
  return `<div class="grid wide">${legs.map((l) => `<div class="card leg clickable" data-action="editLeg" data-id="${tr.id}|${l.id}">
    <div class="row small muted"><span class="hicon">${icon(LEG_ICONS[l.mode] || 'plane')}</span><span class="grow">${esc((LEG_MODES.find((m) => m[0] === l.mode) || LEG_MODES[0])[1])}${l.carrier ? ' · ' + esc(l.carrier) : ''}${l.number ? ' · <b>' + esc(l.number) + '</b>' : ''}</span>${hasReminder(l) ? icon('bell') : ''}</div>
    <div class="leg-route">
      <div><div class="leg-place">${esc(l.from || '—')}</div><div class="small muted">Departs</div><div class="small">${esc(when(l.departDate, l.departTime))}</div></div>
      <div class="leg-arrow">${icon('arrowR')}</div>
      <div style="text-align:right"><div class="leg-place">${esc(l.to || '—')}</div><div class="small muted">Arrives</div><div class="small">${esc(when(l.arriveDate || l.departDate, l.arriveTime))}</div></div>
    </div>
    <div class="meta small muted">${l.ref ? `<span>${icon('ticket')} Ref ${esc(l.ref)}</span>` : ''}${l.seat ? `<span>Seat ${esc(l.seat)}</span>` : ''}${l.cost ? `<span>${icon('cash')} ${fmtCur(l.cost, tr.currency)}</span>` : ''}</div>
    ${l.notes ? `<div class="small muted pre">${esc(l.notes)}</div>` : ''}
  </div>`).join('')}</div>`;
}
function legForm(tr, l) {
  openForm({
    title: l ? 'Edit journey' : 'Add flight / train', values: l || { mode: 'flight', remind: '' },
    fields: [
      { name: 'mode', label: 'Type', type: 'select', options: LEG_MODES, half: true },
      { name: 'carrier', label: 'Airline / operator', half: true, placeholder: 'Saudia, Air China…' },
      { name: 'from', label: 'From (airport / station)', half: true, placeholder: 'MLE – Velana Intl' },
      { name: 'to', label: 'To (airport / station)', half: true, placeholder: 'JED – King Abdulaziz Intl' },
      { name: 'departDate', label: 'Departure date', type: 'date', half: true },
      { name: 'departTime', label: 'Departure time', type: 'time', half: true },
      { name: 'arriveDate', label: 'Arrival date', type: 'date', half: true },
      { name: 'arriveTime', label: 'Arrival time (local)', type: 'time', half: true },
      { name: 'number', label: 'Flight / train no.', half: true, placeholder: 'SV 3xx' },
      { name: 'ref', label: 'Booking reference', half: true },
      { name: 'seat', label: 'Seat', half: true },
      { name: 'cost', label: `Cost (${tr.currency})`, type: 'number', step: '0.01', min: 0, half: true },
      { name: 'remind', label: 'Reminder', type: 'select', options: REMINDS, half: true },
      { name: 'notes', label: 'Notes', type: 'textarea', rows: 2, placeholder: 'Terminal, baggage allowance, check-in time…' },
    ],
    onSave: (v) => { if (hasReminder(v)) askNotify(); if (!v.arriveDate) v.arriveDate = v.departDate; if (l) Object.assign(l, v); else tr.legs.push({ id: uid(), ...v }); },
    onDelete: l ? () => { tr.legs = tr.legs.filter((x) => x !== l); } : null,
  });
}

// Hotels
function tripHotels(tr) {
  const hs = [...tr.hotels].sort((a, b) => (a.checkin || '9999').localeCompare(b.checkin || '9999'));
  if (!hs.length) return `<div class="card">${empty('bed', `Add your hotel bookings for ${esc(tr.name)}.<br><br><button class="btn primary" data-action="newHotel" data-id="${tr.id}">+ Add hotel</button>`)}</div>`;
  return `<div class="grid wide">${hs.map((h) => `<div class="card clickable" data-action="editHotel" data-id="${tr.id}|${h.id}">
    <h3>${hi('bed')} ${esc(h.name || 'Hotel')}${nights(h) ? `<span class="spacer"></span><span class="chip">${plural(nights(h), 'night')}</span>` : ''}</h3>
    ${h.city ? `<div class="small muted">${icon('pin')} ${esc(h.city)}</div>` : ''}
    <div class="kv"><span>Check-in</span><b>${h.checkin ? esc(fmtDate(h.checkin, { weekday: 'short', day: 'numeric', month: 'short' })) : '—'}${h.checkinTime ? ' · ' + esc(fmtTime(h.checkinTime)) : ''}</b></div>
    <div class="kv"><span>Check-out</span><b>${h.checkout ? esc(fmtDate(h.checkout, { weekday: 'short', day: 'numeric', month: 'short' })) : '—'}${h.checkoutTime ? ' · ' + esc(fmtTime(h.checkoutTime)) : ''}</b></div>
    ${h.ref ? `<div class="kv"><span>Booking ref</span><b>${esc(h.ref)}</b></div>` : ''}
    ${h.cost ? `<div class="kv"><span>Cost</span><b>${fmtCur(h.cost, tr.currency)}</b></div>` : ''}
    ${h.address ? `<div class="small muted pre" style="margin-top:6px">${esc(h.address)}</div>` : ''}
    ${h.phone ? `<div class="small" style="margin-top:4px"><a href="tel:${esc(h.phone.replace(/[^\d+]/g, ''))}" onclick="event.stopPropagation()">${esc(h.phone)}</a></div>` : ''}
    ${h.notes ? `<div class="small muted pre" style="margin-top:4px">${esc(h.notes)}</div>` : ''}
  </div>`).join('')}</div>`;
}
function hotelForm(tr, h) {
  openForm({
    title: h ? 'Edit hotel' : 'Add hotel', values: h || {},
    fields: [
      { name: 'name', label: 'Hotel', required: true, placeholder: 'Hotel name' },
      { name: 'city', label: 'City / area', half: true, placeholder: 'Makkah' },
      { name: 'phone', label: 'Phone', half: true, type: 'tel' },
      { name: 'checkin', label: 'Check-in date', type: 'date', half: true },
      { name: 'checkinTime', label: 'Check-in time', type: 'time', half: true },
      { name: 'checkout', label: 'Check-out date', type: 'date', half: true },
      { name: 'checkoutTime', label: 'Check-out time', type: 'time', half: true },
      { name: 'ref', label: 'Booking reference', half: true },
      { name: 'cost', label: `Total cost (${tr.currency})`, type: 'number', step: '0.01', min: 0, half: true },
      { name: 'address', label: 'Address', type: 'textarea', rows: 2 },
      { name: 'notes', label: 'Notes', type: 'textarea', rows: 2, placeholder: 'Room type, breakfast, distance to Haram…' },
    ],
    onSave: (v) => (h ? Object.assign(h, v) : tr.hotels.push({ id: uid(), ...v })),
    onDelete: h ? () => { tr.hotels = tr.hotels.filter((x) => x !== h); } : null,
  });
}

// Itinerary
function tripItinerary(tr) {
  const days = [];
  if (tr.start) { const end = tr.end && tr.end >= tr.start ? tr.end : tr.start; for (let d = tr.start, i = 0; d <= end && i < 90; d = addDays(d, 1), i++) days.push(d); }
  const byTime = (a, b) => (a.time || '99').localeCompare(b.time || '99');
  const itemHtml = (it) => `<li class="item clickable ${it.important ? 'important' : ''}" data-action="editTripItem" data-id="${tr.id}|${it.id}">
    <span class="hicon">${icon(ITIN_ICONS[it.type] || 'note')}</span>
    <div class="body"><div class="title">${esc(it.title)}</div>
      <div class="meta">${it.time ? `<span>${icon('clock')} ${esc(fmtTime(it.time))}${it.end ? '–' + esc(fmtTime(it.end)) : ''}</span>` : ''}${it.location ? `<span>${icon('pin')} ${esc(it.location)}</span>` : ''}
      ${it.ref ? `<span>${icon('ticket')} ${esc(it.ref)}</span>` : ''}${hasReminder(it) ? `<span>${icon('bell')}</span>` : ''}${it.cost ? `<span>${icon('cash')} ${esc(it.cost)}</span>` : ''}</div>
      ${it.notes ? `<div class="small muted pre">${esc(it.notes)}</div>` : ''}</div></li>`;
  const fixed = (d) => [
    ...tr.legs.filter((l) => l.departDate === d).map((l) => `<div class="itin-fixed">${icon(LEG_ICONS[l.mode] || 'plane')} ${l.departTime ? esc(fmtTime(l.departTime)) + ' · ' : ''}${esc(l.from || '')} → ${esc(l.to || '')}${l.number ? ' · ' + esc(l.number) : ''}</div>`),
    ...tr.legs.filter((l) => l.arriveDate === d && l.departDate !== d).map((l) => `<div class="itin-fixed">${icon(LEG_ICONS[l.mode] || 'plane')} Arrive ${esc(l.to || '')}${l.arriveTime ? ' · ' + esc(fmtTime(l.arriveTime)) : ''}</div>`),
    ...tr.hotels.filter((h) => h.checkin === d).map((h) => `<div class="itin-fixed">${icon('bed')} Check in · ${esc(h.name)}${h.checkinTime ? ' · ' + esc(fmtTime(h.checkinTime)) : ''}</div>`),
    ...tr.hotels.filter((h) => h.checkout === d).map((h) => `<div class="itin-fixed">${icon('bed')} Check out · ${esc(h.name)}${h.checkoutTime ? ' · ' + esc(fmtTime(h.checkoutTime)) : ''}</div>`),
  ].join('');
  const other = tr.items.filter((it) => !it.date || !days.includes(it.date)).sort((a, b) => (a.date || '').localeCompare(b.date || '') || byTime(a, b));
  return `
    ${!days.length ? `<div class="banner">${icon('calendar')} Set the trip’s start and end dates (Edit trip) to plan it day by day.</div>` : ''}
    <div class="itin-list">
    ${days.map((d, i) => { const list = tr.items.filter((it) => it.date === d).sort(byTime); const fx = fixed(d); return `<div class="card itin-day ${d === today() ? 'is-today' : ''}">
      <h3>Day ${i + 1} <span class="muted small">${esc(fmtDate(d, { weekday: 'long', day: 'numeric', month: 'short' }))}</span><span class="spacer"></span>
        <button class="btn sm" data-action="newTripItem" data-id="${tr.id}|${d}">+ Add</button></h3>
      ${fx}
      ${list.length ? `<ul class="items">${list.map(itemHtml).join('')}</ul>` : !fx ? '<div class="muted small">Nothing planned yet.</div>' : ''}</div>`; }).join('')}
    ${other.length || !days.length ? `<div class="card itin-day"><h3>${days.length ? 'Other plans' : 'Plans & ideas'}<span class="spacer"></span><button class="btn sm" data-action="newTripItem" data-id="${tr.id}|">+ Add</button></h3>
      ${other.length ? `<ul class="items">${other.map(itemHtml).join('')}</ul>` : '<div class="muted small">Add places to visit and things to do.</div>'}</div>` : ''}
    </div>`;
}
function tripItemForm(tr, it, date) {
  openForm({
    title: it ? 'Edit plan' : 'Add to itinerary', values: { type: 'activity', date: date || tr.start || '', remind: '', ...it },
    fields: [
      { name: 'type', label: 'Type', type: 'select', options: ITIN_TYPES, half: true },
      { name: 'date', label: 'Date', type: 'date', half: true },
      { name: 'title', label: 'What', required: true, placeholder: 'Ziyarat tour, Great Wall, dinner…' },
      { name: 'time', label: 'Start time', type: 'time', half: true },
      { name: 'end', label: 'End time', type: 'time', half: true },
      { name: 'location', label: 'Location / address', half: true },
      { name: 'ref', label: 'Booking ref', half: true },
      { name: 'cost', label: 'Cost', half: true, placeholder: 'e.g. 150' },
      { name: 'remind', label: 'Reminder', type: 'select', options: REMINDS, half: true },
      { name: 'important', label: 'Priority — highlight this plan', type: 'checkbox' },
      { name: 'notes', label: 'Notes', type: 'textarea', rows: 3 },
    ],
    onSave: (v) => { if (hasReminder(v)) askNotify(); if (it) Object.assign(it, v); else tr.items.push({ id: uid(), ...v }); },
    onDelete: it ? () => { tr.items = tr.items.filter((x) => x !== it); } : null,
    extra: [{ label: 'Add to phone calendar', icon: 'calPlus', onClick: (v) => (v.date ? downloadIcs([{ item: { ...it, ...v, id: it?.id || uid() }, date: v.date }]) : toast('Pick a date first')) }],
  });
}

// Packing list
function tripPacking(tr) {
  const total = tr.packing.length, done = tr.packing.filter((p) => p.done).length;
  return `
  <div class="toolbar"><div class="progress-pill">Packed ${done}/${total} ${bar(total ? (done / total) * 100 : 0, 'done')}</div><span class="grow"></span>
    ${done ? `<button class="btn sm" data-action="packUntickAll" data-id="${tr.id}">Untick all</button>` : ''}
    <button class="btn sm" data-action="packSaveTemplate" data-id="${tr.id}">${icon('copy')} Save as my default list</button>
    <button class="btn sm ghost" data-action="packReset" data-id="${tr.id}">Reset to default list</button></div>
  <div class="grid wide">${packCats(tr).map((cat) => {
    const items = tr.packing.filter((p) => p.cat === cat);
    const cd = items.filter((p) => p.done).length;
    const ic = /backpack/i.test(cat) ? 'bag' : /vacation/i.test(cat) ? 'bag' : 'luggage';
    return `<div class="card pack-cat"><h3>${hi(ic)} ${esc(cat)}<span class="spacer"></span><span class="small muted">${cd}/${items.length}</span></h3>
      ${items.length ? bar((cd / items.length) * 100, cd === items.length ? 'done' : '') : ''}
      <ul class="items" style="margin-top:6px">${items.map((p) => { const [main, sub] = splitDetail(p.text); return `<li class="item ${p.done ? 'done' : ''}">
        <input type="checkbox" ${p.done ? 'checked' : ''} data-action="togglePack" data-id="${tr.id}|${p.id}" aria-label="Packed ${esc(main)}">
        <div class="body"><div class="title">${esc(main)}</div>${sub ? `<div class="meta"><span>${esc(sub)}</span></div>` : ''}</div>
        <div class="acts"><button class="icon-btn" data-action="delPack" data-id="${tr.id}|${p.id}" aria-label="Remove">${icon('x')}</button></div></li>`; }).join('')}</ul>
      <form class="quick-add" data-form="addPack" data-id="${tr.id}|${esc(cat)}" style="margin-top:8px"><input name="text" placeholder="Add item…" autocomplete="off" aria-label="Add item to ${esc(cat)}"><button class="btn sm">Add</button></form>
    </div>`;
  }).join('')}</div>
  <p class="hint">Tip: add details in brackets, e.g. “Meds (Panadol, balm)”. “Save as my default list” makes new trips start with this list.</p>`;
}

// Budget & expenses
function tripBudget(tr) {
  const c = tr.currency, booked = legCost(tr) + hotelCost(tr), spent = expenseTotal(tr), total = booked + spent;
  const left = tr.budget ? tr.budget - total : null;
  const byCat = {};
  if (legCost(tr)) byCat['Flights & transport'] = legCost(tr);
  if (hotelCost(tr)) byCat.Hotels = hotelCost(tr);
  tr.expenses.forEach((e) => { byCat[e.category] = (byCat[e.category] || 0) + (Number(e.amount) || 0); });
  const cats = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
  const ex = [...tr.expenses].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  return `
  <div class="stats">
    <div class="stat clickable" data-action="editTripBudget" data-id="${tr.id}"><div class="label">Budget</div><div class="value">${tr.budget ? fmtCur(tr.budget, c) : '<span class="muted">Set budget</span>'}</div></div>
    <div class="stat"><div class="label">Booked (flights & hotels)</div><div class="value">${fmtCur(booked, c)}</div></div>
    <div class="stat"><div class="label">Spent (expenses)</div><div class="value">${fmtCur(spent, c)}</div></div>
    <div class="stat"><div class="label">${left == null ? 'Total so far' : left >= 0 ? 'Left' : 'Over budget'}</div><div class="value ${left != null && left < 0 ? 'bad' : 'good'}">${fmtCur(left == null ? total : Math.abs(left), c)}</div>
      ${tr.budget ? bar((total / tr.budget) * 100, total > tr.budget ? 'over' : '') : ''}</div>
  </div>
  <div class="grid wide">
    <div class="card"><h2>${hi('chart')} By category</h2>
      ${cats.length ? cats.map(([k, v]) => `<div style="margin-bottom:10px"><div class="row small"><span class="grow">${esc(k)}</span><b>${fmtCur(v, c)}</b></div>${bar(total ? (v / total) * 100 : 0)}</div>`).join('') : empty('receipt', 'No costs yet. Costs you enter on flights and hotels are counted here too.')}
    </div>
    <div class="card"><h2>${hi('receipt')} Expenses<span class="spacer"></span><button class="btn sm" data-action="newExpense" data-id="${tr.id}">+ Expense</button></h2>
      ${ex.length ? `<ul class="items">${ex.map((e) => `<li class="item clickable" data-action="editExpense" data-id="${tr.id}|${e.id}" style="align-items:center">
        <div class="body"><div class="title">${esc(e.note || e.category)}</div><div class="meta">${e.date ? `<span>${esc(fmtDate(e.date))}</span>` : ''}<span class="chip">${esc(e.category)}</span></div></div>
        <b>${fmtCur(e.amount, c)}</b></li>`).join('')}</ul>` : '<div class="small muted">Log what you spend during the trip.</div>'}
    </div>
  </div>
  ${(() => { const g = db.savingsGoals.find((x) => x.tripId === tr.id); return g ? `<div class="card" style="margin-top:14px"><h3>${hi('target')} Savings goal: ${esc(g.name)}</h3><div class="kv"><span>Saved</span><b>${fmtCur(goalSaved(g), g.currency)} of ${fmtCur(g.target, g.currency)}</b></div>${bar(g.target ? (goalSaved(g) / g.target) * 100 : 0, goalSaved(g) >= g.target ? 'done' : '')}</div>` : ''; })()}
  <p class="hint">All amounts are in ${esc(c)}. Change the trip currency under Edit trip.</p>`;
}
function expenseForm(tr, e) {
  openForm({
    title: e ? 'Edit expense' : 'Add expense', values: e || { date: today(), category: 'Food' },
    fields: [
      { name: 'amount', label: `Amount (${tr.currency})`, type: 'number', step: '0.01', min: 0, required: true, half: true },
      { name: 'date', label: 'Date', type: 'date', half: true },
      { name: 'category', label: 'Category', type: 'select', options: EXPENSE_CATS_TRIP, half: true },
      { name: 'note', label: 'Description', half: true, placeholder: 'Dinner, taxi, gifts…' },
    ],
    onSave: (v) => (e ? Object.assign(e, v) : tr.expenses.push({ id: uid(), ...v })),
    onDelete: e ? () => { tr.expenses = tr.expenses.filter((x) => x !== e); } : null,
  });
}

// ---------- Trip form & actions ----------
function tripForm(tr) {
  openForm({
    title: tr ? 'Edit trip' : 'New trip', values: tr || { currency: 'MVR' },
    fields: [
      { name: 'name', label: 'Trip name', required: true, placeholder: 'Umrah, China…' },
      { name: 'destination', label: 'Destination', placeholder: 'City, country' },
      { name: 'start', label: 'Start date', type: 'date', half: true },
      { name: 'end', label: 'End date', type: 'date', half: true },
      { name: 'month', label: 'Month (if dates aren’t fixed yet)', type: 'month', half: true },
      { name: 'currency', label: 'Currency for costs', type: 'select', options: [...new Set([tr?.currency || 'MVR', ...TRIP_CURRENCIES])], half: true },
      { name: 'budget', label: 'Budget', type: 'number', step: '1', min: 0, half: true },
      { name: 'notes', label: 'Notes', type: 'textarea', rows: 3, placeholder: 'Visa info, emergency contacts, group leader…' },
    ],
    onSave: (v) => {
      if (v.start && !v.month) v.month = v.start.slice(0, 7);
      if (tr) Object.assign(tr, v);
      else { const t = newTrip({ ...v, packTemplate: db.settings.packTemplate }); db.trips.push(t); state.tripId = t.id; state.tripTab = 'flights'; }
    },
    onDelete: tr ? () => { remove('trips', tr.id); state.tripId = null; } : null,
  });
}
const tripSub = (id) => { const [tid, sid] = split(id); return [find('trips', tid), sid]; };
Object.assign(actions, {
  newTrip: () => tripForm(null),
  editTrip: (id) => tripForm(find('trips', id)),
  openTrip: (id) => { state.tripId = id; state.tripTab = 'flights'; if (location.hash !== '#/travel') location.hash = '#/travel'; else render(); window.scrollTo(0, 0); },
  closeTrip: () => { state.tripId = null; render(); },
  newLeg: (id) => legForm(find('trips', id), null),
  editLeg: (id) => { const [tr, lid] = tripSub(id); legForm(tr, tr.legs.find((x) => x.id === lid)); },
  newHotel: (id) => hotelForm(find('trips', id), null),
  editHotel: (id) => { const [tr, hid] = tripSub(id); hotelForm(tr, tr.hotels.find((x) => x.id === hid)); },
  newTripItem: (id) => { const [tr, d] = tripSub(id); tripItemForm(tr, null, d); },
  editTripItem: (id) => { const [tr, iid] = tripSub(id); tripItemForm(tr, tr.items.find((x) => x.id === iid)); },
  newExpense: (id) => expenseForm(find('trips', id), null),
  editExpense: (id) => { const [tr, eid] = tripSub(id); expenseForm(tr, tr.expenses.find((x) => x.id === eid)); },
  editTripBudget: (id) => {
    const tr = find('trips', id);
    openForm({ title: 'Trip budget', values: tr, fields: [{ name: 'budget', label: `Budget (${tr.currency})`, type: 'number', step: '1', min: 0 }], onSave: (v) => { tr.budget = v.budget; } });
  },
  exportTrip: (id) => {
    const tr = find('trips', id);
    const list = [
      ...tr.legs.filter((l) => l.departDate).map((l) => ({ item: { id: l.id, title: `${(LEG_MODES.find((m) => m[0] === l.mode) || LEG_MODES[0])[1]} ${l.from || ''} → ${l.to || ''}${l.number ? ' (' + l.number + ')' : ''}`, time: l.departTime, end: l.arriveDate === l.departDate ? l.arriveTime : '', location: l.from, ref: l.ref, notes: l.notes, remind: l.remind || '' }, date: l.departDate })),
      ...tr.hotels.filter((h) => h.checkin).map((h) => ({ item: { id: h.id, title: `Check in: ${h.name}`, time: h.checkinTime || '', location: h.address || h.city, ref: h.ref, notes: h.notes, remind: '' }, date: h.checkin })),
      ...tr.items.filter((x) => x.date).map((x) => ({ item: x, date: x.date })),
    ];
    list.length ? downloadIcs(list, tr.name) : toast('Add dated flights, hotels or plans first');
  },
  togglePack: (id) => { const [tr, pid] = tripSub(id); const p = tr.packing.find((x) => x.id === pid); p.done = !p.done; commit(); },
  delPack: (id) => { const [tr, pid] = tripSub(id); const p = tr.packing.find((x) => x.id === pid); tr.packing = tr.packing.filter((x) => x !== p); commit(); toastUndo('Item removed', () => tr.packing.push(p)); },
  packUntickAll: (id) => { const tr = find('trips', id); tr.packing.forEach((p) => { p.done = false; }); commit(); },
  packReset: (id) => {
    const tr = find('trips', id);
    if (!confirm('Replace this trip’s packing list with your default list? Ticks and added items will be lost.')) return;
    tr.packing = packingFrom(db.settings.packTemplate); commit();
  },
  packSaveTemplate: (id) => {
    const tr = find('trips', id);
    db.settings.packTemplate = packCats(tr).map((cat) => [cat, tr.packing.filter((p) => p.cat === cat).map((p) => p.text)]).filter(([, items]) => items.length);
    commit(); toast('Saved — new trips will start with this packing list');
  },
});
forms.addPack = (f) => {
  const text = f.elements.text.value.trim(); if (!text) return;
  const [tid, ...rest] = f.dataset.id.split('|'); const cat = rest.join('|');
  find('trips', tid).packing.push({ id: uid(), cat, text, done: false });
  commit(); $(`form[data-form=addPack][data-id="${CSS.escape(f.dataset.id)}"] input`)?.focus();
};
