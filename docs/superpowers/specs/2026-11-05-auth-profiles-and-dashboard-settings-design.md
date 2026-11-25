# Authenticated Profiles and Shared Dashboard Settings Design

## Intent
Keep the dashboard open while the admin dashboard is being built, preserving shared profile, announcements, and contact editing. Retain the auth route as an opt-in for a later admin rollout. Remove Today's checklist and the "Emergency Ops" subtitle.

## Goals
- Keep `/login` and `/dashboard` behind `VITE_REQUIRE_AUTH=true`; sign-in is off by default and `/` opens the dashboard (or the optional landing page after branch merge).
- When auth is enabled, use Supabase email/password sign-in for provisioned accounts with the trusted `app_metadata.barangay_role = official` claim; do not add public sign-up.
- With auth enabled, save each user's display name and profile picture under their authenticated user ID with owner-only row access; while auth is off, use one shared dashboard profile.
- Keep emergency and call-center phone numbers shared in the existing singleton dashboard settings record, editable by dashboard users and readable by other clients.
- Keep announcements shared and visible to all clients; preserve the existing newest-first fetch and realtime insert feed. Open mode permits anonymous posting; a future auth rollout must also apply a migration that restricts anonymous writes.
- Remove Today's checklist and the "Emergency Ops" brand subtitle.
- Carry forward the prior request to remove report creation/browsing while keeping Dispatch.

## Non-goals
- Modify the landing-page branch or integrate/merge branches in this task.
- Add public account registration, password reset, or a resident-dashboard implementation.
- Change announcement content or remove existing database records.

## Approaches
- Add a login gate at the current root: simplest now, but takes over `/` and conflicts with the public landing-page entry point when branches merge.
- Add separate `/login` and `/dashboard` paths, leaving `/` to the landing page after merge: selected by the user because they plan to merge the landing-page branch later.

## Data and access
- Create a `dashboard_profiles` table keyed by `auth.users.id`; RLS allows each authenticated account to select and update only its own row.
- Add `emergency_phone` and `call_center_phone` to the shared singleton `dashboard_settings` row. Preserve the existing name and picture columns for compatibility, but stop using them as a shared profile.
- Keep shared dashboard settings readable to anonymous and authenticated clients. Restrict contact updates and announcement inserts to authenticated official accounts. Keep announcement reads available to anonymous and authenticated clients so other clients can continue to read shared posts.
- Keep the existing announcement table and realtime publication; preserve the existing initial fetch and insert subscription.

## Interim open mode
The user asked to remove sign-in until an admin dashboard exists. `VITE_REQUIRE_AUTH` therefore defaults off. In this mode the profile is shared and anonymous visitors can post announcements, edit shared contacts, and dispatch. Setting the flag to `true` restores the prepared login UI but does not by itself secure database writes; a later migration must restrict anonymous policies and RPC access.

## Implementation calls
Use existing Supabase Auth accounts and email/password sign-in. Show a sign-out action. Use the Supabase auth user ID as the profile key, with email as a fallback display name until the user edits it. Do not migrate the existing global profile name/photo into every user's profile. Store phone numbers as editable contact values; retain the current fixed labels and service-hours copy.