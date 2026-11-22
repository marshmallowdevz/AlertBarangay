# Authenticated Profiles and Shared Dashboard Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add official-account login and personal saved profiles, keep announcement and contact data shared, and make the approved dashboard UI removals.

**Architecture:** Add a small auth/router shell for `/login` and `/dashboard`; protect the official dashboard with Supabase Auth and the trusted official app-metadata role. Store personal profiles in an RLS-protected table keyed by `auth.uid()`, and retain shared emergency/call-center numbers in the singleton `dashboard_settings` row.

**Tech Stack:** React 19, Vite, `@supabase/supabase-js`, Supabase Auth, Postgres RLS.

**Spec:** `docs/superpowers/specs/2026-11-05-auth-profiles-and-dashboard-settings-design.md`

## Global Constraints

- Do not add public sign-up or modify the separate landing-page branch.
- Sign-in is disabled by default; `VITE_REQUIRE_AUTH=true` restores the prepared role-gated login flow.
- In this branch, `/` is a login fallback; after branch integration, the landing page will own `/` and link to `/login`. Dashboard remains at `/dashboard`.
- Per-user profile rows must be isolated by `auth.uid()` in database RLS.
- Anonymous and authenticated clients can read and write announcements and shared contacts in the temporary open mode. A future auth rollout must also apply a migration that restricts anonymous writes.
- Do not remove existing announcements, contact settings, or shared data.
- Do not deploy migrations to the hosted Supabase project as part of this work.
- Do not add or run tests unless requested by the user.

## Review Focus

- With `VITE_REQUIRE_AUTH=true`, a signed-out visitor cannot open `/dashboard`; successful sign-in requires the trusted `app_metadata.barangay_role = official` claim.
- Two accounts cannot read or overwrite each other's profile rows.
- All users share announcement posts and contact phone numbers in open mode. Anonymous writes must be restricted before auth mode is treated as a security boundary.
- After merge, the landing page owns `/` and can link into `/login` without removing the auth routes.

---

### Task 1: Persist per-user profiles and shared contact numbers

**Files:**
- Create: new migration via `supabase migration new` for `dashboard_profiles`, RLS policies, shared contact columns, and authenticated write policies.
- Modify: `src/dashboardSettingsService.js` for per-user profile read/save and shared contact read/save/realtime operations.
- Modify: `README.md` with account provisioning and route integration notes.

**Interfaces:**
- Produces profile APIs keyed by the signed-in auth user ID and shared contact settings APIs for later UI tasks.

- [x] Create an imperative migration using the Supabase CLI workflow. Add `dashboard_profiles(user_id uuid primary key references auth.users(id) on delete cascade, name text, picture text, updated_at timestamptz)` with name/picture limits matching the current editor.
- [x] Enable RLS on `dashboard_profiles`; grant authenticated select/insert/update; policies allow only `(select auth.uid()) = user_id` for each operation.
- [x] Add `emergency_phone` and `call_center_phone` with current-number defaults to `dashboard_settings`; retain public reads, allow anonymous inserts/updates in open mode; require an official app-metadata role in the later auth-hardening migration, and preserve the singleton `id = 'main'` constraint.
- [x] Allow announcement inserts in open mode while preserving shared reads and the existing Realtime publication; add official-only writes in the later auth-hardening migration.
- [x] Implement service functions to read/create/update the current user's profile and read/update the shared contacts; do not copy the old global name/photo into new user records. Subscribe to shared contact updates so already-open sessions stay current.

### Task 2: Add login, session handling, and protected dashboard route

**Files:**
- Modify: `src/main.jsx` to mount the auth route shell.
- Create: `src/AuthApp.jsx` for `/login` and `/dashboard`, session restoration, route changes, official-role gating, and sign-out handling.
- Create: `src/LoginView.jsx` for email/password login and access errors.
- Modify: `src/Official.jsx` to receive authenticated user and sign-out action.

**Interfaces:**
- `AuthApp` passes the authenticated Supabase user and `onSignOut` callback to `Official`.
- `LoginView` receives `onSignIn` and reports rejected credentials/access to the form.

- [x] Implement email/password sign-in only; do not render a sign-up action.
- [x] Restore the current Supabase session on page load and subscribe to auth state changes; redirect signed-out users from `/dashboard` to `/login`.
- [x] Permit `/dashboard` only when `user.app_metadata.barangay_role === 'official'`; show a clear denied state and sign-out option for other authenticated accounts.
- [x] Use the dashboard directly by default; when auth is enabled use `/login` and `/dashboard`. After merge the public landing page can be mounted through `AuthApp`'s optional `LandingPage` prop.

### Task 3: Use personal profiles and shared contacts in the dashboard

**Files:**
- Modify: `src/Official.jsx` for user profile load/save and contact settings modal/state.
- Modify: `src/OverviewView.jsx` to remove Today's checklist and render contact values from shared settings.
- Modify: `src/Official.css` for the shared contacts form and responsive layout.

- [x] When auth is enabled, load the signed-in user's profile by auth ID; in open mode load the shared profile.
- [x] Save name and picture to the signed-in user profile when auth is enabled or the shared profile in open mode; keep existing image validation.
- [x] Add an Edit shared contacts form for emergency and call-center phone numbers; persist them in `dashboard_settings` and use the saved values for `tel:` links and visible text.
- [x] Remove the Today's checklist section from Overview.
- [x] Remove the "Emergency Ops" subtitle from the sidebar.
- [x] Show sign-out and personal-profile copy only when auth is enabled; label the open-mode profile as shared.

### Task 4: Keep announcement sharing visible across accounts

**Files:**
- Modify: `src/announcementService.js` only if auth-aware behavior is needed for inserts.
- Modify: `src/Official.jsx` announcement load/subscribe/post state only if needed for session transitions.

- [x] Keep initial announcement loading newest-first and keep the realtime INSERT subscription; preserve merge-by-ID duplicate prevention.
- [x] Ensure all dashboard users see posts made by another user after post and on reload; retain the current error state if Supabase rejects a post.
- [x] Review the migration, auth shell, and dashboard wiring against the design.
- [x] Restrict the dispatch RPC to authenticated official accounts so direct API calls cannot bypass the dashboard gate.