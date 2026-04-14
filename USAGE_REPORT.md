# Overlake CAP Logistics Manager — Usage Guide
**Prepared for:** Log Officer  
**Date:** 14 April 2026

---

## Accessing the App

Open **cap-logistics.vercel.app** in any web browser. No login, no installation, and no setup required — the app loads immediately with the squadron's live inventory data.

---

## Overview

The app has four tabs across the top: **Inventory**, **Loans**, **Order Generator**, and **Monitoring**. Use the ↺ **REFRESH** button in the header at any time to pull the latest data.

---

## Inventory Tab

The home screen. Shows the current stock status of every item the squadron carries.

**Status badges:**

| Badge | Meaning |
|-------|---------|
| OK | On-hand quantity meets or exceeds the demand level |
| LOW | On-hand is between 50–99% of the demand level |
| CRITICAL | On-hand is zero, or below 50% of the demand level |

**Summary cards** at the top show totals for OK, LOW, and CRITICAL items at a glance.

**Filters:** Use the Category and Status dropdowns to narrow the list — e.g., show only CRITICAL items before placing an order.

---

## Updating On-Hand Quantities

On-hand quantities are not entered directly in the app. They change in three ways:

1. **Logging a loan** immediately reduces the on-hand count. Returning it restores it.
2. **Approving a completed order** in the Monitoring tab writes received quantities back, increasing on-hand counts.
3. **Editing the Google Sheet directly** — change the On Hand column (Column C) in the squadron's inventory sheet, then hit ↺ REFRESH in the app.

---

## Loans Tab

Tracks items loaned out to members.

### Logging a Loan

1. Select the item from the dropdown.
2. Enter the borrower's name.
3. Enter the quantity — whole numbers only (e.g. 2, not 1.5).
4. The date auto-fills to today — adjust if needed.
5. Click **+ LOG LOAN**.

The on-hand count drops immediately and syncs to the sheet.

### Returning a Loan

1. Find the loan in the **Active Loans** list.
2. Click **✓ RETURN** next to it.

The on-hand count is restored immediately. Returned loans move to the history section below.

> **Note:** Loaned quantities count against on-hand when calculating what needs to be ordered. If 10 items are on-hand but 3 are on loan, the app treats effective stock as 7.

---

## Order Generator Tab

Builds the monthly supply order based on what is low or critical.

### Reading the Order

Each row shows the item, its priority (Critical / Low / OK), suggested order quantity, unit price, line total, and a direct link to the item on the supplier's website.

The app orders half the gap between current on-hand and demand, rounded up — keeping orders conservative.

### Budget

The current budget and total order cost are shown at the top. If the order exceeds budget a warning appears — click **PRIORITIZE** to automatically trim the order, dropping OK items first then LOW items until it fits. Prioritized mode clears itself automatically if changes bring the order back within budget.

### Exporting the Order

Click **⬇ EXPORT ORDER** to download `overlake-order-YYYY-MM-DD.xlsx`. The file contains one row per item with Item Name, Priority, Qty, Price/ea, Line Total, and supplier link, plus a summary block showing Order Total, Budget, and Remaining.

#### Opening the export in Google Sheets

1. Go to **sheets.google.com** and sign in.
2. Open a blank spreadsheet, then go to **File → Import**.
3. Select **Upload** and drag the downloaded file in, or click Browse to find it.
4. Under **Import location** choose **Replace spreadsheet**, then click **Import data**.

### Locking the Order

Click **◆ LOCK IN ORDER** to snapshot the order and move it to the Monitoring tab for tracking.

---

## Monitoring Tab

Tracks a locked order from placement through delivery and approval.

### Order Stages

```
PLACED  →  ARRIVED  →  APPROVED
```

**Mark as Placed** — after submitting the order to the supplier, click this.

**Shipment Tracking** — enter the tracking number once the supplier provides it. The app auto-detects the carrier (UPS, USPS, FedEx, DHL) and links directly to the carrier's tracking page. Set an estimated delivery date to see a countdown. Advance the shipment stage manually as updates come in:

> Label Created → In Transit → Out for Delivery → Delivered

**Mark as Arrived** — when the package arrives, click this, then tick off each item on the checklist as you verify it against the packing list.

**Returns** — if any items need to go back, use **Add Return** to log the item and quantity (whole numbers only).

**Approve Order** — active once the order is Placed, Arrived, and at least one item is marked received. Clicking it writes received quantities to the On Hand column in the sheet and creates a permanent order record. This cannot be undone — only approve once everything is verified.

### Next Order Date

The app shows a countdown to the second Tuesday of each month — the standard order cycle date.

---

## Demand Editor (Admin)

Lets an administrator temporarily adjust demand levels used for status and order calculations, without changing the master sheet.

**To access:** Click **EDIT DEMAND** on the Inventory tab and enter the admin password.

Each item shows its current demand alongside an override field. Changes are stored on the current device only and do not affect other users. Click **Reset to Sheet Defaults** to clear all overrides. To change demand for everyone permanently, edit Column E in the Google Sheet directly, then refresh the app.

---

## Monthly Workflow — Quick Reference

1. **Check inventory** — Inventory tab, filter by CRITICAL and LOW.
2. **Review the order** — Order Generator tab, confirm quantities and budget.
3. **Export and submit** — Click Export Order, download the file, submit to supplier.
4. **Lock the order** — Click Lock In Order to move it to Monitoring.
5. **Mark as placed** — Monitoring tab → Mark as Placed.
6. **Enter tracking number** — Add the tracking number and estimated delivery date.
7. **Receive the shipment** — Mark as Arrived, tick off items on the checklist.
8. **Approve** — Click Approve Order once everything is verified. On-hand updates automatically.
