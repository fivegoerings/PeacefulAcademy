import { neon } from '@netlify/neon';

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders() };
  }
  try {
    const sql = neon(process.env.NETLIFY_DATABASE_URL);
    const path = event.path || '';

    if (path.includes('/health')) {
      const [r] = await sql`SELECT version() AS version, now() AS now`;
      return json({ ok: true, ...r });
    }

    if (path.includes('/stats')) {
      const [[s],[c],[l],[p]] = await Promise.all([
        sql`SELECT COUNT(*)::int AS n FROM students`,
        sql`SELECT COUNT(*)::int AS n FROM courses`,
        sql`SELECT COUNT(*)::int AS n FROM logs`,
        sql`SELECT COUNT(*)::int AS n FROM portfolio`
      ]);
      return json({ stats: { students:s.n, courses:c.n, logs:l.n, portfolio:p.n } });
    }

    // simple lists for UI filters
    if (path.includes('/students/list')) {
      // Replace with real query when available
      return json([
        { id: 'student-1', name: 'Student One' },
        { id: 'student-2', name: 'Student Two' }
      ]);
    }
    if (path.includes('/years/list')) {
      // Replace with real query when available
      return json([
        { id: '2024', label: '2024-2025' },
        { id: '2023', label: '2023-2024' }
      ]);
    }

    if (path.includes('/reports/yearly')) {
      const { studentId, year } = event.queryStringParameters || {};
      const rows = await sql`
        SELECT ${year} AS academic_year,
               SUM(hours)::float AS total_hours,
               SUM(CASE WHEN subject IN ('Reading','Language Arts','Mathematics','Science','Social Studies') THEN hours ELSE 0 END)::float AS core_hours,
               SUM(CASE WHEN subject IN ('Reading','Language Arts','Mathematics','Science','Social Studies') AND location='home' THEN hours ELSE 0 END)::float AS home_core_hours
        FROM logs
        WHERE student_id=${studentId} AND (EXTRACT(YEAR FROM date)=${year} OR EXTRACT(YEAR FROM date)=${year}+1)
      `;
      return json({ rows });
    }

    if (path.includes('/transcript/')) {
      const studentId = path.split('/transcript/')[1].split('?')[0];
      const q = event.queryStringParameters || {};
      const years = (q.years||'').split(',').filter(Boolean);
      const scale = +(q.scale||120);
      let rows=[];
      if (years.length) {
        rows = await sql`
          SELECT EXTRACT(YEAR FROM date) AS academic_year,
                 c.title AS course_title, l.subject, SUM(l.hours)::float AS hours_total,
                 ROUND(SUM(l.hours)/${scale}::float,2) AS credits_scale
          FROM logs l
          JOIN courses c ON l.course_id=c.id
          WHERE l.student_id=${studentId} AND EXTRACT(YEAR FROM date) = ANY(${years})
          GROUP BY academic_year, c.title, l.subject
          ORDER BY academic_year, c.title
        `;
      }
      return json({ rows });
    }

    return json({ error: 'Unknown endpoint' }, 404);

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