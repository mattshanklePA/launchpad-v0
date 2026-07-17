One-line: Keystone's primary action button — basalt-filled primary, outline secondary, ghost, and alert-red danger; amber is never a button fill.

```jsx
<Button variant="primary" onClick={fund}>Fund initiative</Button>
<Button variant="secondary">Hold for review</Button>
<Button variant="ghost" size="sm">Cancel</Button>
```

Variants: `primary` (basalt), `secondary` (white + limestone border), `ghost` (transparent), `danger` (alert red). Sizes `sm | md | lg`. Press seats down 1px and drops shadow. Pass `iconLeft` / `iconRight` a 16–20px Lucide SVG. Focus shows the active-blue ring automatically.
