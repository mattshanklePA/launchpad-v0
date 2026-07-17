// Plumb assistant — slide-over chat panel.
(function(){
const { Button } = window.KeystoneDesignSystem_37ff67;

function PlumbPanel({ open, onClose }){
  const seed = [
    { who:"plumb", text:"Two initiatives need a decision this week. Meridian is off plumb — it slipped past its spend gate." },
    { who:"user", text:"What should I do about Meridian?" },
    { who:"plumb", text:"Hold it. Spend is $2.9M against a $2.6M gate and confidence is 41%. Cobalt covers the same market at lower risk — want them side by side?" },
  ];
  const [msgs,setMsgs] = React.useState(seed);
  const [draft,setDraft] = React.useState("");
  const send = ()=>{ if(!draft.trim())return; setMsgs(m=>[...m,{who:"user",text:draft},{who:"plumb",text:"Lining up Meridian and Cobalt now — comparing spend, confidence and return horizon."}]); setDraft(""); };
  return (
    <div style={{position:"absolute",top:0,right:0,bottom:0,width:360,background:"var(--surface-card)",borderLeft:"1px solid var(--border-subtle)",boxShadow:"var(--shadow-lg)",display:"flex",flexDirection:"column",transform:open?"translateX(0)":"translateX(100%)",transition:"transform var(--dur-slow) var(--ease-out)",zIndex:50}}>
      <div style={{display:"flex",alignItems:"center",gap:10,padding:"16px 18px",borderBottom:"1px solid var(--border-subtle)"}}>
        <img src="../../assets/plumb-assistant.svg" style={{width:20}}/>
        <div style={{flex:1}}>
          <div style={{fontFamily:"var(--font-heading)",fontWeight:700,fontSize:15,color:"var(--text-strong)"}}>Plumb</div>
          <div style={{fontFamily:"var(--font-mono)",fontSize:10,letterSpacing:"0.06em",textTransform:"uppercase",color:"var(--ks-on-track)"}}>Reading your portfolio</div>
        </div>
        <button onClick={onClose} aria-label="Close" style={{background:"none",border:"none",cursor:"pointer",color:"var(--text-muted)",display:"flex"}}><i data-lucide="x" style={{width:18,height:18}}/></button>
      </div>

      <div style={{flex:1,overflow:"auto",padding:"18px",display:"flex",flexDirection:"column",gap:14}}>
        {msgs.map((m,i)=> m.who==="plumb" ? (
          <div key={i} style={{alignSelf:"flex-start",maxWidth:"86%",background:"var(--ks-chalk)",border:"1px solid var(--border-subtle)",borderRadius:"0 10px 10px 10px",padding:"10px 13px",fontSize:13.5,lineHeight:1.5,color:"var(--text-body)"}}>{m.text}</div>
        ) : (
          <div key={i} style={{alignSelf:"flex-end",maxWidth:"86%",background:"var(--ks-basalt)",borderRadius:"10px 10px 0 10px",padding:"10px 13px",fontSize:13.5,lineHeight:1.5,color:"var(--ks-chalk)"}}>{m.text}</div>
        ))}
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {["Compare Meridian & Cobalt","What's off plumb?"].map(s=>(
            <button key={s} onClick={()=>{setDraft(s);}} style={{fontFamily:"var(--font-body)",fontSize:12,color:"var(--text-link)",background:"var(--surface-card)",border:"1px solid var(--border-default)",borderRadius:"var(--radius-pill)",padding:"5px 12px",cursor:"pointer"}}>{s}</button>
          ))}
        </div>
      </div>

      <div style={{padding:"14px 16px",borderTop:"1px solid var(--border-subtle)",display:"flex",gap:8,alignItems:"center"}}>
        <input value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Ask Plumb…"
          style={{flex:1,height:38,border:"1px solid var(--border-default)",borderRadius:"var(--radius-sm)",padding:"0 12px",fontFamily:"var(--font-body)",fontSize:14,outline:"none",color:"var(--text-strong)"}}/>
        <Button size="sm" onClick={send} iconLeft={<i data-lucide="arrow-up" style={{width:16,height:16}}/>}> </Button>
      </div>
    </div>
  );
}

Object.assign(window, { PlumbPanel });
})();
