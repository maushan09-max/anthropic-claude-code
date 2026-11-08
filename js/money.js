'use strict';
/* Finances: savings (MVR & USD), loans taken/given, monthly spending & budgets. */

const CURRENCIES = [['MVR', 'MVR (Rufiyaa)'], ['USD', 'USD (Dollar)']];
const EXPENSE_CATS = ['Housing', 'Food', 'Transport', 'Utilities', 'Health', 'Entertainment', 'Shopping', 'Education', 'Savings', 'Debt', 'Gifts', 'Other'];
const INCOME_CATS = ['Salary', 'Freelance', 'Investments', 'Gifts', 'Refunds', 'Other'];
const usdRate = () => Number(db.settings.usdRate) || 15.42;
const toMVR = (n, c) => (c === 'USD' ? n * usdRate() : n);
const curList = (o) => Object.entries(o).filter(([, v]) => Math.abs(v) > 0.004).map(([c, v]) => fmtCur(v, c)).join(' + ') || fmtCur(0, 'MVR');

function savingsTotals() {
  const t = { MVR: 0, USD: 0 };
  db.accounts.forEach((a) => { t[a.currency] = (t[a.currency] || 0) + Number(a.balance || 0); });
  return t;
}
const loanPaid = (l) => (l.payments || []).reduce((s, p) => s + Number(p.amount || 0), 0);
const loanLeft = (l) => Number(l.amount || 0) - loanPaid(l);
function loanTotals() {
  const owe = {}, owed = {}; let activeCount = 0;
  db.loans.forEach((l) => {
    const left = loanLeft(l); if (left <= 0.004) return;
    activeCount++;
    const o = l.direction === 'taken' ? owe : owed; o[l.currency] = (o[l.currency] || 0) + left;
  });
  return { owe, owed, activeCount };
}

const FIN_TABS = [['savings', 'bank', 'Savings'], ['loans', 'swap', 'Loans'], ['spending', 'receipt', 'Spending']].map(([k, ic, l]) => [k, `${icon(ic)} ${l}`]);
views.finances = () => `${tabs('financeTab', state.financeTab, FIN_TABS)}<div style="margin-top:14px">${finTabs[state.financeTab]()}</div>`;
TOP_ACTIONS.finances = () => ({ savings: ['newAccount', '+ Account'], loans: ['newLoan', '+ Loan'], spending: ['newTx', '+ Expense', 'expense'] }[state.financeTab]);
actions.financeTab = (k) => { state.financeTab = k; render(); };
const finTabs = {};

// ---------- Savings ----------
finTabs.savings = () => {
  const t = savingsTotals(), r = usdRate();
  // Combined trend (in MVR) from each account's balance history
  const dates = [...new Set(db.accounts.flatMap((a) => (a.history || []).map((h) => h.date)))].sort();
  const trend = dates.map((d) => ({
    date: d,
    v: Math.round(db.accounts.reduce((s, a) => { const h = (a.history || []).filter((x) => x.date <= d).sort((x, y) => x.date.localeCompare(y.date)).at(-1); return s + (h ? toMVR(Number(h.balance), a.currency) : 0); }, 0)),
  }));
  return `
  <div class="stats">
    <div class="stat"><div class="label">Savings in MVR</div><div class="value">${fmtCur(t.MVR, 'MVR')}</div></div>
    <div class="stat"><div class="label">Savings in USD</div><div class="value">${fmtCur(t.USD, 'USD')}</div></div>
    <div class="stat"><div class="label">Total (as MVR)</div><div class="value good">${fmtCur(t.MVR + t.USD * r, 'MVR')}</div></div>
    <div class="stat"><div class="label">Total (as USD)</div><div class="value good">${fmtCur(t.USD + t.MVR / r, 'USD')}</div></div>
  </div>
  <div class="row small muted" style="margin-bottom:14px">Exchange rate: 1 USD =
    <input type="number" step="0.01" min="0" inputmode="decimal" class="inline-num" value="${esc(db.settings.usdRate)}" data-change="setting" data-id="usdRate" aria-label="MVR per USD"> MVR</div>
  ${db.accounts.length ? `<div class="grid">${db.accounts.map((a) => {
    const h = (a.history || []).slice().sort((x, y) => x.date.localeCompare(y.date));
    const prev = h.length > 1 ? Number(h.at(-2).balance) : null;
    const diff = prev != null ? Number(a.balance) - prev : 0;
    return `<div class="card"><h3>${hi('bank')} ${esc(a.name)}<span class="chip">${esc(a.currency)}</span><span class="spacer"></span>
        <button class="icon-btn" data-action="editAccount" data-id="${a.id}" aria-label="Edit account">${icon('edit')}</button></h3>
      <div class="big-num">${fmtCur(a.balance, a.currency)}</div>
      <div class="small muted">${a.currency === 'USD' ? '≈ ' + fmtCur(a.balance * r, 'MVR') : '≈ ' + fmtCur(a.balance / r, 'USD')}
        ${diff ? ` · <span class="${diff > 0 ? 'good' : 'bad'}">${diff > 0 ? '+' : ''}${fmtCur(diff, a.currency)}</span> since last update` : ''}</div>
      <div class="small muted">Updated ${esc(a.updated ? fmtDate(a.updated, { day: 'numeric', month: 'short', year: 'numeric' }) : '–')}</div>
      <div class="row" style="margin-top:10px"><button class="btn sm primary" data-action="updateBalance" data-id="${a.id}">Update balance</button></div>
    </div>`;
  }).join('')}</div>
  <div class="card" style="margin-top:16px"><h3>${hi('trend')} Total savings over time (MVR)</h3>${lineChart(trend, '#a43fc2', 'MVR')}</div>`
    : `<div class="card">${empty('bank', 'Add your savings accounts — bank accounts, cash, savings pots — in MVR or USD.<br><br><button class="btn primary" data-action="newAccount">+ Add account</button>')}</div>`}`;
};
function accountForm(a) {
  openForm({
    title: a ? 'Edit account' : 'New savings account', values: a || { currency: 'MVR' },
    fields: [
      { name: 'name', label: 'Account name', required: true, placeholder: 'BML savings, Cash, Emergency fund…' },
      { name: 'currency', label: 'Currency', type: 'select', options: CURRENCIES, half: true },
      { name: 'balance', label: 'Current balance', type: 'number', step: '0.01', half: true },
      { name: 'notes', label: 'Notes' },
    ],
    onSave: (v) => {
      v.balance = v.balance || 0;
      if (a) {
        if (Number(a.balance) !== v.balance) (a.history ||= []).push({ date: today(), balance: v.balance });
        Object.assign(a, v, { updated: today() });
      } else db.accounts.push({ id: uid(), ...v, updated: today(), history: [{ date: today(), balance: v.balance }] });
    },
    onDelete: a ? () => remove('accounts', a.id) : null,
  });
}
function balanceForm(a) {
  openForm({
    title: `Update ${a.name}`, values: { mode: 'set', date: today() },
    intro: `<div class="small muted" style="width:100%">Current: <b>${fmtCur(a.balance, a.currency)}</b></div>`,
    fields: [
      { name: 'mode', label: 'Type', type: 'select', options: [['set', 'Set new balance'], ['add', 'Deposit (+)'], ['sub', 'Withdraw (−)']], half: true },
      { name: 'amount', label: `Amount (${a.currency})`, type: 'number', step: '0.01', min: 0, required: true, half: true },
      { name: 'date', label: 'Date', type: 'date', half: true },
    ],
    onSave: (v) => {
      const cur = Number(a.balance || 0);
      a.balance = v.mode === 'add' ? cur + v.amount : v.mode === 'sub' ? cur - v.amount : v.amount;
      a.balance = Math.round(a.balance * 100) / 100;
      a.updated = v.date || today();
      const h = (a.history ||= []); const same = h.find((x) => x.date === a.updated);
      if (same) same.balance = a.balance; else h.push({ date: a.updated, balance: a.balance });
    },
  });
}
Object.assign(actions, {
  newAccount: () => accountForm(null),
  editAccount: (id) => accountForm(find('accounts', id)),
  updateBalance: (id) => balanceForm(find('accounts', id)),
});

// ---------- Loans ----------
finTabs.loans = () => {
  const lt = loanTotals(), t = today();
  const card = (l) => {
    const paid = loanPaid(l), left = loanLeft(l), pct = l.amount ? (paid / l.amount) * 100 : 0;
    const over = left > 0.004 && l.due && l.due < t;
    return `<div class="card loan ${l.direction}">
      <h3>${hi(l.direction === 'taken' ? 'arrowDownLeft' : 'arrowUpRight')} ${esc(l.person)}<span class="spacer"></span><button class="icon-btn" data-action="editLoan" data-id="${l.id}" aria-label="Edit loan">${icon('edit')}</button></h3>
      <div class="kv"><span>${l.direction === 'taken' ? 'Borrowed' : 'Lent'}</span><b>${fmtCur(l.amount, l.currency)}</b></div>
      <div class="kv"><span>${l.direction === 'taken' ? 'Repaid' : 'Received back'}</span><b>${fmtCur(paid, l.currency)}</b></div>
      <div class="kv"><span>Remaining</span><b class="${left > 0.004 ? (l.direction === 'taken' ? 'bad' : 'warn') : 'good'}">${left > 0.004 ? fmtCur(left, l.currency) : `Settled ${icon('check')}`}</b></div>
      ${bar(pct, left <= 0.004 ? 'done' : '')}
      <div class="meta small muted" style="margin-top:6px">${l.date ? `<span>Since ${esc(fmtDate(l.date, { day: 'numeric', month: 'short', year: 'numeric' }))}</span>` : ''}
        ${l.due ? `<span class="${over ? 'overdue' : ''}">· Due ${esc(fmtDate(l.due, { day: 'numeric', month: 'short', year: 'numeric' }))}${over ? ' (overdue)' : ''}</span>` : ''}</div>
      ${l.notes ? `<div class="small muted">${esc(l.notes)}</div>` : ''}
      ${(l.payments || []).length ? `<details class="payments"><summary class="small">${plural(l.payments.length, 'payment')}</summary><ul class="items">${l.payments.slice().sort((a, b) => b.date.localeCompare(a.date)).map((p) => `<li class="item small">
        <span class="grow">${esc(fmtDate(p.date))}${p.note ? ' · ' + esc(p.note) : ''}</span><b>${fmtCur(p.amount, l.currency)}</b>
        <button class="icon-btn" data-action="delPayment" data-id="${l.id}|${p.id}" aria-label="Delete payment">${icon('x')}</button></li>`).join('')}</ul></details>` : ''}
      ${left > 0.004 ? `<div class="row" style="margin-top:8px"><button class="btn sm primary" data-action="addPayment" data-id="${l.id}">+ ${l.direction === 'taken' ? 'Repayment' : 'Payment received'}</button></div>` : ''}
    </div>`;
  };
  const active = db.loans.filter((l) => loanLeft(l) > 0.004), settled = db.loans.filter((l) => loanLeft(l) <= 0.004);
  const taken = active.filter((l) => l.direction === 'taken'), given = active.filter((l) => l.direction === 'given');
  return `
  <div class="stats">
    <div class="stat"><div class="label">I owe</div><div class="value bad small-val">${curList(lt.owe)}</div></div>
    <div class="stat"><div class="label">Owed to me</div><div class="value good small-val">${curList(lt.owed)}</div></div>
    <div class="stat"><div class="label">Active loans</div><div class="value">${lt.activeCount}</div></div>
  </div>
  <div class="section-title">${icon('arrowDownLeft')} Loans taken — money I owe</div>
  ${taken.length ? `<div class="grid">${taken.map(card).join('')}</div>` : '<div class="card">' + empty('checkCircle', 'You don’t owe anyone.') + '</div>'}
  <div class="section-title">${icon('arrowUpRight')} Loans given — money owed to me</div>
  ${given.length ? `<div class="grid">${given.map(card).join('')}</div>` : '<div class="card">' + empty('swap', 'Nobody owes you money.') + '</div>'}
  ${settled.length ? `<details class="section"><summary class="section-title">${icon('check')} Settled (${settled.length})</summary><div class="grid">${settled.map(card).join('')}</div></details>` : ''}`;
};
function loanForm(l) {
  openForm({
    title: l ? 'Edit loan' : 'New loan', values: l || { direction: 'taken', currency: 'MVR', date: today() },
    fields: [
      { name: 'direction', label: 'Type', type: 'select', options: [['taken', 'Loan taken — I borrowed (I owe)'], ['given', 'Loan given — I lent (owed to me)']] },
      { name: 'person', label: 'Person / lender', required: true, placeholder: 'Name, bank…' },
      { name: 'currency', label: 'Currency', type: 'select', options: CURRENCIES, half: true },
      { name: 'amount', label: 'Amount', type: 'number', step: '0.01', min: 0, required: true, half: true },
      { name: 'date', label: 'Date', type: 'date', half: true },
      { name: 'due', label: 'Due date (optional)', type: 'date', half: true },
      { name: 'notes', label: 'Notes', placeholder: 'Purpose, monthly instalment, interest…' },
    ],
    onSave: (v) => (l ? Object.assign(l, v) : db.loans.push({ id: uid(), payments: [], ...v })),
    onDelete: l ? () => remove('loans', l.id) : null,
  });
}
Object.assign(actions, {
  newLoan: () => loanForm(null),
  editLoan: (id) => loanForm(find('loans', id)),
  addPayment: (id) => {
    const l = find('loans', id);
    openForm({
      title: `${l.direction === 'taken' ? 'Repayment to' : 'Payment from'} ${l.person}`, values: { amount: round1(loanLeft(l)), date: today() },
      fields: [{ name: 'amount', label: `Amount (${l.currency})`, type: 'number', step: '0.01', min: 0, required: true, half: true },
        { name: 'date', label: 'Date', type: 'date', half: true }, { name: 'note', label: 'Note' }],
      onSave: (v) => { (l.payments ||= []).push({ id: uid(), ...v, date: v.date || today() }); if (loanLeft(l) <= 0.004) toast('Loan settled!'); },
    });
  },
  delPayment: (id) => { const [lid, pid] = split(id); const l = find('loans', lid); if (confirm('Delete this payment?')) { l.payments = l.payments.filter((p) => p.id !== pid); commit(); } },
});

// ---------- Spending ----------
function monthTotals(ym) {
  const tx = db.transactions.filter((t) => t.date?.startsWith(ym));
  const income = tx.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const expense = tx.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
  const byCat = {};
  tx.filter((t) => t.type === 'expense').forEach((t) => { byCat[t.category] = (byCat[t.category] || 0) + Number(t.amount); });
  return { tx, income, expense, net: income - expense, byCat };
}
finTabs.spending = () => {
  const ym = state.moneyMonth, m = monthTotals(ym);
  const cats = [...new Set([...Object.keys(db.budgets), ...Object.keys(m.byCat)])].sort((a, b) => (m.byCat[b] || 0) - (m.byCat[a] || 0));
  const budgetTotal = Object.values(db.budgets).reduce((s, n) => s + Number(n), 0);
  const tx = [...m.tx].sort((a, b) => b.date.localeCompare(a.date));
  const trend = []; for (let i = 5; i >= 0; i--) { const k = addMonths(ym, -i); trend.push([k, monthTotals(k)]); }
  const maxT = Math.max(1, ...trend.map(([, x]) => Math.max(x.income, x.expense)));
  return `
  <div class="toolbar">${monthNav('moneyMonth')}<span class="grow"></span><button class="btn sm" data-action="editBudgets">Set budgets</button></div>
  <div class="stats">
    <div class="stat"><div class="label">Income</div><div class="value good">${money(m.income)}</div></div>
    <div class="stat"><div class="label">Expenses</div><div class="value bad">${money(m.expense)}</div></div>
    <div class="stat"><div class="label">Net</div><div class="value ${m.net >= 0 ? 'good' : 'bad'}">${money(m.net)}</div></div>
    <div class="stat"><div class="label">Savings rate</div><div class="value">${m.income ? Math.round((m.net / m.income) * 100) : 0}%</div></div>
  </div>
  <div class="grid wide">
    <div class="card"><h2>${hi('receipt')} Spending by category${budgetTotal ? `<span class="spacer"></span><span class="small muted">Budget ${money(budgetTotal)}</span>` : ''}</h2>
      ${cats.length ? cats.map((c) => {
        const spent = m.byCat[c] || 0, b = Number(db.budgets[c] || 0);
        const pct = b ? (spent / b) * 100 : m.expense ? (spent / m.expense) * 100 : 0;
        return `<div style="margin-bottom:10px"><div class="row small"><span class="grow">${esc(c)}</span><b>${money(spent)}</b>${b ? `<span class="muted">/ ${money(b)}</span>` : ''}</div>${bar(pct, b && spent > b ? 'over' : '')}</div>`;
      }).join('') : empty('receipt', 'No spending recorded this month.')}
    </div>
    <div class="card"><h2>${hi('chart')} 6-month trend</h2>
      <div class="chart" style="height:150px">${trend.map(([k, x]) => `<div class="col" title="${esc(fmtMonth(k))}: +${money(x.income)} / −${money(x.expense)}">
        <div class="pair"><i style="height:${(x.income / maxT) * 100}%;background:var(--good)"></i><i style="height:${(x.expense / maxT) * 100}%;background:var(--bad)"></i></div>
        <small>${esc(parseYmd(k + '-01').toLocaleDateString(undefined, { month: 'short' }))}</small></div>`).join('')}</div>
      <div class="small muted row"><span><i class="sw" style="background:var(--good)"></i> Income</span><span><i class="sw" style="background:var(--bad)"></i> Expenses</span></div>
    </div>
  </div>
  <div class="card" style="margin-top:16px"><h2>${hi('cash')} Transactions<span class="spacer"></span>
    <button class="btn sm" data-action="newTx" data-id="expense">+ Expense</button><button class="btn sm" data-action="newTx" data-id="income">+ Income</button></h2>
    ${tx.length ? `<ul class="items">${tx.map((x) => `<li class="item clickable" data-action="editTx" data-id="${x.id}" style="align-items:center">
      <div class="body"><div class="title">${esc(x.note || x.category)}</div><div class="meta"><span>${esc(fmtDate(x.date))}</span><span class="chip">${esc(x.category)}</span></div></div>
      <b class="${x.type === 'income' ? 'good' : 'bad'}">${x.type === 'income' ? '+' : '−'}${money(x.amount)}</b></li>`).join('')}</ul>` : empty('cash', 'No transactions this month.')}
  </div>`;
};
function txForm(tx, type = 'expense') {
  const t = tx?.type || type;
  openForm({
    title: `${tx ? 'Edit' : 'Add'} ${t}`,
    values: { date: today(), category: t === 'income' ? INCOME_CATS[0] : EXPENSE_CATS[1], ...tx },
    fields: [
      { name: 'amount', label: `Amount (${db.settings.currency})`, type: 'number', step: '0.01', min: 0, required: true, half: true },
      { name: 'date', label: 'Date', type: 'date', half: true },
      { name: 'category', label: 'Category', type: 'select', options: t === 'income' ? INCOME_CATS : EXPENSE_CATS, half: true },
      { name: 'note', label: 'Description', half: true, placeholder: 'Groceries, rent…' },
    ],
    onSave: (v) => { v.date ||= today(); if (tx) Object.assign(tx, v); else db.transactions.push({ id: uid(), type: t, ...v }); },
    onDelete: tx ? () => remove('transactions', tx.id) : null,
  });
}
Object.assign(actions, {
  newTx: (type) => { state.financeTab = 'spending'; txForm(null, type === 'income' ? 'income' : 'expense'); },
  editTx: (id) => txForm(find('transactions', id)),
  editBudgets: () => openForm({
    title: 'Monthly budgets', values: db.budgets,
    fields: EXPENSE_CATS.map((c) => ({ name: c, label: c, type: 'number', step: '1', min: 0, half: true, placeholder: 'No limit' })),
    onSave: (v) => { db.budgets = Object.fromEntries(Object.entries(v).filter(([, n]) => n)); },
  }),
});
