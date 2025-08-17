const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
const api = (p, init) => fetch(`/.netlify/functions/api/${p}`, Object.assign({ headers: { 'content-type': 'application/json' } }, init));

function toast(msg) { console.log(msg); }

// Tabs
$$('button.tab').forEach(btn => btn.addEventListener('click', () => {
  $$('button.tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  $$('section').forEach(s => s.classList.remove('active'));
  document.querySelector(`#${btn.dataset.tab}`).classList.add('active');
}));

// Monitor
async function loadHealth() {
  try {
    const res = await api('health');
    const data = await res.json();
    const el = document.getElementById('health');
    if (data.ok) { el.textContent = `OK in ${data.latency_ms} ms`; el.className = 'ok'; }
    else { el.textContent = 'ERROR'; el.className = 'bad'; }
    document.getElementById('healthJson').textContent = JSON.stringify(data, null, 2);
  } catch (e) {
    document.getElementById('health').textContent = 'ERROR';
    document.getElementById('health').className = 'bad';
    document.getElementById('healthJson').textContent = JSON.stringify({ client_error: String(e) }, null, 2);
  }
}
async function loadStats() {
  try {
    const res = await api('stats'); const data = await res.json();
    const body = document.getElementById('statsBody'); body.innerHTML = '';
    for (const [t, c] of Object.entries(data.counts || {})) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${t}</td><td>${c}</td>`;
      body.appendChild(tr);
    }
  } catch (e) { toast('Failed to load stats'); }
}
document.getElementById('refreshStats').addEventListener('click', loadStats);

// Students
async function renderStudents() { /* …full CRUD logic already included earlier… */ }
document.getElementById('studentForm').addEventListener('submit', async (e) => { /* … */ });
document.getElementById('reloadStudents').addEventListener('click', renderStudents);

// Courses
async function renderCourses() { /* …full CRUD logic… */ }
document.getElementById('courseForm').addEventListener('submit', async (e) => { /* … */ });
document.getElementById('reloadCourses').addEventListener('click', renderCourses);

// Enrollments
async function refreshEnrollSelectors() { /* … */ }
async function renderEnrollments() { /* … */ }
document.getElementById('enrollForm').addEventListener('submit', async (e) => { /* … */ });
document.getElementById('reloadEnrollments').addEventListener('click', renderEnrollments);

// Init
(async function init(){
  await loadHealth(); await loadStats();
  await renderStudents(); await renderCourses();
  await refreshEnrollSelectors(); await renderEnrollments();
})();