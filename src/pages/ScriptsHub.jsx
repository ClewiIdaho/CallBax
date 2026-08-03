import { useEffect, useState } from 'react'
import { useStore } from '../data/store'
import { SCRIPTS } from '../data/scripts'
import { CHECKLIST_ITEMS } from '../data/constants'
import CallMode from './CallMode'

const QUICK_OUTCOMES = ['No Answer', 'Not Interested', 'Interested', 'Discovery Scheduled']

function ScriptSection({ section, businessName }) {
  const [open, setOpen] = useState(!section.collapsible)
  const text = section.text.replaceAll('[Business Name]', businessName || '[Business Name]')

  if (!section.collapsible) {
    return (
      <div className="script-section">
        <div className="script-title">{section.title}</div>
        <p className="script-text">{text}</p>
      </div>
    )
  }
  return (
    <div className="script-section">
      <button className="script-toggle" onClick={() => setOpen(!open)}>
        <span className="script-title">{section.title}</span>
        <span>{open ? '▾' : '▸'}</span>
      </button>
      {open && <p className="script-text">{text}</p>}
    </div>
  )
}

export default function ScriptsHub({ initialBusiness = '', onConsumedInitial }) {
  const { leads, currentUser, addLead, updateLead, logCall, postActivity } = useStore()
  const [businessInput, setBusinessInput] = useState(initialBusiness)
  const [scriptUser, setScriptUser] = useState(currentUser || 'Ricky')
  const [checked, setChecked] = useState({})
  const [pickerOpen, setPickerOpen] = useState(false)
  // Arriving via Discover's "Call now" drops straight into guided call mode.
  const [callModeOpen, setCallModeOpen] = useState(!!initialBusiness)

  useEffect(() => {
    if (initialBusiness) onConsumedInitial?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const matchedLead = leads.find(
    (l) => l.business_name.toLowerCase() === businessInput.trim().toLowerCase()
  )

  const script = SCRIPTS[scriptUser]
  const phone = matchedLead?.phone || ''
  const telHref = phone ? 'tel:' + phone.replace(/[^+\d]/g, '') : null

  function toggleItem(item) {
    // "Outcome logged" opens the outcome picker instead of just checking a box.
    if (item === 'Outcome logged' && !checked[item]) {
      setPickerOpen(true)
      return
    }
    setChecked((c) => ({ ...c, [item]: !c[item] }))
  }

  async function logOutcome(outcome) {
    const name = businessInput.trim()
    if (!name) {
      alert('Type the business name at the top first.')
      setPickerOpen(false)
      return false
    }

    // Write to the existing lead, or create one on the spot — no double entry.
    let lead = matchedLead
    if (!lead) {
      lead = await addLead({ business_name: name })
      if (!lead) return false
    }
    const newChecked = { ...checked, 'Outcome logged': true }
    updateLead(lead.id, {
      call_outcome: outcome,
      // A logged call means the lead is no longer untouched.
      ...(lead.pipeline_status === 'To Call' ? { pipeline_status: 'Contacted' } : {}),
    })
    logCall({ leadId: lead.id, outcome, checklistState: newChecked })
    postActivity(`Called ${name} — ${outcome}`, lead.id)
    setChecked(newChecked)
    setPickerOpen(false)
    return true
  }

  function resetCall() {
    setChecked({})
    setBusinessInput('')
    setPickerOpen(false)
  }

  if (callModeOpen) {
    return (
      <CallMode
        script={script}
        businessName={businessInput.trim()}
        phone={phone}
        setChecked={setChecked}
        onLogOutcome={logOutcome}
        onClose={() => setCallModeOpen(false)}
        onNextCall={() => {
          resetCall()
          setCallModeOpen(false)
        }}
      />
    )
  }

  return (
    <div className="page">
      <input
        className="business-input"
        value={businessInput}
        onChange={(e) => setBusinessInput(e.target.value)}
        placeholder="Business name…"
        list="lead-names"
      />
      <datalist id="lead-names">
        {leads.map((l) => (
          <option key={l.id} value={l.business_name} />
        ))}
      </datalist>

      {matchedLead && (
        <div className="matched-lead">
          <strong>{matchedLead.business_name}</strong>
          {matchedLead.category && <span> · {matchedLead.category}</span>}
          <span> · {matchedLead.pipeline_status}</span>
          {matchedLead.notes[0] && (
            <p className="matched-note">Last note: {matchedLead.notes[0].text}</p>
          )}
        </div>
      )}

      <div className="call-row">
        {telHref && (
          <a className="call-banner" href={telHref}>
            📞 Call {phone}
          </a>
        )}
        <button
          className="btn btn-big start-call-btn"
          onClick={() => setCallModeOpen(true)}
        >
          ▶ Start call mode
        </button>
      </div>

      <div className="script-switch">
        {Object.entries(SCRIPTS).map(([key, s]) => (
          <button
            key={key}
            className={scriptUser === key ? 'view-tab active' : 'view-tab'}
            onClick={() => setScriptUser(key)}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="script">
        {script.sections.map((s) => (
          <ScriptSection key={s.title} section={s} businessName={businessInput.trim()} />
        ))}
      </div>

      <div className="checklist">
        <span className="section-label">Active call checklist</span>
        {CHECKLIST_ITEMS.map((item) => (
          <button
            key={item}
            className={checked[item] ? 'check-item done' : 'check-item'}
            onClick={() => toggleItem(item)}
          >
            <span className="checkbox">{checked[item] ? '✓' : ''}</span>
            <span>{item}</span>
          </button>
        ))}
        <button className="btn btn-ghost" onClick={resetCall}>
          Reset for next call
        </button>
      </div>

      {pickerOpen && (
        <div className="outcome-overlay" onClick={() => setPickerOpen(false)}>
          <div className="outcome-sheet" onClick={(e) => e.stopPropagation()}>
            <p className="sheet-title">
              Outcome for <strong>{businessInput.trim() || '…'}</strong>
            </p>
            {QUICK_OUTCOMES.map((o) => (
              <button key={o} className="btn btn-big" onClick={() => logOutcome(o)}>
                {o}
              </button>
            ))}
            <button className="btn btn-ghost" onClick={() => setPickerOpen(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
