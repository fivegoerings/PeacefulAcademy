// js/acellus-import.js
const API = "/.netlify/functions/acellus-import"; // pretty path via Netlify
const LS_KEY = "pa.acellus.entries.v1";
const studentForm = document.getElementById("student-form");
const entryForm   = document.getElementById("entry-form");
const tableBody   = document.querySelector("#entries-table tbody");
const totalAllEl  = document.getElementById("total-hours");
const totalCoreEl = document.getElementById("total-hours-core");
const syncBtn     = document.getElementById("sync-btn");

let state = {
  student: null,
  entries: loadEntries()
};

function loadEntries() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) ?? []; }
  catch { return []; }
}
function saveEntries() {
  localStorage.setItem(LS_KEY, JSON.stringify(state.entries));
  render();
}

// Missouri core subject mapping
// Core: Language Arts, Math, Science, Social Studies/History (RSMo 167.031 portfolio-hours guidance)
const CORE_SET = new Set(["Language Arts", "Math", "Science", "Social Studies", "History"]);
function isCore(acellusCategory) {
  return CORE_SET.has(acellusCategory.trim());
}

studentForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const fd = new FormData(studentForm);
  state.student = {
    student_id: fd.get("student_id").trim(),
    student_name: fd.get("student_name").trim(),
    school_year: fd.get("school_year").trim(),
    term: (fd.get("term") || "").trim()
  };
  document.getElementById("student-status").textContent = "Student selected.";
});

entryForm.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!state.student) {
    alert("Save/select a student first.");
    return;
  }
  const fd = new FormData(entryForm);
  const entry = {
    id: crypto.randomUUID(),
    student_id: state.student.student_id,
    school_year: state.student.school_year,
    term: state.student.term,
    date: fd.get("date"),
    course_title: fd.get("course_title").trim(),
    acellus_category: fd.get("acellus_category"),
    is_core: isCore(fd.get("acellus_category")),
    hours: Number(fd.get("hours") || 0),
    location: fd.get("location") || "Regular",
    percent: fd.get("percent") ? Number(fd.get("percent")) : null,
    letter: (fd.get("letter") || "").trim() || null,
    credits: fd.get("credits") ? Number(fd.get("credits")) : null
  };
  // simple guard
  if (!entry.course_title || !entry.date || entry.hours <= 0) {
    document.getElementById("entry-status").textContent = "Please fill required fields.";
    return;
  }
  state.entries.push(entry);
  saveEntries();
  entryForm.reset();
  document.getElementById("entry-status").textContent = "Added.";
});

function render() {
  // rows
  tableBody.innerHTML = "";
  let totalAll = 0, totalCore = 0;
  const relevant = state.student
    ? state.entries.filter(e =>
        e.student_id === state.student.student_id &&
        e.school_year === state.student.school_year &&
        e.term === state.student.term)
    : state.entries;

  for (const e of relevant) {
    totalAll += e.hours;
    if (e.is_core) totalCore += e.hours;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${e.date}</td>
      <td>${e.course_title}</td>
      <td>${e.acellus_category}</td>
      <td>${e.is_core ? "Yes" : "No"}</td>
      <td>${e.hours.toFixed(2)}</td>
      <td>${e.percent ?? ""}</td>
      <td>${e.letter ?? ""}</td>
      <td>${e.credits ?? ""}</td>
      <td><button data-del="${e.id}" title="Delete">✕</button></td>
    `;
    tableBody.appendChild(tr);
  }
  totalAllEl.textContent  = totalAll.toFixed(2);
  totalCoreEl.textContent = totalCore.toFixed(2);
}

tableBody.addEventListener("click", (e) => {
  const id = e.target?.dataset?.del;
  if (!id) return;
  state.entries = state.entries.filter(x => x.id !== id);
  saveEntries();
});

syncBtn.addEventListener("click", async () => {
  if (!state.student) { alert("Select a student first."); return; }
  const payload = {
    student: state.student,
    entries: state.entries.filter(e =>
      e.student_id === state.student.student_id &&
      e.school_year === state.student.school_year &&
      e.term === state.student.term)
  };
  syncBtn.disabled = true;
  document.getElementById("sync-status").textContent = "Syncing…";
  try {
    const res = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      credentials: "omit",
    });
    if (!res.ok) throw new Error(await res.text());
    document.getElementById("sync-status").textContent = "Saved to server.";
  } catch (err) {
    document.getElementById("sync-status").textContent = "Error: " + err.message;
  } finally {
    syncBtn.disabled = false;
  }
});

// initial
render();