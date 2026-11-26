# AlertBarangay

AlertBarangay connects residents and barangay officials for faster emergency response. It is a Next.js (App Router) app backed by Supabase (Auth, Postgres with row-level security, Storage and Realtime).

| Role | Signs in at | Lands on | Can do |
| --- | --- | --- | --- |
| Resident | `/login` (or signs up there) | `/resident/dashboard` | Report emergencies, follow status and private report messages, read announcements, share community Reels, view the incident map, use safety contacts and edit account |
| Barangay official | `/login` | `/dashboard` | See incidents live, filter/search them, see who reported, mark them responding or resolved, edit account |
| Admin | `/login` | `/admin` | Manage accounts and roles, publish announcements, maintenance mode, edit profile |

Routing always uses the account's real role in `public.profiles.role`. The Resident / Barangay Official buttons on the sign-in card only change the wording.

## Requirements

- Node.js 20.9+ and npm 10+ (`npm install -g npm@latest` if `npm -v` shows something older)
- A Supabase project with email/password sign-in enabled

## Local setup

1. Install packages: `npm ci`
2. Copy `.env.example` to `.env.local` and fill it in:

   ```dotenv
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
   SUPABASE_SECRET_KEY=sb_secret_xxx
   # Optional: AI answers for the resident assistant (free key from aistudio.google.com).
   # Without it the assistant answers from built-in English/Filipino/Cebuano help.
   GEMINI_API_KEY=AIza...
   ```

   The secret key (Supabase > Project Settings > API Keys) is used only by server code in `src/lib/supabase/admin.ts`. Never give it a `NEXT_PUBLIC_` prefix and never commit `.env.local` (it is git-ignored).

3. In the Supabase SQL Editor, run the migrations in `supabase/migrations/` **in filename order**. Every file is safe to re-run.

   | File | What it does |
   | --- | --- |
   | `202610300001` to `202611140002` | Community content, resident messages, appointment subscriptions (older resident features) |
   | `202611150001_incidents.sql` | Incident reports, private `incident-media` bucket, realtime (needs PostGIS, pg_cron, pg_net) |
   | `202611230001_admin_user_management.sql` | `profiles` roles and `is_active`, audit log, new-user trigger |
   | `202611250001` to `202611250004` | Own-profile read, announcements and admin notifications, profile photos, maintenance mode |
   | `202611250005_security_hardening.sql` | Locks role/status changes, active-admin checks, officials can update incidents, private incident media |
   | `202611250006_lock_down_legacy_dashboard_tables.sql` | Only if the old official-dashboard migrations were ever applied: removes their anonymous access |
   | `202611250007_reports_and_profiles_ux.sql` | Typed-address reports, officials can see reporter names, profile-photo URL check |
   | `202611260001_incident_dispatch_history.sql` | Dispatch history for the official dashboard |
   | `202611260002_resident_only_signup_and_role_rls.sql` | Public sign-up always creates residents (role metadata is stripped); only active residents can file reports |
   | `202611260003_report_messages.sql` | Private resident ↔ barangay messages on each report, with notifications and live updates |

   | `20261126120000_resident_community_rls.sql` | Active-resident-only access to community posts and private community media |

4. Create the first admin: create a user under **Authentication > Users**, then in the SQL Editor:

   ```sql
   update public.profiles set role = 'admin', is_active = true where id = 'PASTE_AUTH_USER_UUID_HERE';
   ```

5. In **Authentication > URL Configuration**, add `http://localhost:3000/login` and `http://localhost:3000/auth/reset` (and your deployed equivalents) to the redirect URLs, so sign-up confirmation and password-reset emails work. Keep **Confirm email** turned on.

6. Run `npm run dev` and open <http://localhost:3000>.

## Scripts

| Command | Does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / serve it |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint (Next.js core-web-vitals + TypeScript rules) |
| `npm test` | Unit tests (Vitest) |
| `npm run check` | All of the above; run it before pushing |

## Security model

- **Row-level security everywhere.** Browsers use only the publishable key; what they can read or write is decided by the policies in the migrations.
- **Roles live in `public.profiles`.** Browsers can update only their own `full_name` and `avatar_url`; a trigger blocks role and status changes from the browser. Admin account changes go through `/api/admin/*` routes, which re-check that the caller is an active admin before using the server-only secret key.
- **Sign-up is for residents only.** The public form only creates resident accounts; the database trigger sets `role = 'resident'` whatever the browser sends. Official and admin accounts are created by an admin in **Admin > User management**.
- **One dashboard per role:** `/resident/dashboard`, `/official/dashboard`, `/admin/dashboard`. Residents also use protected `/resident/community`, `/resident/map`, and `/resident/safety` pages in this same app. The sign-in tab must match the account (the resident portal tab, labeled "Admin": residents only; Barangay Official tab: officials and admins), otherwise sign-in is refused with a message naming the right tab. Tab labels live in `portalLabels` in `src/lib/auth/roles.ts`.
- **`src/proxy.ts`** (Next.js 16's name for middleware) refreshes the session cookie, sends each role to its own area (opening another role's area redirects to your own dashboard with a notice), enforces maintenance mode, and blocks cross-site writes to `/api`. Pages re-check role and active status on the server too.
- **Private incident media.** Only the reporter and active staff can open incident photos and videos (signed links that expire after 10 minutes).
- **Password changes** require the current password. Password resets use Supabase's emailed one-time link (`/auth/reset`).
- **Private report messages.** Residents and staff talk about a report in `incident_messages`. The database stamps the sender and role; the apps show "Barangay official" or "Resident", never an email or phone number. Only the reporter and active staff can read a thread.
- **Security headers** (no framing, `nosniff`, strict referrer, permissions policy) are set in `next.config.ts`.

## Notifications, offline use and languages

- **Notifications.** Residents get a bell in the header with report status changes, messages from the barangay and announcements, live through Supabase Realtime. With permission ("Turn on alerts on this device"), the browser shows a system notification while the app is open in another tab or minimised. Alerts when the app is fully closed need server-sent Web Push (VAPID keys plus a small sender, e.g. a Supabase Edge Function) or Firebase Cloud Messaging for the Android build (`google-services.json`); `public/sw.js` already displays pushed messages.
- **Installable / offline.** `public/manifest.webmanifest` and `public/sw.js` make the site installable. The resident dashboard is cached for offline use; a report written offline (with its photo or video) is saved on the device and sent automatically when the connection returns. Sign-out clears the cached page.
- **Languages.** Residents can switch between English, Filipino and Cebuano (login page and resident pages; stored in the `ab_lang` cookie). Text lives in `src/lib/i18n/messages.ts`; a test checks every key exists in all three languages. Have a native speaker review the Filipino and Cebuano wording. Official and admin screens are English.
- **Staff tools.** The official dashboard has a live incident map (OpenStreetMap), report analytics (types, median response and resolve times, hotspots) and per-report message threads. Admins see the same analytics under **Admin > Analytics**.

## Project layout

```
src/
  app/                 routes: login, auth/reset, resident/*, dashboard (officials), account, admin/*, api/admin/*
  components/          UI: account/, admin/, official/, resident/ plus shared pieces
  lib/                 auth (roles, guards), supabase clients, incidents, theme, fetch helpers
  lib/__tests__/       unit tests
  proxy.ts             request-level auth, role routing, maintenance mode, CSRF check
supabase/migrations/   database schema and security policies
resident-app/          Legacy Vite resident app and Capacitor Android rollback material; not the active resident experience
```

## Active resident experience

The root Next.js App Router app is the source of truth for resident sign-in and features. A resident signs in at `/login` and enters `/resident/dashboard`; the community feed, incident map, safety contacts, account, notifications and per-report chat use the same authenticated session. `resident-app/` is the legacy standalone Vite app and its Capacitor wrapper is retained only as rollback material. It is not a second active authentication or incident workflow.

## Android app

The legacy Android project under `resident-app/android` is a Capacitor shell configured to load a deployed site. Keep its existing deployment URL unchanged as rollback material. The root Next.js app remains the active resident experience.
