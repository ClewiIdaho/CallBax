// Supabase-backed data store. All three tables load on sign-in, and realtime
// subscriptions keep both phones in sync without manual refresh. Writes are
// applied to local state immediately so the UI feels instant; the realtime
// echo reconciles anything that raced.

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, TEAM_EMAIL } from './supabase'

const USER_KEY = 'callbax-user'

const StoreContext = createContext(null)

function applyChange(setter, payload) {
  if (payload.eventType === 'INSERT') {
    setter((rows) =>
      rows.some((r) => r.id === payload.new.id) ? rows : [payload.new, ...rows]
    )
  } else if (payload.eventType === 'UPDATE') {
    setter((rows) => rows.map((r) => (r.id === payload.new.id ? payload.new : r)))
  } else if (payload.eventType === 'DELETE') {
    setter((rows) => rows.filter((r) => r.id !== payload.old.id))
  }
}

export function StoreProvider({ children }) {
  const [session, setSession] = useState(undefined) // undefined = still checking
  const [leads, setLeads] = useState([])
  const [callLog, setCallLog] = useState([])
  const [activity, setActivity] = useState([])
  const [currentUser, setCurrentUserState] = useState(
    () => localStorage.getItem(USER_KEY) || null
  )

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) return
    let cancelled = false

    async function fetchAll() {
      const [l, c, a] = await Promise.all([
        supabase.from('leads').select('*').order('created_at', { ascending: false }),
        supabase.from('call_log').select('*').order('at', { ascending: false }),
        supabase.from('activity_feed').select('*').order('at', { ascending: false }),
      ])
      if (cancelled) return
      if (l.data) setLeads(l.data)
      if (c.data) setCallLog(c.data)
      if (a.data) setActivity(a.data)
    }
    fetchAll()

    const channel = supabase
      .channel('callbax-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, (p) =>
        applyChange(setLeads, p)
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'call_log' }, (p) =>
        applyChange(setCallLog, p)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'activity_feed' },
        (p) => applyChange(setActivity, p)
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [session])

  function setCurrentUser(name) {
    setCurrentUserState(name)
    localStorage.setItem(USER_KEY, name)
  }

  async function login(password) {
    const { error } = await supabase.auth.signInWithPassword({
      email: TEAM_EMAIL,
      password,
    })
    return error ? error.message : null
  }

  function logout() {
    supabase.auth.signOut()
  }

  // ---- leads ----

  async function addLead(fields) {
    const { data, error } = await supabase
      .from('leads')
      .insert({ owner: currentUser || 'Ricky', ...fields })
      .select()
      .single()
    if (error) {
      alert(`Couldn't save: ${error.message}`)
      return null
    }
    applyChange(setLeads, { eventType: 'INSERT', new: data })
    return data
  }

  async function updateLead(id, fields) {
    setLeads((rows) => rows.map((r) => (r.id === id ? { ...r, ...fields } : r)))
    const { error } = await supabase.from('leads').update(fields).eq('id', id)
    if (error) alert(`Save failed: ${error.message}`)
  }

  async function addNote(leadId, text) {
    const lead = leads.find((l) => l.id === leadId)
    if (!lead) return
    const note = { at: new Date().toISOString(), by: currentUser || 'Ricky', text }
    await updateLead(leadId, { notes: [note, ...(lead.notes || [])] })
  }

  // ---- call log ----

  async function logCall({ leadId, outcome, note, checklistState }) {
    const { data, error } = await supabase
      .from('call_log')
      .insert({
        lead_id: leadId,
        caller: currentUser || 'Ricky',
        outcome,
        note: note || '',
        checklist_state: checklistState || {},
      })
      .select()
      .single()
    if (error) {
      alert(`Couldn't log call: ${error.message}`)
      return null
    }
    applyChange(setCallLog, { eventType: 'INSERT', new: data })
    return data
  }

  // ---- activity feed ----

  async function postActivity(message, relatedLeadId = null) {
    const { data, error } = await supabase
      .from('activity_feed')
      .insert({
        author: currentUser || 'Ricky',
        message,
        related_lead_id: relatedLeadId,
      })
      .select()
      .single()
    if (error) {
      alert(`Couldn't post: ${error.message}`)
      return null
    }
    applyChange(setActivity, { eventType: 'INSERT', new: data })
    return data
  }

  const value = {
    session,
    login,
    logout,
    leads,
    callLog,
    activity,
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
