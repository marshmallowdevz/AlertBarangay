# Branch Official Dashboard Port Plan

> **For agentic workers:** Use native in-session execution. Steps use checkbox syntax for tracking.

**Goal:** Show the merged Barangay Dashboard interface when an authenticated official visits `/dashboard`.

**Architecture:** Keep the current Next.js application and its server-side official role gate. Bring the dashboard UI and its local view components into an isolated component folder, adapt the branch Supabase client to the existing Next.js browser client, and mount that UI on the protected route. Preserve the existing admin and resident routes.

**Tech Stack:** Next.js App Router, React, Supabase SSR browser client, existing Vite branch React components and CSS.

**Spec:** The user approved porting the merged Barangay Dashboard to the current app while retaining authentication and role checks.

## Global Constraints

- `/dashboard` must continue to require the `official` role.
- Do not change admin or resident route behavior.
- Do not reopen legacy anonymous Supabase access or bypass the current role gate.
- Use the existing `NEXT_PUBLIC_SUPABASE_*` configuration.
- Do not add or run tests unless requested.

## Review Focus

- Non-official users must still be redirected by the current role guard.
- Official dashboard imports must not depend on Vite's `import.meta.env`.
- Legacy dashboard writes must remain subject to current Supabase permissions.

## Approaches

- Replace the Next.js app with the Vite branch: closest to branch runtime but removes current admin and resident work.
- Redirect from Next.js to a separately running Vite app: leaves sign-in and dashboard on separate servers and is not a deployable integration.
- Port the branch dashboard UI into the protected Next.js route: keeps the current app and its role checks while adopting the requested interface. Chosen.

## Tasks

1. Copy the branch dashboard view modules, styles, and service modules into `src/components/official/branch/`.
2. Replace the branch Vite Supabase initialization with the current Next.js browser client and configuration checks.
3. Adapt report access to the existing incidents model, while leaving incident status changes under the current active staff policy.
4. Use published announcements and the current official profile schema; keep admin-only announcements read-only on the official dashboard and store official contact edits locally.
5. Mount the branch dashboard inside the current protected `/dashboard` page without wrapping it in the old role shell.
6. Run type checking and a production build (no test suite per user instructions); inspect changed source and ensure generated build output is not included in the code change.
