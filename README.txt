Peaceful Academy — Netlify-ready site
Version .01
Date 08/16/2025
Contents
- index.html — single-page app (MO-compliant tracker), Netlify Forms hooks, Transcript & Diploma generators
- manifest.webmanifest — PWA manifest
- sw.js — service worker for offline
- assets/icon-*.png — app icons (or assets/icon.svg if PNG generation failed)

Deploy on Netlify
1) Log in to Netlify > Add new site > Deploy manually (drag the whole folder) or connect to a repo.
2) Netlify Forms will auto-detect the hidden forms: "log-entry", "student", "course", "portfolio-upload".
   You’ll see submissions in Netlify → Forms after the first POST from the live site.
3) The app is a PWA. After visiting once, it works offline. Use browser "Install app" to add to home screen.
4) Print Transcript/Diploma from their views using the buttons.

Notes
- Data is stored locally in the browser (IndexedDB). Netlify Forms provides an additional backup trail.
- Missouri defaults: 1000 hours, 600 core (Reading/LA/Math/SS/Science), 400 core at home; school year July 1 – June 30.
