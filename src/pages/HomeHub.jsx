import { useState } from 'react'
import { useStore, fmtDateTime, isThisWeek, isDueToday, isOverdue } from '../data/store'

export default function HomeHub() {
  const { leads, callLog, activity, postActivity } = useStore()
  const [draft, setDraft] = useState('')

  const stats = [
    { label: 'Calls this week', value: callLog.filter((c) => isThisWeek(c.at)).length },
    { label: 'Warm leads', value: leads.filter((l) => l.pipeline_status === 'Warm').length },
    { label: 'Proposals sent', value: leads.filter((l) => l.pipeline_status === 'Proposal Sent').length },
    { label: 'Active contracts', value: leads.filter((l) => l.pipeline_status === 'Active Contract').length },
    {
      label: 'Follow-ups due today',
      value: leads.filter((l) => isDueToday(l.follow_up_date) || isOverdue(l.follow_up_date)).length,
    },
  ]

  function submitNote(e) {
    e.preventDefault()
    const text = draft.trim()
    if (!text) return
    postActivity(text)
    setDraft('')
  }

  const leadName = (id) => leads.find((l) => l.id === id)?.business_name

  return (
    <div className="page">
      <div className="stats-row">
        {stats.map((s) => (
          <div key={s.label} className="stat-card">
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <form className="quick-add" onSubmit={submitNote}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Drop a note for the feed…"
          aria-label="New activity note"
        />
        <button className="btn" type="submit" disabled={!draft.trim()}>
          Post
        </button>
      </form>

      <div className="feed">
        {activity.length === 0 && <p className="empty">No activity yet. Post the first note above.</p>}
        {activity.map((a) => (
          <div key={a.id} className="feed-item">
            <div className="feed-meta">
              <span className={`author author-${a.author.toLowerCase()}`}>{a.author}</span>
              <span className="timestamp">{fmtDateTime(a.at)}</span>
            </div>
            <p>{a.message}</p>
            {a.related_lead_id && leadName(a.related_lead_id) && (
              <span className="feed-lead-tag">{leadName(a.related_lead_id)}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
