---
name: keystone-design
description: Use this skill to generate well-branded interfaces and assets for Keystone (the AI portfolio-governance product) and its assistant Plumb — for production or throwaway prototypes/mocks. Contains essential design guidelines, colors, type, fonts, brand assets, and UI kit components for prototyping.
user-invocable: true
---

Read the README.md (readme.md) file within this skill, and explore the other available files.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.

Key facts:
- `styles.css` — link this one file for all tokens and fonts.
- `tokens/` — colors, typography, spacing, effects, fonts (Chivo / Hanken Grotesk / JetBrains Mono, all OFL via Google Fonts).
- `assets/` — brand marks (keystone wedge), app icon, favicon, Plumb (plumb-line) mark.
- `components/` — React primitives (Button, IconButton, Input, Select, Checkbox, Radio, Switch, Card, Badge, StatusPill, Dialog, Tooltip). Each has a `.prompt.md`.
- `ui_kits/keystone-app/` — the portfolio-governance console recreation.
- Brand rules: amber is only for the keystone mark and attention/alert states — never a decorative fill or button. Active blue is the only interactive color. No emoji. Sentence case; mono uppercase micro-labels.

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.
