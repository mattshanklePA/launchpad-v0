// Portfolio dashboard — KPI strip + initiative table.
(function(){
const { Card, StatusPill, Badge, Button, Input } = window.KeystoneDesignSystem_37ff67;

function KpiCard({ eyebrow, value, delta, deltaTone }){
  return (
    <div style={{flex:1,background:"var(--surface-card)",border:"1px solid var(--border-subtle)",borderRadius:"var(--radius-md)",padding:"18px 20px"}}>
      <div style={{fontFamily:"var(--font-mono)",fontSize:11,letterSpacing:"0.08em",textTransform:"uppercase",color:"var(--text-muted)",marginBottom:10}}>{eyebrow}</div>
      <div style={{display:"flex",alignItems:"baseline",gap:10}}>
        <span style={{fontFamily:"var(--font-mono)",fontSize:30,fontWeight:600,color:"var(--text-strong)",letterSpacing:"-0.01em"}}>{value}</span>
        {delta && <span style={{fontSize:13,fontWeight:600,color:deltaTone}}>{delta}</span>}
      </div>
    </div>
  );
}

function GateBar({ gate, total, status }){
  const color = status==="alert"?"var(--ks-alert)":status==="attention"?"var(--ks-amber)":"var(--ks-on-track)";
  return (
    <div style={{display:"flex",gap:3,alignItems:"center"}}>
      {Array.from({length:total}).map((_,i)=>(
        <span key={i} style={{width:16,height:6,borderRadius:2,background:i<gate?color:"var(--ks-limestone)"}}/>
      ))}
      <span style={{fontFamily:"var(--font-mono)",fontSize:11,color:"var(--text-muted)",marginLeft:6}}>{gate}/{total}</span>
    </div>
  );
}

function Dashboard({ onOpen }){
  const [q,setQ] = React.useState("");
  const rows = window.KS_INITIATIVES.filter(i=>i.name.toLowerCase().includes(q.toLowerCase()));
  const th = { fontFamily:"var(--font-mono)",fontSize:10,letterSpacing:"0.08em",textTransform:"uppercase",color:"var(--text-faint)",fontWeight:600,textAlign:"left",padding:"0 16px 10px" };
  return (
    <div style={{padding:"24px 28px",overflow:"auto"}}>
      <div style={{display:"flex",gap:16,marginBottom:20}}>
        <KpiCard eyebrow="Portfolio return · YTD" value="$4.2M" delta="+18%" deltaTone="var(--ks-on-track)"/>
        <KpiCard eyebrow="Active initiatives" value="6" delta="2 in review" deltaTone="var(--text-muted)"/>
        <KpiCard eyebrow="Off plumb" value="1" delta="Needs decision" deltaTone="var(--ks-alert)"/>
        <KpiCard eyebrow="Committed spend" value="$8.5M" delta="of $10.1M" deltaTone="var(--text-muted)"/>
      </div>

      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
        <div style={{fontFamily:"var(--font-heading)",fontSize:16,fontWeight:700,color:"var(--text-strong)",flex:1}}>Initiatives</div>
        <div style={{width:220}}><Input placeholder="Search" value={q} onChange={e=>setQ(e.target.value)} prefix={<i data-lucide="search" style={{width:16,height:16}}/>}/></div>
        <Button iconLeft={<i data-lucide="plus" style={{width:16,height:16}}/>}>New initiative</Button>
      </div>

      <Card padding="0" style={{overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr style={{borderBottom:"1px solid var(--border-subtle)"}}>
            <th style={{...th,paddingTop:14}}>Initiative</th><th style={{...th,paddingTop:14}}>Owner</th>
            <th style={{...th,paddingTop:14}}>Stage</th><th style={{...th,paddingTop:14}}>Gates</th>
            <th style={{...th,paddingTop:14}}>Confidence</th><th style={{...th,paddingTop:14}}>Status</th>
          </tr></thead>
          <tbody>
            {rows.map((it,idx)=>(
              <tr key={it.id} onClick={()=>onOpen(it)} style={{borderBottom:idx<rows.length-1?"1px solid var(--border-subtle)":"none",cursor:"pointer"}}
                onMouseEnter={e=>e.currentTarget.style.background="var(--ks-chalk)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <td style={{padding:"14px 16px"}}>
                  <div style={{fontFamily:"var(--font-heading)",fontWeight:700,fontSize:15,color:"var(--text-strong)"}}>{it.name}</div>
                  <div style={{fontSize:12,color:"var(--text-muted)"}}>{it.team}</div>
                </td>
                <td style={{padding:"14px 16px",fontSize:14,color:"var(--text-body)"}}>{it.owner}</td>
                <td style={{padding:"14px 16px"}}><Badge mono tone={it.stage==="Launched"?"info":"neutral"}>{it.stage}</Badge></td>
                <td style={{padding:"14px 16px"}}><GateBar gate={it.gate} total={it.gatesTotal} status={it.status}/></td>
                <td style={{padding:"14px 16px",fontFamily:"var(--font-mono)",fontSize:14,color:"var(--text-strong)"}}>{it.confidence}%</td>
                <td style={{padding:"14px 16px"}}><StatusPill status={it.status}/></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

Object.assign(window, { Dashboard, GateBar });
})();
