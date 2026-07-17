One-line: The status vocabulary of Keystone — a colored dot + mono word for initiative/gate health. Use this everywhere status appears so it stays consistent.

```jsx
<StatusPill status="healthy" />          {/* On track */}
<StatusPill status="alert" />            {/* Off plumb */}
<StatusPill status="attention">Needs decision</StatusPill>
<StatusPill status="healthy" solid />
```

Statuses: `healthy` (green), `attention` (amber), `alert` (red), `neutral` (grey). Default outline+dot; `solid` for a filled pill. Override the word via children.
