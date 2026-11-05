# Dashboard announcement focus design

## Intent
Make community announcements the primary content of the official dashboard and remove report publishing and report browsing from its interface.

## Goals and boundaries
- Lead Overview with announcements and make the Announcements view the first navigation destination.
- Remove report creation, report listing, and report summary UI from the dashboard.
- Keep incident data loading and Dispatch workflows intact because Dispatch relies on those records.
- Do not change database schema or delete existing report data.

## Approaches
- Remove only the report creation control: leaves report browsing as a prominent distraction.
- Remove all report UI and prioritize announcements, retaining report data behind Dispatch: selected because it matches the request while preserving dispatch operations.
- Remove report and dispatch data handling: rejected because Dispatch depends on it and the request only removes reporting from this dashboard.

## Implementation calls
Keep Overview as the app entry point, but place the announcement section first and give it the main visual emphasis; retain secondary emergency coordination content as appropriate. Remove Reports navigation and report screen access, but retain Dispatch's report loading and dispatch mutations. Remove report-specific imports/state/helpers that no longer serve Dispatch.
