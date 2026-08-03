import { useState } from 'react'
import { useStore } from './data/store'
import { USERS } from './data/constants'
import HomeHub from './pages/HomeHub'
import WorkflowHub from './pages/WorkflowHub'
import ScriptsHub from './pages/ScriptsHub'
import DiscoverHub from './pages/DiscoverHub'

const TABS = [
  { key: 'home', label: 'Home', icon: '🏠' },
  { key: 'workflow', label: 'Workflow', icon: '📋' },
  { key: 'scripts', label: 'Scripts', icon: '📞' },
  { key: 'discover', label: 'Discover', icon: '🧭' },
]

function LoginScreen() {
  const { login } = useStore()
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const err = await login(password)
    setBusy(false)
    if (err) setError(err)
  }

  return (
    <div className="user-picker">
      <h1 className="brand">CallBax</h1>
      <p>Enter the team password</p>
      <form className="user-picker-buttons" onSubmit={submit}>
        <input
          className="business-input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoFocus
        />
        <button className="btn btn-big" type="submit" disabled={busy || !password}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        {error && <p className="login-error">{error}</p>}
      </form>
    </div>
  )
}

export default function App() {
  const { session, currentUser, setCurrentUser } = useStore()
  const [tab, setTab] = useState('home')
  // Set by Discover's "Call now" so the Scripts hub opens pre-filled.
  const [scriptBusiness, setScriptBusiness] = useState('')

  if (session === undefined) {
    return (
      <div className="user-picker">
        <h1 className="brand">CallBax</h1>
        <p>Loading…</p>
      </div>
    )
  }

  if (!session) {
    return <LoginScreen />
  }

  // First open: pick who you are. One tap, remembered forever.
  if (!currentUser) {
    return (
      <div className="user-picker">
        <h1 className="brand">CallBax</h1>
        <p>Who's this?</p>
        <div className="user-picker-buttons">
          {USERS.map((u) => (
            <button key={u} className="btn btn-big" onClick={() => setCurrentUser(u)}>
              {u}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="topbar">
        <span className="brand">CallBax</span>
        <button
          className="user-switch"
          title="Switch user"
          onClick={() => {
            const other = USERS.find((u) => u !== currentUser)
            if (confirm(`Switch to ${other}?`)) setCurrentUser(other)
          }}
        >
          {currentUser}
        </button>
      </header>

      <main className="content">
        {tab === 'home' && <HomeHub />}
        {tab === 'workflow' && <WorkflowHub />}
        {tab === 'scripts' && <ScriptsHub initialBusiness={scriptBusiness} />}
        {tab === 'discover' && (
          <DiscoverHub
            onCallNow={(name) => {
              setScriptBusiness(name)
              setTab('scripts')
            }}
          />
        )}
      </main>

      <nav className="bottom-nav">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={tab === t.key ? 'nav-btn active' : 'nav-btn'}
            onClick={() => setTab(t.key)}
          >
            <span className="nav-icon">{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
