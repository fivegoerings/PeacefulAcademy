import { neon } from '@netlify/neon';

const sql = neon(); // uses NETLIFY_DATABASE_URL on Netlify

function corsHeaders() {
  return {
    'content-type': 'application/json',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,OPTIONS'
  };
}
function ok(body, status=200){ return new Response(JSON.stringify(body), {status, headers: corsHeaders() }); }
function bad(msg, status=400){ return ok({error:String(msg)}, status); }

async function ensureSchema() {
  await sql`create table if not exists students (
    id bigserial primary key,
    name text not null,
    dob date,
    grade text,
    start_year int,
    notes text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
  )`;
  await sql`create table if not exists courses (
    id bigserial primary key,
    title text not null,
    subject text,
    description text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
  )`;
  await sql`create table if not exists logs (
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
  await sql`create table if not exists portfolio (
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
}

export default async (req) => {
  try {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders() });

    const url = new URL(req.url);
    const qsAction = url.searchParams.get('action');
    let action, data;

    if (req.method === 'GET') {
      action = qsAction || 'health';
      data = {};
    } else if (req.method === 'POST') {
      try {
        ({ action, data } = await req.json());
      } catch(e) {
        action = qsAction || 'health';
        data = {};
      }
    } else {
      return bad('Method not allowed', 405);
    }

    if (!action) action = 'health';

    if (action === 'health') {
      const [{ now }] = await sql`select now() as now`;
      const [{ version }] = await sql`select version()`;
      return ok({ ok: true, now, version });
    }

    if (action === 'stats') {
      await ensureSchema();
      const rows = await sql`select
        (select count(*)::int from students) as students,
        (select count(*)::int from courses) as courses,
        (select count(*)::int from logs) as logs,
        (select count(*)::int from portfolio) as portfolio
      `;
      return ok({ stats: rows[0] });
    }

    if (action === 'student.insert') {
      await ensureSchema();
      const { name, dob, grade, startYear, notes } = data || {};
      if (!name) return bad('name required');
      const r = await sql`insert into students (name,dob,grade,start_year,notes) values (${name},${dob||null},${grade||null},${startYear||null},${notes||null}) returning id`;
      return ok({ id: r[0].id });
    }

    if (action === 'course.insert') {
      await ensureSchema();
      const { title, subject, description } = data || {};
      if (!title) return bad('title required');
      const r = await sql`insert into courses (title,subject,description) values (${title},${subject||null},${description||null}) returning id`;
      return ok({ id: r[0].id });
    }

    if (action === 'log.insert') {
      await ensureSchema();
      const { studentId, studentName, courseId, courseTitle, subject, date, hours, location, notes } = data || {};
      if (!studentName || !courseTitle || !date || !hours) return bad('studentName, courseTitle, date, hours required');
      const r = await sql`insert into logs (student_id,student_name,course_id,course_title,subject,date,hours,location,notes) values (${studentId||null},${studentName},${courseId||null},${courseTitle},${subject||null},${date},${hours},${location||null},${notes||null}) returning id`;
      return ok({ id: r[0].id });
    }

    if (action === 'portfolio.insert') {
      await ensureSchema();
      const { studentId, studentName, courseId, courseTitle, subject, date, title, tags, description, fileName, fileType, fileSize } = data || {};
      const r = await sql`insert into portfolio (student_id,student_name,course_id,course_title,subject,date,title,tags,description,file_name,file_type,file_size) values (${studentId||null},${studentName||null},${courseId||null},${courseTitle||null},${subject||null},${date||null},${title||null},${tags||null},${description||null},${fileName||null},${fileType||null},${fileSize||null}) returning id`;
      return ok({ id: r[0].id });
    }

    if (action === 'logs.latest') {
      const rows = await sql`select * from logs order by id desc limit 20`;
      return ok({ rows });
    }

    return bad('Unknown action');
  } catch (err) {
    console.error(err);
    return bad(err.message || 'Server error', 500);
  }
};
