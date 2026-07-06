# Accessibility

## Required Features

1. Skip to content link
2. Proper heading hierarchy (h1 -> h2 -> h3)
3. Alt text on all images
4. Keyboard navigation support
5. Visible focus indicators
6. ARIA labels on icons
7. Minimum 4.5:1 contrast ratio

## Skip Link Pattern

```tsx
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-[#0086ca] text-white px-4 py-2 rounded-lg"
>
  Skip to main content
</a>

<main id="main-content">
  {/* Page content */}
</main>
```

## Focus States

Interactive elements must have visible focus states. shadcn/ui includes these by default.

## Reduced Motion

Animations should respect `prefers-reduced-motion`.
