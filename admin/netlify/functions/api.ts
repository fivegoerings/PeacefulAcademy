import { neon } from "@netlify/neon";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const json = (data: unknown, init: number | ResponseInit = 200) =>
  new Response(JSON.stringify(data), {
    status: typeof init === "number" ? init : init.status ?? 200,
    headers: { "content-type": "application/json", "access-control-allow-origin": "*" },
  });

// Initialize database connection using Netlify's automatic database URL handling
const sql = neon();

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