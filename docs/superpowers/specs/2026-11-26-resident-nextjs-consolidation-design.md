# Resident Next.js Dashboard Consolidation

## Intent

Make the root Next.js App Router application the single resident dashboard entered after resident sign-in. Preserve the useful resident experience in `resident-app`, the separate Vite application, without keeping a second resident authentication and incident workflow.

## Goals

- Route a signed-in resident to `/resident/dashboard` in the root Next.js application. Its existing profile-role routing already selects this destination.
- Keep the Next.js resident dashboard's authenticated incident reporting, offline queue, status updates, per-incident private chat, announcements, notification bell, and account settings as the canonical flows.
- Bring over useful resident-only functionality from the Vite dashboard that is absent from Next.js: community Reels with media upload, the live incident/community map, emergency contacts, and safety tips.
- Use the root app's existing Supabase browser/server clients, `profiles` roles, authenticated sessions, RLS, translations, and visual system.
- Keep all role authorization on the server/proxy and in database RLS. Resident UI state or user-supplied metadata must not grant access.

## Non-goals

- Do not create a second Next.js app inside `resident-app` or point authentication to a separate origin.
- Do not port the legacy `resident_messages` general inbox; private messages already belong to a report and are implemented through `incident_messages` in the root app.
- Do not port the placeholder appointments page, mock announcements, or the legacy dashboard's duplicate `reports` workflow.
- Do not change official/admin routing, the Supabase project, or existing database policies unless implementation review finds a concrete requirement.
- Do not delete the Vite project or its Android wrapper as part of this consolidation; treat it as legacy/rollback material and make the root Next.js app the documented source of truth.

## Current state and constraints

- The repository root is the Next.js 16 application. `src/lib/auth/roles.ts` maps residents to `/resident/dashboard`; `src/proxy.ts`, `dashboardForUser`, and `requireRolePage` enforce role-specific routing and access.
- `src/app/resident/dashboard/page.tsx` renders the current incident dashboard and assistant inside `RoleDashboard`.
- The current resident dashboard already uses `incidents`, private `incident_messages`, existing notifications, and account/profile routes.
- `resident-app/` is a standalone Vite/React app with an independent Auth flow and legacy `reports`/`resident_messages` usage. Its functional distinct features are community posts/media and an incident map, along with static safety tips and emergency contacts.
- The root already has Leaflet, `community_posts` schema and media storage policies, a profile editor, a language provider, notification support, and role-protected pages. Reuse these rather than adding dependencies or a second schema.
- The Vite folder includes a Capacitor Android wrapper configured to load a deployed URL. Keep those files intact; deployment URL changes are outside this work.
- There are pre-existing workspace changes in `.env.example` and `package-lock.json`; preserve them.

## Approaches

1. **Use the root Next.js app as the resident application (selected).** Keep `/resident/dashboard` as the role destination, and add the resident community/map and safety/contact features as protected Next.js routes or focused components. Reuse the root auth, database model, and UI. This avoids a second origin, session handoff, and duplicate incident workflows.
2. **Convert `resident-app` into a separate Next.js application.** This would retain a standalone resident deployment, but requires a deployment URL, a second auth entry point, and a reliable session handoff while duplicating incident and chat features already implemented in the root app. This conflicts with the chosen single-dashboard direction.

The user selected approach 1. The builder may choose focused route/component boundaries that fit the current App Router structure, while retaining the behavior listed in Goals.

## Proposed behavior

- Resident sign-in continues to resolve the account's database role and replace the login route with `/resident/dashboard`. The dashboard index route `/resident` continues to redirect there.
- The resident shell links to its dashboard, community feed/map, safety/contact information, account settings, notifications, and sign-out. All resident pages use `requireRolePage("resident")` and the shared `RoleDashboard` shell.
- Community Reels use `community_posts` and the existing private `community-media` bucket/policies. They retain authenticated feed viewing, own-post publishing/removal, captions, image/video media, and the existing responsive swipe/feed and map behavior where practical. Community media URLs are signed through the authenticated client; no service key is exposed to the browser.
- The map reads only the existing incident and community-post data allowed to the signed-in user and reuses the root app's established map libraries. It does not introduce new public incident access.
- The map retains its report-entry flow: residents can use GPS or tap to place the report pin, choose an incident type, and attach up to five photos or one video. It writes to the same `incidents` table and `incident-media` bucket as the dashboard form, using the existing `media_paths`/`media_types` columns and own-folder RLS. The dashboard form remains available as the simpler GPS/address entry point; both flows refresh the same incident list and chat thread.
- Safety tips and emergency contact entries retain the resident app's current content and actions (call/copy). Emergency dispatch continues to be directed to the hotline.
- Notifications, report status, report creation, and report chat remain backed by the existing root Next.js components and current Supabase model. No separate legacy message inbox is shown.
- Account details, password/photo settings, language, and theme continue to use the root `/account` page and shared providers.
- The legacy Vite source and Capacitor wrapper are left in place for rollback; repository documentation identifies the root Next.js app and `/resident/dashboard` as the active resident experience.

## Verification expectations

- Resident sign-in resolves to `/resident/dashboard`; direct access to the resident community and safety routes rejects signed-out, inactive, and non-resident accounts through the existing guards.
- Community feed load, authorized media viewing, post creation, and own-post removal work with existing RLS and storage policies; other users' media cannot be modified.
- Map renders on small and wide screens, handles no coordinates/media and denied location permission, and never treats a client role as authorization. Pin-based submissions preserve up to five images or one video, and failed uploads clean up stored media.
- Existing incident filing, offline queueing, report chat, notifications, account flows, and official/admin role routing remain functional.
- Typecheck, lint, relevant tests, and production build pass after implementation; tests should cover the new route guards and extracted community behavior.

## Builder decisions

- The exact URL split for the community and safety screens, component extraction, and visual adaptation are implementation choices. Keep route names resident-scoped and preserve the behavior above.
- Existing static emergency contact values are copied as-is; replacing them with administratively managed settings is a separate data/product change.
- Do not modify the user's unrelated working-tree changes.
