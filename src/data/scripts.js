// Call scripts. [Business Name] is replaced live with whatever is typed in the
// Scripts Hub. Sections marked collapsible start collapsed so the opener is
// always visible without scrolling.

export const SCRIPTS = {
  Ricky: {
    label: 'Charles Lewis (Ricky)',
    sections: [
      {
        title: 'Opener',
        collapsible: false,
        text: `"Hey, this is Charles — I'm a local web developer here in the Boise area. Got a quick sec? I'm not selling anything right now, just seeing if it's worth a 2-minute conversation."`,
      },
      {
        title: 'If yes',
        collapsible: false,
        text: `"Cool — I build websites and automation for small businesses, stuff like online ordering, text alerts when an order's ready, that kind of thing. I noticed [Business Name] — do you currently have a website, or is it more just Google/social right now?"`,
      },
      {
        title: 'Pitch: No website / outdated site',
        collapsible: true,
        text: `"Got it. A lot of the businesses I work with just need something clean and mobile-friendly that actually represents them — hours, products, location, live and stable. That's usually a flat $500, done in about 3 weeks, and you own everything — hosting, domain, all of it's in your name, not mine."`,
      },
      {
        title: 'Pitch: Has a site, wants ordering/POS tied in',
        collapsible: true,
        text: `"So the next step a lot of shops want is getting their live inventory and loyalty program pulled right into the site, so online orders route straight into their existing system — no double-entry, no separate points program. That one runs around $2,000 depending on the POS, but I can give you an exact number after a quick look at what you're running."`,
      },
      {
        title: 'Pitch: Interested in texting',
        collapsible: true,
        text: `"I also set up automated texting — customer gets a text when their order's ready, staff gets pinged too. That's a flat $500 add-on."`,
      },
      {
        title: 'Close',
        collapsible: false,
        text: `"I don't need an answer right now — I can send you a short proposal so you can look it over with no pressure. What's the best email for that?"`,
      },
      {
        title: 'If budget-hesitant',
        collapsible: true,
        text: `"Totally fair — I also do a flat $300 option where I just teach you Wix so you can build and manage it yourself, no ongoing developer needed."`,
      },
    ],
  },
  Mac: {
    label: 'Mac',
    sections: [
      {
        title: 'Opener',
        collapsible: false,
        text: `"Hey, is this [Owner Name]? Hey, I'm Mac — I work with a small local dev shop here in Boise. Sorry for the cold call, but I promise this is quick — you got a sec?"`,
      },
      {
        title: 'If yes',
        collapsible: false,
        text: `"So we build websites and automation for local businesses — a lot of the shops we work with just want something that actually looks good and works on phones, without paying some agency five grand for it. Do you have a website right now, or mostly running off social/Google?"`,
      },
      {
        title: 'Pitch: No site',
        collapsible: true,
        text: `"For most first-time builds we do a flat $500 — real hosting, mobile-optimized, your products/hours/location live in about three weeks. Everything's registered in your business's name, not ours, so you're not locked into us."`,
      },
      {
        title: 'Pitch: Ordering/inventory interest',
        collapsible: true,
        text: `"We can also hook your live inventory and loyalty program straight into the site so it pulls from your actual register — no separate rewards system to manage. That one's usually around two grand but depends on what POS you're running, so we'd nail the number down on a quick call."`,
      },
      {
        title: 'Pitch: Texting',
        collapsible: true,
        text: `"And there's automated texting too — customers get pinged when orders are ready, staff gets alerted — that's a flat $500."`,
      },
      {
        title: 'Close',
        collapsible: false,
        text: `"Here's the thing — I'm not trying to sell you anything on this call. I just want to send over a one-page proposal so you can look at it whenever, zero pressure. Can I grab your email?"`,
      },
      {
        title: 'If pushback on cost',
        collapsible: true,
        text: `"No worries at all — we've also got a flat $300 option where we just teach you Wix so you can run it yourself going forward, no developer needed after that."`,
      },
    ],
  },
}
