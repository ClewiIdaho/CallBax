import { useState } from 'react'
import { useStore } from '../data/store'
import { supabase } from '../data/supabase'

const RADII = [1, 3, 5]
const CATEGORIES = [
  { key: 'all', label: '🌐 All types' },
  { key: 'restaurants', label: '🍽️ Restaurants' },
  { key: 'coffee', label: '☕ Coffee shops' },
  { key: 'bars', label: '🍻 Bars & pubs' },
  { key: 'barber', label: '💈 Barber & beauty' },
  { key: 'vape', label: '💨 Vape & smoke' },
  { key: 'tattoo', label: '🖋️ Tattoo & piercing' },
  { key: 'auto', label: '🚗 Auto shops' },
  { key: 'gym', label: '💪 Gyms & fitness' },
  { key: 'pets', label: '🐾 Pets & vets' },
  { key: 'food', label: '🥖 Food & drink (broad)' },
  { key: 'retail', label: '🛍️ Retail (broad)' },
  { key: 'services', label: '🧰 Services (broad)' },
]

const PRESENCE_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'none', label: 'No website' },
  { key: 'social', label: 'Social only' },
]

const normPhone = (p) => (p || '').replace(/\D/g, '').slice(-10)
const bizKey = (b) => b.placeId || b.name

function siteHost(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

export default function DiscoverHub({ onCallNow }) {
  const { leads, addLead, currentUser } = useStore()
  const [location, setLocation] = useState(
    () => localStorage.getItem('callbax-discover-loc') || 'Boise, ID'
  )
  const [radius, setRadius] = useState(3)
  const [category, setCategory] = useState('all')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [fromCache, setFromCache] = useState(false)
  const [source, setSource] = useState('')
  const [budgetExhausted, setBudgetExhausted] = useState(false)
  const [presenceFilter, setPresenceFilter] = useState('all')
  const [added, setAdded] = useState({}) // placeId/name -> true once added

  // Hide anything already in the pipeline (match by name or phone).
  function isKnown(b) {
    return leads.some(
      (l) =>
        l.business_name.trim().toLowerCase() === b.name.trim().toLowerCase() ||
        (normPhone(b.phone) && normPhone(l.phone) === normPhone(b.phone))
    )
  }

  async function search(e) {
    e?.preventDefault()
    if (loading) return
    setLoading(true)
    setError(null)
    setResults(null)
    localStorage.setItem('callbax-discover-loc', location)
    const { data, error: fnError } = await supabase.functions.invoke('discover', {
      body: { location, radiusMiles: radius, category },
    })
    setLoading(false)
    if (fnError) {
      setError('Search failed — check your connection and try again.')
      return
    }
    if (data.error) {
      setError(data.error)
      return
    }
    setFromCache(!!data.cached)
    setSource(data.source || '')
    setBudgetExhausted(!!data.budgetExhausted)
    setResults(data.results.filter((b) => !isKnown(b)))
  }

  async function addBiz(b) {
    const noteText = [
      b.address,
      b.website && `Site: ${b.website}`,
      b.rating && `★${b.rating} (${b.reviewCount})`,
      b.mapsUrl,
      'Found via Discover',
    ]
      .filter(Boolean)
      .join(' · ')
    const lead = await addLead({
      business_name: b.name,
      category: b.category,
      phone: b.phone,
      notes: [{ at: new Date().toISOString(), by: currentUser || 'Ricky', text: noteText }],
    })
    if (lead) setAdded((a) => ({ ...a, [bizKey(b)]: true }))
    return lead
  }

  async function callNow(b) {
    const lead = added[bizKey(b)] ? true : await addBiz(b)
    if (!lead) return
    onCallNow(b.name)
    // Pop the phone's dialer with the number loaded (one tap to connect).
    if (b.phone) {
      window.location.href = 'tel:' + b.phone.replace(/[^+\d]/g, '')
    }
  }

  const counts = { all: 0, none: 0, social: 0 }
  if (results) {
    counts.all = results.length
    for (const b of results) {
      if (b.presence === 'none') counts.none++
      else if (b.presence === 'social') counts.social++
    }
  }
  const visible = results
    ? presenceFilter === 'all'
      ? results
      : results.filter((b) => b.presence === presenceFilter)
    : []

  return (
    <div className="page">
      <form className="discover-controls" onSubmit={search}>
        <input
          className="business-input"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="City or area — e.g. Boise, ID"
        />
        <div className="discover-row">
          <div className="segmented">
            {RADII.map((r) => (
              <button
                key={r}
                type="button"
                className={radius === r ? 'seg-btn active' : 'seg-btn'}
                onClick={() => setRadius(r)}
              >
                {r} mi
              </button>
            ))}
          </div>
          <select
            className="category-select"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <button className="btn" type="submit" disabled={loading || !location.trim()}>
          {loading ? 'Searching…' : '🔎 Find businesses'}
        </button>
        {loading && (
          <p className="empty">Searching local business listings…</p>
        )}
        {error && <p className="login-error">{error}</p>}
      </form>

      {results && (
        <div className="lead-list">
          <p className="discover-count">
            {counts.all} local {counts.all === 1 ? 'business' : 'businesses'} nearby
            {source === 'osm' ? ' · OpenStreetMap' : source === 'google' ? ' · Google' : ''}
            {fromCache ? ' · from today’s earlier search' : ''}
          </p>
          {budgetExhausted && (
            <p className="empty">
              Daily search budget reached — showing cached/map data.
            </p>
          )}
          <div className="segmented discover-filter">
            {PRESENCE_FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                className={presenceFilter === f.key ? 'seg-btn active' : 'seg-btn'}
                onClick={() => setPresenceFilter(f.key)}
              >
                {f.label} ({counts[f.key]})
              </button>
            ))}
          </div>
          {visible.length === 0 && (
            <p className="empty">
              No new prospects here. Try a wider radius, another category, or a
              different filter.
            </p>
          )}
          {visible.map((b) => (
            <div key={bizKey(b)} className="lead-card discover-card">
              <div className="lead-card-top">
                <span className="lead-name">{b.name}</span>
                <span
                  className={
                    b.presence === 'website'
                      ? 'presence-tag website'
                      : b.presence === 'social'
                        ? 'presence-tag social'
                        : 'presence-tag'
                  }
                >
                  {b.presence === 'website'
                    ? 'Has Website'
                    : b.presence === 'social'
                      ? 'Social Only'
                      : 'No Website'}
                </span>
              </div>
              <div className="lead-card-sub">
                {b.category && <span>{b.category}</span>}
                {b.phone && <span>{b.phone}</span>}
                {b.address && <span>{b.address}</span>}
              </div>
              {(b.rating || b.openNow !== null || b.businessStatus === 'CLOSED_TEMPORARILY') && (
                <div className="discover-meta">
                  {b.rating && (
                    <span>★ {b.rating} ({b.reviewCount})</span>
                  )}
                  {b.openNow !== null && (
                    <span className={b.openNow ? 'open-now' : 'closed-now'}>
                      {b.openNow ? 'Open now' : 'Closed'}
                    </span>
                  )}
                  {b.businessStatus === 'CLOSED_TEMPORARILY' && (
                    <span className="closed-now">Temporarily closed</span>
                  )}
                </div>
              )}
              {(b.website || b.mapsUrl) && (
                <div className="discover-links">
                  {b.website && (
                    <a href={b.website} target="_blank" rel="noreferrer">
                      {siteHost(b.website)}
                    </a>
                  )}
                  {b.mapsUrl && (
                    <a href={b.mapsUrl} target="_blank" rel="noreferrer">
                      Maps ↗
                    </a>
                  )}
                </div>
              )}
              <div className="discover-actions">
                <button
                  className="btn btn-ghost"
                  disabled={!!added[bizKey(b)]}
                  onClick={() => addBiz(b)}
                >
                  {added[bizKey(b)] ? '✓ In workflow' : '+ Workflow'}
                </button>
                <button className="btn" onClick={() => callNow(b)}>
                  📞 Call now
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!results && !loading && (
        <p className="empty">
          Find local businesses nearby — see who has no website, who's
          social-only, and who already has a real site.
        </p>
      )}
    </div>
  )
}
