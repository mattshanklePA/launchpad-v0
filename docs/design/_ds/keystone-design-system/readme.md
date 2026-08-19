# Keystone Design System

**Keystone** is an AI portfolio-governance product — software that helps leaders decide what to fund and watch what they launch. **Plumb** is its embedded AI assistant sub-brand. The name is locked; Keystone is the master brand, Plumb the assistant.

- **Tagline:** *The decision that locks it all in place.*
- **Subhead:** *Know what to fund. Watch what you launch.*

The identity is architectural: a **keystone** — the wedge-shaped stone at the crown of an arch that locks every other stone in place. That single metaphor drives the marks (wedge, arch, peaked wedge), the amber "attention" accent (the one stone that holds), and Plumb's mark (a **plumb line** — the tool that proves a structure is true and vertical).

## Sources given
This system was built from a brand **Identity Asset Kit** (no codebase or Figma was provided):
- `uploads/README.md` — brand kit manifest, type & license notes.
- `uploads/tokens.css` / `uploads/tokens.json` — color + type tokens (canonical; carried into `tokens/`).
- `uploads/config.json` — product config (`productName`, `assistantName`, tagline, subhead, colors).
- Logo/mark SVGs — copied verbatim into `assets/` (see Iconography).

No product screens, marketing copy, or component code were supplied. The UI kit and components here are **plausible, on-brand recreations** of a portfolio-governance app built from the identity kit — not copies of an existing product. Treat them as a starting vocabulary and correct against the real product when it exists.

---

## CONTENT FUNDAMENTALS

The voice is that of a **calm, senior operator** — a chief-of-staff who has read the whole portfolio and tells you the one thing that matters. Precise, structural, quietly confident. Never breathless, never salesy.

- **Casing:** Sentence case for everything — headings, buttons, labels. The wordmark "Keystone" and "Plumb" are the only title-cased proper nouns. Mono micro-labels (KPI eyebrows, table headers, status chips) are UPPERCASE with wide tracking.
- **Person:** Speak to the user as **you**; the product is **Keystone** (third person, never "we"). Plumb speaks in first person sparingly ("I flagged three launches this week").
- **Sentence shape:** Short declaratives. Lead with the decision or the number, then the reason. *"Fund Atlas. It clears every gate and returns in nine months."*
- **Verbs:** Load-bearing, architectural, decisive — *fund, gate, lock, flag, hold, watch, launch, clear, align, true up.* Avoid hype verbs (*supercharge, unlock, revolutionize*).
- **Numbers:** Concrete and comparative. Money in short form ($4.2M, $180K). Confidence as plain percentages. Status as words, not jargon.
- **Amber = attention, always.** In copy as in color, amber language ("flagged", "needs a decision", "off-plumb") is reserved for things that genuinely need a human. Don't cry wolf.
- **Emoji:** None. Ever. Status is carried by the color system and mono labels, not glyphs.
- **Tone examples:**
  - Empty state: *"Nothing off-plumb. Every active launch is inside its gates."*
  - Alert: *"Meridian slipped past its spend gate. Decision needed before the next release."*
  - Plumb suggestion: *"Two initiatives overlap on the same market. Want me to line them up side by side?"*
  - Button copy: *Fund initiative · Hold for review · Open gate · Ask Plumb.*

Avoid: exclamation points, "!", rhetorical questions in headings, "seamless / powerful / robust", and hedging ("might want to maybe consider").

---

## VISUAL FOUNDATIONS

**Overall vibe:** architectural, grounded, precise. Think engineered stone and blueprint — basalt and chalk surfaces, hairline structure, one warm amber stone that carries all the attention. It should feel like infrastructure you trust, not a consumer app.

**Color.** Basalt (`#2A333C`) is the primary — text and dark surfaces (nav, footers, inverse panels). Chalk (`#F4F2EC`) is the default canvas; white is for raised cards; limestone (`#E7E1D6`) for fields and dividers. **Active blue** (`#0086CA`) is the only interactive color — links, focus, selected states. **Amber** (`#C77D3A`, top-face `#DCA061`, text `#9C5F22`) is reserved strictly for the keystone mark and attention/alert flags — **never a decorative fill or a button background.** Semantic: green `#2E9E7B` (on-track), amber (attention), red `#C24A3A` (alert/stop). Palettes lean warm-neutral, low-saturation; the only saturated colors are the three interactive/semantic hues used sparingly.

**Typography.** Three OFL families: **Chivo** (headings — Bold 700 / Black 900 for display, Medium 500 for subheads; tight tracking on large sizes), **Hanken Grotesk** (body 400/500/600, generous 1.5 line-height), **JetBrains Mono** (micro-labels, KPI numbers, table headers, code — uppercase + 0.08em tracking for labels). Big numbers and headings are Chivo; running prose is Hanken; anything that reads as a "readout" is mono.

**Spacing & layout.** 4px base grid; components use 4/8/12/16/24. Generous whitespace, left-aligned, blueprint-like columns. Max content width ~1200px. Layout is orthogonal and calm — no diagonal or overlapping elements. Fixed top nav (basalt) and, in the app, a fixed left rail.

**Backgrounds.** Flat color only — chalk canvas, white cards, basalt panels. **No photographic hero imagery, no gradients as decoration, no illustration textures.** The only "texture" permitted is a faint 1px limestone gridline/blueprint rule used very sparingly for structure. Amber never appears as a background wash.

**Borders vs shadow.** Keystone leans on **hairline borders** (1px limestone) far more than shadow. Cards: white surface, 1px `--border-subtle`, `--radius-md` (8px), and only a soft `--shadow-sm` when raised (menus, modals get `--shadow-md`/`lg`). Shadows are always low, soft, and basalt-tinted (`rgba(42,51,60,…)`) — never colored, never large-spread glows.

**Corner radii.** Small and consistent: inputs/buttons 5px (`--radius-sm`), cards/panels 8px, modals 12px. The rounded-square **app-icon radius is 20px** — reserved for the icon/brand tile, not general UI. Nothing is fully pill-shaped except status chips and toggles (`--radius-pill`).

**Motion.** Calm and precise — `--ease-standard` / `--ease-out`, 120–260ms. Fades and small (2–4px) position shifts only. **No bounce, no spring, no large slides.** Amber flags may do a single gentle pulse to draw the eye, never a loop.

**Hover / press.** Hover = a small step darker (or a limestone tint on light rows), plus cursor and, on interactive text, the link-hover blue. Press = one more shade darker; buttons drop `translateY(1px)` and lose their shadow — a subtle "seat into place" (the keystone metaphor), never a scale bounce. Disabled = 45% opacity, no pointer.

**Focus.** Always visible: `--shadow-focus` — a 3px active-blue ring at 28% alpha. Accessibility is non-negotiable in a governance tool.

**Transparency & blur.** Used rarely: modal scrim is basalt at ~55% (no heavy blur), popover backgrounds are solid. Blur is not a brand motif.

**Imagery.** There is essentially none by default. If a photo is ever required it should be cool-toned, desaturated, architectural (built environment, structure), and cropped orthogonally — never warm lifestyle stock. Data visualization (bars, gates, gauges) is the real "imagery" of the product.

---

## ICONOGRAPHY

- **Brand marks** ship as SVGs in `assets/` (copied verbatim from the kit — never redrawn). Inventory:
  - `logo-wordmark.svg` — "Keystone" in Chivo Bold.
  - `logo-lockup.svg` — mark + wordmark, horizontal.
  - `mark-fullcolor.svg` — **primary** mark: two-tone amber keystone wedge (light top face, amber body).
  - `mark-arch.svg` — secondary: dark arch locked by an amber keystone at the crown.
  - `mark-abstract.svg` — peaked-wedge abstract mark.
  - `mark-literal.svg` — solid single-color wedge.
  - `mark-1color-black.svg` / `mark-reversed.svg` — one-color black / reversed white (for single-color and dark backgrounds).
  - `app-icon.svg` (rounded square) / `favicon.svg` (32px) — amber wedge on basalt.
  - `plumb-assistant.svg` — **Plumb** mark: a plumb line (vertical rule + blue plumb-bob) — used wherever the assistant appears.
- **UI icons:** no bespoke icon set was provided. This system standardizes on **Lucide** (https://lucide.dev) loaded from CDN — its 1.5–2px stroke, square-cut, geometric style matches Keystone's architectural, hairline aesthetic. Use `stroke-width: 1.75`, `currentColor`, 20–24px. **This is a substitution — flagged for the user.** If the product adopts a different icon set, swap the CDN link and update this section.
- **No emoji, no unicode glyphs as icons, no PNG icons.** All UI icons are inline/CDN SVG, monochrome, taking `currentColor`. Amber-colored icons only for genuine attention/alert states.

---

## INDEX / MANIFEST

**Root**
- `styles.css` — global entry (imports only; link this one file).
- `tokens/` — `fonts.css`, `colors.css`, `typography.css`, `spacing.css`, `effects.css`.
- `assets/` — brand marks, app icon, favicon, Plumb mark (SVG).
- `readme.md` — this file. `SKILL.md` — Agent-Skills wrapper.
- `thumbnail.html` — project tile.

**Foundation cards** (Design System tab — groups: Brand, Colors, Type, Spacing) — `guidelines/*.card.html`.

**Components** (`components/`, group "Components"): Button, IconButton, Input, Select, Checkbox, Radio, Switch, Card, Badge, StatusPill, Dialog, Tooltip. Each: `<Name>.jsx` + `<Name>.d.ts` + `<Name>.prompt.md`, with one card HTML per directory.

**UI kits** (`ui_kits/`): `keystone-app/` — the Keystone portfolio-governance console (portfolio dashboard, initiative detail with gates, and the Plumb assistant panel).

### Intentional additions
- **StatusPill** — a first-class component for on-track / attention / alert / neutral states, because status is the core visual language of a governance product and must be consistent everywhere.
- **Icon (via Lucide CDN)** — no glyph set was provided; documented substitution above.

## CAVEATS / substitutions
- **Fonts** load from Google Fonts CDN (all three are SIL OFL). For production, self-host the woff2 files and replace the `@import` in `tokens/fonts.css` with local `@font-face` rules.
- **UI icons** are Lucide (substitution — no set was provided).
- Component and UI-kit designs are **on-brand inventions**, not recreations of an existing product (none was provided).
