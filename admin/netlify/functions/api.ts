import { neon } from "@netlify/neon";

const json = (data: unknown, init: number | ResponseInit = 200) =>
  new Response(JSON.stringify(data), {
    status: typeof init === "number" ? init : init.status ?? 200,
    headers: { "content-type": "application/json" },
  });

const sql = neon(); // uses env NETLIFY_DATABASE_URL

async function ensureSchemaLoaded() {
  const { rows } = await sql`SELECT 1 FROM information_schema.tables WHERE table_name = 'students'`;
  if ((rows as any).length === 0) {
    const schemaPath = "file://" + process.cwd() + "/admin/sql/schema.sql";
    const schema = await (await fetch(schemaPath)).text().catch(() => "");
    if (schema) {
      await sql(schema as any);
    }
  }
}

async function getCounts() {
  const tables = ["students","courses","enrollments","assignments","grades","attendance"] as const;
  const counts: Record<string, number> = {};
  for (const t of tables) {
    const r = await sql`SELECT COUNT(*)::int AS c FROM ${sql(t)}`;
    counts[t] = (r as any)[0].c;
  }
  return counts;
}

async function health() {
  const start = Date.now();
  await sql`SELECT now()`;
  const latency_ms = Date.now() - start;
  return { ok: true, latency_ms, ts: new Date().toISOString() };
}

function parseJSON<T>(request: Request): Promise<T> {
  return request.json() as Promise<T>;
}

// Students CRUD
async function listStudents() {
  return await sql`SELECT * FROM students ORDER BY created_at DESC LIMIT 200`;
}
async function createStudent(body: any) {
  const { first_name, last_name, birth_date, email, phone } = body;
  const rows = await sql`
    INSERT INTO students (first_name,last_name,birth_date,email,phone)
    VALUES (${first_name},${last_name},${birth_date ?? null},${email ?? null},${phone ?? null})
    RETURNING *`;
  return rows[0];
}
async function getStudent(id: string) {
  const rows = await sql`SELECT * FROM students WHERE id = ${id}`;
  return rows[0] ?? null;
}
async function updateStudent(id: string, body: any) {
  const { first_name, last_name, birth_date, email, phone } = body;
  const rows = await sql`
    UPDATE students SET
      first_name = COALESCE(${first_name}, first_name),
      last_name  = COALESCE(${last_name}, last_name),
      birth_date = COALESCE(${birth_date}, birth_date),
      email = COALESCE(${email}, email),
      phone = COALESCE(${phone}, phone)
    WHERE id = ${id}
    RETURNING *`;
  return rows[0] ?? null;
}
async function deleteStudent(id: string) {
  await sql`DELETE FROM students WHERE id = ${id}`;
  return { deleted: true };
}

// Courses CRUD
async function listCourses() {
  return await sql`SELECT * FROM courses ORDER BY created_at DESC LIMIT 200`;
}
async function createCourse(body: any) {
  const { code, title, credits, academic_year } = body;
  const rows = await sql`
    INSERT INTO courses (code,title,credits,academic_year)
    VALUES (${code},${title},${credits ?? 0},${academic_year ?? null})
    RETURNING *`;
  return rows[0];
}
async function updateCourse(id: string, body: any) {
  const { code, title, credits, academic_year } = body;
  const rows = await sql`
    UPDATE courses SET
      code = COALESCE(${code}, code),
      title = COALESCE(${title}, title),
      credits = COALESCE(${credits}, credits),
      academic_year = COALESCE(${academic_year}, academic_year)
    WHERE id = ${id}
    RETURNING *`;
  return rows[0] ?? null;
}
async function deleteCourse(id: string) {
  await sql`DELETE FROM courses WHERE id = ${id}`;
  return { deleted: true };
}

// Enrollments
async function listEnrollments() {
  return await sql`
    SELECT e.*, s.first_name, s.last_name, c.code, c.title
    FROM enrollments e
    JOIN students s ON s.id = e.student_id
    JOIN courses  c ON c.id = e.course_id
    ORDER BY s.last_name, c.code`;
}
async function createEnrollment(body: any) {
  const { student_id, course_id, term, start_date, end_date } = body;
  const rows = await sql`
    INSERT INTO enrollments (student_id,course_id,term,start_date,end_date)
    VALUES (${student_id},${course_id},${term ?? null},${start_date ?? null},${end_date ?? null})
    RETURNING *`;
  return rows[0];
}

export default async (request: Request) => {
  try {
    await ensureSchemaLoaded();

    const url = new URL(request.url);
    const path = url.pathname.replace(/^\/\.netlify\/functions\/api/, "");
    const parts = path.split("/").filter(Boolean);

    if (parts[0] === "health") {
      if (request.method !== "GET") return json({ error: "Method not allowed" }, 405);
      return json(await health());
    }

    if (parts[0] === "stats") {
      if (request.method !== "GET") return json({ error: "Method not allowed" }, 405);
      return json({ ok: true, counts: await getCounts() });
    }

    if (parts[0] === "students") {
      if (request.method === "GET" && !parts[1]) return json(await listStudents());
      if (request.method === "POST" && !parts[1]) return json(await createStudent(await parseJSON(request)), 201);
      if (!parts[1]) return json({ error: "Missing student id" }, 400);
      const id = parts[1];
      if (request.method === "GET") return json((await getStudent(id)) ?? { error: "Not found" });
      if (request.method === "PUT") return json((await updateStudent(id, await parseJSON(request))) ?? { error: "Not found" });
      if (request.method === "DELETE") return json(await deleteStudent(id));
      return json({ error: "Method not allowed" }, 405);
    }

    if (parts[0] === "courses") {
      if (request.method === "GET" && !parts[1]) return json(await listCourses());
      if (request.method === "POST" && !parts[1]) return json(await createCourse(await parseJSON(request)), 201);
      if (!parts[1]) return json({ error: "Missing course id" }, 400);
      const id = parts[1];
      if (request.method === "PUT") return json((await updateCourse(id, await parseJSON(request))) ?? { error: "Not found" });
      if (request.method === "DELETE") return json(await deleteCourse(id));
      return json({ error: "Method not allowed" }, 405);
    }

    if (parts[0] === "enrollments") {
      if (request.method === "GET") return json(await listEnrollments());
      if (request.method === "POST") return json(await createEnrollment(await parseJSON(request)), 201);
      return json({ error: "Method not allowed" }, 405);
    }

    return json({ ok: true, message: "API root. Try /health, /stats, /students, /courses, /enrollments" });
  } catch (err: any) {
    return json({ ok: false, error: err?.message ?? String(err) }, 500);
  }
};
