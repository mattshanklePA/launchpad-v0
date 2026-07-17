One-line: Modal dialog — basalt scrim, white panel, chalk action footer; put decision buttons in `footer`.

```jsx
<Dialog open={open} onClose={close} eyebrow="Decision needed" title="Hold Meridian for review?"
  footer={<><Button variant="secondary" onClick={close}>Cancel</Button><Button onClick={hold}>Hold initiative</Button></>}>
  Meridian slipped past its spend gate. Holding pauses the next release.
</Dialog>
```

Scrim click closes. Fades + rises on open (no bounce).
