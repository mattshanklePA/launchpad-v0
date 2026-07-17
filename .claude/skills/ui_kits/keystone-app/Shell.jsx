// Keystone app shell — fixed left rail (basalt) + top bar.
(function(){
const { IconButton } = window.KeystoneDesignSystem_37ff67;
function KIcon({ n, size=20, color }){ return <i data-lucide={n} style={{width:size,height:size,color}}/>; }

function Rail({ view, setView, onPlumb }){
  const items = [
    { id:"portfolio", icon:"layout-grid", label:"Portfolio" },
    { id:"initiative", icon:"target", label:"Initiatives" },
    { id:"gates", icon:"git-commit-horizontal", label:"Gates" },
    { id:"reports", icon:"bar-chart-3", label:"Reports" },
  ];
  return (
    <nav style={{width:72,background:"var(--surface-nav)",display:"flex",flexDirection:"column",alignItems:"center",padding:"18px 0",gap:8,flexShrink:0}}>
      <img src="../../assets/mark-reversed.svg" style={{width:30,marginBottom:18}} alt="Keystone"/>
      {items.map(it=>{
        const active = view===it.id;
        return (
          <button key={it.id} onClick={()=>setView(it.id)} title={it.label}
            style={{width:44,height:44,borderRadius:"var(--radius-sm)",border:"none",cursor:"pointer",
              background:active?"var(--ks-basalt-600)":"transparent",
              color:active?"var(--ks-chalk)":"var(--ks-ink-300)",
              display:"flex",alignItems:"center",justifyContent:"center",transition:"background var(--dur-fast) var(--ease-standard)"}}>
            <KIcon n={it.icon}/>
          </button>
        );
      })}
      <div style={{flex:1}}/>
      <button onClick={onPlumb} title="Ask Plumb"
        style={{width:44,height:44,borderRadius:"var(--radius-sm)",border:"none",cursor:"pointer",background:"var(--ks-active-blue)",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center"}}>
        <KIcon n="ruler"/>
      </button>
    </nav>
  );
}

function TopBar({ title, sub, children }){
  return (
    <header style={{height:68,borderBottom:"1px solid var(--border-subtle)",background:"var(--surface-card)",display:"flex",alignItems:"center",padding:"0 28px",gap:16,flexShrink:0}}>
      <div style={{flex:1}}>
        <div style={{fontFamily:"var(--font-heading)",fontSize:19,fontWeight:700,color:"var(--text-strong)",letterSpacing:"-0.01em"}}>{title}</div>
        {sub && <div style={{fontFamily:"var(--font-body)",fontSize:13,color:"var(--text-muted)"}}>{sub}</div>}
      </div>
      {children}
    </header>
  );
}

Object.assign(window, { Rail, TopBar, KIcon });
})();
