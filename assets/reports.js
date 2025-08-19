// reports.js — adds Non-Core Hours = Total – Core and renders progress for each metric

const GOALS = {
  total: 1000,
  core: 600,
  coreHome: 400,
  nonCore: 400, // NEW
};

// --- DOM ----
const els = {
  student: document.getElementById('studentSelect'),
  year: document.getElementById('yearSelect'),
  groupBy: document.getElementById('groupBySelect'),

  total: document.getElementById('totalHours'),
  totalBar: document.getElementById('totalBar'),
  core: document.getElementById('coreHours'),
  coreBar: document.getElementById('coreBar'),
  coreHome: document.getElementById('coreHomeHours'),
  coreHomeBar: document.getElementById('coreHomeBar'),

  nonCore: document.getElementById('nonCoreHours'),
  nonCoreBar: document.getElementById('nonCoreBar'),

  hoursTableWrap: document.getElementById('hoursTableWrap'),
  printBtn: document.getElementById('printBtn'),
};

// --- boot ---
init().catch(console.error);

async function init() {
  await hydrateFilters();
  await loadAndRender();
  els.student.addEventListener('change', loadAndRender);
  els.year.addEventListener('change', loadAndRender);
  els.groupBy.addEventListener('change', loadAndRender);
  els.printBtn.addEventListener('click', () => window.print());
}

// Fetch options for student & year (adapt to your APIs)
async function hydrateFilters() {
  const students = await api('/api/students/list');
  populateSelect(els.student, students.map(s => ({ value: s.id, label: s.name })));

  const years = await api('/api/years/list');
  populateSelect(els.year, years.map(y => ({ value: y.id, label: y.label })));
}

function populateSelect(select, items) {
  select.innerHTML = items.map(i => `<option value="${i.value}">${i.label}</option>`).join('');
}

// Core loader
async function loadAndRender() {
  const studentId = els.student.value;
  const yearId = els.year.value;
  const groupBy = els.groupBy.value;

  const data = await api(`/api/reports/annual?studentId=${encodeURIComponent(studentId)}&yearId=${encodeURIComponent(yearId)}&groupBy=${encodeURIComponent(groupBy)}`);

  const total = safeNum(data?.totals?.totalHours);
  const core = safeNum(data?.totals?.coreHours);
  const coreHome = safeNum(data?.totals?.coreAtHomeHours);

  const nonCore = Math.max(0, total - core);

  renderMetric(els.total, els.totalBar, total, GOALS.total);
  renderMetric(els.core, els.coreBar, core, GOALS.core);
  renderMetric(els.coreHome, els.coreHomeBar, coreHome, GOALS.coreHome);
  renderMetric(els.nonCore, els.nonCoreBar, nonCore, GOALS.nonCore);

  renderBreakdownTable(data?.breakdown ?? [], groupBy);
}

function renderMetric(valueEl, barEl, value, goal) {
  valueEl.textContent = Number.isFinite(value) ? value : '0';
  const pct = clamp((value / goal) * 100, 0, 100);
  barEl.style.width = `${pct}%`;
  barEl.setAttribute('aria-valuenow', String(Math.round(pct)));
  barEl.setAttribute('aria-valuemin', '0');
  barEl.setAttribute('aria-valuemax', '100');
}

function renderBreakdownTable(rows, groupBy) {
  if (!Array.isArray(rows) || rows.length === 0) {
    els.hoursTableWrap.innerHTML = `<p style="color:#98a1c0;margin:8px 0">No hours logged yet for the selected filters.</p>`;
    return;
  }

  const headers = ['Group', 'Total', 'Core', 'Core @ Home', 'Non-Core'];
  const table = document.createElement('table');
  table.id = 'hoursTable';

  table.innerHTML = `
    <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
    <tbody>
      ${rows.map(r => {
        const total = safeNum(r.total);
        const core = safeNum(r.core);
        const coreHome = safeNum(r.coreHome);
        const nonCore = Math.max(0, total - core);
        const groupLabel = r.group ?? '(unassigned)';
        return `<tr>
          <td>${escapeHtml(groupLabel)}</td>
          <td>${total}</td>
          <td>${core}</td>
          <td>${coreHome}</td>
          <td>${nonCore}</td>
        </tr>`;
      }).join('')}
    </tbody>
  `;
  els.hoursTableWrap.replaceChildren(table);
}

// --- helpers ---
async function api(path) {
  const res = await fetch(path, { headers: { 'accept': 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${path}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}
const clamp = (n, min, max) => Math.min(Math.max(n, min), max);
const safeNum = (n) => Number.isFinite(+n) ? +n : 0;
function escapeHtml(s) {
  return String(s).replace(/[&<>\"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[c]);
}

