Peaceful Academy — Netlify + Neon + PWA

What you get
- index.html — single-page app (Missouri-compliant tracker) with Netlify Forms, Neon DB writes, Transcript & Diploma generators
- manifest.webmanifest — PWA manifest
- sw.js — service worker (offline support)
- assets/icon.svg — app icon
- netlify/functions/db.mjs — server function using @netlify/neon (Postgres)
- netlify.toml — Netlify config (bundling)

Deploy
1) Upload all files/folders to Netlify (drag-and-drop or connect a repo).
2) In Netlify → Site settings → Environment variables, add NETLIFY_DATABASE_URL with your Neon connection string (e.g., postgres://USER:PASSWORD@HOST/db?sslmode=require).
3) Visit the live site and add a student/log to trigger table creation. Submissions will appear:
   - Locally (browser IndexedDB)
   - Netlify Forms (Forms tab)
   - Neon (tables: students, courses, logs, portfolio)

Notes
- The app works offline. Data stays local and mirrors to Forms + Neon when online.
- Transcript: choose student/years, build, optionally edit credits/grades inline, then print.
- Diploma: set fields, preview, print.

Enjoy!