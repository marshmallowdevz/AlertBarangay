# Dashboard Announcement Focus Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Remove report publishing and browsing from the official dashboard interface, and make announcements its primary content while preserving Dispatch.

**Architecture:** Keep report data loading and dispatch mutations in `Official.jsx`; remove report view access and report-only dashboard state/helpers. Reorder Overview content to show announcements first and prioritize the Announcements navigation item.

**Tech Stack:** React 19, Vite, CSS.

**Spec:** `docs/superpowers/specs/2026-11-05-dashboard-announcement-focus-design.md`

## Global Constraints

- Do not change the database schema or delete existing report data.
- Keep incident data loading and Dispatch workflows intact.
- Remove report creation, report listing, and report summary UI from the dashboard.

## Review Focus

- Dispatch still loads incidents and can record dispatch responses.
- Report views are unreachable through sidebar or Overview controls.
- Announcements are the first dashboard content and the primary navigation destination.

---

### Task 1: Prioritize announcements and remove report UI

**Files:**
- Modify: `src/Official.jsx` — navigation order and report view/state wiring; retain report fetching and dispatch handling.
- Modify: `src/OverviewView.jsx` — remove report summary/feed and place announcements first.
- Modify: `src/Official.css` — announcement prominence if existing layout styles need adjustment.
- Modify: `src/reportService.js` — remove unused report creation API while retaining list and dispatch APIs.
- Delete: `src/ReportsView.jsx` — remove report listing and report creation UI.
- No test files: this project has no component test setup, and this task does not add one.

**Interfaces:**
- Consumes: existing `AnnouncementsView`, announcement callbacks, and `DispatchView` props.
- Produces: overview and navigation without report access, with Dispatch unchanged.

- [x] Remove Reports sidebar item, ReportsView import/render, selected-report state and navigation helpers, and report creation wiring. Keep report list loading, `dispatchReport`, and report state needed by `DispatchView`.
- [x] Update OverviewView props and markup to remove report counts, incident feed, and report links; lead with Community announcements, including the announce action and loading/error/retry states.
- [x] Move Announcements ahead of other secondary navigation items so it is the primary destination after Overview.
- [x] Review for stale report-only props/imports and confirm Dispatch receives the same incident collection and handler as before.
