# Admin User Management Dashboard Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax.

**Goal:** Add a Supabase-backed, admin-only account management dashboard to AlertBarangay.

**Architecture:** Convert the bare scaffold to Next.js App Router. Browser Supabase access uses the anon key and session cookies; server route handlers verify an active admin profile before invoking an isolated service-role client for Auth and database administration.

**Tech Stack:** Next.js, React, TypeScript, Supabase JS, `@supabase/ssr`, Lucide React.

**Spec:** `docs/superpowers/specs/2026-11-23-admin-user-management-design.md`

## Global Constraints
- Never expose `SUPABASE_SERVICE_ROLE_KEY` in browser code or public environment variables.
- Every admin page and mutation requires a valid session and `role === 'admin'` with active status.
- Roles are `admin`, `official`, and `resident`.
- Prevent self-deletion; require explicit confirmation for destructive operations.
- Use the supplied burgundy, ivory, alabaster, warm-border, and maroon-action color tokens.
- Do not add or run tests; run a production build as implementation verification.

## Review Focus
- A missing/malformed server secret must not be exposed or silently authorize requests; keep secret access server-only and make server configuration fail clearly.
- Concurrent/partial Auth and profile failures must not leave untracked accounts; implement compensation and audit errors.
- Stale or revoked sessions must not authorize endpoint calls; derive actor identity from verified server session.
- Deleting a user must preserve audit history and clean profile data; use durable actor/target identifiers and no Auth-user FK on audit rows.
- Empty or failed list retrieval must produce distinct UI states and never display stale filtered records as current results.

## File Structure
- `src/app/`: dashboard route, auth login, root layout and styles.
- `src/app/api/admin/users/`: list/create handlers; `[id]/route.ts` edit/delete; `[id]/password/route.ts` password reset.
- `src/components/admin/`: sidebar, metric tiles, user table, dialogs, filters, feedback states.
- `src/lib/supabase/`: browser, cookie-aware server, service-role clients, admin guard.
- `src/types/`: profile and API shapes.
- `supabase/migrations/`: profile, audit, RLS and helper policies.
- `.env.example`, `README.md`, and package scripts: setup and launch instructions.

## Tasks

### Task 1: Establish the Next.js application shell
- Replace the bare manifest with pinned-compatible Next.js, React, TypeScript, Supabase, and required dev dependencies; add `dev`, `build`, `start`, and `typecheck` scripts.
- Add the App Router root layout, global theme tokens, responsive navigation shell, and login route.
- Keep route placeholders typed and the project production-buildable before adding data flows.

### Task 2: Add Supabase schema, clients, and admin authorization
- Add an idempotent SQL migration for profiles, role/status constraints, audit events, indexes, RLS, and minimal self-profile reads/updates.
- Add browser and cookie-aware server clients using only URL and anon key.
- Add a `server-only` service-role client and `requireAdmin()` guard that validates the session and active admin profile.
- Document environment variables, migration application, and safe first-admin bootstrap in README and `.env.example`.

### Task 3: Implement protected account management endpoints
- `GET/POST /api/admin/users`: paginated/profile-enriched listing, filtering inputs, Auth-user provisioning, profile provisioning, rollback on profile failure, audit creation.
- `PATCH/DELETE /api/admin/users/:id`: validate editable fields, synchronize auth metadata/profile role/status, preserve audit records, prevent self-delete.
- `POST /api/admin/users/:id/password`: validate password policy, update through Auth Admin API, audit success without logging secrets.
- Use consistent JSON error responses and call `requireAdmin()` in every handler before any privileged operation.

### Task 4: Build the dashboard UI and account flows
- Add the `/admin/users` server-protected page and responsive sidebar navigation.
- Display total, role, and active/disabled counts; provide search and role/status filters, loading/empty/error states, and row actions.
- Build create/edit/reset-password/delete dialogs with client validation, pending/success/error feedback, and target-specific delete confirmation.
- Match the provided warm dashboard color system, cards, spacing, rounded corners, and outline icon style.

### Task 5: Document deployment and verify integration boundary
- Complete README with local run steps, environment setup, SQL migration, first-admin bootstrap, Auth settings, and deployment notes.
- Run typecheck and production build; fix any issues and inspect changed files for accidental service-role references in client modules.
- Confirm git diff contains only the dashboard implementation and docs.
