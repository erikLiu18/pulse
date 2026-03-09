# Pulse — Time Tracker

## Project
- Two-user time tracker (Mingxiao 🦝, Erik 🐢) with 15-min interval logging
- React 19 + Vite + Tailwind CSS 4 (client/) → Express 5 + TypeScript + PostgreSQL (server/)
- Deployed on Railway at pulse-production-f952.up.railway.app

## Repos & Deployment
- `origin` = erikLiu18/pulse (Railway auto-deploys from here)
- `upstream` = mingxiaosong-0620/pulse (backup)
- **Always push to both**: `git push origin master && git push upstream master`
- Railway auto-deploys on push — TypeScript errors block deployment

## Database
- Railway Postgres: `postgresql://postgres:MVxQtTCCXzbjhwOaKVpTmgAcEoWvjwCS@switchback.proxy.rlwy.net:31722/railway`
- **NEVER seed sample data into production**. Use local Postgres for testing.
- Dates return as ISO timestamps — use `.slice(0,10)` for `yyyy-MM-dd` comparison
- Server runs UTC — send local time from client for time-sensitive operations (finish entry, etc.)

## Code Patterns
- Express 5: catch-all route uses `/{*splat}` not `*`
- React 19 strict TS: use `React.ReactElement` not `JSX.Element`
- Tailwind CSS 4: `@import "tailwindcss"` + `@theme {}` block (not `@tailwind` directives)
- Inline ring effects: use `boxShadow: '0 0 0 2px color'` not `ringColor` (not a CSS property)
- Stats API returns `{ categories, taskMinutes, wallClockMinutes, parallelMinutes, multiplier }`
- Use `?? 0` for nullable number state setters (TypeScript strict mode)

## Environment
- Claude's shell: Node 22. User's terminal: Node 24. Native addons fail on v24.
- We migrated to `pg` (pure JS) to avoid this — don't add native addon dependencies.
- Verify builds before pushing: `cd client && npx vite build`

## Features
- Parallel tasking: overlapping entries render in side-by-side lanes
- Autopilot mode: `is_active` entries auto-extend, client sends local time on finish
- Cross-midnight: entries spanning midnight auto-split into two days
- Insights: generated via Claude CLI (pulse-insights skill), saved to DB, shown in app
