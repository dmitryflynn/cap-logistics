import { useState, useMemo, useEffect } from "react";

// ── Styles ──────────────────────────────────────────────────────────────────
const S = {
  app: {
    minHeight: "100vh",
    background: "#0a0e1a",
    color: "#c8d4e8",
    fontFamily: "'Courier New', Courier, monospace",
  },
  header: {
    background: "linear-gradient(180deg,#0d1528 0%,#0a0e1a 100%)",
    borderBottom: "2px solid #1e3a5f",
    padding: "20px 24px 0",
  },
  titleRow: { display: "flex", alignItems: "center", gap: 14, marginBottom: 4 },
  icon: {
    width: 44, height: 44, background: "#1a2d4e",
    border: "2px solid #2e5fa3",
    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
    flexShrink: 0,
  },
  subtitle: { fontSize: 10, letterSpacing: 4, color: "#4a7ab5", textTransform: "uppercase" },
  title: { fontSize: 18, fontWeight: "bold", color: "#e8f0fc", letterSpacing: 2 },
  budgetLabel: { fontSize: 10, color: "#4a7ab5", letterSpacing: 2, textAlign: "right" },
  budgetVal: { fontSize: 22, color: "#4ade80", letterSpacing: 1, textAlign: "right" },
  demoBanner: {
    background: "#1a2500", border: "1px solid #4a7a00", borderBottom: "none",
    padding: "3px 10px", fontSize: 10, letterSpacing: 2, color: "#a3c44a",
    display: "inline-block",
  },
  tabs: { display: "flex", marginTop: 14 },
  tab: (active) => ({
    background: active ? "#1e3a5f" : "transparent",
    border: "none",
    borderTop: active ? "2px solid #2e5fa3" : "2px solid transparent",
    borderLeft: active ? "1px solid #1e3a5f" : "1px solid transparent",
    borderRight: active ? "1px solid #1e3a5f" : "1px solid transparent",
    color: active ? "#e8f0fc" : "#4a7ab5",
    padding: "9px 20px", fontSize: 10, letterSpacing: 3, cursor: "pointer",
    fontFamily: "inherit",
  }),
  body: { padding: "20px 24px" },
  card: {
    background: "#0d1528", border: "1px solid #1e3a5f",
    padding: "14px 18px", flex: 1, minWidth: 100,
  },
  cardLabel: { fontSize: 9, letterSpacing: 3, marginBottom: 6 },
  cardVal: { fontSize: 26, lineHeight: 1 },
  input: {
    background: "#0d1528", border: "1px solid #1e3a5f", color: "#c8d4e8",
    padding: "6px 10px", fontFamily: "inherit", fontSize: 11, width: "100%",
    boxSizing: "border-box",
  },
  btn: (color = "#2e5fa3", bg = "#0d1528") => ({
    background: bg, border: `1px solid ${color}`, color,
    padding: "8px 14px", fontSize: 9, letterSpacing: 2,
    cursor: "pointer", fontFamily: "inherit",
  }),
  tbl: { width: "100%", borderCollapse: "collapse", fontSize: 12 },
  th: {
    textAlign: "left", padding: "8px 10px",
    fontSize: 9, letterSpacing: 2, color: "#4a7ab5", fontWeight: "normal",
    borderBottom: "2px solid #1e3a5f",
  },
  td: (bg) => ({
    padding: "9px 10px", borderBottom: "1px solid #0f1e35",
    background: bg,
  }),
  dot: (color) => ({
    width: 6, height: 6, borderRadius: "50%",
    background: color, boxShadow: `0 0 5px ${color}`,
    display: "inline-block", marginRight: 6,
  }),
};

// ── Status helper ────────────────────────────────────────────────────────────
function getStatus(item) {
  if (!item.minLevel || item.minLevel === 0) return "ok";
  const ratio = item.onHand / item.minLevel;
  if (item.onHand === 0) return "critical";
  if (ratio < 0.5) return "critical";
  if (ratio < 1) return "low";
  return "ok";
}
const STATUS = {
  ok:       { label: "OK",       color: "#4ade80" },
  low:      { label: "LOW",      color: "#facc15" },
  critical: { label: "CRITICAL", color: "#f87171" },
};

function qtyToOrder(item) {
  return Math.max(0, Math.ceil((item.demand - item.onHand) / 2));
}

// ── Settings modal ────────────────────────────────────────────────────────────
function SettingsModal({ onClose, onSave }) {
  const [sheetId, setSheetId] = useState(localStorage.getItem("cap_sheet_id") || "");
  const [apiKey, setApiKey]   = useState(localStorage.getItem("cap_api_key")  || "");

  function save() {
    localStorage.setItem("cap_sheet_id", sheetId.trim());
    localStorage.setItem("cap_api_key",  apiKey.trim());
    onSave(sheetId.trim(), apiKey.trim());
    onClose();
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "#000a", zIndex: 999,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }}>
      <div style={{ background: "#0d1528", border: "1px solid #2e5fa3", padding: 24, maxWidth: 520, width: "100%" }}>
        <div style={{ fontSize: 12, letterSpacing: 3, color: "#4a7ab5", marginBottom: 18 }}>⚙ GOOGLE SHEETS CONNECTION</div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 9, letterSpacing: 2, color: "#4a7ab5", marginBottom: 4 }}>GOOGLE SHEET ID</div>
          <input style={S.input} value={sheetId} onChange={e => setSheetId(e.target.value)}
            placeholder="e.g. 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms" />
          <div style={{ fontSize: 9, color: "#4a6a8a", marginTop: 3 }}>Found in your sheet's URL between /d/ and /edit</div>
        </div>

        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 9, letterSpacing: 2, color: "#4a7ab5", marginBottom: 4 }}>GOOGLE SHEETS API KEY</div>
          <input style={S.input} type="password" value={apiKey} onChange={e => setApiKey(e.target.value)}
            placeholder="AIza..." />
          <div style={{ fontSize: 9, color: "#4a6a8a", marginTop: 3 }}>See the "How To Get API Key" tab for setup instructions</div>
        </div>

        <div style={{ fontSize: 9, letterSpacing: 2, color: "#facc15", marginBottom: 14, background: "#1a1400", border: "1px solid #facc1544", padding: "8px 10px" }}>
          ⚠ Your sheet must use the exact column layout from the CAP_Logistics_Manager_v2.xlsx template.<br/>
          Sheet name: <strong>Inventory</strong> — Budget cell: <strong>G3</strong>
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button style={S.btn("#4a7ab5")} onClick={onClose}>CANCEL</button>
          <button style={S.btn("#4ade80", "#0a2d0a")} onClick={save}>SAVE &amp; CONNECT</button>
        </div>
      </div>
    </div>
  );
}

// ── API key instructions tab ──────────────────────────────────────────────────
function InstructionsTab() {
  const steps = [
    { n: "1", title: "Go to Google Cloud Console", body: "Visit console.cloud.google.com and sign in with your Google account." },
    { n: "2", title: "Create or select a project", body: 'Click the project dropdown at the top → "New Project" → name it anything (e.g. "CAP Logistics") → Create.' },
    { n: "3", title: "Enable the Google Sheets API", body: 'In the left sidebar go to APIs & Services → Library. Search "Google Sheets API" → click it → click Enable.' },
    { n: "4", title: "Create an API Key", body: 'Go to APIs & Services → Credentials → "+ Create Credentials" → API key. Copy the key shown.' },
    { n: "5", title: "Restrict the key (recommended)", body: 'Click "Edit API key" → under API restrictions select "Restrict key" → choose Google Sheets API → Save.' },
    { n: "6", title: "Share your Google Sheet", body: 'Open your sheet → Share → change "General access" to "Anyone with the link" set to Viewer. This allows the API key to read it.' },
    { n: "7", title: "Get your Sheet ID", body: 'Look at your sheet\'s URL: docs.google.com/spreadsheets/d/[THIS_PART]/edit — copy the long string between /d/ and /edit.' },
    { n: "8", title: "Enter both into the app", body: 'Click the ⚙ CONNECT SHEET button in the top right of the app, paste your Sheet ID and API Key, then click Save & Connect.' },
  ];

  return (
    <div>
      <div style={{ fontSize: 11, letterSpacing: 3, color: "#4a7ab5", marginBottom: 16 }}>◆ HOW TO GET YOUR GOOGLE SHEETS API KEY</div>
      {steps.map(s => (
        <div key={s.n} style={{ display: "flex", gap: 16, marginBottom: 14, background: "#0d1528", border: "1px solid #1e3a5f", padding: "14px 16px" }}>
          <div style={{ fontSize: 20, color: "#2e5fa3", fontWeight: "bold", minWidth: 28, lineHeight: 1.2 }}>{s.n}</div>
          <div>
            <div style={{ fontSize: 11, fontWeight: "bold", color: "#e8f0fc", marginBottom: 4 }}>{s.title}</div>
            <div style={{ fontSize: 11, color: "#7a9cc8", lineHeight: 1.6 }}>{s.body}</div>
          </div>
        </div>
      ))}
      <div style={{ background: "#0a2d0a", border: "1px solid #4ade8055", padding: "12px 16px", fontSize: 10, color: "#4ade80", letterSpacing: 1 }}>
        ◆ IMPORTANT: Your sheet must match the column layout in CAP_Logistics_Manager_v2.xlsx exactly.<br/>
        Sheet tab must be named <strong>Inventory</strong>. Budget goes in cell <strong>G3</strong>.<br/>
        Columns: A=Category, B=Item, C=On Hand, D=On Order, E=Demand, F=D-OH, G=To Order, H=Price/ea, I=Net Price, J=Link
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
const SHEET_RANGE = "Inventory!A5:J200";
const BUDGET_RANGE = "Inventory!G3";

export default function App() {
  const [tab, setTab]           = useState("inventory");
  const [items, setItems]       = useState([]);
  const [budget, setBudget]     = useState(350);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [lastSync, setLastSync] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [connected, setConnected] = useState(false);
  const [sheetId, setSheetId]   = useState(localStorage.getItem("cap_sheet_id") || "");
  const [apiKey, setApiKey]     = useState(localStorage.getItem("cap_api_key")  || "");
  const [catFilter, setCatFilter] = useState("All");
  const [statFilter, setStatFilter] = useState("All");
  const [prioritized, setPrioritized] = useState(false);
  const [copied, setCopied]     = useState(false);
  const [demoMode, setDemoMode] = useState(false);

  // Load from Google Sheets
  async function fetchSheet(sid, key) {
    if (!sid || !key) return;
    setLoading(true); setError(null);
    try {
      const encode = (r) => encodeURIComponent(r);
      const base = `https://sheets.googleapis.com/v4/spreadsheets/${sid}/values`;
      const [dataRes, budgetRes] = await Promise.all([
        fetch(`${base}/${encode(SHEET_RANGE)}?key=${key}`),
        fetch(`${base}/${encode(BUDGET_RANGE)}?key=${key}`),
      ]);
      if (!dataRes.ok) throw new Error(`Sheets API error: ${dataRes.status} — check your Sheet ID and API Key`);
      const dataJson   = await dataRes.json();
      const budgetJson = await budgetRes.json();

      const rows = dataJson.values || [];
      const parsed = [];
      let lastCat = "";
      for (const row of rows) {
        const cat    = (row[0] || "").trim();
        const item   = (row[1] || "").trim();
        if (!item) continue;
        if (cat) lastCat = cat;
        const onHand  = parseFloat(row[2]) || 0;
        const onOrder = parseFloat(row[3]) || 0;
        const demand  = parseFloat(row[4]) || 0;
        const price   = parseFloat(row[7]) || 0;
        const link    = (row[9] || "").trim();
        parsed.push({ category: lastCat, name: item, onHand, onOrder, demand,
                      price, link, minLevel: demand });
      }
      setItems(parsed);

      const bv = budgetJson.values?.[0]?.[0];
      if (bv) setBudget(parseFloat(String(bv).replace(/[$,]/g,"")) || 350);

      setLastSync(new Date());
      setConnected(true);
      setDemoMode(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function loadDemo() {
    const demo = [
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
      {category:"",name:"C/2d Lt Ribbon / Mitchell",onHand:4,onOrder:0,demand:0,price:1.60,minLevel:0,link:""},
      {category:"Senior Cloth Insignia",name:"1st Lt Cloth Insignia",onHand:8,onOrder:0,demand:10,price:1.70,minLevel:10,link:""},
      {category:"",name:"Maj Cloth Insignia",onHand:4,onOrder:0,demand:8,price:1.55,minLevel:8,link:""},
      {category:"",name:"Lt Col Cloth Insignia",onHand:0,onOrder:0,demand:8,price:1.55,minLevel:8,link:""},
      {category:"Senior Epaulet Sleeves",name:"1st Lt Epaulet Sleeve",onHand:0,onOrder:0,demand:10,price:4.45,minLevel:10,link:""},
      {category:"",name:"Lt Col Epaulet Sleeve",onHand:0,onOrder:0,demand:8,price:5.50,minLevel:8,link:""},
    ];
    setItems(demo);
    setBudget(350);
    setDemoMode(true);
    setConnected(false);
  }

  useEffect(() => {
    if (sheetId && apiKey) {
      fetchSheet(sheetId, apiKey);
    } else {
      loadDemo();
    }
  }, []);

  function handleSave(sid, key) {
    setSheetId(sid); setApiKey(key);
    fetchSheet(sid, key);
  }

  // Derived data
  const cats = useMemo(() => ["All", ...Array.from(new Set(items.map(i => i.category).filter(Boolean)))], [items]);

  const filtered = useMemo(() => items.filter(i => {
    const cOk = catFilter === "All" || i.category === catFilter;
    const st  = getStatus(i);
    const sOk = statFilter === "All" || st === statFilter.toLowerCase();
    return cOk && sOk;
  }), [items, catFilter, statFilter]);

  const counts = useMemo(() => ({
    ok: items.filter(i => getStatus(i) === "ok").length,
    low: items.filter(i => getStatus(i) === "low").length,
    critical: items.filter(i => getStatus(i) === "critical").length,
  }), [items]);

  const orderItems = useMemo(() =>
    items
      .filter(i => qtyToOrder(i) > 0)
      .map(i => ({ ...i, qty: qtyToOrder(i), lineTotal: qtyToOrder(i) * i.price }))
      .sort((a, b) => {
        const rank = { critical: 0, low: 1, ok: 2 };
        return rank[getStatus(a)] - rank[getStatus(b)];
      }),
    [items]);

  const orderTotal = useMemo(() => orderItems.reduce((s, i) => s + i.lineTotal, 0), [orderItems]);
  const overBudget = orderTotal > budget;

  const prioritizedOrder = useMemo(() => {
    let rem = budget; const r = [];
    for (const item of orderItems) {
      if (item.lineTotal <= rem) { r.push(item); rem -= item.lineTotal; }
    }
    return r;
  }, [orderItems, budget]);

  const displayOrder = prioritized ? prioritizedOrder : orderItems;
  const displayTotal = displayOrder.reduce((s, i) => s + i.lineTotal, 0);

  function handleCopy() {
    const lines = [
      "=== VANGUARD ORDER SUMMARY ===",
      `Date: ${new Date().toLocaleDateString()}`,
      `Budget: $${budget.toFixed(2)} | Order Total: $${displayTotal.toFixed(2)}`,
      "",
      ...displayOrder.map(i => `${i.name.padEnd(36)} ×${String(i.qty).padStart(3)}  $${i.price.toFixed(2).padStart(6)}  =  $${i.lineTotal.toFixed(2).padStart(8)}`),
      "",
      `TOTAL: $${displayTotal.toFixed(2)}`,
    ];
    navigator.clipboard.writeText(lines.join("\n"));
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }

  const TABS = [["inventory","INVENTORY"],["order","ORDER GENERATOR"],["apikey","HOW TO GET API KEY"]];

  return (
    <div style={S.app}>
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} onSave={handleSave} />}

      {/* Header */}
      <div style={S.header}>
        <div style={S.titleRow}>
          <div style={S.icon}>✈</div>
          <div style={{ flex: 1 }}>
            <div style={S.subtitle}>Civil Air Patrol</div>
            <div style={S.title}>LOGISTICS MANAGER</div>
          </div>
          <div style={{ textAlign: "right", marginRight: 8 }}>
            <div style={S.budgetLabel}>MONTHLY BUDGET</div>
            <div style={S.budgetVal}>${budget.toFixed(2)}</div>
          </div>
          <button
            style={{ ...S.btn(connected ? "#4ade80" : "#facc15", connected ? "#0a2d0a" : "#1a1400"), fontSize: 9 }}
            onClick={() => setShowSettings(true)}
          >
            {connected ? "◆ CONNECTED" : "⚙ CONNECT SHEET"}
          </button>
        </div>

        {demoMode && (
          <div style={S.demoBanner}>◆ DEMO MODE — connect your Google Sheet to use live data</div>
        )}
        {loading && (
          <div style={{ ...S.demoBanner, background: "#001a2d", borderColor: "#2e5fa3", color: "#4a7ab5" }}>⟳ SYNCING...</div>
        )}
        {error && (
          <div style={{ ...S.demoBanner, background: "#1a0d0d", borderColor: "#f87171", color: "#f87171" }}>⚠ {error}</div>
        )}
        {lastSync && !loading && (
          <div style={{ ...S.demoBanner, background: "#001a0d", borderColor: "#4ade8055", color: "#4ade80" }}>
            ◆ SYNCED {lastSync.toLocaleTimeString()}
            <button onClick={() => fetchSheet(sheetId, apiKey)}
              style={{ background: "none", border: "none", color: "#4ade80", cursor: "pointer", fontFamily: "inherit", fontSize: 9, marginLeft: 8 }}>
              ↺ REFRESH
            </button>
          </div>
        )}

        <div style={S.tabs}>
          {TABS.map(([k, label]) => (
            <button key={k} style={S.tab(tab === k)} onClick={() => setTab(k)}>{label}</button>
          ))}
        </div>
      </div>

      <div style={S.body}>

        {/* ── INVENTORY TAB ── */}
        {tab === "inventory" && (
          <div>
            <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
              {[
                { label: "TOTAL ITEMS", value: items.length, color: "#4a7ab5" },
                { label: "STOCKED OK",  value: counts.ok,    color: "#4ade80" },
                { label: "LOW STOCK",   value: counts.low,   color: "#facc15" },
                { label: "CRITICAL",    value: counts.critical, color: "#f87171" },
              ].map(c => (
                <div key={c.label} style={{ ...S.card, borderColor: `${c.color}33` }}>
                  <div style={{ ...S.cardLabel, color: c.color }}>{c.label}</div>
                  <div style={{ ...S.cardVal, color: c.color }}>{c.value}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
              {[
                { label: "CATEGORY", val: catFilter, set: setCatFilter, opts: cats },
                { label: "STATUS",   val: statFilter, set: setStatFilter, opts: ["All","OK","Low","Critical"] },
              ].map(f => (
                <div key={f.label}>
                  <div style={{ fontSize: 9, letterSpacing: 2, color: "#4a7ab5", marginBottom: 3 }}>{f.label}</div>
                  <select value={f.val} onChange={e => f.set(e.target.value)}
                    style={{ background: "#0d1528", border: "1px solid #1e3a5f", color: "#c8d4e8", padding: "5px 8px", fontFamily: "inherit", fontSize: 11, cursor: "pointer" }}>
                    {f.opts.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              ))}
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={S.tbl}>
                <thead>
                  <tr>
                    {["CATEGORY","ITEM NAME","ON HAND","DEMAND","TO ORDER","PRICE/EA","STATUS"].map(h => (
                      <th key={h} style={S.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item, idx) => {
                    const st = getStatus(item);
                    const sc = STATUS[st];
                    const bg = idx % 2 === 0 ? "#0d1528" : "transparent";
                    const toOrd = qtyToOrder(item);
                    return (
                      <tr key={idx}>
                        <td style={{ ...S.td(bg), fontSize: 9, color: "#4a7ab5", fontWeight: "bold" }}>{item.category || ""}</td>
                        <td style={{ ...S.td(bg), color: "#e8f0fc" }}>{item.name}</td>
                        <td style={{ ...S.td(bg), color: item.onHand === 0 ? "#f87171" : "#e8f0fc", fontWeight: "bold", textAlign: "center" }}>{item.onHand}</td>
                        <td style={{ ...S.td(bg), color: "#7a9cc8", textAlign: "center" }}>{item.demand}</td>
                        <td style={{ ...S.td(bg), textAlign: "center" }}>
                          {toOrd > 0
                            ? <span style={{ color: "#facc15", fontWeight: "bold", background: "#1a1400", padding: "2px 6px", border: "1px solid #facc1544" }}>{toOrd}</span>
                            : <span style={{ color: "#2e5fa3" }}>—</span>}
                        </td>
                        <td style={{ ...S.td(bg), color: "#7a9cc8", textAlign: "center" }}>{item.price > 0 ? `$${item.price.toFixed(2)}` : "—"}</td>
                        <td style={{ ...S.td(bg) }}>
                          <span style={{ display: "inline-flex", alignItems: "center", fontSize: 9, letterSpacing: 2, color: sc.color }}>
                            <span style={S.dot(sc.color)} />{sc.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr><td colSpan={7} style={{ padding: 24, textAlign: "center", color: "#4a7ab5" }}>NO ITEMS MATCH FILTER</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── ORDER TAB ── */}
        {tab === "order" && (
          <div>
            <div style={{ background: "#0d1528", border: `1px solid ${overBudget ? "#f8717155" : "#1e3a5f"}`, padding: "14px 18px", marginBottom: 16, display: "flex", gap: 20, flexWrap: "wrap", alignItems: "center" }}>
              {[
                { label: "BUDGET",    val: `$${budget.toFixed(2)}`,           color: "#4ade80" },
                { label: "ORDER TOTAL", val: `$${displayTotal.toFixed(2)}`,   color: overBudget && !prioritized ? "#f87171" : "#e8f0fc" },
                { label: "REMAINING", val: `$${(budget - displayTotal).toFixed(2)}`, color: budget - displayTotal >= 0 ? "#4ade80" : "#f87171" },
              ].map(b => (
                <div key={b.label}>
                  <div style={{ fontSize: 9, letterSpacing: 2, color: "#4a7ab5" }}>{b.label}</div>
                  <div style={{ fontSize: 20, color: b.color }}>{b.val}</div>
                </div>
              ))}
              <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
                {overBudget && (
                  <button onClick={() => setPrioritized(p => !p)}
                    style={S.btn(prioritized ? "#4a7ab5" : "#f87171", prioritized ? "#0d1528" : "#1a0d0d")}>
                    {prioritized ? "◆ PRIORITIZED" : "⚠ OVER BUDGET — PRIORITIZE"}
                  </button>
                )}
                <button onClick={handleCopy} style={S.btn(copied ? "#4ade80" : "#4a7ab5", copied ? "#0a2d0a" : "#0d1528")}>
                  {copied ? "✓ COPIED" : "⎘ COPY ORDER"}
                </button>
              </div>
            </div>

            {overBudget && !prioritized && (
              <div style={{ background: "#1a0d0d", border: "1px solid #f8717155", padding: "8px 14px", marginBottom: 12, fontSize: 10, color: "#f87171", letterSpacing: 1 }}>
                ⚠ ORDER EXCEEDS BUDGET BY ${(displayTotal - budget).toFixed(2)} — CLICK "PRIORITIZE" TO TRIM TO BUDGET (CRITICAL ITEMS FIRST)
              </div>
            )}

            <div style={{ overflowX: "auto" }}>
              <table style={S.tbl}>
                <thead>
                  <tr>
                    {["ITEM NAME","PRIORITY","QTY","PRICE/EA","LINE TOTAL","LINK"].map(h => (
                      <th key={h} style={S.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayOrder.map((item, idx) => {
                    const sc = STATUS[getStatus(item)];
                    const bg = idx % 2 === 0 ? "#0d1528" : "transparent";
                    return (
                      <tr key={idx}>
                        <td style={{ ...S.td(bg), color: "#e8f0fc" }}>{item.name}</td>
                        <td style={S.td(bg)}>
                          <span style={{ color: sc.color, fontSize: 9, letterSpacing: 2 }}>● {sc.label}</span>
                        </td>
                        <td style={{ ...S.td(bg), color: "#facc15", fontWeight: "bold", textAlign: "center" }}>{item.qty}</td>
                        <td style={{ ...S.td(bg), color: "#7a9cc8", textAlign: "center" }}>${item.price.toFixed(2)}</td>
                        <td style={{ ...S.td(bg), color: "#e8f0fc", fontWeight: "bold", textAlign: "center" }}>${item.lineTotal.toFixed(2)}</td>
                        <td style={S.td(bg)}>
                          {item.link
                            ? <a href={item.link} target="_blank" rel="noreferrer" style={{ color: "#2e5fa3", fontSize: 9 }}>VANGUARD →</a>
                            : <span style={{ color: "#2e3a4e", fontSize: 9 }}>—</span>}
                        </td>
                      </tr>
                    );
                  })}
                  {displayOrder.length === 0 && (
                    <tr><td colSpan={6} style={{ padding: 24, textAlign: "center", color: "#4ade80" }}>◆ ALL ITEMS SUFFICIENTLY STOCKED</td></tr>
                  )}
                </tbody>
                {displayOrder.length > 0 && (
                  <tfoot>
                    <tr style={{ borderTop: "2px solid #1e3a5f" }}>
                      <td colSpan={4} style={{ padding: "10px 10px", textAlign: "right", fontSize: 10, letterSpacing: 3, color: "#4a7ab5" }}>ORDER TOTAL</td>
                      <td style={{ padding: "10px 10px", fontSize: 18, color: displayTotal > budget ? "#f87171" : "#4ade80", fontWeight: "bold" }}>
                        ${displayTotal.toFixed(2)}
                      </td>
                      <td style={{ padding: "10px 10px" }} />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}

        {/* ── API KEY TAB ── */}
        {tab === "apikey" && <InstructionsTab />}
      </div>
    </div>
  );
}
