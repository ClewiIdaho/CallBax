// Discover: find local, independent businesses to cold call, with their web
// presence classified (no website / social-only / real website).
//
// Primary source: Google Places API (New) Text Search — accurate website,
// phone, rating, review count, and hours per business. Requires the
// GOOGLE_PLACES_API_KEY secret. Every uncached search costs up to 2 billed
// calls (2 pages x 20 results), which land in the "Text Search Enterprise"
// SKU because the field mask includes websiteUri/phone/rating/hours
// (~1,000 free calls/month as of Google's March 2025 pricing — verify the
// field→SKU tiers at developers.google.com/maps/billing-and-pricing before
// changing FIELD_MASK). Cost protection is layered:
//   1. 24h search cache in Postgres (discover_cache).
//   2. App-level budget counters (default 30 calls/day, 900/month) stored in
//      the same table under budget|* keys.
//   3. A hard requests/day quota cap set in the Google Cloud console
//      (see README) — the real can't-ever-bill backstop.
//
// Fallback source: OpenStreetMap (Photon/Nominatim geocoding + Overpass) —
// free and keyless. Used when the Google key is unset, the budget is
// exhausted with no cache to serve, or the Google request fails.

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const GOOGLE_KEY = Deno.env.get('GOOGLE_PLACES_API_KEY') ?? ''
const DAILY_BUDGET = Number(Deno.env.get('DISCOVER_DAILY_BUDGET') ?? 30)
const MONTHLY_BUDGET = Number(Deno.env.get('DISCOVER_MONTHLY_BUDGET') ?? 900)
const CACHE_TTL_MS = 24 * 3600 * 1000

// ---------------------------------------------------------------------------
// Web-presence classification
// ---------------------------------------------------------------------------

// A "website" on one of these hosts is really just a social/aggregator page —
// the business is still a lead for a real site.
const SOCIAL_HOSTS = [
  'facebook.com', 'fb.com', 'm.me', 'instagram.com', 'x.com', 'twitter.com',
  'tiktok.com', 'linktr.ee', 'wa.me', 'bit.ly', 'business.site', 'wixsite.com',
  'weebly.com', 'square.site', 'godaddysites.com', 'toasttab.com', 'clover.com',
  'yelp.com', 'doordash.com', 'ubereats.com', 'grubhub.com',
]

function classifyPresence(uri: string): 'none' | 'social' | 'website' {
  if (!uri) return 'none'
  try {
    const host = new URL(uri).hostname.replace(/^www\./, '')
    return SOCIAL_HOSTS.some((d) => host === d || host.endsWith('.' + d))
      ? 'social'
      : 'website'
  } catch {
    return 'none'
  }
}

// ---------------------------------------------------------------------------
// Chain / franchise filter — this tool is for local independents only.
// Matched as exact or word-prefix against the normalized business name.
// Add entries freely: lowercase, no punctuation.
// ---------------------------------------------------------------------------

const CHAIN_NAMES = [
  // fast food & drink
  'mcdonalds', 'burger king', 'wendys', 'taco bell', 'kfc', 'subway',
  'chick fil a', 'chipotle', 'panda express', 'arbys', 'sonic drive in',
  'jack in the box', 'carls jr', 'dairy queen', 'five guys', 'little caesars',
  'dominos', 'pizza hut', 'papa johns', 'papa murphys', 'jimmy johns',
  'jersey mikes', 'firehouse subs', 'panera bread', 'qdoba', 'del taco',
  'wingstop', 'raising canes', 'popeyes', 'in n out', 'whataburger',
  'culvers', 'freddys frozen custard', 'cafe rio', 'costa vida', 'mod pizza',
  'blaze pizza', 'noodles company', 'jamba', 'baskin robbins', 'cold stone',
  // coffee
  'starbucks', 'dutch bros', 'dunkin', 'black rock coffee', 'human bean',
  'scooters coffee', 'biggby coffee',
  // casual dining
  'ihop', 'dennys', 'applebees', 'olive garden', 'chilis', 'outback steakhouse',
  'red robin', 'buffalo wild wings', 'texas roadhouse', 'red lobster',
  'cracker barrel', 'golden corral', 'village inn', 'shari s', 'sizzler',
  'pf changs', 'cheesecake factory', 'waffle house', 'perkins',
  // fuel & convenience
  '7 eleven', 'circle k', 'maverik', 'chevron', 'shell', 'sinclair', 'exxon',
  'mobil', 'phillips 66', 'conoco', 'jacksons', 'pilot', 'loves travel',
  'speedway', 'stinker',
  // auto
  'jiffy lube', 'les schwab', 'oreilly auto', 'autozone', 'napa auto',
  'advance auto', 'discount tire', 'big o tires', 'midas', 'firestone',
  'meineke', 'grease monkey', 'valvoline', 'christian brothers automotive',
  'caliber collision', 'safelite',
  // gyms & fitness
  'planet fitness', 'anytime fitness', 'orangetheory', 'crunch fitness',
  'golds gym', '24 hour fitness', 'la fitness', 'snap fitness', 'club pilates',
  '9round', 'f45',
  // hair & beauty
  'great clips', 'supercuts', 'sport clips', 'fantastic sams', 'ulta',
  'sally beauty', 'european wax center', 'massage envy',
  // pets
  'petco', 'petsmart', 'banfield', 'vca animal hospital', 'petiq',
  // big box, grocery, pharmacy
  'walmart', 'target', 'costco', 'sams club', 'winco', 'albertsons',
  'fred meyer', 'kroger', 'safeway', 'whole foods', 'trader joes',
  'natural grocers', 'walgreens', 'cvs', 'rite aid', 'dollar tree',
  'dollar general', 'family dollar', 'big lots', 'ross dress', 'tj maxx',
  'marshalls', 'home depot', 'lowes', 'ace hardware', 'best buy', 'staples',
  'office depot', 'michaels', 'hobby lobby', 'joann', 'petsense',
  'tractor supply', 'harbor freight', 'sportsmans warehouse', 'cabelas',
  'bass pro', 'dicks sporting goods', 'rei',
  // shipping & services
  'ups store', 'fedex', 'usps', 'h r block', 'jackson hewitt',
  'batteries plus', 'goodwill', 'enterprise rent', 'u haul',
]

const normName = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

function isChain(name: string): boolean {
  const n = normName(name.replace(/#\s*\d+.*$/, '')) // strip "#1234" store numbers
  return CHAIN_NAMES.some((c) => n === c || n.startsWith(c + ' '))
}

// ---------------------------------------------------------------------------
// Postgres cache + budget counters (discover_cache table, service-role only)
// ---------------------------------------------------------------------------

async function cacheGet(
  key: string
): Promise<{ payload: unknown; fresh: boolean } | null> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/discover_cache?key=eq.${encodeURIComponent(key)}&select=payload,created_at`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
    )
    if (!res.ok) return null
    const rows = await res.json()
    if (!Array.isArray(rows) || rows.length === 0) return null
    const age = Date.now() - new Date(rows[0].created_at).getTime()
    return { payload: rows[0].payload, fresh: age < CACHE_TTL_MS }
  } catch (_e) {
    return null
  }
}

async function cacheSet(key: string, payload: unknown) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/discover_cache?on_conflict=key`, {
      method: 'POST',
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify({ key, payload, created_at: new Date().toISOString() }),
    })
  } catch (_e) {
    // cache write is best-effort
  }
}

// Budget counters live in discover_cache under budget|* keys (search keys
// always contain a location, so the prefix can't collide). Read-modify-write
// isn't atomic, but with 2 users the worst case is undercounting a call or
// two — the Google Cloud quota cap is the hard stop, so don't "fix" this
// with an RPC.
function budgetKeys(): { day: string; month: string } {
  const now = new Date().toISOString()
  return { day: `budget|day|${now.slice(0, 10)}`, month: `budget|month|${now.slice(0, 7)}` }
}

async function budgetGet(): Promise<{ day: number; month: number }> {
  const { day, month } = budgetKeys()
  const dayRow = await cacheGet(day)
  const monthRow = await cacheGet(month)
  const count = (row: { payload: unknown } | null) =>
    Number((row?.payload as { count?: number })?.count ?? 0)
  return { day: count(dayRow), month: count(monthRow) }
}

async function budgetAdd(n: number, current: { day: number; month: number }) {
  const { day, month } = budgetKeys()
  await cacheSet(day, { count: current.day + n })
  await cacheSet(month, { count: current.month + n })
}

// ---------------------------------------------------------------------------
// Geocoding (Photon → Nominatim) — free, keyless, cached per instance.
// Used for the Google locationBias circle and the OSM fallback.
// ---------------------------------------------------------------------------

const geoCache = new Map<string, { lat: number; lon: number }>()

async function geocode(location: string): Promise<{ lat: number; lon: number } | null> {
  const key = location.trim().toLowerCase()
  const cached = geoCache.get(key)
  if (cached) return cached

  // Photon (komoot) first — fast, JSON, tolerant of cloud IPs.
  try {
    const res = await fetch(
      `https://photon.komoot.io/api/?limit=1&q=${encodeURIComponent(location)}`,
      { signal: AbortSignal.timeout(8_000) }
    )
    if (res.ok) {
      const data = await res.json()
      const coords = data?.features?.[0]?.geometry?.coordinates
      if (Array.isArray(coords)) {
        const hit = { lat: coords[1], lon: coords[0] }
        geoCache.set(key, hit)
        return hit
      }
    }
  } catch (_e) {
    // fall through to Nominatim
  }

  // Nominatim fallback.
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(location)}`,
      {
        headers: { 'User-Agent': 'CallBax/1.0 (two-person internal sales tool)' },
        signal: AbortSignal.timeout(8_000),
      }
    )
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data) && data.length > 0) {
        const hit = { lat: Number(data[0].lat), lon: Number(data[0].lon) }
        geoCache.set(key, hit)
        return hit
      }
    }
  } catch (_e) {
    // no geocoder available
  }
  return null
}

function haversineMiles(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number }
): number {
  const R = 3958.8
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

// ---------------------------------------------------------------------------
// Result shape shared by both sources
// ---------------------------------------------------------------------------

type Biz = {
  placeId: string
  name: string
  category: string
  phone: string
  address: string
  website: string
  presence: 'none' | 'social' | 'website'
  rating: number | null
  reviewCount: number
  openNow: boolean | null
  hoursToday: string
  businessStatus: string
  mapsUrl: string
}

const PRESENCE_RANK = { none: 0, social: 1, website: 2 }

function sortBizzes(results: Biz[]) {
  // Best cold-call targets first: no website, then social-only, then real
  // sites; busiest (most-reviewed) first within each group.
  results.sort(
    (a, b) =>
      PRESENCE_RANK[a.presence] - PRESENCE_RANK[b.presence] ||
      b.reviewCount - a.reviewCount
  )
}

// ---------------------------------------------------------------------------
// Google Places API (New) Text Search
// ---------------------------------------------------------------------------

// Every field here beyond id/address pushes the call into a higher SKU —
// websiteUri/phone/rating/hours make it "Text Search Enterprise". Check
// Google's pricing tables before adding fields. nextPageToken is top-level
// and must be in the mask for pagination to work.
const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.shortFormattedAddress',
  'places.location',
  'places.primaryTypeDisplayName',
  'places.businessStatus',
  'places.googleMapsUri',
  'places.nationalPhoneNumber',
  'places.websiteUri',
  'places.rating',
  'places.userRatingCount',
  'places.currentOpeningHours',
  'nextPageToken',
].join(',')

const MAX_PAGES = 2 // each page is one billed call

const CATEGORY_QUERIES: Record<string, string> = {
  all: 'businesses',
  restaurants: 'restaurants',
  coffee: 'coffee shops',
  bars: 'bars and pubs',
  barber: 'barber shops and hair salons',
  vape: 'vape and smoke shops',
  tattoo: 'tattoo and piercing shops',
  auto: 'auto repair shops',
  gym: 'gyms and fitness studios',
  pets: 'pet stores groomers and veterinarians',
  food: 'food and drink businesses',
  retail: 'retail stores and boutiques',
  services: 'local service businesses',
}

async function searchGoogle(
  location: string,
  center: { lat: number; lon: number } | null,
  radiusMiles: number,
  category: string
): Promise<Biz[]> {
  const terms = CATEGORY_QUERIES[category] ?? CATEGORY_QUERIES.all
  const radiusM = Math.min(Math.round(radiusMiles * 1609), 16000)
  // deno-lint-ignore no-explicit-any
  const places: any[] = []
  let pageToken: string | undefined

  for (let page = 0; page < MAX_PAGES; page++) {
    const body = {
      textQuery: `${terms} near ${location}`,
      pageSize: 20,
      ...(center && {
        locationBias: {
          circle: {
            center: { latitude: center.lat, longitude: center.lon },
            radius: radiusM,
          },
        },
      }),
      ...(pageToken && { pageToken }),
    }
    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_KEY,
        'X-Goog-FieldMask': FIELD_MASK,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) {
      throw new Error(`Google Places ${res.status}: ${(await res.text()).slice(0, 300)}`)
    }
    const data = await res.json()
    places.push(...(data.places ?? []))
    pageToken = data.nextPageToken
    // A short page means no more results — don't burn a call on page 2.
    if (!pageToken || (data.places ?? []).length < 20) break
  }

  const todayIdx = (new Date().getDay() + 6) % 7 // weekdayDescriptions start Monday
  const seenIds = new Set<string>()
  const seenNames = new Set<string>()
  const results: Biz[] = []

  for (const p of places) {
    const name = (p.displayName?.text ?? '').trim()
    if (!name) continue
    if (p.businessStatus === 'CLOSED_PERMANENTLY') continue
    if (isChain(name)) continue
    if (center && p.location) {
      const dist = haversineMiles(center, {
        lat: p.location.latitude,
        lon: p.location.longitude,
      })
      if (dist > radiusMiles) continue
    }
    if (p.id && seenIds.has(p.id)) continue
    if (seenNames.has(name.toLowerCase())) continue
    if (p.id) seenIds.add(p.id)
    seenNames.add(name.toLowerCase())

    const website = p.websiteUri ?? ''
    results.push({
      placeId: p.id ?? '',
      name,
      category: p.primaryTypeDisplayName?.text ?? '',
      phone: p.nationalPhoneNumber ?? '',
      address: p.shortFormattedAddress ?? p.formattedAddress ?? '',
      website,
      presence: classifyPresence(website),
      rating: p.rating ?? null,
      reviewCount: p.userRatingCount ?? 0,
      openNow: p.currentOpeningHours?.openNow ?? null,
      hoursToday: p.currentOpeningHours?.weekdayDescriptions?.[todayIdx] ?? '',
      businessStatus: p.businessStatus ?? 'OPERATIONAL',
      mapsUrl: p.googleMapsUri ?? '',
    })
    if (results.length >= 80) break
  }

  sortBizzes(results)
  return results
}

// ---------------------------------------------------------------------------
// OpenStreetMap fallback (Overpass) — free, keyless, less accurate
// ---------------------------------------------------------------------------

const CATEGORY_SELECTORS: Record<string, string[]> = {
  restaurants: ['"amenity"~"^(restaurant|fast_food|ice_cream|food_court)$"'],
  coffee: ['"amenity"="cafe"', '"shop"="coffee"'],
  bars: ['"amenity"~"^(bar|pub)$"'],
  barber: ['"shop"~"^(hairdresser|barber|beauty)$"'],
  vape: ['"shop"~"^(e-cigarette|tobacco|cannabis)$"'],
  tattoo: ['"shop"~"^(tattoo|piercing)$"'],
  auto: [
    '"shop"~"^(car_repair|car_parts|car|tyres)$"',
    '"amenity"~"^(car_wash|car_repair)$"',
  ],
  gym: ['"leisure"="fitness_centre"', '"shop"="sports"'],
  pets: ['"shop"~"^(pet|pet_grooming)$"', '"amenity"="veterinary"'],
}

function overpassSelectors(category: string, around: string): string {
  const specific = CATEGORY_SELECTORS[category]
  if (specific) {
    return specific.map((sel) => `nwr["name"][${sel}]${around};`).join('\n')
  }
  const food = `
    nwr["name"]["amenity"~"^(restaurant|cafe|fast_food|bar|pub|ice_cream|food_court)$"]${around};
    nwr["name"]["shop"~"^(bakery|deli|confectionery|coffee|butcher|greengrocer)$"]${around};`
  const retail = `
    nwr["name"]["shop"]${around};`
  const services = `
    nwr["name"]["office"]${around};
    nwr["name"]["craft"]${around};
    nwr["name"]["leisure"="fitness_centre"]${around};
    nwr["name"]["amenity"~"^(dentist|clinic|veterinary|car_wash|car_repair)$"]${around};
    nwr["name"]["shop"~"^(hairdresser|beauty|massage|tattoo|car_repair|laundry|dry_cleaning|pet_grooming|optician)$"]${around};`
  if (category === 'food') return food
  if (category === 'retail') return retail
  if (category === 'services') return services
  return food + retail + services
}

function prettyCategory(tags: Record<string, string>): string {
  const raw =
    tags.cuisine ||
    tags.shop ||
    tags.amenity ||
    tags.office ||
    tags.craft ||
    (tags.leisure === 'fitness_centre' ? 'gym' : '') ||
    ''
  return raw.split(';')[0].replaceAll('_', ' ')
}

async function searchOsm(
  center: { lat: number; lon: number },
  radiusMiles: number,
  category: string
): Promise<{ results: Biz[] } | { error: string; debug: string[] }> {
  const radiusM = Math.min(Math.round(Number(radiusMiles) * 1609), 16000)
  const around = `(around:${radiusM},${center.lat},${center.lon})`
  const query = `[out:json][timeout:25];(${overpassSelectors(category, around)});out center tags 400;`

  // Public Overpass mirrors — try each in turn, since individual instances
  // rate-limit shared cloud IPs.
  const MIRRORS = [
    'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
  ]
  const debug: string[] = []
  // deno-lint-ignore no-explicit-any
  let data: { elements?: any[] } | null = null
  for (const mirror of MIRRORS) {
    try {
      const opRes = await fetch(mirror, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'data=' + encodeURIComponent(query),
        signal: AbortSignal.timeout(25_000),
      })
      debug.push(`${mirror} -> ${opRes.status}`)
      if (opRes.ok) {
        data = await opRes.json()
        break
      }
    } catch (e) {
      debug.push(`${mirror} -> ${e instanceof Error ? e.message : e}`)
    }
  }
  if (!data) {
    return { error: 'Map data service is busy — try again in a minute.', debug }
  }

  const seen = new Set<string>()
  const results: Biz[] = []
  for (const el of data.elements ?? []) {
    const t: Record<string, string> = el.tags ?? {}
    const name = (t.name || '').trim()
    if (!name || seen.has(name.toLowerCase())) continue
    if (t.brand || t['brand:wikidata']) continue // skip national chains
    if (isChain(name)) continue
    if (t.office === 'government' || t.office === 'administrative') continue

    const website = t.website || t['contact:website'] || t.url || ''
    let presence = classifyPresence(website)
    if (presence === 'none' && (t['contact:facebook'] || t['contact:instagram'])) {
      presence = 'social'
    }

    seen.add(name.toLowerCase())
    results.push({
      placeId: '',
      name,
      category: prettyCategory(t),
      phone: t.phone || t['contact:phone'] || '',
      address: [t['addr:housenumber'], t['addr:street']].filter(Boolean).join(' '),
      website: presence === 'none' ? '' : website,
      presence,
      rating: null,
      reviewCount: 0,
      openNow: null,
      hoursToday: '',
      businessStatus: 'OPERATIONAL',
      mapsUrl: '',
    })
    if (results.length >= 80) break
  }

  sortBizzes(results)
  return { results }
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  try {
    const { location = 'Boise, ID', radiusMiles = 3, category = 'all' } =
      await req.json()

    // 0. Serve a fresh cached search if we have one. The v2| prefix keeps
    // old OSM-shaped payloads from ever reaching the new UI.
    const normLoc = location.trim().toLowerCase().replace(/\s+/g, ' ')
    const cacheKey = `v2|${normLoc}|${radiusMiles}|${category}`
    const cached = await cacheGet(cacheKey)
    if (cached?.fresh) {
      return json({ ...(cached.payload as object), cached: true })
    }

    // 1. Geocode. Required for OSM; for Google it only tightens results
    // (locationBias + strict distance filter), so a miss is non-fatal there.
    const center = await geocode(location)

    let payload: Record<string, unknown>

    if (GOOGLE_KEY) {
      const spent = await budgetGet()
      if (spent.day >= DAILY_BUDGET || spent.month >= MONTHLY_BUDGET) {
        // Budget gone — a stale cached result beats a downgraded search.
        if (cached) {
          return json({ ...(cached.payload as object), cached: true, budgetExhausted: true })
        }
        if (!center) {
          return json({ error: `Couldn't find "${location}" — try "City, State".` }, 200)
        }
        const osm = await searchOsm(center, radiusMiles, category)
        if ('error' in osm) return json(osm, 200)
        payload = { ...osm, source: 'osm', center, budgetExhausted: true }
      } else {
        // Reserve the calls up front; over-counting when page 2 is skipped
        // just leaves safety margin.
        await budgetAdd(MAX_PAGES, spent)
        try {
          const results = await searchGoogle(location, center, radiusMiles, category)
          payload = { results, source: 'google', center }
        } catch (e) {
          console.error('Google search failed, falling back:', e)
          if (cached) {
            return json({ ...(cached.payload as object), cached: true })
          }
          if (!center) {
            return json({ error: `Couldn't find "${location}" — try "City, State".` }, 200)
          }
          const osm = await searchOsm(center, radiusMiles, category)
          if ('error' in osm) return json(osm, 200)
          payload = { ...osm, source: 'osm', center }
        }
      }
    } else {
      // No Google key configured — free OSM mode.
      if (!center) {
        return json({ error: `Couldn't find "${location}" — try "City, State".` }, 200)
      }
      const osm = await searchOsm(center, radiusMiles, category)
      if ('error' in osm) {
        // Overpass is throttling us — a stale cached result beats an error.
        if (cached) {
          return json({ ...(cached.payload as object), cached: true })
        }
        return json(osm, 200)
      }
      payload = { ...osm, source: 'osm', center }
    }

    await cacheSet(cacheKey, payload)
    return json(payload)
  } catch (e) {
    return json({ error: `Search failed: ${e instanceof Error ? e.message : e}` }, 200)
  }
})
