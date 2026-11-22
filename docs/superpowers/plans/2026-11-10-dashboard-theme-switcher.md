# Dashboard Theme Switcher Implementation Plan

> **For agentic workers:** Use `superpowers:executing-plans` to implement this plan task by task. Steps use checkbox syntax for tracking.

**Goal:** Let each dashboard user select Light, Dark, or System appearance from the top bar and remember the choice in that browser.

**Architecture:** Keep theme mode in the official dashboard shell, persist explicit choices in `localStorage`, and resolve System mode with `prefers-color-scheme`. Apply a root `data-theme` attribute and use shared CSS tokens plus themed surface colors across existing views.

**Tech Stack:** React, browser localStorage and matchMedia, CSS.

**Spec:** `docs/superpowers/specs/2026-11-10-dashboard-theme-switcher-design.md`

## Global Constraints

- Preserve the current light palette as Light mode.
- System is the default and follows operating system preference.
- Save preferences in the current browser only; do not add account or server storage.
- Keep both palettes legible across dashboard views.

## Review Focus

- Invalid or unavailable stored preferences must fall back to System without breaking dashboard startup.
- System mode must respond to operating system theme changes while the dashboard is open.
- Explicit Light or Dark selection must persist after reload.
- Dark mode must keep controls, forms, dialogs, status labels, and secondary text readable.
- The top-bar selector must remain keyboard accessible and usable on narrow screens.

---

### Task 1: Add persisted theme control and dashboard palettes

**Files:**
- Modify: `index.html` — initialize the saved or system theme before the dashboard paints.
- Modify: `src/Official.jsx` — own the theme mode, follow system changes, and render the top-bar selector.
- Modify: `src/Icon.jsx` — add the appearance icons used by the selector.
- Modify: `src/Official.css` — define the dark palette and route dashboard surfaces, borders, and text through theme-aware values.

**Interfaces:**
- Theme mode values are exactly `system`, `light`, and `dark`.
- Persist the selected mode under `alertBarangay.theme`.
- Set `document.documentElement.dataset.theme` to the resolved value `light` or `dark`.

- [x] Read and validate the saved theme; use System for a missing or invalid value.
- [x] Apply the resolved theme before rendering and subscribe to system preference changes only while System is selected.
- [x] Add an accessible top-bar button and menu for Light, Dark, and System, with the current choice indicated.
- [x] Add dark theme tokens and update hard-coded light surfaces so all dashboard panels and controls adapt.
- [x] Run lint and diff checks; browser UI inspection was not performed.
