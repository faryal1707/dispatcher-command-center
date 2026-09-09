# 🚛 Dispatcher Command Center

A lightweight personal operating system for truck dispatchers.

## Features

- Daily missions and shift mode
- Fleet / driver tracker
- Load tracker with rate, miles, RPM, broker, source, and status
- Open issues desk for detention, breakdowns, PODs, rate cons, and more
- Searchable problem → solution case library
- Learning log for courses and questions
- XP and gamified progress
- End-of-day performance grade
- Browser-based local storage — no database required

## Run locally

Open `index.html` in your browser.

For a local development server:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Deploy with GitHub Pages

1. Create a new GitHub repository.
2. Upload `index.html`, `styles.css`, and `app.js`.
3. Open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select your `main` branch and `/root` folder.
6. Save. GitHub will publish the app as a website.

## Data storage

The current version stores data in your browser using `localStorage`.

That means:
- Your data stays on that browser/device.
- Refreshing the page does not delete it.
- Clearing browser storage will remove it.
- Data does not sync between computers yet.

## Good next upgrades

- User login and cloud sync
- Supabase or Firebase database
- File attachments for PODs, rate confirmations, and training notes
- Broker database
- Driver weekly performance reports
- Per-truck revenue targets
- Deadhead tracking
- Accessorial tracker
- Appointment reminders
- CSV/PDF exports
- AI coach and dispatcher case recommendations
- Admin / trainer mode

## Tech

- HTML
- CSS
- Vanilla JavaScript
- No frameworks
- No build step

---

Built as a personal virtual office for truck dispatch operations.
