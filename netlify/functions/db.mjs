import { neon } from '@netlify/neon';
import { drizzle } from 'drizzle-orm/neon-http';
import { 
  students, 
  courses, 
  logs, 
  portfolio, 
  files, 
  settings,
  backups 
} from '../../db/schema.ts';
import { eq, and, desc, asc, sql, count, sum } from 'drizzle-orm';

// Use Netlify's automatic database URL handling
const sqlClient = neon();
const db = drizzle(sqlClient);

// Helper function to create error response
function errorResponse(message, statusCode = 500) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ error: message })
  };
}

// Helper function to create success response
function jsonResponse(data) {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  };
}

export async function handler(event) {
  try {
    // Use Netlify's automatic database URL handling
    const sql = neon();
    const action = (event.queryStringParameters?.action) ||
                   (JSON.parse(event.body || '{}').action);

    if (!action) {
      return errorResponse('No action specified', 400);
    }

    // Helper: ensure schema up to date (add missing columns)
    async function ensureSchemaUpToDate(){
      // portfolio.file_id column (introduced in newer versions)
      try{
        const q = await sql`SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'portfolio' AND column_name = 'file_id' LIMIT 1`;
        const exists = Array.isArray(q) ? q.length > 0 : (q?.rowCount || 0) > 0;
        if(!exists){
          await sql`ALTER TABLE portfolio ADD COLUMN file_id integer`;
          // Optional: no FK constraint to files to keep flexibility
        }
      }catch(_){ /* ignore so we don't break primary flows */ }
    }

    // System environment information
    if (action === 'system.environment') {
      // Use Netlify CONTEXT exclusively per Netlify docs
      const contextRaw = process.env.CONTEXT || 'local';
      const ctx = String(contextRaw).toLowerCase();
      const isProd = ctx === 'production';
      const isDev = ctx === 'dev' || ctx === 'deploy-preview' || ctx === 'branch-deploy' || ctx === 'local';

      const dbUrl = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL || '';
      const databaseUrlSource = process.env.NETLIFY_DATABASE_URL ? 'NETLIFY_DATABASE_URL' : (process.env.DATABASE_URL ? 'DATABASE_URL' : 'Not set');
      const databaseUrlInfo = dbUrl ? dbUrl.replace(/:[^:@]*@/, ':****@') : 'Not set';

      const environment = isProd ? 'PROD' : 'DEV';

      return jsonResponse({
        environment,
        context: contextRaw,
        isDev,
        isProd,
        databaseUrl: databaseUrlSource,
        databaseUrlSource,
        databaseUrlInfo,
        hasDatabaseUrl: !!dbUrl
      });
    }

    // Manual schema migration trigger
    if (action === 'schema.migrate'){
      try{
        await ensureSchemaUpToDate();
        return jsonResponse({ migrated: true });
      }catch(e){
        return errorResponse('Schema migration failed');
      }
    }

    // List all environment variables (masked)
    if (action === 'system.envAll') {
      try {
        const env = process.env || {};
        const SENSITIVE = /(SECRET|TOKEN|KEY|PASSWORD|PWD|PASS|DATABASE_URL|CONNECTION|API|BEARER|AUTH)/i;
        const masked = {};
        Object.keys(env).forEach((k) => {
          const v = String(env[k] ?? '');
          if (SENSITIVE.test(k)) {
            // mask value but keep hint of length
            const head = v.slice(0, 4);
            const tail = v.slice(-4);
            masked[k] = v ? `${head}…${tail} (masked)` : '';
          } else {
            masked[k] = v;
          }
        });
        return jsonResponse({ env: masked, count: Object.keys(masked).length });
      } catch (error) {
        console.error('Env list error:', error);
        return errorResponse('Failed to list environment variables', 500);
      }
    }

    // Test database connection
    if (action === 'system.testConnection') {
      try {
        await sql`SELECT 1 as test`;
        return jsonResponse({ 
          connected: true, 
          message: 'Database connection successful',
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        return jsonResponse({ 
          connected: false, 
          message: 'Database connection failed',
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Get database statistics
    if (action === 'stats') {
      try {
        const [studentsCount, coursesCount, logsCount, portfolioCount] = await Promise.all([
          db.select({ count: count() }).from(students),
          db.select({ count: count() }).from(courses),
          db.select({ count: count() }).from(logs),
          db.select({ count: count() }).from(portfolio)
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
        console.error('Failed to get stats:', error);
        return errorResponse('Failed to get statistics', 500);
      }
    }

    // Health check
    if (action === 'health') {
      try {
        await sql`SELECT 1`;
        return jsonResponse({ 
          status: 'healthy', 
          timestamp: new Date().toISOString(),
          database: 'connected'
        });
      } catch (error) {
        return jsonResponse({ 
          status: 'unhealthy', 
          timestamp: new Date().toISOString(),
          database: 'disconnected',
          error: error.message
        });
      }
    }

    // Student operations
    if (action === 'student.insert') {
      const { data } = JSON.parse(event.body || '{}');
      try {
        const result = await db.insert(students).values({
          name: data.name,
          dob: data.dob || null,
          grade: data.grade || null,
          startYear: data.startYear || null,
          notes: data.notes || null
        }).returning();
        
        return jsonResponse({ id: result[0].id });
      } catch (error) {
        console.error('Student insert error:', error);
        return errorResponse('Failed to insert student', 500);
      }
    }

    if (action === 'student.update') {
      const { data } = JSON.parse(event.body || '{}');
      try {
        if (!data.id) {
          return errorResponse('Student ID is required', 400);
        }
        
        const result = await db.update(students)
          .set({
            name: data.name,
            dob: data.dob || null,
            grade: data.grade || null,
            startYear: data.startYear || null,
            notes: data.notes || null,
            updatedAt: new Date()
          })
          .where(eq(students.id, data.id))
          .returning();
        
        if (result.length === 0) {
          return errorResponse('Student not found', 404);
        }
        
        return jsonResponse({ id: result[0].id });
      } catch (error) {
        console.error('Student update error:', error);
        return errorResponse('Failed to update student', 500);
      }
    }

    if (action === 'student.delete') {
      const { data } = JSON.parse(event.body || '{}');
      try {
        if (!data.id) {
          return errorResponse('Student ID is required', 400);
        }
        
        const result = await db.delete(students)
          .where(eq(students.id, data.id))
          .returning();
        
        if (result.length === 0) {
          return errorResponse('Student not found', 404);
        }
        
        return jsonResponse({ id: result[0].id });
      } catch (error) {
        console.error('Student delete error:', error);
        return errorResponse('Failed to delete student', 500);
      }
    }

    if (action === 'student.list') {
      try {
        const result = await db.select().from(students).orderBy(asc(students.name));
        return jsonResponse({ students: result });
      } catch (error) {
        console.error('Student list error:', error);
        return errorResponse('Failed to list students', 500);
      }
    }

    // Course operations
    if (action === 'course.insert') {
      const { data } = JSON.parse(event.body || '{}');
      try {
        const result = await db.insert(courses).values({
          title: data.title,
          subject: data.subject,
          description: data.description || null
        }).returning();
        
        return jsonResponse({ id: result[0].id });
      } catch (error) {
        console.error('Course insert error:', error);
        return errorResponse('Failed to insert course', 500);
      }
    }

    if (action === 'course.update') {
      const { data } = JSON.parse(event.body || '{}');
      try {
        if (!data.id) {
          return errorResponse('Course ID is required', 400);
        }
        
        const result = await db.update(courses)
          .set({
            title: data.title,
            subject: data.subject,
            description: data.description || null,
            updatedAt: new Date()
          })
          .where(eq(courses.id, data.id))
          .returning();
        
        if (result.length === 0) {
          return errorResponse('Course not found', 404);
        }
        
        return jsonResponse({ id: result[0].id });
      } catch (error) {
        console.error('Course update error:', error);
        return errorResponse('Failed to update course', 500);
      }
    }

    if (action === 'course.delete') {
      const { data } = JSON.parse(event.body || '{}');
      try {
        if (!data.id) {
          return errorResponse('Course ID is required', 400);
        }
        
        const result = await db.delete(courses)
          .where(eq(courses.id, data.id))
          .returning();
        
        if (result.length === 0) {
          return errorResponse('Course not found', 404);
        }
        
        return jsonResponse({ id: result[0].id });
      } catch (error) {
        console.error('Course delete error:', error);
        return errorResponse('Failed to delete course', 500);
      }
    }

    if (action === 'course.list') {
      try {
        const result = await db.select().from(courses).orderBy(asc(courses.title));
        return jsonResponse({ courses: result });
      } catch (error) {
        console.error('Course list error:', error);
        return errorResponse('Failed to list courses', 500);
      }
    }

    // Log operations
    if (action === 'log.insert') {
      const { data } = JSON.parse(event.body || '{}');
      try {
        const result = await db.insert(logs).values({
          studentId: data.studentId,
          courseId: data.courseId,
          subject: data.subject || null,
          date: data.date,
          hours: data.hours,
          location: data.location || 'home',
          notes: data.notes || null
        }).returning();
        
        return jsonResponse({ id: result[0].id });
      } catch (error) {
        console.error('Log insert error:', error);
        return errorResponse('Failed to insert log', 500);
      }
    }

    if (action === 'log.update') {
      const { data } = JSON.parse(event.body || '{}');
      try {
        if (!data.id) {
          return errorResponse('Log ID is required', 400);
        }
        
        const result = await db.update(logs)
          .set({
            studentId: data.studentId,
            courseId: data.courseId,
            studentName: data.studentName || null,
            courseTitle: data.courseTitle || null,
            subject: data.subject || null,
            date: data.date,
            hours: data.hours,
            location: data.location || 'home',
            notes: data.notes || null
          })
          .where(eq(logs.id, data.id))
          .returning();
        
        if (result.length === 0) {
          return errorResponse('Log not found', 404);
        }
        
        return jsonResponse({ id: result[0].id });
      } catch (error) {
        console.error('Log update error:', error);
        return errorResponse('Failed to update log', 500);
      }
    }

    if (action === 'log.delete') {
      const { data } = JSON.parse(event.body || '{}');
      try {
        if (!data.id) {
          return errorResponse('Log ID is required', 400);
        }
        
        const result = await db.delete(logs)
          .where(eq(logs.id, data.id))
          .returning();
        
        if (result.length === 0) {
          return errorResponse('Log not found', 404);
        }
        
        return jsonResponse({ id: result[0].id });
      } catch (error) {
        console.error('Log delete error:', error);
        return errorResponse('Failed to delete log', 500);
      }
    }

    if (action === 'log.list') {
      try {
        const result = await db.select().from(logs).orderBy(desc(logs.date));
        return jsonResponse({ logs: result });
      } catch (error) {
        console.error('Log list error:', error);
        return errorResponse('Failed to list logs', 500);
      }
    }

    // Portfolio operations
    if (action === 'portfolio.insert') {
      const { data } = JSON.parse(event.body || '{}');
      try {
        const result = await db.insert(portfolio).values({
          studentId: data.studentId,
          courseId: data.courseId,
          title: data.title,
          description: data.description || null,
          tags: data.tags || null,
          date: data.date,
          fileId: data.fileId || null
        }).returning();
        
        return jsonResponse({ id: result[0].id });
      } catch (error) {
        console.error('Portfolio insert error:', error);
        return errorResponse('Failed to insert portfolio item', 500);
      }
    }

    if (action === 'portfolio.list') {
      try {
        const result = await db.select().from(portfolio).orderBy(desc(portfolio.date));
        return jsonResponse({ portfolio: result });
      } catch (error) {
        console.error('Portfolio list error:', error);
        return errorResponse('Failed to list portfolio items', 500);
      }
    }

    // Bulk operations
    if (action === 'bulk.readAll') {
      try {
        await ensureSchemaUpToDate();
        // Detect presence of optional columns for backward compatibility
        let hasPortfolioFileId = false;
        try {
          const q = await sql`SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'portfolio' AND column_name = 'file_id' LIMIT 1`;
          hasPortfolioFileId = Array.isArray(q) ? q.length > 0 : (q?.rowCount || 0) > 0;
        } catch(_) { /* default false */ }

        const [studentsList, coursesList, logsList, portfolioListRaw, filesList] = await Promise.all([
          db.select().from(students),
          db.select().from(courses),
          db.select().from(logs),
          (async()=>{
            if (hasPortfolioFileId) {
              return await db.select().from(portfolio);
            }
            // Fallback: select without file_id and map to expected keys
            const rows = await sql`SELECT id, student_id, course_id, title, description, tags, date, created_at FROM portfolio`;
            const arr = Array.isArray(rows) ? rows : (rows?.rows || []);
            return arr.map(r => ({
              id: r.id,
              studentId: r.student_id,
              courseId: r.course_id,
              title: r.title,
              description: r.description,
              tags: r.tags,
              date: r.date,
              createdAt: r.created_at
            }));
          })(),
          db.select().from(files)
        ]);

        // Get settings
        const settingsList = await db.select().from(settings);
        const settingsObj = {};
        settingsList.forEach(s => {
          try {
            settingsObj[s.key] = JSON.parse(s.value);
          } catch(_) {
            settingsObj[s.key] = s.value;
          }
        });

        return jsonResponse({
          data: {
            students: studentsList,
            courses: coursesList,
            logs: logsList,
            portfolio: portfolioListRaw,
            files: filesList,
            settings: settingsObj
          }
        });
      } catch (error) {
        console.error('Bulk read error:', error);
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Failed to read all data', details: String(error && error.message || error) })
        };
      }
    }

    if (action === 'bulk.upsertAll') {
      const { data } = JSON.parse(event.body || '{}');
      try {
        await ensureSchemaUpToDate();
        // Detect optional columns for compatibility (e.g., portfolio.file_id)
        let hasPortfolioFileId = false;
        try {
          const q = await sql`SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'portfolio' AND column_name = 'file_id' LIMIT 1`;
          hasPortfolioFileId = Array.isArray(q) ? q.length > 0 : (q?.rowCount || 0) > 0;
        } catch(_) { /* default false */ }

        // Clear existing data in FK-safe order
        await db.delete(logs);
        await db.delete(portfolio);
        await db.delete(files);
        await db.delete(courses);
        await db.delete(students);
        await db.delete(settings);

        // Insert new data
        if (data.students && data.students.length > 0) {
          await db.insert(students).values(data.students);
        }
        if (data.courses && data.courses.length > 0) {
          await db.insert(courses).values(data.courses);
        }
        if (data.logs && data.logs.length > 0) {
          await db.insert(logs).values(data.logs);
        }
        if (data.portfolio && data.portfolio.length > 0) {
          const portVals = hasPortfolioFileId ? data.portfolio : data.portfolio.map(p => {
            const { fileId, ...rest } = p || {};
            return rest;
          });
          await db.insert(portfolio).values(portVals);
        }
        if (data.files && data.files.length > 0) {
          await db.insert(files).values(data.files);
        }
        if (data.settings) {
          const settingsArray = Object.entries(data.settings).map(([key, value]) => ({
            key,
            value: JSON.stringify(value)
          }));
          if (settingsArray.length > 0) {
            await db.insert(settings).values(settingsArray);
          }
        }

        return jsonResponse({ 
          success: true, 
          message: 'All data upserted successfully',
          counts: {
            students: data.students?.length || 0,
            courses: data.courses?.length || 0,
            logs: data.logs?.length || 0,
            portfolio: data.portfolio?.length || 0,
            files: data.files?.length || 0
          }
        });
      } catch (error) {
        console.error('Bulk upsert error:', error);
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Failed to upsert data', details: String(error && error.message || error) })
        };
      }
    }

    // Backup operations
    if (action === 'backup.save') {
      const { data } = JSON.parse(event.body || '{}');
      try {
        const result = await db.insert(backups).values({
          payload: data.payload,
          note: data.note || 'manual backup',
          createdAt: new Date()
        }).returning();
        
        return jsonResponse({ 
          id: result[0].id,
          message: 'Backup saved successfully'
        });
      } catch (error) {
        console.error('Backup save error:', error);
        return errorResponse('Failed to save backup', 500);
      }
    }

    if (action === 'backup.latest') {
      try {
        const result = await db.select()
          .from(backups)
          .orderBy(desc(backups.createdAt))
          .limit(1);
        
        if (result.length === 0) {
          return jsonResponse({ backup: null });
        }
        
        return jsonResponse({ backup: result[0] });
      } catch (error) {
        console.error('Backup latest error:', error);
        return errorResponse('Failed to get latest backup', 500);
      }
    }

    if (action === 'backup.list') {
      try {
        const result = await db.select()
          .from(backups)
          .orderBy(desc(backups.createdAt))
          .limit(10);
        
        return jsonResponse({ backups: result });
      } catch (error) {
        console.error('Backup list error:', error);
        return errorResponse('Failed to list backups', 500);
      }
    }

    // Log backfill operation
    if (action === 'logs.backfill') {
      try {
        // Get all logs with missing denormalized data
        const logsToUpdate = await db.select()
          .from(logs)
          .where(
            and(
              sql`${logs.studentName} IS NULL OR ${logs.courseTitle} IS NULL OR ${logs.subject} IS NULL`
            )
          );

        let updatedCount = 0;
        for (const log of logsToUpdate) {
          // Get student and course data
          const [student, course] = await Promise.all([
            db.select().from(students).where(eq(students.id, log.studentId)).limit(1),
            db.select().from(courses).where(eq(courses.id, log.courseId)).limit(1)
          ]);

          if (student.length > 0 || course.length > 0) {
            await db.update(logs)
              .set({
                studentName: student[0]?.name || null,
                courseTitle: course[0]?.title || null,
                subject: course[0]?.subject || null
              })
              .where(eq(logs.id, log.id));
            updatedCount++;
          }
        }

        return jsonResponse({
          success: true,
          message: `Backfilled ${updatedCount} log entries`,
          updated: {
            count: updatedCount
          }
        });
      } catch (error) {
        console.error('Log backfill error:', error);
        return errorResponse('Failed to backfill logs', 500);
      }
    }

    return errorResponse(`Unknown action: ${action}`, 400);

  } catch (error) {
    console.error('Function error:', error);
    return errorResponse('Internal server error', 500);
  }
}