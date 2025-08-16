// netlify/functions/db.mjs
import { neon } from '@netlify/neon';

// One client; connection happens on first query.
const sql = neon(); // reads NETLIFY_DATABASE_URL (or DATABASE_URL) on Netlify

// --- helpers ---------------------------------------------------------------
function corsHeaders() {
  return {
    'content-type': 'application/json',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,OPTIONS'
  };
}
function ok(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders() });
}
function bad(msg, status = 400) {
  return ok({ error: String(msg) }, status);
}
async function parse(req) {
  const url = new URL(req.url);
  const qsAction = url.searchParams.get('action');
  if (req.method === 'GET') return { action: qsAction || 'health', data: {}, url };
  if (req.method === 'POST') {
    try {
      const j = await req.json();
      return { action: j?.action || qsAction || 'health', data: j?.data || {}, url };
    } catch {
      return { action: qsAction || 'health', data: {}, url };
    }
  }
  return { action: null, data: {}, url };
}

// --- schema bootstrap (lightweight, idempotent) ---------------------------
async function ensureSchema() {
  await sql`create table if not exists students(
    id bigserial primary key,
    name text not null,
    dob date,
    grade text,
    start_year int,
    notes text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
  )`;
  await sql`create table if not exists courses(
    id bigserial primary key,
    title text not null,
    subject text,
    description text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
  )`;
  await sql`create table if not exists logs(
    id bigserial primary key,
    student_id bigint,
    student_name text,
    course_id bigint,
    course_title text,
    subject text,
    date date not null,
    hours numeric(6,2) not null,
    location text,
    notes text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
  )`;
  await sql`create table if not exists portfolio(
    id bigserial primary key,
    student_id bigint,
    student_name text,
    course_id bigint,
    course_title text,
    subject text,
    date date,
    title text,
    tags text[],
    description text,
    file_name text,
    file_type text,
    file_size int,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
  )`;
  // helpful indexes (safe to run each deploy)
  await sql`create index if not exists idx_students_name on students (lower(name))`;
  await sql`create index if not exists idx_courses_title on courses (lower(title))`;
  await sql`create unique index if not exists uq_courses_title_lower on courses (lower(title))`;
}

// --- reporting SQL helpers (no DB views required) -------------------------
const CORE_SUBJECTS = ['Reading','Language Arts','Mathematics','Science','Social Studies'];
const yearExpr = `CASE WHEN EXTRACT(MONTH FROM date) >= 7
                    THEN EXTRACT(YEAR FROM date)::int
                    ELSE (EXTRACT(YEAR FROM date)::int - 1)
                  END`;
const isCoreExpr = `subject = any(${sql.array(CORE_SUBJECTS, 'text')})`;
const isHomeCoreExpr = `(${sql.unsafe(isCoreExpr)}) AND location = 'home'`;

// --- handler ---------------------------------------------------------------
export default async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    const { action, data, url } = await parse(req);
    if (!action) return bad('Method not allowed', 405);

    // Diagnostics
    if (action === 'health') {
      const [{ now }] = await sql`select now() as now`;
      const [{ version }] = await sql`select version()`;
      return ok({ ok: true, now, version });
    }
    if (action === 'stats') {
      await ensureSchema();
      const [row] = await sql`
        select
          (select count(*)::int from students) as students,
          (select count(*)::int from courses)  as courses,
          (select count(*)::int from logs)     as logs,
          (select count(*)::int from portfolio) as portfolio
      `;
      return ok({ stats: row });
    }

    // Ensure schema before any writes or reads that assume tables exist
    await ensureSchema();

    // ---------------- Students ----------------
    if (action === 'student.insert') {
      const { name, dob, grade, startYear, notes } = data || {};
      if (!name) return bad('name required');
      const [{ id }] = await sql`
        insert into students (name,dob,grade,start_year,notes)
        values (${name}, ${dob||null}, ${grade||null}, ${startYear||null}, ${notes||null})
        returning id`;
      return ok({ id });
    }
    if (action === 'student.update') {
      const { id, name, dob, grade, startYear, notes } = data || {};
      if (!id) return bad('id required');
      await sql`
        update students set
          name = coalesce(${name}, name),
          dob = ${dob||null},
          grade = ${grade||null},
          start_year = ${startYear||null},
          notes = ${notes||null},
          updated_at = now()
        where id = ${id}`;
      return ok({ updated: true });
    }
    if (action === 'student.delete') {
      const { id } = data || {};
      if (!id) return bad('id required');
      await sql`delete from students where id=${id}`;
      return ok({ deleted: true });
    }
    if (action === 'student.get') {
      const { id } = data || {};
      if (!id) return bad('id required');
      const rows = await sql`select * from students where id=${id}`;
      return ok({ row: rows[0] || null });
    }
    if (action === 'student.list') {
      const rows = await sql`select * from students order by lower(name) asc`;
      return ok({ rows });
    }

    // ---------------- Courses -----------------
    if (action === 'course.insert') {
      const { title, subject, description } = data || {};
      if (!title) return bad('title required');
      const [{ id }] = await sql`
        insert into courses (title,subject,description)
        values (${title}, ${subject||null}, ${description||null})
        returning id`;
      return ok({ id });
    }
    if (action === 'course.update') {
      const { id, title, subject, description } = data || {};
      if (!id) return bad('id required');
      await sql`
        update courses set
          title = coalesce(${title}, title),
          subject = ${subject||null},
          description = ${description||null},
          updated_at = now()
        where id = ${id}`;
      return ok({ updated: true });
    }
    if (action === 'course.delete') {
      const { id } = data || {};
      if (!id) return bad('id required');
      await sql`delete from courses where id=${id}`;
      return ok({ deleted: true });
    }
    if (action === 'course.get') {
      const { id } = data || {};
      if (!id) return bad('id required');
      const rows = await sql`select * from courses where id=${id}`;
      return ok({ row: rows[0] || null });
    }
    if (action === 'course.list') {
      const rows = await sql`select * from courses order by lower(title) asc`;
      return ok({ rows });
    }

    // ---------------- Logs (hours) -----------
    if (action === 'log.insert') {
      const { studentId, studentName, courseId, courseTitle, subject, date, hours, location, notes } = data || {};
      if (!studentName || !courseTitle || !date || hours == null) {
        return bad('studentName, courseTitle, date, hours required');
      }
      const [{ id }] = await sql`
        insert into logs (student_id,student_name,course_id,course_title,subject,date,hours,location,notes)
        values (${studentId||null}, ${studentName}, ${courseId||null}, ${courseTitle}, ${subject||null},
                ${date}, ${hours}, ${location||null}, ${notes||null})
        returning id`;
      return ok({ id });
    }
    if (action === 'log.update') {
      const { id, studentId, studentName, courseId, courseTitle, subject, date, hours, location, notes } = data || {};
      if (!id) return bad('id required');
      await sql`
        update logs set
          student_id = ${studentId||null},
          student_name = coalesce(${studentName}, student_name),
          course_id = ${courseId||null},
          course_title = coalesce(${courseTitle}, course_title),
          subject = ${subject||null},
          date = coalesce(${date}, date),
          hours = coalesce(${hours}, hours),
          location = ${location||null},
          notes = ${notes||null},
          updated_at = now()
        where id=${id}`;
      return ok({ updated: true });
    }
    if (action === 'log.delete') {
      const { id } = data || {};
      if (!id) return bad('id required');
      await sql`delete from logs where id=${id}`;
      return ok({ deleted: true });
    }
    if (action === 'logs.latest') {
      const rows = await sql`select * from logs order by id desc limit 20`;
      return ok({ rows });
    }
    if (action === 'logs.list') {
      const { studentId, from, to } = data || {};
      const rows = await sql`
        select * from logs
        where (${studentId? sql`student_id=${studentId}` : sql`1=1`})
          and (${from? sql`date >= ${from}` : sql`1=1`})
          and (${to? sql`date <= ${to}` : sql`1=1`})
        order by date desc, id desc`;
      return ok({ rows });
    }

    // ---------------- Portfolio --------------
    if (action === 'portfolio.insert') {
      const { studentId, studentName, courseId, courseTitle, subject, date, title, tags, description, fileName, fileType, fileSize } = data || {};
      const [{ id }] = await sql`
        insert into portfolio (student_id,student_name,course_id,course_title,subject,date,title,tags,description,file_name,file_type,file_size)
        values (${studentId||null}, ${studentName||null}, ${courseId||null}, ${courseTitle||null}, ${subject||null},
                ${date||null}, ${title||null}, ${tags||null}, ${description||null}, ${fileName||null}, ${fileType||null}, ${fileSize||null})
        returning id`;
      return ok({ id });
    }
    if (action === 'portfolio.update') {
      const { id, studentId, studentName, courseId, courseTitle, subject, date, title, tags, description, fileName, fileType, fileSize } = data || {};
      if (!id) return bad('id required');
      await sql`
        update portfolio set
          student_id=${studentId||null},
          student_name=${studentName||null},
          course_id=${courseId||null},
          course_title=${courseTitle||null},
          subject=${subject||null},
          date=${date||null},
          title=${title||null},
          tags=${tags||null},
          description=${description||null},
          file_name=${fileName||null},
          file_type=${fileType||null},
          file_size=${fileSize||null},
          updated_at=now()
        where id=${id}`;
      return ok({ updated: true });
    }
    if (action === 'portfolio.delete') {
      const { id } = data || {};
      if (!id) return bad('id required');
      await sql`delete from portfolio where id=${id}`;
      return ok({ deleted: true });
    }
    if (action === 'portfolio.list') {
      const { studentId, year } = data || {};
      // compute academic year inline (July 1 boundary)
      const rows = await sql`
        select *,
               ${sql.unsafe(yearExpr)} as academic_year
        from portfolio
        where (${studentId? sql`student_id=${studentId}` : sql`1=1`})
          and (${year? sql`(${sql.unsafe(yearExpr)}) = ${Number(year)}` : sql`1=1`})
        order by date desc, id desc`;
      return ok({ rows });
    }

    // ---------------- Reports (computed on the fly) ------------
    if (action === 'reports.yearly') {
      const { studentId, year } = data || {};
      const rows = await sql`
        select
          student_id,
          coalesce(student_name, 'Unknown') as student_name,
          ${sql.unsafe(yearExpr)} as academic_year,
          sum(hours) as total_hours,
          sum(case when ${sql.unsafe(isCoreExpr)} then hours else 0 end) as core_hours,
          sum(case when ${sql.unsafe(isHomeCoreExpr)} then hours else 0 end) as home_core_hours
        from logs
        where (${studentId? sql`student_id=${studentId}` : sql`1=1`})
          and (${year? sql`(${sql.unsafe(yearExpr)}) = ${Number(year)}` : sql`1=1`})
        group by student_id, student_name, ${sql.unsafe(yearExpr)}
        order by student_id, academic_year`;
      return ok({ rows });
    }

    if (action === 'transcript.student') {
      const { studentId, years, scale } = data || {};
      if (!studentId) return bad('studentId required');
      const creditScale = Number(scale || 120);
      // per-course, per-year hours + credits
      const rows = await sql`
        select
          student_id,
          coalesce(student_name, 'Unknown') as student_name,
          ${sql.unsafe(yearExpr)} as academic_year,
          coalesce(course_title, 'Untitled Course') as course_title,
          coalesce(subject, 'Elective') as subject,
          sum(hours) as hours_total
        from logs
        where student_id=${studentId}
          and (${Array.isArray(years) && years.length
                ? sql`(${sql.unsafe(yearExpr)}) = any(${years.map(Number)})`
                : sql`1=1`})
        group by student_id, student_name, ${sql.unsafe(yearExpr)}, course_title, subject
        order by academic_year, course_title`;
      const dataOut = rows.map(r => ({
        ...r,
        credits_120: Math.round((Number(r.hours_total || 0) / 120) * 100) / 100,
        credits_scale: Math.round((Number(r.hours_total || 0) / creditScale) * 100) / 100,
        scale_used: creditScale
      }));
      return ok({ rows: dataOut });
    }

    // Fallback
    return bad(`Unknown action: ${action}`);
  } catch (err) {
    console.error(err);
    return bad(err?.message || 'Server error', 500);
  }
};
