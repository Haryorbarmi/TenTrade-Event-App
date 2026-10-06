# TenTrade Lagos Seminar 2026: Check-in & Giveaway App

Read this whole file before writing code. It is the source of truth for scope, rules and build order. Where this file says **Confirm**, stop and ask the owner before building that part. Do not guess.

## 1. What we are building

A small web app used at the TenTrade (forex brokerage) event in Lagos.

- Registrars (customer support staff) at a desk register each client who arrives, using the client's Client ID.
- Each entry goes into a live attendee list, numbered in arrival order.
- A Super Admin runs prize draws from that list and shows the draw live on a projector.

There is **no QR code, no confirmation email and no camera scanning** in this version. Those ideas were dropped.

## 2. Stack

- **Next.js** (App Router) with **TypeScript** and **Tailwind CSS**
- **Supabase**: Postgres, Auth (email and password), Realtime
- **Vercel** for hosting
- Server-side code (Next.js route handlers or server actions) for anything that must be trusted: draws, role checks, exports
- Excel export with a library such as `exceljs`, or CSV

Use environment variables for all keys. Never put a secret in client code.

## 3. Design source (Figma)

- File key: `dhfrwDd6G2TBI7BqPOnY6C` (file name: "WebSite-2026")
- Page: node `3943:48`
- Link: https://www.figma.com/design/dhfrwDd6G2TBI7BqPOnY6C/WebSite-2026?node-id=3943-48

Use the Figma MCP (`get_design_context`, `get_screenshot`) to read each frame before building its screen. Match the design. Do not invent a new style.

| Frame (by name) | Node id | Screen |
|---|---|---|
| Login | 4010:135 | Sign-in |
| Dashboard | 3943:49 | Dashboard |
| Registration | 3949:135 | Add an attendee |
| Attendee | 3950:135 | Attendee list |
| Raffle · Grand Draw | 3952:135 | Draw page for the Grand Draw |
| Raffle · Early Bird / Lucky Attendee / Event Engagement / Knowledge Challenge | find by name on the page | Draw page variants |
| Raffle · Not allowed (registrar view) | 4013:135 | Shown to non-Super-Admins |
| Raffle display screen (projector) | 3953:135 | Four projector states |

Visual tokens (take exact values from Figma if they differ):

- Sidebar and dark panels: `#0D0D0D`
- Accent gradient (buttons, highlights): `#F66584` to `#D925C8`
- Borders and dividers: `#D9D9D9`
- Headings: **Questrial**. Body text: **Inter** (Light, Regular, Semi Bold)
- Cards: white, 1px border, 12px radius. Inputs and buttons: 8px radius

All sample data in the designs (names, IDs, balances, counts) is fake. Never ship it.

## 4. Users and roles

About four users in total. Accounts are created by a Super Admin. **There is no public sign-up.**

| | Super Admin | Registrar |
|---|---|---|
| Login | Yes | Yes |
| Registration (add attendees) | Yes | Yes |
| Attendee list | Yes, with edit and export | Yes, view and add. No export |
| Dashboard | Yes | Yes |
| Raffle (all draws, lock, projector) | Yes | **Not allowed** |
| Create, disable users, reset passwords | Yes | No |

Rules:

- Only the Super Admin can run draws. A registrar who opens the Raffle sees the "Not allowed" screen (Figma frame above) with a button back to Registration.
- **Enforce roles on the server as well as in the UI.** Every draw, lock, unlock, winner and export action must check the role again. Use Supabase Row Level Security plus server checks. Hiding a button is not security.
- Recommend a second Super Admin account as a backup in case the first cannot log in on the day.
- Sessions expire. The admin resets passwords. Show the logged-in user's name and role in the sidebar user block.
- Every record stores who created it and when (see Audit).

## 5. Screens and behaviour

### Login
Email and password, a Sign in button, "Forgot your password? Ask the admin to reset it." Show the note "Every entry you make is saved with your name and the time."

### Registration
Fields, in this order:

1. **Client ID**: required, unique. Hint: "Type it exactly as shown on the portal."
2. **Name**: required
3. **Email**: required, format check
4. **Phone number**: required, format check (Nigerian numbers, `+234` accepted)
5. **Grand Draw eligibility**: toggle, **Eligible** or **Not eligible**
6. **Tickets**: buttons 1 to 10. Selectable only when Eligible. Switching to Not eligible clears tickets to 0. Show "N tickets · N× the chance" under the buttons.

Buttons: **Add attendee**, **Clear**. A **Recent check-ins** panel shows the latest entries in arrival order.

Rules:

- If the Client ID already exists, warn and block a second entry.
- Each new entry gets the next arrival number (`seq`), assigned by the database, not by the browser, so two registrars cannot get the same number.
- The registrar's name and the time are saved automatically.
- **Account balances are never typed, shown or stored anywhere in this app.** The registrar reads the balance on the company portal and only sets Eligible and the ticket count.
- The ticket rule for the registrar's reference: 1 ticket per $100 in the account, up to 10 tickets at $1,000 or more. Round down to the nearest $100. **Confirm** this rounding.

### Attendee list
Columns: **No., Client ID, Name, Email, Phone, Grand Draw (Eligible / Not eligible), Tickets, Registered by, Time**.

- Search by name, email or Client ID
- Filters: All, Eligible only, Registered by (a person)
- Live updates: a new entry from another registrar appears without a refresh
- Footer: "Showing X of Y attendees · N eligible · T tickets in the Grand Draw"
- **Export to Excel**: Super Admin only
- Editing eligibility, tickets or details: Super Admin on any entry. Registrars on entries they created. **Confirm.** Every edit is logged with who, when, old value and new value.

### Dashboard
Cards: Checked in (with an optional "of N expected" setting the Super Admin can set), Grand Draw eligible (and total tickets in play), Peak arrivals (busiest 10-minute slot), Draws completed (for example 1 / 5).

Panels: Check-ins over time (bars per 10 minutes, busiest highlighted), Draws status (Ready, Done, Waiting), Latest arrivals, Grand Draw eligibility donut (eligible vs not eligible, tickets in draw). Everything is computed from real data.

### Raffle (Super Admin only)
A dropdown chooses the draw. Each draw page has: Choose the draw, Lock the list, Prize, a dark Draw stage with a Draw button and live counts, and a Winners table. Details in section 7.

### Not allowed (registrar view)
Lock icon, "Not allowed", "Only Super Admins can open the Raffle. You can keep adding attendees from Registration.", a **Go to Registration** button.

## 6. Data model (Supabase / Postgres)

Keep it minimal. **There is no balance column.**

- `profiles`: `id` (auth user), `name`, `role` (`super_admin` | `registrar`), `active`
- `attendees`: `id`, `seq` (unique, database-assigned arrival number), `client_id` (unique), `name`, `email`, `phone`, `eligible` (bool), `tickets` (int, 0 to 10, must be 0 when not eligible), `source` (`manual` for now, `crm` later), `registered_by` (profile), `created_at`, `updated_at`, `updated_by`
- `attendee_changes`: audit log of edits (`attendee_id`, `changed_by`, `changed_at`, `field`, `old_value`, `new_value`)
- `participants`: Event Engagement tags (`attendee_id`, `tagged_by`, `tagged_at`)
- `draws`: `id`, `type` (`grand` | `early_bird` | `lucky` | `engagement` | `knowledge`), `name`, `prize_amount`, `winners_count`, `status` (`open` | `locked` | `done`), `locked_by`, `locked_at`, `pool_snapshot` (jsonb of attendee ids and tickets at lock time)
- `winners`: `id`, `draw_id`, `attendee_id`, `position`, `drawn_by`, `drawn_at`, `pool_size`, `total_tickets`, `random_value`, `replaced` (bool), `replaced_reason`

Row Level Security on every table. Registrars cannot read or write `draws`, `winners` or `participants`.

## 7. Draw rules

Prizes in scope (the social-media draw is **excluded**):

| Draw | Prize | Pool | Chance |
|---|---|---|---|
| Grand Trading Draw | $1,000 | Checked-in attendees marked Eligible, not previous winners | **Weighted by tickets** |
| Early Bird | $500, 1 winner | The first 50 attendees by arrival number (`seq` 1 to 50) | Equal |
| Event Engagement | $250: 5 winners × $50 | Attendees tagged as participants | Equal |
| Knowledge Challenge | $100 | Decided by a quiz run in a separate tool | See below |
| Lucky Attendee | $50, 1 winner | All checked-in attendees | Equal |

Rules that apply to every draw:

- **One prize per attendee.** Anyone who has won is removed from every later pool, automatically.
- Winners must be present. The pool is only people who are checked in.
- **Lock the list.** The Super Admin previews the pool, then locks it. Locking saves a snapshot with the time and the user. The draw runs only on the locked snapshot. Unlocking needs a confirmation and is logged.
- **Redraw.** If a winner is absent or turns out ineligible, the Super Admin can redraw. Mark the old winner as `replaced` with a reason. Never overwrite or delete a winner.
- **The result is chosen on the server** with a cryptographically secure random source (`crypto.getRandomValues` or `crypto.randomInt`), never `Math.random`. The browser animation is only for show.
- Save the pool size, total tickets and the random value with each winner, so the draw can be audited.
- Order of draws matters because of one prize per person. The Super Admin chooses the order. Show a short warning about it.

### Grand Draw: ticket weighting
Each ticket is one entry. A client with 10 tickets has ten times the chance of a client with 1, and a client with 1 ticket **can still win**. Algorithm: total = sum of tickets in the locked pool. Pick an integer in `[0, total)` using unbiased secure randomness (rejection sampling), then walk the cumulative ticket counts to find the owner of that entry.

### Event Engagement
Super Admin tags participants on the draw page: type a Client ID, press **Add**, and the person appears as a removable chip. Five winners are drawn one at a time (button reads "Draw winner 1 of 5"). Winners leave the pool as they are drawn.

### Knowledge Challenge
The quiz runs outside this app. The Super Admin enters the top scorer's Client ID, sees their name and eligibility, and presses **Confirm winner**. For a tie at the top score, the Super Admin adds the tied clients and the app draws one of them at random (**Tied at the top score? Draw among the tied clients**).

## 8. Projector display

A separate page, `/display`, for the projector. It shows no attendee data except what the admin screen sends it. Four states:

1. **Waiting**: logo, "LAGOS SEMINAR 2026", "Raffle starting soon".
2. **Countdown**: a large number counting down with a shrinking ring, label "[Draw name] · starts in". Default **10 seconds**. **Confirm** whether the Super Admin should be able to change the length before starting (the owner's Figma note says "Edit Timer to start (countdown)"). The draw starts automatically at zero.
3. **Shuffling**: one Client ID shown as digit boxes in the centre of the screen. The **whole ID changes randomly in place**; nothing scrolls up or down. IDs come from the locked pool, and for the Grand Draw clients with more tickets appear more often. In the last 2 seconds the digits settle left to right on the real winner.
4. **Winner**: label ("WINNER · [DRAW NAME]"), the Client ID large with the accent gradient, the **winner's name in large bold white**, and "Congratulations!". **Never show email or phone** on the projector.

Behaviour:

- Controlled live from the Super Admin's Raffle page (Supabase Realtime channel with a short pairing code so only the intended display connects). Same-laptop use (two windows) should also work via the browser `BroadcastChannel`.
- A **Blank** control returns the display to the logo screen immediately.
- If the connection drops, the display keeps showing its last state.
- Event Engagement repeats the cycle five times. Knowledge Challenge skips countdown and shuffle and goes straight to the Winner state.
- Provide a **practice mode** that animates with fake IDs and records nothing.

## 9. Privacy and security

- Collect only: Client ID, name, email, phone, eligibility, tickets. Nothing else.
- No balances, ever (not in the UI, database, logs, exports or screenshots).
- Comply with the Nigeria Data Protection Act: show a short consent note at the desk, and provide a way for the Super Admin to **delete all event data after the event**.
- Use HTTPS only. Secrets only on the server.
- Registrars cannot export the list.
- Log sign-ins, entries, edits, locks, draws, redraws and exports with user and time.
- Show times in Lagos time (WAT, UTC+1).

## 10. CRM lookup (later, not now)

The company CRM is **FXBO**. We may later pull name, email and phone (and maybe eligibility and tickets) by Client ID. Public FXBO API documentation was not found, so **do not build against any guessed endpoint**.

Design for it now, build nothing real yet:

- Put the lookup behind one function, `lookupClient(clientId)`, in a server-only module.
- Today it returns "not found", and the registrar types everything in. Later an FXBO version fills the same fields and the registrar only confirms.
- Eligibility and tickets stay separate fields so a future lookup can pre-set them without removing the registrar's ability to correct them.
- The `source` column on `attendees` records `manual` or `crm`.
- Any future FXBO credentials must live only on the server, read-only, with the minimum permissions. Never send a balance to the browser: if the CRM returns one, the server converts it to eligible and tickets and discards it.

## 11. Build phases

Work one phase at a time. Finish and check each phase before the next. Read the matching Figma frames first.

1. **Foundation**: project setup, Supabase schema, Auth with no public sign-up, roles, Row Level Security, sidebar layout, Login, Not allowed screen. *Check:* a registrar cannot reach Raffle data even by calling the API directly.
2. **Registration and Attendee list**: the form with all rules, live list, search, filters, edit with audit log, Export (Super Admin only). *Check:* two browsers add entries at once and get different arrival numbers.
3. **Draw engine**: the five draws, ticket weighting, lock and snapshot, one-prize-per-person exclusion, redraw, winners table. *Check:* simulate 100,000 weighted draws and confirm the results match the ticket proportions, and that a 1-ticket client can win.
4. **Projector display**: the four states, countdown, in-place shuffle, winner reveal, pairing, Blank control, practice mode.
5. **Dashboard**: all cards and panels from real data.
6. **Hardening and rehearsal**: test on real phones and the real projector, test on poor Wi-Fi, run a full mock event with the four real users.

## 12. Working rules for Claude Code

- Ask before assuming anything marked **Confirm**.
- Do not add features that are not in this file (no QR codes, no email sending, no quiz engine, no social-media draw).
- Keep code simple and readable. Write tests for the draw engine and the role checks.
- Do not commit secrets. Provide a `.env.example`.
- After each phase, summarise what was built, what was tested and what is left.

## 13. Open items to confirm with the owner

1. Ticket rounding: round down to the nearest $100. **Confirmed by owner 2026-10-06** ($99 = not eligible, $250 = 2, $1,000+ = 10).
2. Whether registrars may edit their own entries. **Confirmed by owner 2026-10-06:** yes, own entries only, with the audit log.
3. Whether the Super Admin can edit the countdown length (assumed yes, default 10 seconds).
4. Early Bird means the first 50 clients registered at the venue, in arrival order (assumed).
5. Draw order for the five prizes.
6. The "of N expected" number on the Dashboard, and where it comes from.
