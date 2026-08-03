// Local data store. Everything is held in React state and mirrored to
// localStorage so the app works fully offline for now. When Supabase gets
// wired in, the action functions below keep the same names/shapes and the
// components don't change.

import { createContext, useContext, useEffect, useState } from 'react'
import { SEED_LEADS, SEED_CALL_LOG, SEED_ACTIVITY } from './seed'

const STORAGE_KEY = 'callbax-local-v1'
const USER_KEY = 'callbax-user'

const StoreContext = createContext(null)

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function loadInitial() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    // corrupted storage — fall back to seed data
  }
  return { leads: SEED_LEADS, callLog: SEED_CALL_LOG, activity: SEED_ACTIVITY }
}

export function StoreProvider({ children }) {
  const [data, setData] = useState(loadInitial)
  const [currentUser, setCurrentUserState] = useState(
    () => localStorage.getItem(USER_KEY) || null
  )

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }, [data])

  function setCurrentUser(name) {
    setCurrentUserState(name)
    localStorage.setItem(USER_KEY, name)
  }

  // ---- leads ----

  function addLead(fields) {
    const now = new Date().toISOString()
    const lead = {
      id: newId(),
      business_name: '',
      category: '',
      phone: '',
      owner: currentUser || 'Ricky',
      pipeline_status: 'To Call',
      call_outcome: null,
      modules_selected: [],
      notes: [],
      proposal_sent_date: null,
      follow_up_date: null,
      contract_signed_date: null,
      deposit_collected: false,
      delivery_target_date: null,
      launch_date: null,
      created_at: now,
      updated_at: now,
      ...fields,
    }
    setData((d) => ({ ...d, leads: [lead, ...d.leads] }))
    return lead
  }

  function updateLead(id, fields) {
    setData((d) => ({
      ...d,
      leads: d.leads.map((l) =>
        l.id === id ? { ...l, ...fields, updated_at: new Date().toISOString() } : l
      ),
    }))
  }

  function addNote(leadId, text) {
    const note = { at: new Date().toISOString(), by: currentUser || 'Ricky', text }
    setData((d) => ({
      ...d,
      leads: d.leads.map((l) =>
        l.id === leadId
          ? { ...l, notes: [note, ...l.notes], updated_at: note.at }
          : l
      ),
    }))
  }

  // ---- call log ----

  function logCall({ leadId, outcome, note, checklistState }) {
    const entry = {
      id: newId(),
      lead_id: leadId,
      caller: currentUser || 'Ricky',
      outcome,
      note: note || '',
      checklist_state: checklistState || {},
      at: new Date().toISOString(),
    }
    setData((d) => ({ ...d, callLog: [entry, ...d.callLog] }))
    return entry
  }

  // ---- activity feed ----

  function postActivity(message, relatedLeadId = null) {
    const entry = {
      id: newId(),
      author: currentUser || 'Ricky',
      message,
      related_lead_id: relatedLeadId,
      at: new Date().toISOString(),
    }
    setData((d) => ({ ...d, activity: [entry, ...d.activity] }))
    return entry
  }

  const value = {
    leads: data.leads,
    callLog: data.callLog,
    activity: data.activity,
    currentUser,
    setCurrentUser,
    addLead,
    updateLead,
    addNote,
    logCall,
    postActivity,
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used inside StoreProvider')
  return ctx
}

// ---- small date helpers used across hubs ----

export function fmtDate(iso) {
  if (!iso) return ''
  const d = new Date(iso.length === 10 ? iso + 'T00:00:00' : iso)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function fmtDateTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function todayStr() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function isOverdue(dateStr) {
  return !!dateStr && dateStr < todayStr()
}

export function isDueToday(dateStr) {
  return !!dateStr && dateStr === todayStr()
}

export function isThisWeek(iso) {
  if (!iso) return false
  const now = new Date()
  const day = (now.getDay() + 6) % 7 // Monday = 0
  const monday = new Date(now)
  monday.setHours(0, 0, 0, 0)
  monday.setDate(now.getDate() - day)
  return new Date(iso) >= monday
}
