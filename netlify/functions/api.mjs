import { neon } from '@netlify/neon';

const sql = neon();

function json(body, status=200){
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET,OPTIONS'
    }
  });
}

export default async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,OPTIONS' } });
  }
  if (req.method !== 'GET') return json({ error: 'Method not allowed' }, 405);

  const url = new URL(req.url);
  const match = url.pathname.match(/\/api(.*)$/);
  const subpath = match ? match[1] : '/';

  try {
    if (subpath === '/health') {
      const [{ now }] = await sql`select now() as now`;
      const [{ version }] = await sql`select version()`;
      return json({ ok:true, now, version });
    }

    if (subpath === '/stats') {
      const rows = await sql`select
        (select count(*)::int from students) as students,
        (select count(*)::int from courses) as courses,
        (select count(*)::int from logs) as logs,
        (select count(*)::int from portfolio) as portfolio`;
      return json({ stats: rows[0] });
    }

    if (subpath.startsWith('/reports/yearly')) {
      const studentId = url.searchParams.get('studentId');
      const year = url.searchParams.get('year');
      if (studentId || year){
        const rows = await sql`select student_id, student_name, academic_year, total_hours, core_hours, home_core_hours
          from vw_yearly_totals
          where (${ studentId ? sql`student_id = ${Number(studentId)}` : sql`1=1` })
            and (${ year ? sql`academic_year = ${Number(year)}` : sql`1=1` })
          order by student_id, academic_year`;
        return json({ rows });
      } else {
        const rows = await sql`select student_id, student_name, academic_year, total_hours, core_hours, home_core_hours
          from vw_yearly_totals
          order by student_id, academic_year`;
        return json({ rows });
      }
    }

    if (subpath.startsWith('/transcript/')) {
      const parts = subpath.split('/').filter(Boolean);
      const studentId = Number(parts[1]);
      if (!studentId) return json({ error: 'studentId required' }, 400);
      const years = (url.searchParams.get('years')||'').split(',').map(s=>s.trim()).filter(Boolean).map(Number);
      const scale = Number(url.searchParams.get('scale')||'120');
      let rows;
      if (years.length) {
        rows = await sql`select student_id, student_name, academic_year, course_title, subject, hours_total, credits_120
                         from vw_transcript_hours
                         where student_id=${studentId} and academic_year = any(${years})
                         order by academic_year, course_title`;
      } else {
        rows = await sql`select student_id, student_name, academic_year, course_title, subject, hours_total, credits_120
                         from vw_transcript_hours
                         where student_id=${studentId}
                         order by academic_year, course_title`;
      }
      const data = rows.map(r => ({
        ...r,
        credits_scale: Math.round((Number(r.hours_total||0) / (scale||120)) * 100) / 100,
        scale_used: scale||120
      }));
      return json({ rows: data });
    }

    return json({ error: 'Not found', path: subpath }, 404);
  } catch (e) {
    return json({ error: e.message||String(e) }, 500);
  }
};
