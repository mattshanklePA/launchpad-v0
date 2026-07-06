# Animation & Motion

## Standard Card Animation (Required)

```tsx
<Card className="group transition-all duration-300 hover:scale-105 hover:shadow-xl border border-transparent hover:border-[#0086ca]">
  <CardContent>
    <div className="group-hover:text-[#0086ca] transition-colors duration-300">
      <Icon className="w-8 h-8" />
    </div>
  </CardContent>
</Card>
```

## Button Motion

```tsx
<Button className="transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg">
  Action
</Button>
```

## Timing Standards

| Element | Duration | Transform |
|---------|----------|-----------|
| Cards | `duration-300` | `hover:scale-105` + shadow |
| Buttons | `duration-200` | `hover:scale-105` + shadow |
| Icons (in cards) | `duration-300` | Color change only |
| Page transitions | `duration-500` | Fade + translate |
