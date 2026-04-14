# Overlake CAP Logistics Manager — Usage Report
**Prepared for:** Log Officer  
**Date:** 14 April 2026  
**Subject:** Application Overview and Standard Operating Procedures

---

## 1. Purpose

The **Overlake CAP Logistics Manager** is a web-based tool for managing the Overlake Composite Squadron's inventory of CAP uniform items, insignia, ribbons, and patches. It provides a single interface to monitor stock levels, generate orders, track inbound shipments, and record received goods back into the inventory sheet — all tied to a shared Google Sheet as the live data source.

---

## 2. Accessing the Application

The application runs in any modern web browser. No installation is required by end users.

- **Development / local instance:** `http://localhost:5173` (after running `npm run dev`)
- **Production deployment:** Hosted on Vercel; the deployment URL is set by the project owner.

On first load the app shows a **Connect Sheet** prompt. You must provide a valid Google Sheet ID before any live data appears (see Section 5 for setup).

---

## 3. Interface Overview

The application is a single-page app divided into four tabs across the top navigation bar:

| Tab | Icon | Purpose |
|-----|------|---------|
| Inventory | 📦 | View current stock levels and status |
| Order | 🛒 | Review and export the next supply order |
| Monitoring | 📡 | Track shipments and approve received orders |
| Setup | ⚙ | Connect the Google Sheet and read onboarding instructions |

---

## 4. Tab-by-Tab Usage Guide

### 4.1 Inventory Tab

This is the default landing tab and serves as the daily status dashboard.

**What it shows:**

- A summary row at the top: total items tracked, and counts broken down by status (OK / LOW / CRITICAL).
- A table of every item in the inventory sheet, with columns for:
  - **Category** (e.g., Cadet Metal Insignia, Ribbons)
  - **Item name**
  - **On Hand** — quantity currently in stock
  - **Demand** — target/minimum level
  - **Order Qty** — computed quantity suggested for the next order
  - **Status** — color-coded badge

**Status logic:**

| Status | Condition | Badge Color |
|--------|-----------|-------------|
| OK | On-hand ≥ demand level | Green |
| LOW | On-hand is 50–99% of demand level | Yellow |
| CRITICAL | On-hand is 0, or below 50% of demand level | Red |

**Filtering:**

Use the **Category** and **Status** dropdowns above the table to narrow the view. Useful for quickly seeing only CRITICAL items before an order cycle.

**Refreshing data:**

Data is pulled from Google Sheets at load time. Use the browser refresh button or the reload control in the app to pull the latest sheet values.

---

### 4.2 Order Tab

This tab calculates and formats the next supply order based on current inventory gaps.

**Order quantity formula:**

```
Order Qty = ceil((Demand − On Hand) / 2)
```

This conservative formula orders half the gap, preventing over-ordering.

**Reading the order table:**

Each row shows: Item name, Priority (Critical / Low / Ok), Quantity, Unit Price, Line Total, and a direct supplier link (Vanguard Mil).

**Budget management:**

- The current budget is read from cell **G3** of the Inventory sheet.
- The total order cost is displayed and compared against budget.
- If the order exceeds budget, a visual alert is shown.
- Click **Prioritize** to automatically trim the order: items are dropped lowest-priority-first (OK → LOW → CRITICAL) until the total fits within budget.

**Exporting the order:**

Click **Copy Order to Clipboard** to generate a plain-text summary in Vanguard Mil order format. Paste this into an email or the supplier order form.

**Supplier links:**

Each item row includes a direct link to its product page on the supplier's website. Click the link to open the order page in a new browser tab.

---

### 4.3 Monitoring Tab

This tab manages the lifecycle of a placed order — from submission through shipment arrival to final approval and sheet update.

#### Order Lifecycle

An order moves through three stages. Each must be completed in sequence:

```
1. PLACED  →  2. ARRIVED  →  3. APPROVED
```

**Step 1 — Place the order:**

After copying the order from the Order tab and submitting it to the supplier, return to the Monitoring tab and click **Mark as Placed**. This locks in the order details and starts the tracking workflow.

**Step 2 — Shipment tracking:**

Once a tracking number is received from the supplier:

1. Enter the tracking number in the **Tracking Number** field.
2. Optionally enter an **Estimated Delivery Date**.
3. The app auto-detects the carrier (UPS, USPS, FedEx, or DHL) from the tracking number format.
4. Click the carrier link to open the live tracking page on the carrier's website.
5. Manually update the **Shipment Stage** as the package progresses:
   - Label Created → In Transit → Out for Delivery → Delivered

A countdown to the estimated delivery date is displayed for planning purposes.

**Step 3 — Mark as Arrived:**

When the package arrives at the unit, click **Mark as Arrived**. Then use the item checklist to mark off each item as it is verified against the packing list.

**Returns:**

If any items need to be returned to the supplier, use the **Add Return** section to record the item name and quantity. Returns are tracked separately and do not affect the approval calculation.

**Step 4 — Approve the order:**

Once the order is placed and arrived, the **Approve Order** button becomes active.

Clicking Approve triggers a Google OAuth sign-in prompt. The signed-in Google account must have **edit access** to the connected inventory sheet. Upon approval:

1. On-Hand quantities in the sheet are incremented by the received quantities.
2. A new tab is created in the sheet recording the full order history (items, quantities, prices, dates).

This step is irreversible — do not approve until all items have been verified.

**Next Order Date:**

The app calculates the second Tuesday of each month as the standard order cycle date and displays a countdown. Use this as a deadline reference when deciding whether to expedite an order.

---

### 4.4 Setup Tab

The Setup tab contains a 6-step onboarding guide for connecting a new Google Sheet. This is a one-time configuration performed by the unit administrator.

**Steps summary:**

1. Create a Google Cloud project.
2. Enable the Google Sheets API in that project.
3. Locate the Sheet ID from the Google Sheets URL.
4. Share the sheet publicly (read) or grant the service account access.
5. Paste the Sheet ID into the app's **Connect Sheet** modal.
6. Ensure the sheet follows the required structure (see Section 5 below).

---

## 5. Google Sheet Requirements

The connected sheet must have a tab named **Inventory** with the following layout:

| Column | Field | Notes |
|--------|-------|-------|
| A | Category | Item category label |
| B | Item | Item name |
| C | On Hand | Current quantity |
| D | On Order | Quantity currently on order |
| E | Demand | Target/minimum stock level |
| H | Price | Unit price in dollars |
| J | Link | Supplier URL |

- **Budget cell:** `G3` — enter the available order budget here.
- **Data rows:** Rows 5 through 200 (row 4 is assumed to be headers).

The app reads this sheet on load and writes back to it during order approval.

---

## 6. Admin Features

### Demand Editor (Password Protected)

The Demand Editor allows an administrator to override the demand levels stored in the sheet with local device-specific values. This is useful for temporary adjustments without modifying the master sheet.

- **Access:** Click the demand/settings icon in the header, enter the admin password when prompted.
- **Function:** Adjust demand levels per item; reset to revert to sheet defaults.
- **Scope:** Overrides are stored in the browser's local storage and are device-specific — they do not sync across users.

### Demo Mode

If no Google Sheet is connected, the app loads a pre-built sample dataset for demonstration and training purposes. This is useful for onboarding new users without risking real data.

---

## 7. Data Persistence Summary

| Data | Storage Location | Scope |
|------|-----------------|-------|
| Inventory & budget | Google Sheet (remote) | All users |
| Sheet ID | Browser localStorage | Device only |
| Active order state | Browser localStorage | Device only |
| Demand overrides | Browser localStorage | Device only |
| Approved order records | Google Sheet (new tab) | All users |
| OAuth token | Browser session memory | Session only |

---

## 8. Standard Operating Procedure — Monthly Order Cycle

The following sequence is recommended for each monthly order cycle:

1. **Before the order date:** Open the **Inventory** tab. Filter by CRITICAL and LOW to confirm which items need replenishment.
2. **Review the order:** Switch to the **Order** tab. Confirm quantities and verify total cost is within budget. Use Prioritize if needed.
3. **Export and submit:** Copy the order to clipboard. Submit to Vanguard Mil or other supplier.
4. **Log the placement:** Go to the **Monitoring** tab and click **Mark as Placed**.
5. **Enter tracking info:** When the supplier provides a tracking number, enter it in the Monitoring tab and set an estimated delivery date.
6. **Receive the shipment:** When the package arrives, click **Mark as Arrived** and verify each item against the checklist.
7. **Approve the order:** With all items verified, click **Approve Order**, sign in with a Google account that has sheet edit access, and confirm. The sheet updates automatically.

---

## 9. Troubleshooting

| Symptom | Likely Cause | Resolution |
|---------|-------------|------------|
| Blank inventory table | Sheet not connected or incorrect Sheet ID | Go to Setup tab and re-enter the Sheet ID |
| "Budget exceeded" alert on Order tab | Order total > G3 budget value | Click Prioritize or manually remove low-priority items; or update G3 in the sheet |
| Approve button greyed out | Order not yet marked Placed and Arrived | Complete both steps before approving |
| Carrier not detected | Tracking number format not recognized | Manually select the carrier from the dropdown |
| Demand overrides not applying | Overrides stored on a different device | Re-enter overrides on the current device via the Demand Editor |
| OAuth sign-in fails on approval | Google account lacks edit access to sheet | Share the sheet with the relevant Google account as an Editor |

---

## 10. Quick Reference — Key Fields in the Sheet

| Cell / Range | Purpose |
|-------------|---------|
| `Inventory!G3` | Budget for current order cycle |
| `Inventory!A5:J200` | All inventory item data |
| `Inventory!C*` (Column C) | On-Hand quantities — updated by app on order approval |

---

*Report prepared using direct analysis of the application source code. All procedures reflect application behavior as of the current build.*
