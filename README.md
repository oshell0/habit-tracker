# Habit Tracker ✦

A simple, cute, and customizable **habit tracker** built with vanilla JavaScript, HTML, and CSS.
Track your habits, view weekly progress charts, and see monthly completion stats — all with a ✦ sparkly aesthetic.

---

## Features

* Add, check off, and delete daily habits
* Weekly view with **checkbox table** for habits
* Stats page with:

  * 📈 Weekly line chart (auto-updates)
  * 📅 Monthly calendar with progress rings
* LocalStorage persistence (saves your habits & checks in the browser)
* Cute ✦ **custom cursor** + pastel pink theme

---

## Project Structure

```plaintext
.
├── index.html       # Home page with habit table
├── stats.html       # Stats page with chart + calendar
├── style.css        # Theme, layout, custom cursor
├── main.js          # App logic, rendering, storage
└── assets/          # (optional) images/icons
```

---

## Customization

* Change accent color in `:root` inside `style.css`:

  ```css
  :root {
    --accent: #ffbed5;   /* main pink */
    --accent2: #ffe6ef;  /* soft pink */
    --chart-line: var(--accent);
  }
  ```
* Cursor character or size can be changed in `makeCursor()` (inside `main.js`).

---

## 🚀 Getting Started

1. Clone this repo:

   ```bash
   git clone https://github.com/yourname/habit-tracker.git
   ```
2. Open `index.html` in your browser
3. Add your first habit and start tracking!

---

## Built With

* **HTML5**
* **CSS3** (Grid, variables, custom cursor)
* **Vanilla JavaScript** (Canvas API, localStorage)

---


## Future Improvements

* Add dark mode 
* Export/import data
* Daily reminders/notifications

---

## Credit

Made with love by Michelle Chung
