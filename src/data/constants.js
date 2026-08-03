// Shared vocabulary for the whole app. Keep these as the single source of truth —
// the Supabase schema will mirror these values later.

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

export const STATUS_COLORS = {
  'To Call': '#6b7280', // gray
  'Contacted': '#0ea5e9', // sky
  'Warm': '#eab308', // yellow
  'Proposal Sent': '#3b82f6', // blue
  'Follow-Up': '#f97316', // orange
  'Active Contract': '#8b5cf6', // purple
  'Closed Won': '#22c55e', // green
  'Dead': '#ef4444', // red
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

export const CHECKLIST_ITEMS = [
  'Opener delivered',
  'Asked whether they have a current website',
  'Identified interest (no site / POS-ordering / texting)',
  'Gave relevant pricing',
  'Objection handled (if budget pushback came up)',
  'Asked for email / offered to send proposal',
  'Outcome logged',
]
