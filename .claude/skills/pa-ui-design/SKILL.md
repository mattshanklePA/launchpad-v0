---
name: pa-ui-design
description: Packaged Agile UI design system for React/Next.js using Tailwind and shadcn/ui. Use when the user wants PA-branded UI, asks to style a page/component, or mentions Packaged Agile, PA brand, shadcn, Tailwind, layout patterns, motion, or accessibility.
compatibility: React/Next.js + Tailwind CSS + shadcn/ui; portable skill (no absolute local KB paths)
metadata:
  owner: packaged-agile
  category: ui-design
---

# Packaged Agile UI Design System

Use this skill to create intentional, brand-consistent PA interfaces.

## When To Use

Use when the user says things like:
- "Make this look like Packaged Agile"
- "Style this page" / "Make this UI match our brand"
- "Use shadcn" / "Use Tailwind" / "Add motion"
- "Improve accessibility"

## Decision Tree (Pick The Right Reference)

Need PA UI help?

- New page / layout -> `references/03-layout-patterns.md`
- Style existing component -> `references/04-components-shadcn.md`
- Brand colors / theming -> `references/01-colors.md`
- Typography / spacing -> `references/02-typography.md`
- Animations / motion -> `references/05-animation-motion.md`
- Accessibility review -> `references/06-accessibility.md`
- Weird styling behavior / pitfalls -> `references/07-gotchas.md`
- Copy/paste snippets -> `quick-reference.md`

## Core Rules (Short)

- Use PA primary blue `#0086ca` with hover `#147bbb` for primary interactions.
- Use Radikal for headings when available; always prefer readable leading (`leading-normal`).
- Use consistent motion: cards `duration-300` + `hover:scale-105`, buttons `duration-200` + `hover:scale-105`.
- Use section dividers between major sections; keep layouts mobile-first.
- Accessibility is not optional: keyboard navigation, focus states, contrast.

## How To Apply This Skill

1. Identify the user goal (new page, restyle, layout issue, accessibility, etc.).
2. Load only the relevant reference file(s) listed above.
3. Apply the defaults first; introduce alternatives only when needed.
4. If assets/fonts are missing in the project, ask before inventing new ones.

## Activation Examples (Expected Behavior)

- "Style this dashboard to match PA" -> read `references/03-layout-patterns.md` + `references/04-components-shadcn.md` + `references/01-colors.md`
- "Make these cards feel more interactive" -> read `references/05-animation-motion.md` + `references/07-gotchas.md`
- "Our headings feel cramped" -> read `references/02-typography.md` and enforce `leading-normal`
- "Fix focus states / keyboard nav" -> read `references/06-accessibility.md`
- "Give me a primary button + card snippet" -> read `quick-reference.md`
