# Typography

## Primary Typeface: Radikal

Radikal is the PA display typeface.

```ts
// tailwind.config.ts
fontFamily: {
  sans: ['Radikal', 'ui-sans-serif', 'system-ui', 'sans-serif'],
  radikal: ['Radikal', 'sans-serif'],
}
```

## Typography Scale

| Token | Tailwind Classes | Usage |
|-------|------------------|-------|
| Display XL | `text-6xl font-bold` | Hero headlines |
| Display L | `text-5xl font-bold` | Page titles |
| H1 | `text-4xl font-bold leading-normal` | Section headers |
| H2 | `text-3xl font-bold` | Subsection headers |
| H3 | `text-2xl font-semibold` | Card titles |
| H4 | `text-xl font-semibold` | Component titles |
| Body Large | `text-lg` | Important body text |
| Body | `text-base` | Standard body text |
| Caption | `text-sm` | Metadata, captions |

## Hard Rule

Always use `leading-normal` for titles (avoid `leading-tight`).
