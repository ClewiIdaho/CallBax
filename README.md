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

## Discover

Finds nearby local businesses and labels each one **No Website**,
**Social Only**, or **Has Website**, filtering out national chains via the
`CHAIN_NAMES` blocklist in the edge function. Sorted best-lead-first, with
a filter toggle for the three presence types.

### How it gets the data (free, no setup)

OpenStreetMap, through **Nominatim** — a bounded-area search with
`extratags=1`, which carries the website and phone tags the whole feature
rests on. It answers in 1-2s. Notes for anyone changing it:

- Nominatim's terms must be real OSM *special phrases*. Invented ones
  ("vape shop", "beauty salon") silently return zero results, so verify any
  new term against the live API before adding it to `NOMINATIM_TERMS`.
- Requests are spaced 1.1s apart to respect Nominatim's 1 req/s policy, and
  every call sends an identifying User-Agent. Keep both.
- **Overpass** is only a last-resort fallback. It is the natural tool for
  radius queries, but every public mirror rate-limits shared cloud IPs like
  Supabase's — measured live, mirrors return 429 or time out after 30s. Only
  full-planet mirrors belong in `OVERPASS_MIRRORS`: regional instances such
  as `overpass.osm.ch` answer fast with *zero* results, which looks exactly
  like "no businesses nearby".
- Results are cached 72h in the `discover_cache` table.

### Optional upgrade: Google Places API (New)

Adds ratings, review counts, live open/closed, and Google's more complete
website data. **Not required** — and Google now asks for a card plus a small
prepayment (~$10 credit) before its free monthly allowance applies, so skip
this until you want it. Nothing in the app calls Google unless the
`GOOGLE_PLACES_API_KEY` secret exists; setting it switches sources over with
no redeploy. When you're ready:

1. Go to [console.cloud.google.com](https://console.cloud.google.com), open
   the project picker → **New Project** → name it `callbax`.
2. **Billing → Link a billing account.** A card is required even for
   free-tier usage; the caps in step 6 keep it from ever charging.
3. **APIs & Services → Library** → search **"Places API (New)"** → Enable.
   Careful: enable the one literally named *Places API (New)*, not the
   legacy *Places API*.
4. **APIs & Services → Credentials → Create credentials → API key.** Copy it.
5. Edit the key → **API restrictions → Restrict key** → check only
   *Places API (New)* → Save. Leave *Application restrictions* on **None**
   (the key lives only in the Supabase edge function, never the browser).
6. **Hard billing backstop:** APIs & Services → *Places API (New)* →
   **Quotas & System Limits** → find *SearchText requests per day* → Edit →
   set to **50**. Google refuses request 51 outright, so overrun billing is
   impossible even if everything else fails. Optional extra: Billing →
   Budgets & alerts → a $1 budget with an email alert.
7. Give the key to the edge function and redeploy:

   ```sh
   supabase secrets set GOOGLE_PLACES_API_KEY=AIza...
   supabase functions deploy discover
   ```

   (Or Dashboard → Edge Functions → Secrets.)

### Cost math

The field mask (website, phone, rating, hours) bills each search page as
**Text Search Enterprise** — about 1,000 free calls/month, ~$0.035/call
after that. One uncached search = up to 2 calls (40 results); repeat
searches are served from a 24-hour cache in Postgres. The function also
enforces its own budget — **30 calls/day and 900/month** by default — and
past it serves cached or OpenStreetMap data instead of calling Google.
Override with the `DISCOVER_DAILY_BUDGET` / `DISCOVER_MONTHLY_BUDGET`
edge-function secrets. Between the cache, the app budget, and the
Google-side quota cap, the realistic monthly bill for a two-person team
is $0.
