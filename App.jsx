import { useState, useMemo, useEffect } from "react";

const API_KEY = "AIzaSyADISu_YZy-5ds4Bfz9Uk92piO99KMsM0w";
const SHEET_RANGE = "Inventory!A5:J200";
const BUDGET_RANGE = "Inventory!G3";

function getStatus(item) {
  if (!item.minLevel || item.minLevel === 0) return "ok";
  const ratio = item.onHand / item.minLevel;
  if (item.onHand === 0) return "critical";
  if (ratio < 0.5) return "critical";
  if (ratio < 1) return "low";
  return "ok";
}
const STATUS = {
  ok:       { label:"OK",       color:"#4ade80" },
  low:      { label:"LOW",      color:"#facc15" },
  critical: { label:"CRITICAL", color:"#f87171" },
};
function qtyToOrder(item) {
  return Math.max(0, Math.ceil((item.demand - item.onHand) / 2));
}

const DEMO_ITEMS = [
  {category:"Cadet Metal Insignia",name:"C/Amn Insignia",onHand:0,onOrder:0,demand:50,price:8.75,minLevel:50,link:"https://www.vanguardmil.com/products/civil-air-patrol-airman-cadet-grade-chevron-insignia"},
  {category:"",name:"C/SrA Insignia",onHand:7,onOrder:0,demand:0,price:9.95,minLevel:0,link:""},
  {category:"",name:"C/TSgt Insignia",onHand:5,onOrder:0,demand:0,price:10.70,minLevel:0,link:""},
  {category:"",name:"C/MSgt Insignia",onHand:9,onOrder:0,demand:0,price:11.70,minLevel:0,link:""},
  {category:"",name:"C/SMSgt Insignia",onHand:1,onOrder:0,demand:0,price:12.75,minLevel:0,link:""},
  {category:"",name:"C/CMSgt Insignia",onHand:1,onOrder:0,demand:0,price:15.20,minLevel:0,link:""},
  {category:"Cadet Fleece Patches",name:"NCO Fleece Patch",onHand:7,onOrder:0,demand:15,price:2.15,minLevel:15,link:""},
  {category:"",name:"C/1st Lt Fleece Patch",onHand:4,onOrder:0,demand:0,price:1.95,minLevel:0,link:""},
  {category:"",name:"C/Capt Fleece Patch",onHand:0,onOrder:0,demand:0,price:1.95,minLevel:0,link:""},
  {category:"Cadet Achievement Ribbons",name:"C/Amn Ribbon / Curry Award",onHand:1,onOrder:0,demand:35,price:1.60,minLevel:35,link:"https://www.vanguardmil.com/products/civil-air-patrol-cadet-curry-ribbon"},
  {category:"",name:"C/A1C Ribbon / Arnold Award",onHand:15,onOrder:0,demand:5,price:1.60,minLevel:5,link:""},
  {category:"",name:"C/TSgt Ribbon / Rickenbacker",onHand:7,onOrder:0,demand:5,price:1.60,minLevel:5,link:""},
  {category:"Senior Cloth Insignia",name:"1st Lt Cloth Insignia",onHand:8,onOrder:0,demand:10,price:1.70,minLevel:10,link:""},
  {category:"",name:"Maj Cloth Insignia",onHand:4,onOrder:0,demand:8,price:1.55,minLevel:8,link:""},
  {category:"",name:"Lt Col Cloth Insignia",onHand:0,onOrder:0,demand:8,price:1.55,minLevel:8,link:""},
  {category:"Senior Epaulet Sleeves",name:"1st Lt Epaulet Sleeve",onHand:0,onOrder:0,demand:10,price:4.45,minLevel:10,link:""},
  {category:"",name:"Lt Col Epaulet Sleeve",onHand:0,onOrder:0,demand:8,price:5.50,minLevel:8,link:""},
];

function SettingsModal({ onClose, onSave }) {
  const [sheetId, setSheetId] = useState(localStorage.getItem("cap_sheet_id") || "");
  function save() {
    localStorage.setItem("cap_sheet_id", sheetId.trim());
    onSave(sheetId.trim());
    onClose();
  }
  return (
    <div style={{position:"fixed",inset:0,background:"#000c",zIndex:999,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:"#0d1528",border:"1px solid #2e5fa3",padding:20,width:"100%",maxWidth:480,borderRadius:4}}>
        <div style={{fontSize:11,letterSpacing:3,color:"#4a7ab5",marginBottom:16}}>⚙ CONNECT GOOGLE SHEET</div>
        <div style={{marginBottom:16}}>
          <div style={{fontSize:9,letterSpacing:2,color:"#4a7ab5",marginBottom:4}}>GOOGLE SHEET ID</div>
          <input style={{background:"#0a0e1a",border:"1px solid #1e3a5f",color:"#c8d4e8",padding:10,fontFamily:"inherit",fontSize:13,width:"100%",boxSizing:"border-box",borderRadius:2}}
            value={sheetId} onChange={e=>setSheetId(e.target.value)} placeholder="Paste your Sheet ID here"/>
          <div style={{fontSize:9,color:"#4a6a8a",marginTop:4}}>From URL: docs.google.com/spreadsheets/d/<strong style={{color:"#facc15"}}>THIS_PART</strong>/edit</div>
        </div>
        <div style={{background:"#0a1400",border:"1px solid #4ade8033",padding:"10px 12px",marginBottom:16,fontSize:10,color:"#a3c44a",lineHeight:1.6}}>
          ◆ API key is pre-configured<br/>Make sure your sheet is shared: <strong>Anyone with link → Viewer</strong>
        </div>
        <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
          <button onClick={onClose} style={{background:"transparent",border:"1px solid #1e3a5f",color:"#4a7ab5",padding:"10px 16px",fontFamily:"inherit",fontSize:10,letterSpacing:2,cursor:"pointer",borderRadius:2}}>CANCEL</button>
          <button onClick={save} style={{background:"#0a2d0a",border:"1px solid #4ade80",color:"#4ade80",padding:"10px 16px",fontFamily:"inherit",fontSize:10,letterSpacing:2,cursor:"pointer",borderRadius:2}}>SAVE & CONNECT</button>
        </div>
      </div>
    </div>
  );
}

function InstructionsTab() {
  const steps = [
    ["Go to Google Cloud Console","Visit console.cloud.google.com and sign in."],
    ["Create or select a project","Click the project dropdown → New Project → name it anything → Create."],
    ["Enable Google Sheets API","APIs & Services → Library → search 'Google Sheets API' → Enable."],
    ["Get your Sheet ID","Open your Google Sheet. Copy the long string from the URL between /d/ and /edit."],
    ["Share your sheet","Click Share → change General access to 'Anyone with the link' → Viewer."],
    ["Enter Sheet ID in app","Tap ⚙ CONNECT SHEET, paste your Sheet ID, tap Save. The API key is pre-set."],
  ];
  return (
    <div>
      <div style={{fontSize:11,letterSpacing:3,color:"#4a7ab5",marginBottom:16}}>◆ SETUP GUIDE</div>
      {steps.map(([title,desc],i)=>(
        <div key={i} style={{display:"flex",gap:14,marginBottom:12,background:"#0d1528",border:"1px solid #1e3a5f",padding:"12px 14px",borderRadius:4}}>
          <div style={{fontSize:18,color:"#2e5fa3",fontWeight:"bold",minWidth:24}}>{i+1}</div>
          <div>
            <div style={{fontSize:11,fontWeight:"bold",color:"#e8f0fc",marginBottom:3}}>{title}</div>
            <div style={{fontSize:11,color:"#7a9cc8",lineHeight:1.5}}>{desc}</div>
          </div>
        </div>
      ))}
      <div style={{background:"#0a1400",border:"1px solid #4ade8055",padding:"12px 14px",fontSize:10,color:"#4ade80",lineHeight:1.7,borderRadius:4}}>
        ◆ Sheet tab must be named <strong>Inventory</strong><br/>
        Budget cell: <strong>G3</strong><br/>
        Columns: A=Category · B=Item · C=On Hand · D=On Order · E=Demand · H=Price · J=Link
      </div>
    </div>
  );
}

export default function App() {
  const [tab, setTab]               = useState("inventory");
  const [items, setItems]           = useState(DEMO_ITEMS);
  const [budget, setBudget]         = useState(350);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);
  const [lastSync, setLastSync]     = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [connected, setConnected]   = useState(false);
  const [sheetId, setSheetId]       = useState(localStorage.getItem("cap_sheet_id") || "");
  const [demoMode, setDemoMode]     = useState(true);
  const [catFilter, setCatFilter]   = useState("All");
  const [statFilter, setStatFilter] = useState("All");
  const [prioritized, setPrioritized] = useState(false);
  const [copied, setCopied]         = useState(false);

  async function fetchSheet(sid) {
    if (!sid) return;
    setLoading(true); setError(null);
    try {
      const enc = r => encodeURIComponent(r);
      const base = `https://sheets.googleapis.com/v4/spreadsheets/${sid}/values`;
      const [dataRes, budgetRes] = await Promise.all([
        fetch(`${base}/${enc(SHEET_RANGE)}?key=${API_KEY}`),
        fetch(`${base}/${enc(BUDGET_RANGE)}?key=${API_KEY}`),
      ]);
      if (!dataRes.ok) throw new Error(`Error ${dataRes.status} — check Sheet ID and ensure sheet is shared publicly`);
      const dataJson   = await dataRes.json();
      const budgetJson = await budgetRes.json();
      const rows = dataJson.values || [];
      const parsed = []; let lastCat = "";
      for (const row of rows) {
        const cat  = (row[0]||"").trim();
        const item = (row[1]||"").trim();
        if (!item) continue;
        if (cat) lastCat = cat;
        parsed.push({ category:lastCat, name:item,
          onHand:parseFloat(row[2])||0, onOrder:parseFloat(row[3])||0,
          demand:parseFloat(row[4])||0, price:parseFloat(row[7])||0,
          link:(row[9]||"").trim(), minLevel:parseFloat(row[4])||0 });
      }
      setItems(parsed);
      const bv = budgetJson.values?.[0]?.[0];
      if (bv) setBudget(parseFloat(String(bv).replace(/[$,]/g,""))||350);
      setLastSync(new Date()); setConnected(true); setDemoMode(false);
    } catch(e) { setError(e.message); } finally { setLoading(false); }
  }

  useEffect(() => { if (sheetId) fetchSheet(sheetId); }, []);

  function handleSave(sid) { setSheetId(sid); fetchSheet(sid); }

  const cats = useMemo(()=>["All",...Array.from(new Set(items.map(i=>i.category).filter(Boolean)))]  ,[items]);
  const filtered = useMemo(()=>items.filter(i=>{
    const cOk = catFilter==="All"||i.category===catFilter;
    const sOk = statFilter==="All"||getStatus(i)===statFilter.toLowerCase();
    return cOk&&sOk;
  }),[items,catFilter,statFilter]);
  const counts = useMemo(()=>({
    ok:items.filter(i=>getStatus(i)==="ok").length,
    low:items.filter(i=>getStatus(i)==="low").length,
    critical:items.filter(i=>getStatus(i)==="critical").length,
  }),[items]);
  const orderItems = useMemo(()=>items.filter(i=>qtyToOrder(i)>0)
    .map(i=>({...i,qty:qtyToOrder(i),lineTotal:qtyToOrder(i)*i.price}))
    .sort((a,b)=>({critical:0,low:1,ok:2})[getStatus(a)]-({critical:0,low:1,ok:2})[getStatus(b)]),[items]);
  const orderTotal = useMemo(()=>orderItems.reduce((s,i)=>s+i.lineTotal,0),[orderItems]);
  const overBudget = orderTotal>budget;
  const prioritizedOrder = useMemo(()=>{
    let rem=budget; const r=[];
    for(const item of orderItems){ if(item.lineTotal<=rem){r.push(item);rem-=item.lineTotal;} }
    return r;
  },[orderItems,budget]);
  const displayOrder = prioritized?prioritizedOrder:orderItems;
  const displayTotal = displayOrder.reduce((s,i)=>s+i.lineTotal,0);

  function handleCopy(){
    const lines=["=== VANGUARD ORDER SUMMARY ===",`Date: ${new Date().toLocaleDateString()}`,`Budget: $${budget.toFixed(2)} | Total: $${displayTotal.toFixed(2)}`,"",
      ...displayOrder.map(i=>`${i.name} x${i.qty} @ $${i.price.toFixed(2)} = $${i.lineTotal.toFixed(2)}`),
      "",`TOTAL: $${displayTotal.toFixed(2)}`];
    navigator.clipboard.writeText(lines.join("\n"));
    setCopied(true); setTimeout(()=>setCopied(false),2000);
  }

  const btn = (col="#2e5fa3",bg="#0d1528")=>({background:bg,border:`1px solid ${col}`,color:col,padding:"9px 12px",fontSize:10,letterSpacing:2,cursor:"pointer",fontFamily:"inherit",borderRadius:3,whiteSpace:"nowrap"});
  const th = {textAlign:"left",padding:"8px",fontSize:9,letterSpacing:2,color:"#4a7ab5",fontWeight:"normal",borderBottom:"2px solid #1e3a5f",whiteSpace:"nowrap"};
  const td = (bg)=>({padding:"9px 8px",borderBottom:"1px solid #0f1e35",background:bg,fontSize:12});

  return (
    <div style={{minHeight:"100vh",background:"#0a0e1a",color:"#c8d4e8",fontFamily:"'Courier New',Courier,monospace"}}>
      {showSettings && <SettingsModal onClose={()=>setShowSettings(false)} onSave={handleSave}/>}

      {/* Header */}
      <div style={{background:"linear-gradient(180deg,#0d1528 0%,#0a0e1a 100%)",borderBottom:"2px solid #1e3a5f",padding:"14px 16px 0"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8,flexWrap:"wrap"}}>
          <div style={{width:38,height:38,background:"#1a2d4e",border:"2px solid #2e5fa3",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>✈</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:9,letterSpacing:3,color:"#4a7ab5"}}>CIVIL AIR PATROL</div>
            <div style={{fontSize:15,fontWeight:"bold",color:"#e8f0fc",letterSpacing:1}}>LOGISTICS MANAGER</div>
          </div>
          <div style={{textAlign:"right",flexShrink:0}}>
            <div style={{fontSize:9,color:"#4a7ab5",letterSpacing:1}}>BUDGET</div>
            <div style={{fontSize:20,color:"#4ade80"}}>${budget.toFixed(2)}</div>
          </div>
        </div>

        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,flexWrap:"wrap"}}>
          {demoMode  && <div style={{fontSize:9,letterSpacing:2,color:"#a3c44a",background:"#1a2500",border:"1px solid #4a7a00",padding:"2px 8px"}}>◆ DEMO</div>}
          {loading   && <div style={{fontSize:9,letterSpacing:2,color:"#4a7ab5",background:"#001a2d",border:"1px solid #2e5fa3",padding:"2px 8px"}}>⟳ SYNCING...</div>}
          {error     && <div style={{fontSize:9,color:"#f87171",background:"#1a0d0d",border:"1px solid #f8717155",padding:"2px 8px",flex:1,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>⚠ {error}</div>}
          {connected && !loading && <div style={{fontSize:9,color:"#4ade80",background:"#001a0d",border:"1px solid #4ade8055",padding:"2px 8px"}}>◆ LIVE</div>}
          <button onClick={()=>setShowSettings(true)} style={btn(connected?"#4ade80":"#facc15",connected?"#0a2d0a":"#1a1400")}>
            {connected?"◆ RECONNECT":"⚙ CONNECT"}
          </button>
          {connected && <button onClick={()=>fetchSheet(sheetId)} style={btn()}>↺</button>}
        </div>

        <div style={{display:"flex"}}>
          {[["inventory","📦 INVENTORY"],["order","🛒 ORDER"],["setup","⚙ SETUP"]].map(([k,label])=>(
            <button key={k} onClick={()=>setTab(k)} style={{
              background:tab===k?"#1e3a5f":"transparent",border:"none",
              borderTop:tab===k?"2px solid #2e5fa3":"2px solid transparent",
              color:tab===k?"#e8f0fc":"#4a7ab5",
              padding:"9px 0",fontSize:10,letterSpacing:1,cursor:"pointer",fontFamily:"inherit",flex:1,
            }}>{label}</button>
          ))}
        </div>
      </div>

      <div style={{padding:"14px 16px"}}>

        {/* ── INVENTORY ── */}
        {tab==="inventory" && (
          <div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:8,marginBottom:14}}>
              {[
                {label:"TOTAL",  value:items.length,   color:"#4a7ab5"},
                {label:"OK",     value:counts.ok,      color:"#4ade80"},
                {label:"LOW",    value:counts.low,     color:"#facc15"},
                {label:"CRIT",   value:counts.critical,color:"#f87171"},
              ].map(s=>(
                <div key={s.label} style={{background:"#0d1528",border:`1px solid ${s.color}33`,padding:"10px 8px",borderRadius:4,textAlign:"center"}}>
                  <div style={{fontSize:8,letterSpacing:2,color:s.color,marginBottom:4}}>{s.label}</div>
                  <div style={{fontSize:22,color:s.color,lineHeight:1}}>{s.value}</div>
                </div>
              ))}
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
              {[
                {label:"CATEGORY",val:catFilter,set:setCatFilter,opts:cats},
                {label:"STATUS",  val:statFilter,set:setStatFilter,opts:["All","OK","Low","Critical"]},
              ].map(f=>(
                <div key={f.label}>
                  <div style={{fontSize:9,letterSpacing:2,color:"#4a7ab5",marginBottom:3}}>{f.label}</div>
                  <select value={f.val} onChange={e=>f.set(e.target.value)} style={{background:"#0d1528",border:"1px solid #1e3a5f",color:"#c8d4e8",padding:8,fontFamily:"inherit",fontSize:12,width:"100%",borderRadius:3}}>
                    {f.opts.map(o=><option key={o}>{o}</option>)}
                  </select>
                </div>
              ))}
            </div>

            <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead>
                  <tr>
                    {["ITEM","HAND","DEMAND","ORDER","STATUS"].map(h=><th key={h} style={th}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item,idx)=>{
                    const sc=STATUS[getStatus(item)];
                    const toOrd=qtyToOrder(item);
                    const bg=idx%2===0?"#0d1528":"transparent";
                    return (
                      <tr key={idx}>
                        <td style={{...td(bg),color:"#e8f0fc",maxWidth:160}}>
                          {item.category&&<div style={{fontSize:8,color:"#4a7ab5",marginBottom:2,letterSpacing:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.category}</div>}
                          <div style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.name}</div>
                        </td>
                        <td style={{...td(bg),color:item.onHand===0?"#f87171":"#e8f0fc",fontWeight:"bold",textAlign:"center"}}>{item.onHand}</td>
                        <td style={{...td(bg),color:"#7a9cc8",textAlign:"center"}}>{item.demand}</td>
                        <td style={{...td(bg),textAlign:"center"}}>
                          {toOrd>0
                            ?<span style={{color:"#facc15",fontWeight:"bold",background:"#1a1400",padding:"2px 6px",borderRadius:3}}>{toOrd}</span>
                            :<span style={{color:"#2e5fa3"}}>—</span>}
                        </td>
                        <td style={td(bg)}>
                          <span style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:9,letterSpacing:1,color:sc.color}}>
                            <span style={{width:6,height:6,borderRadius:"50%",background:sc.color,boxShadow:`0 0 5px ${sc.color}`,flexShrink:0}}/>
                            {sc.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length===0&&<tr><td colSpan={5} style={{padding:24,textAlign:"center",color:"#4a7ab5"}}>NO ITEMS MATCH</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── ORDER ── */}
        {tab==="order" && (
          <div>
            <div style={{background:"#0d1528",border:`1px solid ${overBudget?"#f8717155":"#1e3a5f"}`,padding:"12px 14px",marginBottom:12,borderRadius:4}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:10}}>
                {[
                  {label:"BUDGET",   val:`$${budget.toFixed(2)}`,         color:"#4ade80"},
                  {label:"TOTAL",    val:`$${displayTotal.toFixed(2)}`,   color:overBudget&&!prioritized?"#f87171":"#e8f0fc"},
                  {label:"LEFT",     val:`$${(budget-displayTotal).toFixed(2)}`,color:budget-displayTotal>=0?"#4ade80":"#f87171"},
                ].map(b=>(
                  <div key={b.label}>
                    <div style={{fontSize:9,letterSpacing:2,color:"#4a7ab5"}}>{b.label}</div>
                    <div style={{fontSize:16,color:b.color,fontWeight:"bold"}}>{b.val}</div>
                  </div>
                ))}
              </div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {overBudget&&<button onClick={()=>setPrioritized(p=>!p)} style={btn(prioritized?"#4a7ab5":"#f87171",prioritized?"#0d1528":"#1a0d0d")}>{prioritized?"◆ PRIORITIZED":"⚠ OVER BUDGET"}</button>}
                <button onClick={handleCopy} style={btn(copied?"#4ade80":"#4a7ab5",copied?"#0a2d0a":"#0d1528")}>{copied?"✓ COPIED":"⎘ COPY"}</button>
              </div>
            </div>

            {overBudget&&!prioritized&&<div style={{background:"#1a0d0d",border:"1px solid #f8717155",padding:"8px 12px",marginBottom:10,fontSize:10,color:"#f87171",borderRadius:4}}>⚠ EXCEEDS BUDGET BY ${(displayTotal-budget).toFixed(2)} — TAP OVER BUDGET TO TRIM</div>}

            <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead>
                  <tr>{["ITEM","PRI","QTY","PRICE","TOTAL","↗"].map(h=><th key={h} style={th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {displayOrder.map((item,idx)=>{
                    const sc=STATUS[getStatus(item)];
                    const bg=idx%2===0?"#0d1528":"transparent";
                    return (
                      <tr key={idx}>
                        <td style={{...td(bg),color:"#e8f0fc",maxWidth:140,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.name}</td>
                        <td style={td(bg)}><span style={{color:sc.color,fontSize:9}}>●{sc.label[0]}</span></td>
                        <td style={{...td(bg),color:"#facc15",fontWeight:"bold",textAlign:"center"}}>{item.qty}</td>
                        <td style={{...td(bg),color:"#7a9cc8",textAlign:"center"}}>${item.price.toFixed(2)}</td>
                        <td style={{...td(bg),color:"#e8f0fc",fontWeight:"bold",textAlign:"center"}}>${item.lineTotal.toFixed(2)}</td>
                        <td style={{...td(bg),textAlign:"center"}}>
                          {item.link?<a href={item.link} target="_blank" rel="noreferrer" style={{color:"#2e5fa3",fontSize:14}}>→</a>:<span style={{color:"#2e3a4e"}}>—</span>}
                        </td>
                      </tr>
                    );
                  })}
                  {displayOrder.length===0&&<tr><td colSpan={6} style={{padding:24,textAlign:"center",color:"#4ade80"}}>◆ ALL STOCKED</td></tr>}
                </tbody>
                {displayOrder.length>0&&(
                  <tfoot>
                    <tr style={{borderTop:"2px solid #1e3a5f"}}>
                      <td colSpan={4} style={{padding:"10px 8px",textAlign:"right",fontSize:10,letterSpacing:2,color:"#4a7ab5"}}>TOTAL</td>
                      <td style={{padding:"10px 8px",fontSize:16,color:displayTotal>budget?"#f87171":"#4ade80",fontWeight:"bold"}}>${displayTotal.toFixed(2)}</td>
                      <td/>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}

        {tab==="setup"&&<InstructionsTab/>}
      </div>
    </div>
  );
}
