'use strict';
/* Reads an uploaded roster photo/PDF with Claude and fills in your duties for the week.
   The Anthropic SDK is vendored as a browser bundle (js/vendor/anthropic-sdk.mjs) and loaded only when needed.
   The API key is the user's own and is kept in this device's localStorage only (never in backups). */

const AI_KEY = 'lifeos.anthropicKey';
const ROSTER_MODEL = 'claude-opus-5-5';
const getApiKey = () => { try { return localStorage.getItem(AI_KEY) || ''; } catch { return ''; } };
const setApiKey = (k) => { try { if (k) localStorage.setItem(AI_KEY, k); else localStorage.removeItem(AI_KEY); } catch { /* storage blocked */ } };
let sdkPromise;
const loadSdk = () => (sdkPromise ||= import(new URL('js/vendor/anthropic-sdk.mjs', document.baseURI).href).then((m) => m.default));

const ROSTER_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['found_name', 'week_start', 'days', 'notes'],
  properties: {
    found_name: { type: 'boolean', description: 'True if the person appears anywhere on the roster.' },
    week_start: { type: 'string', description: 'Date of the Sunday of the roster week, YYYY-MM-DD. Empty if no dates are shown.' },
    days: {
      type: 'array',
      description: 'One entry per day shown on the roster, in order.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['date', 'weekday', 'off', 'duties', 'on_call'],
        properties: {
          date: { type: 'string', description: 'YYYY-MM-DD' },
          weekday: { type: 'string' },
          off: { type: 'boolean', description: 'True if the person is listed as off that day.' },
          duties: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['label', 'start', 'end', 'working_with'],
              properties: {
                label: { type: 'string', description: 'Short name of the duty.' },
                start: { type: 'string', description: '24-hour HH:MM, or empty if no time is shown.' },
                end: { type: 'string', description: '24-hour HH:MM, or empty if no time is shown.' },
                working_with: { type: 'array', items: { type: 'string' }, description: 'Other doctors in the same duty that day.' },
              },
            },
          },
          on_call: { type: 'string', description: 'Doctor listed on call that day, or empty.' },
        },
      },
    },
    notes: { type: 'string', description: 'Anything the person should double-check. Empty if nothing.' },
  },
};

const ROSTER_SYSTEM = 'You read hospital duty rosters from photos and extract one doctor\'s schedule. Report only what the roster shows. If a cell is unreadable or unclear, leave that field empty and say so in notes rather than guessing.';
const rosterPrompt = (name) => `Find every duty for ${name} on this roster. Match the name however it is written (for example "Dr ${name.replace(/^dr\.?\s*/i, '')}", "Dr. ${name.replace(/^dr\.?\s*/i, '')}", or with small spelling differences).

For each day of the roster week, return:
- date (YYYY-MM-DD) and weekday. Dates on these rosters are usually written day/month/year. Today is ${today()}.
- off: true if ${name} is in an "Off" / day-off row for that day.
- duties: each shift or assignment ${name} has that day.
  - label: if the row is only a time range, call it "Night shift", "Morning shift", "Day shift" or "Evening shift" to fit the times; otherwise use the row's name (for example "Stroke Unit").
  - start and end in 24-hour HH:MM from the row label ("12 AM" is 00:00); empty if no time is shown.
  - working_with: the other doctors listed in the same shift block on the same day. Leave out ${name}, and leave out people in off, leave or on-call rows.
- on_call: the doctor in the row labelled "On call" (or similar) for that day; empty if there is none.

week_start is the Sunday of that week. Use notes for anything worth checking, such as unreadable cells, or meetings or leave that mention ${name}.`;

const blobToBase64 = (blob) => new Promise((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(String(r.result).split(',')[1]);
  r.onerror = () => rej(r.error);
  r.readAsDataURL(blob);
});
/** Keep photos within the API's image limits while staying sharp enough to read small names. */
function shrinkForApi(blob) {
  return new Promise((res) => {
    const img = new Image(), url = URL.createObjectURL(blob);
    img.onload = () => {
      const k = Math.min(1, 2400 / Math.max(img.width, img.height));
      if (k === 1 && blob.size < 3.5 * 1024 * 1024 && /image\/(jpeg|png|webp|gif)/.test(blob.type)) { URL.revokeObjectURL(url); return res(blob); }
      const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob((b) => res(b || blob), 'image/jpeg', 0.9);
    };
    img.onerror = () => { URL.revokeObjectURL(url); res(blob); };
    img.src = url;
  });
}
async function rosterContentBlock(rec) {
  if (rec.type === 'application/pdf') return { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: await blobToBase64(rec.blob) } };
  const img = await shrinkForApi(rec.blob);
  return { type: 'image', source: { type: 'base64', media_type: img.type || 'image/jpeg', data: await blobToBase64(img) } };
}

function showBusy(msg) {
  const dlg = $('#modal');
  dlg.innerHTML = `<div class="busy"><span class="spinner" aria-hidden="true"></span><div><b>${esc(msg)}</b><div class="small muted">This usually takes under a minute.</div></div></div>`;
  if (!dlg.open) dlg.showModal();
}
function rosterErrorMessage(e, Anthropic) {
  if (Anthropic && e instanceof Anthropic.AuthenticationError) return 'Your API key was rejected. Check it in Settings.';
  if (Anthropic && e instanceof Anthropic.PermissionDeniedError) return 'This API key isn’t allowed to use this model.';
  if (Anthropic && e instanceof Anthropic.RateLimitError) return 'Too many requests right now. Wait a minute and try again.';
  if (Anthropic && e instanceof Anthropic.BadRequestError) return `The request was rejected: ${e.message}`;
  if (Anthropic && e instanceof Anthropic.APIConnectionError) return 'Couldn’t reach Anthropic. Check your internet connection.';
  if (Anthropic && e instanceof Anthropic.APIError) return `Anthropic returned an error (${e.status ?? 'unknown'}). Try again in a moment.`;
  return e?.message || 'Something went wrong while reading the roster.';
}

async function readRoster(ws) {
  if (!getApiKey()) { toast('Add your Anthropic API key in Settings to read rosters automatically'); location.hash = '#/settings'; return; }
  const name = (db.settings.rosterName || '').trim();
  if (!name) { toast('Set your name as it appears on the roster in Settings'); location.hash = '#/settings'; return; }
  let rec;
  try { rec = await fileStore.get('roster|' + ws); } catch { rec = null; }
  if (!rec) { toast('Upload the roster photo first'); return; }
  showBusy(`Finding ${name}'s duties…`);
  let Anthropic;
  try {
    Anthropic = await loadSdk();
    // The key belongs to the person using this app and never leaves their device except to call Anthropic.
    const client = new Anthropic({ apiKey: getApiKey(), dangerouslyAllowBrowser: true });
    const response = await client.beta.messages.create({
      model: ROSTER_MODEL,
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'high', format: { type: 'json_schema', schema: ROSTER_SCHEMA } },
      system: ROSTER_SYSTEM,
      messages: [{ role: 'user', content: [await rosterContentBlock(rec), { type: 'text', text: rosterPrompt(name) }] }],
    });
    if (response.stop_reason === 'refusal') throw new Error('Claude couldn’t read this file. Try a clearer photo.');
    if (response.stop_reason === 'max_tokens') throw new Error('The answer was cut off. Please try again.');
    const text = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
    openRosterReview(ws, JSON.parse(text));
  } catch (e) {
    $('#modal').close();
    toast(rosterErrorMessage(e, Anthropic), null, null, 8000);
  }
}

// ---------- Review & save ----------
const isTime = (t) => /^\d\d:\d\d$/.test(t || '');
function dutyColorFor(x) {
  const t = db.dutyTypes.find((d) => d.start && d.start === x.start && d.end === x.end) || db.dutyTypes.find((d) => d.name.toLowerCase() === x.label.toLowerCase());
  if (t) return t.color;
  const h = isTime(x.start) ? Number(x.start.slice(0, 2)) : 12;
  return h < 7 ? '#5b2a86' : h < 15 ? '#e6489b' : '#9b3fc4';
}
const reviewDutyRow = (x = { label: '', start: '', end: '', working_with: [] }) => `<div class="rv-duty">
  <input class="rv-label" value="${esc(x.label)}" placeholder="Duty" aria-label="Duty">
  <input class="rv-start" type="time" value="${isTime(x.start) ? x.start : ''}" aria-label="Start">
  <input class="rv-end" type="time" value="${isTime(x.end) ? x.end : ''}" aria-label="End">
  <input class="rv-with" value="${esc((x.working_with || []).join(', '))}" placeholder="Working with" aria-label="Working with">
  <button type="button" class="icon-btn rv-del" aria-label="Remove duty">${icon('x')}</button></div>`;

function openRosterReview(uploadWs, data) {
  const name = db.settings.rosterName;
  const days = (data.days || []).filter((d) => /^\d{4}-\d\d-\d\d$/.test(d.date));
  const ws = /^\d{4}-\d\d-\d\d$/.test(data.week_start || '') ? weekStart(data.week_start) : days.length ? weekStart(days[0].date) : uploadWs;
  const byDate = Object.fromEntries(days.map((d) => [d.date, d]));
  const dlg = $('#modal');
  dlg.innerHTML = `<form class="form roster-review" novalidate>
    <h2>${icon('sparkle')} Check your duties</h2>
    <div class="small muted" style="width:100%">Week of <b>${esc(fmtWeek(ws))}</b>. Fix anything that’s wrong, then save.</div>
    ${!data.found_name ? `<div class="banner" style="width:100%">${icon('bell')} ${esc(name)} wasn’t found on this roster. Check the name in Settings, or fill in the days below yourself.</div>` : ''}
    ${ws !== uploadWs ? `<div class="banner" style="width:100%">${icon('calendar')} This roster is for a different week than the one you uploaded it to. It will be saved to ${esc(fmtWeek(ws))}.</div>` : ''}
    ${data.notes ? `<div class="prompt small" style="width:100%">${icon('note')} ${esc(data.notes)}</div>` : ''}
    ${[0, 1, 2, 3, 4, 5, 6].map((i) => {
      const d = addDays(ws, i), x = byDate[d] || { off: false, duties: [], on_call: '' };
      return `<fieldset class="rv-day" data-i="${i}">
        <legend><b>${DOW[i]}</b> <span class="muted small">${esc(fmtDate(d, { day: 'numeric', month: 'short' }))}</span></legend>
        <label class="check"><input type="checkbox" class="rv-off" ${x.off ? 'checked' : ''}> Off this day</label>
        <div class="rv-duties">${(x.duties || []).map(reviewDutyRow).join('')}</div>
        <button type="button" class="btn sm ghost rv-add">+ Add duty</button>
        <label class="oncall">${icon('badge')}<span>On-call</span><input class="rv-oncall" value="${esc(x.on_call || '')}" placeholder="On-call doctor"></label>
      </fieldset>`;
    }).join('')}
    <div class="row end form-actions"><span class="grow"></span>
      <button type="button" class="btn ghost" data-cancel>Cancel</button><button type="submit" class="btn primary">Save to roster</button></div>
  </form>`;
  const form = $('form', dlg);
  form.addEventListener('click', (e) => {
    if (e.target.closest('.rv-del')) e.target.closest('.rv-duty').remove();
    const add = e.target.closest('.rv-add');
    if (add) { add.previousElementSibling.insertAdjacentHTML('beforeend', reviewDutyRow()); add.previousElementSibling.lastElementChild.querySelector('input').focus(); }
  });
  $('[data-cancel]', form).onclick = () => dlg.close();
  form.onsubmit = async (e) => {
    e.preventDefault();
    const r = rosterEnsure(ws);
    const hadDuties = Object.values(r.days).some((l) => l.length);
    if (hadDuties && !confirm('Replace the duties already saved for this week?')) return;
    const offType = db.dutyTypes.find((t) => /off/i.test(t.name));
    const daysOut = {}, oncall = {};
    form.querySelectorAll('.rv-day').forEach((fs) => {
      const i = fs.dataset.i, list = [];
      if (fs.querySelector('.rv-off').checked) list.push({ id: uid(), title: offType?.name || 'Day off', start: '', end: '', with: '', color: offType?.color || '#f0a6ca' });
      fs.querySelectorAll('.rv-duty').forEach((row) => {
        const x = { label: row.querySelector('.rv-label').value.trim(), start: row.querySelector('.rv-start').value, end: row.querySelector('.rv-end').value };
        if (!x.label && !x.start) return;
        list.push({ id: uid(), title: x.label || 'Duty', start: x.start, end: x.end, with: row.querySelector('.rv-with').value.trim(), color: dutyColorFor(x) });
      });
      if (list.length) daysOut[i] = list;
      const oc = fs.querySelector('.rv-oncall').value.trim();
      if (oc) oncall[i] = oc;
    });
    r.days = daysOut; r.oncall = oncall;
    if (ws !== uploadWs) { // move the uploaded file to the week it belongs to
      try {
        const rec = await fileStore.get('roster|' + uploadWs);
        if (rec) { await fileStore.put('roster|' + ws, rec); await fileStore.del('roster|' + uploadWs); }
        const from = rosterEnsure(uploadWs);
        if (from.file) { r.file = from.file; delete from.file; }
      } catch { /* keep the file where it is */ }
      state.rosterWeek = ws;
    }
    dlg.close(); commit(); toast('Duties saved from the roster');
  };
  if (!dlg.open) dlg.showModal();
}

actions.readRoster = () => readRoster(state.rosterWeek);

// ---------- Settings: name on roster & API key ----------
function rosterAiSettingsCard() {
  const key = getApiKey();
  return `<div class="card"><h2>${hi('sparkle')} Roster reading (AI)</h2>
    <p class="small muted">When you upload a roster photo, Claude reads it and fills in your duties, who you’re working with and the on-call doctor. You check everything before it’s saved.</p>
    <label class="field"><span>Your name as it appears on the roster</span><input value="${esc(db.settings.rosterName || '')}" placeholder="e.g. Dr Maushan" data-change="setting" data-id="rosterName"></label>
    <div class="field" style="margin-top:10px"><span>Anthropic API key</span>
      ${key ? `<div class="row"><span class="grow small">Saved on this device <span class="muted">(…${esc(key.slice(-4))})</span></span><button class="btn sm danger" data-action="removeApiKey">Remove</button></div>`
        : `<form class="quick-add" data-form="saveApiKey"><input name="key" type="password" autocomplete="off" placeholder="sk-ant-…" aria-label="Anthropic API key"><button class="btn primary sm">Save</button></form>`}
    </div>
    <p class="small muted">Get a key at console.anthropic.com → API keys (you’ll need to add a little credit). Reading one roster costs a few US cents. The key is stored only on this device and is not included in backups. The roster photo is sent to Anthropic to be read.</p>
  </div>`;
}
forms.saveApiKey = (f) => {
  const k = f.elements.key.value.trim();
  if (!k) return;
  if (!/^sk-ant-/.test(k) && !confirm('That doesn’t look like an Anthropic API key (they start with "sk-ant-"). Save it anyway?')) return;
  setApiKey(k); render(); toast('API key saved on this device');
};
actions.removeApiKey = () => { if (confirm('Remove the API key from this device?')) { setApiKey(''); render(); } };
