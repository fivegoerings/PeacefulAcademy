// Utility functions
// Simple log sink that mirrors console to localStorage for the console page
const LOG_STORAGE_KEY = 'pa_log_console_v1';
function appendLog(level, args) {
  try {
    const now = new Date().toISOString();
    const entry = { ts: now, level, msg: Array.from(args).map(a => {
      try { return typeof a === 'string' ? a : JSON.stringify(a); } catch(_) { return String(a); }
    }).join(' ') };
    const arr = JSON.parse(localStorage.getItem(LOG_STORAGE_KEY) || '[]');
    arr.push(entry);
    if (arr.length > 2000) arr.splice(0, arr.length - 2000);
    localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(arr));
  } catch(_) {}
}

['log','info','warn','error'].forEach(l => {
  const orig = console[l];
  console[l] = function() { try { appendLog(l, arguments); } catch(_){}; return orig.apply(console, arguments); };
});
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

// Robust form data extraction
function getFormValue(form, fieldName) {
  try {
    const formData = new FormData(form);
    const value = formData.get(fieldName);
    if (value !== null && value !== undefined) {
      return value;
    }
  } catch (error) {
    console.warn(`FormData.get() failed for ${fieldName}:`, error);
  }
  
  // Fallback to direct element access
  const element = form.querySelector(`[name="${fieldName}"]`);
  return element ? element.value : '';
}

// Debug function to test form data extraction
function debugFormData(form) {
  console.log('=== Form Data Debug ===');
  console.log('Form element:', form);
  
  // Test FormData API
  try {
    const formData = new FormData(form);
    console.log('FormData object created successfully');
    
    // Test getting all form data
    const entries = [];
    for (let [key, value] of formData.entries()) {
      entries.push({ key, value });
    }
    console.log('FormData entries:', entries);
  } catch (error) {
    console.error('FormData API failed:', error);
  }
  
  // Test direct element access
  const elements = form.querySelectorAll('[name]');
  console.log('Form elements with name attribute:', elements.length);
  elements.forEach(el => {
    console.log(`${el.name}: ${el.value}`);
  });
  
  console.log('=== End Debug ===');
}

// Database helper with error handling - Updated for Drizzle ORM
async function dbCall(action, data = {}) {
  try {
    console.log(`Making database call: ${action}`, data);
    
    const response = await fetch('/.netlify/functions/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, data })
    });
    
    console.log(`Database response status: ${response.status}`);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Database error response:', errorData);
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log(`Database call successful: ${action}`, result);
    return result;
  } catch (error) {
    console.error(`Database call failed for ${action}:`, error);
    throw error;
  }
}

// Toast notification system
function showToast(message, type = 'info') {
  try {
    // Skip noisy entries that aren't useful in the log console
    const IGNORE = new Set(['Admin panel loaded successfully']);
    if (!IGNORE.has(String(message))) {
      appendLog(type==='error'?'error':type==='warning'?'warn':'info', [message]);
    }
  } catch(_){}
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    border-radius: 8px;
    color: white;
    font-weight: 500;
    z-index: 1000;
    animation: slideIn 0.3s ease-out;
    ${type === 'success' ? 'background: #10b981;' : ''}
    ${type === 'error' ? 'background: #ef4444;' : ''}
    ${type === 'warning' ? 'background: #f59e0b;' : ''}
    ${type === 'info' ? 'background: #06b6d4;' : ''}
  `;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease-in';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Add toast animations
const toastStyle = document.createElement('style');
toastStyle.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
`;
document.head.appendChild(toastStyle);

// Tab functionality
function initTabs() {
  $$('button.tab').forEach(btn => {
    btn.addEventListener('click', () => {
      // Update tab states
      $$('button.tab').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      
      // Update section visibility
      $$('section').forEach(s => s.hidden = true);
      const targetSection = document.querySelector(`#${btn.dataset.tab}`);
      if (targetSection) {
        targetSection.hidden = false;
      }
      
      // Close hamburger menu on mobile after tab selection
      const hamburger = $('.hamburger');
      const navMenu = $('#nav-menu');
      if (hamburger && navMenu) {
        hamburger.classList.remove('active');
        navMenu.classList.remove('active');
        hamburger.setAttribute('aria-expanded', 'false');
      }
    });
  });
}

// Database Monitor - Updated for Drizzle ORM
async function loadHealth() {
  const healthEl = $('#health');
  const healthJsonEl = $('#healthJson');
  
  try {
    healthEl.textContent = 'Checking...';
    healthEl.className = 'muted';
    
    const data = await dbCall('health');
    
    if (data.status === 'healthy') {
      healthEl.textContent = 'OK';
      healthEl.className = 'ok';
    } else {
      healthEl.textContent = 'ERROR';
      healthEl.className = 'bad';
    }
    
    healthJsonEl.textContent = JSON.stringify(data, null, 2);
  } catch (error) {
    healthEl.textContent = 'ERROR';
    healthEl.className = 'bad';
    healthJsonEl.textContent = JSON.stringify({ 
      error: error.message,
      timestamp: new Date().toISOString()
    }, null, 2);
    showToast('Health check failed', 'error');
  }
}

async function loadStats() {
  const statsBody = $('#statsBody');
  
  try {
    const data = await dbCall('stats');
    statsBody.innerHTML = '';
    
    if (data.stats) {
      Object.entries(data.stats).forEach(([table, count]) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${table.charAt(0).toUpperCase() + table.slice(1)}</td>
          <td>${count}</td>
        `;
        statsBody.appendChild(tr);
      });
    }
  } catch (error) {
    showToast('Failed to load statistics', 'error');
    statsBody.innerHTML = '<tr><td colspan="2">Error loading statistics</td></tr>';
  }
}

// Environment and Connection Monitoring
async function loadEnvironmentInfo() {
  const envVarsEl = $('#envVars');
  const connectionInfoEl = $('#connectionInfo');
  const connectionTestEl = $('#connectionTest');
  
  try {
    // Get environment information from backend
    const envData = await dbCall('system.environment');
    
    // Display environment variables
    envVarsEl.innerHTML = '';
    const envVars = {
      'CONTEXT': envData.context || 'Not set',
      'NODE_ENV': envData.nodeEnv || 'Not set',
      'NETLIFY_DATABASE_URL': envData.hasDatabaseUrl ? 'Set (auto)' : 'Not set',
      'Database URL Info': envData.databaseUrlInfo || 'Unknown',
      'Database URL Source': envData.databaseUrl || 'Unknown'
    };
    
    Object.entries(envVars).forEach(([key, value]) => {
      const item = document.createElement('div');
      item.className = 'env-item';
      item.innerHTML = `
        <div class="env-label">${key}</div>
        <div class="env-value ${value.includes('masked') ? 'masked' : ''}">${value}</div>
      `;
      envVarsEl.appendChild(item);
    });
    
    // Display connection details
    connectionInfoEl.innerHTML = '';
    const connectionDetails = {
      'Environment': envData.environment || 'Unknown',
      'Context': envData.context || 'Unknown',
      'Is Development': envData.isDev ? 'Yes' : 'No',
      'Is Production': envData.isProd ? 'Yes' : 'No',
      'Database URL Source': envData.databaseUrl || 'Unknown'
    };
    
    Object.entries(connectionDetails).forEach(([key, value]) => {
      const item = document.createElement('div');
      item.className = 'env-item';
      const valueClass = value === 'Yes' ? 'success' : value === 'No' ? 'warning' : '';
      item.innerHTML = `
        <div class="env-label">${key}</div>
        <div class="env-value ${valueClass}">${value}</div>
      `;
      connectionInfoEl.appendChild(item);
    });
    
    // Test connection and display results
    connectionTestEl.innerHTML = '';
    try {
      const healthData = await dbCall('system.testConnection');
      const testResults = {
        'Connection Status': healthData.connected ? 'Connected' : 'Failed',
        'Response Time': 'N/A', // Not provided in new API
        'Database Version': 'N/A', // Not provided in new API
        'Server Time': healthData.timestamp || 'Unknown'
      };
      
      Object.entries(testResults).forEach(([key, value]) => {
        const item = document.createElement('div');
        item.className = 'env-item';
        let valueClass = '';
        if (key === 'Connection Status') {
          valueClass = value === 'Connected' ? 'success' : 'error';
        }
        item.innerHTML = `
          <div class="env-label">${key}</div>
          <div class="env-value ${valueClass}">${value}</div>
        `;
        connectionTestEl.appendChild(item);
      });
    } catch (healthError) {
      const item = document.createElement('div');
      item.className = 'env-item';
      item.innerHTML = `
        <div class="env-label">Connection Status</div>
        <div class="env-value error">Failed: ${healthError.message}</div>
      `;
      connectionTestEl.appendChild(item);
    }
    
  } catch (error) {
    console.error('Failed to load environment info:', error);
    
    // Show error state
    envVarsEl.innerHTML = '<div class="env-value error">Failed to load environment variables</div>';
    connectionInfoEl.innerHTML = '<div class="env-value error">Failed to load connection details</div>';
    connectionTestEl.innerHTML = '<div class="env-value error">Failed to test connection</div>';
    
    showToast('Failed to load environment information', 'error');
  }
}

// Students Management - Updated for Drizzle ORM
async function loadStudents() {
  const studentsBody = $('#studentsBody');
  
  try {
    const data = await dbCall('student.list');
    studentsBody.innerHTML = '';
    
    if (data.students && data.students.length > 0) {
      data.students.forEach(student => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${student.name}</td>
          <td>${student.dob || '—'}</td>
          <td>${student.grade || '—'}</td>
          <td>${student.startYear || '—'}</td>
          <td>
            <button class="btn-edit" data-id="${student.id}" aria-label="Edit student">Edit</button>
            <button class="btn-delete" data-id="${student.id}" aria-label="Delete student">Delete</button>
          </td>
        `;
        studentsBody.appendChild(tr);
      });
    } else {
      studentsBody.innerHTML = '<tr><td colspan="5">No students found</td></tr>';
    }
  } catch (error) {
    showToast('Failed to load students', 'error');
    studentsBody.innerHTML = '<tr><td colspan="5">Error loading students</td></tr>';
  }
}

async function addStudent(form) {
  try {
    const firstName = getFormValue(form, 'first_name');
    const lastName = getFormValue(form, 'last_name');
    
    const studentData = {
      name: firstName + ' ' + lastName,
      dob: getFormValue(form, 'birth_date') || null,
      grade: getFormValue(form, 'grade') || null,
      startYear: getFormValue(form, 'start_year') ? parseInt(getFormValue(form, 'start_year')) : null,
      notes: getFormValue(form, 'notes') || null
    };
    
    // Validate required fields
    if (!firstName.trim() || !lastName.trim()) {
      showToast('First name and last name are required', 'error');
      return;
    }
    
    console.log('Adding student with data:', studentData);
    const result = await dbCall('student.insert', studentData);
    
    if (result.id) {
      showToast('Student added successfully', 'success');
      form.reset();
      await loadStudents();
    }
  } catch (error) {
    console.error('Error adding student:', error);
    showToast(`Failed to add student: ${error.message}`, 'error');
  }
}

// Courses Management - Updated for Drizzle ORM
async function loadCourses() {
  const coursesBody = $('#coursesBody');
  
  try {
    const data = await dbCall('course.list');
    coursesBody.innerHTML = '';
    
    if (data.courses && data.courses.length > 0) {
      data.courses.forEach(course => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${course.title}</td>
          <td>${course.subject}</td>
          <td>${course.description || '—'}</td>
          <td>${course.createdAt ? new Date(course.createdAt).toLocaleDateString() : '—'}</td>
          <td>
            <button class="btn-edit" data-id="${course.id}" aria-label="Edit course">Edit</button>
            <button class="btn-delete" data-id="${course.id}" aria-label="Delete course">Delete</button>
          </td>
        `;
        coursesBody.appendChild(tr);
      });
    } else {
      coursesBody.innerHTML = '<tr><td colspan="5">No courses found</td></tr>';
    }
  } catch (error) {
    showToast('Failed to load courses', 'error');
    coursesBody.innerHTML = '<tr><td colspan="5">Error loading courses</td></tr>';
  }
}

async function addCourse(form) {
  try {
    // Debug form data
    debugFormData(form);
    
    const courseData = {
      title: getFormValue(form, 'title'),
      subject: getFormValue(form, 'subject'),
      description: getFormValue(form, 'description') || null
    };
    
    // Validate required fields
    if (!courseData.title.trim()) {
      showToast('Course title is required', 'error');
      return;
    }
    if (!courseData.subject.trim()) {
      showToast('Subject is required', 'error');
      return;
    }
    
    console.log('Adding course with data:', courseData);
    const result = await dbCall('course.insert', courseData);
    
    if (result.id) {
      showToast('Course added successfully', 'success');
      form.reset();
      await loadCourses();
    }
  } catch (error) {
    console.error('Error adding course:', error);
    showToast(`Failed to add course: ${error.message}`, 'error');
  }
}

// Logs Management - Updated for Drizzle ORM
async function loadLogs() {
  const logsBody = $('#logsBody');
  
  try {
    const data = await dbCall('log.list');
    logsBody.innerHTML = '';
    
    if (data.logs && data.logs.length > 0) {
      data.logs.forEach(log => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${log.date}</td>
          <td>${log.studentName || '—'}</td>
          <td>${log.courseTitle || '—'}</td>
          <td>${log.subject || '—'}</td>
          <td>${log.hours}</td>
          <td>${log.location}</td>
          <td>${log.notes || '—'}</td>
          <td>
            <button class="btn-edit" data-id="${log.id}" aria-label="Edit log">Edit</button>
            <button class="btn-delete" data-id="${log.id}" aria-label="Delete log">Delete</button>
          </td>
        `;
        logsBody.appendChild(tr);
      });
    } else {
      logsBody.innerHTML = '<tr><td colspan="8">No logs found</td></tr>';
    }
  } catch (error) {
    showToast('Failed to load logs', 'error');
    logsBody.innerHTML = '<tr><td colspan="8">Error loading logs</td></tr>';
  }
}

async function addLog(form) {
  try {
    const studentId = getFormValue(form, 'student_id');
    const courseId = getFormValue(form, 'course_id');
    
    const logData = {
      studentId: parseInt(studentId),
      courseId: parseInt(courseId),
      date: getFormValue(form, 'date'),
      hours: parseFloat(getFormValue(form, 'hours')),
      location: getFormValue(form, 'location'),
      notes: getFormValue(form, 'notes') || null
    };
    
    // Validate required fields
    if (!logData.studentId || isNaN(logData.studentId)) {
      showToast('Please select a student', 'error');
      return;
    }
    if (!logData.courseId || isNaN(logData.courseId)) {
      showToast('Please select a course', 'error');
      return;
    }
    if (!logData.date) {
      showToast('Date is required', 'error');
      return;
    }
    if (!logData.hours || isNaN(logData.hours) || logData.hours < 0.25) {
      showToast('Valid hours are required (minimum 0.25)', 'error');
      return;
    }
    
    console.log('Adding log with data:', logData);
    const result = await dbCall('log.insert', logData);
    
    if (result.id) {
      showToast('Log entry added successfully', 'success');
      form.reset();
      await loadLogs();
    }
  } catch (error) {
    console.error('Error adding log:', error);
    showToast(`Failed to add log entry: ${error.message}`, 'error');
  }
}

// Event Listeners
function initEventListeners() {
  // Tab switching
  initTabs();
  
  // Hamburger menu
  const hamburger = $('.hamburger');
  const navMenu = $('#nav-menu');
  
  hamburger?.addEventListener('click', () => {
    const isExpanded = hamburger.getAttribute('aria-expanded') === 'true';
    hamburger.classList.toggle('active');
    navMenu.classList.toggle('active');
    hamburger.setAttribute('aria-expanded', !isExpanded);
  });
  
  // Close menu when clicking outside
  document.addEventListener('click', (e) => {
    if (!hamburger.contains(e.target) && !navMenu.contains(e.target)) {
      hamburger.classList.remove('active');
      navMenu.classList.remove('active');
      hamburger.setAttribute('aria-expanded', 'false');
    }
  });
  
  // Close menu when pressing Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      hamburger.classList.remove('active');
      navMenu.classList.remove('active');
      hamburger.setAttribute('aria-expanded', 'false');
    }
  });
  
  // Health and stats
  $('#refreshStats')?.addEventListener('click', loadStats);
  $('#refreshEnv')?.addEventListener('click', loadEnvironmentInfo);
  
  // Students
  $('#studentForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await addStudent(e.target);
  });
  $('#reloadStudents')?.addEventListener('click', loadStudents);
  
  // Courses
  $('#courseForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await addCourse(e.target);
  });
  $('#reloadCourses')?.addEventListener('click', loadCourses);
  
  // Logs
  $('#logForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await addLog(e.target);
  });
  $('#reloadLogs')?.addEventListener('click', loadLogs);
  
  // Delete buttons (delegated event handling)
  document.addEventListener('click', async (e) => {
    if (e.target.classList.contains('btn-delete')) {
      if (confirm('Are you sure you want to delete this item?')) {
        const id = e.target.dataset.id;
        const type = e.target.closest('section').id;
        
        try {
          // This would need to be implemented in the API
          showToast('Delete functionality not yet implemented', 'warning');
        } catch (error) {
          showToast(`Failed to delete: ${error.message}`, 'error');
        }
      }
    }
  });
}

// Auto-refresh functionality
function startAutoRefresh() {
  // Refresh health check every 30 seconds
  setInterval(loadHealth, 30000);
  
  // Refresh stats every 2 minutes
  setInterval(loadStats, 120000);
  
  // Refresh environment info every 5 minutes
  setInterval(loadEnvironmentInfo, 300000);
}

// Initialize application
async function init() {
  try {
    // Show loading state
    document.body.classList.add('loading');
    
    // Initialize event listeners
    initEventListeners();
    
    // Load initial data
    await Promise.all([
      loadHealth(),
      loadStats(),
      loadEnvironmentInfo(),
      loadStudents(),
      loadCourses(),
      loadLogs()
    ]);
    
    // Start auto-refresh
    startAutoRefresh();
    
    // Remove loading state
    document.body.classList.remove('loading');
  } catch (error) {
    console.error('Failed to initialize admin panel:', error);
    showToast('Failed to initialize admin panel', 'error');
  }
}

// Start the application when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}