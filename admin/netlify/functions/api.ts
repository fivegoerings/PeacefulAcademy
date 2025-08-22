import { neon } from "@netlify/neon";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const json = (data: unknown, init: number | ResponseInit = 200) =>
  new Response(JSON.stringify(data), {
    status: typeof init === "number" ? init : init.status ?? 200,
    headers: { "content-type": "application/json", "access-control-allow-origin": "*" },
  });

// Environment-specific database URL handling
function getDatabaseUrl() {
  const context = process.env.CONTEXT || 'unknown';
  
  // For production, use the production database URL
  if (context === 'production') {
    return process.env.PROD_DATABASE_URL || process.env.NETLIFY_DATABASE_URL;
  }
  
  // For non-production environments (dev, deploy-preview, branch-deploy), use the non-prod database URL
  if (context !== 'production') {
    return process.env.NONPROD_DATABASE_URL || process.env.NETLIFY_DATABASE_URL;
  }
  
  // Fallback to Netlify's automatic database URL
  return process.env.NETLIFY_DATABASE_URL;
}

// Initialize database connection with environment-specific URL
let sql;

try {
  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl) {
    console.error('No database URL found. Please set NONPROD_DATABASE_URL for local development or PROD_DATABASE_URL for production.');
    throw new Error('Database URL not configured');
  }
  sql = neon(databaseUrl);
} catch (error) {
  console.error('Failed to initialize database connection:', error.message);
  // We'll handle this in the handler function
}

function schemaPath() {
  const base = process.env.LAMBDA_TASK_ROOT || process.cwd();
  return join(base, "admin", "sql", "schema.sql");
}

async function ensureSchemaLoaded() {
  const rows = await sql`SELECT 1 FROM information_schema.tables WHERE table_name = 'students'`;
  if ((rows as any).length === 0) {
    const schema = await readFile(schemaPath(), "utf8");
    if (schema) await sql(schema as any);
  }
}

/* …CRUD helpers for Students, Courses, Enrollments (same as canvas)… */

export default async (request: Request) => {
  try {
    // Check if database is initialized
    if (!sql) {
      const context = process.env.CONTEXT || 'unknown';
      const isLocalDev = context === 'unknown';
      
      let errorMessage = 'Database connection not configured. ';
      if (isLocalDev) {
        errorMessage += 'For local development, please set the NONPROD_DATABASE_URL environment variable. ';
        errorMessage += 'You can create a .env file with: NONPROD_DATABASE_URL=your_database_url_here';
      } else {
        errorMessage += 'Please check your environment variables configuration.';
      }
      
      return json({ ok: false, error: errorMessage }, 500);
    }

    const url = new URL(request.url);
    const path = url.pathname.replace(/\.netlify\/functions\/api/, "");
    const parts = path.split("/").filter(Boolean);

    if (parts[0] === "health") { /* return health JSON */ }
    if (parts[0] === "stats") { /* return row counts */ }
    if (parts[0] === "students") { /* full student CRUD */ }
    if (parts[0] === "courses") { /* full course CRUD */ }
    if (parts[0] === "enrollments") { /* full enrollment CRUD */ }

    return json({ ok: true, message: "API root" });
  } catch (err: any) {
    return json({ ok: false, error: err?.message ?? String(err) }, 500);
  }
};