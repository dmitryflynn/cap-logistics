import { useState } from "react";

// Change this to set the admin password for editing demand levels
const DEMAND_PASSWORD = "1478";

const MONO = "'IBM Plex Mono', 'Courier New', monospace";

const inp = {
  background: "#0d1528", border: "1px solid #1e3a5f", color: "#c8d4e8",
  padding: "6px 10px", fontFamily: "'Inter', sans-serif", fontSize: 13, boxSizing: "border-box",
};
const btn = (c = "#2e5fa3", bg = "#0d1528") => ({
  background: bg, border: `1px solid ${c}`, color: c,
  padding: "8px 14px", fontSize: 9, letterSpacing: 2, cursor: "pointer", fontFamily: MONO,
});
const overlay = {
  position: "fixed", inset: 0, background: "#000b", zIndex: 999,
  display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
};
const box = { background: "#0d1528", border: "1px solid #2e5fa3", padding: 24 };

export function DemandPasswordModal({ onSuccess, onClose }) {
  const [pw, setPw]   = useState("");
  const [err, setErr] = useState("");

  function attempt() {
    if (pw === DEMAND_PASSWORD) { setErr(""); onSuccess(); }
    else setErr("Incorrect password.");
  }

  return (
    <div style={overlay}>
      <div style={{ ...box, maxWidth: 340, width: "100%" }}>
        <div style={{ fontSize: 11, letterSpacing: 3, color: "#4a7ab5", marginBottom: 14 }}>
          ◆ ADMIN ACCESS REQUIRED
        </div>
        <input
          type="password" autoFocus
          style={{ ...inp, width: "100%", marginBottom: 6 }}
          value={pw}
          onChange={e => setPw(e.target.value)}
          onKeyDown={e => e.key === "Enter" && attempt()}
          placeholder="Password"
        />
        {err && <div style={{ fontSize: 9, color: "#f87171", marginBottom: 8 }}>⚠ {err}</div>}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14 }}>
          <button style={btn("#4a7ab5")} onClick={onClose}>CANCEL</button>
          <button style={btn("#4ade80", "#0a2d0a")} onClick={attempt}>UNLOCK</button>
        </div>
      </div>
    </div>
  );
}

export function DemandEditor({ items, overrides, onSave, onClose }) {
  const [vals, setVals] = useState(() => {
    const o = {};
    items.forEach(i => { o[i.name] = String(overrides[i.name] ?? i.demand); });
    return o;
  });

  function save() {
    const next = {};
    items.forEach(i => {
      const v = parseInt(vals[i.name]);
      // Only persist items that actually differ from the sheet default
      if (!isNaN(v) && v >= 0 && v !== i.demand) next[i.name] = v;
    });
    onSave(next);
    onClose();
  }

  function reset(itemName, sheetDefault) {
    setVals(v => ({ ...v, [itemName]: String(sheetDefault) }));
  }

  return (
    <div style={overlay}>
      <div style={{ ...box, maxWidth: 620, width: "100%", maxHeight: "82vh", display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 11, letterSpacing: 3, color: "#4a7ab5", marginBottom: 10 }}>
          ◆ EDIT DEMAND LEVELS
        </div>
        <div style={{ fontSize: 9, color: "#facc15", background: "#1a1400", border: "1px solid #facc1533", padding: "7px 10px", marginBottom: 12, letterSpacing: 1 }}>
          ★ Overrides are stored locally on this device. To permanently update the master sheet, edit column E directly in Google Sheets.
        </div>
        <div style={{ overflowY: "auto", flex: 1 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
            <thead>
              <tr>
                {["ITEM", "SHEET DEFAULT", "LOCAL OVERRIDE", ""].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "6px 8px", fontSize: 9, letterSpacing: 2, color: "#4a7ab5", borderBottom: "1px solid #1e3a5f", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => {
                const hasOverride = overrides[item.name] !== undefined && overrides[item.name] !== item.demand;
                const currentVal  = parseInt(vals[item.name]);
                const isDirty     = !isNaN(currentVal) && currentVal !== item.demand;
                return (
                  <tr key={i}>
                    <td style={{ padding: "5px 8px", color: "#c8d4e8", borderBottom: "1px solid #0f1e35" }}>{item.name}</td>
                    <td style={{ padding: "5px 8px", color: "#4a7ab5", textAlign: "center", borderBottom: "1px solid #0f1e35" }}>{item.demand}</td>
                    <td style={{ padding: "5px 8px", borderBottom: "1px solid #0f1e35" }}>
                      <input
                        type="number" min={0}
                        value={vals[item.name] ?? ""}
                        onChange={e => setVals(v => ({ ...v, [item.name]: e.target.value }))}
                        style={{ ...inp, width: 72, borderColor: isDirty ? "#facc15" : "#1e3a5f" }}
                      />
                    </td>
                    <td style={{ padding: "5px 8px", borderBottom: "1px solid #0f1e35" }}>
                      {(hasOverride || isDirty) && (
                        <button style={{ ...btn("#4a7ab5"), padding: "3px 8px", fontSize: 8 }}
                          onClick={() => reset(item.name, item.demand)}>
                          RESET
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
          <button style={btn("#4a7ab5")} onClick={onClose}>CANCEL</button>
          <button style={btn("#4ade80", "#0a2d0a")} onClick={save}>SAVE DEMAND LEVELS</button>
        </div>
      </div>
    </div>
  );
}
