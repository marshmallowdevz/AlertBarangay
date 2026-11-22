# Supabase Persistent Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist the shared dashboard profile, notifications, reports, announcements, and report history in the hosted Supabase project.

**Architecture:** Add a migration for singleton dashboard settings, report history, and shared notifications, with open RLS matching the approved no-login design. Add focused Supabase services, then connect profile loading/saving, report dispatch/history, and a Notifications view to those services; notification records are generated in Postgres when reports, report-history events, or announcements are inserted.

**Tech Stack:** React 19, Supabase JS 2, PostgreSQL migrations, Supabase Realtime.

**Spec:** `docs/superpowers/specs/2026-10-29-supabase-persistent-dashboard-design.md`

## Global Constraints

- Use the hosted Supabase URL and publishable key already configured in `.env.local`; do not use local Postgres or a service-role key.
- Keep the dashboard shared and unauthenticated; its records and writes are public as described in the approved design.
- Keep sample residents and conversations as preview data.
- Use explicit grants and RLS. If necessary to prevent public direct writes to derived records/status, use narrowly scoped, reviewed `SECURITY DEFINER` routines with empty `search_path`, qualified object names, and restricted execute grants.
- Do not deploy migrations automatically. Review the hosted `db push --dry-run` before applying migrations.
- Do not add or run tests unless the user asks.

## Review Focus

- A concurrent profile migration must not overwrite an existing remote profile. Task 3 uses insert-if-absent semantics and deletes browser storage only after success.
- A profile image above 1 MB or a non-image must remain rejected. Task 3 preserves and manually checks this validation.
- Dispatching a closed or resolved report must not change its status or add history. Task 1's dispatch function rejects those statuses; Task 5 handles the returned error.
- Notification generation must not duplicate events when a client also refreshes or subscribes. Task 1 uses database triggers as the only event creator; Task 4 deduplicates loaded/realtime events by notification ID.
- Public RLS must be explicit for each read/write used by the UI. Task 1 reviews every table grant and policy against the approved shared model.

---

### Task 1: Add hosted schema for settings, report history, and notifications

**Files:**
- Create: `supabase/migrations/<timestamp>_add_shared_dashboard_persistence.sql` using `supabase migration new add_shared_dashboard_persistence`
- Modify: `docs/superpowers/specs/2026-10-29-supabase-persistent-dashboard-design.md` only if implementation requires a material design change

**Interfaces:**
- Produces tables `public.dashboard_settings`, `public.report_history`, and `public.notifications`.
- Produces RPC `public.dispatch_report(p_report_id uuid, p_response_type text, p_note text) returns public.report_history`; the database sets the actor label to `Shared dashboard`.
- Produces insert triggers that create a `created` history record for reports and notification records for report history and announcements.
- Adds `public.notifications` to the `supabase_realtime` publication so remote inserts reach the dashboard subscription.

- [x] **Step 1: Create the migration with the Supabase CLI**

Run: `npx supabase migration new add_shared_dashboard_persistence`
Expected: a new timestamped SQL file under `supabase/migrations/`.

- [x] **Step 2: Define constrained tables and indexes**

Create singleton `dashboard_settings` with fixed key `main`, non-empty profile name, picture text, and update timestamp. Create `report_history` with UUID FK to `reports.id`, event type (`created` or `dispatched`), optional old/new status, response type, note, actor label defaulting to `Shared dashboard`, and timestamp. Create `notifications` with UUID ID, event type (`report_created`, `report_dispatched`, `announcement_published`), title/body, nullable FKs to reports/announcements, and timestamp. Add indexes for descending `created_at` and history lookup by report.

- [x] **Step 3: Add atomic dispatch routine and event triggers**

Implement `dispatch_report` as a narrowly scoped security-definer function that updates an open report to `Assigned`, inserts its `dispatched` history row with prior/new status, and returns that row in one transaction. Pin an empty search path, qualify every object, and grant execute only to the intended public roles. Reject missing, resolved, or closed reports. Security-definer report-insert, report-history, and announcement-insert triggers create history/notifications; pin their search paths and revoke direct execute. Do not create notifications in browser code.

- [x] **Step 4: Set grants and RLS for the shared public model**

Enable RLS and add explicit `anon, authenticated` policies for required table reads/writes. Grant only the table operations the client directly uses: singleton profile read/write, and report/announcement create/read. Do not grant direct client writes to history, notifications, or report status; only the hardened database routines can write those derived records. Grant execute on the dispatch RPC to `anon, authenticated`.

- [x] **Step 5: Inspect the migration and its security behavior**

Review the SQL for transaction consistency, constraints, grants, RLS, trigger behavior, and absence of service-role or definer access. Do not apply it to the hosted database in this task.

### Task 2: Add focused Supabase services

**Files:**
- Create: `src/dashboardSettingsService.js`
- Create: `src/notificationService.js`
- Modify: `src/reportService.js`
- Modify: `src/announcementService.js` only if needed for notification subscription refresh

**Interfaces:**
- `DashboardSettings = { id: 'main', name: string, picture: string, updated_at: string }`
- `Notification = { id: string, type: string, title: string, body: string, report_id: string | null, announcement_id: string | null, created_at: string }`
- `getDashboardSettings() -> Promise<{ id: string, name: string, picture: string } | null>`
- `getOrInitializeDashboardSettings(initial: { name: string, picture: string }) -> Promise<DashboardSettings>`
- `saveDashboardSettings({ name: string, picture: string }) -> Promise<DashboardSettings>`
- `listNotifications() -> Promise<Notification[]>`
- `subscribeToNotifications(onInsert, onError) -> unsubscribe`
- `dispatchReport({ reportId: string, responseType: string, note: string }) -> Promise<ReportHistory>`
- `listReportHistory(reportIds: string[]) -> Promise<ReportHistory[]>`

- [x] **Step 1: Implement settings read and idempotent save**

Use the singleton key `main`; saves upsert that row and return selected columns. Propagate Supabase errors to callers.

- [x] **Step 2: Implement notification query and Realtime subscription**

Read the newest 50 notifications in descending timestamp order. Subscribe to notification inserts and return a cleanup function that removes the channel.

- [x] **Step 3: Implement report history query and dispatch RPC**

Query history by report UUIDs in ascending event time for report details, return an empty array without a request when no report IDs are supplied, and call `dispatch_report` for dispatches. Map snake_case database rows to `{ id, reportId, eventType, oldStatus, newStatus, responseType, note, actorLabel, createdAt }` in one boundary function.

For `createReport`, query the created report's history after the insert so the returned report includes the trigger-created `created` entry.

- [x] **Step 4: Extend report loading with persistent history**

Load reports then their history and return reports with their chronological `dispatchHistory`; preserve `databaseId` for operations that need the UUID FK and preserve report code as the display ID.

### Task 3: Persist and load the shared profile

**Files:**
- Modify: `src/Official.jsx`
- Modify: `src/Official.css` only if a loading/error state needs styling
- Consume: `src/dashboardSettingsService.js`

**Interfaces:**
- Profile view shape remains `{ name: string, picture: string }`.
- `saveProfile` persists to Supabase before updating the displayed profile.

- [x] **Step 1: Replace localStorage initialization with remote profile loading**

Call `getOrInitializeDashboardSettings` with the default profile and current legacy `alertBarangay.dashboard` profile if present. The service inserts only when the `main` row is absent, then reads the winning row so concurrent browser initialization cannot overwrite it. Fall back to the default display profile on read errors without silently claiming persistence.

- [x] **Step 2: Save profile changes remotely**

Keep the current non-empty name and image type/1 MB validations. On successful upsert, update React state and remove the legacy localStorage entry; on failure, keep the editor open and show the save error.

- [x] **Step 3: Remove local profile persistence**

Remove `readDashboardData`, `saveDashboardData`, storage-error UI/state, and the `dashboardStorageKey` after one-time migration support is wired.

### Task 4: Add the shared Notifications view

**Files:**
- Create: `src/NotificationsView.jsx`
- Modify: `src/Official.jsx`
- Modify: `src/Official.css`
- Consume: `src/notificationService.js`

**Interfaces:**
- `NotificationsView({ notifications, loading, error, onRetry })` renders the shared feed.
- Notification row shape is `{ id, type, title, body, reportId, announcementId, createdAt }`; state is deduplicated by UUID and has no global read/unread control.

- [x] **Step 1: Build the notification list view**

Show newest-first event type, title, body, and formatted timestamp, with loading, retryable error, and empty states.

- [x] **Step 2: Add the Notifications navigation item and data lifecycle**

Add a Notifications route to the existing sidebar, load the latest notifications, subscribe to inserts, merge/deduplicate events by ID, and clean up the subscription on unmount. Do not display a count badge because the shared feed has no per-visitor unread state.

### Task 5: Persist report history and dispatch behavior

**Files:**
- Modify: `src/Official.jsx`
- Modify: `src/DispatchView.jsx`
- Modify: `src/ReportsView.jsx` only if the history row shape needs presentation updates
- Consume: `src/reportService.js` and the interfaces from Task 2

**Interfaces:**
- `dispatchResponse({ reportId, responseType, note }) -> Promise<void>` calls the dispatch RPC and refreshes the affected report/history.
- Existing report and dispatch view props remain in camelCase.

- [x] **Step 1: Load reports with persisted history**

Use `listReports` results as the source for Reports, Overview, and Dispatch; remove client-only initialization of empty `dispatchHistory` once the service returns history.

- [x] **Step 2: Persist dispatches atomically**

Make `dispatchResponse` asynchronous, call the RPC with the report database UUID, then refresh reports/history from Supabase. The database fixes the actor label to `Shared dashboard`. Surface RPC errors in DispatchView without showing a success confirmation.

- [x] **Step 3: Remove in-memory dispatch history writes**

Remove `operationalData.dispatches` and client-only report status/history mutations. Derive recent dispatches from persisted report history and update the DispatchView copy to describe shared saved records.

### Task 6: Verify application and prepare hosted deployment

**Files:**
- No additional source files

- [ ] **Step 1: Run lint and production build**

Run: `npm.cmd run lint` and `npm.cmd run build`
Expected: both commands exit successfully. If the build hits the existing Windows `spawn EPERM`, report it as an environment limitation without claiming success.

- [ ] **Step 2: Review migration dry-run against hosted Supabase**

After the user completes CLI login and project linking, run `npx supabase db push --dry-run`. Confirm the listed migration is expected before pushing; do not push migrations automatically.

- [ ] **Step 3: Confirm hosted round-trip after user-authorized deployment**

After the migration is deployed, confirm profile save/reload, notification generation for report/dispatch/announcement events, report creation, and dispatch/history round-trip against the hosted project. Do not use or start local Postgres.
