// netlify/functions/acellus-import.mjs
import { neon } from "@netlify/neon";

const sql = neon(); // uses env NETLIFY_DATABASE_URL

export default async (req, context) => {
  try {
    if (req.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }
    const payload = await req.json();

    // Basic shape validation
    const { student, entries } = payload ?? {};
    if (!student?.student_id || !student?.student_name || !student?.school_year) {
      return json({ error: "Missing student fields." }, 400);
    }
    if (!Array.isArray(entries)) {
      return json({ error: "Entries must be an array." }, 400);
    }

    // Ensure tables exist (idempotent)
    await ensureTables();

    // Upsert student
    await sql/*sql*/`
      INSERT INTO students (student_id, name)
      VALUES (${student.student_id}, ${student.student_name})
      ON CONFLICT (student_id) DO UPDATE SET name = EXCLUDED.name
    `;

    // Upsert term record
    await sql/*sql*/`
      INSERT INTO terms (student_id, school_year, term)
      VALUES (${student.student_id}, ${student.school_year}, ${student.term || null})
      ON CONFLICT (student_id, school_year, term) DO NOTHING
    `;

    // Upsert each course+log
    for (const e of entries) {
      // course catalog by (student, title)
      await sql/*sql*/`
        INSERT INTO courses (student_id, course_title, acellus_category, is_core)
        VALUES (${e.student_id}, ${e.course_title}, ${e.acellus_category}, ${e.is_core})
        ON CONFLICT (student_id, course_title)
        DO UPDATE SET acellus_category = EXCLUDED.acellus_category, is_core = EXCLUDED.is_core
      `;

      // daily/weekly log
      await sql/*sql*/`
        INSERT INTO course_logs
          (entry_id, student_id, school_year, term, date, course_title, hours, location, percent, letter, credits)
        VALUES
          (${e.id}, ${e.student_id}, ${e.school_year}, ${e.term}, ${e.date},
           ${e.course_title}, ${e.hours}, ${e.location}, ${e.percent}, ${e.letter}, ${e.credits})
        ON CONFLICT (entry_id) DO UPDATE
        SET hours = EXCLUDED.hours,
            location = EXCLUDED.location,
            percent = EXCLUDED.percent,
            letter = EXCLUDED.letter,
            credits = EXCLUDED.credits
      `;
    }

    // Return quick rollups for the UI
    const [{ total_hours }] = await sql/*sql*/`
      SELECT COALESCE(SUM(hours),0) AS total_hours
      FROM course_logs
      WHERE student_id = ${student.student_id}
        AND school_year = ${student.school_year}
        AND (term IS NOT DISTINCT FROM ${student.term || null})
    `;
    const [{ total_core_hours }] = await sql/*sql*/`
      SELECT COALESCE(SUM(l.hours),0) AS total_core_hours
      FROM course_logs l
      JOIN courses c ON (c.student_id = l.student_id AND c.course_title = l.course_title)
      WHERE l.student_id = ${student.student_id}
        AND l.school_year = ${student.school_year}
        AND (l.term IS NOT DISTINCT FROM ${student.term || null})
        AND c.is_core = true
    `;

    return json({ ok: true, totals: { hours: Number(total_hours), core_hours: Number(total_core_hours) } });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
  });
}

async function ensureTables() {
  await sql/*sql*/`
    CREATE TABLE IF NOT EXISTS students (
      student_id text PRIMARY KEY,
      name       text NOT NULL,
      active     boolean DEFAULT true
    );
  `;
  await sql/*sql*/`
    CREATE TABLE IF NOT EXISTS terms (
      student_id  text NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
      school_year text NOT NULL,
      term        text,
      PRIMARY KEY (student_id, school_year, term)
    );
  `;
  await sql/*sql*/`
    CREATE TABLE IF NOT EXISTS courses (
      student_id       text NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
      course_title     text NOT NULL,
      acellus_category text,
      is_core          boolean DEFAULT false,
      PRIMARY KEY (student_id, course_title)
    );
  `;
  await sql/*sql*/`
    CREATE TABLE IF NOT EXISTS course_logs (
      entry_id     uuid PRIMARY KEY,
      student_id   text NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
      school_year  text NOT NULL,
      term         text,
      date         date NOT NULL,
      course_title text NOT NULL,
      hours        numeric(5,2) NOT NULL CHECK (hours >= 0),
      location     text,
      percent      numeric(5,2),
      letter       text,
      credits      numeric(4,2)
    );
    CREATE INDEX IF NOT EXISTS course_logs_idx
      ON course_logs (student_id, school_year, term, date);
  `;
}