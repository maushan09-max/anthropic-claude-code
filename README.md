# LifeOS

A personal app that organises every part of your life in one place, in shades of pink and purple with its own custom icon set. It needs no account and no server, and your data never leaves your device. It works offline and can be installed on your phone.

## Sections

### Planner
- **Today**: a dashboard with today's tasks, events, your duty and the on-call doctor, meds, meals, shopping list, study goals, wellbeing, finances, next trip and a journal prompt.
- **Weekly to-do**
  - Seven day cards, **Sunday to Saturday**, plus a separate **Anytime this week** list. The week starts fresh every Sunday, and unfinished tasks can be moved into the new week.
  - Ticked tasks are crossed out. Tap the star (or start a quick-add with `!`) to **highlight a priority** task.
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
- **Travel plans**: comes with **Umrah (Dec 2026)** and **China (Mar 2027)** ready to fill in. Each trip has five tabs:
  - **Flights & trains**: departure and arrival airports or stations, dates and times, airline, flight number, booking reference, seat, cost and a reminder.
  - **Hotels**: check-in and check-out, number of nights, address, phone, booking reference and cost.
  - **Itinerary**: day by day, with flights and hotel check-ins and check-outs shown on the right days.
  - **Packing list**: starts with your own list in three groups: Luggage, Backpack while travelling, and Bag while on vacation. Tick items off, add your own, untick everything for the next trip, or save a list as your default for new trips.
  - **Budget & expenses**: set a budget in the trip's currency. Flight and hotel costs are counted automatically, and you log spending as you go, broken down by category.
  - The whole trip can be exported to your phone calendar.

### Personal
- **Journal** with mood and a daily prompt.
- **Study plan**
  - **Topics to revise**, grouped by subject. Each topic has a status (To revise, Revising, Confident), a revision log, an optional deadline and a priority highlight.
  - **Weekly goals**, plus daily study hours against a weekly target.
- **Habits**, **Goals** and **Notes**.

## More sections

- **Weekly review**: a summary of each week covering tasks, shifts and hours, leave, sleep, water and mood, meds, prayers, Quran, study hours, revisions and spending. It also shows what's coming up next week and has space to reflect.
- **Leave planner**: yearly allowances per leave type, leave that's planned, approved or taken, and the days left. Leave also shows on the duty roster.
- **Prayer & Quran**:
  - Tap each of the five daily prayers to mark it on time, late/qadha or missed. A month calendar and streaks show your progress, and qadha prayers are counted until made up. Period days logged in Cycle are marked as excused.
  - Quran reading shows your current page, juz and streak, with an optional goal to finish by a date.
- **Special dates**: birthdays and anniversaries with ages, gift ideas and reminders. They also appear on Today and the monthly calendar.
- **Countdowns**: exams, events and upcoming trips, on Today and in the Study plan.
- **Study revision reminders**: each time you mark a topic revised, it comes back for review after 1, 3, 7, 14, 30, 60 and 120 days.
- **Savings goals** (Finances): a target, a deadline, deposits, and how much to put aside each month. A goal can be linked to a trip.
- **Payday** (Finances): shows what's left until the next salary, after fixed monthly costs and what you've spent since payday.
- **Recipes** (Meal prep): macros per serving are worked out from the ingredients. A built-in list of about 60 common foods fills in macros automatically, and AI can fill in the rest. A recipe can be added to any meal.
- **Search**: the magnifier at the top searches everything.
- **Menu sections**: hide sections you don't use (Settings).
- **Google Drive backup**: automatic backup to your own Google Drive, plus restore. It needs a one-time Google setup (see Settings), and you reconnect with one tap about once an hour.
- **Roster on-call rule**: a shift starting between midnight and 8 AM shows the previous day's on-call doctor.

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

- **Where it's stored:** only on your device, inside the browser storage of the installed app. Your notes, tasks and health records use `localStorage`, and roster photos use `IndexedDB`. Nothing is sent to GitHub or any server. The only exception is roster reading: the photo is sent to Anthropic, using your own API key.
- **Permanent storage:** LifeOS asks the browser to keep its storage permanently, so it isn't cleared automatically when space runs low. **Settings → Backup & restore** shows whether it's protected and how much space your data uses.
- **Backups:** **Settings → Export backup** creates one file containing everything except roster photos and your API key. On a phone it opens the share sheet, so you can save it to Files, iCloud Drive or Google Drive, or email it to yourself. **Today** reminds you if your last backup was more than two weeks ago.
- **Restoring or moving to a new phone:** install LifeOS on the new device, then use **Settings → Import backup**.
- **Ways to lose data without a backup:**
  - deleting the Home Screen app
  - clearing the browser's website data
  - losing the phone
- **Damaged data is kept:** if the saved data ever can't be read, LifeOS keeps a copy of it instead of overwriting it.

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
