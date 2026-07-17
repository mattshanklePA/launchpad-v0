// Keystone app — sample portfolio data (fake, on-brand).
const KS_INITIATIVES = [
  { id:"atlas", name:"Atlas", owner:"D. Okafor", team:"Payments", stage:"Funded", status:"healthy",
    spend:1.8, budget:2.4, gate:4, gatesTotal:5, confidence:86, return:"9 mo", ret:4.2,
    note:"Clears every gate. Returns in nine months." },
  { id:"meridian", name:"Meridian", owner:"S. Reyes", team:"Growth", stage:"Gate review", status:"alert",
    spend:2.9, budget:2.6, gate:3, gatesTotal:5, confidence:41, return:"—", ret:1.1,
    note:"Slipped past its spend gate. Decision needed before next release." },
  { id:"beacon", name:"Beacon", owner:"J. Alvarez", team:"Platform", stage:"Funded", status:"attention",
    spend:1.2, budget:1.5, gate:3, gatesTotal:5, confidence:63, return:"14 mo", ret:2.0,
    note:"On plan, but confidence is drifting. Watch the next gate." },
  { id:"harbor", name:"Harbor", owner:"M. Lindqvist", team:"Data", stage:"Launched", status:"healthy",
    spend:0.9, budget:1.0, gate:5, gatesTotal:5, confidence:92, return:"6 mo", ret:3.1,
    note:"Launched inside every gate. Watching adoption." },
  { id:"vanta", name:"Vanta", owner:"P. Nwosu", team:"Security", stage:"Discovery", status:"neutral",
    spend:0.1, budget:0.8, gate:1, gatesTotal:5, confidence:52, return:"—", ret:0,
    note:"Early. Awaiting the first gate review." },
  { id:"cobalt", name:"Cobalt", owner:"R. Haas", team:"Growth", stage:"Gate review", status:"attention",
    spend:1.6, budget:1.8, gate:2, gatesTotal:5, confidence:58, return:"18 mo", ret:1.6,
    note:"Return horizon lengthening. Compare against Beacon." },
];

const KS_GATES = [
  { n:1, name:"Problem fit", state:"clear", date:"Feb 12" },
  { n:2, name:"Solution fit", state:"clear", date:"Apr 03" },
  { n:3, name:"Spend gate", state:"flagged", date:"Jun 20" },
  { n:4, name:"Launch readiness", state:"pending", date:"—" },
  { n:5, name:"Post-launch review", state:"pending", date:"—" },
];

window.KS_INITIATIVES = KS_INITIATIVES;
window.KS_GATES = KS_GATES;
