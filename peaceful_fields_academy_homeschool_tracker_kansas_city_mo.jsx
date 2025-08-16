import React, { useEffect, useMemo, useRef, useState } from "react";
import { Download, FileDown, FileUp, Layers, LayoutDashboard, Plus, Printer, Save, School, Settings, Upload, User, BookOpen, Clock, Images, FolderOpen, Trash2, Edit2, X, ChevronLeft, ChevronRight, Search } from "lucide-react";

/**
 * Peaceful Fields Academy — Homeschool Tracker
 * Location: Kansas City, Missouri
 *
 * Features:
 * - Students & Courses manager
 * - Hours log with Missouri-style categories (Core/Elective, Home/Off-site)
 * - Progress dashboard toward annual goals (editable; defaults to 1000 / 600 / 400)
 * - Work Samples vault (attach files, images, notes, and link to course/date)
 * - Yearly reports & export (CSV/JSON); print-friendly portfolio per student
 * - LocalStorage persistence; simple import/export backup
 *
 * This is a single-file React app that uses TailwindCSS for styling.
 * No backend required. All data stays in the browser unless exported.
 */

/*************************
 * Utility & Storage
 *************************/
const STORAGE_KEY = "pfa_homeschool_tracker_v1";

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now()}`;
}

function saveToLocal(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadFromLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.error("Failed to parse local storage", e);
    return null;
  }
}

function classNames(...arr) {
  return arr.filter(Boolean).join(" ");
}

function formatMinutes(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

function download(filename, text) {
  const element = document.createElement("a");
  const file = new Blob([text], { type: "application/json" });
  element.href = URL.createObjectURL(file);
  element.download = filename;
  document.body.appendChild(element);
  element.click();
  element.remove();
}

function toCSV(rows) {
  if (!rows || rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const esc = v => `"${String(v ?? "").replaceAll('"', '""')}"`;
  const lines = [headers.join(",")].concat(
    rows.map(r => headers.map(h => esc(r[h])).join(","))
  );
  return lines.join("\n");
}

/*************************
 * Default State
 *************************/
const defaultState = {
  meta: {
    academyName: "Peaceful Fields Academy",
    location: "Kansas City, Missouri",
    schoolYearLabel: new Date().getFullYear() + "–" + (new Date().getFullYear() + 1),
    yearStart: new Date(new Date().getFullYear(), 7, 1).toISOString(), // Aug 1 by default
    goals: { total: 1000 * 60, core: 600 * 60, atHome: 400 * 60 }, // minutes
    notes: "Goals reflect common Missouri guidance; adjust as needed.",
  },
  students: [
    // Example record; feel free to delete
    // { id: uid("stu"), name: "Isabell Hope Goering", grade: "9", dob: "2010-05-01" }
  ],
  courses: [
    // { id: uid("cou"), title: "Algebra I", category: "Core", notes: "Saxon" }
  ],
  hours: [
    // { id, studentId, courseId, date, minutes, isCore, location: "Home"|"Off-site", notes }
  ],
  samples: [
    // { id, studentId, courseId, date, title, notes, fileName, fileUrl }
  ],
};

/*************************
 * Small UI Building Blocks
 *************************/
const Card = ({ children, className }) => (
  <div className={classNames("bg-white rounded-2xl shadow-sm border border-gray-200 p-4", className)}>
    {children}
  </div>
);

const SectionTitle = ({ icon: Icon, title, subtitle, right }) => (
  <div className="flex items-start justify-between gap-4 mb-4">
    <div>
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-5 h-5" />}
        <h2 className="text-xl font-semibold">{title}</h2>
      </div>
      {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
    </div>
    {right}
  </div>
);

const Badge = ({ children }) => (
  <span className="inline-flex items-center px-2 py-0.5 text-xs rounded-full bg-gray-100 border border-gray-200">{children}</span>
);

const Input = props => (
  <input {...props} className={classNames("w-full border rounded-xl px-3 py-2 focus:outline-none focus:ring", props.className)} />
);

const Select = props => (
  <select {...props} className={classNames("w-full border rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring", props.className)} />
);

const Textarea = props => (
  <textarea {...props} className={classNames("w-full border rounded-xl px-3 py-2 focus:outline-none focus:ring", props.className)} />
);

const Button = ({ children, className, variant = "primary", ...rest }) => {
  const base = "inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition";
  const styles = {
    primary: "bg-blue-600 text-white border-blue-700 hover:bg-blue-700",
    ghost: "bg-white text-gray-800 border-gray-300 hover:bg-gray-50",
    danger: "bg-red-600 text-white border-red-700 hover:bg-red-700",
  };
  return (
    <button className={classNames(base, styles[variant], className)} {...rest}>
      {children}
    </button>
  );
};

const Modal = ({ open, onClose, title, children, maxWidth = "max-w-3xl" }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className={classNames("relative z-10 w-full", maxWidth)}>
        <Card className="p-6">
          <div className="flex items-start justify-between">
            <h3 className="text-lg font-semibold">{title}</h3>
            <button onClick={onClose} className="p-1 rounded hover:bg-gray-100"><X className="w-5 h-5" /></button>
          </div>
          <div className="mt-4">{children}</div>
        </Card>
      </div>
    </div>
  );
};

/*************************
 * App
 *************************/
function usePersistentState() {
  const [state, setState] = useState(() => loadFromLocal() || defaultState);
  useEffect(() => {
    saveToLocal(state);
  }, [state]);
  return [state, setState];
}

function useGoalsProgress(state, activeStudentId, activeYearStartISO) {
  const start = useMemo(() => new Date(activeYearStartISO), [activeYearStartISO]);
  const end = useMemo(() => new Date(start.getFullYear() + 1, start.getMonth(), start.getDate()), [start]);

  const logs = state.hours.filter(h => {
    const d = new Date(h.date);
    return d >= start && d < end && (!activeStudentId || h.studentId === activeStudentId);
  });

  const total = logs.reduce((s, h) => s + (Number(h.minutes) || 0), 0);
  const core = logs.filter(h => h.isCore).reduce((s, h) => s + (Number(h.minutes) || 0), 0);
  const atHome = logs.filter(h => h.location === "Home").reduce((s, h) => s + (Number(h.minutes) || 0), 0);

  return { total, core, atHome, periodStart: start, periodEnd: end };
}

function ProgressBar({ value, max, label }) {
  const pct = Math.min(100, Math.round((value / (max || 1)) * 100));
  return (
    <div>
      <div className="flex justify-between text-sm mb-1"><span>{label}</span><span>{pct}%</span></div>
      <div className="w-full h-3 bg-gray-100 rounded-xl overflow-hidden">
        <div className="h-3 bg-blue-600" style={{ width: `${pct}%` }} />
      </div>
      <div className="text-xs text-gray-600 mt-1">{formatMinutes(value)} of {formatMinutes(max)} ({(max/60)|0}h goal)</div>
    </div>
  );
}

function Row({ children, className }) {
  return <div className={classNames("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3", className)}>{children}</div>
}

const EmptyState = ({ icon: Icon, title, children, action }) => (
  <Card className="text-center py-12">
    <Icon className="w-10 h-10 mx-auto mb-3" />
    <h3 className="text-lg font-semibold">{title}</h3>
    <p className="text-gray-600 mt-1">{children}</p>
    {action && <div className="mt-4">{action}</div>}
  </Card>
);

export default function App() {
  const [state, setState] = usePersistentState();
  const [tab, setTab] = useState("dashboard");
  const [activeStudentId, setActiveStudentId] = useState("");
  const [search, setSearch] = useState("");

  const goals = state.meta.goals;
  const { total, core, atHome } = useGoalsProgress(state, activeStudentId, state.meta.yearStart);

  const students = state.students;
  const courses = state.courses;

  const activeStudent = students.find(s => s.id === activeStudentId) || null;

  // Derived views
  const filteredHours = useMemo(() => {
    return state.hours.filter(h => (!activeStudentId || h.studentId === activeStudentId));
  }, [state.hours, activeStudentId]);

  const filteredSamples = useMemo(() => state.samples.filter(s => (!activeStudentId || s.studentId === activeStudentId)), [state.samples, activeStudentId]);

  // CRUD helpers
  function addStudent(stu) {
    setState(s => ({ ...s, students: [...s.students, { id: uid("stu"), ...stu }] }));
  }
  function updateStudent(id, patch) {
    setState(s => ({ ...s, students: s.students.map(x => x.id === id ? { ...x, ...patch } : x) }));
  }
  function deleteStudent(id) {
    setState(s => ({ ...s, students: s.students.filter(x => x.id !== id), hours: s.hours.filter(h => h.studentId !== id), samples: s.samples.filter(a => a.studentId !== id) }));
    if (activeStudentId === id) setActiveStudentId("");
  }

  function addCourse(c) {
    setState(s => ({ ...s, courses: [...s.courses, { id: uid("cou"), ...c }] }));
  }
  function updateCourse(id, patch) {
    setState(s => ({ ...s, courses: s.courses.map(x => x.id === id ? { ...x, ...patch } : x) }));
  }
  function deleteCourse(id) {
    setState(s => ({ ...s, courses: s.courses.filter(x => x.id !== id), hours: s.hours.filter(h => h.courseId !== id), samples: s.samples.filter(a => a.courseId !== id) }));
  }

  function addHour(h) {
    setState(s => ({ ...s, hours: [...s.hours, { id: uid("log"), ...h }] }));
  }
  function updateHour(id, patch) {
    setState(s => ({ ...s, hours: s.hours.map(x => x.id === id ? { ...x, ...patch } : x) }));
  }
  function deleteHour(id) {
    setState(s => ({ ...s, hours: s.hours.filter(x => x.id !== id) }));
  }

  function addSample(a) {
    setState(s => ({ ...s, samples: [...s.samples, { id: uid("smp"), ...a }] }));
  }
  function updateSample(id, patch) {
    setState(s => ({ ...s, samples: s.samples.map(x => x.id === id ? { ...x, ...patch } : x) }));
  }
  function deleteSample(id) {
    setState(s => ({ ...s, samples: s.samples.filter(x => x.id !== id) }));
  }

  function exportData() {
    download(`pfa_backup_${Date.now()}.json`, JSON.stringify(state, null, 2));
  }

  function importData(file) {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const obj = JSON.parse(e.target.result);
        if (obj && obj.meta && obj.students && obj.courses) {
          setState(obj);
        } else {
          alert("Invalid backup file.");
        }
      } catch (err) {
        alert("Could not parse JSON.");
      }
    };
    reader.readAsText(file);
  }

  function exportHoursCSV() {
    const rows = state.hours.map(h => ({
      id: h.id,
      student: (students.find(s => s.id === h.studentId)?.name) || "",
      course: (courses.find(c => c.id === h.courseId)?.title) || "",
      date: h.date,
      minutes: h.minutes,
      hours: (Number(h.minutes)/60).toFixed(2),
      isCore: h.isCore ? "Yes" : "No",
      location: h.location,
      notes: h.notes || "",
    }));
    const csv = toCSV(rows);
    download(`pfa_hours_${Date.now()}.csv`, csv);
  }

  function exportSamplesCSV() {
    const rows = state.samples.map(a => ({
      id: a.id,
      student: (students.find(s => s.id === a.studentId)?.name) || "",
      course: (courses.find(c => c.id === a.courseId)?.title) || "",
      date: a.date,
      title: a.title,
      fileName: a.fileName || "",
      fileUrl: a.fileUrl || "",
      notes: a.notes || "",
    }));
    const csv = toCSV(rows);
    download(`pfa_samples_${Date.now()}.csv`, csv);
  }

  // Components for tabs
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white grid place-content-center font-semibold">PFA</div>
            <div>
              <h1 className="text-lg font-semibold">{state.meta.academyName}</h1>
              <p className="text-xs text-gray-600">{state.meta.location} • {state.meta.schoolYearLabel}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={exportData}><Save className="w-4 h-4"/> Backup</Button>
            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border bg-white cursor-pointer">
              <Upload className="w-4 h-4"/> Restore
              <input type="file" className="hidden" accept="application/json" onChange={e => e.target.files?.[0] && importData(e.target.files[0])} />
            </label>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-4">
          {/* Sidebar */}
          <Card className="p-0">
            <div className="p-3 border-b">
              <div className="text-sm text-gray-600 mb-1">Active Student</div>
              <Select value={activeStudentId} onChange={e => setActiveStudentId(e.target.value)}>
                <option value="">All Students</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </div>
            <nav className="p-2">
              <SideTab icon={LayoutDashboard} label="Dashboard" value="dashboard" tab={tab} setTab={setTab} />
              <SideTab icon={User} label="Students" value="students" tab={tab} setTab={setTab} />
              <SideTab icon={BookOpen} label="Courses" value="courses" tab={tab} setTab={setTab} />
              <SideTab icon={Clock} label="Log Hours" value="hours" tab={tab} setTab={setTab} />
              <SideTab icon={Images} label="Work Samples" value="samples" tab={tab} setTab={setTab} />
              <SideTab icon={FolderOpen} label="Reports & Export" value="reports" tab={tab} setTab={setTab} />
              <SideTab icon={Settings} label="Settings" value="settings" tab={tab} setTab={setTab} />
            </nav>
          </Card>

          {/* Content */}
          <div className="space-y-4">
            {tab === "dashboard" && <Dashboard state={state} goalsProgress={{ total, core, atHome }} students={students} courses={courses} setTab={setTab} />}
            {tab === "students" && <StudentsTab students={students} addStudent={addStudent} updateStudent={updateStudent} deleteStudent={deleteStudent} setActiveStudentId={setActiveStudentId} />}
            {tab === "courses" && <CoursesTab courses={courses} addCourse={addCourse} updateCourse={updateCourse} deleteCourse={deleteCourse} />}
            {tab === "hours" && <HoursTab state={state} addHour={addHour} updateHour={updateHour} deleteHour={deleteHour} students={students} courses={courses} exportHoursCSV={exportHoursCSV} />}
            {tab === "samples" && <SamplesTab state={state} addSample={addSample} updateSample={updateSample} deleteSample={deleteSample} students={students} courses={courses} exportSamplesCSV={exportSamplesCSV} />}
            {tab === "reports" && <ReportsTab state={state} goalsProgress={{ total, core, atHome }} students={students} courses={courses} />}
            {tab === "settings" && <SettingsTab state={state} setState={setState} />}
          </div>
        </div>
      </main>

      <footer className="max-w-7xl mx-auto p-4 text-center text-xs text-gray-500">
        Peaceful Fields Academy • Kansas City, Missouri • Data stored locally in your browser
      </footer>
    </div>
  );
}

function SideTab({ icon: Icon, label, value, tab, setTab }) {
  const active = tab === value;
  return (
    <button onClick={() => setTab(value)} className={classNames("w-full text-left px-3 py-2 rounded-xl flex items-center gap-2", active ? "bg-blue-50 text-blue-700" : "hover:bg-gray-50")}> 
      <Icon className="w-4 h-4"/>
      <span className="text-sm">{label}</span>
    </button>
  );
}

/*************************
 * Dashboard
 *************************/
function Dashboard({ state, goalsProgress, students, courses, setTab }) {
  const { total, core, atHome } = goalsProgress;
  const goals = state.meta.goals;

  return (
    <div className="space-y-4">
      <SectionTitle icon={LayoutDashboard} title="Dashboard" subtitle="Missouri-style hour tracking at a glance." right={<Button variant="ghost" onClick={() => setTab("hours")}><Plus className="w-4 h-4"/>Quick Log</Button>} />
      <Row>
        <Card>
          <h3 className="font-semibold mb-3">Yearly Progress</h3>
          <div className="space-y-3">
            <ProgressBar value={total} max={goals.total} label="Total Hours" />
            <ProgressBar value={core} max={goals.core} label="Core (Reading/Math/Language/Science/Social Studies)" />
            <ProgressBar value={atHome} max={goals.atHome} label="At Home Location" />
          </div>
        </Card>
        <Card>
          <h3 className="font-semibold mb-3">Students</h3>
          {students.length === 0 ? (
            <p className="text-gray-600 text-sm">No students yet. Add one in the Students tab.</p>
          ) : (
            <ul className="space-y-2">
              {students.map(s => (
                <li key={s.id} className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{s.name}</div>
                    <div className="text-xs text-gray-600">Grade {s.grade || "—"}</div>
                  </div>
                  <Badge>Portfolio Ready</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <h3 className="font-semibold mb-3">Courses</h3>
          {courses.length === 0 ? (
            <p className="text-gray-600 text-sm">No courses yet. Add them in the Courses tab.</p>
          ) : (
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {courses.map(c => (
                <li key={c.id} className="border rounded-xl px-3 py-2">
                  <div className="font-medium">{c.title}</div>
                  <div className="text-xs text-gray-600">{c.category || "—"}</div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </Row>

      <Card>
        <h3 className="font-semibold mb-3">Quick Guidance for Missouri Recordkeeping</h3>
        <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
          <li>Keep a daily log of hours by subject. Mark whether hours are Core or Elective and whether they occurred at Home or Off-site.</li>
          <li>Maintain samples of student work. Upload photos/PDFs and link them to a course and date.</li>
          <li>Set annual goals in <em>Settings</em> (defaults provided). This app calculates progress automatically.</li>
        </ul>
        <p className="text-xs text-gray-500 mt-2">Note: Requirements can vary; confirm details with Missouri statutes and your district’s interpretation. This tool is configurable to fit your approach.</p>
      </Card>
    </div>
  );
}

/*************************
 * Students Tab
 *************************/
function StudentsTab({ students, addStudent, updateStudent, deleteStudent, setActiveStudentId }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: "", grade: "", dob: "" });

  function submit() {
    if (!form.name.trim()) return;
    addStudent(form);
    setForm({ name: "", grade: "", dob: "" });
    setModalOpen(false);
  }

  return (
    <div className="space-y-4">
      <SectionTitle icon={User} title="Students" subtitle="Add each enrolled child." right={<Button onClick={() => setModalOpen(true)}><Plus className="w-4 h-4"/> Add Student</Button>} />
      {students.length === 0 ? (
        <EmptyState icon={User} title="No students yet">Create your first student profile to begin tracking.</EmptyState>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2">Name</th>
                  <th>Grade</th>
                  <th>DOB</th>
                  <th className="w-40">Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map(s => (
                  <tr key={s.id} className="border-b last:border-none">
                    <td className="py-2 font-medium">{s.name}</td>
                    <td>{s.grade || "—"}</td>
                    <td>{s.dob || "—"}</td>
                    <td>
                      <div className="flex gap-2">
                        <Button variant="ghost" onClick={() => setActiveStudentId(s.id)}><School className="w-4 h-4"/> Focus</Button>
                        <Button variant="ghost" onClick={() => updateStudent(s.id, { editing: true })}><Edit2 className="w-4 h-4"/> Edit</Button>
                        <Button variant="danger" onClick={() => deleteStudent(s.id)}><Trash2 className="w-4 h-4"/> Delete</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Student">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-sm">Full Name</label>
            <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Student name" />
          </div>
          <div>
            <label className="text-sm">Grade</label>
            <Input value={form.grade} onChange={e => setForm({ ...form, grade: e.target.value })} placeholder="e.g., 9" />
          </div>
          <div>
            <label className="text-sm">Date of Birth</label>
            <Input type="date" value={form.dob} onChange={e => setForm({ ...form, dob: e.target.value })} />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={submit}><Plus className="w-4 h-4"/> Add</Button>
        </div>
      </Modal>
    </div>
  );
}

/*************************
 * Courses Tab
 *************************/
function CoursesTab({ courses, addCourse, updateCourse, deleteCourse }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ title: "", category: "Core", notes: "" });

  function submit() {
    if (!form.title.trim()) return;
    addCourse(form);
    setForm({ title: "", category: "Core", notes: "" });
    setModalOpen(false);
  }

  return (
    <div className="space-y-4">
      <SectionTitle icon={BookOpen} title="Courses" subtitle="Subjects to log hours against." right={<Button onClick={() => setModalOpen(true)}><Plus className="w-4 h-4"/> Add Course</Button>} />
      {courses.length === 0 ? (
        <EmptyState icon={BookOpen} title="No courses yet">Add Math, English, Science, Social Studies, PE, Fine Arts, etc.</EmptyState>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2">Title</th>
                  <th>Category</th>
                  <th>Notes</th>
                  <th className="w-40">Actions</th>
                </tr>
              </thead>
              <tbody>
                {courses.map(c => (
                  <tr key={c.id} className="border-b last:border-none">
                    <td className="py-2 font-medium">{c.title}</td>
                    <td>{c.category || "—"}</td>
                    <td className="max-w-[420px] truncate" title={c.notes}>{c.notes || "—"}</td>
                    <td>
                      <div className="flex gap-2">
                        <Button variant="ghost" onClick={() => updateCourse(c.id, { category: c.category === "Core" ? "Elective" : "Core" })}><Layers className="w-4 h-4"/> Toggle</Button>
                        <Button variant="ghost" onClick={() => updateCourse(c.id, { editing: true })}><Edit2 className="w-4 h-4"/> Edit</Button>
                        <Button variant="danger" onClick={() => deleteCourse(c.id)}><Trash2 className="w-4 h-4"/> Delete</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Course">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-sm">Title</label>
            <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g., Algebra I" />
          </div>
          <div>
            <label className="text-sm">Category</label>
            <Select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
              <option>Core</option>
              <option>Elective</option>
            </Select>
          </div>
          <div className="md:col-span-2">
            <label className="text-sm">Notes/Curriculum</label>
            <Textarea rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Textbook, provider, scope…" />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={submit}><Plus className="w-4 h-4"/> Add</Button>
        </div>
      </Modal>
    </div>
  );
}

/*************************
 * Hours Tab
 *************************/
function HoursTab({ state, addHour, updateHour, deleteHour, students, courses, exportHoursCSV }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ studentId: "", courseId: "", date: new Date().toISOString().slice(0,10), minutes: 60, isCore: true, location: "Home", notes: "" });
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!form.studentId && students[0]) setForm(f => ({ ...f, studentId: students[0].id }));
    if (!form.courseId && courses[0]) setForm(f => ({ ...f, courseId: courses[0].id }));
  }, [students, courses]);

  function submit() {
    if (!form.studentId || !form.courseId || !form.date || !form.minutes) return;
    addHour({ ...form, minutes: Number(form.minutes) });
    setModalOpen(false);
  }

  const rows = state.hours.filter(h => {
    const match = query.toLowerCase();
    const stu = students.find(s => s.id === h.studentId)?.name?.toLowerCase() || "";
    const cou = courses.find(c => c.id === h.courseId)?.title?.toLowerCase() || "";
    return !match || stu.includes(match) || cou.includes(match) || (h.notes||"").toLowerCase().includes(match);
  }).sort((a,b) => new Date(b.date) - new Date(a.date));

  return (
    <div className="space-y-4">
      <SectionTitle icon={Clock} title="Log Hours" subtitle="Daily minutes by subject." right={<Button onClick={() => setModalOpen(true)}><Plus className="w-4 h-4"/> Add Entry</Button>} />

      <Card>
        <div className="flex items-center gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400"/>
            <Input placeholder="Search notes, student, course" value={query} onChange={e => setQuery(e.target.value)} className="pl-8"/>
          </div>
          <Button variant="ghost" onClick={exportHoursCSV}><FileDown className="w-4 h-4"/> Export CSV</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2">Date</th>
                <th>Student</th>
                <th>Course</th>
                <th>Minutes</th>
                <th>Core</th>
                <th>Location</th>
                <th>Notes</th>
                <th className="w-40">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(h => (
                <tr key={h.id} className="border-b last:border-none">
                  <td className="py-2">{h.date}</td>
                  <td>{students.find(s => s.id === h.studentId)?.name || "—"}</td>
                  <td>{courses.find(c => c.id === h.courseId)?.title || "—"}</td>
                  <td>{h.minutes}</td>
                  <td>{h.isCore ? "Yes" : "No"}</td>
                  <td>{h.location}</td>
                  <td className="max-w-[360px] truncate" title={h.notes}>{h.notes || "—"}</td>
                  <td>
                    <div className="flex gap-2">
                      <Button variant="ghost" onClick={() => updateHour(h.id, { editing: true })}><Edit2 className="w-4 h-4"/> Edit</Button>
                      <Button variant="danger" onClick={() => deleteHour(h.id)}><Trash2 className="w-4 h-4"/> Delete</Button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={8} className="text-center text-gray-600 py-6">No entries yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Hours Entry">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-sm">Student</label>
            <Select value={form.studentId} onChange={e => setForm({ ...form, studentId: e.target.value })}>
              {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </div>
          <div>
            <label className="text-sm">Course</label>
            <Select value={form.courseId} onChange={e => setForm({ ...form, courseId: e.target.value })}>
              {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
            </Select>
          </div>
          <div>
            <label className="text-sm">Date</label>
            <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
          </div>
          <div>
            <label className="text-sm">Minutes</label>
            <Input type="number" min={1} step={5} value={form.minutes} onChange={e => setForm({ ...form, minutes: e.target.value })} />
          </div>
          <div>
            <label className="text-sm">Category</label>
            <Select value={form.isCore ? "Core" : "Elective"} onChange={e => setForm({ ...form, isCore: e.target.value === "Core" })}>
              <option>Core</option>
              <option>Elective</option>
            </Select>
          </div>
          <div>
            <label className="text-sm">Location</label>
            <Select value={form.location} onChange={e => setForm({ ...form, location: e.target.value })}>
              <option>Home</option>
              <option>Off-site</option>
            </Select>
          </div>
          <div className="md:col-span-2">
            <label className="text-sm">Notes</label>
            <Textarea rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Lesson, activity, materials…" />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={submit}><Plus className="w-4 h-4"/> Save Entry</Button>
        </div>
      </Modal>
    </div>
  );
}

/*************************
 * Samples Tab
 *************************/
function SamplesTab({ state, addSample, updateSample, deleteSample, students, courses, exportSamplesCSV }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ studentId: students[0]?.id || "", courseId: courses[0]?.id || "", date: new Date().toISOString().slice(0,10), title: "", notes: "", fileName: "", fileUrl: "" });
  const fileInputRef = useRef(null);
  const [query, setQuery] = useState("");

  function onFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    setForm(prev => ({ ...prev, fileName: f.name, fileUrl: url }));
  }

  function submit() {
    if (!form.studentId || !form.courseId || !form.title) return;
    addSample(form);
    setModalOpen(false);
    setForm({ studentId: students[0]?.id || "", courseId: courses[0]?.id || "", date: new Date().toISOString().slice(0,10), title: "", notes: "", fileName: "", fileUrl: "" });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const rows = state.samples.filter(a => {
    const match = query.toLowerCase();
    const stu = students.find(s => s.id === a.studentId)?.name?.toLowerCase() || "";
    const cou = courses.find(c => c.id === a.courseId)?.title?.toLowerCase() || "";
    return !match || stu.includes(match) || cou.includes(match) || (a.title||"").toLowerCase().includes(match) || (a.notes||"").toLowerCase().includes(match);
  }).sort((a,b) => new Date(b.date) - new Date(a.date));

  return (
    <div className="space-y-4">
      <SectionTitle icon={Images} title="Work Samples" subtitle="Store evidence of learning." right={<Button onClick={() => setModalOpen(true)}><Plus className="w-4 h-4"/> Add Sample</Button>} />

      <Card>
        <div className="flex items-center gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400"/>
            <Input placeholder="Search title, notes, student, course" value={query} onChange={e => setQuery(e.target.value)} className="pl-8"/>
          </div>
          <Button variant="ghost" onClick={exportSamplesCSV}><FileDown className="w-4 h-4"/> Export CSV</Button>
        </div>

        {rows.length === 0 ? (
          <div className="text-center text-gray-600 py-6">No samples yet.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {rows.map(a => (
              <div key={a.id} className="border rounded-2xl overflow-hidden bg-white">
                {a.fileUrl ? (
                  <a href={a.fileUrl} target="_blank" rel="noreferrer">
                    <img src={a.fileUrl} alt={a.title} className="w-full h-40 object-cover" />
                  </a>
                ) : (
                  <div className="w-full h-40 grid place-content-center text-gray-400">No Preview</div>
                )}
                <div className="p-3">
                  <div className="font-medium">{a.title}</div>
                  <div className="text-xs text-gray-600">{a.date} • {students.find(s => s.id === a.studentId)?.name || "—"} • {courses.find(c => c.id === a.courseId)?.title || "—"}</div>
                  {a.notes && <div className="text-sm mt-2">{a.notes}</div>}
                  <div className="flex gap-2 mt-3">
                    {a.fileUrl && <a className="inline-flex items-center gap-1 text-sm underline" href={a.fileUrl} target="_blank" rel="noreferrer"><Download className="w-4 h-4"/> Open</a>}
                    <Button variant="ghost" onClick={() => updateSample(a.id, { editing: true })}><Edit2 className="w-4 h-4"/> Edit</Button>
                    <Button variant="danger" onClick={() => deleteSample(a.id)}><Trash2 className="w-4 h-4"/> Delete</Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Work Sample">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-sm">Student</label>
            <Select value={form.studentId} onChange={e => setForm({ ...form, studentId: e.target.value })}>
              {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </div>
          <div>
            <label className="text-sm">Course</label>
            <Select value={form.courseId} onChange={e => setForm({ ...form, courseId: e.target.value })}>
              {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
            </Select>
          </div>
          <div>
            <label className="text-sm">Date</label>
            <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <label className="text-sm">Title</label>
            <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g., Lab report: Density of water"/>
          </div>
          <div className="md:col-span-2">
            <label className="text-sm">Notes</label>
            <Textarea rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Rubric, evaluation, context…" />
          </div>
          <div className="md:col-span-2">
            <label className="text-sm">File (image, PDF, doc)</label>
            <input ref={fileInputRef} type="file" accept="image/*,application/pdf,.doc,.docx,.txt" onChange={onFile} className="block w-full text-sm"/>
            {form.fileName && <div className="text-xs text-gray-600 mt-1">Selected: {form.fileName}</div>}
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={submit}><Plus className="w-4 h-4"/> Save Sample</Button>
        </div>
      </Modal>
    </div>
  );
}

/*************************
 * Reports Tab
 *************************/
function ReportsTab({ state, goalsProgress, students, courses }) {
  const [selectedStudentId, setSelectedStudentId] = useState(students[0]?.id || "");

  const { total, core, atHome } = goalsProgress; // overall, not per student

  const hoursByStudent = id => state.hours.filter(h => h.studentId === id);
  const samplesByStudent = id => state.samples.filter(a => a.studentId === id);

  function printStudentPortfolio(id) {
    const stu = students.find(s => s.id === id);
    if (!stu) return;
    const w = window.open("", "_blank");
    const yearLabel = state.meta.schoolYearLabel;
    const logs = hoursByStudent(id).sort((a,b) => new Date(a.date) - new Date(b.date));
    const byCourse = {};
    logs.forEach(l => {
      const c = courses.find(x => x.id === l.courseId)?.title || "(Course)";
      byCourse[c] = byCourse[c] || { total: 0, core: 0, atHome: 0, entries: [] };
      byCourse[c].total += l.minutes;
      if (l.isCore) byCourse[c].core += l.minutes;
      if (l.location === "Home") byCourse[c].atHome += l.minutes;
      byCourse[c].entries.push(l);
    });
    const samples = samplesByStudent(id);

    const style = `
      body { font-family: ui-sans-serif, system-ui, -apple-system; margin: 24px; }
      h1 { font-size: 20px; margin-bottom: 4px; }
      h2 { font-size: 16px; margin-top: 18px; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      th, td { border: 1px solid #ddd; padding: 6px; }
      .muted { color: #666; font-size: 11px; }
    `;

    function mins(m){ return `${(m/60).toFixed(1)} h (${m} min)`; }

    const html = `
      <html><head><title>Portfolio — ${stu.name}</title><style>${style}</style></head><body>
        <h1>Peaceful Fields Academy — Portfolio</h1>
        <div class="muted">${state.meta.location} • ${yearLabel}</div>
        <p><strong>Student:</strong> ${stu.name} &nbsp; <strong>Grade:</strong> ${stu.grade || "—"} &nbsp; <strong>DOB:</strong> ${stu.dob || "—"}</p>

        <h2>Yearly Progress (All Students)</h2>
        <p>Total: ${mins(total)} • Core: ${mins(core)} • At Home: ${mins(atHome)}</p>

        <h2>Hours by Course (${stu.name})</h2>
        <table><thead><tr><th>Course</th><th>Total</th><th>Core</th><th>At Home</th></tr></thead><tbody>
          ${Object.entries(byCourse).map(([k,v]) => `<tr><td>${k}</td><td>${mins(v.total)}</td><td>${mins(v.core)}</td><td>${mins(v.atHome)}</td></tr>`).join("")}
        </tbody></table>

        <h2>Work Samples (${samples.length})</h2>
        <ul>
          ${samples.map(s => `<li><strong>${s.title}</strong> — ${s.date} — ${courses.find(c => c.id === s.courseId)?.title || "(Course)"}${s.notes ? ": " + s.notes : ""}</li>`).join("")}
        </ul>

        <p class="muted">Generated on ${new Date().toLocaleString()}</p>
        <script>window.onload = () => window.print();</script>
      </body></html>
    `;

    w.document.write(html);
    w.document.close();
  }

  const allHours = state.hours.map(h => ({
    student: students.find(s => s.id === h.studentId)?.name || "",
    course: courses.find(c => c.id === h.courseId)?.title || "",
    date: h.date, minutes: h.minutes, core: h.isCore ? "Yes" : "No", location: h.location,
  }));

  return (
    <div className="space-y-4">
      <SectionTitle icon={FolderOpen} title="Reports & Export" subtitle="Print portfolios, export data." />

      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-sm">Student Portfolio</label>
            <Select value={selectedStudentId} onChange={e => setSelectedStudentId(e.target.value)}>
              {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </div>
          <div className="flex items-end gap-2">
            <Button onClick={() => printStudentPortfolio(selectedStudentId)}><Printer className="w-4 h-4"/> Print Portfolio</Button>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="font-semibold mb-2">Quick Stats</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <Stat label="Hours (All)" value={formatMinutes(goalsProgress.total)} />
          <Stat label="Core Minutes" value={formatMinutes(goalsProgress.core)} />
          <Stat label="At-Home Minutes" value={formatMinutes(goalsProgress.atHome)} />
          <Stat label="Work Samples" value={state.samples.length} />
        </div>
      </Card>

      <Card>
        <h3 className="font-semibold mb-2">Data Preview (Hours)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2">Date</th><th>Student</th><th>Course</th><th>Minutes</th><th>Core</th><th>Location</th>
              </tr>
            </thead>
            <tbody>
              {allHours.slice(0, 20).map((r, i) => (
                <tr key={i} className="border-b last:border-none">
                  <td className="py-2">{r.date}</td><td>{r.student}</td><td>{r.course}</td><td>{r.minutes}</td><td>{r.core}</td><td>{r.location}</td>
                </tr>
              ))}
              {allHours.length === 0 && <tr><td colSpan={6} className="text-center text-gray-600 py-6">No data yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="border rounded-2xl p-3 bg-white">
      <div className="text-xs text-gray-600">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}

/*************************
 * Settings Tab
 *************************/
function SettingsTab({ state, setState }) {
  const [m, setM] = useState({ ...state.meta });

  function save() {
    setState(s => ({ ...s, meta: { ...m, goals: { ...m.goals, total: Number(m.goals.total), core: Number(m.goals.core), atHome: Number(m.goals.atHome) } } }));
  }

  return (
    <div className="space-y-4">
      <SectionTitle icon={Settings} title="Settings" subtitle="School identity, year, and goals." />
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-sm">Academy Name</label>
            <Input value={m.academyName} onChange={e => setM({ ...m, academyName: e.target.value })} />
          </div>
          <div>
            <label className="text-sm">Location</label>
            <Input value={m.location} onChange={e => setM({ ...m, location: e.target.value })} />
          </div>
          <div>
            <label className="text-sm">School Year Label</label>
            <Input value={m.schoolYearLabel} onChange={e => setM({ ...m, schoolYearLabel: e.target.value })} placeholder="e.g., 2025–2026" />
          </div>
          <div>
            <label className="text-sm">Year Start (MM/DD/YYYY)</label>
            <Input type="date" value={m.yearStart?.slice(0,10) || ""} onChange={e => setM({ ...m, yearStart: new Date(e.target.value).toISOString() })} />
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="font-semibold mb-3">Annual Goals (Minutes)</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-sm">Total (default: 60,000 min = 1000 h)</label>
            <Input type="number" value={m.goals.total} onChange={e => setM({ ...m, goals: { ...m.goals, total: Number(e.target.value) } })} />
          </div>
          <div>
            <label className="text-sm">Core (default: 36,000 min = 600 h)</label>
            <Input type="number" value={m.goals.core} onChange={e => setM({ ...m, goals: { ...m.goals, core: Number(e.target.value) } })} />
          </div>
          <div>
            <label className="text-sm">At Home (default: 24,000 min = 400 h)</label>
            <Input type="number" value={m.goals.atHome} onChange={e => setM({ ...m, goals: { ...m.goals, atHome: Number(e.target.value) } })} />
          </div>
        </div>
        <p className="text-xs text-gray-600 mt-2">Adjust as needed to fit your homeschool plan.</p>
        <div className="mt-3"><Button onClick={save}><Save className="w-4 h-4"/> Save Settings</Button></div>
      </Card>

      <Card>
        <h3 className="font-semibold mb-2">Backup & Restore</h3>
        <p className="text-sm text-gray-700">Use the header buttons to export a JSON backup and restore later.
        Your data is stored locally in your browser and not uploaded anywhere unless you export it.</p>
      </Card>
    </div>
  );
}
