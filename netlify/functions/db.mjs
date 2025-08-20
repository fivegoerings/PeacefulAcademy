import { neon } from '@neondatabase/serverless';

// Input validation helpers
function validateStudentData(data) {
  const errors = [];
  if (!data.name || data.name.trim().length === 0) {
    errors.push('Student name is required');
  }
  if (data.name && data.name.length > 255) {
    errors.push('Student name is too long (max 255 characters)');
  }
  if (data.dob && !isValidDate(data.dob)) {
    errors.push('Invalid date of birth');
  }
  if (data.grade && data.grade.length > 50) {
    errors.push('Grade is too long (max 50 characters)');
  }
  if (data.startYear && (isNaN(data.startYear) || data.startYear < 1900 || data.startYear > 2100)) {
    errors.push('Invalid start year');
  }
  return errors;
}

function validateCourseData(data) {
  const errors = [];
  if (!data.title || data.title.trim().length === 0) {
    errors.push('Course title is required');
  }
  if (data.title && data.title.length > 255) {
    errors.push('Course title is too long (max 255 characters)');
  }
  if (!data.subject || data.subject.trim().length === 0) {
    errors.push('Subject is required');
  }
  if (data.subject && data.subject.length > 100) {
    errors.push('Subject is too long (max 100 characters)');
  }
  return errors;
}

function validateLogData(data) {
  const errors = [];
  if (!data.studentId || isNaN(data.studentId) || data.studentId <= 0) {
    errors.push('Valid student ID is required');
  }
  if (!data.courseId || isNaN(data.courseId) || data.courseId <= 0) {
    errors.push('Valid course ID is required');
  }
  if (!data.date || !isValidDate(data.date)) {
    errors.push('Valid date is required');
  }
  if (!data.hours || isNaN(data.hours) || data.hours < 0.25 || data.hours > 24) {
    errors.push('Valid hours are required (0.25 to 24)');
  }
  if (!data.location || !['home', 'offsite'].includes(data.location)) {
    errors.push('Location must be "home" or "offsite"');
  }
  if (data.notes && data.notes.length > 1000) {
    errors.push('Notes are too long (max 1000 characters)');
  }
  return errors;
}

function validatePortfolioData(data) {
  const errors = [];
  if (!data.studentId || isNaN(data.studentId) || data.studentId <= 0) {
    errors.push('Valid student ID is required');
  }
  if (!data.courseId || isNaN(data.courseId) || data.courseId <= 0) {
    errors.push('Valid course ID is required');
  }
  if (!data.title || data.title.trim().length === 0) {
    errors.push('Portfolio title is required');
  }
  if (data.title && data.title.length > 255) {
    errors.push('Portfolio title is too long (max 255 characters)');
  }
  if (!data.date || !isValidDate(data.date)) {
    errors.push('Valid date is required');
  }
  if (data.description && data.description.length > 2000) {
    errors.push('Description is too long (max 2000 characters)');
  }
  return errors;
}

function isValidDate(dateString) {
  const date = new Date(dateString);
  return !isNaN(date.getTime()) && date <= new Date();
}

// CORS headers
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400"
  };
}

// JSON response helper
function jsonResponse(data, statusCode = 200) {
  return {
    statusCode,
    headers: { 
      "Content-Type": "application/json", 
      ...corsHeaders() 
    },
    body: JSON.stringify(data)
  };
}

// Error response helper
function errorResponse(message, statusCode = 400) {
  return jsonResponse({ 
    error: message,
    timestamp: new Date().toISOString()
  }, statusCode);
}

export async function handler(event) {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders() };
  }

  try {
    // Validate database connection
    if (!process.env.NETLIFY_DATABASE_URL) {
      return errorResponse('Database configuration error', 500);
    }

    const sql = neon(process.env.NETLIFY_DATABASE_URL);
    const action = (event.queryStringParameters?.action) ||
                   (JSON.parse(event.body || '{}').action);

    // Ensure tables exist with proper schema
    await sql`
      CREATE TABLE IF NOT EXISTS students (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        dob DATE,
        grade VARCHAR(50),
        start_year INTEGER,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS courses (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        subject VARCHAR(100) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS logs (
        id SERIAL PRIMARY KEY,
        student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        subject VARCHAR(100),
        date DATE NOT NULL,
        hours NUMERIC(5,2) NOT NULL,
        location VARCHAR(50) NOT NULL DEFAULT 'home',
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS portfolio (
        id SERIAL PRIMARY KEY,
        student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT,
        tags TEXT[],
        date DATE NOT NULL,
        file_id INTEGER,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS files (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(100) NOT NULL,
        size INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        key VARCHAR(100) NOT NULL UNIQUE,
        value TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `;

    // Health check
    if (action === 'health') {
      try {
        const startTime = Date.now();
        const [result] = await sql`SELECT version() AS version, now() AS now`;
        const latency = Date.now() - startTime;
        
        return jsonResponse({
          ok: true,
          version: result.version,
          timestamp: result.now,
          latency_ms: latency
        });
      } catch (error) {
        console.error('Health check failed:', error);
        return errorResponse('Database connection failed', 503);
      }
    }

    // Statistics
    if (action === 'stats') {
      try {
        const [studentsCount, coursesCount, logsCount, portfolioCount] = await Promise.all([
          sql`SELECT COUNT(*)::int AS count FROM students`,
          sql`SELECT COUNT(*)::int AS count FROM courses`,
          sql`SELECT COUNT(*)::int AS count FROM logs`,
          sql`SELECT COUNT(*)::int AS count FROM portfolio`
        ]);

        return jsonResponse({
          stats: {
            students: studentsCount[0]?.count || 0,
            courses: coursesCount[0]?.count || 0,
            logs: logsCount[0]?.count || 0,
            portfolio: portfolioCount[0]?.count || 0
          }
        });
      } catch (error) {
        console.error('Stats query failed:', error);
        return errorResponse('Failed to retrieve statistics', 500);
      }
    }

    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const data = body.data || {};

    // Student operations
    if (action === 'student.insert') {
      const errors = validateStudentData(data);
      if (errors.length > 0) {
        return errorResponse(errors.join(', '));
      }

      try {
        const [result] = await sql`
          INSERT INTO students (name, dob, grade, start_year, notes)
          VALUES (${data.name.trim()}, ${data.dob || null}, ${data.grade || null}, ${data.startYear || null}, ${data.notes || null})
          RETURNING id
        `;
        
        return jsonResponse({ 
          ok: true, 
          id: result.id,
          message: 'Student added successfully'
        });
      } catch (error) {
        console.error('Student insert failed:', error);
        return errorResponse('Failed to add student', 500);
      }
    }

    // Course operations
    if (action === 'course.insert') {
      const errors = validateCourseData(data);
      if (errors.length > 0) {
        return errorResponse(errors.join(', '));
      }

      try {
        const [result] = await sql`
          INSERT INTO courses (title, subject, description)
          VALUES (${data.title.trim()}, ${data.subject.trim()}, ${data.description || null})
          RETURNING id
        `;
        
        return jsonResponse({ 
          ok: true, 
          id: result.id,
          message: 'Course added successfully'
        });
      } catch (error) {
        console.error('Course insert failed:', error);
        return errorResponse('Failed to add course', 500);
      }
    }

    // Log operations
    if (action === 'log.insert') {
      const errors = validateLogData(data);
      if (errors.length > 0) {
        return errorResponse(errors.join(', '));
      }

      try {
        const [result] = await sql`
          INSERT INTO logs (student_id, course_id, subject, date, hours, location, notes)
          VALUES (${parseInt(data.studentId)}, ${parseInt(data.courseId)}, ${data.subject || null}, 
                  ${data.date}, ${parseFloat(data.hours)}, ${data.location}, ${data.notes || null})
          RETURNING id
        `;
        
        return jsonResponse({ 
          ok: true, 
          id: result.id,
          message: 'Log entry added successfully'
        });
      } catch (error) {
        console.error('Log insert failed:', error);
        return errorResponse('Failed to add log entry', 500);
      }
    }

    // Portfolio operations
    if (action === 'portfolio.insert') {
      const errors = validatePortfolioData(data);
      if (errors.length > 0) {
        return errorResponse(errors.join(', '));
      }

      try {
        const [result] = await sql`
          INSERT INTO portfolio (student_id, course_id, title, description, tags, date, file_id)
          VALUES (${parseInt(data.studentId)}, ${parseInt(data.courseId)}, ${data.title.trim()}, 
                  ${data.description || null}, ${data.tags || null}, ${data.date}, ${data.fileId || null})
          RETURNING id
        `;
        
        return jsonResponse({ 
          ok: true, 
          id: result.id,
          message: 'Portfolio item added successfully'
        });
      } catch (error) {
        console.error('Portfolio insert failed:', error);
        return errorResponse('Failed to add portfolio item', 500);
      }
    }

    // File operations
    if (action === 'file.insert') {
      if (!data.name || !data.type || !data.size) {
        return errorResponse('File name, type, and size are required');
      }

      try {
        const [result] = await sql`
          INSERT INTO files (name, type, size)
          VALUES (${data.name}, ${data.type}, ${parseInt(data.size)})
          RETURNING id
        `;
        
        return jsonResponse({ 
          ok: true, 
          id: result.id,
          message: 'File metadata saved successfully'
        });
      } catch (error) {
        console.error('File insert failed:', error);
        return errorResponse('Failed to save file metadata', 500);
      }
    }

    // Settings operations
    if (action === 'setting.upsert') {
      if (!data.key || data.value === undefined) {
        return errorResponse('Setting key and value are required');
      }

      try {
        await sql`
          INSERT INTO settings (key, value) 
          VALUES (${data.key}, ${data.value})
          ON CONFLICT (key) 
          DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
        `;
        
        return jsonResponse({ 
          ok: true,
          message: 'Setting saved successfully'
        });
      } catch (error) {
        console.error('Setting upsert failed:', error);
        return errorResponse('Failed to save setting', 500);
      }
    }

    return errorResponse(`Unknown action: ${action}`, 400);

  } catch (error) {
    console.error('Database handler error:', error);
    
    // Handle JSON parse errors
    if (error instanceof SyntaxError) {
      return errorResponse('Invalid JSON in request body', 400);
    }
    
    return errorResponse('Internal server error', 500);
  }
}