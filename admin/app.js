const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
const api = (p, init) => fetch(`/.netlify/functions/api/${p}`, Object.assign({ headers: { 'content-type': 'application/json' } }, init));

// tab switching
$$("button.tab").forEach(btn =>
  btn.addEventListener('click', () => {
    $$("button.tab").forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    $$("section").forEach(s => s.classList.remove('active'));
    $(`#${btn.dataset.tab}`).classList.add('active');
  })
);

// TODO: Paste in the logic from your earlier `index.html` <script> (loadHealth, loadStats, renderStudents, renderCourses, renderEnrollments, etc.)
