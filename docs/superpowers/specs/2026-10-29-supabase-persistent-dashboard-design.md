# Supabase Persistent Dashboard Design

## Intent

Persist the dashboard's profile, notifications, reports, announcements, and report history in the hosted Supabase project so the same data appears across browsers. The app will not use a local Postgres database. Local Supabase migration files are deployment scripts for the hosted project.

## Goals

- Replace `localStorage` profile persistence with one shared profile record in Supabase. Migrate an existing browser profile once when no remote profile exists, then remove the local copy after a successful write.
- Keep reports and announcements in their existing Supabase tables and preserve their current shared behavior.
- Store report creation, dispatch, and dispatch-driven status changes in a `report_history` table linked to reports. Dispatching must update the report status and create its history entry as one database operation.
- Add a shared notifications feed for new reports, report dispatch/status changes, and new announcements.
- Load and display recent notifications in the dashboard. Notification visibility is global; no per-user read state is included because the dashboard has no signed-in identity.
- Persist all app data through the configured hosted Supabase URL and publishable key.

## Non-goals

- Add authentication or private per-official records.
- Start or use a local Supabase/Postgres database.
- Move the hard-coded sample residents and conversations into the database.
- Change report or announcement content beyond what is needed to record history and notifications.

## Constraints and security

- The user chose to keep the sign-in gate removed and confirmed the profile and notifications should be shared.
- Browser requests use the public publishable key. Supabase policies therefore need to allow the anonymous role to read the shared profile, reports, announcements, history, and notifications, and to perform the writes exposed by the app.
- With no authentication or trusted server, any visitor with the app/API endpoint can read and submit shared data, including dispatch/status changes. The schema and UI must not present these records as private or attribute them to an authenticated official.
- Notification and report-history generation should be database-backed so it remains consistent across browser sessions. Use explicit grants/RLS; use invoker permissions where possible. If narrow trigger or RPC routines need `SECURITY DEFINER` to prevent direct public writes to derived tables/status, pin an empty `search_path`, qualify all objects, restrict execute grants, and limit the routine to the required operation. Do not use a service-role key or an unreviewed `SECURITY DEFINER` function in the browser path.
- Existing migrations are imperative SQL migrations. New database changes belong in a new migration and must be reviewed before being pushed to the hosted project.

## Approaches

1. **Shared hosted records (selected):** store the singleton profile, event notifications, and report history in Supabase with shared access. This matches the confirmed no-login, shared-dashboard behavior. The trade-off is that records and writes are public to anyone reaching the app/API.
2. **Private official records:** restore sign-in and scope profile/notification access with authenticated RLS policies. This protects official data, but conflicts with the user's direction to remove the sign-in gate.

## Design

- Add a singleton `dashboard_settings` row for the shared profile name and picture. Preserve the current 1 MB image limit. If the remote row is absent, migrate the current browser profile once; remove the browser copy only after Supabase confirms persistence.
- Add `report_history` rows referencing `reports.id`. Record report creation and dispatch-driven status changes with event type, old/new status where applicable, dispatch type/note where applicable, a generic `Shared dashboard` actor label, and timestamp. Do not add a separate status-editing action. Dispatch and its status change/history entry must be atomic through one database routine.
- Add a `notifications` table for shared event records, with a type, title/body, optional report/announcement references, and creation timestamp. Generate entries for report creation, report-history events, and announcement creation. A trigger or equivalent database mechanism must avoid missing events when another browser creates a record.
- Add a notifications view in the dashboard showing the latest shared events. Do not implement a global read/unread flag because one visitor marking a shared item read would affect every other visitor.
- Extend report loading to include persisted history. Refresh report/history/notification views after writes and subscribe to inserts where the current Supabase Realtime setup supports it.
- Add RLS, grants, and constraints for the new tables and required report status updates in the same migration. Preserve the app's current anonymous shared-access model.

## Verification and deployment

- Check schema behavior locally with the existing migration workflow if the local CLI stack is available; do not point app runtime at a local database.
- Run lint and build checks after implementation. Do not deploy migrations automatically as part of code implementation.
- Before hosted deployment, link the CLI to the Supabase project, review `supabase db push --dry-run`, then apply only the reviewed pending migrations. Confirm a profile update, notification generation, report creation, and dispatch/history round-trip against the hosted project.

## Builder decisions

- Keep reports and announcements in their current tables.
- Treat profile, notifications, reports, announcements, and report history as shared dashboard data.
- Keep sample residents and conversations as non-persistent preview data.
- Use a global notifications feed without per-user read state.
- Use `Shared dashboard` as the history actor label; this does not claim that an authenticated official performed the action.
- Record status transitions the existing app exposes through dispatch only; do not add general status editing as part of this change.
- Use narrowly scoped `SECURITY DEFINER` trigger and dispatch functions with empty `search_path` and explicit execute grants so public callers cannot forge notifications/history or bypass dispatch status validation with direct table writes.
