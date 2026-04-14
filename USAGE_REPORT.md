# Overlake CAP Logistics Manager — Usage Guide
**Prepared for:** Log Officer  
**Date:** 14 April 2026

---

## Overview

The Overlake CAP Logistics Manager is a web app for tracking squadron inventory, logging loans, generating monthly supply orders, and receiving shipments. It reads inventory data from the squadron's shared Google Sheet and writes back to it when orders are approved or loans are recorded.

There are five tabs: **Inventory**, **Loans**, **Order Generator**, **Monitoring**, and **Setup**.

---

## Inventory Tab

This is the home screen. It shows the current stock status of every item the squadron carries.

**Status badges:**

| Badge | Meaning |
|-------|---------|
| OK | On-hand quantity meets or exceeds the demand level |
| LOW | On-hand is between 50–99% of the demand level |
| CRITICAL | On-hand is zero, or below 50% of the demand level |

**Filters:** Use the Category and Status dropdowns to narrow the list — e.g., show only CRITICAL items before placing an order.

**Summary cards** at the top show totals for OK, LOW, and CRITICAL items at a glance.

**Refreshing:** Click the **↺ REFRESH** button in the header to pull the latest data from the Google Sheet.

---

## Updating On-Hand Quantities

On-hand quantities are not typed in directly. They change in two ways through the app:

### 1. Via the Loans Tab (immediate effect)
Logging a loan immediately **reduces** the on-hand count. Returning a loan immediately **restores** it. See the Loans section below.

### 2. Via Order Approval (end of each order cycle)
When you approve a completed order in the Monitoring tab, the app writes the received quantities back to the Google Sheet, increasing on-hand counts automatically.

### 3. Direct sheet edit (outside the app)
If a correction is needed outside of a loan or order, open the connected Google Sheet and edit the **On Hand** column (Column C) directly. Hit **↺ REFRESH** in the app to see the updated values.

---

## Loans Tab

Use this tab to track items loaned out to members and return them when they come back.

### Logging a Loan

1. Select the item from the dropdown.
2. Enter the borrower's name.
3. Enter the quantity being loaned — **whole numbers only** (e.g. 2, not 1.5).
4. The date auto-fills to today — adjust if needed.
5. Click **+ LOG LOAN**.

The on-hand count for that item drops immediately in the app and syncs to the sheet.

### Returning a Loan

1. Find the loan in the **Active Loans** list.
2. Click the green **✓ RETURN** button next to it.

The on-hand count is restored immediately.

### Loan History

Returned loans move to the history section below active loans, shown in grey with the return date for record-keeping.

> **Note on ordering:** Loaned quantities count against on-hand when the app calculates how much to order. If 10 items are on-hand but 3 are on loan, the app treats effective stock as 7.

---

## Order Generator Tab

This tab builds the monthly supply order based on what is low or critical.

### Reading the Order

Each row shows the item, its priority (Critical / Low / OK), the suggested order quantity, unit price, and line total. A direct link to the item on the supplier's website is included.

**Order quantity formula:** The app orders half the gap between current on-hand and demand, rounded up. This keeps orders conservative.

### Budget

The current budget is shown at the top alongside the total order cost. If the order exceeds budget, a warning appears. Click **PRIORITIZE** to automatically trim the order — it drops OK items first, then LOW items, until the total fits within budget. Prioritized mode clears itself automatically if inventory or demand changes bring the order back within budget.

### Exporting the Order

Click **⬇ EXPORT ORDER** to download an Excel file named `overlake-order-YYYY-MM-DD.xlsx`. The file contains one row per item with columns for Item Name, Priority, Qty, Price/ea, Line Total, and the supplier link. A summary block at the bottom shows the Order Total, Budget, and Remaining.

#### Opening the export in Google Sheets

1. Go to [sheets.google.com](https://sheets.google.com) and sign in.
2. Click **Blank spreadsheet** to open a new sheet, then go to **File → Import**.
3. Select the **Upload** tab and drag the downloaded `.xlsx` file in, or click **Browse** to find it.
4. Under **Import location** choose **Replace spreadsheet**, then click **Import data**.
5. The order will open as a fully editable Google Sheet — add notes, share it with others, or print it from there.

### Locking the Order

- Click **◆ LOCK IN ORDER** to snapshot the order and move it to the Monitoring tab for shipment tracking.

---

## Monitoring Tab

This tab tracks a locked order from placement through delivery and final approval.

### Order Stages

An order moves through three required stages in sequence:

```
PLACED  →  ARRIVED  →  APPROVED
```

**Mark as Placed** — after submitting the order to the supplier, click this to record that the order is in.

**Shipment Tracking** — enter the tracking number once the supplier provides it. The app auto-detects the carrier (UPS, USPS, FedEx, DHL) and shows a link to the carrier's tracking page. Set an estimated delivery date to see a countdown. Manually advance the shipment stage as updates come in:

> Label Created → In Transit → Out for Delivery → Delivered

**Mark as Arrived** — when the package arrives, click this, then work through the item checklist to verify everything against the packing list.

**Returns** — if any items need to go back to the supplier, use the **Add Return** section to log the item and quantity. Quantities must be whole numbers of at least 1.

**Approve Order** — once the order is marked both Placed and Arrived **and** at least one item has been marked received (or a return has been logged), the Approve button becomes active. Clicking it signs into Google and writes the received quantities to the On Hand column in the sheet. It also creates a permanent order record tab in the sheet. This action cannot be undone, so only approve once everything is verified.

### Next Order Date

The app shows a countdown to the second Tuesday of each month — the standard order cycle date. Use this to gauge urgency.

---

## Demand Editor (Admin)

The Demand Editor lets an administrator temporarily override the demand levels used for status and order calculations, without changing the master sheet.

**To access:** Click the **EDIT DEMAND** button on the Inventory tab and enter the admin password.

Each item shows its sheet default alongside a local override field. Edit the values and click **Save**. Overrides are stored on the current device only — they do not sync to other users.

To clear all overrides and revert to sheet values, click **Reset to Sheet Defaults**.

To permanently change a demand level for everyone, edit Column E in the Google Sheet directly, then refresh the app.

---

## Monthly Workflow — Quick Reference

1. **Check inventory** — Inventory tab, filter by CRITICAL and LOW.
2. **Review the order** — Order Generator tab, confirm quantities and budget.
3. **Export and submit** — Click Export Order to download the `.xlsx` file, then submit to supplier.
4. **Lock the order** — Click Lock In Order to move it to Monitoring.
5. **Mark as placed** — Monitoring tab → Mark as Placed.
6. **Enter tracking number** — Add tracking number and estimated delivery date.
7. **Receive the shipment** — Mark as Arrived, tick off items on the checklist.
8. **Approve** — Click Approve Order once everything is verified. On-hand updates automatically.
