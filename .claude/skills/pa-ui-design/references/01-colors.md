# Colors

## Primary Brand Colors

| Name | Hex | Usage |
|------|-----|-------|
| PA Blue (Primary) | `#0086ca` | Buttons, links, accents, primary CTAs |
| PA Blue Hover | `#147bbb` | Hover states, active elements |
| PA Blue Light | `#44ace0` | Light accents, backgrounds |
| PA Blue Lighter | `#00a1dc` | Subtle highlights |

## Secondary Colors

| Name | Hex | Usage |
|------|-----|-------|
| PA Red | `#ee2a3e` | Alerts, errors, destructive actions |
| PA Yellow | `#ffd107` | Warnings, highlights |
| PA Green | `#2ca249` | Success states |
| PA Purple | `#52398f` | Accent, secondary brand element |
| PA Orange | `#f06325` | Call-outs, energy |

## Tailwind Configuration (Example)

```ts
// tailwind.config.ts
colors: {
  primary: {
    DEFAULT: "#0086ca",
    light: "#44ace0",
    foreground: "#ffffff",
  },
  "pa-black": "#000000",
  "pa-purple": "#52398f",
  "pa-red": "#ee2a3e",
  "pa-blue": "#0086ca",
}
```

## CSS Class Pattern

Prefer direct hex for brand colors:

```css
bg-[#0086ca]        /* Primary blue */
hover:bg-[#147bbb]  /* Hover state */
border-[#0086ca]    /* Brand border */
text-[#0086ca]      /* Brand text */
```
