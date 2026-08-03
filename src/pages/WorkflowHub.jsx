import { useState } from 'react'
import { useStore, fmtDate, isOverdue } from '../data/store'
import { STATUS_COLORS } from '../data/constants'
import LeadDetail from './LeadDetail'

const VIEWS = [
  { key: 'to-call', label: 'To Call' },
  { key: 'follow-up', label: 'Follow-Up' },
  { key: 'warm', label: 'Warm / Sent' },
  { key: 'active', label: 'Contracts' },
  { key: 'archive', label: 'Closed' },
]

function leadsForView(view, leads) {
  switch (view) {
    case 'to-call':
      return leads.filter((l) => ['To Call', 'Contacted'].includes(l.pipeline_status))
    case 'follow-up':
      return leads
        .filter((l) => l.pipeline_status === 'Follow-Up' || (l.follow_up_date && !['Closed Won', 'Dead', 'Active Contract'].includes(l.pipeline_status)))
        .sort((a, b) => (a.follow_up_date || '9999').localeCompare(b.follow_up_date || '9999'))
    case 'warm':
      return leads.filter((l) => ['Warm', 'Proposal Sent'].includes(l.pipeline_status))
    case 'active':
      return leads.filter((l) => l.pipeline_status === 'Active Contract')
    case 'archive':
      return leads.filter((l) => ['Closed Won', 'Dead'].includes(l.pipeline_status))
    default:
      return leads
  }
}

function ContractTimeline({ lead }) {
  const steps = [
    { label: 'Deposit', done: lead.deposit_collected },
    { label: 'Build', done: lead.deposit_collected && !lead.launch_date, active: true },
    { label: `Target ${lead.delivery_target_date ? fmtDate(lead.delivery_target_date) : '—'}`, done: false },
    { label: 'Launched', done: !!lead.launch_date },
  ]
  return (
    <div className="mini-timeline">
      {steps.map((s, i) => (
        <span key={i} className={s.done ? 'tl-step done' : 'tl-step'}>
          {s.label}
        </span>
      ))}
    </div>
  )
}

export default function WorkflowHub() {
  const { leads, addLead } = useStore()
  const [view, setView] = useState('to-call')
  const [selectedId, setSelectedId] = useState(null)
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [archiveOpen, setArchiveOpen] = useState(false)

  const selected = leads.find((l) => l.id === selectedId)
  if (selected) {
    return <LeadDetail lead={selected} onBack={() => setSelectedId(null)} />
  }

  function submitNewLead(e) {
    e.preventDefault()
    if (!newName.trim()) return
    const lead = addLead({ business_name: newName.trim(), phone: newPhone.trim() })
    setNewName('')
    setNewPhone('')
    setAdding(false)
    setSelectedId(lead.id)
  }

  const visible = leadsForView(view, leads)
  const collapsedArchive = view === 'archive' && !archiveOpen

  return (
    <div className="page">
      <div className="view-tabs">
        {VIEWS.map((v) => (
          <button
            key={v.key}
            className={view === v.key ? 'view-tab active' : 'view-tab'}
            onClick={() => setView(v.key)}
          >
            {v.label}
          </button>
        ))}
      </div>

      {adding ? (
        <form className="add-lead-form" onSubmit={submitNewLead}>
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Business name *"
          />
          <input
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
            placeholder="Phone"
            type="tel"
          />
          <div className="form-row">
            <button className="btn" type="submit" disabled={!newName.trim()}>
              Save
            </button>
            <button className="btn btn-ghost" type="button" onClick={() => setAdding(false)}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button className="btn btn-add" onClick={() => setAdding(true)}>
          + Add business
        </button>
      )}

      {collapsedArchive ? (
        <button className="btn btn-ghost" onClick={() => setArchiveOpen(true)}>
          Show {visible.length} closed/dead {visible.length === 1 ? 'lead' : 'leads'}
        </button>
      ) : (
        <div className="lead-list">
          {visible.length === 0 && <p className="empty">Nothing here right now.</p>}
          {visible.map((l) => (
            <button key={l.id} className="lead-card" onClick={() => setSelectedId(l.id)}>
              <div className="lead-card-top">
                <span className="lead-name">{l.business_name}</span>
                <span
                  className="status-pill"
                  style={{ background: STATUS_COLORS[l.pipeline_status] }}
                >
                  {l.pipeline_status}
                </span>
              </div>
              <div className="lead-card-sub">
                {l.category && <span>{l.category}</span>}
                {l.phone && <span>{l.phone}</span>}
                <span className="owner-tag">{l.owner}</span>
                {view === 'follow-up' && l.follow_up_date && (
                  <span className={isOverdue(l.follow_up_date) ? 'due overdue' : 'due'}>
                    {isOverdue(l.follow_up_date) ? 'Overdue: ' : 'Due: '}
                    {fmtDate(l.follow_up_date)}
                  </span>
                )}
              </div>
              {l.pipeline_status === 'Active Contract' && <ContractTimeline lead={l} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
