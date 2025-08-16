Peaceful Academy — Netlify + Neon + PWA (with Database health/stats)

New:
- Database view in the app (nav → Database): runs a health check and shows table row counts.
- Netlify Function actions:
  - health: quick connection + server version
  - stats: counts for students, courses, logs, portfolio

Setup:
- Deploy to Netlify and set NETLIFY_DATABASE_URL in Site settings → Environment variables.
- Open the live site → Database → Run health check.


Endpoints (via redirects)
- GET /reports/yearly               -> yearly totals (optional ?studentId=&year=)
- GET /transcript/:studentId        -> transcript rows; optional ?years=2023,2024&scale=135
- GET /.netlify/functions/api/health  and /stats for direct checks (no redirect)

Examples:
  curl -s https://YOUR-SITE.netlify.app/reports/yearly?studentId=1&year=2024
  curl -s https://YOUR-SITE.netlify.app/transcript/1?years=2023,2024&scale=120
