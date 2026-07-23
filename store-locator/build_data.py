#!/usr/bin/env python3
"""Build stores.json (and optionally re-embed it into index.html) from a
Walmart store-list spreadsheet.

Usage:
    python3 build_data.py SlapSnacks_Stores_List.xlsx           # -> stores.json
    python3 build_data.py SlapSnacks_Stores_List.xlsx --html    # also update index.html

Requires: pandas, openpyxl, geonamescache  (pip install pandas openpyxl geonamescache)

Geocoding is city-level and offline: an optional us_cities.csv
(columns CITY,STATE_CODE,LATITUDE,LONGITUDE) is used first, then the bundled
geonamescache dataset, then a small manual fallback table for a handful of
abbreviated / suburb place names. Exact street addresses are preserved for the
Directions links; pins are placed at the city with a deterministic sub-degree
offset so stores in the same city don't stack.
"""
import sys, os, json, csv, hashlib
import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))

STATE = {'ALABAMA':'AL','ALASKA':'AK','ARIZONA':'AZ','ARKANSAS':'AR','CALIFORNIA':'CA','COLORADO':'CO','CONNECTICUT':'CT','DELAWARE':'DE','FLORIDA':'FL','GEORGIA':'GA','HAWAII':'HI','IDAHO':'ID','ILLINOIS':'IL','INDIANA':'IN','IOWA':'IA','KANSAS':'KS','KENTUCKY':'KY','LOUISIANA':'LA','MAINE':'ME','MARYLAND':'MD','MASSACHUSETTS':'MA','MICHIGAN':'MI','MINNESOTA':'MN','MISSISSIPPI':'MS','MISSOURI':'MO','MONTANA':'MT','NEBRASKA':'NE','NEVADA':'NV','NEW HAMPSHIRE':'NH','NEW JERSEY':'NJ','NEW MEXICO':'NM','NEW YORK':'NY','NORTH CAROLINA':'NC','NORTH DAKOTA':'ND','OHIO':'OH','OKLAHOMA':'OK','OREGON':'OR','PENNSYLVANIA':'PA','RHODE ISLAND':'RI','SOUTH CAROLINA':'SC','SOUTH DAKOTA':'SD','TENNESSEE':'TN','TEXAS':'TX','UTAH':'UT','VERMONT':'VT','VIRGINIA':'VA','WEST VIRGINIA':'WV','WASHINGTON':'WA','WISCONSIN':'WI','WYOMING':'WY'}

STATE_CENTER = {'AL':(32.8,-86.8),'AR':(34.8,-92.4),'CT':(41.6,-72.7),'DE':(39.0,-75.5),'FL':(28.6,-81.5),'GA':(32.9,-83.4),'IL':(40.0,-89.2),'IN':(39.9,-86.3),'IA':(42.0,-93.5),'KS':(38.5,-98.4),'KY':(37.5,-85.3),'LA':(31.0,-92.0),'MD':(39.0,-76.8),'MS':(32.7,-89.7),'MO':(38.4,-92.5),'NJ':(40.1,-74.7),'NY':(42.9,-75.5),'NC':(35.6,-79.4),'OH':(40.3,-82.8),'OK':(35.5,-97.5),'PA':(40.9,-77.8),'SC':(33.9,-80.9),'TN':(35.9,-86.4),'TX':(31.5,-99.3),'VT':(44.1,-72.7),'VA':(37.5,-78.9),'WV':(38.6,-80.6),'WA':(47.4,-120.5),'WI':(44.6,-89.9)}

# Fallback coordinates for place names that neither dataset resolves
# (abbreviated names like "ST AUGUSTINE", townships, and small suburbs).
MANUAL = {('ALGOOD','TN'):(36.20,-85.45),('ARCHDALE','NC'):(35.91,-79.97),('CALLAWAY','FL'):(30.15,-85.57),('COLONY','TX'):(33.09,-96.89),('CROSS LANES','WV'):(38.43,-81.77),('CROSS ROADS','TX'):(33.27,-97.03),('DEPTFORD','NJ'):(39.83,-75.12),('EDDYSTONE','PA'):(39.86,-75.33),('EGG HBR TWP','NJ'):(39.38,-74.62),('FAIRLAWN','VA'):(37.15,-80.57),('FLORIDA CITY','FL'):(25.45,-80.48),('GREECE','NY'):(43.21,-77.69),('HAZLE TOWNSHIP','PA'):(40.96,-75.99),('HOLLY HILL','FL'):(29.24,-81.04),('HUDSON OAKS','TX'):(32.75,-97.71),('INDIAN LAND','SC'):(34.87,-80.83),('JOHNSBURG','IL'):(42.38,-88.24),('LAKE PARK','FL'):(26.80,-80.07),('LAKE WORTH','TX'):(32.81,-97.44),('LAKE WYLIE','SC'):(35.10,-81.06),('LAVALE','MD'):(39.66,-78.81),('LUCAS','TX'):(33.09,-96.58),('MACARTHUR','WV'):(37.75,-81.20),('MCMINNVILLE','TN'):(35.68,-85.77),('MIDDLETOWN','KY'):(38.24,-85.53),('ORLAND HILLS','IL'):(41.59,-87.84),('PALM SPRINGS VILLAGE','FL'):(26.64,-80.10),('PALMHURST','TX'):(26.24,-98.27),('PORT ST LUCIE','FL'):(27.27,-80.36),('QUINCY','WV'):(38.31,-81.46),('RICHLAND HILLS','TX'):(32.81,-97.23),('SOUTH CHARLESTON','WV'):(38.37,-81.70),('ST AUGUSTINE','FL'):(29.90,-81.31),('ST PETERSBURG','FL'):(27.77,-82.64),('TEGA CAY','SC'):(35.02,-81.01),('WEST ORANGE','TX'):(30.08,-93.76),('WESTWORTH VILLAGE','TX'):(32.76,-97.42),('WOODLANDS','TX'):(30.17,-95.50)}


def build_index():
    idx = {}
    csv_path = os.path.join(HERE, 'us_cities.csv')
    if os.path.exists(csv_path):
        with open(csv_path) as f:
            for row in csv.DictReader(f):
                idx.setdefault((row['CITY'].strip().lower(), row['STATE_CODE']),
                               (float(row['LATITUDE']), float(row['LONGITUDE'])))
    try:
        import geonamescache
        gc = geonamescache.GeonamesCache()
        for c in gc.get_cities().values():
            if c['countrycode'] == 'US':
                idx.setdefault((c['name'].lower(), c['admin1code']),
                               (round(c['latitude'], 5), round(c['longitude'], 5)))
    except ImportError:
        print('note: geonamescache not installed; relying on us_cities.csv + manual table', file=sys.stderr)
    return idx


def lookup(idx, city, st):
    key = (city.lower(), st)
    if key in idx:
        return idx[key], 'city'
    alt = city.lower()
    if alt.startswith('st '):
        alt = 'saint ' + alt[3:]
    if (alt, st) in idx:
        return idx[(alt, st)], 'city'
    if (city, st) in MANUAL:
        return MANUAL[(city, st)], 'city'
    return STATE_CENTER.get(st, (39.5, -98.35)), 'state'


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    xlsx = sys.argv[1]
    write_html = '--html' in sys.argv[2:]

    df = pd.read_excel(xlsx, sheet_name='Store List with Address', header=2)
    df = df.dropna(subset=['store_number'])
    df = df[df['store_number'] != 'Grand Total']

    idx = build_index()
    stores, fallbacks = [], 0
    for _, r in df.iterrows():
        city = str(r['city_name']).strip()
        stfull = str(r['state_or_province_name']).strip()
        st = STATE.get(stfull.upper(), '')
        (lat, lng), prec = lookup(idx, city, st)
        if prec == 'state':
            fallbacks += 1
        h = int(hashlib.md5(str(r['store_number']).encode()).hexdigest(), 16)
        jlat = ((h % 1000) / 1000 - 0.5) * 0.03
        jlng = (((h // 1000) % 1000) / 1000 - 0.5) * 0.03
        stores.append({
            'n': str(r['store_name']).strip().title(),
            'a': str(r['street_address_line_1']).strip().title(),
            'c': city.title(),
            's': st,
            't': str(r['store_type_description']).strip(),
            'lat': round(lat + jlat, 5), 'lng': round(lng + jlng, 5),
            'p': prec,
        })

    stores.sort(key=lambda x: (x['s'], x['c'], x['n']))
    states = sorted({s['s'] for s in stores if s['s']})
    out = {'stores': stores, 'states': states, 'total': len(stores)}

    data_str = json.dumps(out, separators=(',', ':'))
    with open(os.path.join(HERE, 'stores.json'), 'w') as f:
        f.write(data_str)
    print(f'stores.json: {len(stores)} stores, {len(states)} states, {fallbacks} state-level fallbacks')

    if write_html:
        html_path = os.path.join(HERE, 'index.html')
        html = open(html_path).read()
        start = html.index('<script id="store-data" type="application/json">') + len('<script id="store-data" type="application/json">')
        end = html.index('</script>', start)
        html = html[:start] + data_str.replace('</', '<\\/') + html[end:]
        open(html_path, 'w').write(html)
        print('index.html: embedded data updated')


if __name__ == '__main__':
    main()
