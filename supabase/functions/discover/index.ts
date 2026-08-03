// Discover: find nearby businesses with no website (or social-media-only
// presence) to cold call. Data comes from OpenStreetMap — Photon/Nominatim
// for geocoding, Overpass for the business search. All free and keyless;
// this runs server-side to keep usage polite and swappable (e.g. for Google
// Places later) without touching the frontend.

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

// Websites that are really just a social page = still a lead.
const SOCIAL_RE =
  /facebook\.com|fb\.com|instagram\.com|linktr\.ee|tiktok\.com|m\.me|wa\.me|bit\.ly/i

// Geocode cache — persists for the life of this function instance.
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

// Overpass tag selectors per category filter.
function overpassSelectors(category: string, around: string): string {
  const food = `
    nwr["name"]["amenity"~"^(restaurant|cafe|fast_food|bar|pub|ice_cream|food_court)$"]${around};
    nwr["name"]["shop"~"^(bakery|deli|confectionery|coffee|butcher|greengrocer)$"]${around};`
  const retail = `
    nwr["name"]["shop"]${around};`
  const services = `
    nwr["name"]["office"]${around};
    nwr["name"]["craft"]${around};
    nwr["name"]["amenity"~"^(dentist|clinic|veterinary|car_wash|car_repair)$"]${around};
    nwr["name"]["shop"~"^(hairdresser|beauty|massage|tattoo|car_repair|laundry|dry_cleaning|pet_grooming|optician)$"]${around};`
  if (category === 'food') return food
  if (category === 'retail') return retail
  if (category === 'services') return services
  return food + retail + services
}

function prettyCategory(tags: Record<string, string>): string {
  const raw =
    tags.cuisine || tags.shop || tags.amenity || tags.office || tags.craft || ''
  return raw.split(';')[0].replaceAll('_', ' ')
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  try {
    const { location = 'Boise, ID', radiusMiles = 3, category = 'all' } =
      await req.json()

    // 1. Geocode the location text.
    const center = await geocode(location)
    if (!center) {
      return json({ error: `Couldn't find "${location}" — try "City, State".` }, 200)
    }
    const { lat, lon } = center

    // 2. Ask Overpass for named businesses in the radius.
    const radiusM = Math.min(Math.round(Number(radiusMiles) * 1609), 16000)
    const around = `(around:${radiusM},${lat},${lon})`
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
      return json({ error: 'Map data service is busy — try again in a minute.', debug }, 200)
    }

    // 3. Keep only businesses with no real website.
    const seen = new Set<string>()
    const results = []
    for (const el of data.elements ?? []) {
      const t: Record<string, string> = el.tags ?? {}
      const name = (t.name || '').trim()
      if (!name || seen.has(name.toLowerCase())) continue
      if (t.brand || t['brand:wikidata']) continue // skip national chains
      if (t.office === 'government' || t.office === 'administrative') continue

      const website = t.website || t['contact:website'] || t.url || ''
      let presence: 'none' | 'social'
      if (!website) {
        presence =
          t['contact:facebook'] || t['contact:instagram'] ? 'social' : 'none'
      } else if (SOCIAL_RE.test(website)) {
        presence = 'social'
      } else {
        continue // has a real website — not our lead
      }

      seen.add(name.toLowerCase())
      results.push({
        name,
        category: prettyCategory(t),
        phone: t.phone || t['contact:phone'] || '',
        address: [t['addr:housenumber'], t['addr:street']]
          .filter(Boolean)
          .join(' '),
        presence,
      })
      if (results.length >= 80) break
    }

    return json({ results, center: { lat, lon } })
  } catch (e) {
    return json({ error: `Search failed: ${e instanceof Error ? e.message : e}` }, 200)
  }
})
