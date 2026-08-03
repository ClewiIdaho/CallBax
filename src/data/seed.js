// Placeholder sample data so the app has something to look at before Supabase
// is wired in. Safe to clear — everything lives in localStorage for now.

function daysFromNow(days) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10) // YYYY-MM-DD
}

function hoursAgo(hours) {
  return new Date(Date.now() - hours * 3600 * 1000).toISOString()
}

export const SEED_LEADS = [
  {
    id: 'seed-1',
    business_name: 'Java House',
    category: 'Coffee shop',
    phone: '(208) 555-0141',
    owner: 'Ricky',
    pipeline_status: 'Follow-Up',
    call_outcome: 'No Answer',
    modules_selected: [],
    notes: [
      { at: hoursAgo(50), by: 'Ricky', text: 'No answer, retry Thursday.' },
    ],
    proposal_sent_date: null,
    follow_up_date: daysFromNow(0),
    contract_signed_date: null,
    deposit_collected: false,
    delivery_target_date: null,
    launch_date: null,
    created_at: hoursAgo(72),
    updated_at: hoursAgo(50),
  },
  {
    id: 'seed-2',
    business_name: 'Boise Barber Co',
    category: 'Barbershop',
    phone: '(208) 555-0177',
    owner: 'Mac',
    pipeline_status: 'Warm',
    call_outcome: 'Interested',
    modules_selected: ['Core Website'],
    notes: [
      { at: hoursAgo(30), by: 'Mac', text: 'Owner interested, no current site. Wants to see examples.' },
    ],
    proposal_sent_date: null,
    follow_up_date: daysFromNow(2),
    contract_signed_date: null,
    deposit_collected: false,
    delivery_target_date: null,
    launch_date: null,
    created_at: hoursAgo(80),
    updated_at: hoursAgo(30),
  },
  {
    id: 'seed-3',
    business_name: 'Hyde Park Deli',
    category: 'Deli',
    phone: '(208) 555-0132',
    owner: 'Ricky',
    pipeline_status: 'Proposal Sent',
    call_outcome: 'Discovery Scheduled',
    modules_selected: ['Core Website', 'Automated Texting'],
    notes: [
      { at: hoursAgo(20), by: 'Ricky', text: 'Sent proposal with website + texting add-on.' },
    ],
    proposal_sent_date: daysFromNow(-1),
    follow_up_date: daysFromNow(4),
    contract_signed_date: null,
    deposit_collected: false,
    delivery_target_date: null,
    launch_date: null,
    created_at: hoursAgo(120),
    updated_at: hoursAgo(20),
  },
  {
    id: 'seed-4',
    business_name: 'State Street Cycles',
    category: 'Bike shop',
    phone: '(208) 555-0119',
    owner: 'Mac',
    pipeline_status: 'Active Contract',
    call_outcome: 'Interested',
    modules_selected: ['Core Website', 'POS Integration'],
    notes: [
      { at: hoursAgo(100), by: 'Mac', text: 'Signed! Square POS. Deposit collected.' },
    ],
    proposal_sent_date: daysFromNow(-10),
    follow_up_date: null,
    contract_signed_date: daysFromNow(-5),
    deposit_collected: true,
    delivery_target_date: daysFromNow(14),
    launch_date: null,
    created_at: hoursAgo(300),
    updated_at: hoursAgo(100),
  },
  {
    id: 'seed-5',
    business_name: 'Vista Flowers',
    category: 'Florist',
    phone: '(208) 555-0102',
    owner: 'Ricky',
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
    created_at: hoursAgo(10),
    updated_at: hoursAgo(10),
  },
  {
    id: 'seed-6',
    business_name: 'Overland Tacos',
    category: 'Restaurant',
    phone: '(208) 555-0163',
    owner: 'Mac',
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
    created_at: hoursAgo(8),
    updated_at: hoursAgo(8),
  },
]

export const SEED_CALL_LOG = [
  {
    id: 'seedcall-1',
    lead_id: 'seed-1',
    caller: 'Ricky',
    outcome: 'No Answer',
    note: 'Rang out, no voicemail.',
    checklist_state: {},
    at: hoursAgo(50),
  },
  {
    id: 'seedcall-2',
    lead_id: 'seed-2',
    caller: 'Mac',
    outcome: 'Interested',
    note: 'Good convo, wants examples.',
    checklist_state: {},
    at: hoursAgo(30),
  },
]

export const SEED_ACTIVITY = [
  {
    id: 'seedact-1',
    author: 'Mac',
    message: 'Boise Barber Co is warm — owner wants example sites before committing.',
    related_lead_id: 'seed-2',
    at: hoursAgo(30),
  },
  {
    id: 'seedact-2',
    author: 'Ricky',
    message: 'Called Java House, no answer, retry Thursday.',
    related_lead_id: 'seed-1',
    at: hoursAgo(50),
  },
]
