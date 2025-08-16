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
