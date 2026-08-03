// Builds the proposal email from the lead's selected modules — a plain-text
// version of the one-page PDF proposal. Opens in the phone's mail app via
// mailto: with everything pre-filled, so sending takes one tap.

import { leadValue, leadMonthly, fmtMoney } from './constants'

const MODULE_LINES = {
  'Core Website': `— Core Website ($500): a finished, mobile-optimized website on your own domain — real hosting, not a demo link. Product pages, hours, location, and brand presence, live and stable.`,
  'POS Integration': `— POS Integration & Rewards ($2,000, final price confirmed after a short discovery call): live inventory shown on the site, pulled directly from your register, plus pickup orders that route into your existing system — no second, duplicate points program.`,
  'Automated Texting': `— Automated Texting ($500): order-ready texts to customers and instant alerts to staff, plus the required business text registration.`,
  'Growth Support': `— Growth Support ($200/mo, ongoing & optional): monthly maintenance plus win-back offers, new-product alerts, and review-request campaigns to your customer list.`,
  'DIY Training': `— DIY Platform Training ($300 flat): I'll walk you through Wix so you can build and manage the site yourself going forward — no ongoing developer needed.`,
}

const SENDERS = {
  Ricky: { name: 'Charles Lewis', line: 'Charles Lewis · Web Development & Business Automation' },
  Mac: { name: 'Mac', line: 'Mac · Web Development & Business Automation' },
}

const CONTACT = 'clewisidaho@gmail.com · (208) 867-2478'

export function buildProposalEmail(lead, currentUser) {
  const sender = SENDERS[currentUser] || SENDERS.Ricky
  const biz = lead.business_name
  const modules = lead.modules_selected || []
  const oneTime = leadValue(lead)
  const monthly = leadMonthly(lead)

  const moduleText = modules.length
    ? modules.map((m) => MODULE_LINES[m]).filter(Boolean).join('\n\n')
    : Object.values(MODULE_LINES).join('\n\n')

  const totalLine = modules.length
    ? `Your selection comes to ${fmtMoney(oneTime)}${monthly ? ` plus ${fmtMoney(monthly)}/mo for Growth Support` : ''}.`
    : `Everything is modular — pick only what you want running.`

  const subject = `Website & Automation Proposal — ${biz}`

  const body = `Hi,

Great talking with you today. As promised, here's the short proposal for ${biz} — no pressure, look it over whenever works.

WHAT'S ON THE TABLE

${moduleText}

${totalLine}

THE IMPORTANT PARTS

— Delivery: up to 3 weeks from signed deposit (a website alone usually ships faster).
— Deposit: 50% to begin work, remaining 50% at launch.
— Ownership: every account — hosting, domain, database, texting — is registered in ${biz}'s name from day one. You own everything; you're never locked into me.
— Monthly service costs (hosting, database, texting) bill directly to your own accounts, typically $15–27/mo combined.

If anything looks interesting, just reply here or call/text and we'll set it up. And if the timing isn't right, no worries at all.

${sender.name}
${CONTACT}`

  return { subject, body }
}

export function proposalMailtoHref(lead, currentUser) {
  const { subject, body } = buildProposalEmail(lead, currentUser)
  return `mailto:${encodeURIComponent(lead.email || '')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}
