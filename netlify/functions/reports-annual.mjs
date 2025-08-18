// netlify/functions/reports-annual.mjs
// Self-contained: computes nonCoreHours and row nonCore here (no helper import).

export default async function handler(req) {
  try {
    const url = new URL(req.url);
    const studentId = url.searchParams.get('studentId');
    const yearId = url.searchParams.get('yearId');
    const groupBy = (url.searchParams.get('groupBy') || 'subject').toLowerCase();

    const baseReport = await fetchReportData({ studentId, yearId, groupBy });

    // === inline helper logic ===
    const num = (n) => (Number.isFinite(+n) ? +n : 0);

    const r = baseReport ?? {};
    r.totals = r.totals ?? {};
    r.breakdown = Array.isArray(r.breakdown) ? r.breakdown : [];

    const totalHours = num(r.totals.totalHours);
    const coreHours = num(r.totals.coreHours);
    r.totals.nonCoreHours = Math.max(0, totalHours - coreHours);

    r.breakdown = r.breakdown.map(row => {
      const total = num(row.total);
      const core = num(row.core);
      return { ...row, nonCore: Math.max(0, total - core) };
    });
    // === end inline helper logic ===

    return json(200, r);
  } catch (err) {
    console.error('reports-annual error:', err);
    return json(500, { error: 'An unknown error occurred' });
  }
}

/**
 * Replace this with your real DB queries.
 * This example payload lets the endpoint work immediately.
 */
async function fetchReportData({ studentId, yearId, groupBy }) {
  return {
    totals: {
      totalHours: 732,
      coreHours: 501,
      coreAtHomeHours: 380
    },
    breakdown: [
      { group: groupBy === 'month' ? 'Aug' : 'Math',      total: 180, core: 180, coreHome: 150 },
      { group: groupBy === 'month' ? 'Sep' : 'Science',   total: 160, core: 150, coreHome: 130 },
      { group: groupBy === 'month' ? 'Oct' : 'PE',        total: 100, core:   0, coreHome:   0 },
      { group: groupBy === 'month' ? 'Nov' : 'Fine Arts', total: 120, core:   0, coreHome:   0 },
      { group: groupBy === 'month' ? 'Dec' : 'English',   total: 172, core: 171, coreHome: 100 }
    ]
  };
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

