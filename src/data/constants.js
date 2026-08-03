// Shared vocabulary for the whole app. Keep these as the single source of truth —
// the Supabase schema mirrors these values.

export const USERS = ['Ricky', 'Mac']

export const PIPELINE_STATUSES = [
  'To Call',
  'Contacted',
  'Warm',
  'Proposal Sent',
  'Follow-Up',
  'Active Contract',
  'Closed Won',
  'Dead',
]

// Solid pill backgrounds chosen so white text passes contrast in both themes.
export const STATUS_COLORS = {
  'To Call': '#6b7280', // gray
  'Contacted': '#0284c7', // sky
  'Warm': '#b45309', // amber
  'Proposal Sent': '#2563eb', // blue
  'Follow-Up': '#c2410c', // orange
  'Active Contract': '#7c3aed', // purple
  'Closed Won': '#15803d', // green
  'Dead': '#dc2626', // red
}

export const STATUS_EMOJI = {
  'To Call': '📞',
  'Contacted': '🗣️',
  'Warm': '🔥',
  'Proposal Sent': '📨',
  'Follow-Up': '⏰',
  'Active Contract': '🛠️',
  'Closed Won': '🏆',
  'Dead': '💀',
}

export const CALL_OUTCOMES = [
  'No Answer',
  'Not Interested',
  'Interested',
  'Discovery Scheduled',
  'No Response',
]

export const MODULES = [
  'Core Website',
  'POS Integration',
  'Automated Texting',
  'Growth Support',
  'DIY Training',
]

// One-time build prices. Growth Support is monthly recurring, so it's tracked
// separately from one-time deal value.
export const MODULE_PRICES = {
  'Core Website': 500,
  'POS Integration': 2000,
  'Automated Texting': 500,
  'DIY Training': 300,
}

export const RECURRING_MODULES = {
  'Growth Support': 200, // $/month
}

export const CHECKLIST_ITEMS = [
  'Opener delivered',
  'Asked whether they have a current website',
  'Identified interest (no site / POS-ordering / texting)',
  'Gave relevant pricing',
  'Objection handled (if budget pushback came up)',
  'Asked for email / offered to send proposal',
  'Outcome logged',
]

// ---- money helpers ----

// A lead's one-time deal value: custom override wins, else sum of module prices.
export function leadValue(lead) {
  if (lead.custom_value != null && lead.custom_value !== '') {
    return Number(lead.custom_value)
  }
  return (lead.modules_selected || []).reduce(
    (sum, m) => sum + (MODULE_PRICES[m] || 0),
    0
  )
}

export function leadMonthly(lead) {
  return (lead.modules_selected || []).reduce(
    (sum, m) => sum + (RECURRING_MODULES[m] || 0),
    0
  )
}

export function fmtMoney(n) {
  return '$' + Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })
}
