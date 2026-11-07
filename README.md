# ◎ LifeOS

A personal app that organises every part of your life in one place. It needs no account and no server, and your data never leaves your device.

## What it covers

| Area | What you can do |
| --- | --- |
| ☀️ **Today** | A dashboard with tasks due, today's schedule, habit check-ins, mood and water, this month's money, goal progress and a journal prompt |
| ✅ **Tasks** | Areas of life (Work, Home, Health, Finance, …), priorities, due dates and repeating tasks (daily/weekly/monthly/yearly); filter by Today, Upcoming, No date or Completed; search |
| 📅 **Calendar** | Month view, events with times and locations, repeating events (birthdays, weekly classes), and tasks shown on their due dates |
| 🔁 **Habits** | Daily check-ins, current and best streaks, 30-day completion rate and a heatmap |
| 🎯 **Goals** | Target dates, a "why", milestones with automatic progress, or a manual progress slider |
| 💰 **Money** | Income and expenses by category, monthly budgets with overspend warnings, savings rate and a 6-month trend |
| ❤️ **Health** | Daily mood, water, sleep, exercise, steps, weight and notes, with 14-day trend charts |
| 📔 **Journal** | Dated entries with mood, a daily reflection prompt and search |
| 📝 **Notes** | Pinned notes, tags and search |
| 🛒 **Lists** | Checklists for groceries, packing, books to read, gift ideas, … |
| ⚙️ **Settings** | Your name, currency, light/dark theme, JSON backup export/import and erase all |

## Run it

It is plain HTML, CSS and JavaScript. There is nothing to install or build.

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

You can also open `index.html` directly in a browser, but offline mode and installing need it served over http(s).

**Install it on your phone or desktop:** host the folder anywhere static (GitHub Pages, Netlify, …), open it in your browser and choose **Add to Home Screen** / **Install app**. After that it works offline.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `n` | New task |
| `e` | New event |
| `j` | New journal entry |
| `/` | Focus search |
| `1`–`9` | Jump to a section |

## Your data

Everything is saved in your browser's `localStorage` on this device. Use **Settings → Export backup** regularly, and to move your data to another device (**Import backup**). Clearing your browser's site data deletes your LifeOS data.

## Files

- `index.html`: app shell
- `styles.css`: styling, with automatic light/dark mode and a mobile layout
- `app.js`: all app logic (views, storage, forms)
- `sw.js`, `manifest.json`, `icon.svg`: offline support and installing as an app
