import { useState } from 'react'
import { useStore, fmtDateTime, isThisWeek, isDueToday, isOverdue } from '../data/store'
import { leadValue, leadMonthly, fmtMoney } from '../data/constants'

const OPEN_STATUSES = ['Contacted', 'Warm', 'Proposal Sent', 'Follow-Up']
const SIGNED_STATUSES = ['Active Contract', 'Closed Won']

function MoneyTracker({ leads }) {
  const pipeline = leads
    .filter((l) => OPEN_STATUSES.includes(l.pipeline_status))
    .reduce((sum, l) => sum + leadValue(l), 0)
  const signedLeads = leads.filter((l) => SIGNED_STATUSES.includes(l.pipeline_status))
  const signed = signedLeads.reduce((sum, l) => sum + leadValue(l), 0)
  const collected = leads.reduce((sum, l) => sum + Number(l.amount_paid || 0), 0)
  const monthly = signedLeads.reduce((sum, l) => sum + leadMonthly(l), 0)
  const pct = signed > 0 ? Math.min(100, Math.round((collected / signed) * 100)) : 0

  return (
    <div className="money-card">
      <div className="money-title">💰 Money</div>
      <div className="money-row">
        <div className="money-tile">
          <div className="money-value">{fmtMoney(pipeline)}</div>
          <div className="money-label">In pipeline</div>
        </div>
        <div className="money-tile">
          <div className="money-value">{fmtMoney(signed)}</div>
          <div className="money-label">Signed</div>
        </div>
        <div className="money-tile">
          <div className="money-value collected">{fmtMoney(collected)}</div>
          <div className="money-label">Collected</div>
        </div>
      </div>
      {signed > 0 && (
        <div className="money-progress">
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <div className="progress-caption">
            {pct}% of signed work collected
            {monthly > 0 && ` · +${fmtMoney(monthly)}/mo recurring`}
          </div>
        </div>
      )}
    </div>
  )
}

export default function HomeHub() {
  const { leads, callLog, activity, postActivity } = useStore()
  const [draft, setDraft] = useState('')

  const stats = [
    { icon: '📱', label: 'Calls this week', value: callLog.filter((c) => isThisWeek(c.at)).length },
    { icon: '🔥', label: 'Warm leads', value: leads.filter((l) => l.pipeline_status === 'Warm').length },
    { icon: '📨', label: 'Proposals out', value: leads.filter((l) => l.pipeline_status === 'Proposal Sent').length },
    { icon: '🛠️', label: 'Active contracts', value: leads.filter((l) => l.pipeline_status === 'Active Contract').length },
    {
      icon: '⏰',
      label: 'Follow-ups due',
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
            <div className="stat-icon">{s.icon}</div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <MoneyTracker leads={leads} />

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
