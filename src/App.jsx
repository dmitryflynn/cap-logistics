import { useState, useMemo, useEffect, Fragment } from "react";
import * as XLSX from "xlsx";
import { DemandPasswordModal, DemandEditor } from "./DemandEditor";
import { MonitoringTab } from "./MonitoringTab";

// ── Hardcoded credentials ────────────────────────────────────────────────────
const SHEET_ID     = "11Kj9J2nyhbhUBGIePay3QFts-jd83Y9pHOMODNaNXKs";
const API_KEY      = "AIzaSyADISu_YZy-5ds4Bfz9Uk92piO99KMsM0w";
const SHEET_RANGE  = "Inventory!A5:J200";
const BUDGET_RANGE = "Inventory!G3";
// OAuth Client ID — create at console.cloud.google.com → APIs & Services → Credentials
// → New OAuth 2.0 Client ID (Web application) → add your Vercel URL to authorized origins
const CLIENT_ID    = "437822481287-gs5pt8627b2oms4q7qr6tdpp29lql1e4.apps.googleusercontent.com";

// ── Styles ───────────────────────────────────────────────────────────────────
const MONO = "'IBM Plex Mono', 'Courier New', monospace";

const S = {
  app: {
    minHeight: "100vh",
    background: "#0a0e1a",
    color: "#c8d4e8",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  header: (mob) => ({
    background: "linear-gradient(180deg,#000e40 0%,#040d28 60%,#0a0e1a 100%)",
    borderBottom: "2px solid #1a3a7f",
    padding: mob ? "12px 14px 0" : "16px 24px 0",
  }),
  titleRow: { display: "flex", alignItems: "center", gap: 16, marginBottom: 4 },
  budgetLabel: { fontSize: 9, color: "#4a7ab5", letterSpacing: 2, textAlign: "right", fontFamily: MONO },
  budgetVal: { fontSize: 22, color: "#4ade80", letterSpacing: 0, textAlign: "right", fontFamily: "'Inter', sans-serif", fontWeight: 700 },
  banner: (bg, border, color) => ({
    background: bg, border: `1px solid ${border}`, borderBottom: "none",
    padding: "3px 10px", fontSize: 10, letterSpacing: 2, color,
    display: "inline-block", fontFamily: MONO,
  }),
  tabs: { display: "flex", marginTop: 14, overflowX: "auto", WebkitOverflowScrolling: "touch", scrollbarWidth: "none" },
  tab: (active) => ({
    background: active ? "#0e2560" : "transparent",
    border: "none",
    borderTop: active ? "2px solid #3a6fd8" : "2px solid transparent",
    borderLeft: active ? "1px solid #1a3a7f" : "1px solid transparent",
    borderRight: active ? "1px solid #1a3a7f" : "1px solid transparent",
    color: active ? "#e8f0fc" : "#5a80b8",
    padding: "9px 20px", fontSize: 10, letterSpacing: 2, cursor: "pointer",
    fontFamily: MONO,
  }),
  body: (mob) => ({ padding: mob ? "14px 12px" : "20px 24px" }),
  card: {
    background: "#0d1528", border: "1px solid #1e3a5f",
    padding: "14px 18px", flex: 1, minWidth: 100,
  },
  cardLabel: { fontSize: 9, letterSpacing: 3, marginBottom: 6, fontFamily: MONO },
  cardVal: { fontSize: 26, lineHeight: 1, fontFamily: "'Inter', sans-serif", fontWeight: 700 },
  input: {
    background: "#0d1528", border: "1px solid #1e3a5f", color: "#c8d4e8",
    padding: "6px 10px", fontFamily: "'Inter', sans-serif", fontSize: 13, width: "100%",
    boxSizing: "border-box",
  },
  btn: (color = "#2e5fa3", bg = "#0d1528") => ({
    background: bg, border: `1px solid ${color}`, color,
    padding: "8px 14px", fontSize: 9, letterSpacing: 2,
    cursor: "pointer", fontFamily: MONO,
  }),
  tbl: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: {
    textAlign: "left", padding: "8px 10px",
    fontSize: 9, letterSpacing: 2, color: "#4a7ab5", fontWeight: "normal",
    borderBottom: "2px solid #1e3a5f", fontFamily: MONO,
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

// ── Status + order helpers ───────────────────────────────────────────────────
function getStatus(item, loanedQty = 0) {
  if (!item.minLevel || item.minLevel === 0) return "ok";
  const effective = item.onHand - loanedQty;
  if (effective <= 0) return "critical";
  const ratio = effective / item.minLevel;
  if (ratio < 0.5) return "critical";
  if (ratio < 1) return "low";
  return "ok";
}
const STATUS = {
  ok:       { label: "OK",       color: "#4ade80" },
  low:      { label: "LOW",      color: "#facc15" },
  critical: { label: "CRITICAL", color: "#f87171" },
};

function qtyToOrder(item, loanedQty = 0) {
  const effective = item.onHand - loanedQty;
  return Math.max(0, Math.ceil((item.demand - effective) / 2));
}

// ── Loan persistence ─────────────────────────────────────────────────────────
function loadLoans() {
  try { return JSON.parse(localStorage.getItem("cap_loans") || "[]"); }
  catch { return []; }
}

// ── Loan-only items (never ordered, qty tracked locally) ─────────────────────
const LOAN_ONLY_NAMES = ["Blues Cover", "Blues Blouse", "Blues Trousers", "Blues Skirt"];
function loadLoanOnlyQtys() {
  try { return JSON.parse(localStorage.getItem("cap_loan_only") || "{}"); }
  catch { return {}; }
}

// ── Session OAuth token cache (one popup per page load) ──────────────────────
let _sessionToken = null;
async function getOAuthToken() {
  if (_sessionToken) return _sessionToken;
  return new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: "https://www.googleapis.com/auth/spreadsheets",
      callback: (resp) => {
        if (resp.error) reject(new Error(resp.error_description || resp.error));
        else { _sessionToken = resp.access_token; resolve(resp.access_token); }
      },
    });
    client.requestAccessToken({ prompt: "" });
  });
}

// ── Ensure the Loans sheet tab exists (creates + writes header if missing) ────
async function ensureLoansSheet(token) {
  try {
    const r = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent("Loans!A1:G1")}?key=${API_KEY}`
    );
    const json = await r.json();
    if (r.ok && json.values?.length > 0) return; // tab exists with header
  } catch {}
  // Create tab (silently ignore if it already exists)
  try {
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}:batchUpdate`,
      { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ requests: [{ addSheet: { properties: { title: "Loans" } } }] }) }
    );
  } catch {}
  // Write header row
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent("Loans!A1:G1")}?valueInputOption=USER_ENTERED`,
    { method: "PUT", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ values: [["ID", "ITEM", "BORROWER", "QTY", "DATE_OUT", "RETURNED", "DATE_IN"]] }) }
  );
}

// ── Loan Tracker Tab ─────────────────────────────────────────────────────────
function LoansTab({ items, loans, onAddLoan, onReturnLoan }) {
  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({ itemName: "", borrower: "", qty: 1, dateOut: today });
  const [formError, setFormError] = useState("");

  const activeLoans = loans.filter(l => !l.returned);
  const pastLoans   = loans.filter(l =>  l.returned);

  function submit() {
    if (!form.itemName)         return setFormError("Select an item.");
    if (!form.borrower.trim())  return setFormError("Enter borrower name.");
    const qty = Math.floor(Number(form.qty));
    if (qty < 1)                 return setFormError("Quantity must be a whole number of at least 1.");
    setFormError("");
    onAddLoan({ ...form, borrower: form.borrower.trim(), qty });
    setForm({ itemName: "", borrower: "", qty: 1, dateOut: today });
  }

  return (
    <div>
      {/* New Loan Form */}
      <div style={{ background: "#0d1528", border: "1px solid #1e3a5f", padding: "16px 18px", marginBottom: 20 }}>
        <div style={{ fontSize: 11, letterSpacing: 3, color: "#4a7ab5", marginBottom: 14 }}>◆ LOG NEW LOAN</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: "2 1 180px" }}>
            <div style={{ fontSize: 9, letterSpacing: 2, color: "#4a7ab5", marginBottom: 3 }}>ITEM</div>
            <select value={form.itemName} onChange={e => setForm(f => ({ ...f, itemName: e.target.value }))}
              style={{ ...S.input, cursor: "pointer" }}>
              <option value="">— select item —</option>
              {items.map(item => (
                <option key={item.name} value={item.name}>{item.name}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: "2 1 140px" }}>
            <div style={{ fontSize: 9, letterSpacing: 2, color: "#4a7ab5", marginBottom: 3 }}>BORROWER</div>
            <input style={S.input} value={form.borrower}
              onChange={e => setForm(f => ({ ...f, borrower: e.target.value }))}
              placeholder="Cadet Smith" />
          </div>
          <div style={{ flex: "0 1 70px" }}>
            <div style={{ fontSize: 9, letterSpacing: 2, color: "#4a7ab5", marginBottom: 3 }}>QTY</div>
            <input style={S.input} type="number" min={1} value={form.qty}
              onChange={e => setForm(f => ({ ...f, qty: e.target.value }))} />
          </div>
          <div style={{ flex: "1 1 120px" }}>
            <div style={{ fontSize: 9, letterSpacing: 2, color: "#4a7ab5", marginBottom: 3 }}>DATE OUT</div>
            <input style={S.input} type="date" value={form.dateOut}
              onChange={e => setForm(f => ({ ...f, dateOut: e.target.value }))} />
          </div>
          <button style={S.btn("#4ade80", "#0a2d0a")} onClick={submit}>+ LOG LOAN</button>
        </div>
        {formError && (
          <div style={{ fontSize: 9, color: "#f87171", marginTop: 8 }}>⚠ {formError}</div>
        )}
      </div>

      {/* Active Loans */}
      <div style={{ fontSize: 11, letterSpacing: 3, color: "#4a7ab5", marginBottom: 10 }}>
        ◆ ACTIVE LOANS ({activeLoans.length})
      </div>
      <div style={{ overflowX: "auto", marginBottom: 28 }}>
        <table style={S.tbl}>
          <thead>
            <tr>
              {["ITEM", "BORROWER", "QTY", "DATE OUT", "ACTION"].map(h => (
                <th key={h} style={S.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {activeLoans.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: 20, textAlign: "center", color: "#4a7ab5" }}>
                  NO ACTIVE LOANS
                </td>
              </tr>
            )}
            {activeLoans.map((loan, idx) => {
              const bg = idx % 2 === 0 ? "#0d1528" : "transparent";
              return (
                <tr key={loan.id}>
                  <td style={{ ...S.td(bg), color: "#e8f0fc" }}>{loan.itemName}</td>
                  <td style={{ ...S.td(bg), color: "#c8d4e8" }}>{loan.borrower}</td>
                  <td style={{ ...S.td(bg), color: "#facc15", fontWeight: "bold", textAlign: "center" }}>{loan.qty}</td>
                  <td style={{ ...S.td(bg), color: "#7a9cc8" }}>{loan.dateOut}</td>
                  <td style={S.td(bg)}>
                    <button style={S.btn("#4ade80", "#0a2d0a")} onClick={() => onReturnLoan(loan.id)}>
                      ✓ RETURNED
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Loan History */}
      {pastLoans.length > 0 && (
        <>
          <div style={{ fontSize: 11, letterSpacing: 3, color: "#4a7ab5", marginBottom: 10 }}>
            ◆ LOAN HISTORY ({pastLoans.length})
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={S.tbl}>
              <thead>
                <tr>
                  {["ITEM", "BORROWER", "QTY", "DATE OUT", "DATE RETURNED"].map(h => (
                    <th key={h} style={S.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pastLoans.slice().reverse().map((loan, idx) => {
                  const bg = idx % 2 === 0 ? "#0d1528" : "transparent";
                  return (
                    <tr key={loan.id}>
                      <td style={{ ...S.td(bg), color: "#6a8aaa" }}>{loan.itemName}</td>
                      <td style={{ ...S.td(bg), color: "#6a8aaa" }}>{loan.borrower}</td>
                      <td style={{ ...S.td(bg), color: "#6a8aaa", textAlign: "center" }}>{loan.qty}</td>
                      <td style={{ ...S.td(bg), color: "#6a8aaa" }}>{loan.dateOut}</td>
                      <td style={{ ...S.td(bg), color: "#4ade80" }}>{loan.dateIn}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

// ── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab]             = useState("inventory");
  const [items, setItems]         = useState([]);
  const [budget, setBudget]       = useState(350);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  const [lastSync, setLastSync]   = useState(null);
  const [catFilter, setCatFilter] = useState("All");
  const [statFilter, setStatFilter] = useState("All");
  const [prioritized, setPrioritized] = useState(false);
  const [demoMode, setDemoMode]   = useState(false);
  const [loans, setLoans]           = useState(loadLoans);
  const [demandOverrides, setDemandOverrides] = useState(() => {
    try { return JSON.parse(localStorage.getItem("cap_demand") || "{}"); }
    catch { return {}; }
  });
  const [monitor, setMonitor]       = useState(() => {
    try { return JSON.parse(localStorage.getItem("cap_monitor") || "null"); }
    catch { return null; }
  });
  const [showDemandPw, setShowDemandPw]         = useState(false);
  const [showDemandEditor, setShowDemandEditor] = useState(false);
  const [loanOnlyQtys, setLoanOnlyQtys]         = useState(loadLoanOnlyQtys);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640);
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);

  function saveMonitor(mon) {
    setMonitor(mon);
    if (mon === null) localStorage.removeItem("cap_monitor");
    else localStorage.setItem("cap_monitor", JSON.stringify(mon));
  }

  async function fetchSheet() {
    setLoading(true); setError(null);
    try {
      // Use spreadsheets.get to retrieve both cell values AND embedded hyperlinks.
      // spreadsheets.values only returns display text; hyperlinks live in CellData.
      const fields  = encodeURIComponent("sheets(data(rowData(values(hyperlink,effectiveValue))))");
      const [dataRes, budgetRes] = await Promise.all([
        fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}?ranges=${encodeURIComponent(SHEET_RANGE)}&fields=${fields}&key=${API_KEY}`),
        fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(BUDGET_RANGE)}?key=${API_KEY}&valueRenderOption=UNFORMATTED_VALUE`),
      ]);
      if (!dataRes.ok) throw new Error(`Sheets API error: ${dataRes.status}`);
      const dataJson   = await dataRes.json();
      const budgetJson = await budgetRes.json();

      // Helper: extract raw value from a CellData object
      const cv = (cell) => {
        const ev = cell?.effectiveValue;
        if (!ev) return "";
        if (ev.numberValue !== undefined) return ev.numberValue;
        if (ev.stringValue !== undefined) return ev.stringValue;
        return "";
      };

      const rowData = dataJson.sheets?.[0]?.data?.[0]?.rowData || [];
      const parsed = [];
      let lastCat = "";
      for (let ri = 0; ri < rowData.length; ri++) {
        const cells = rowData[ri]?.values || [];
        const cat   = String(cv(cells[0]) || "").trim();
        const item  = String(cv(cells[1]) || "").trim();
        if (!item) continue;
        if (cat) lastCat = cat;
        parsed.push({
          category: lastCat,
          name:     item,
          onHand:   parseFloat(cv(cells[2])) || 0,
          onOrder:  parseFloat(cv(cells[3])) || 0,
          demand:   parseFloat(cv(cells[4])) || 0,
          price:    parseFloat(cv(cells[7])) || 0,
          link:     cells[9]?.hyperlink || "", // actual embedded URL, not display text
          minLevel: parseFloat(cv(cells[4])) || 0,
          sheetRow: 5 + ri,
        });
      }
      setItems(parsed);

      const bv = budgetJson.values?.[0]?.[0];
      if (bv != null && bv !== "") setBudget(parseFloat(String(bv).replace(/[$,]/g, "")) || 0);

      setLastSync(new Date());
      setDemoMode(false);
    } catch (e) {
      setError(e.message);
      if (items.length === 0) loadDemo();
    } finally {
      setLoading(false);
    }
  }

  function loadDemo() {
    setItems([
      { category: "Cadet Metal Insignia",    name: "C/Amn Insignia",         onHand: 0,  onOrder: 0, demand: 50, price: 8.75,  minLevel: 50, link: "https://www.vanguardmil.com/products/civil-air-patrol-airman-cadet-grade-chevron-insignia", sheetRow: 0 },
      { category: "",                        name: "C/SrA Insignia",          onHand: 7,  onOrder: 0, demand: 0,  price: 9.95,  minLevel: 0,  link: "", sheetRow: 0 },
      { category: "",                        name: "C/TSgt Insignia",         onHand: 5,  onOrder: 0, demand: 0,  price: 10.70, minLevel: 0,  link: "", sheetRow: 0 },
      { category: "",                        name: "C/MSgt Insignia",         onHand: 9,  onOrder: 0, demand: 0,  price: 11.70, minLevel: 0,  link: "", sheetRow: 0 },
      { category: "",                        name: "C/SMSgt Insignia",        onHand: 1,  onOrder: 0, demand: 0,  price: 12.75, minLevel: 0,  link: "", sheetRow: 0 },
      { category: "",                        name: "C/CMSgt Insignia",        onHand: 1,  onOrder: 0, demand: 0,  price: 15.20, minLevel: 0,  link: "", sheetRow: 0 },
      { category: "Cadet Fleece Patches",    name: "NCO Fleece Patch",        onHand: 7,  onOrder: 0, demand: 15, price: 2.15,  minLevel: 15, link: "", sheetRow: 0 },
      { category: "",                        name: "C/1st Lt Fleece Patch",   onHand: 4,  onOrder: 0, demand: 0,  price: 1.95,  minLevel: 0,  link: "", sheetRow: 0 },
      { category: "",                        name: "C/Capt Fleece Patch",     onHand: 0,  onOrder: 0, demand: 0,  price: 1.95,  minLevel: 0,  link: "", sheetRow: 0 },
      { category: "Cadet Achievement Ribbons", name: "C/Amn Ribbon / Curry Award", onHand: 1, onOrder: 0, demand: 35, price: 1.60, minLevel: 35, link: "https://www.vanguardmil.com/products/civil-air-patrol-cadet-curry-ribbon", sheetRow: 0 },
      { category: "",                        name: "C/A1C Ribbon / Arnold Award",  onHand: 15, onOrder: 0, demand: 5, price: 1.60, minLevel: 5, link: "", sheetRow: 0 },
      { category: "",                        name: "C/TSgt Ribbon / Rickenbacker", onHand: 7,  onOrder: 0, demand: 5, price: 1.60, minLevel: 5, link: "", sheetRow: 0 },
      { category: "",                        name: "C/2d Lt Ribbon / Mitchell",    onHand: 4,  onOrder: 0, demand: 0, price: 1.60, minLevel: 0, link: "", sheetRow: 0 },
      { category: "Senior Cloth Insignia",   name: "1st Lt Cloth Insignia",   onHand: 8,  onOrder: 0, demand: 10, price: 1.70,  minLevel: 10, link: "", sheetRow: 0 },
      { category: "",                        name: "Maj Cloth Insignia",      onHand: 4,  onOrder: 0, demand: 8,  price: 1.55,  minLevel: 8,  link: "", sheetRow: 0 },
      { category: "",                        name: "Lt Col Cloth Insignia",   onHand: 0,  onOrder: 0, demand: 8,  price: 1.55,  minLevel: 8,  link: "", sheetRow: 0 },
      { category: "Senior Epaulet Sleeves",  name: "1st Lt Epaulet Sleeve",   onHand: 0,  onOrder: 0, demand: 10, price: 4.45,  minLevel: 10, link: "", sheetRow: 0 },
      { category: "",                        name: "Lt Col Epaulet Sleeve",   onHand: 0,  onOrder: 0, demand: 8,  price: 5.50,  minLevel: 8,  link: "", sheetRow: 0 },
    ]);
    setBudget(350);
    setDemoMode(true);
  }

  async function fetchLoans() {
    try {
      const range = encodeURIComponent("Loans!A2:G500");
      const res = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}?key=${API_KEY}&valueRenderOption=UNFORMATTED_VALUE`
      );
      if (!res.ok) return; // Loans tab doesn't exist yet — keep localStorage data
      const json = await res.json();
      const rows = json.values || [];
      const parsed = rows.map((row, i) => ({
        id:        Number(row[0]) || (Date.now() + i),
        itemName:  String(row[1] || ""),
        borrower:  String(row[2] || ""),
        qty:       Number(row[3]) || 1,
        dateOut:   String(row[4] || ""),
        returned:  row[5] === true || String(row[5]).toUpperCase() === "TRUE",
        dateIn:    row[6] ? String(row[6]) : null,
        sheetRow:  2 + i, // row 1 is the header
      }));
      setLoans(parsed);
      localStorage.setItem("cap_loans", JSON.stringify(parsed));
    } catch (e) {
      console.error("fetchLoans:", e.message);
    }
  }

  useEffect(() => { fetchSheet(); fetchLoans(); }, []);

  // Loan handlers
  async function writeOnHandDelta(itemName, delta, _retried = false) {
    // Loan-only items have no sheet row — update local count only
    if (LOAN_ONLY_NAMES.includes(itemName)) {
      setLoanOnlyQtys(prev => {
        const updated = { ...prev, [itemName]: Math.max(0, (prev[itemName] ?? 0) + delta) };
        localStorage.setItem("cap_loan_only", JSON.stringify(updated));
        return updated;
      });
      return;
    }
    const item = items.find(i => i.name === itemName);
    if (!item?.sheetRow) return;
    try {
      const token = await getOAuthToken();
      const newVal = Math.max(0, item.onHand + delta);
      const range  = encodeURIComponent(`Inventory!C${item.sheetRow}`);
      const r = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}?valueInputOption=USER_ENTERED`,
        { method: "PUT",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ values: [[newVal]] }) }
      );
      if (r.status === 401 && !_retried) { _sessionToken = null; return writeOnHandDelta(itemName, delta, true); }
      if (r.ok) fetchSheet();
    } catch (e) {
      console.error("writeOnHandDelta:", e.message);
    }
  }

  async function addLoan(loanData) {
    const loan = { ...loanData, id: Date.now(), qty: Number(loanData.qty), returned: false, dateIn: null };
    // Optimistic local update
    const updated = [...loans, { ...loan, sheetRow: null }];
    setLoans(updated);
    localStorage.setItem("cap_loans", JSON.stringify(updated));
    // Persist to sheet
    try {
      const token = await getOAuthToken();
      await ensureLoansSheet(token);
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent("Loans!A:G")}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
        { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ values: [[loan.id, loan.itemName, loan.borrower, loan.qty, loan.dateOut, "FALSE", ""]] }) }
      );
      fetchLoans(); // refresh to populate sheetRow values
    } catch (e) {
      console.error("addLoan sheet write:", e.message);
    }
    writeOnHandDelta(loanData.itemName, -Number(loanData.qty));
  }

  async function returnLoan(id) {
    const loan   = loans.find(l => l.id === id);
    const dateIn = new Date().toISOString().split("T")[0];
    const updated = loans.map(l =>
      l.id === id ? { ...l, returned: true, dateIn } : l
    );
    setLoans(updated);
    localStorage.setItem("cap_loans", JSON.stringify(updated));
    // Update sheet row
    if (loan?.sheetRow) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const token = await getOAuthToken();
          const range = encodeURIComponent(`Loans!F${loan.sheetRow}:G${loan.sheetRow}`);
          const r = await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}?valueInputOption=USER_ENTERED`,
            { method: "PUT", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
              body: JSON.stringify({ values: [["TRUE", dateIn]] }) }
          );
          if (r.status === 401 && attempt === 0) { _sessionToken = null; continue; }
          fetchLoans(); // re-sync all devices after marking returned
          break;
        } catch (e) {
          console.error("returnLoan sheet write:", e.message);
          break;
        }
      }
    }
    if (loan) writeOnHandDelta(loan.itemName, Number(loan.qty));
  }

  function lockInOrder() {
    const mon = {
      id: Date.now(),
      orderDate: new Date().toISOString().split("T")[0],
      lockedAt: Date.now(),
      items: displayOrder.map(i => ({
        name: i.name, qty: i.qty, price: i.price,
        lineTotal: i.lineTotal, sheetRow: i.sheetRow,
        onHandAtLock: i.onHand, received: false,
      })),
      placed: false, arrived: false, approved: false, sheetUpdated: false,
      returns: [],
    };
    saveMonitor(mon);
    setTab("monitoring");
  }

  async function approveOrder(mon, currentItems) {
    try {
      const token = await getOAuthToken(); // uses shared _sessionToken cache — no extra popup
      // Compute net on-hand changes (received + returns)
      const changes = {};
      for (const item of mon.items.filter(i => i.received)) {
        const ci = currentItems.find(it => it.name === item.name);
        if (!ci?.sheetRow) continue;
        changes[item.name] = { sheetRow: ci.sheetRow, base: ci.onHand, delta: (changes[item.name]?.delta || 0) + item.qty };
      }
      for (const ret of (mon.returns || [])) {
        const ci = currentItems.find(it => it.name === ret.itemName);
        if (!ci?.sheetRow) continue;
        if (changes[ret.itemName]) changes[ret.itemName].delta += Number(ret.qty);
        else changes[ret.itemName] = { sheetRow: ci.sheetRow, base: ci.onHand, delta: Number(ret.qty) };
      }

      const batchData = Object.values(changes).map(({ sheetRow, base, delta }) => ({
        range: `Inventory!C${sheetRow}`, values: [[base + delta]],
      }));

      if (batchData.length > 0) {
        const r = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values:batchUpdate`,
          { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ valueInputOption: "USER_ENTERED", data: batchData }) }
        );
        if (!r.ok) { const e = await r.json(); throw new Error(e.error?.message || `API error ${r.status}`); }
      }

      // Create order history tab
      const tabName = `Order ${mon.orderDate}`;
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}:batchUpdate`,
        { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ requests: [{ addSheet: { properties: { title: tabName } } }] }) }
      );

      const total = mon.items.reduce((s, i) => s + i.lineTotal, 0);
      const tabRows = [
        ["Overlake Composite Squadron — Order Record"],
        [`Date: ${mon.orderDate}`, `Locked: ${new Date(mon.lockedAt).toLocaleString()}`],
        [],
        ["Item", "Qty Ordered", "Price/ea", "Line Total", "Received"],
        ...mon.items.map(i => [i.name, i.qty, i.price, i.lineTotal, i.received ? "Yes" : "No"]),
        [], ["ORDER TOTAL", "", "", total],
      ];
      if ((mon.returns || []).length > 0) {
        tabRows.push([], ["RETURNS"], ["Item", "Qty Returned"], ...mon.returns.map(r => [r.itemName, r.qty]));
      }
      const wr = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(tabName + "!A1")}?valueInputOption=USER_ENTERED`,
        { method: "PUT", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ values: tabRows }) }
      );
      if (!wr.ok) { const e = await wr.json(); throw new Error(e.error?.message || `Write error ${wr.status}`); }

      fetchSheet();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  // Active loan totals per item name
  const loanMap = useMemo(() => {
    const map = {};
    for (const loan of loans.filter(l => !l.returned)) {
      map[loan.itemName] = (map[loan.itemName] || 0) + Number(loan.qty);
    }
    return map;
  }, [loans]);

  // Apply local demand overrides (password-protected)
  const itemsWithDemand = useMemo(() =>
    items.map(i => {
      const d = demandOverrides[i.name] ?? i.demand;
      return { ...i, demand: d, minLevel: d };
    }),
    [items, demandOverrides]);

  // Loan-only items merged in — never ordered, qty tracked in localStorage
  const loanOnlyItems = useMemo(() =>
    LOAN_ONLY_NAMES.map(name => ({
      category: "Uniform Items",
      name,
      onHand:   loanOnlyQtys[name] ?? 0,
      onOrder:  0,
      demand:   0,
      price:    0,
      link:     "",
      minLevel: 0,
      sheetRow: null,
      loanOnly: true,
    })),
    [loanOnlyQtys]);

  // Full item list: sheet items + loan-only items
  const allItems = useMemo(() => [...itemsWithDemand, ...loanOnlyItems], [itemsWithDemand, loanOnlyItems]);

  // Derived data (use allItems so loan-only items appear in inventory/loans)
  const cats = useMemo(() =>
    ["All", ...Array.from(new Set(allItems.map(i => i.category).filter(Boolean)))],
    [allItems]);

  const filtered = useMemo(() => allItems.filter(i => {
    const cOk = catFilter === "All" || i.category === catFilter;
    const st  = getStatus(i, loanMap[i.name] || 0);
    const sOk = statFilter === "All" || st === statFilter.toLowerCase();
    return cOk && sOk;
  }), [allItems, catFilter, statFilter, loanMap]);

  const counts = useMemo(() => ({
    ok:       allItems.filter(i => getStatus(i, loanMap[i.name] || 0) === "ok").length,
    low:      allItems.filter(i => getStatus(i, loanMap[i.name] || 0) === "low").length,
    critical: allItems.filter(i => getStatus(i, loanMap[i.name] || 0) === "critical").length,
  }), [allItems, loanMap]);

  const orderItems = useMemo(() =>
    itemsWithDemand
      .filter(i => qtyToOrder(i, loanMap[i.name] || 0) > 0)
      .map(i => {
        const loaned = loanMap[i.name] || 0;
        const qty = qtyToOrder(i, loaned);
        return { ...i, qty, lineTotal: qty * i.price, loaned };
      })
      .sort((a, b) => {
        const rank = { critical: 0, low: 1, ok: 2 };
        return rank[getStatus(a, a.loaned)] - rank[getStatus(b, b.loaned)];
      }),
    [itemsWithDemand, loanMap]);

  const orderTotal  = useMemo(() => orderItems.reduce((s, i) => s + i.lineTotal, 0), [orderItems]);
  const overBudget  = orderTotal > budget;

  const prioritizedOrder = useMemo(() => {
    let rem = budget; const r = [];
    for (const item of orderItems) {
      if (item.lineTotal <= rem) { r.push(item); rem -= item.lineTotal; }
    }
    return r;
  }, [orderItems, budget]);

  const displayOrder = prioritized ? prioritizedOrder : orderItems;
  const displayTotal = displayOrder.reduce((s, i) => s + i.lineTotal, 0);

  // Auto-clear prioritized mode if order comes back within budget
  useEffect(() => {
    if (prioritized && !overBudget) setPrioritized(false);
  }, [overBudget]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleExport() {
    const rows = displayOrder.map(i => ({
      "Item Name":  i.name,
      "Priority":   STATUS[getStatus(i, i.loaned)].label,
      "Qty":        i.qty,
      "Price/ea":   i.price,
      "Line Total": i.lineTotal,
      "Link":       i.link || "",
    }));
    rows.push({});
    rows.push({ "Item Name": "ORDER TOTAL", "Line Total": displayTotal });
    rows.push({ "Item Name": "BUDGET",      "Line Total": budget });
    rows.push({ "Item Name": "REMAINING",   "Line Total": parseFloat((budget - displayTotal).toFixed(2)) });

    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [{ wch: 38 }, { wch: 10 }, { wch: 6 }, { wch: 10 }, { wch: 12 }, { wch: 50 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Order");
    const date = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `overlake-order-${date}.xlsx`);
  }

  const activeLoanCount    = loans.filter(l => !l.returned).length;
  const monitoringAlert    = monitor && !monitor.approved;
  const TABS = [
    ["inventory",  "INVENTORY"],
    ["order",      isMobile ? "ORDER" : "ORDER GENERATOR"],
    ["loans",      activeLoanCount > 0 ? `LOANS (${activeLoanCount})` : "LOANS"],
    ["monitoring", monitoringAlert ? (isMobile ? "MONITOR ●" : "MONITORING ●") : (isMobile ? "MONITOR" : "MONITORING")],
  ];

  return (
    <div style={S.app}>
      {showDemandPw && (
        <DemandPasswordModal
          onSuccess={() => { setShowDemandPw(false); setShowDemandEditor(true); }}
          onClose={() => setShowDemandPw(false)}
        />
      )}
      {showDemandEditor && (
        <DemandEditor
          items={itemsWithDemand}
          overrides={demandOverrides}
          onSave={next => {
            setDemandOverrides(next);
            localStorage.setItem("cap_demand", JSON.stringify(next));
          }}
          onClose={() => setShowDemandEditor(false)}
        />
      )}

      {/* Header */}
      <div style={S.header(isMobile)}>
        {isMobile ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <img src="/cap-logo.png" alt="Civil Air Patrol"
              style={{ height: 26, filter: "brightness(0) invert(1)", flexShrink: 0, opacity: 0.92 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#e8f0fc", fontFamily: "'Inter', sans-serif", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                Overlake CAP
              </div>
              <div style={{ fontSize: 8, letterSpacing: 2, color: "#4a6a9a", fontFamily: MONO }}>LOGISTICS MGR</div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontSize: 8, color: "#4a7ab5", letterSpacing: 1, fontFamily: MONO }}>BUDGET</div>
              <div style={{ fontSize: 16, color: "#4ade80", fontWeight: 700, fontFamily: "'Inter', sans-serif", lineHeight: 1 }}>${budget.toFixed(2)}</div>
            </div>
            <button style={{ ...S.btn("#4a7ab5"), padding: "6px 10px", fontSize: 10 }} onClick={() => { fetchSheet(); fetchLoans(); }} disabled={loading}>
              {loading ? "⟳" : "↺"}
            </button>
          </div>
        ) : (
          <div style={S.titleRow}>
            <img
              src="/cap-logo.png"
              alt="Civil Air Patrol"
              style={{ height: 38, filter: "brightness(0) invert(1)", flexShrink: 0, opacity: 0.92 }}
            />
            <div style={{ borderLeft: "1px solid #1e3a7f", paddingLeft: 14, flex: 1 }}>
              <div style={{ fontSize: 9, letterSpacing: 3, color: "#5a82c0", textTransform: "uppercase", marginBottom: 2, fontFamily: MONO }}>
                PCR-WA-050 &middot; Redmond, WA
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#e8f0fc", letterSpacing: 1, lineHeight: 1.15, fontFamily: "'Inter', sans-serif" }}>
                Overlake Composite Squadron
              </div>
              <div style={{ fontSize: 9, letterSpacing: 3, color: "#4a6a9a", textTransform: "uppercase", marginTop: 2, fontFamily: MONO }}>
                Logistics Manager
              </div>
            </div>
            <div style={{ textAlign: "right", marginRight: 8 }}>
              <div style={S.budgetLabel}>MONTHLY BUDGET</div>
              <div style={S.budgetVal}>${budget.toFixed(2)}</div>
            </div>
            <button style={S.btn("#4a7ab5")} onClick={() => { fetchSheet(); fetchLoans(); }} disabled={loading}>
              {loading ? "⟳ SYNCING" : "↺ REFRESH"}
            </button>
          </div>
        )}

        {demoMode && (
          <div style={S.banner("#1a2500", "#4a7a00", "#a3c44a")}>◆ DEMO MODE — sheet unavailable</div>
        )}
        {loading && (
          <div style={S.banner("#001a2d", "#2e5fa3", "#4a7ab5")}>⟳ SYNCING...</div>
        )}
        {error && (
          <div style={S.banner("#1a0d0d", "#f87171", "#f87171")}>⚠ {error}</div>
        )}
        {lastSync && !loading && (
          <div style={S.banner("#001a0d", "#4ade8055", "#4ade80")}>
            ◆ SYNCED {lastSync.toLocaleTimeString()}
          </div>
        )}

        <div style={S.tabs}>
          {TABS.map(([k, label]) => (
            <button key={k} style={S.tab(tab === k)} onClick={() => setTab(k)}>{label}</button>
          ))}
        </div>
      </div>

      <div style={S.body(isMobile)}>

        {/* ── INVENTORY TAB ── */}
        {tab === "inventory" && (
          <div>
            <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
              {[
                { label: "TOTAL ITEMS", value: items.length,    color: "#4a7ab5" },
                { label: "STOCKED OK",  value: counts.ok,       color: "#4ade80" },
                { label: "LOW STOCK",   value: counts.low,      color: "#facc15" },
                { label: "CRITICAL",    value: counts.critical, color: "#f87171" },
              ].map(c => (
                <div key={c.label} style={{ ...S.card, borderColor: `${c.color}33` }}>
                  <div style={{ ...S.cardLabel, color: c.color }}>{c.label}</div>
                  <div style={{ ...S.cardVal, color: c.color }}>{c.value}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap", alignItems: "flex-end" }}>
              {[
                { label: "CATEGORY", val: catFilter,  set: setCatFilter,  opts: cats },
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
              <button style={{ ...S.btn("#facc15", "#1a1400"), marginLeft: "auto" }}
                onClick={() => setShowDemandPw(true)}>
                🔒 EDIT DEMAND
              </button>
              {Object.keys(demandOverrides).length > 0 && (
                <div style={{ fontSize: 9, color: "#facc15", letterSpacing: 1, alignSelf: "center" }}>
                  ★ {Object.keys(demandOverrides).length} local override{Object.keys(demandOverrides).length > 1 ? "s" : ""} active
                </div>
              )}
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={S.tbl}>
                <thead>
                  <tr>
                    {["ITEM NAME","ON HAND","ON LOAN","DEMAND","TO ORDER","PRICE/EA","STATUS"].map(h => (
                      <th key={h} style={{ ...S.th, whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item, idx) => {
                    const loaned = loanMap[item.name] || 0;
                    const st  = getStatus(item, loaned);
                    const sc  = STATUS[st];
                    const bg  = idx % 2 === 0 ? "#0d1528" : "transparent";
                    const toOrd = qtyToOrder(item, loaned);
                    const showCatHeader = item.category && (idx === 0 || item.category !== filtered[idx - 1].category);
                    return (
                      <Fragment key={idx}>
                        {showCatHeader && (
                          <tr>
                            <td colSpan={7} style={{ padding: "7px 10px", background: "#0a1220", borderBottom: "1px solid #1a3a6f", borderTop: idx > 0 ? "2px solid #1a3a6f" : "none", fontSize: 9, letterSpacing: 3, color: "#4a7ab5", fontFamily: MONO }}>
                              ◆ {item.category}
                            </td>
                          </tr>
                        )}
                        <tr>
                          <td style={{ ...S.td(bg), color: "#e8f0fc", whiteSpace: "nowrap" }}>{item.name}</td>
                          {item.loanOnly ? (
                            /* Loan-only: editable on-hand qty, no demand/order/price */
                            <td style={{ ...S.td(bg), textAlign: "center" }}>
                              <input
                                key={item.onHand}
                                type="number" min={0}
                                defaultValue={item.onHand}
                                title="Set on-hand quantity"
                                style={{ width: 52, background: "transparent", border: "1px solid #2e3a4e", color: "#c8d4e8", textAlign: "center", padding: "2px 4px", fontSize: 13, fontFamily: "inherit" }}
                                onBlur={e => {
                                  const v = parseInt(e.target.value);
                                  if (!isNaN(v) && v >= 0 && v !== item.onHand) {
                                    const updated = { ...loanOnlyQtys, [item.name]: v };
                                    setLoanOnlyQtys(updated);
                                    localStorage.setItem("cap_loan_only", JSON.stringify(updated));
                                  }
                                }}
                                onKeyDown={e => e.key === "Enter" && e.target.blur()}
                              />
                            </td>
                          ) : (
                            <td style={{ ...S.td(bg), color: item.onHand === 0 ? "#f87171" : "#e8f0fc", fontWeight: "bold", textAlign: "center" }}>{item.onHand}</td>
                          )}
                          <td style={{ ...S.td(bg), textAlign: "center" }}>
                            {loaned > 0
                              ? <span style={{ color: "#facc15", fontSize: 10 }}>{loaned}</span>
                              : <span style={{ color: "#2e3a4e" }}>—</span>}
                          </td>
                          <td style={{ ...S.td(bg), color: "#7a9cc8", textAlign: "center" }}>
                            {item.loanOnly ? <span style={{ color: "#2e3a4e" }}>—</span> : item.demand}
                          </td>
                          <td style={{ ...S.td(bg), textAlign: "center" }}>
                            {item.loanOnly ? <span style={{ color: "#2e3a4e" }}>—</span> : toOrd > 0
                              ? <span style={{ color: "#facc15", fontWeight: "bold", background: "#1a1400", padding: "2px 6px", border: "1px solid #facc1544" }}>{toOrd}</span>
                              : <span style={{ color: "#2e5fa3" }}>—</span>}
                          </td>
                          <td style={{ ...S.td(bg), color: "#7a9cc8", textAlign: "center" }}>
                            {item.loanOnly ? <span style={{ color: "#2e3a4e" }}>—</span> : item.price > 0 ? `$${item.price.toFixed(2)}` : "—"}
                          </td>
                          <td style={S.td(bg)}>
                            {item.loanOnly
                              ? <span style={{ fontSize: 9, letterSpacing: 2, color: "#4a7ab5", whiteSpace: "nowrap" }}>LOAN ONLY</span>
                              : <span style={{ display: "inline-flex", alignItems: "center", fontSize: 9, letterSpacing: 2, color: sc.color, whiteSpace: "nowrap" }}>
                                  <span style={S.dot(sc.color)} />{sc.label}
                                </span>
                            }
                          </td>
                        </tr>
                      </Fragment>
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
                { label: "BUDGET",      val: `$${budget.toFixed(2)}`,              color: "#4ade80" },
                { label: "ORDER TOTAL", val: `$${displayTotal.toFixed(2)}`,        color: overBudget && !prioritized ? "#f87171" : "#e8f0fc" },
                { label: "REMAINING",   val: `$${(budget - displayTotal).toFixed(2)}`, color: budget - displayTotal >= 0 ? "#4ade80" : "#f87171" },
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
                <button onClick={handleExport} style={S.btn("#4a7ab5", "#0d1528")}>
                  ⬇ EXPORT ORDER
                </button>
                {displayOrder.length > 0 && !monitor && (
                  <button onClick={lockInOrder} style={S.btn("#facc15", "#1a1400")}>
                    ◆ LOCK IN ORDER
                  </button>
                )}
                {monitor && !monitor.approved && (
                  <button onClick={() => setTab("monitoring")} style={S.btn("#f87171", "#1a0d0d")}>
                    ● ORDER IN PROGRESS
                  </button>
                )}
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
                    {["ITEM NAME","PRIORITY","QTY","ON LOAN","PRICE/EA","LINE TOTAL","LINK"].map(h => (
                      <th key={h} style={S.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayOrder.map((item, idx) => {
                    const sc = STATUS[getStatus(item, item.loaned)];
                    const bg = idx % 2 === 0 ? "#0d1528" : "transparent";
                    return (
                      <tr key={idx}>
                        <td style={{ ...S.td(bg), color: "#e8f0fc" }}>{item.name}</td>
                        <td style={S.td(bg)}>
                          <span style={{ color: sc.color, fontSize: 9, letterSpacing: 2 }}>● {sc.label}</span>
                        </td>
                        <td style={{ ...S.td(bg), color: "#facc15", fontWeight: "bold", textAlign: "center" }}>{item.qty}</td>
                        <td style={{ ...S.td(bg), textAlign: "center" }}>
                          {item.loaned > 0
                            ? <span style={{ color: "#facc15", fontSize: 10 }}>{item.loaned}</span>
                            : <span style={{ color: "#2e3a4e" }}>—</span>}
                        </td>
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
                    <tr><td colSpan={7} style={{ padding: 24, textAlign: "center", color: "#4ade80" }}>◆ ALL ITEMS SUFFICIENTLY STOCKED</td></tr>
                  )}
                </tbody>
                {displayOrder.length > 0 && (
                  <tfoot>
                    <tr style={{ borderTop: "2px solid #1e3a5f" }}>
                      <td colSpan={5} style={{ padding: "10px 10px", textAlign: "right", fontSize: 10, letterSpacing: 3, color: "#4a7ab5" }}>ORDER TOTAL</td>
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

        {/* ── LOANS TAB ── */}
        {tab === "loans" && (
          <LoansTab
            items={allItems}
            loans={loans}
            onAddLoan={addLoan}
            onReturnLoan={returnLoan}
          />
        )}

        {/* ── MONITORING TAB ── */}
        {tab === "monitoring" && (
          <MonitoringTab
            items={allItems}
            orderItems={displayOrder}
            monitor={monitor}
            onUpdate={saveMonitor}
            onLockOrder={lockInOrder}
            clientId={CLIENT_ID}
            onApprove={approveOrder}
          />
        )}

      </div>
    </div>
  );
}
