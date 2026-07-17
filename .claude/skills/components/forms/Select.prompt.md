One-line: Native dropdown styled to match `Input`, with a custom chevron.

```jsx
<Select label="Stage" value={stage} onChange={e=>setStage(e.target.value)}
  options={["Discovery","Gate review","Funded","Launched"]} />
```

Options accept plain strings or `{value,label}`. Shares Input's label, hint, and error props.
