#!/usr/bin/env python3
"""
Add Blues uniform loan-only items to the CAP Logistics Google Sheet.

These items will have Demand=0 so they NEVER appear on the Order Generator.
They are tracked in inventory and available for loans only.

Usage:
  python3 add_blues_items.py

You will need an OAuth 2.0 access token with:
  https://www.googleapis.com/auth/spreadsheets
scope. The easiest way to get one:
  1. Go to https://developers.google.com/oauthplayground/
  2. In "Step 1", find and select "Google Sheets API v4" → check
     "https://www.googleapis.com/auth/spreadsheets"
  3. Click "Authorize APIs" and sign in with the sheet owner's Google account
  4. Click "Exchange authorization code for tokens"
  5. Copy the "Access token" value and paste it when prompted below
"""

import json
import sys
import urllib.request
import urllib.error

SHEET_ID = "11Kj9J2nyhbhUBGIePay3QFts-jd83Y9pHOMODNaNXKs"
RANGE    = "Inventory!A:J"

BLUES_ITEMS = [
    "Blues Cover",
    "Blues Blouse",
    "Blues Trousers",
    "Blues Skirt",
]


def get_token():
    print("\n─── STEP 1: Get an OAuth access token ───────────────────────────────────")
    print("  1. Open https://developers.google.com/oauthplayground/")
    print("  2. Under 'Google Sheets API v4' check:")
    print("       https://www.googleapis.com/auth/spreadsheets")
    print("  3. Click 'Authorize APIs' → sign in with the sheet owner's account")
    print("  4. Click 'Exchange authorization code for tokens'")
    print("  5. Copy the 'Access token' (starts with ya29...)")
    print()
    token = input("Paste your access token here: ").strip()
    if not token:
        print("No token provided. Exiting.")
        sys.exit(1)
    return token


def get_quantities():
    print("\n─── STEP 2: Enter current on-hand quantities ────────────────────────────")
    print("  (How many of each do you currently have in stock?)")
    print()
    qtys = {}
    for name in BLUES_ITEMS:
        while True:
            raw = input(f"  {name}: ").strip()
            if raw == "":
                raw = "0"
            try:
                q = int(raw)
                if q < 0:
                    print("    Please enter 0 or a positive number.")
                    continue
                qtys[name] = q
                break
            except ValueError:
                print("    Please enter a whole number.")
    return qtys


def build_rows(qtys):
    rows = []
    for i, name in enumerate(BLUES_ITEMS):
        # Columns: A=Category, B=Name, C=OnHand, D=OnOrder, E=Demand,
        #          F=?, G=?, H=MinLevel, I=Price, J=Link
        category = "Uniform Items" if i == 0 else ""
        rows.append([category, name, qtys[name], 0, 0, "", "", 0, 0, ""])
    return rows


def append_rows(token, rows):
    url = (
        f"https://sheets.googleapis.com/v4/spreadsheets/{SHEET_ID}/values/"
        f"{urllib.request.quote(RANGE)}:append"
        f"?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS"
    )
    body = json.dumps({"values": rows}).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req) as resp:
            result = json.loads(resp.read())
        return result
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="replace")
        print(f"\n  HTTP {e.code} error from Sheets API:")
        try:
            msg = json.loads(err_body).get("error", {}).get("message", err_body)
        except Exception:
            msg = err_body
        print(f"  {msg}")
        sys.exit(1)


def main():
    print("╔══════════════════════════════════════════════════════╗")
    print("║   CAP Logistics — Add Blues Uniform Items to Sheet   ║")
    print("╚══════════════════════════════════════════════════════╝")
    print()
    print("This script appends 4 loan-only rows to your Inventory sheet:")
    for name in BLUES_ITEMS:
        print(f"  • {name}")
    print()
    print("Demand will be set to 0 — these items will NEVER appear")
    print("on the Order Generator. They are for loan tracking only.")

    token = get_token()
    qtys  = get_quantities()
    rows  = build_rows(qtys)

    print("\n─── STEP 3: Writing to Google Sheet ─────────────────────────────────────")
    print()
    for row in rows:
        display = [str(c) for c in row if c != ""]
        print(f"  → {' | '.join(display)}")
    print()

    confirm = input("Append these rows to the sheet? [y/N]: ").strip().lower()
    if confirm != "y":
        print("Cancelled.")
        sys.exit(0)

    result = append_rows(token, rows)
    updated = result.get("updates", {}).get("updatedRows", "?")
    print(f"\n  ✓ Done! {updated} rows added to the sheet.")
    print()
    print("Next steps:")
    print("  1. Refresh the CAP Logistics app — the Blues items will appear")
    print("     in Inventory under 'Uniform Items'.")
    print("  2. In the app you can loan them out like any other item.")
    print("  3. They will NOT appear on the Order Generator sheet.")
    print()
    print("If the category column (A) already has 'Uniform Items' on the row")
    print("just above where these were inserted, clear the duplicate.")


if __name__ == "__main__":
    main()
