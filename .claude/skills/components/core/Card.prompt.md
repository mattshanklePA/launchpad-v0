One-line: The workhorse content surface — white, hairline limestone border, 8px radius; pair with `CardHeader` for a mono eyebrow + title.

```jsx
<Card>
  <CardHeader eyebrow="Portfolio return" title="YTD performance" action={<IconButton label="Options"><MoreVertical size={18}/></IconButton>} />
  …
</Card>
```

Use `interactive` for clickable cards (adds hover border + shadow), `raised` for floating panels. Default is flat with a border — don't stack heavy shadows.
