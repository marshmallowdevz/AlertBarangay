# Barangay Official Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the Barangay Official dashboard into an interactive prototype for provisioned officials, with shared announcements, profile editing, sample-based operations views, and sign out.

**Architecture:** Keep `Official.jsx` as the shell and put prototype records in a separate fixture module. Gate the dashboard with Supabase email/password auth and the admin-managed `app_metadata.barangay_role` claim. Use focused components for operational views and a small Supabase service plus SQL migration for shared announcements. Profile display data remains per-user browser-local; operational records remain client-side samples.

**Tech Stack:** React 19, Vite, JavaScript, Supabase JS client, PostgreSQL SQL migration, existing CSS.

**Spec:** `docs/superpowers/specs/2026-10-08-barangay-official-dashboard-design.md`

## Global Constraints

- Reports, dispatches, residents, and messages use representative sample data held in the client.
- Announcements are persisted in Supabase and synchronized between open official sessions.
- Profile name and picture are saved in this browser under the signed-in user’s ID; they are not an account-wide profile.
- Only existing Supabase email/password accounts provisioned with `app_metadata.barangay_role = 'official'` can enter the dashboard or post announcements; do not add public sign-up.
- Sign out revokes the current Supabase session and returns to the sign-in view; if sign out fails, keep the current state and show an error.
- Do not imply that sample operational data is live production data.
- Do not silently fall back to browser-only storage when announcement requests fail.

## Review Focus

- A Supabase load or insert failure must show an error and must not claim a post was shared; inspect both returned errors and rejected promises in the Announcements view.
- An announcement insert arriving during the initial fetch must not appear twice; merge rows by `id` in the announcement state updater.
- An invalid or oversized profile image must not replace the saved picture; retain image type and 1 MB checks and verify the previous preview remains.
- Empty search and unknown/empty resident data must show a usable empty state; check the Residents view with a query matching no fixture.
- A signed-in account without `app_metadata.barangay_role = 'official'` must not enter the dashboard or post; check both the UI gate and database policy.
- A failed Supabase sign-out must not claim the session ended; inspect returned errors and rejected promises.

---

### Task 1: Separate prototype records from the dashboard shell

**Files:**
- Create: `src/dashboardData.js`
- Modify: `src/Official.jsx`

**Interfaces:**
- Produces `initialReports`, `initialResidents`, and `initialConversations` exports with stable string IDs.
- A report has `{ id, type, severity, status, location, time, description, dispatchHistory }`.
- A resident has `{ id, name, purok, address, phone }`.
- A conversation has `{ id, residentId, residentName, messages }`; each message has `{ id, sender, body, createdAt }`.

- [ ] Move the existing incident fixture into `src/dashboardData.js`; add representative resident fixtures and at least two conversations with message histories.
- [ ] Initialize report, resident, and conversation view state from the fixture exports in `Official.jsx`; dispatch state is initialized as an empty in-memory list in Task 3.
- [ ] Confirm fixture records use stable IDs and no displayed copy describes them as live production data.
- [ ] Run `npm run lint` and `npm run build`; both must exit successfully.
- [ ] Commit only `src/dashboardData.js` and `src/Official.jsx` changes for this task.

### Task 2: Build navigable overview and sample operations views

**Files:**
- Create: `src/OverviewView.jsx`
- Create: `src/ReportsView.jsx`
- Create: `src/ResidentsView.jsx`
- Create: `src/MessagesView.jsx`
- Modify: `src/Official.jsx`
- Modify: `src/Official.css`

**Interfaces:**
- `ReportsView({ reports, onSelectReport, onCreateReport })` renders report rows and delegates row selection and the New report action.
- `ResidentsView({ residents })` owns resident search and selected-resident details.
- `MessagesView({ conversations, onReply })` owns selected-thread UI and delegates reply submission.
- `onReply(conversationId: string, body: string): void` appends a timestamped outgoing message to that conversation in shell state.

- [ ] Add Announcements to `navItems`; render only the selected navigation view in the main content area and close the mobile sidebar after navigation.
- [ ] Keep Overview as the default view; show title “Barangay Official” and the existing realtime date/time, with no morning greeting.
- [ ] Remove Active Teams and Response Time cards and the volunteer-mobilization summary item.
- [ ] Create `ReportsView` with severity/status, keyboard-operable report selection, an empty state, and a validated New report form that calls `onCreateReport`.
- [ ] Create `ResidentsView` with case-insensitive name/purok search, sample-data disclosure, selected-resident details, and a no-results state.
- [ ] Create `MessagesView` with sample-data disclosure, conversation selection, history, and a reply form that delegates the selected conversation ID and message body.
- [ ] Connect the views to shell state; implement `onReply` by appending a timestamped outgoing message and `onCreateReport` by appending a report with a generated `AB-` ID and empty dispatch history.
- [ ] Audit overview controls: wire each remaining action to its view or modal, or remove controls with no supported action.
- [ ] Run `npm run lint` and `npm run build`; manually navigate all views at desktop and mobile widths.
- [ ] Commit only the view components, `Official.jsx`, and `Official.css` changes for this task.

### Task 3: Make report creation, report details, and dispatch interactive

**Files:**
- Create: `src/DispatchView.jsx`
- Modify: `src/ReportsView.jsx`
- Modify: `src/Official.jsx`
- Modify: `src/Official.css`

**Interfaces:**
- `DispatchView({ reports, dispatches, onDispatch })` renders response type, target report, optional note, and recent sample dispatch records.
- `onCreateReport(reportInput)` accepts `{ type, severity, location, description }` and appends a report with a generated `AB-` ID, `Pending` status, current time, and empty dispatch history.
- `onDispatch({ reportId, responseType, note })` appends a dispatch record and updates that report's status and dispatch history.

- [ ] Add report detail selection showing location, description, and dispatch history when available.
- [ ] Show report details with location, description, and dispatch history; retain the New report form created in Task 2.
- [ ] Add Dispatch navigation content with response types Medical, Fire, Rescue, and Evacuation; require a target report and response type, allow an optional note, and show a confirmation after dispatch.
- [ ] On dispatch submission, update the selected report to `Assigned`, append the dispatch record to its history, and expose that updated history in report details.
- [ ] Keep new reports and dispatches in client state and label this behavior as a prototype.
- [ ] Run `npm run lint` and `npm run build`; manually create a report, dispatch to it, and verify its detail history and status update.
- [ ] Commit only `DispatchView.jsx`, `ReportsView.jsx`, `Official.jsx`, and `Official.css` changes for this task.

### Task 4: Persist and synchronize community announcements

**Files:**
- Create: `src/announcementService.js`
- Create: `src/AnnouncementsView.jsx`
- Create: `supabase/migrations/20261008000000_create_announcements.sql`
- Modify: `src/Official.jsx`
- Modify: `src/OverviewView.jsx`
- Modify: `src/Official.css`

**Interfaces:**
- `listAnnouncements(): Promise<Announcement[]>` returns rows ordered by `created_at` descending and throws on Supabase errors.
- `createAnnouncement({ title, body, author }): Promise<Announcement>` inserts and returns the created row; it throws on Supabase errors.
- `subscribeToAnnouncements(onInsert, onError): () => void` subscribes to table inserts, reports channel errors, and returns an unsubscribe function.
- `Announcement` rows use `{ id, title, body, author, created_at }`.

- [ ] Add the SQL table with UUID primary key, required title/body/author, creation timestamp, title length 1–120, body length 1–2000, and author length 1–80 constraints.
- [ ] Enable RLS; grant read to authenticated users with `app_metadata.barangay_role = 'official'`, grant insert only to authenticated officials with the same trusted claim, and add the table to the Supabase realtime publication using an idempotent migration operation. Do not grant anonymous insert or read.
- [ ] Implement `listAnnouncements`, `createAnnouncement`, and `subscribeToAnnouncements` around the existing `supabase` client.
- [ ] Add an Announcements view with loading, error, empty, and post states; order posts newest first and show author and localized creation time.
- [ ] Subscribe to inserts while the app is mounted; merge inserted rows by `id` so a concurrent initial fetch and realtime event cannot duplicate a post; unsubscribe on teardown.
- [ ] Validate title/body in the form, call Supabase before showing success, and preserve the draft with a visible error if loading or posting fails.
- [ ] Run `npm run lint` and `npm run build`; with two provisioned official clients, post from one and verify the other receives the post without refresh. Verify failed requests display an error and never report success.
- [ ] Commit only the announcement view/service, migration, `Official.jsx`, `OverviewView.jsx`, and `Official.css` changes for this task.

### Task 5: Add official authentication and dashboard access gate

**Files:**
- Create: `src/AuthGate.jsx`
- Create: `src/SignInView.jsx`
- Modify: `src/main.jsx`
- Modify: `src/Official.css`

**Interfaces:**
- `AuthGate({ children })` loads the Supabase session, listens to auth state changes, and renders loading, sign-in, access-denied, or authorized dashboard states.
- An authorized user has `session.user.app_metadata.barangay_role === 'official'`; pass that `user` to `Official({ user })`.
- `SignInView({ onSignIn, error, loading, signedOut })` submits `{ email, password }`; it has no sign-up action.

- [ ] Wrap `Official` in `AuthGate` from `src/main.jsx`; resolve current session with `supabase.auth.getSession()` and keep it synchronized with `onAuthStateChange`.
- [ ] Create an email/password sign-in form using `supabase.auth.signInWithPassword`; disable submission when Supabase is unconfigured or a request is pending, and show actionable errors.
- [ ] Render the dashboard only for the trusted `app_metadata.barangay_role === 'official'` claim; show a signed-in access-denied view with Sign out for other sessions.
- [ ] Do not add public sign-up. Document that an administrator must provision each account and set the official app metadata claim outside this client.
- [ ] Run `npm run lint` and `npm run build`; manually inspect signed-out, authorized, and non-official account states when configured credentials are available.
- [ ] Commit only `AuthGate.jsx`, `SignInView.jsx`, `main.jsx`, and `Official.css` changes for this task.

### Task 6: Complete per-user profile editing and sign out behavior

**Files:**
- Modify: `src/Official.jsx`
- Modify: `src/Official.css`
- Modify: `src/AuthGate.jsx`

**Interfaces:**
- `openProfileEditor()` initializes editable drafts from the currently saved local profile.
- `Official({ user })` receives the authenticated Supabase user from `AuthGate`.
- Profile local-storage key is `alertBarangay.profile.<user.id>`; default display name is `user.user_metadata.full_name || user.email`.
- `handleSignOut()` awaits `supabase.auth.signOut()`; only on success does `AuthGate` return to sign-in with a signed-out notice.

- [ ] Keep Edit profile and add Sign out to the profile menu; ensure the profile name and picture update in the header and are used as the announcement author.
- [ ] Key local profile data by authenticated user ID so separate officials on the same browser cannot see each other’s locally stored profile.
- [ ] Preserve image-only selection, the 1 MB limit, preview, and actionable file-read errors; invalid files must leave the current saved image intact.
- [ ] Implement sign out; on failure, leave the current authenticated view active and show an error. On success, clear only that user’s local profile data and show the sign-in view with a signed-out notice.
- [ ] Run `npm run lint` and `npm run build`; manually save a changed name/photo, reload to confirm per-user local persistence, then sign out and confirm the sign-in view appears.
- [ ] Commit only `Official.jsx`, `Official.css`, and `AuthGate.jsx` changes for this task.

### Task 7: Final integration review

**Files:**
- Modify only files required to fix integration issues found during review.

- [ ] Review every requirement in `docs/superpowers/specs/2026-10-08-barangay-official-dashboard-design.md` against the completed views and flows.
- [ ] Run `npm run lint` and `npm run build`; confirm both exit successfully.
- [ ] Manually inspect Overview, Reports, Dispatch, Residents, Messages, Announcements, profile editing, and sign out at desktop and mobile widths.
- [ ] Verify sign-in/session handling, role-gated dashboard access, role-gated announcement reads/inserts, realtime subscription cleanup, initial-load error state, insert error state, and duplicate suppression.
- [ ] Review `git status` and ensure no unrelated user changes are staged or included in any commit.
