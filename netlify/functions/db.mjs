import { neon } from '@netlify/neon';

const sql = neon(); // uses env NETLIFY_DATABASE_URL

async function ensureSchema(){
  await sql/*sql*/`
  create table if not exists students (
    id bigserial primary key,
    name text not null,
    dob date,
    grade text,
    start_year int,
    notes text,
    created_at timestamptz default now()
  );
  create table if not exists courses (
    id bigserial primary key,
    title text not null,
    subject text,
    description text,
    created_at timestamptz default now()
  );
  create table if not exists logs (
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
    created_at timestamptz default now()
  );
  create table if not exists portfolio (
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
    created_at timestamptz default now()
  );`;
}

function ok(body, status=200){ return new Response(JSON.stringify(body), {status, headers:{'content-type':'application/json'}}); }
function bad(msg, status=400){ return ok({error:String(msg)}, status); }

export default async (req) => {
  try{
    if (req.method!=='POST') return bad('Method not allowed', 405);
    const { action, data } = await req.json();
    if (!action) return bad('Missing action');
    await ensureSchema();

    if (action==='student.insert'){
      const { name, dob, grade, startYear, notes } = data||{};
      if (!name) return bad('name required');
      const r = await sql`insert into students (name,dob,grade,start_year,notes) values (${name},${dob||null},${grade||null},${startYear||null},${notes||null}) returning id`;
      return ok({ id: r[0].id });
    }
    if (action==='course.insert'){
      const { title, subject, description } = data||{};
      if (!title) return bad('title required');
      const r = await sql`insert into courses (title,subject,description) values (${title},${subject||null},${description||null}) returning id`;
      return ok({ id: r[0].id });
    }
    if (action==='log.insert'){
      const { studentId, studentName, courseId, courseTitle, subject, date, hours, location, notes } = data||{};
      if (!studentName || !courseTitle || !date || !hours) return bad('studentName, courseTitle, date, hours required');
      const r = await sql`insert into logs (student_id,student_name,course_id,course_title,subject,date,hours,location,notes) values (${studentId||null},${studentName},${courseId||null},${courseTitle},${subject||null},${date},${hours},${location||null},${notes||null}) returning id`;
      return ok({ id: r[0].id });
    }
    if (action==='portfolio.insert'){
      const { studentId, studentName, courseId, courseTitle, subject, date, title, tags, description, fileName, fileType, fileSize } = data||{};
      const r = await sql`insert into portfolio (student_id,student_name,course_id,course_title,subject,date,title,tags,description,file_name,file_type,file_size) values (${studentId||null},${studentName||null},${courseId||null},${courseTitle||null},${subject||null},${date||null},${title||null},${tags||null},${description||null},${fileName||null},${fileType||null},${fileSize||null}) returning id`;
      return ok({ id: r[0].id });
    }
    if (action==='logs.latest'){
      const rows = await sql`select * from logs order by id desc limit 20`;
      return ok({ rows });
    }
    return bad('Unknown action');
  }catch(err){
    console.error(err);
    return bad(err.message || 'Server error', 500);
  }
};