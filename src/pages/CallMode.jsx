// Guided call mode: full-screen, one script card at a time with big buttons,
// so you can run the whole call with your thumb. Each step auto-checks the
// matching item in the call checklist.

import { useState } from 'react'

const STEPS = ['opener', 'branch', 'pitch', 'close', 'outcome', 'done']
const BRANCH_EMOJI = ['🚫', '🛒', '💬']
const OUTCOMES = ['No Answer', 'Not Interested', 'Interested', 'Discovery Scheduled']

export default function CallMode({
  script,
  businessName,
  phone,
  setChecked,
  onLogOutcome,
  onClose,
  onNextCall,
}) {
  const [step, setStep] = useState('opener')
  const [pitchIdx, setPitchIdx] = useState(0)
  const [showObjection, setShowObjection] = useState(false)
  const [loggedOutcome, setLoggedOutcome] = useState(null)
  const [logging, setLogging] = useState(false)

  const sections = script.sections
  const opener = sections.find((s) => s.title === 'Opener')
  const ifYes = sections.find((s) => s.title === 'If yes')
  const pitches = sections.filter((s) => s.title.startsWith('Pitch'))
  const closeSection = sections.find((s) => s.title === 'Close')
  const objection = sections.find(
    (s) => s.title.startsWith('If ') && s.title !== 'If yes'
  )

  const fill = (text) =>
    text.replaceAll('[Business Name]', businessName || '[Business Name]')

  const check = (...items) =>
    setChecked((c) => {
      const next = { ...c }
      items.forEach((i) => (next[i] = true))
      return next
    })

  async function pickOutcome(outcome) {
    setLogging(true)
    const ok = await onLogOutcome(outcome)
    setLogging(false)
    if (ok) {
      setLoggedOutcome(outcome)
      setStep('done')
    }
  }

  const stepIdx = STEPS.indexOf(step)
  const telHref = phone ? 'tel:' + phone.replace(/[^+\d]/g, '') : null

  return (
    <div className="callmode">
      <div className="callmode-header">
        <button className="callmode-close" onClick={onClose} aria-label="Exit call mode">
          ✕
        </button>
        <div className="callmode-biz">{businessName || 'New call'}</div>
        {telHref ? (
          <a className="callmode-dial" href={telHref}>
            📞
          </a>
        ) : (
          <span className="callmode-dial-placeholder" />
        )}
      </div>

      <div className="callmode-dots">
        {STEPS.slice(0, 5).map((s, i) => (
          <span key={s} className={i <= Math.min(stepIdx, 4) ? 'dot on' : 'dot'} />
        ))}
      </div>

      <div className="callmode-body">
        {step === 'opener' && (
          <>
            <div className="callmode-label">Opener</div>
            <p className="callmode-text">{fill(opener.text)}</p>
            <div className="callmode-actions">
              <button
                className="btn btn-big"
                onClick={() => {
                  check('Opener delivered')
                  setStep('branch')
                }}
              >
                They're listening →
              </button>
            </div>
          </>
        )}

        {step === 'branch' && (
          <>
            <div className="callmode-label">Ask about their website</div>
            <p className="callmode-text">{fill(ifYes.text)}</p>
            <div className="callmode-actions">
              {pitches.map((p, i) => (
                <button
                  key={p.title}
                  className="btn btn-big branch-btn"
                  onClick={() => {
                    check(
                      'Asked whether they have a current website',
                      'Identified interest (no site / POS-ordering / texting)'
                    )
                    setPitchIdx(i)
                    setStep('pitch')
                  }}
                >
                  {BRANCH_EMOJI[i] || '▪️'} {p.title.replace(/^Pitch: /, '')}
                </button>
              ))}
              <button
                className="btn btn-ghost"
                onClick={() => {
                  check('Asked whether they have a current website')
                  setStep('close')
                }}
              >
                Skip to close
              </button>
            </div>
          </>
        )}

        {step === 'pitch' && (
          <>
            <div className="callmode-label">
              {pitches[pitchIdx].title.replace(/^Pitch: /, '')}
            </div>
            <p className="callmode-text">{fill(pitches[pitchIdx].text)}</p>
            {showObjection && objection && (
              <>
                <div className="callmode-label objection">{objection.title}</div>
                <p className="callmode-text">{fill(objection.text)}</p>
              </>
            )}
            <div className="callmode-actions">
              {!showObjection && objection && (
                <button
                  className="btn btn-ghost"
                  onClick={() => {
                    check('Objection handled (if budget pushback came up)')
                    setShowObjection(true)
                  }}
                >
                  💰 Budget pushback
                </button>
              )}
              <button
                className="btn btn-big"
                onClick={() => {
                  check('Gave relevant pricing')
                  setStep('close')
                }}
              >
                Go to close →
              </button>
            </div>
          </>
        )}

        {step === 'close' && (
          <>
            <div className="callmode-label">Close — ask for their email</div>
            <p className="callmode-text">{fill(closeSection.text)}</p>
            <div className="callmode-actions">
              <button
                className="btn btn-big"
                onClick={() => {
                  check('Asked for email / offered to send proposal')
                  setStep('outcome')
                }}
              >
                📝 Log outcome
              </button>
            </div>
          </>
        )}

        {step === 'outcome' && (
          <>
            <div className="callmode-label">How did it go?</div>
            <div className="callmode-actions">
              {OUTCOMES.map((o) => (
                <button
                  key={o}
                  className="btn btn-big"
                  disabled={logging}
                  onClick={() => pickOutcome(o)}
                >
                  {o}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 'done' && (
          <>
            <div className="callmode-done">🎉</div>
            <div className="callmode-label">
              {loggedOutcome} logged for {businessName}
            </div>
            <div className="callmode-actions">
              <button className="btn btn-big" onClick={onNextCall}>
                Next call
              </button>
              <button className="btn btn-ghost" onClick={onClose}>
                Back to scripts
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
