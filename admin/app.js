const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
const api = (p, init) => fetch(`/.netlify/functions/api/${p}`, Object.assign({ headers: { 'content-type': 'application/json' } }, init));

// Tabs
$$('button.tab').forEach(btn => btn.addEventListener('click', () => {
  $$('button.tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  $$('section').forEach(s => s.classList.remove('active'));
  document.querySelector(`#${btn.dataset.tab}`).classList.add('active');
}));

// Monitor
async function loadHealth() {
  const res = await api('health'); const data = await res.json();
  const el = document.getElementById('health');
  el.textContent = data.ok ? `OK in ${data.latency_ms} ms` : 'ERROR';
  el.className = data.ok ? 'ok' : 'bad';
  document.getElementById('healthJson').textContent = JSON.stringify(data, null, 2);
}
async function loadStats() {
  const res = await api('stats'); const data = await res.json();
  const body = document.getElementById('statsBody'); body.innerHTML = '';
  for (const [t, c] of Object.entries(data.counts || {})) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${t}</td><td>${c}</td>`;
    body.appendChild(tr);
  }
}
document.getElementById('refreshStats').addEventListener('click', loadStats);

// Students
async function renderStudents() {
  const res = await api('students'); const list = await res.json();
  const body = document.getElementById('studentsBody'); body.innerHTML = '';
  for (const s of list) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${s.first_name} ${s.last_name}</td>
      <td>${s.birth_date ?? ''}</td>
      <td>${s.email ?? ''}</td>
      <td>${s.phone ?? ''}</td>
      <td><button data-id="${s.id}" class="delStudent">Delete</button></td>`;
    body.appendChild(tr);
  }
  $$('.delStudent').forEach(b => b.addEventListener('click', async () => {
    if (!confirm('Delete this student?')) return;
    await api(`students/${b.dataset.id}`, { method: 'DELETE' });
    await renderStudents(); await loadStats(); await refreshEnrollSelectors();
  }));
}
document.getElementById('studentForm').addEventListener('submit', async (e) => {
  e.preventDefault(); const fd = new FormData(e.target); const o = Object.fromEntries(fd.entries());
  await api('students', { method: 'POST', body: JSON.stringify(o) });
  e.target.reset(); await renderStudents(); await loadStats(); await refreshEnrollSelectors();
});
document.getElementById('reloadStudents').addEventListener('click', renderStudents);

// Courses
async function renderCourses() {
  const res = await api('courses'); const list = await res.json();
  const body = document.getElementById('coursesBody'); body.innerHTML = '';
  for (const c of list) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${c.code}</td>
      <td>${c.title}</td>
      <td>${c.credits ?? ''}</td>
      <td>${c.academic_year ?? ''}</td>
      <td><button data-id="${c.id}" class="delCourse">Delete</button></td>`;
    body.appendChild(tr);
  }
  $$('.delCourse').forEach(b => b.addEventListener('click', async () => {
    if (!confirm('Delete this course?')) return;
    await api(`courses/${b.dataset.id}`, { method: 'DELETE' });
    await renderCourses(); await loadStats(); await refreshEnrollSelectors();
  }));
}
document.getElementById('courseForm').addEventListener('submit', async (e) => {
  e.preventDefault(); const fd = new FormData(e.target); const o = Object.fromEntries(fd.entries());
  if (o.credits === '') delete o.credits; if (o.academic_year === '') delete o.academic_year;
  await api('courses', { method: 'POST', body: JSON.stringify(o) });
  e.target.reset(); await renderCourses(); await loadStats(); await refreshEnrollSelectors();
});
document.getElementById('reloadCourses').addEventListener('click', renderCourses);

// Enrollments
async function refreshEnrollSelectors() {
  const [students, courses] = await Promise.all([
    api('students').then(r=>r.json()),
    api('courses').then(r=>r.json())
  ]);
  const sSel = document.getElementById('enrollStudent');
  const cSel = document.getElementById('enrollCourse');
  sSel.innerHTML = students.map(s => `<option value="${s.id}">${s.last_name}, ${s.first_name}</option>`).join('');
  cSel.innerHTML = courses.map(c => `<option value="${c.id}">${c.code} — ${c.title}</option>`).join('');
}
async function renderEnrollments() {
  const res = await api('enrollments'); const list = await res.json();
  const body = document.getElementById('enrollBody'); body.innerHTML = '';
  for (const e of list) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${e.first_name} ${e.last_name}</td><td>${e.code} — ${e.title}</td><td>${e.term ?? ''}</td><td>${e.start_date ?? ''}</td><td>${e.end_date ?? ''}</td>`;
    body.appendChild(tr);
  }
}
document.getElementById('enrollForm').addEventListener('submit', async (e) => {
  e.preventDefault(); const o = Object.fromEntries(new FormData(e.target).entries());
  await api('enrollments', { method: 'POST', body: JSON.stringify(o) });
  e.target.reset(); await renderEnrollments(); await loadStats();
});
document.getElementById('reloadEnrollments').addEventListener('click', renderEnrollments);

// Init
(async function init(){
  await loadHealth(); await loadStats();
  await renderStudents(); await renderCourses();
  await refreshEnrollSelectors(); await renderEnrollments();
})();