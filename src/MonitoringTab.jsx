import { useState, useEffect, Fragment } from "react";

// ── Shared mini-styles ───────────────────────────────────────────────────────
const MONO = "'IBM Plex Mono', 'Courier New', monospace";

const S = {
  btn: (c = "#2e5fa3", bg = "#0d1528") => ({
    background: bg, border: `1px solid ${c}`, color: c,
    padding: "8px 14px", fontSize: 9, letterSpacing: 2,
    cursor: "pointer", fontFamily: MONO,
  }),
  inp: {
    background: "#0d1528", border: "1px solid #1e3a5f", color: "#c8d4e8",
    padding: "6px 10px", fontFamily: "'Inter', sans-serif", fontSize: 13,
    width: "100%", boxSizing: "border-box",
  },
  th: {
    textAlign: "left", padding: "8px 10px",
    fontSize: 9, letterSpacing: 2, color: "#4a7ab5", fontWeight: "normal",
    borderBottom: "2px solid #1e3a5f", fontFamily: MONO,
  },
  td: (bg) => ({ padding: "9px 10px", borderBottom: "1px solid #0f1e35", background: bg }),
  tbl: { width: "100%", borderCollapse: "collapse", fontSize: 12 },
  card: { background: "#0d1528", border: "1px solid #1e3a5f", padding: "14px 18px" },
  section: { fontSize: 11, letterSpacing: 3, color: "#4a7ab5", marginBottom: 10 },
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function secondTuesdayOf(year, month) {
  const dow = new Date(year, month, 1).getDay();
  const firstTue = ((2 - dow + 7) % 7) + 1;
  return new Date(year, month, firstTue + 7);
}

function getNextOrderDate() {
  const now = new Date();
  now.setHours(0, 0, 0, 0); // compare at day boundary so today's date is included
  const st = secondTuesdayOf(now.getFullYear(), now.getMonth());
  if (st >= now) return st;
  const nm = now.getMonth() === 11 ? 0 : now.getMonth() + 1;
  const ny = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear();
  return secondTuesdayOf(ny, nm);
}

function daysUntil(date) {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const d   = new Date(date); d.setHours(0, 0, 0, 0);
  return Math.round((d - now) / 86400000);
}

// ── Shipment tracking ────────────────────────────────────────────────────────
const SHIP_STAGES = [
  { id: "label",     label: "LABEL\nCREATED"    },
  { id: "transit",   label: "IN\nTRANSIT"        },
  { id: "out",       label: "OUT FOR\nDELIVERY"  },
  { id: "delivered", label: "DELIVERED"           },
];

const CARRIERS = {
  ups:   { name: "UPS",   url: n => `https://www.ups.com/track?tracknum=${n}` },
  usps:  { name: "USPS",  url: n => `https://tools.usps.com/go/TrackConfirmAction?tLabels=${n}` },
  fedex: { name: "FedEx", url: n => `https://www.fedex.com/fedextrack/?tracknumbers=${n}` },
  dhl:   { name: "DHL",   url: n => `https://www.dhl.com/us-en/home/tracking.html?tracking-id=${n}` },
};

function detectCarrier(raw) {
  const n = raw.replace(/[\s-]/g, "").toUpperCase();
  if (/^1Z[A-Z0-9]{16}$/.test(n))              return "ups";
  if (/^9[0-9]{21}$/.test(n))                  return "usps"; // 22-digit Priority/First Class
  if (/^[A-Z]{2}\d{9}[A-Z]{2}$/.test(n))       return "usps"; // international
  if (/^\d{12}$/.test(n) || /^\d{15}$/.test(n) || /^\d{20}$/.test(n)) return "fedex";
  if (/^\d{10,11}$/.test(n))                    return "dhl";
  return null;
}

// ── Step badge ───────────────────────────────────────────────────────────────
function StepBadge({ n, label, done, active, onClick }) {
  const color  = done ? "#4ade80" : active ? "#facc15" : "#1e3a5f";
  const txtClr = done ? "#4ade80" : active ? "#facc15" : "#4a7ab5";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flex: 1 }}>
      <div style={{ width: 36, height: 36, border: `2px solid ${color}`, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color }}>
        {done ? "✓" : n}
      </div>
      <div style={{ fontSize: 8, letterSpacing: 2, color: txtClr, textAlign: "center" }}>{label}</div>
      {active && !done && (
        <button style={{ ...S.btn("#facc15", "#1a1400"), padding: "5px 10px", fontSize: 8 }} onClick={onClick}>
          MARK {label}
        </button>
      )}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export function MonitoringTab({
  items,          // current inventory (sheetRow, onHand, name)
  orderItems,     // computed order queue from Order tab
  monitor,        // localStorage monitor state (null if no active order)
  onUpdate,       // fn(newMonitor) — persists to localStorage
  onLockOrder,    // fn() — snapshots current orderItems into monitor
  clientId,       // Google OAuth Client ID constant
  onApprove,      // async fn(token, monitor, items) → { ok, error }
}) {
  const nextOrder = getNextOrderDate();
  const days      = daysUntil(nextOrder);
  const dateStr   = nextOrder.toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const [returnForm, setReturnForm] = useState({ itemName: "", qty: 1 });
  const [returnErr,  setReturnErr]  = useState("");
  const [approving,  setApproving]  = useState(false);
  const [approveErr, setApproveErr] = useState("");
  const [approveOk,  setApproveOk]  = useState(false);

  // Tracking input state — local until saved
  const [trackNum,      setTrackNum]      = useState(() => monitor?.tracking?.number        || "");
  const [trackDelivery, setTrackDelivery] = useState(() => monitor?.tracking?.estimatedDelivery || "");

  // Reset inputs when a new order is loaded (different id)
  useEffect(() => {
    setTrackNum(monitor?.tracking?.number || "");
    setTrackDelivery(monitor?.tracking?.estimatedDelivery || "");
  }, [monitor?.id ?? null]); // eslint-disable-line react-hooks/exhaustive-deps

  function saveTracking() {
    const num = trackNum.trim();
    if (!num) return;
    onUpdate({ ...monitor, tracking: {
      ...(monitor.tracking || {}),
      number: num,
      estimatedDelivery: trackDelivery || null,
      stage: monitor?.tracking?.stage || "label",
    }});
  }

  function advanceStage(stageId) {
    onUpdate({ ...monitor, tracking: { ...(monitor.tracking || {}), stage: stageId } });
    // Auto-set ARRIVED when user marks the package as delivered
    if (stageId === "delivered" && !monitor.arrived) {
      onUpdate({ ...monitor, arrived: true, tracking: { ...(monitor.tracking || {}), stage: stageId } });
    }
  }

  // ── Checklist toggles ──
  function toggleReceived(idx) {
    const newItems = monitor.items.map((it, i) =>
      i === idx ? { ...it, received: !it.received } : it
    );
    onUpdate({ ...monitor, items: newItems });
  }

  // ── Returns ──
  function addReturn() {
    if (!returnForm.itemName) return setReturnErr("Select an item.");
    const qty = Math.floor(Number(returnForm.qty));
    if (qty < 1) return setReturnErr("Qty must be a whole number of at least 1.");
    setReturnErr("");
    const sheetItem = items.find(it => it.name === returnForm.itemName);
    const returns = [
      ...(monitor.returns || []),
      { itemName: returnForm.itemName, qty, sheetRow: sheetItem?.sheetRow },
    ];
    onUpdate({ ...monitor, returns });
    setReturnForm({ itemName: "", qty: 1 });
  }

  function removeReturn(idx) {
    const returns = (monitor.returns || []).filter((_, i) => i !== idx);
    onUpdate({ ...monitor, returns });
  }

  // ── Approve ──
  // OAuth is handled inside onApprove (uses the shared session token cache in App.jsx)
  async function handleApprove() {
    if (!clientId) {
      setApproveErr("OAuth Client ID not configured. See the CLIENT_ID constant in App.jsx.");
      return;
    }
    setApproving(true); setApproveErr(""); setApproveOk(false);
    try {
      const result = await onApprove(monitor, items);
      if (result.ok) {
        setApproveOk(true);
        onUpdate({ ...monitor, approved: true, sheetUpdated: true });
      } else {
        setApproveErr(result.error || "Unknown error during sheet write.");
      }
    } catch (e) {
      setApproveErr(e.message);
    } finally {
      setApproving(false);
    }
  }

  const hasActivity = monitor && (
    monitor.items.some(i => i.received) || (monitor.returns || []).length > 0
  );
  const canApprove  = monitor && monitor.placed && monitor.arrived && hasActivity;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div>

      {/* ── Next Order Date ── */}
      <div style={{ ...S.card, marginBottom: 20, display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap", borderColor: days <= 7 ? "#f8717155" : "#1e3a5f" }}>
        <div>
          <div style={{ fontSize: 9, letterSpacing: 3, color: "#4a7ab5", marginBottom: 4 }}>NEXT ORDER DATE</div>
          <div style={{ fontSize: 15, color: "#e8f0fc", fontWeight: "bold" }}>{dateStr}</div>
          <div style={{ fontSize: 9, letterSpacing: 2, color: "#4a7ab5", marginTop: 2 }}>2nd Tuesday of the month</div>
        </div>
        <div style={{ textAlign: "center", marginLeft: "auto" }}>
          <div style={{ fontSize: 36, fontWeight: "bold", color: days <= 3 ? "#f87171" : days <= 7 ? "#facc15" : "#4ade80", lineHeight: 1 }}>
            {days}
          </div>
          <div style={{ fontSize: 9, letterSpacing: 2, color: "#4a7ab5" }}>DAYS AWAY</div>
        </div>
      </div>

      {/* ── No active order ── */}
      {!monitor && (
        <div style={{ ...S.card, textAlign: "center", padding: 32, marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: "#4a7ab5", letterSpacing: 2, marginBottom: 12 }}>NO ACTIVE ORDER</div>
          <div style={{ fontSize: 10, color: "#6a8aaa", marginBottom: 18 }}>
            Go to the ORDER GENERATOR tab and review items, then lock in the order here.
          </div>
          {orderItems.length > 0 ? (
            <button style={S.btn("#4ade80", "#0a2d0a")} onClick={onLockOrder}>
              ◆ GENERATE ORDER ({orderItems.length} items)
            </button>
          ) : (
            <div style={{ fontSize: 10, color: "#4ade80" }}>◆ ALL ITEMS SUFFICIENTLY STOCKED — NO ORDER NEEDED</div>
          )}
        </div>
      )}

      {/* ── Active / completed order ── */}
      {monitor && (
        <>
          {/* Order header */}
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
            <div style={{ fontSize: 10, color: "#4a7ab5", letterSpacing: 2 }}>
              ORDER LOCKED {new Date(monitor.lockedAt).toLocaleDateString()} &nbsp;·&nbsp; {monitor.items.length} ITEMS &nbsp;·&nbsp;
              ${monitor.items.reduce((s, i) => s + i.lineTotal, 0).toFixed(2)}
            </div>
            {!monitor.approved && (
              <button
                style={{ ...S.btn("#f87171", "#1a0d0d"), fontSize: 8, marginLeft: "auto" }}
                onClick={() => { if (window.confirm("Clear this order and start over?")) onUpdate(null); }}
              >
                ✕ CLEAR ORDER
              </button>
            )}
            {monitor.sheetUpdated && (
              <div style={{ marginLeft: "auto", fontSize: 9, color: "#4ade80", letterSpacing: 2 }}>◆ SHEET UPDATED</div>
            )}
          </div>

          {/* Step timeline */}
          <div style={{ ...S.card, marginBottom: 20 }}>
            <div style={{ fontSize: 9, letterSpacing: 3, color: "#4a7ab5", marginBottom: 16 }}>◆ ORDER STATUS</div>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 0 }}>
              <StepBadge n="1" label="PLACED"  done={monitor.placed}  active={!monitor.placed}
                onClick={() => onUpdate({ ...monitor, placed: true })} />
              <div style={{ flex: 0, width: 40, height: 2, background: monitor.placed ? "#4ade80" : "#1e3a5f", alignSelf: "center", margin: "0 4px", marginBottom: 30 }} />
              <StepBadge n="2" label="ARRIVED" done={monitor.arrived} active={monitor.placed && !monitor.arrived}
                onClick={() => onUpdate({ ...monitor, arrived: true })} />
              <div style={{ flex: 0, width: 40, height: 2, background: monitor.arrived ? "#4ade80" : "#1e3a5f", alignSelf: "center", margin: "0 4px", marginBottom: 30 }} />
              <StepBadge n="3" label="APPROVED" done={monitor.approved} active={false} onClick={() => {}} />
            </div>
          </div>

          {/* ── Shipment Tracking ── */}
          <div style={{ ...S.card, marginBottom: 20 }}>
            <div style={{ fontSize: 9, letterSpacing: 3, color: "#4a7ab5", marginBottom: 14 }}>◆ SHIPMENT TRACKING</div>

            {/* Input row — hidden after approval */}
            {!monitor.approved && (
              <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
                <div style={{ flex: "2 1 180px" }}>
                  <div style={{ fontSize: 9, letterSpacing: 2, color: "#4a7ab5", marginBottom: 3 }}>TRACKING NUMBER</div>
                  <input style={S.inp} value={trackNum}
                    onChange={e => setTrackNum(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && saveTracking()}
                    placeholder="e.g. 1Z999AA10123456784" />
                </div>
                <div style={{ flex: "1 1 130px" }}>
                  <div style={{ fontSize: 9, letterSpacing: 2, color: "#4a7ab5", marginBottom: 3 }}>EST. DELIVERY</div>
                  <input style={S.inp} type="date" value={trackDelivery}
                    onChange={e => setTrackDelivery(e.target.value)} />
                </div>
                <button style={S.btn("#4ade80", "#0a2d0a")} onClick={saveTracking}>SAVE</button>
              </div>
            )}

            {monitor.tracking?.number ? (() => {
              const cKey     = detectCarrier(monitor.tracking.number);
              const carr     = CARRIERS[cKey];
              const cleanNum = monitor.tracking.number.replace(/[\s-]/g, "").toUpperCase();
              const curIdx   = SHIP_STAGES.findIndex(s => s.id === (monitor.tracking.stage || "label"));
              const delDate  = monitor.tracking.estimatedDelivery;
              const delDays  = delDate ? daysUntil(delDate + "T00:00:00") : null;
              const isDelivered = monitor.tracking.stage === "delivered";
              return (
                <>
                  {/* Number · carrier badge · track link · delivery countdown */}
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 20 }}>
                    <div>
                      <div style={{ fontSize: 9, letterSpacing: 2, color: "#4a7ab5", marginBottom: 2 }}>TRACKING</div>
                      <div style={{ fontSize: 12, color: "#c8d4e8", fontFamily: MONO, letterSpacing: 1 }}>{monitor.tracking.number}</div>
                    </div>
                    {carr && (
                      <div style={{ fontSize: 9, letterSpacing: 2, background: "#0a1220", border: "1px solid #1e3a5f", padding: "4px 10px", color: "#4ade80" }}>
                        {carr.name}
                      </div>
                    )}
                    {carr && (
                      <a href={carr.url(cleanNum)} target="_blank" rel="noreferrer"
                        style={{ ...S.btn("#4a7ab5"), textDecoration: "none", padding: "5px 12px", fontSize: 8 }}>
                        TRACK ON {carr.name} →
                      </a>
                    )}
                    {delDays !== null && !isNaN(delDays) && (
                      <div style={{ marginLeft: "auto", textAlign: "center", flexShrink: 0 }}>
                        {isDelivered ? (
                          <>
                            <div style={{ fontSize: 22, color: "#4ade80", fontWeight: 700, lineHeight: 1 }}>✓</div>
                            <div style={{ fontSize: 8, color: "#4ade80", letterSpacing: 2, marginTop: 2 }}>DELIVERED</div>
                          </>
                        ) : delDays < 0 ? (
                          <>
                            <div style={{ fontSize: 22, color: "#f87171", fontWeight: 700, lineHeight: 1 }}>{Math.abs(delDays)}</div>
                            <div style={{ fontSize: 8, color: "#f87171", letterSpacing: 2, marginTop: 2 }}>DAYS OVERDUE</div>
                          </>
                        ) : delDays === 0 ? (
                          <>
                            <div style={{ fontSize: 16, color: "#f87171", fontWeight: 700, lineHeight: 1, letterSpacing: 1 }}>TODAY</div>
                            <div style={{ fontSize: 8, color: "#f87171", letterSpacing: 2, marginTop: 2 }}>ARRIVING</div>
                          </>
                        ) : (
                          <>
                            <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1, color: delDays <= 2 ? "#facc15" : "#4ade80" }}>{delDays}</div>
                            <div style={{ fontSize: 8, color: "#4a7ab5", letterSpacing: 2, marginTop: 2 }}>DAYS AWAY</div>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Shipping stage bubbles */}
                  <div style={{ display: "flex", alignItems: "flex-start" }}>
                    {SHIP_STAGES.map((stage, i) => {
                      const done    = i < curIdx;
                      const current = i === curIdx;
                      const color   = done ? "#4ade80" : current ? "#facc15" : "#1e3a5f";
                      const txtClr  = done ? "#4ade80" : current ? "#facc15" : "#3a5a7a";
                      return (
                        <Fragment key={stage.id}>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, gap: 5 }}>
                            <button
                              onClick={() => !monitor.approved && advanceStage(stage.id)}
                              disabled={monitor.approved}
                              title={monitor.approved ? stage.label : `Mark: ${stage.label}`}
                              style={{ width: 32, height: 32, border: `2px solid ${color}`, borderRadius: "50%", background: (done || current) ? `${color}1a` : "transparent", display: "flex", alignItems: "center", justifyContent: "center", color, fontSize: done ? 14 : 11, cursor: monitor.approved ? "default" : "pointer", fontFamily: MONO, padding: 0 }}
                            >{done ? "✓" : i + 1}</button>
                            <div style={{ fontSize: 7, letterSpacing: 1, color: txtClr, textAlign: "center", lineHeight: 1.35, whiteSpace: "pre-line" }}>
                              {stage.label}
                            </div>
                          </div>
                          {i < SHIP_STAGES.length - 1 && (
                            <div style={{ width: 20, height: 2, background: done ? "#4ade80" : "#1e3a5f", flexShrink: 0, alignSelf: "center", marginBottom: 24 }} />
                          )}
                        </Fragment>
                      );
                    })}
                  </div>

                  {delDate && (
                    <div style={{ fontSize: 9, color: "#4a7ab5", marginTop: 12, letterSpacing: 1 }}>
                      Estimated delivery: {new Date(delDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric" })}
                    </div>
                  )}
                </>
              );
            })() : (
              !monitor.approved && (
                <div style={{ fontSize: 9, color: "#3a5a7a", letterSpacing: 1 }}>
                  Enter a tracking number above to enable shipment tracking.
                </div>
              )
            )}
          </div>

          {/* Item checklist */}
          <div style={{ ...S.section }}>◆ ORDER CHECKLIST</div>
          <div style={{ overflowX: "auto", marginBottom: 24 }}>
            <table style={S.tbl}>
              <thead>
                <tr>{["ITEM", "QTY", "PRICE/EA", "LINE TOTAL", "RECEIVED"].map(h => (
                  <th key={h} style={S.th}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {monitor.items.map((item, idx) => {
                  const bg = idx % 2 === 0 ? "#0d1528" : "transparent";
                  return (
                    <tr key={item.name} style={{ opacity: item.received ? 0.55 : 1 }}>
                      <td style={{ ...S.td(bg), color: "#e8f0fc", textDecoration: item.received ? "line-through" : "none" }}>{item.name}</td>
                      <td style={{ ...S.td(bg), color: "#facc15", fontWeight: "bold", textAlign: "center" }}>{item.qty}</td>
                      <td style={{ ...S.td(bg), color: "#7a9cc8", textAlign: "center" }}>${item.price.toFixed(2)}</td>
                      <td style={{ ...S.td(bg), color: "#e8f0fc", textAlign: "center" }}>${item.lineTotal.toFixed(2)}</td>
                      <td style={S.td(bg)}>
                        {!monitor.approved ? (
                          <button
                            style={S.btn(item.received ? "#4ade80" : "#4a7ab5", item.received ? "#0a2d0a" : "#0d1528")}
                            onClick={() => toggleReceived(idx)}
                          >
                            {item.received ? "✓ RECEIVED" : "MARK RECEIVED"}
                          </button>
                        ) : (
                          <span style={{ fontSize: 9, color: item.received ? "#4ade80" : "#f87171", letterSpacing: 1 }}>
                            {item.received ? "✓ RECEIVED" : "✕ NOT RECEIVED"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Returns section */}
          <div style={{ ...S.section }}>◆ RETURNED ITEMS</div>
          {!monitor.approved && (
            <div style={{ ...S.card, marginBottom: 16 }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
                <div style={{ flex: "2 1 180px" }}>
                  <div style={{ fontSize: 9, letterSpacing: 2, color: "#4a7ab5", marginBottom: 3 }}>ITEM</div>
                  <select value={returnForm.itemName}
                    onChange={e => setReturnForm(f => ({ ...f, itemName: e.target.value }))}
                    style={{ ...S.inp, cursor: "pointer" }}>
                    <option value="">— select item —</option>
                    {items.map(it => <option key={it.name} value={it.name}>{it.name}</option>)}
                  </select>
                </div>
                <div style={{ flex: "0 1 80px" }}>
                  <div style={{ fontSize: 9, letterSpacing: 2, color: "#4a7ab5", marginBottom: 3 }}>QTY</div>
                  <input style={S.inp} type="number" min={1} value={returnForm.qty}
                    onChange={e => setReturnForm(f => ({ ...f, qty: e.target.value }))} />
                </div>
                <button style={S.btn("#4ade80", "#0a2d0a")} onClick={addReturn}>+ ADD RETURN</button>
              </div>
              {returnErr && <div style={{ fontSize: 9, color: "#f87171", marginTop: 6 }}>⚠ {returnErr}</div>}
            </div>
          )}
          {(monitor.returns || []).length > 0 && (
            <div style={{ overflowX: "auto", marginBottom: 24 }}>
              <table style={S.tbl}>
                <thead>
                  <tr>{["ITEM", "QTY RETURNED", ""].map(h => <th key={h} style={S.th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {(monitor.returns || []).map((r, idx) => {
                    const bg = idx % 2 === 0 ? "#0d1528" : "transparent";
                    return (
                      <tr key={idx}>
                        <td style={{ ...S.td(bg), color: "#e8f0fc" }}>{r.itemName}</td>
                        <td style={{ ...S.td(bg), color: "#4ade80", fontWeight: "bold", textAlign: "center" }}>+{r.qty}</td>
                        <td style={S.td(bg)}>
                          {!monitor.approved && (
                            <button style={{ ...S.btn("#f87171", "#1a0d0d"), padding: "4px 8px", fontSize: 8 }}
                              onClick={() => removeReturn(idx)}>✕ REMOVE</button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Approve section */}
          {!monitor.approved && (
            <div style={{ ...S.card, borderColor: canApprove ? "#4ade8055" : "#1e3a5f", padding: "16px 18px" }}>
              <div style={{ fontSize: 9, letterSpacing: 3, color: "#4a7ab5", marginBottom: 10 }}>◆ FINALIZE ORDER</div>
              {!canApprove && (
                <div style={{ fontSize: 9, color: "#facc15", marginBottom: 10, letterSpacing: 1 }}>
                  ⚠ {(!monitor?.placed || !monitor?.arrived)
                    ? "Mark order as PLACED and ARRIVED before approving."
                    : "Mark at least one item as received before approving."}
                </div>
              )}
              <div style={{ fontSize: 9, color: "#7a9cc8", marginBottom: 14, lineHeight: 1.6 }}>
                Approving will update On Hand quantities in the Google Sheet for received items and returns,
                and create a new tab in the sheet with the full order record.
              </div>
              {approveErr && (
                <div style={{ fontSize: 9, color: "#f87171", background: "#1a0d0d", border: "1px solid #f8717133", padding: "8px 10px", marginBottom: 12, letterSpacing: 1 }}>
                  ⚠ {approveErr}
                </div>
              )}
              <button
                style={S.btn(canApprove ? "#4ade80" : "#2e3a4e", canApprove ? "#0a2d0a" : "#0d1528")}
                onClick={handleApprove}
                disabled={!canApprove || approving}
              >
                {approving ? "⟳ WRITING TO SHEET..." : "◆ APPROVE & UPDATE SHEET"}
              </button>
            </div>
          )}

          {/* Completed banner */}
          {monitor.approved && (
            <div style={{ background: "#0a2d0a", border: "1px solid #4ade8055", padding: "16px 18px", textAlign: "center" }}>
              <div style={{ fontSize: 14, color: "#4ade80", letterSpacing: 3, marginBottom: 6 }}>◆ ORDER COMPLETE</div>
              <div style={{ fontSize: 9, color: "#4ade80", letterSpacing: 2 }}>
                Sheet updated · Order tab created · All records saved
              </div>
              <button
                style={{ ...S.btn("#4a7ab5"), marginTop: 14 }}
                onClick={() => onUpdate(null)}
              >
                START NEW ORDER
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
