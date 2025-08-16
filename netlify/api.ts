import { neon } from "@netlify/neon";

const sql = neon(); // uses env NETLIFY_DATABASE_URL

// Load schema if missing
async function ensureSchemaLoaded() {
  const { rows } = await sql`SELECT 1 FROM information_schema.tables WHERE table_name = 'students'`;
  if (rows.length === 0) {
    const schema = await (await fetch("file://" + process.cwd() + "/admin/sql/schema.sql")).text().catch(() => "");
    if (schema) {
      await sql(schema as any);
    }
  }
}

// ... keep the rest of the CRUD + router logic same as in previous version ...
