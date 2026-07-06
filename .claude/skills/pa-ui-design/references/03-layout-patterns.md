# Layout Patterns

## Standard Container

```tsx
<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
  {/* Content */}
</div>
```

## Hero Section (With Sticky Header)

```tsx
<section className="bg-gradient-to-br from-blue-800 to-purple-700 text-white py-24 md:py-32 min-h-[640px] flex items-center">
  <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
    <div className="text-center">
      <h1 className="text-4xl md:text-6xl font-bold leading-normal text-white mb-6">Hero Title</h1>
    </div>
  </div>
</section>
```

Key rules:
- Minimum padding: `py-24 md:py-32` (avoid `py-16` heroes)
- Minimum height: `min-h-[640px]`
- Vertical centering: `flex items-center`

## Content Pages Without Hero

```tsx
<div className="bg-white py-24 md:py-32">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
    <h1 className="text-4xl md:text-5xl font-bold font-radikal text-gray-900 mb-6">Page Title</h1>
  </div>
</div>
```

## Anchor Link Scroll Offset

```tsx
<section id="target-section" className="py-16 bg-white scroll-mt-16">
  {/* Section content */}
</section>
```

## Authentication Pages

Centered card layout with logo above and subtle gradient background.

Key rules:
- Card max-width: `max-w-md`
- Logo spacing: `mb-8`
- Form spacing: `space-y-5`
- Input height: `h-11` (44px touch target)

## Dashboard Layout

Sidebar + header + content area.

Key rules:
- Sidebar: `w-64`
- Header: `h-16`
- Content: `bg-gray-50`
- Max width: `max-w-7xl`

## Form Pages

Single-column forms should use `max-w-2xl` with section grouping.

Key rules:
- Major section spacing: `space-y-6`
- Field spacing: `space-y-4`
- Actions: right aligned, `gap-4`, separated by `border-t`

## List/Table Pages

Header row (title + primary action) + filter bar above content.

Key rules:
- Filter bar: white card `bg-white rounded-lg shadow-sm border p-4`
- Cards: consistent hover animation (see motion references)

## Detail/Summary Pages

Back link + header card + metrics + tabs.

Key rules:
- Max width: `max-w-4xl`
- Back link with chevron icon
- Tabs for organizing detail areas

## Container Width Reference

| Page Type | Max Width | Tailwind |
|-----------|-----------|----------|
| Auth | 448px | `max-w-md` |
| Single column form | 672px | `max-w-2xl` |
| Detail/summary view | 896px | `max-w-4xl` |
| Content w/ sidebar | 1024px | `max-w-5xl` |
| Full dashboard | 1280px | `max-w-7xl` |
