import { useState } from 'react'
import { useStore, fmtDateTime } from '../data/store'
import {
  PIPELINE_STATUSES,
  STATUS_COLORS,
  STATUS_EMOJI,
  MODULES,
  MODULE_PRICES,
  RECURRING_MODULES,
  CALL_OUTCOMES,
  leadValue,
  leadMonthly,
  fmtMoney,
} from '../data/constants'

export default function LeadDetail({ lead, onBack }) {
  const { updateLead, addNote, postActivity } = useStore()
  const [noteDraft, setNoteDraft] = useState('')

  function changeStatus(status) {
    updateLead(lead.id, { pipeline_status: status })
    // Celebrate wins in the shared feed so the other person sees it instantly.
    if (status === 'Closed Won' && lead.pipeline_status !== 'Closed Won') {
      postActivity(`🎉 Closed Won: ${lead.business_name}!`, lead.id)
    }
  }

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
            onChange={(e) => changeStatus(e.target.value)}
          >
            {PIPELINE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_EMOJI[s]} {s}
              </option>
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
          {MODULES.map((m) => {
            const price = MODULE_PRICES[m]
              ? fmtMoney(MODULE_PRICES[m])
              : `${fmtMoney(RECURRING_MODULES[m])}/mo`
            return (
              <button
                key={m}
                className={lead.modules_selected.includes(m) ? 'chip selected' : 'chip'}
                onClick={() => toggleModule(m)}
              >
                {m} · {price}
              </button>
            )
          })}
        </div>
      </div>

      <div className="money-box">
        <span className="section-label">💰 Deal value</span>
        <div className="deal-value-row">
          <span className="deal-value">{fmtMoney(leadValue(lead))}</span>
          {leadMonthly(lead) > 0 && (
            <span className="deal-monthly">+{fmtMoney(leadMonthly(lead))}/mo</span>
          )}
        </div>
        <div className="detail-grid">
          <label className="field">
            <span>Custom price (overrides modules)</span>
            <input
              type="number"
              inputMode="numeric"
              value={lead.custom_value ?? ''}
              placeholder="Auto from modules"
              onChange={(e) =>
                updateLead(lead.id, {
                  custom_value: e.target.value === '' ? null : Number(e.target.value),
                })
              }
            />
          </label>
          <label className="field">
            <span>Collected so far</span>
            <input
              type="number"
              inputMode="numeric"
              value={lead.amount_paid || ''}
              placeholder="0"
              onChange={(e) =>
                updateLead(lead.id, { amount_paid: Number(e.target.value || 0) })
              }
            />
          </label>
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
