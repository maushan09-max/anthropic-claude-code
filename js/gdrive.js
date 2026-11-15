'use strict';
/* Automatic backup to Google Drive (no server).
   Uses Google Identity Services for a short-lived access token (about 1 hour) and the Drive API.
   Scope drive.file: LifeOS can only see the backup file it created, nothing else in your Drive. */

const GD_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const GD_FILE = 'LifeOS-backup.json';
const GD_TOKEN_KEY = 'lifeos.gdtoken';
let gdToken = null, gdExpiry = 0, gdTimer = null, gdBusy = false, gisPromise = null;
try { const t = JSON.parse(localStorage.getItem(GD_TOKEN_KEY) || 'null'); if (t && t.expiry > Date.now()) { gdToken = t.token; gdExpiry = t.expiry; } } catch { /* ignore */ }

const gd = () => (db.settings.gdrive ||= {});
const gdriveOn = () => !!(gd().clientId && gd().enabled);
const gdTokenValid = () => !!gdToken && Date.now() < gdExpiry - 60000;
const gdPending = () => !!gd().dirty;

function loadGis() {
  if (window.google?.accounts?.oauth2) return Promise.resolve(window.google);
  return (gisPromise ||= new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client'; s.async = true;
    s.onload = () => res(window.google); s.onerror = () => { gisPromise = null; rej(new Error('Couldn’t load Google sign-in. Check your internet connection.')); };
    document.head.appendChild(s);
  }));
}
/** Must be called straight from a tap so the Google sign-in window isn't blocked. */
function gdConnect(then) {
  if (!gd().clientId) { toast('Add your Google client ID first'); return; }
  if (!window.google?.accounts?.oauth2) { loadGis().then(() => toast('Google sign-in is ready — tap again')).catch((e) => toast(e.message)); return; }
  const client = window.google.accounts.oauth2.initTokenClient({
    client_id: gd().clientId, scope: GD_SCOPE,
    callback: (r) => {
      if (r.error) { toast(`Google sign-in failed: ${r.error_description || r.error}`); return; }
      gdToken = r.access_token; gdExpiry = Date.now() + Number(r.expires_in || 3600) * 1000;
      try { localStorage.setItem(GD_TOKEN_KEY, JSON.stringify({ token: gdToken, expiry: gdExpiry })); } catch { /* ignore */ }
      gd().enabled = true; save(true); render();
      (then || gdBackupNow)();
    },
    error_callback: (e) => toast(e?.type === 'popup_closed' ? 'Google sign-in was closed' : `Google sign-in failed${e?.message ? ': ' + e.message : ''}`),
  });
  client.requestAccessToken({ prompt: gd().connectedOnce ? '' : 'consent' });
}
async function gdFetch(url, opts = {}) {
  const res = await fetch(url, { ...opts, headers: { Authorization: `Bearer ${gdToken}`, ...(opts.headers || {}) } });
  if (res.status === 401) { gdToken = null; gdExpiry = 0; try { localStorage.removeItem(GD_TOKEN_KEY); } catch { /* ignore */ } throw new Error('expired'); }
  if (!res.ok) throw new Error(`Google Drive error ${res.status}`);
  return res;
}
async function gdFindFile() {
  if (gd().fileId) return gd().fileId;
  const q = encodeURIComponent(`name='${GD_FILE}' and trashed=false`);
  const r = await (await gdFetch(`https://www.googleapis.com/drive/v3/files?q=${q}&spaces=drive&orderBy=modifiedTime desc&fields=files(id,modifiedTime)`)).json();
  return r.files?.[0]?.id || null;
}
async function gdUpload() {
  const body = JSON.stringify(db);
  let id = await gdFindFile();
  if (id) {
    try { await gdFetch(`https://www.googleapis.com/upload/drive/v3/files/${id}?uploadType=media`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body }); }
    catch (e) { if (e.message === 'expired') throw e; id = null; gd().fileId = ''; } // file deleted in Drive: create a new one
  }
  if (!id) {
    const boundary = 'lifeos' + Date.now();
    const multipart = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({ name: GD_FILE, mimeType: 'application/json' })}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${body}\r\n--${boundary}--`;
    const r = await (await gdFetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', { method: 'POST', headers: { 'Content-Type': `multipart/related; boundary=${boundary}` }, body: multipart })).json();
    id = r.id;
  }
  const g = gd();
  g.fileId = id; g.lastBackup = new Date().toISOString(); g.dirty = false; g.connectedOnce = true;
  db.settings.lastBackup = today();
  save(true);
}
async function gdBackupNow(manual) {
  if (!gdriveOn() || gdBusy) return;
  if (!gdTokenValid()) { gd().dirty = true; save(true); if (manual) gdConnect(); else if (currentView() === 'today' || currentView() === 'settings') render(); return; }
  gdBusy = true;
  try { await gdUpload(); if (manual) toast('Backed up to Google Drive'); }
  catch (e) { gd().dirty = true; save(true); if (e.message !== 'expired' || manual) toast(e.message === 'expired' ? 'Google Drive connection expired — tap Reconnect' : e.message); }
  finally { gdBusy = false; if (['today', 'settings'].includes(currentView())) render(); }
}
/** After every change: back up within ~20 seconds while connected. */
afterSave.push(() => {
  if (!gdriveOn()) return;
  if (!gd().dirty) { gd().dirty = true; save(true); }
  clearTimeout(gdTimer);
  gdTimer = setTimeout(() => gdBackupNow(false), 20000);
});
document.addEventListener('visibilitychange', () => { if (document.hidden && gdriveOn() && gdPending() && gdTokenValid()) gdBackupNow(false); });
if (gdriveOn()) loadGis().catch(() => {}); // preload so the reconnect tap opens Google straight away

async function gdRestore() {
  try {
    const id = await gdFindFile();
    if (!id) return toast('No LifeOS backup found in your Google Drive yet');
    const data = await (await gdFetch(`https://www.googleapis.com/drive/v3/files/${id}?alt=media`)).json();
    if (!Array.isArray(data.tasks)) throw new Error('That file isn’t a LifeOS backup');
    if (!confirm('Replace the data on this phone with your Google Drive backup?')) return;
    const keep = { ...gd(), fileId: id, dirty: false };
    db = migrate(data); db.settings.gdrive = keep; commit(); toast('Restored from Google Drive');
  } catch (e) { toast(e.message === 'expired' ? 'Connection expired — tap Restore again' : e.message); }
}
const gdLastText = () => { const l = gd().lastBackup; if (!l) return 'Not yet'; const d = new Date(l); const day = ymd(d); return `${day === today() ? 'Today' : fmtDate(day, { day: 'numeric', month: 'short' })} at ${d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`; };

function gdriveBanner() {
  if (!gdriveOn() || gdTokenValid() || !gdPending()) return '';
  return `<div class="banner">${icon('cloudUp')} <span class="grow">Your latest changes aren’t in Google Drive yet. Last backup: ${esc(gdLastText())}.</span>
    <button class="btn sm primary" data-action="gdReconnect">Back up now</button></div>`;
}
function gdriveSettingsCard() {
  const g = gd(), origin = location.origin;
  if (!g.clientId) return `<div class="card"><h2>${hi('cloudUp')} Google Drive backup</h2>
    <p class="small muted">Back up automatically to your own Google Drive. LifeOS can only see its own backup file, nothing else in your Drive. Google needs a one-time setup first:</p>
    <details class="setup"><summary class="small"><b>One-time setup (about 10 minutes)</b></summary><ol class="small">
      <li>On a computer, go to <b>console.cloud.google.com</b> and sign in with your Google account.</li>
      <li>Create a new project (name it <b>LifeOS</b>).</li>
      <li>Go to <b>APIs & Services → Library</b>, search for <b>Google Drive API</b> and tap <b>Enable</b>.</li>
      <li>Go to <b>Google Auth Platform</b> (or <b>OAuth consent screen</b>) → <b>Get started</b>. App name: LifeOS. Audience: <b>External</b>. Use your email for contact. Then under <b>Audience → Test users</b>, add your own Gmail address.</li>
      <li>Go to <b>Clients → Create client</b>. Type: <b>Web application</b>. Under <b>Authorised JavaScript origins</b> add <code>${esc(origin)}</code>. Tap <b>Create</b>.</li>
      <li>Copy the <b>Client ID</b> (it ends in <code>.apps.googleusercontent.com</code>) and paste it below.</li></ol></details>
    <form class="quick-add" data-form="saveGdClient" style="margin-top:8px"><input name="cid" placeholder="…apps.googleusercontent.com" autocomplete="off" aria-label="Google client ID"><button class="btn primary sm">Save</button></form></div>`;
  const live = gdTokenValid();
  return `<div class="card"><h2>${hi('cloudUp')} Google Drive backup</h2>
    <div class="kv"><span>Status</span><b class="${g.enabled && live ? 'good' : 'warn'}">${!g.enabled ? 'Off' : live ? `Connected · backs up automatically` : 'Paused — tap Reconnect'}</b></div>
    <div class="kv"><span>Last Drive backup</span><b>${esc(gdLastText())}</b></div>
    ${g.enabled && live ? `<div class="small muted">Connected until ${new Date(gdExpiry).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}. Google signs apps without a server out after about an hour — then one tap reconnects.</div>` : ''}
    <div class="row" style="margin-top:10px">
      ${live ? '<button class="btn sm primary" data-action="gdBackup">Back up now</button>' : `<button class="btn sm primary" data-action="gdReconnect">${g.enabled ? 'Reconnect' : 'Connect Google Drive'}</button>`}
      <button class="btn sm" data-action="gdRestoreBtn">Restore from Drive</button>
      ${g.enabled ? '<button class="btn sm ghost" data-action="gdOff">Turn off</button>' : ''}
      <button class="btn sm ghost danger" data-action="gdForget">Remove client ID</button></div>
    <p class="hint">The backup is a file called <b>${GD_FILE}</b> in your Drive. Google keeps older versions of it for 30 days (right-click → Manage versions). Roster photos and your API key aren’t included.</p></div>`;
}
forms.saveGdClient = (f) => {
  const v = f.elements.cid.value.trim();
  if (!/\.apps\.googleusercontent\.com$/.test(v)) return toast('That doesn’t look like a Google client ID — it should end in .apps.googleusercontent.com');
  gd().clientId = v; save(true); loadGis().catch(() => {}); render(); toast('Saved — now tap Connect Google Drive');
};
Object.assign(actions, {
  gdReconnect: () => gdConnect(),
  gdBackup: () => gdBackupNow(true),
  gdRestoreBtn: () => (gdTokenValid() ? gdRestore() : gdConnect(gdRestore)),
  gdOff: () => { gd().enabled = false; save(true); render(); toast('Google Drive backup turned off'); },
  gdForget: () => { if (!confirm('Remove the Google client ID? Automatic backups will stop.')) return; db.settings.gdrive = {}; gdToken = null; try { localStorage.removeItem(GD_TOKEN_KEY); } catch { /* ignore */ } save(true); render(); },
});
