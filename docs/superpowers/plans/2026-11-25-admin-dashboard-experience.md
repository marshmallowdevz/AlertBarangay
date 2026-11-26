# Admin Dashboard Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add clear admin account rows, settings and support contact, shared announcement CRUD, appearance controls, live activity notifications, and an avatar profile menu.

**Architecture:** Keep the current Next.js App Router and Supabase architecture. Put privileged writes behind `requireAdmin()` API routes, store announcements and notifications in Supabase, and subscribe to their changes from a shared client topbar. Use local storage for per-admin appearance preference.

**Tech Stack:** Next.js App Router, React, TypeScript, Supabase, CSS, lucide-react.

**Spec:** `docs/superpowers/specs/2026-11-25-admin-dashboard-experience-design.md`

## Global Constraints

- Admin mutations require active administrator authorization.
- Announcements are stored in a shared Supabase table for other dashboards to consume.
- Account and announcement activity is visible to admins and updates through Supabase Realtime.
- Theme options are System, Light, and Dark.
- Settings support contact defaults to the signed-in administrator email.

## Review Focus

- Non-admin API requests must not read or mutate announcements or activity.
- Realtime updates must not expose another user's private notification state.
- Empty or invalid announcement content must be rejected server-side.
- Theme selection must work across refreshes and honor system preference when selected.
- Profile edits must only change the signed-in user's display name.

---

### Task 1: Shared database foundation

**Files:**
- Create: `supabase/migrations/202611250002_admin_announcements_notifications.sql`
- Modify: `README.md`

**Interfaces:** Create shared `announcements` with title/body/published timestamps, `admin_notifications` with event type/message/optional subject, and `admin_notification_reads` keyed by notification and admin. Grant authenticated users read access to published announcements; grant active admins announcement CRUD and notification access. Enable Realtime for notifications.

- [ ] Add idempotent schema, indexes, RLS policies, grants, and Realtime publication membership.
- [ ] Document migration application and the shared announcement read contract.
- [ ] Review policies for least privilege and rerunnable SQL.

### Task 2: Secured announcement and activity APIs

**Files:**
- Create: `src/app/api/admin/announcements/route.ts`
- Create: `src/app/api/admin/announcements/[id]/route.ts`
- Create: `src/app/api/admin/notifications/route.ts`
- Modify: `src/app/api/admin/users/route.ts`

**Interfaces:** Announcement GET/POST and PATCH/DELETE use admin client after `requireAdmin()`. Activity GET returns recent admin notifications and unread count; PATCH marks selected notifications read. Successful account creation writes an account-created notification.

- [ ] Implement validated list/create/update/delete operations and activity read/acknowledge operations.
- [ ] Preserve account creation rollback behavior if activity insert fails by logging activity best-effort after successful audit.
- [ ] Ensure errors use existing `jsonError` patterns and response cache is disabled for activity.
- [ ] Review every route for authorization and input validation.

### Task 3: Shared admin topbar and appearance controls

**Files:**
- Create: `src/components/admin/admin-topbar.tsx`
- Modify: `src/components/admin/admin-shell.tsx`
- Modify: `src/components/admin/account-overview.tsx`
- Modify: `src/components/admin/users-dashboard.tsx`
- Modify: `src/app/globals.css`

**Interfaces:** `AdminTopbar` accepts `email` and `fullName`; exposes System/Light/Dark preference, Realtime activity count/menu, and avatar menu with profile edit and sign-out. `AdminShell` loads current profile name and supplies identity.

- [ ] Replace static top-right controls on both pages with the shared component.
- [ ] Subscribe to notification inserts and update unread count and feed; mark items read when opened.
- [ ] Persist theme selection and apply system preference when selected.
- [ ] Add profile edit interface that updates only `profiles.full_name` through the authenticated Supabase client.
- [ ] Add visual states and responsive styling for menus, theme, and popovers.

### Task 4: Settings and announcement CRUD pages

**Files:**
- Create: `src/app/admin/settings/page.tsx`
- Create: `src/app/admin/announcements/page.tsx`
- Create: `src/components/admin/settings-page.tsx`
- Create: `src/components/admin/announcements-dashboard.tsx`
- Modify: `src/components/admin/sidebar.tsx`
- Modify: `src/app/globals.css`

- [ ] Enable Settings and Announcements navigation links.
- [ ] Show support contact using current administrator email and practical contact guidance.
- [ ] Implement announcement list, create, edit, publish/unpublish, and delete.
- [ ] Make published announcement records suitable for shared dashboards to read.
- [ ] Verify route access remains within the protected admin layout.
