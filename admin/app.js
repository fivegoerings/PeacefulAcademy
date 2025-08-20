// Utility functions
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

// API helper with error handling
async function apiCall(endpoint, options = {}) {
  try {
    const response = await fetch(`/.netlify/functions/api/${endpoint}`, {
      headers: { 
        'Content-Type': 'application/json',
        ...options.headers 
      },
      ...options
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`API call failed for ${endpoint}:`, error);
    throw error;
  }
}

// Database helper with error handling
async function dbCall(action, data = {}) {
  try {
    const response = await fetch('/.netlify/functions/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, data })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Database call failed for ${action}:`, error);
    throw error;
  }
}

// Toast notification system
function showToast(message, type = 'info') {
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

// Database Monitor
async function loadHealth() {
  const healthEl = $('#health');
  const healthJsonEl = $('#healthJson');
  
  try {
    healthEl.textContent = 'Checking...';
    healthEl.className = 'muted';
    
    const data = await apiCall('health');
    
    if (data.ok) {
      healthEl.textContent = `OK (${data.latency_ms}ms)`;
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
    const data = await apiCall('stats');
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

// Students Management
async function loadStudents() {
  const studentsBody = $('#studentsBody');
  
  try {
    const data = await apiCall('students');
    studentsBody.innerHTML = '';
    
    if (data.students && data.students.length > 0) {
      data.students.forEach(student => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${student.name}</td>
          <td>${student.dob || '—'}</td>
          <td>${student.grade || '—'}</td>
          <td>${student.start_year || '—'}</td>
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

async function addStudent(formData) {
  try {
    const studentData = {
      name: formData.get('first_name') + ' ' + formData.get('last_name'),
      dob: formData.get('birth_date') || null,
      grade: formData.get('grade') || null,
      startYear: formData.get('start_year') ? parseInt(formData.get('start_year')) : null,
      notes: formData.get('notes') || null
    };
    
    const result = await dbCall('student.insert', studentData);
    
    if (result.ok) {
      showToast('Student added successfully', 'success');
      formData.target.reset();
      await loadStudents();
    }
  } catch (error) {
    showToast(`Failed to add student: ${error.message}`, 'error');
  }
}

// Courses Management
async function loadCourses() {
  const coursesBody = $('#coursesBody');
  
  try {
    const data = await apiCall('courses');
    coursesBody.innerHTML = '';
    
    if (data.courses && data.courses.length > 0) {
      data.courses.forEach(course => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${course.title}</td>
          <td>${course.subject}</td>
          <td>${course.description || '—'}</td>
          <td>${course.created_at ? new Date(course.created_at).toLocaleDateString() : '—'}</td>
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

async function addCourse(formData) {
  try {
    const courseData = {
      title: formData.get('title'),
      subject: formData.get('subject'),
      description: formData.get('description') || null
    };
    
    const result = await dbCall('course.insert', courseData);
    
    if (result.ok) {
      showToast('Course added successfully', 'success');
      formData.target.reset();
      await loadCourses();
    }
  } catch (error) {
    showToast(`Failed to add course: ${error.message}`, 'error');
  }
}

// Logs Management
async function loadLogs() {
  const logsBody = $('#logsBody');
  
  try {
    const data = await apiCall('logs');
    logsBody.innerHTML = '';
    
    if (data.logs && data.logs.length > 0) {
      data.logs.forEach(log => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${log.date}</td>
          <td>${log.student_name || '—'}</td>
          <td>${log.course_title || '—'}</td>
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

async function addLog(formData) {
  try {
    const logData = {
      studentId: parseInt(formData.get('student_id')),
      courseId: parseInt(formData.get('course_id')),
      date: formData.get('date'),
      hours: parseFloat(formData.get('hours')),
      location: formData.get('location'),
      notes: formData.get('notes') || null
    };
    
    const result = await dbCall('log.insert', logData);
    
    if (result.ok) {
      showToast('Log entry added successfully', 'success');
      formData.target.reset();
      await loadLogs();
    }
  } catch (error) {
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
      loadStudents(),
      loadCourses(),
      loadLogs()
    ]);
    
    // Start auto-refresh
    startAutoRefresh();
    
    // Remove loading state
    document.body.classList.remove('loading');
    
    showToast('Admin panel loaded successfully', 'success');
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