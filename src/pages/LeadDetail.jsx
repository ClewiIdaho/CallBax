import { useState } from 'react'
import { useStore, fmtDateTime } from '../data/store'
import { PIPELINE_STATUSES, STATUS_COLORS, MODULES, CALL_OUTCOMES } from '../data/constants'

export default function LeadDetail({ lead, onBack }) {
  const { updateLead, addNote } = useStore()
  const [noteDraft, setNoteDraft] = useState('')

  function toggleModule(mod) {
    const has = lead.modules_selected.includes(mod)
    updateLead(lead.id, {
      modules_selected: has
        ? lead.modules_selected.filter((m) => m !== mod)
        : [...lead.modules_selected, mod],
    })
  }

  function submitNote(e) {
    e.preventDefault()
    const text = noteDraft.trim()
    if (!text) return
    addNote(lead.id, text)
    setNoteDraft('')
  }

  const isActiveContract = lead.pipeline_status === 'Active Contract'

  return (
    <div className="page">
      <button className="btn btn-ghost back-btn" onClick={onBack}>
        ← Back to pipeline
      </button>

      <h2 className="detail-title">{lead.business_name}</h2>

      <div className="detail-grid">
        <label className="field">
          <span>Status</span>
          <select
            value={lead.pipeline_status}
            style={{ borderLeft: `6px solid ${STATUS_COLORS[lead.pipeline_status]}` }}
            onChange={(e) => updateLead(lead.id, { pipeline_status: e.target.value })}
          >
            {PIPELINE_STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Latest call outcome</span>
          <select
            value={lead.call_outcome || ''}
            onChange={(e) => updateLead(lead.id, { call_outcome: e.target.value || null })}
          >
            <option value="">—</option>
            {CALL_OUTCOMES.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Category</span>
          <input
            value={lead.category || ''}
            onChange={(e) => updateLead(lead.id, { category: e.target.value })}
            placeholder="e.g. Coffee shop"
          />
        </label>

        <label className="field">
          <span>Phone</span>
          <input
            value={lead.phone || ''}
            type="tel"
            onChange={(e) => updateLead(lead.id, { phone: e.target.value })}
          />
        </label>

        <label className="field">
          <span>Owner</span>
          <select
            value={lead.owner}
            onChange={(e) => updateLead(lead.id, { owner: e.target.value })}
          >
            <option>Ricky</option>
            <option>Mac</option>
          </select>
        </label>

        <label className="field">
          <span>Follow-up date</span>
          <input
            type="date"
            value={lead.follow_up_date || ''}
            onChange={(e) => updateLead(lead.id, { follow_up_date: e.target.value || null })}
          />
        </label>

        <label className="field">
          <span>Proposal sent</span>
          <input
            type="date"
            value={lead.proposal_sent_date || ''}
            onChange={(e) => updateLead(lead.id, { proposal_sent_date: e.target.value || null })}
          />
        </label>
      </div>

      <div className="modules">
        <span className="section-label">Modules</span>
        <div className="module-chips">
          {MODULES.map((m) => (
            <button
              key={m}
              className={lead.modules_selected.includes(m) ? 'chip selected' : 'chip'}
              onClick={() => toggleModule(m)}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {isActiveContract && (
        <div className="contract-box">
          <span className="section-label">Contract timeline</span>
          <label className="field">
            <span>Contract signed</span>
            <input
              type="date"
              value={lead.contract_signed_date || ''}
              onChange={(e) => updateLead(lead.id, { contract_signed_date: e.target.value || null })}
            />
          </label>
          <label className="field checkbox-field">
            <input
              type="checkbox"
              checked={lead.deposit_collected}
              onChange={(e) => updateLead(lead.id, { deposit_collected: e.target.checked })}
            />
            <span>Deposit collected</span>
          </label>
          <label className="field">
            <span>Delivery target</span>
            <input
              type="date"
              value={lead.delivery_target_date || ''}
              onChange={(e) => updateLead(lead.id, { delivery_target_date: e.target.value || null })}
            />
          </label>
          <label className="field">
            <span>Launch date</span>
            <input
              type="date"
              value={lead.launch_date || ''}
              onChange={(e) => updateLead(lead.id, { launch_date: e.target.value || null })}
            />
          </label>
        </div>
      )}

      <div className="notes">
        <span className="section-label">Notes</span>
        <form className="quick-add" onSubmit={submitNote}>
          <input
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            placeholder="Add a note…"
          />
          <button className="btn" type="submit" disabled={!noteDraft.trim()}>
            Add
          </button>
        </form>
        {lead.notes.length === 0 && <p className="empty">No notes yet.</p>}
        {lead.notes.map((n, i) => (
          <div key={i} className="feed-item">
            <div className="feed-meta">
              <span className={`author author-${n.by.toLowerCase()}`}>{n.by}</span>
              <span className="timestamp">{fmtDateTime(n.at)}</span>
            </div>
            <p>{n.text}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
