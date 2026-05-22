"""
Generate website/public/data/debris_history.json from objects.csv.

Space-Track assigns debris objects the LAUNCH date of their parent satellite,
not the date of the collision/ASAT event. To still show meaningful spikes at
the correct event years, known fragment counts from authoritative sources
(NASA/ESA annual reports) are injected as 'event_debris' at the actual event
years. These are displayed as a distinct layer in DebrisGrowthChart.

Usage:
    python src/build_debris_history.py

Input:  data/processed/objects.csv   (all tracked objects, active + decayed)
Output: website/public/data/debris_history.json
"""

import csv
import json
import os
from collections import defaultdict

# Known fragment counts from major ASAT tests / collisions.
# Sources: NASA Orbital Debris Quarterly News, ESA Space Debris report 2023.
# These are injected at the actual event year because Space-Track catalogs
# ASAT debris under the parent satellite's original launch date.
ASAT_EVENTS = [
    {'year': 2007, 'debris': 3500, 'label': 'Fengyun-1C ASAT'},       # Jan 11, 2007
    {'year': 2009, 'debris': 2000, 'label': 'Iridium 33 × Cosmos 2251'},  # Feb 10, 2009
    {'year': 2021, 'debris': 1500, 'label': 'Cosmos 1408 ASAT'},      # Nov 15, 2021
]

INPUT_CSV  = os.path.join(os.path.dirname(__file__), '..', 'data', 'processed', 'objects.csv')
OUTPUT_JSON = os.path.join(os.path.dirname(__file__), '..', 'website', 'public', 'data', 'debris_history.json')


def build_series():
    by_year = defaultdict(lambda: {'debris': 0, 'rocket': 0, 'payload': 0, 'event_debris': 0})

    with open(INPUT_CSV) as f:
        reader = csv.DictReader(f)
        for row in reader:
            launch = row.get('LAUNCH', '')
            obj_type = row.get('OBJECT_TYPE', '').strip().lower()
            if not launch or len(launch) < 4:
                continue
            try:
                year = int(launch[:4])
            except ValueError:
                continue
            if year < 1957 or year > 2026:
                continue

            if obj_type == 'debris':
                by_year[year]['debris'] += 1
            elif obj_type == 'rocket body':
                by_year[year]['rocket'] += 1
            elif obj_type == 'payload':
                by_year[year]['payload'] += 1

    # Inject ASAT event fragments at correct event years
    for ev in ASAT_EVENTS:
        by_year[ev['year']]['event_debris'] += ev['debris']

    # Build cumulative series from 1957 to 2026
    series = []
    cum = {'debris': 0, 'rocket': 0, 'payload': 0, 'event_debris': 0}
    for year in range(1957, 2027):
        d = by_year.get(year, {'debris': 0, 'rocket': 0, 'payload': 0, 'event_debris': 0})
        for k in cum:
            cum[k] += d[k]
        series.append({
            'year':             year,
            'cum_debris':       cum['debris'],
            'cum_rocket':       cum['rocket'],
            'cum_payload':      cum['payload'],
            'cum_event_debris': cum['event_debris'],
            'ann_debris':       d['debris'],
            'ann_rocket':       d['rocket'],
            'ann_payload':      d['payload'],
            'ann_event_debris': d['event_debris'],
        })
    return series


if __name__ == '__main__':
    os.makedirs(os.path.dirname(OUTPUT_JSON), exist_ok=True)
    series = build_series()
    with open(OUTPUT_JSON, 'w') as f:
        json.dump(series, f, separators=(',', ':'))
    print(f'Wrote {len(series)} years → {OUTPUT_JSON}')
