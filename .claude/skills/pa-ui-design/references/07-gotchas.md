# Gotchas

## shadcn Outline Variant Overrides Custom Classes

Do not use `variant="outline"` with custom border/text colors; the variant can override your custom classes.

Preferred approach: omit the variant and use raw classes.

## Prose Overrides (`prose` / `prose-lg`)

When content is wrapped in `prose prose-lg`, use the `!` prefix to force styles:

```tsx
// Wrong - prose overrides
<div className="text-xl md:text-2xl font-bold">

// Correct
<div className="!text-xl md:!text-2xl font-bold">
```

Common overrides:
- Text sizing: `!text-lg`, `!text-xl`, `!text-2xl`
- Icon sizing: `!w-8`, `!h-8`, `!w-12`, `!h-12`

## No Emojis in Badges

Badges should be text-only.

## Contact Form Link Pre-Population

Contact links should pre-populate the message field and include UTM parameters.

URL encoding reminders:
- Spaces: `%20`
- Line breaks: `%0A`
- Brackets: `%5B` and `%5D`
