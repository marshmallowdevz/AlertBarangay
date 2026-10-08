# Barangay Official Dashboard Design

Date: 2026-10-08

## Purpose

Make the Barangay Official dashboard a useful, interactive prototype for barangay emergency coordination. Officials should be able to navigate reports, dispatches, residents, and messages; edit their displayed profile; post community announcements that appear for other users; and sign out. The overview should use the title “Barangay Official”, omit the personalized morning greeting, retain a realtime date and clock, and remove the Active Teams and Response Time metrics.

## Agreed scope and assumptions

- Keep the existing React/Vite application and its dashboard visual style.
- Reports, dispatches, residents, and messages use representative sample data held in the client. They are interactive prototype views, not live operational records.
- Announcements are persisted in Supabase and synchronized between open clients. This is the shared feature explicitly requested.
- Profile name and picture are saved in this browser, matching the current implementation. They are not an account-wide profile.
- The current application has no sign-in flow. Sign out will clear any active Supabase client session if present and show a signed-out state; it cannot revoke a session that the app never established.
- No unrelated backend or resident-facing application is added.

## Dashboard behavior

### Shell and overview

- Change the heading to “Barangay Official”; keep the realtime local date and time.
- Remove Active Teams and Response Time cards and related display content.
- Keep the emergency hotline and existing overview content where useful.
- Sidebar entries navigate to Overview, Reports, Dispatch, Residents, Messages, and Announcements. Navigation changes the main panel and closes the mobile menu.
- Search, notification, navigation, profile, and sign-out controls either perform their represented action or are removed if they have no supported action. No inert controls remain.

### Reports

- Show the sample incident list in a dedicated Reports view with useful status/severity labels.
- Selecting a report opens its details, including location, report description, and dispatch history where available.
- “New report” opens a validated form and adds a report to the in-memory sample collection.
- Report state resets on refresh; this is clearly prototype data.

### Dispatch

- Show sample reports needing response and a dispatch action.
- Dispatch flow collects response type (Medical, Fire, Rescue, or Evacuation), target incident, and an optional note; submitting adds a dispatch record to client state and updates the selected incident's status/history.
- Confirmation and validation errors are visible to the user. Dispatches reset on refresh.

### Residents

- Show a searchable, representative sample of registered residents with name, purok/address, and contact details.
- Selecting a resident opens their details. The view must label its list as sample data so “live” does not imply a production connection.

### Messages

- Show sample conversations and their message history. Selecting a conversation shows its thread; replying appends a message in client state.
- Message state resets on refresh and is labeled as sample data.

### Announcements

- Add an Announcements view and an “Announce” action with title and body fields, validation, author display name, and creation time.
- Persist posts in a Supabase `announcements` table. Load newest-first and subscribe to inserts so other open clients see new posts without refreshing. Unsubscribe on view/application teardown.
- Report loading, posting, and subscription failures in the interface; do not silently fall back to browser-only storage because that would falsely imply that other users can see the post.
- The implementation plan must include the SQL schema and Row Level Security policies needed by the current unauthenticated app. Public reads and inserts are required for this app's present behavior; constrain title/body lengths and required fields in both UI and database. Revisit the write policy if authentication is added.

### Profile and sign out

- Keep profile editing in the profile menu: edit display name and upload a supported image with size validation and preview. Persist the result in local storage and display it consistently in the header and announcement author field.
- Add Sign out to the profile menu. Call Supabase sign out, clear local profile state for the current session, and show a signed-out state. Since no login view exists, the signed-out state should explain that the session has ended rather than imply that login is available.

## Data and component boundaries

- Keep the top-level `Official` component as the application shell and move substantial view/form behaviors into focused components or small helpers as needed.
- Keep sample records in a clearly named fixture/data module or clearly separated constants, distinct from Supabase announcement persistence.
- Add a small announcement data helper around the existing Supabase client for initial load, insert, and realtime subscription cleanup.
- Do not treat browser local storage or fixture data as a source of shared, production operational data.

## Error handling and accessibility

- Validate required form fields and display actionable inline errors.
- Show loading, empty, and error states for the Supabase announcement view.
- Use semantic buttons and form labels, keyboard-operable navigation and detail selection, dialog labels, and visible focus indicators.
- Preserve responsive layout for the existing mobile sidebar and tables.

## Verification

- Run the existing production build and lint command after implementation.
- Manually inspect the overview and each view at desktop and mobile widths; confirm profile editing, report selection/creation, dispatch creation, resident search/details, message replies, announcement load/post/realtime updates, and sign out.
- Confirm public announcement policies match the unauthenticated app, and that failed Supabase requests show errors without pretending a post was shared.

## Out of scope

- Connecting the sample report, dispatch, resident, or message records to new production tables.
- Authentication screens, user roles, private announcements, image hosting, or account-wide profile storage.
- Sending SMS, email, push notifications, or emergency dispatch commands to real responders.
