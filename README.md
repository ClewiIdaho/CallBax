# CallBax

Mobile-first cold-calling and pipeline tool for Ricky and Mac. Three hubs:

- **Home** — weekly stats + shared activity feed
- **Workflow** — the business pipeline (To Call → … → Closed), lead details, contract timelines
- **Scripts** — live call scripts with auto-filled business name and a tap-through call checklist that logs outcomes straight to the pipeline

## Stack

- React + Vite, one CSS file, no router — deliberately simple
- Supabase free tier (Postgres + auth + realtime); both phones stay in sync live
- Sign-in is one shared team password (`team@callbax.app` under the hood)

## Develop

```sh
npm install
npm run dev
```

The Supabase URL and publishable key are baked into `src/data/supabase.js`
(they're safe to ship — access is guarded by Row Level Security plus the team
login). `.env.example` shows the env vars that override them if the backend
ever moves.

## Deploy (Vercel)

Import the GitHub repo at vercel.com/new — framework preset **Vite**, no env
vars needed. Every push to the production branch redeploys.
