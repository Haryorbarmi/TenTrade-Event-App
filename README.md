# TenTrade Lagos Seminar 2026: Check-in & Giveaway App

The scope and rules are in [CLAUDE.md](CLAUDE.md).

## First-time setup

1. **Create a Supabase project** at supabase.com (the free tier is fine). Pick a region close to Lagos (e.g. `eu-west`).
2. **Turn off public sign-up:** Authentication → Sign In / Providers → turn off **Allow new users to sign up**. Keep Email enabled.
3. **Session length:** Authentication → Sessions. Set a sensible inactivity timeout (e.g. 12 hours) so sessions expire after the event day.
4. **Create the schema:** open SQL Editor, paste all of `supabase/migrations/0001_foundation.sql`, and run it.
5. **Keys:** copy `.env.example` to `.env.local` and fill in the values from Project Settings → API (URL, anon/publishable key, service-role key). Never commit `.env.local`.
6. **Install and run:**
   ```
   npm install
   npm run dev
   ```
   Then open http://localhost:3000.

## Users

There is no public sign-up. Create the accounts from a terminal:

```
npm run create-user -- admin@tentrade.com "StrongPassword" "Full Name" super_admin
npm run create-user -- desk1@tentrade.com "StrongPassword" "Full Name" registrar
```

Create **two** Super Admin accounts so there is a backup on the day.

To disable a user: in Supabase Table Editor → `profiles`, set `active` to false. A disabled user is blocked by RLS straight away and cannot sign in.
To reset a password: Supabase → Authentication → Users → the user → Reset / set password.

## Checks

```
npm test                                   # role rules (and, later, the draw engine)
npm run check-rls -- desk1@tentrade.com "password"   # Phase 1 check: a registrar cannot read or write Raffle data through the API
```

## Deploy

Import the project in Vercel and add the three variables from `.env.example` under Project → Settings → Environment Variables.
