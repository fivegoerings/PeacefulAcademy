// Netlify Function: /api/reports/annual
// Adds `nonCoreHours` to totals and `nonCore` to each breakdown row.
// Return shape:
// {
//   totals: {
//     totalHours: number,
//     coreHours: number,
//     coreAtHomeHours: number,
//     nonCoreHours: number  // <-- added here
//   },
//   breakdown: Array<{
//     group: string,
//     total: number,
//     core: number,
//     coreHome: number,
//     nonCore: number       // <-- added here
//   }>
// }

import { computeNonCoreFields } from './_utils/report-helpers.mjs';

// If you already use Neon/Postgres, you can import and use it here.
// import { neon } from '@netlify/neon';

export default async function handler(req) {
  try {
    // Parse query params
    const url = new URL(req.url);
    const studentId = url.searchParams.get('studentId');
    const yearId = url.searchParams.get('yearId');
    const groupBy = (url.searchParams.get('groupBy') || 'subject').toLowerCase();

    // 1) Fetch your existing data (replace the function below with your real logic)
    // It should at least return { totals: {...}, breakdown: [...] }
    const baseReport = await fetchReportData({ studentId, yearId, groupBy });

    // 2) Enrich with Non-Core on the server response
    const enriched = computeNonCoreFields(baseReport);

    return json(200, enriched);
  } catch (err) {
    console.error('reports-annual error:', err);
    return json(500, { error: 'An unknown error occurred' });
  }
}

/**
 * Replace this with your real data-fetch logic.
 * If you already have working SQL/ORM code, drop it in here
 * and return the same shape as demonstrated.
 */
async function fetchReportData({ studentId, yearId, groupBy }) {
  // --------- EXAMPLE ONLY (safe fallback) ----------
  // This block lets the endpoint work immediately for testing/deployment.
  // Swap it out with real DB queries that compute totals & breakdown.
  const example = {
    totals: {
      totalHours: 732,
      coreHours: 501,
      coreAtHomeHours: 380
      // nonCoreHours will be added by computeNonCoreFields()
    },
    breakdown: [
      { group: groupBy === 'month' ? 'Aug' : 'Math', total: 180, core: 180, coreHome: 150 },
      { group: groupBy === 'month' ? 'Sep' : 'Science', total: 160, core: 150, coreHome: 130 },
      { group: groupBy === 'month' ? 'Oct' : 'PE', total: 100, core: 0,   coreHome: 0   },
      { group: groupBy === 'month' ? 'Nov' : 'Fine Arts', total: 120, core: 0, coreHome: 0 },
      { group: groupBy === 'month' ? 'Dec' : 'English', total: 172, core: 171, coreHome: 100 }
    ]
  };
  return example;

  /* ---------- SAMPLE Neon (Postgres) pattern you can adapt ----------
  const sql = neon(); // uses env NETLIFY_DATABASE_URL

  // Example queries — UPDATE to match your schema/table names/columns!
  // Assume hours table with columns:
  //   student_id, year_id, subject, minutes, is_core (bool), at_home (bool), logged_on (date)
  const totals = await sql`
    SELECT
      COALESCE(SUM(minutes),0)/60.0 AS totalHours,
      COALESCE(SUM(CASE WHEN is_core THEN minutes ELSE 0 END),0)/60.0 AS coreHours,
      COALESCE(SUM(CASE WHEN is_core AND at_home THEN minutes ELSE 0 END),0)/60.0 AS coreAtHomeHours
    FROM hours
    WHERE ${studentId}::text IS NULL OR student_id = ${studentId}
      AND ${yearId}::text IS NULL OR year_id = ${yearId};
  `;

  // Grouping
  let groupExpr = sql`subject`;
  if (groupBy === 'month') groupExpr = sql`TO_CHAR(logged_on, 'Mon')`;
  if (groupBy === 'location') groupExpr = sql`CASE WHEN at_home THEN 'Home' ELSE 'Away' END`;

  const rows = await sql`
    SELECT
      ${groupExpr} AS group,
      COALESCE(SUM(minutes),0)/60.0 AS total,
      COALESCE(SUM(CASE WHEN is_core THEN minutes ELSE 0 END),0)/60.0 AS core,
      COALESCE(SUM(CASE WHEN is_core AND at_home THEN minutes ELSE 0 END),0)/60.0 AS coreHome
    FROM hours
    WHERE (${studentId}::text IS NULL OR student_id = ${studentId})
      AND (${yearId}::text IS NULL OR year_id = ${yearId})
    GROUP BY 1
    ORDER BY 1;
  `;

  return {
    totals: totals[0] ?? { totalHours: 0, coreHours: 0, coreAtHomeHours: 0 },
    breakdown: rows
  };
  ------------------------------------------------------------------ */
}

/** Helper to return JSON */
function json(status, data) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    }
  });
}

