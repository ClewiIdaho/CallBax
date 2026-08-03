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

const normPhone = (p) => (p || '').replace(/\D/g, '').slice(-10)

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
  const [added, setAdded] = useState({}) // business name -> true once added

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
    setResults(data.results.filter((b) => !isKnown(b)))
  }

  async function addBiz(b) {
    const noteText = [b.address, 'Found via Discover'].filter(Boolean).join(' · ')
    const lead = await addLead({
      business_name: b.name,
      category: b.category,
      phone: b.phone,
      notes: [{ at: new Date().toISOString(), by: currentUser || 'Ricky', text: noteText }],
    })
    if (lead) setAdded((a) => ({ ...a, [b.name]: true }))
    return lead
  }

  async function callNow(b) {
    const lead = added[b.name] ? true : await addBiz(b)
    if (!lead) return
    onCallNow(b.name)
    // Pop the phone's dialer with the number loaded (one tap to connect).
    if (b.phone) {
      window.location.href = 'tel:' + b.phone.replace(/[^+\d]/g, '')
    }
  }

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
          <p className="empty">Scanning the map for businesses with no website — can take ~20 seconds…</p>
        )}
        {error && <p className="login-error">{error}</p>}
      </form>

      {results && (
        <div className="lead-list">
          <p className="discover-count">
            {results.length} {results.length === 1 ? 'business' : 'businesses'} with no
            real website nearby{fromCache ? ' · from today’s earlier search' : ''}
          </p>
          {results.length === 0 && (
            <p className="empty">
              No new prospects found. Try a wider radius or a different category.
            </p>
          )}
          {results.map((b) => (
            <div key={b.name} className="lead-card discover-card">
              <div className="lead-card-top">
                <span className="lead-name">{b.name}</span>
                <span className={b.presence === 'social' ? 'presence-tag social' : 'presence-tag'}>
                  {b.presence === 'social' ? 'Social Only' : 'No Website'}
                </span>
              </div>
              <div className="lead-card-sub">
                {b.category && <span>{b.category}</span>}
                {b.phone && <span>{b.phone}</span>}
                {b.address && <span>{b.address}</span>}
              </div>
              <div className="discover-actions">
                <button
                  className="btn btn-ghost"
                  disabled={!!added[b.name]}
                  onClick={() => addBiz(b)}
                >
                  {added[b.name] ? '✓ In workflow' : '+ Workflow'}
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
          Find nearby businesses that have no website — your best cold-call targets,
          straight off the map.
        </p>
      )}
    </div>
  )
}
