// Initiative detail — header, KPIs, gate timeline, decision actions.
(function(){
const { Card, CardHeader, StatusPill, Badge, Button, Dialog } = window.KeystoneDesignSystem_37ff67;

function GateRow({ g, last }){
  const map = {
    clear:   { color:"var(--ks-on-track)", icon:"check", label:"Cleared" },
    flagged: { color:"var(--ks-alert)", icon:"triangle-alert", label:"Flagged" },
    pending: { color:"var(--ks-ink-300)", icon:"circle", label:"Pending" },
  }[g.state];
  return (
    <div style={{display:"flex",gap:16,alignItems:"flex-start"}}>
      <div style={{display:"flex",flexDirection:"column",alignItems:"center"}}>
        <div style={{width:32,height:32,borderRadius:"50%",background:g.state==="pending"?"var(--surface-card)":map.color,border:g.state==="pending"?"1.5px solid var(--border-strong)":"none",display:"flex",alignItems:"center",justifyContent:"center",color:g.state==="pending"?"var(--text-faint)":"#fff"}}>
          <i data-lucide={map.icon} style={{width:16,height:16}}/>
        </div>
        {!last && <div style={{width:2,height:34,background:"var(--border-default)"}}/>}
      </div>
      <div style={{paddingBottom:20,flex:1}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontFamily:"var(--font-mono)",fontSize:11,color:"var(--text-faint)"}}>GATE-{g.n}</span>
          <span style={{fontFamily:"var(--font-heading)",fontWeight:700,fontSize:15,color:"var(--text-strong)"}}>{g.name}</span>
        </div>
        <div style={{fontSize:13,color:"var(--text-muted)",marginTop:2}}>{map.label} · {g.date}</div>
      </div>
    </div>
  );
}

function Stat({ label, value, sub, tone }){
  return (
    <div>
      <div style={{fontFamily:"var(--font-mono)",fontSize:10,letterSpacing:"0.08em",textTransform:"uppercase",color:"var(--text-muted)",marginBottom:6}}>{label}</div>
      <div style={{fontFamily:"var(--font-mono)",fontSize:24,fontWeight:600,color:tone||"var(--text-strong)"}}>{value}</div>
      {sub && <div style={{fontSize:12,color:"var(--text-muted)",marginTop:2}}>{sub}</div>}
    </div>
  );
}

function InitiativeDetail({ item, onBack }){
  const it = item || window.KS_INITIATIVES[1];
  const [open,setOpen] = React.useState(false);
  const overBudget = it.spend > it.budget;
  return (
    <div style={{padding:"24px 28px",overflow:"auto"}}>
      <button onClick={onBack} style={{display:"inline-flex",alignItems:"center",gap:6,background:"none",border:"none",cursor:"pointer",fontFamily:"var(--font-body)",fontSize:13,color:"var(--text-link)",padding:0,marginBottom:16}}>
        <i data-lucide="arrow-left" style={{width:16,height:16}}/> Portfolio
      </button>

      <div style={{display:"flex",alignItems:"flex-start",gap:16,marginBottom:22}}>
        <div style={{flex:1}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <h1 style={{margin:0,fontFamily:"var(--font-heading)",fontSize:31,fontWeight:900,letterSpacing:"-0.02em",color:"var(--text-strong)"}}>{it.name}</h1>
            <StatusPill status={it.status}/>
          </div>
          <div style={{fontSize:14,color:"var(--text-muted)",marginTop:4}}>{it.team} · {it.owner} · <Badge mono tone="neutral">{it.stage}</Badge></div>
        </div>
        <Button variant="secondary" iconLeft={<i data-lucide="pause" style={{width:16,height:16}}/>} onClick={()=>setOpen(true)}>Hold for review</Button>
        <Button iconLeft={<i data-lucide="lock" style={{width:16,height:16}}/>}>Fund initiative</Button>
      </div>

      {it.status!=="healthy" && (
        <div style={{display:"flex",gap:12,alignItems:"center",background:"rgba(199,125,58,.10)",border:"1px solid rgba(199,125,58,.35)",borderRadius:"var(--radius-md)",padding:"12px 16px",marginBottom:22}}>
          <i data-lucide="triangle-alert" style={{width:18,height:18,color:"var(--ks-amber-dark)"}}/>
          <span style={{fontSize:14,color:"var(--ks-amber-dark)",fontWeight:500}}>{it.note}</span>
        </div>
      )}

      <div style={{display:"grid",gridTemplateColumns:"1.4fr 1fr",gap:20}}>
        <Card>
          <CardHeader eyebrow="Gate progress" title={`${it.gate} of ${it.gatesTotal} cleared`}/>
          {window.KS_GATES.map((g,i)=>(<GateRow key={g.n} g={g} last={i===window.KS_GATES.length-1}/>))}
        </Card>
        <div style={{display:"flex",flexDirection:"column",gap:20}}>
          <Card>
            <CardHeader eyebrow="Financials"/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
              <Stat label="Spend" value={`$${it.spend}M`} sub={`of $${it.budget}M budget`} tone={overBudget?"var(--ks-alert)":undefined}/>
              <Stat label="Projected return" value={`$${it.ret}M`} sub={it.return}/>
              <Stat label="Confidence" value={`${it.confidence}%`}/>
              <Stat label="Horizon" value={it.return}/>
            </div>
          </Card>
          <Card style={{background:"var(--ks-basalt)",borderColor:"var(--ks-basalt)"}}>
            <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
              <img src="../../assets/plumb-assistant.svg" style={{width:24,filter:"brightness(3)"}}/>
              <div>
                <div style={{fontFamily:"var(--font-mono)",fontSize:10,letterSpacing:"0.08em",textTransform:"uppercase",color:"var(--ks-active-blue)",marginBottom:6}}>Plumb says</div>
                <div style={{fontSize:14,lineHeight:1.5,color:"var(--ks-chalk)"}}>{it.note} Want me to line it up against a comparable initiative?</div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Dialog open={open} onClose={()=>setOpen(false)} eyebrow="Decision needed" title={`Hold ${it.name} for review?`}
        footer={<><Button variant="secondary" onClick={()=>setOpen(false)}>Cancel</Button><Button variant="danger" onClick={()=>setOpen(false)}>Hold initiative</Button></>}>
        Holding pauses the next release until the flagged gate is cleared. The owner will be notified.
      </Dialog>
    </div>
  );
}

Object.assign(window, { InitiativeDetail });
})();
