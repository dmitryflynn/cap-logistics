/**
 * CAP Logistics — Blues Uniform Items: Fix & Setup
 *
 * HOW TO USE:
 *  1. Open your Google Sheet
 *  2. Click Extensions → Apps Script
 *  3. Paste this entire file (replace existing code), click Save
 *  4. To add new items correctly: run  addBluesItems()
 *  5. To fix rows already added in the wrong place: run  fixMisplacedBluesItems()
 *
 * Both functions ask for confirmation before changing anything.
 */

// ─── Config ───────────────────────────────────────────────────────────────────

const BLUES_ITEMS = [
  "Blues Cover",
  "Blues Blouse",
  "Blues Trousers",
  "Blues Skirt",
];

const FOOTER_MARKER = "TOTAL ORDER COST"; // text in col A that marks end of data

// ─── Main: add items in the correct place with correct formulas ───────────────

function addBluesItems() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Inventory");
  const ui    = SpreadsheetApp.getUi();

  if (!sheet) { ui.alert('Sheet "Inventory" not found.'); return; }

  // Find the TOTAL ORDER COST footer row — insert ABOVE it
  const footerRow = findFooterRow_(sheet);
  if (!footerRow) {
    ui.alert('Could not find "' + FOOTER_MARKER + '" row.\nAborting.');
    return;
  }

  // Check if any Blues items are already in the data zone
  const existing = findExistingBluesRows_(sheet, footerRow);
  if (existing.length > 0) {
    const resp = ui.alert(
      "Blues items already found",
      "Found " + existing.length + " Blues row(s) already in the sheet.\n" +
      "Run fixMisplacedBluesItems() instead to correct their formatting.\n\n" +
      "Continue adding NEW rows anyway?",
      ui.ButtonSet.YES_NO
    );
    if (resp !== ui.Button.YES) return;
  }

  // Collect on-hand quantities
  const qtys = promptQuantities_(ui);
  if (!qtys) return; // user cancelled

  // Preview
  const preview = BLUES_ITEMS.map((n, i) =>
    (i === 0 ? "Uniform Items" : "          ") + " | " + n + " | on hand: " + qtys[n]
  ).join("\n");
  const confirm = ui.alert(
    "Confirm — insert before row " + footerRow,
    preview + "\n\nInsert these rows?",
    ui.ButtonSet.YES_NO
  );
  if (confirm !== ui.Button.YES) return;

  // Insert blank rows above footer, then populate
  sheet.insertRowsBefore(footerRow, BLUES_ITEMS.length);
  writeBluesRows_(sheet, footerRow, qtys, /*copyFmtFromAbove=*/true);

  ui.alert(
    "✓ Done",
    "Added " + BLUES_ITEMS.length + " Blues uniform rows before the totals section.\n\n" +
    "Refresh the logistics app to see them in inventory.",
    ui.ButtonSet.OK
  );
}

// ─── Fix: move/repair rows that were appended below the footer ───────────────

function fixMisplacedBluesItems() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Inventory");
  const ui    = SpreadsheetApp.getUi();

  if (!sheet) { ui.alert('Sheet "Inventory" not found.'); return; }

  const footerRow   = findFooterRow_(sheet);
  const lastDataRow = sheet.getLastRow();

  if (!footerRow) { ui.alert('Could not find "' + FOOTER_MARKER + '" row.'); return; }

  // Collect all Blues rows that sit BELOW the footer
  const misplaced = [];
  const data = sheet.getRange(footerRow, 1, lastDataRow - footerRow + 1, 10).getValues();
  data.forEach((row, idx) => {
    const absRow = footerRow + idx;
    if (BLUES_ITEMS.includes(row[1])) misplaced.push({ absRow, row });
  });

  // Also look for Blues rows already correctly placed (above footer)
  const alreadyGood = findExistingBluesRows_(sheet, footerRow);

  if (misplaced.length === 0 && alreadyGood.length === 0) {
    ui.alert("No Blues items found in the sheet at all.\nRun addBluesItems() first.");
    return;
  }

  if (misplaced.length === 0) {
    // All are already above footer — just fix their formulas/formatting
    const resp = ui.alert(
      "Blues items are correctly placed",
      "Found " + alreadyGood.length + " Blues row(s) above the totals section.\n" +
      "Fix their formulas and formatting?",
      ui.ButtonSet.YES_NO
    );
    if (resp !== ui.Button.YES) return;
    alreadyGood.forEach(r => applyFormulasAndFormat_(sheet, r));
    ui.alert("✓ Formulas and formatting fixed.");
    return;
  }

  const msg =
    "Found " + misplaced.length + " Blues row(s) below the totals footer (wrong place).\n" +
    (alreadyGood.length > 0
      ? alreadyGood.length + " already correct row(s) above the footer.\n\n"
      : "\n") +
    "Plan:\n" +
    "  1. Delete misplaced rows below footer\n" +
    "  2. Insert correct rows before the totals with proper formulas & formatting\n\n" +
    "Proceed?";

  const resp = ui.alert("Fix misplaced Blues rows", msg, ui.ButtonSet.YES_NO);
  if (resp !== ui.Button.YES) return;

  // Collect on-hand values from misplaced rows (preserve whatever was set)
  const qtys = {};
  misplaced.forEach(m => { qtys[m.row[1]] = m.row[2] || 0; });
  // Fill in any missing items with 0
  BLUES_ITEMS.forEach(n => { if (!(n in qtys)) qtys[n] = 0; });

  // Delete misplaced rows from bottom up (so indices stay valid)
  misplaced.slice().reverse().forEach(m => sheet.deleteRow(m.absRow));

  // Re-find footer row after deletions
  const newFooterRow = findFooterRow_(sheet);
  if (!newFooterRow) { ui.alert("Error: could not find footer after deletions."); return; }

  // Only insert Blues items that aren't already above footer
  const goodNames = alreadyGood.map(r => sheet.getRange(r, 2).getValue());
  const toInsert  = BLUES_ITEMS.filter(n => !goodNames.includes(n));

  if (toInsert.length > 0) {
    sheet.insertRowsBefore(newFooterRow, toInsert.length);
    writeBluesRows_(sheet, newFooterRow, qtys, /*copyFmtFromAbove=*/true, toInsert);
  }

  // Fix formulas on already-good rows too
  alreadyGood.forEach(r => applyFormulasAndFormat_(sheet, r));

  ui.alert(
    "✓ Done",
    "Moved " + misplaced.length + " row(s) to the correct position and applied\n" +
    "formulas + formatting to match the rest of the sheet.\n\n" +
    "Refresh the logistics app.",
    ui.ButtonSet.OK
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function findFooterRow_(sheet) {
  const vals = sheet.getRange("A1:A" + sheet.getLastRow()).getValues();
  for (let i = 0; i < vals.length; i++) {
    if (String(vals[i][0]).trim() === FOOTER_MARKER) return i + 1;
  }
  return null;
}

function findExistingBluesRows_(sheet, footerRow) {
  const rows = [];
  const vals = sheet.getRange("B1:B" + (footerRow - 1)).getValues();
  vals.forEach((r, i) => {
    if (BLUES_ITEMS.includes(r[0])) rows.push(i + 1);
  });
  return rows;
}

function promptQuantities_(ui) {
  const qtys = {};
  for (const name of BLUES_ITEMS) {
    const resp = ui.prompt(
      "On-Hand Quantity",
      "How many \"" + name + "\" do you currently have in stock?",
      ui.ButtonSet.OK_CANCEL
    );
    if (resp.getSelectedButton() !== ui.Button.OK) { ui.alert("Cancelled."); return null; }
    const v = parseInt(resp.getResponseText().trim(), 10);
    qtys[name] = isNaN(v) || v < 0 ? 0 : v;
  }
  return qtys;
}

function writeBluesRows_(sheet, insertedAtRow, qtys, copyFmt, itemList) {
  itemList = itemList || BLUES_ITEMS;

  itemList.forEach((name, i) => {
    const r   = insertedAtRow + i;
    const row = sheet.getRange(r, 1, 1, 10);

    // Values
    row.getCell(1, 1).setValue(i === 0 ? "Uniform Items" : ""); // A: category
    row.getCell(1, 2).setValue(name);                            // B: item name
    row.getCell(1, 3).setValue(qtys[name] ?? 0);                // C: on hand
    row.getCell(1, 4).setValue(0);                               // D: on order
    row.getCell(1, 5).setValue(0);                               // E: demand = 0
    row.getCell(1, 6).setFormula("=E" + r + "-C" + r);          // F: D-OH
    row.getCell(1, 7).setFormula(                                // G: TO ORDER
      "=IF(F" + r + ">0,ROUNDUP(F" + r + "/2,0),0)"
    );
    row.getCell(1, 8).setValue(0);                               // H: price/ea
    row.getCell(1, 9).setFormula("=G" + r + "*H" + r);          // I: net price
    row.getCell(1, 10).setValue("");                             // J: link

    // Copy formatting from the row immediately above the inserted block
    if (copyFmt && insertedAtRow > 1) {
      const srcRow = sheet.getRange(insertedAtRow - 1, 1, 1, 10);
      srcRow.copyTo(row, SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
      // Re-set values/formulas after format paste (paste_format preserves content)
    }
  });
}

function applyFormulasAndFormat_(sheet, rowNum) {
  const r = rowNum;
  sheet.getRange(r, 6).setFormula("=E" + r + "-C" + r);
  sheet.getRange(r, 7).setFormula("=IF(F" + r + ">0,ROUNDUP(F" + r + "/2,0),0)");
  sheet.getRange(r, 9).setFormula("=G" + r + "*H" + r);

  // Copy formatting from row above
  if (r > 1) {
    const src = sheet.getRange(r - 1, 1, 1, 10);
    src.copyTo(
      sheet.getRange(r, 1, 1, 10),
      SpreadsheetApp.CopyPasteType.PASTE_FORMAT,
      false
    );
  }
}
