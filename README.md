# LifeOS

A personal app that organises every part of your life in one place, in shades of pink and purple with its own custom icon set. It needs no account and no server, and your data never leaves your device. It works offline and can be installed on your phone.

## Sections

### Planner
- **Today**: a dashboard with today's tasks, events, your duty and the on-call doctor, meds, meals, shopping list, study goals, wellbeing, finances, next trip and a journal prompt.
- **Weekly to-do**
  - Seven day cards, **Sunday to Saturday**, plus a separate **Anytime this week** list. The week starts fresh every Sunday, and unfinished tasks can be moved into the new week.
  - Ticked tasks are crossed out. Tap the star (or start a quick-add with `!`) to **highlight a priority** task.
  - Your duty and the on-call doctor show on each day.
- **Monthly to-do**: a **separate list from the weekly to-do**.
  - Opens on a month calendar. Tap a day to add tasks or events to it.
  - A **general to-do for the month** holds things that can be done any time that month.
  - Lists every task and event for the month, with All / To do / Done / Priority filters.
  - **Reminders** can be set on tasks and events. Done tasks are crossed out and priority ones highlighted.
- **Duty roster**
  - **Upload the full roster** for each week (photo, screenshot or PDF). It's stored on your device.
  - **Duties are read from the roster automatically.** Claude finds every entry for your name (set in Settings, e.g. *Dr Maushan*): your shift and times, who you're working with, days off and the on-call doctor. You check everything on a review screen before it's saved. This needs your own Anthropic API key (Settings → Roster reading), and costs a few US cents per roster. The photo is sent to Anthropic to be read, and the key is kept only on your device.
  - For each day, write your duty (from reusable shift types or a custom duty), **who you're working with** and **the on-call doctor**.
  - Copy last week's duties, see total hours, add the week to your phone calendar, and keep notes for the week.

### Home & health
- **Meal prep**: Sunday to Saturday, with Breakfast, Lunch, Dinner and Snacks. Calculates protein, carbs, fat and calories for each meal, day and week against your targets. Foods are remembered, and the week's ingredients can be sent to the shopping list.
- **Shopping list**: bought items are crossed out, and priority items are highlighted and sorted to the top.
- **Health** (in tabs)
  - **Daily**: mood, water, sleep, exercise, steps and notes, with trend charts.
  - **Body**: **weight, waist, arms and hips**. Each has its own trend graph, and a combined graph shows how **all measurements** have changed since your first entry. Also shows your waist-to-hip ratio.
  - **Cycle**: a month calendar showing **which day of your cycle** each date is, a "Day X of your cycle" summary with the current phase, the predicted next period and the fertile window.
  - **Poop**: a month calendar. Select a day to see **how many times**, the **consistency of each one** (Bristol scale), and **whether you took a laxative** (and which one).
  - **Meds**: a month calendar. Select a day to tick each medication for **morning, afternoon or night** and see what was taken when. Also shows how consistently you've taken each medication this month.

### Money & travel
- **Finances**
  - **Savings** in **MVR and USD**, with combined totals at an exchange rate you can change.
  - **Loans taken and given**, with repayments and due dates.
  - **Spending** and budgets.
- **Travel plans**: day-by-day **itineraries**, a packing list, and export to your phone calendar.

### Personal
- **Journal** with mood and a daily prompt.
- **Study plan**
  - **Topics to revise**, grouped by subject. Each topic has a status (To revise, Revising, Confident), a revision log, an optional deadline and a priority highlight.
  - **Weekly goals**, plus daily study hours against a weekly target.
- **Habits**, **Goals** and **Notes**.

## Reminders

LifeOS shows a reminder (and a system notification, if you allow them) while the app is open, including in a background tab. For reminders that **always** reach you, even when LifeOS is closed, tap **Add to phone calendar** on any task, event, trip plan or duty week. This downloads a calendar file with the alert built in, and your phone's calendar does the reminding.

## Run it

It is plain HTML, CSS and JavaScript. There is nothing to install or build.

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

**Install it on your phone:** host the folder on any static host (e.g. GitHub Pages or Netlify), open it in your phone's browser and choose **Add to Home Screen**. After that it works offline.

## Your data

Everything is saved in your browser's `localStorage` on this device. Use **Settings Export backup** regularly, and to move your data to another device (**Import backup**). Clearing your browser's site data deletes your LifeOS data. Uploaded roster files are kept on the device but are not part of the backup file.

## Keyboard shortcuts

`n` new task · `e` new event · `j` new journal entry · `/` search · `1`–`9` jump to a section

## Files

| File | Contents |
| --- | --- |
| `index.html`, `styles.css` | App shell and styling (light/dark mode, mobile layout) |
| `js/icons.js` | Custom SVG icon set |
| `js/core.js` | Utilities, storage, forms, calendar and chart helpers, tasks and events, reminders, calendar export |
| `js/planner.js` | Today, Weekly to-do, Monthly to-do, Duty roster |
| `js/life.js` | Meal prep, Shopping list, Health |
| `js/money.js` | Savings, Loans, Spending |
| `js/travel.js` | Travel itineraries and packing |
| `js/more.js` | Journal, Habits, Goals, Notes, Settings |
| `js/roster-ai.js` | Reads roster photos with Claude and fills in your duties |
| `js/vendor/anthropic-sdk.mjs` | Anthropic TypeScript SDK 1.3.0, bundled for the browser with esbuild (licence in `js/vendor/`) |
| `js/study.js` | Study plan: topics to revise, weekly goals, study hours |
| `js/main.js` | Navigation, rendering, event wiring |
| `sw.js`, `manifest.json`, `icon.svg` | Offline support and installing as an app |
