import { neon } from '@netlify/neon';

// Import schema manually since ES modules don't support relative imports in Netlify functions
const schema = {
  students: { id: 'id', name: 'name', dob: 'dob', grade: 'grade', startYear: 'start_year', notes: 'notes', createdAt: 'created_at', updatedAt: 'updated_at' },
  courses: { id: 'id', title: 'title', subject: 'subject', description: 'description', createdAt: 'created_at', updatedAt: 'updated_at' },
  logs: { id: 'id', studentId: 'student_id', courseId: 'course_id', subject: 'subject', date: 'date', hours: 'hours', location: 'location', notes: 'notes', createdAt: 'created_at' },
  portfolio: { id: 'id', studentId: 'student_id', courseId: 'course_id', title: 'title', description: 'description', tags: 'tags', date: 'date', fileId: 'file_id', createdAt: 'created_at' }
};

// Input validation helpers
function validateStudentId(studentId) {
  const id = parseInt(studentId);
  return !isNaN(id) && id > 0;
}

function validateYear(year) {
  const y = parseInt(year);
  return !isNaN(y) && y >= 1900 && y <= 2100;
}

function validateHours(hours) {
  const h = parseFloat(hours);
  return !isNaN(h) && h >= 0.25 && h <= 24;
}

function validateDate(dateString) {
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
    // Import environment configuration
    const { getEnvironmentConfig, logEnvironmentInfo, createDatabaseConnection, validateDatabaseConnection, getEnvironmentSettings } = await import('./db-config.mjs');
    
    // Log environment information for debugging
    logEnvironmentInfo();
    
    // Get environment-specific database configuration and settings
    const envConfig = getEnvironmentConfig();
    const envSettings = getEnvironmentSettings();
    
    // Create environment-specific database connection
    let sql;
    try {
      sql = createDatabaseConnection();
      
      // Validate the connection
      const isValid = await validateDatabaseConnection(sql);
      if (!isValid) {
        throw new Error('Database connection validation failed');
      }
    } catch (error) {
      console.error('Failed to create database connection:', error);
      return errorResponse(`Database connection failed: ${error.message}`, 503);
    }
    const path = event.path || '';

    // Health check endpoint
    if (path.includes('/health')) {
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

    // Database statistics endpoint
    if (path.includes('/stats')) {
      try {
        const stats = await getDatabaseStats(sql);
        return jsonResponse({ stats });
      } catch (error) {
        console.error('Stats query failed:', error);
        return errorResponse('Failed to retrieve statistics', 500);
      }
    }

    // Yearly reports endpoint
    if (path.includes('/reports/yearly')) {
      const { studentId, year } = event.queryStringParameters || {};
      
      if (!validateStudentId(studentId)) {
        return errorResponse('Invalid student ID');
      }
      
      if (!validateYear(year)) {
        return errorResponse('Invalid year');
      }

      try {
        const rows = await sql`
          SELECT 
            ${year} AS academic_year,
            SUM(hours)::float AS total_hours,
            SUM(CASE 
              WHEN subject IN ('Reading','Language Arts','Mathematics','Science','Social Studies') 
              THEN hours ELSE 0 END)::float AS core_hours,
            SUM(CASE 
              WHEN subject IN ('Reading','Language Arts','Mathematics','Science','Social Studies') 
              AND location='home' THEN hours ELSE 0 END)::float AS home_core_hours
          FROM logs
          WHERE student_id = ${parseInt(studentId)} 
          AND (EXTRACT(YEAR FROM date) = ${parseInt(year)} 
               OR EXTRACT(YEAR FROM date) = ${parseInt(year) + 1})
        `;
        
        return jsonResponse({ rows });
      } catch (error) {
        console.error('Yearly report query failed:', error);
        return errorResponse('Failed to generate yearly report', 500);
      }
    }

    // Transcript endpoint
    if (path.includes('/transcript/')) {
      const studentId = path.split('/transcript/')[1]?.split('?')[0];
      const q = event.queryStringParameters || {};
      const years = (q.years || '').split(',').filter(Boolean).map(y => parseInt(y));
      const scale = parseInt(q.scale) || 120;

      if (!validateStudentId(studentId)) {
        return errorResponse('Invalid student ID');
      }

      if (years.length === 0) {
        return errorResponse('No years specified');
      }

      if (scale < 1 || scale > 1000) {
        return errorResponse('Invalid scale value');
      }

      try {
        const rows = await sql`
          SELECT 
            EXTRACT(YEAR FROM date) AS academic_year,
            c.title AS course_title, 
            l.subject, 
            SUM(l.hours)::float AS hours_total,
            ROUND(SUM(l.hours) / ${scale}::float, 2) AS credits_scale
          FROM logs l
          JOIN courses c ON l.course_id = c.id
          WHERE l.student_id = ${parseInt(studentId)} 
          AND EXTRACT(YEAR FROM date) = ANY(${years})
          GROUP BY academic_year, c.title, l.subject
          ORDER BY academic_year, c.title
        `;
        
        return jsonResponse({ rows });
      } catch (error) {
        console.error('Transcript query failed:', error);
        return errorResponse('Failed to generate transcript', 500);
      }
    }

    // Student list endpoint
    if (path.includes('/students')) {
      try {
        const students = await sql`SELECT * FROM students ORDER BY name`;
        return jsonResponse({ students });
      } catch (error) {
        console.error('Students query failed:', error);
        return errorResponse('Failed to retrieve students', 500);
      }
    }

    // Course list endpoint
    if (path.includes('/courses')) {
      try {
        const courses = await sql`SELECT * FROM courses ORDER BY title`;
        return jsonResponse({ courses });
      } catch (error) {
        console.error('Courses query failed:', error);
        return errorResponse('Failed to retrieve courses', 500);
      }
    }

    // Logs endpoint
    if (path.includes('/logs')) {
      const { studentId, year, subject } = event.queryStringParameters || {};
      
      try {
        let query = 'SELECT * FROM logs';
        const params = [];
        let whereClauses = [];
        
        if (studentId && validateStudentId(studentId)) {
          whereClauses.push(`student_id = $${params.length + 1}`);
          params.push(parseInt(studentId));
        }
        
        if (year && validateYear(year)) {
          whereClauses.push(`EXTRACT(YEAR FROM date) = $${params.length + 1}`);
          params.push(parseInt(year));
        }
        
        if (subject) {
          whereClauses.push(`subject = $${params.length + 1}`);
          params.push(subject);
        }
        
        if (whereClauses.length > 0) {
          query += ' WHERE ' + whereClauses.join(' AND ');
        }
        
        query += ' ORDER BY date DESC';
        
        const logs = await sql.unsafe(query, ...params);
        return jsonResponse({ logs });
      } catch (error) {
        console.error('Logs query failed:', error);
        return errorResponse('Failed to retrieve logs', 500);
      }
    }

    return errorResponse('Unknown endpoint', 404);

  } catch (error) {
    console.error('API handler error:', error);
    return errorResponse('Internal server error', 500);
  }
}

// Helper function to get database statistics
async function getDatabaseStats(sql) {
  const [studentsCount, coursesCount, logsCount, portfolioCount] = await Promise.all([
    sql`SELECT COUNT(*)::int AS count FROM students`,
    sql`SELECT COUNT(*)::int AS count FROM courses`,
    sql`SELECT COUNT(*)::int AS count FROM logs`,
    sql`SELECT COUNT(*)::int AS count FROM portfolio`
  ]);

  return {
    students: studentsCount[0]?.count || 0,
    courses: coursesCount[0]?.count || 0,
    logs: logsCount[0]?.count || 0,
    portfolio: portfolioCount[0]?.count || 0
  };
}