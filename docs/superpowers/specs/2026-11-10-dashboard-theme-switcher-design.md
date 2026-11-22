# Dashboard Theme Switcher Design

## Intent

Let dashboard users choose Light, Dark, or System appearance from a control in the top bar, so the dashboard can follow personal preference and system settings.

## Goals and non-goals

- Add a top-bar control with Light, Dark, and System options.
- Use System as the default and follow `prefers-color-scheme` while selected.
- Save explicit choices in this browser and apply the selected appearance across dashboard views.
- Do not add account or server-side preference storage.

## Approaches

- **Top-bar selector (selected):** visible and quick to reach; use a compact button/menu and browser storage.
- **Profile-menu selector:** keeps the top bar simpler but adds a step to reach appearance controls.
- **Separate settings screen:** allows room for more preferences but is too large for this single setting.

## Constraints and implementation calls

- Preserve the current light palette as Light mode.
- Add a dark palette through shared CSS variables and update hard-coded surface colors where needed so cards, forms, dialogs, navigation, and text remain readable.
- Apply the theme before the dashboard paints where practical to avoid a flash of the wrong theme.
- The builder chooses the compact accessible menu markup and icon using the project's existing styles and icon set.

## Success criteria

- Users can switch among Light, Dark, and System from the top bar.
- System mode responds when the operating system theme changes.
- An explicit selection persists after reload in the same browser.
- All dashboard views remain legible in both palettes.
