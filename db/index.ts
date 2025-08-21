import { neon } from '@netlify/neon';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

// Use Netlify's automatic database URL handling
const sql = neon();

export const db = drizzle(sql, { schema });

// Export the raw SQL client for complex queries
export { sql };

// Database utility functions
export async function testConnection(): Promise<boolean> {
  try {
    await sql`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
}

export async function getDatabaseStats() {
  try {
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
  } catch (error) {
    console.error('Failed to get database stats:', error);
    throw error;
  }
}