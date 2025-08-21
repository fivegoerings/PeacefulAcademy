import { neon } from '@netlify/neon';
import { getEnvironmentConfig, logEnvironmentInfo, createDatabaseConnection, validateDatabaseConnection, getEnvironmentSettings } from './db-config.mjs';

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
    // @netlify/neon automatically uses NETLIFY_DATABASE_URL
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
    const action = (event.queryStringParameters?.action) ||
                   (JSON.parse(event.body || '{}').action);

    // Ensure tables exist with proper schema
    try {
      await sql`CREATE TABLE IF NOT EXISTS students (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        dob DATE,
        grade VARCHAR(50),
        start_year INTEGER,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )`;

      await sql`CREATE TABLE IF NOT EXISTS courses (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        subject VARCHAR(100) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )`;

      await sql`CREATE TABLE IF NOT EXISTS logs (
        id SERIAL PRIMARY KEY,
        student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        student_name TEXT,
        course_title TEXT,
        subject VARCHAR(100),
        date DATE NOT NULL,
        hours NUMERIC(5,2) NOT NULL,
        location VARCHAR(50) NOT NULL DEFAULT 'home',
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )`;

      await sql`CREATE TABLE IF NOT EXISTS portfolio (
        id SERIAL PRIMARY KEY,
        student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT,
        tags TEXT[],
        date DATE NOT NULL,
        file_id INTEGER,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )`;

      await sql`CREATE TABLE IF NOT EXISTS files (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(100) NOT NULL,
        size INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )`;

      await sql`CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        key VARCHAR(100) NOT NULL UNIQUE,
        value TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )`;

      // Backups table for full JSON snapshots
      await sql`CREATE TABLE IF NOT EXISTS backups (
        id BIGSERIAL PRIMARY KEY,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        note TEXT,
        payload JSONB NOT NULL
      )`;
    } catch (schemaError) {
      console.error('Schema creation failed:', schemaError);
      return errorResponse(`Schema creation failed: ${schemaError?.message || schemaError}`, 500);
    }

    // Ensure optional columns exist on existing installations
    try {
      await sql`ALTER TABLE logs ADD COLUMN IF NOT EXISTS student_name TEXT`;
      await sql`ALTER TABLE logs ADD COLUMN IF NOT EXISTS course_title TEXT`;
      // Ensure a unique index exists for upsert by (student_id, date)
      await sql`CREATE UNIQUE INDEX IF NOT EXISTS logs_student_date_unique ON logs (student_id, date)`;
    } catch (alterError) {
      // Non-fatal; continue
      console.warn('Optional column ensure failed:', alterError);
    }

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
          INSERT INTO logs (student_id, course_id, student_name, course_title, subject, date, hours, location, notes)
          VALUES (${parseInt(data.studentId)}, ${parseInt(data.courseId)}, ${data.studentName || null}, ${data.courseTitle || null}, ${data.subject || null}, 
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

    // Backup operations (store entire app snapshot as JSONB)
    if (action === 'backup.save') {
      if (!data || !data.payload) {
        return errorResponse('Missing payload for backup.save');
      }
      try {
        const note = data.note || null;
        const payloadJson = JSON.stringify(data.payload);
        const [row] = await sql`
          INSERT INTO backups (note, payload)
          VALUES (${note}, ${payloadJson}::jsonb)
          RETURNING id, created_at
        `;
        return jsonResponse({ ok: true, id: row.id, created_at: row.created_at });
      } catch (error) {
        console.error('backup.save failed:', error);
        return errorResponse(`Failed to save backup: ${error?.message || error}`, 500);
      }
    }

    if (action === 'backup.list') {
      try {
        const rows = await sql`SELECT id, created_at, note FROM backups ORDER BY id DESC LIMIT 50`;
        return jsonResponse({ ok: true, backups: rows });
      } catch (error) {
        console.error('backup.list failed:', error);
        return errorResponse('Failed to list backups', 500);
      }
    }

    if (action === 'backup.latest') {
      try {
        const rows = await sql`SELECT id, created_at, note, payload FROM backups ORDER BY id DESC LIMIT 1`;
        const latest = rows[0] || null;
        return jsonResponse({ ok: true, backup: latest });
      } catch (error) {
        console.error('backup.latest failed:', error);
        return errorResponse('Failed to fetch latest backup', 500);
      }
    }

    if (action === 'backup.read') {
      if (!data || !data.id) return errorResponse('Backup id is required');
      try {
        const id = parseInt(data.id);
        const rows = await sql`SELECT id, created_at, note, payload FROM backups WHERE id = ${id}`;
        const b = rows[0] || null;
        if (!b) return errorResponse('Backup not found', 404);
        return jsonResponse({ ok: true, backup: b });
      } catch (error) {
        console.error('backup.read failed:', error);
        return errorResponse('Failed to read backup', 500);
      }
    }

    // Backfill logs: populate student_name, course_title, and subject from related tables
    if (action === 'logs.backfill') {
      try {
        const [sRow] = await sql`
          WITH upd AS (
            UPDATE logs AS l
            SET student_name = s.name
            FROM students AS s
            WHERE l.student_id = s.id AND (l.student_name IS NULL OR l.student_name = '')
            RETURNING 1
          )
          SELECT COUNT(*)::int AS count FROM upd
        `;

        const [cRow] = await sql`
          WITH upd AS (
            UPDATE logs AS l
            SET course_title = c.title
            FROM courses AS c
            WHERE l.course_id = c.id AND (l.course_title IS NULL OR l.course_title = '')
            RETURNING 1
          )
          SELECT COUNT(*)::int AS count FROM upd
        `;

        const [subjRow] = await sql`
          WITH upd AS (
            UPDATE logs AS l
            SET subject = c.subject
            FROM courses AS c
            WHERE l.course_id = c.id AND (l.subject IS NULL OR l.subject = '')
            RETURNING 1
          )
          SELECT COUNT(*)::int AS count FROM upd
        `;

        return jsonResponse({ ok: true, updated: { student_name: sRow?.count || 0, course_title: cRow?.count || 0, subject: subjRow?.count || 0 } });
      } catch (error) {
        console.error('logs.backfill failed:', error);
        return errorResponse(`Backfill failed: ${error?.message || error}`, 500);
      }
    }

    // Bulk: read all tables from Neon
    if (action === 'bulk.readAll') {
      try {
        const [studentsRows, coursesRows, logsRows, portfolioRows, filesRows, settingsRows] = await Promise.all([
          sql`SELECT id, name, dob, grade, start_year, notes, created_at, updated_at FROM students ORDER BY id`,
          sql`SELECT id, title, subject, description, created_at, updated_at FROM courses ORDER BY id`,
          sql`SELECT id, student_id, course_id, subject, date, hours, location, notes, created_at FROM logs ORDER BY id`,
          sql`SELECT id, student_id, course_id, title, description, tags, date, file_id, created_at FROM portfolio ORDER BY id`,
          sql`SELECT id, name, type, size, created_at FROM files ORDER BY id`,
          sql`SELECT key, value FROM settings`
        ]);

        const settings = settingsRows.reduce((acc, row) => {
          acc[row.key] = row.value;
          return acc;
        }, {});

        const data = {
          settings: {
            name: settings.name || null,
            phone: settings.phone || null,
            address: settings.address || null,
            yearStart: settings.yearStart || '07-01'
          },
          students: studentsRows.map(r => ({
            id: r.id,
            name: r.name,
            dob: r.dob || null,
            grade: r.grade || null,
            startYear: r.start_year || null,
            notes: r.notes || null,
            createdAt: r.created_at,
            updatedAt: r.updated_at
          })),
          courses: coursesRows.map(r => ({
            id: r.id,
            title: r.title,
            subject: r.subject,
            description: r.description || null,
            createdAt: r.created_at,
            updatedAt: r.updated_at
          })),
          logs: logsRows.map(r => ({
            id: r.id,
            studentId: r.student_id,
            courseId: r.course_id,
            studentName: r.student_name || null,
            courseTitle: r.course_title || null,
            subject: r.subject || null,
            date: r.date,
            hours: parseFloat(r.hours),
            location: r.location,
            notes: r.notes || null,
            createdAt: r.created_at
          })),
          portfolio: portfolioRows.map(r => ({
            id: r.id,
            studentId: r.student_id,
            courseId: r.course_id,
            title: r.title,
            desc: r.description || null,
            tags: r.tags || [],
            date: r.date,
            fileId: r.file_id || null,
            createdAt: r.created_at
          })),
          files: filesRows.map(r => ({
            id: r.id,
            name: r.name,
            type: r.type,
            size: r.size,
            createdAt: r.created_at
          }))
        };

        return jsonResponse({ ok: true, data });
      } catch (error) {
        console.error('bulk.readAll failed:', error);
        return errorResponse('Failed to read all data from Neon', 500);
      }
    }

    // Bulk: upsert all tables into Neon
    if (action === 'bulk.upsertAll') {
      try {
        const payload = data || {};
        const resultSummary = { settings: 0, students: 0, courses: 0, logs: 0, portfolio: 0, files: 0 };

        // Settings: store each field as its own key
        if (payload.settings && typeof payload.settings === 'object') {
          const entries = Object.entries(payload.settings).filter(([_, v]) => v !== undefined);
          for (const [key, value] of entries) {
            await sql`
              INSERT INTO settings (key, value)
              VALUES (${key}, ${String(value)})
              ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
            `;
            resultSummary.settings++;
          }
        }

        // Students
        if (Array.isArray(payload.students)) {
          for (const s of payload.students) {
            if (s.id != null) {
              await sql`
                INSERT INTO students (id, name, dob, grade, start_year, notes)
                VALUES (${s.id}, ${s.name}, ${s.dob || null}, ${s.grade || null}, ${s.startYear || null}, ${s.notes || null})
                ON CONFLICT (id) DO UPDATE SET 
                  name = EXCLUDED.name,
                  dob = EXCLUDED.dob,
                  grade = EXCLUDED.grade,
                  start_year = EXCLUDED.start_year,
                  notes = EXCLUDED.notes,
                  updated_at = NOW()
              `;
            } else {
              await sql`
                INSERT INTO students (name, dob, grade, start_year, notes)
                VALUES (${s.name}, ${s.dob || null}, ${s.grade || null}, ${s.startYear || null}, ${s.notes || null})
              `;
            }
            resultSummary.students++;
          }
        }

        // Courses
        if (Array.isArray(payload.courses)) {
          for (const c of payload.courses) {
            if (c.id != null) {
              await sql`
                INSERT INTO courses (id, title, subject, description)
                VALUES (${c.id}, ${c.title}, ${c.subject}, ${c.description || null})
                ON CONFLICT (id) DO UPDATE SET 
                  title = EXCLUDED.title,
                  subject = EXCLUDED.subject,
                  description = EXCLUDED.description,
                  updated_at = NOW()
              `;
            } else {
              await sql`
                INSERT INTO courses (title, subject, description)
                VALUES (${c.title}, ${c.subject}, ${c.description || null})
              `;
            }
            resultSummary.courses++;
          }
        }

        // Logs
        if (Array.isArray(payload.logs)) {
          for (const l of payload.logs) {
            const studentId = parseInt(l.studentId);
            const courseId = parseInt(l.courseId);
            const hours = parseFloat(l.hours);
            // Upsert based on unique index (student_id, date)
            await sql`
              INSERT INTO logs (id, student_id, course_id, student_name, course_title, subject, date, hours, location, notes)
              VALUES (${l.id || null}, ${studentId}, ${courseId}, ${l.studentName || null}, ${l.courseTitle || null}, ${l.subject || null}, ${l.date}, ${hours}, ${l.location}, ${l.notes || null})
              ON CONFLICT (student_id, date) DO UPDATE SET
                student_id = EXCLUDED.student_id,
                course_id = EXCLUDED.course_id,
                student_name = COALESCE(EXCLUDED.student_name, logs.student_name),
                course_title = COALESCE(EXCLUDED.course_title, logs.course_title),
                subject = COALESCE(EXCLUDED.subject, logs.subject),
                date = EXCLUDED.date,
                hours = EXCLUDED.hours,
                location = EXCLUDED.location,
                notes = EXCLUDED.notes
            `;
            resultSummary.logs++;
          }
        }

        // Portfolio (map desc -> description)
        if (Array.isArray(payload.portfolio)) {
          for (const p of payload.portfolio) {
            const studentId = parseInt(p.studentId);
            const courseId = parseInt(p.courseId);
            if (p.id != null) {
              await sql`
                INSERT INTO portfolio (id, student_id, course_id, title, description, tags, date, file_id)
                VALUES (${p.id}, ${studentId}, ${courseId}, ${p.title}, ${p.desc || null}, ${p.tags || null}, ${p.date}, ${p.fileId || null})
                ON CONFLICT (id) DO UPDATE SET 
                  student_id = EXCLUDED.student_id,
                  course_id = EXCLUDED.course_id,
                  title = EXCLUDED.title,
                  description = EXCLUDED.description,
                  tags = EXCLUDED.tags,
                  date = EXCLUDED.date,
                  file_id = EXCLUDED.file_id
              `;
            } else {
              await sql`
                INSERT INTO portfolio (student_id, course_id, title, description, tags, date, file_id)
                VALUES (${studentId}, ${courseId}, ${p.title}, ${p.desc || null}, ${p.tags || null}, ${p.date}, ${p.fileId || null})
              `;
            }
            resultSummary.portfolio++;
          }
        }

        // Files (metadata only)
        if (Array.isArray(payload.files)) {
          for (const f of payload.files) {
            const size = parseInt(f.size);
            if (f.id != null) {
              await sql`
                INSERT INTO files (id, name, type, size)
                VALUES (${f.id}, ${f.name}, ${f.type}, ${size})
                ON CONFLICT (id) DO UPDATE SET 
                  name = EXCLUDED.name,
                  type = EXCLUDED.type,
                  size = EXCLUDED.size
              `;
            } else {
              await sql`
                INSERT INTO files (name, type, size)
                VALUES (${f.name}, ${f.type}, ${size})
              `;
            }
            resultSummary.files++;
          }
        }

        return jsonResponse({ ok: true, message: 'Bulk upsert completed', counts: resultSummary });
      } catch (error) {
        console.error('bulk.upsertAll failed:', error);
        return errorResponse(`Failed to upsert all data to Neon: ${error?.message || error}`, 500);
      }
    }

    return errorResponse(`Unknown action: ${action}`, 400);

  } catch (error) {
    console.error('Database handler error:', error);
    
    // Handle JSON parse errors
    if (error instanceof SyntaxError) {
      return errorResponse(`Invalid JSON in request body: ${error?.message || error}`, 400);
    }
    
    return errorResponse(`Internal server error: ${error?.message || error}`, 500);
  }
}