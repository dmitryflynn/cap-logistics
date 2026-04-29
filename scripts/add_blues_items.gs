/**
 * CAP Logistics — Add Blues Uniform Loan-Only Items
 *
 * HOW TO USE:
 *  1. Open your Google Sheet
 *  2. Click Extensions → Apps Script
 *  3. Paste this entire file into the editor (replace any existing code)
 *  4. Click Save (disk icon)
 *  5. Select "addBluesItems" from the function dropdown
 *  6. Click Run ▶
 *  7. Approve the permissions popup (first run only)
 *  8. Done — check the Inventory sheet for the new rows
 */

function addBluesItems() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Inventory");

  if (!sheet) {
    SpreadsheetApp.getUi().alert(
      'Sheet "Inventory" not found.\n' +
      'Make sure the tab is named exactly "Inventory" and try again.'
    );
    return;
  }

  // Prompt for on-hand quantities
  const ui   = SpreadsheetApp.getUi();
  const items = [
    "Blues Cover",
    "Blues Blouse",
    "Blues Trousers",
    "Blues Skirt",
  ];

  const qtys = {};
  for (const name of items) {
    const resp = ui.prompt(
      "On-Hand Quantity",
      `How many "${name}" do you currently have in stock?`,
      ui.ButtonSet.OK_CANCEL
    );
    if (resp.getSelectedButton() !== ui.Button.OK) {
      ui.alert("Cancelled — no rows were added.");
      return;
    }
    const raw = parseInt(resp.getResponseText().trim(), 10);
    qtys[name] = isNaN(raw) || raw < 0 ? 0 : raw;
  }

  // Columns: A=Category, B=Name, C=OnHand, D=OnOrder, E=Demand,
  //          F=?, G=?, H=MinLevel, I=Price, J=Link
  // Demand (E) = 0 → item never appears on Order Generator
  const rows = items.map((name, i) => [
    i === 0 ? "Uniform Items" : "",  // A — category label on first row only
    name,                             // B — item name
    qtys[name],                       // C — on hand
    0,                                // D — on order
    0,                                // E — demand (MUST be 0)
    "",                               // F
    "",                               // G
    0,                                // H — min level
    0,                                // I — price
    "",                               // J — link
  ]);

  // Append after the last row that has data
  const lastRow = sheet.getLastRow();
  sheet.getRange(lastRow + 1, 1, rows.length, rows[0].length).setValues(rows);

  ui.alert(
    "✓ Done!",
    `Added ${rows.length} Blues uniform items to the Inventory sheet.\n\n` +
    "• Blues Cover\n• Blues Blouse\n• Blues Trousers\n• Blues Skirt\n\n" +
    "Demand is set to 0, so they will never appear on the Order Generator.\n" +
    "Refresh the logistics app to see them in inventory.",
    ui.ButtonSet.OK
  );
}
