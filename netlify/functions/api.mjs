import { neon } from '@netlify/neon';
import { drizzle } from 'drizzle-orm/neon-http';
import { 
  students, 
  courses, 
  logs, 
  portfolio, 
  files, 
  settings 
} from '../../db/schema.js';
import { eq, and, desc, asc, sql, count } from 'drizzle-orm';

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

    // Test database connection
    if (action === 'test') {
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
          studentName: data.studentName || null,
          courseTitle: data.courseTitle || null,
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

    return errorResponse(`Unknown action: ${action}`, 400);

  } catch (error) {
    console.error('Function error:', error);
    return errorResponse('Internal server error', 500);
  }
}