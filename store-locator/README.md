# SlapSnacks Store Locator

A self-contained "Where to Buy" page that lets customers find the Walmart
Supercenters and Neighborhood Markets carrying SlapSnacks — **1,044 stores
across 25 states**.

## Files

| File | Purpose |
|------|---------|
| `index.html` | **The page.** Fully self-contained — store data is embedded inline. Drop it anywhere and it works. |
| `stores.json` | Source data (name, address, city, state, type, lat/lng) used to build the page. Keep for regeneration. |
| `build_data.py` | Rebuilds `stores.json` from the original Walmart store-list spreadsheet. |

## Deploy to slapsnacks.com

Because everything is inline, deployment is just placing one file:

- **Static host / any CMS:** upload `index.html` to a path such as
  `slapsnacks.com/store-locator/` (recommended) or `/where-to-buy/`.
- The header/footer nav links (`/`, `/products`, `/store-locator`, `/contact`)
  are placeholders — point them at your real site URLs.
- To embed inside an existing page instead of hosting standalone, drop the
  page in an `<iframe src="/store-locator/">`.

## Features

- **Live search** by city, store name, or street address.
- **Filters** for state and store type (Supercenter / Neighborhood Market).
- **"Use my location"** — with the visitor's permission, sorts every store by
  distance and shows how many miles away each one is.
- **Interactive map** (Leaflet + OpenStreetMap/CARTO tiles) with marker
  clustering, so 1,000+ pins stay readable.
- **One-tap Directions** — every store links straight to Google Maps with its
  exact street address.
- **Resilient:** if the map library or tiles fail to load, the page gracefully
  degrades to a searchable directory — search, filters, and directions keep
  working.
- Responsive; works on phones.

## How the map data was built

The spreadsheet lists store street addresses but no coordinates. `build_data.py`
geocodes each store to **city level** using an offline US-cities dataset
(≈96% direct match, the remainder resolved via abbreviation handling and a
small manual table), so no live geocoding API or key is needed. Map pins sit at
the city; the exact street address is preserved and used for the Directions
link. A tiny deterministic offset spreads multiple stores in the same city so
their pins don't stack.

### Refreshing the store list

1. Export an updated store list with these columns: `store_number`,
   `store_name`, `city_name`, `state_or_province_name`,
   `street_address_line_1`, `store_type_description`.
2. Run `python3 build_data.py <spreadsheet.xlsx>` to regenerate `stores.json`.
3. Re-embed the JSON into `index.html` (replace the contents of the
   `<script id="store-data" type="application/json">` block), or run the build
   with the `--html` flag to write `index.html` directly.

Requires `pandas`, `openpyxl`, and `geonamescache` (`pip install` them).

## Notes

- Store availability reflects current Walmart distribution and can change; the
  footer tells shoppers to call ahead to confirm.
- The map uses free OpenStreetMap/CARTO tiles and the public Leaflet CDN — no
  API keys or accounts required.
