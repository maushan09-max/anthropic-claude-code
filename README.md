# LifeOS

A personal app that organises every part of your life in one place, in shades of pink and purple with its own custom icon set. It needs no account and no server, and your data never leaves your device. It works offline and can be installed on your phone.

## Sections

### Planner
- **Today**: a dashboard with today's tasks, anytime-this-week tasks, events, today's duty, today's meals and macros, meds to take, priority shopping, mood and water, savings and loans, next trip, and a journal prompt.
- **Weekly to-do**
  - Seven day cards, **Sunday Saturday**, plus a separate **Anytime this week** list for tasks that can be done any day.
  - The week **starts fresh every Sunday**. Unfinished tasks from earlier weeks can be moved into the new week with one tap.
  - Ticked tasks are **crossed out**. Tap to **highlight a priority** task, or type `!` at the start of a quick-add (e.g. `!Pay bills`).
- **Monthly to-do**
  - Opens on a **month calendar**. Tap a day to select it and add tasks or events to it.
  - **Every task and event for the month** is listed below the calendar, with All / To do / Done / Priority filters.
  - **Reminders** on tasks and events. You can set them to go off at the time, or 10 minutes to 1 week before.
  - Done tasks are crossed out and priority ones are highlighted.
- **Duty roster**
  - A weekly roster (Sun–Sat) built from reusable shift types (Morning, Evening, Night, Day off, or your own), or custom duties with an optional person and location.
  - Copy last week's roster, see total hours, add the week to your phone calendar, and keep notes for the week.
  - Duties also show on the weekly to-do and the Today page.

### Home & health
- **Meal prep**
  - Seven days (Sun–Sat) with Breakfast, Lunch, Dinner and Snacks.
  - Each meal is built from foods with amounts and **protein, carbs, fat and kcal**. Calories are calculated automatically (4·P + 4·C + 9·F) if you leave kcal blank.
  - Shows meal, day and week totals against your daily targets.
  - Foods are remembered and auto-filled the next time you type them.
  - A **prep & shopping list** adds up the ingredients for the whole week and can send them to Things to buy.
  - Copy last week's plan with one tap.
- **Things to buy**: shopping lists. Bought items are crossed out, priority items are highlighted and sorted to the top, and you can keep more than one list.
- **Health** (in tabs)
  - **Daily**: mood, water, sleep, exercise, steps and notes, with 14-day trend charts.
  - **Body**: height, weight and waist circumference, with **trend graphs**, BMI and waist-to-height ratio.
  - **Cycle**: a **month calendar** to log flow (spotting, light, medium, heavy) and symptoms. It works out your average cycle and period length, predicts the next period, and estimates the fertile window.
  - **Poop**: a **month calendar** to log how many times and the Bristol stool type, with monthly stats.
  - **Meds**: a grid of **every day of the month for each medication**. Tap to mark it taken; meds taken several times a day are counted dose by dose. Shows your adherence %.

### Money & travel
- **Finances**
  - **Savings**: accounts in **MVR and USD**, totals in each currency, and a combined total with an adjustable exchange rate. Record deposits, withdrawals or a new balance, and see a savings trend chart.
  - **Loans**: **loans taken** (money I owe) and **loans given** (money owed to me), with repayments, remaining balance, progress, due dates and an overdue warning.
  - **Spending**: monthly income and expenses, category budgets, and a 6-month trend.
- **Travel plans**: trips with a **day-by-day itinerary** (flights, stays, transport, activities, food) including times, booking references and costs. Each trip has a packing list, and the whole itinerary can be exported to your phone calendar.

### Personal
- **Journal** with mood and a daily prompt.
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

Everything is saved in your browser's `localStorage` on this device. Use **Settings Export backup** regularly, and to move your data to another device (**Import backup**). Clearing your browser's site data deletes your LifeOS data.

## Keyboard shortcuts

`n` new task · `e` new event · `j` new journal entry · `/` search · `1`–`9` jump to a section

## Files

| File | Contents |
| --- | --- |
| `index.html`, `styles.css` | App shell and styling (light/dark mode, mobile layout) |
| `js/icons.js` | Custom SVG icon set |
| `js/core.js` | Utilities, storage, forms, calendar and chart helpers, tasks and events, reminders, calendar export |
| `js/planner.js` | Today, Weekly to-do, Monthly to-do, Duty roster |
| `js/life.js` | Meal prep, Things to buy, Health |
| `js/money.js` | Savings, Loans, Spending |
| `js/travel.js` | Travel itineraries and packing |
| `js/more.js` | Journal, Habits, Goals, Notes, Settings |
| `js/main.js` | Navigation, rendering, event wiring |
| `sw.js`, `manifest.json`, `icon.svg` | Offline support and installing as an app |
