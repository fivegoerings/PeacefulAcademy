import { neon } from '@neondatabase/serverless';

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders() };
  }

  const action = (event.queryStringParameters?.action) ||
                 (JSON.parse(event.body || '{}').action);

  try {
    const sql = neon(process.env.NETLIFY_DATABASE_URL);

    // one-time: ensure tables exist
    await sql`
      CREATE TABLE IF NOT EXISTS students (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        dob DATE,
        grade TEXT,
        start_year INT,
        notes TEXT
      );
      CREATE TABLE IF NOT EXISTS courses (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        subject TEXT,
        description TEXT
      );
      CREATE TABLE IF NOT EXISTS logs (
        id SERIAL PRIMARY KEY,
        student_id INT REFERENCES students(id),
        course_id INT REFERENCES courses(id),
        subject TEXT,
        date DATE,
        hours NUMERIC,
        location TEXT,
        notes TEXT
      );
      CREATE TABLE IF NOT EXISTS portfolio (
        id SERIAL PRIMARY KEY,
        student_id INT REFERENCES students(id),
        course_id INT REFERENCES courses(id),
        title TEXT,
        description TEXT,
        tags TEXT[],
        date DATE
      );
    `;

    if (action === 'health') {
      const [r] = await sql`SELECT version() AS version, now() AS now`;
      return json({ ok: true, ...r });
    }

    if (action === 'stats') {
      const [[s],[c],[l],[p]] = await Promise.all([
        sql`SELECT COUNT(*)::int AS n FROM students`,
        sql`SELECT COUNT(*)::int AS n FROM courses`,
        sql`SELECT COUNT(*)::int AS n FROM logs`,
        sql`SELECT COUNT(*)::int AS n FROM portfolio`
      ]);
      return json({ stats: { students: s.n, courses: c.n, logs: l.n, portfolio: p.n } });
    }

    // inserts
    const body = JSON.parse(event.body || '{}').data || {};
    if (action === 'student.insert') {
      await sql`INSERT INTO students (name,dob,grade,start_year,notes)
                VALUES (${body.name},${body.dob},${body.grade},${body.startYear},${body.notes})`;
      return json({ ok: true });
    }
    if (action === 'course.insert') {
      await sql`INSERT INTO courses (title,subject,description)
                VALUES (${body.title},${body.subject},${body.description})`;
      return json({ ok: true });
    }
    if (action === 'log.insert') {
      await sql`INSERT INTO logs (student_id,course_id,subject,date,hours,location,notes)
                VALUES (${body.studentId},${body.courseId},${body.subject},
                        ${body.date},${body.hours},${body.location},${body.notes})`;
      return json({ ok: true });
    }
    if (action === 'portfolio.insert') {
      await sql`INSERT INTO portfolio (student_id,course_id,title,description,tags,date)
                VALUES (${body.studentId},${body.courseId},${body.title},
                        ${body.description},${body.tags},${body.date})`;
      return json({ ok: true });
    }

    return json({ error: 'Unknown action: '+action }, 400);

  } catch (e) {
    return json({ error: e.message }, 500);
  }
}

function json(obj, code=200) {
  return {
    statusCode: code,
    headers: { "Content-Type": "application/json", ...corsHeaders() },
    body: JSON.stringify(obj)
  };
}
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}