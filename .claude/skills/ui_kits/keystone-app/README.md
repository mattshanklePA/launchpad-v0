# Keystone App — UI kit

A high-fidelity, click-through recreation of the **Keystone portfolio-governance console**. Built entirely from the brand identity kit (no product source existed) — treat it as an on-brand starting point, not a copy of a shipping product.

## Screens & interactions
- **Portfolio dashboard** (`Dashboard.jsx`) — KPI strip, searchable initiative table with gate-progress bars and `StatusPill`s. Click any row to open its detail.
- **Initiative detail** (`InitiativeDetail.jsx`) — header with fund/hold actions, an attention banner for off-plumb items, a gate timeline, financial stats, and a Plumb note. "Hold for review" opens a `Dialog`.
- **Plumb assistant** (`PlumbPanel.jsx`) — slide-over chat panel (open via the rail's blue button or "Ask Plumb"). Type and send to see a canned reply.
- **Shell** (`Shell.jsx`) — fixed basalt left rail + top bar.

## Composition
`index.html` mounts everything and loads the design-system bundle. Screens compose the published primitives (`Button`, `Card`, `StatusPill`, `Badge`, `Input`, `Dialog`) from `window.KeystoneDesignSystem_37ff67` — they are not re-implemented here. Icons are Lucide (CDN). Sample data lives in `data.js`.

Open `index.html` to interact.
