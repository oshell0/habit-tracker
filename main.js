/*
  Habit Tracker — organized, modular, and tidy ✨
  ------------------------------------------------
  What changed (high-level):
  - Single IIFE to avoid leaking globals. 
  - Clear file structure by feature sections: utils → storage → dates → state → UI(Home) → UI(Stats).
  - Consistent constants, IDs, storage keys, and helper functions.
  - One DOMContentLoaded with page detection; no duplicate inits.
  - Defensive checks so code is safe on any page.
  - Small performance niceties (e.g., throttled pointer dots).
*/

(() => {
  'use strict';

  /* =========================
   *  CONSTANTS & HELPERS
   * ========================= */
  const ACCENT = cssVar("--accent");
    const ACCENT3 = cssVar("--accent3");

  const LINE_WIDTH = cssNum("--chart-line-width");
  const STORAGE_KEY = 'habit_state_v1';
  const DAYS = [0,1,2,3,4,5,6]; // Sun..Sat
  const dayShort = ['S','M','T','W','T','F','S'];

  const qs  = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function fmtMDY(d) {
    return `${d.getMonth()+1}/${d.getDate()}/${d.getFullYear()}`;
  }

  function clamp01(x) { return Math.max(0, Math.min(1, x)); }

  // Lightweight throttle for high-frequency events
  function throttle(fn, ms) {
    let last = 0, timer = null, savedArgs = null, savedThis = null;
    return function throttled(...args) {
      const now = Date.now();
      savedArgs = args; savedThis = this;
      const run = () => { last = Date.now(); timer = null; fn.apply(savedThis, savedArgs); };
      if (!last || now - last >= ms) run();
      else if (!timer) timer = setTimeout(run, ms - (now - last));
    };
  }
  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function cssNum(name) {
    const v = cssVar(name);
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  }

  // make a text-based cursor using canvas
  function makeCursor(char = "✦", size = 24, color = "#ff87b1ff") {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;

    const ctx = canvas.getContext("2d");
    ctx.font = `${size - 4}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = color;
    ctx.fillText(char, size / 2, size / 2);

    return `url(${canvas.toDataURL()}) ${size/2} ${size/2}, auto`;
  }


  /* =========================
   *  STORAGE
   * ========================= */

  function load() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { habits: [], checks: {} }; }
    catch { return { habits: [], checks: {} }; }
  }

  function save(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function uid() { return 'h_' + Math.random().toString(36).slice(2, 9); }

  /* =========================
   *  DATE HELPERS
   * ========================= */

  // Sunday-start week
  function startOfWeek(d = new Date()) {
    const x = new Date(d);
    const diff = x.getDay(); // 0=Sun..6=Sat
    x.setDate(x.getDate() - diff);
    x.setHours(0,0,0,0);
    return x;
  }

  function weekKey(d = new Date()) {
    return startOfWeek(d).toISOString().slice(0,10);
  }

  /* =========================
   *  STATE (in-memory)
   * ========================= */

  const state = load();

  // Navigation cursors (Home & Stats)
  let currentHomeWeekStart = startOfWeek(new Date());
  let currentStatsWeekStart = startOfWeek(new Date());
  let currentMonth = new Date(); currentMonth.setDate(1);

  /* =========================
   *  FUN UI: Pointer dots (optional)
   * ========================= */

  function enablePointerDots() {
    const handler = throttle((e) => {
      const dot = document.createElement('div');
      dot.className = 'dot';
      dot.style.left = e.pageX + 'px';
      dot.style.top  = e.pageY + 'px';
      document.body.appendChild(dot);
      setTimeout(() => dot.remove(), 600);
    }, 30);
    window.addEventListener('mousemove', handler, { passive: true });
  }

  /* =========================
   *  HOME PAGE
   * ========================= */

  function setHomeWeekTitle() {
    const el = qs('#homeWeekTitle');
    if (!el) return;
    const start = new Date(currentHomeWeekStart);
    const end = new Date(currentHomeWeekStart); end.setDate(end.getDate() + 6);
    el.textContent = `${fmtMDY(start)} – ${fmtMDY(end)}`;
  }

  function wireHomeWeekNav() {
    const prev = qs('#homePrevWeek');
    const next = qs('#homeNextWeek');
    const today = qs('#homeToday');
    if (prev && !prev._wired) {
      prev._wired = true;
      prev.addEventListener('click', () => {
        currentHomeWeekStart.setDate(currentHomeWeekStart.getDate() - 7);
        setHomeWeekTitle();
        renderHome();
      });
    }
    if (next && !next._wired) {
      next._wired = true;
      next.addEventListener('click', () => {
        currentHomeWeekStart.setDate(currentHomeWeekStart.getDate() + 7);
        setHomeWeekTitle();
        renderHome();
      });
    }
    if (today && !today._wired) {
      today._wired = true;
      today.addEventListener('click', () => {
        currentHomeWeekStart = startOfWeek(new Date());
        setHomeWeekTitle();
        renderHome();
      });
    }
  }

  function renderHome() {
    const tbody = qs('#habitBody');
    if (!tbody) return; // Not on Home page

    const wk = weekKey(currentHomeWeekStart);
    tbody.innerHTML = '';

    state.habits.forEach(habit => {
      const tr = document.createElement('tr');

      // Row label
      const th = document.createElement('th');
      th.scope = 'row';
      th.textContent = habit.name;
      tr.appendChild(th);

      // 7 day checkboxes
      const habitChecks = ((state.checks[habit.id] || {})[wk]) || {};
      DAYS.forEach(dayIndex => {
        const td = document.createElement('td');
        const label = document.createElement('label');
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = !!habitChecks[dayIndex];
        cb.dataset.habitId = habit.id;
        cb.dataset.day = String(dayIndex);
        cb.setAttribute('aria-label', `${habit.name} – ${dayShort[dayIndex]}`);
        label.appendChild(cb);
        td.appendChild(label);
        tr.appendChild(td);
      });

      // delete button
      const tdDel = document.createElement('td');
      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'btn btn-secondary';
      delBtn.dataset.deleteHabitId = habit.id;
      delBtn.textContent = 'Delete';
      tdDel.appendChild(delBtn);
      tr.appendChild(tdDel);

      tbody.appendChild(tr);
    });
  }

  function wireHomeInteractions() {
    const addForm = qs('#addHabitForm');
    if (addForm && !addForm._wired) {
      addForm._wired = true;
      addForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = qs('#newHabitName');
        const name = input.value.trim();
        if (!name) return;
        state.habits.push({ id: uid(), name, createdAt: new Date().toISOString().slice(0,10) });
        save(state);
        input.value = '';
        renderHome();
      });
    }

    const habitBodyEl = qs('#habitBody');
    if (habitBodyEl && !habitBodyEl._wired) {
      habitBodyEl._wired = true;

      // toggle checkboxes
      habitBodyEl.addEventListener('change', (e) => {
        const cb = e.target;
        if (!(cb instanceof HTMLInputElement)) return;
        if (cb.matches('input[type="checkbox"][data-habit-id]')) {
          const id = cb.dataset.habitId;
          const day = Number(cb.dataset.day);
          const wk = weekKey(currentHomeWeekStart);
          state.checks[id] ??= {};
          state.checks[id][wk] ??= {};
          state.checks[id][wk][day] = cb.checked;
          save(state);
        }
      });

      // delete habit
      habitBodyEl.addEventListener('click', (e) => {
        const btn = (e.target instanceof Element) && e.target.closest('button[data-delete-habit-id]');
        if (!btn) return;
        const id = btn.dataset.deleteHabitId;
        state.habits = state.habits.filter(h => h.id !== id);
        delete state.checks[id];
        save(state);
        renderHome();
      });
    }

    const resetBtn = qs('#resetWeekBtn');
    if (resetBtn && !resetBtn._wired) {
      resetBtn._wired = true;
      resetBtn.addEventListener('click', () => {
        const wk = weekKey(currentHomeWeekStart);
        state.habits.forEach(h => {
          if (state.checks[h.id]) {
            delete state.checks[h.id][wk];
          }
        });
        save(state);
        renderHome();
      });
    }
  }

  /* =========================
   *  STATS PAGE
   * ========================= */

  // Count how many habits completed on a specific date
  function dayCounts(date) {
    const wk = weekKey(date);
    const dayIdx = new Date(date).getDay(); // 0..6
    let total = 0, done = 0;

    state.habits.forEach(h => {
      const created = new Date(h.createdAt);
      if (created <= date) {
        total++;
        if (state.checks[h.id]?.[wk]?.[dayIdx]) done++;
      }
    });
    return { done, total };
  }

  function renderWeeklyChart() {
    const canvas = qs('#weeklyChart');
    const title  = qs('#weekTitle');
    const summary = qs('#weeklySummary');
    if (!canvas) return; // not on Stats page

    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;

    // collect data
    const points = [];
    let maxY = 1;
    for (let i = 0; i < 7; i++) {
      const d = new Date(currentStatsWeekStart);
      d.setDate(d.getDate() + i);
      const { done } = dayCounts(d);
      points.push(done);
      if (done > maxY) maxY = done;
    }
    maxY = Math.max(maxY, 1);

    // clear
    ctx.clearRect(0, 0, w, h);

    // layout
    const padL = 40, padR = 10, padT = 10, padB = 28;
    const pw = w - padL - padR, ph = h - padT - padB;

    // grid + y labels
    ctx.strokeStyle = '#e5e7eb'; ctx.lineWidth = 1;
    ctx.fillStyle = '#666'; ctx.font = '12px system-ui';
    for (let y = 0; y <= maxY; y++) {
      const yy = padT + ph - (y / maxY) * ph;
      ctx.beginPath(); ctx.moveTo(padL, yy); ctx.lineTo(w - padR, yy); ctx.stroke();
      ctx.fillText(String(y), 8, yy + 4);
    }

    // x labels
    ctx.fillStyle = '#666'; ctx.textAlign = 'center';
    for (let i = 0; i < 7; i++) {
      const xx = padL + (i / 6) * pw;
      ctx.fillText(dayShort[i], xx, h - 8);
    }

    // line
    ctx.strokeStyle = ACCENT;
    ctx.lineWidth = LINE_WIDTH;
    ctx.beginPath();
    points.forEach((val, i) => {
      const x = padL + (i / 6) * pw;
      const y = padT + ph - (val / maxY) * ph;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();

    
    // titles
    const end = new Date(currentStatsWeekStart); end.setDate(end.getDate() + 6);
    if (title)   title.textContent = `${currentStatsWeekStart.toLocaleDateString()} – ${end.toLocaleDateString()}`;
    if (summary) summary.textContent = `Total completed this week: ${points.reduce((a, b) => a + b, 0)}`;
  }

  function wireStatsWeekNav() {
    const prev = qs('#prevWeek');
    const next = qs('#nextWeek');
    if (prev && !prev._wired) {
      prev._wired = true;
      prev.addEventListener('click', () => { currentStatsWeekStart.setDate(currentStatsWeekStart.getDate() - 7); renderWeeklyChart(); });
    }
    if (next && !next._wired) {
      next._wired = true;
      next.addEventListener('click', () => { currentStatsWeekStart.setDate(currentStatsWeekStart.getDate() + 7); renderWeeklyChart(); });
    }
  }

  function ringSVG(percent) {
    const R = 18, C = 2 * Math.PI * R;
    const on = clamp01(percent) * C;
    const off = C - on;

    return (
      `<svg viewBox="0 0 44 44" aria-hidden="true">` +
        `<circle class="ring ring-bg" cx="22" cy="22" r="18"></circle>` +
        `<circle class="ring progress" cx="22" cy="22" r="18" ` +
          `stroke-dasharray="${on} ${off}"></circle>` +
      `</svg>`
    );
}


  function renderCalendar() {
    const grid = qs('#calendar');
    const title = qs('#monthTitle');
    if (!grid) return; // not on Stats page

    const y = currentMonth.getFullYear();
    const m = currentMonth.getMonth();
    const first = new Date(y, m, 1);
    const startWeekday = first.getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();

    grid.innerHTML = '';
    if (title) title.textContent = currentMonth.toLocaleString(undefined, { month: 'long', year: 'numeric' });

    // leading blanks
    for (let i = 0; i < startWeekday; i++) {
      const empty = document.createElement('div'); empty.className = 'cell'; grid.appendChild(empty);
    }

    // days
    for (let d = 1; d <= daysInMonth; d++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      const date = new Date(y, m, d);
      const { done, total } = dayCounts(date);
      const pct = total ? done / total : 0;
      cell.innerHTML = ringSVG(pct) + `<span class="daynum">${d}</span>`;
      grid.appendChild(cell);
    }

    // nav
    const prev = qs('#prevMonth');
    const next = qs('#nextMonth');
    if (prev && !prev._wired) {
      prev._wired = true;
      prev.addEventListener('click', () => { currentMonth.setMonth(currentMonth.getMonth() - 1); renderCalendar(); });
    }
    if (next && !next._wired) {
      next._wired = true;
      next.addEventListener('click', () => { currentMonth.setMonth(currentMonth.getMonth() + 1); renderCalendar(); });
    }
  }

  /* =========================
   *  INIT (runs once)
   * ========================= */

  document.addEventListener('DOMContentLoaded', () => {
    console.log('JS is connected!');

    // Optional fun effect; comment out if you prefer minimal
    enablePointerDots();

    // HOME
    if (qs('#habitBody')) {
      setHomeWeekTitle();
      wireHomeWeekNav();
      wireHomeInteractions();
      renderHome();
    }

    // STATS
    if (qs('#weeklyChart') || qs('#calendar')) {
      wireStatsWeekNav();
      renderWeeklyChart();
      renderCalendar();
    }
    // set ✦ cursor with your CSS accent color
    const accent3 = getComputedStyle(document.documentElement)
                   .getPropertyValue("--accent3").trim();
    document.body.style.cursor = makeCursor("✦", 28, accent3);
  }, { once: true });

  
})();
