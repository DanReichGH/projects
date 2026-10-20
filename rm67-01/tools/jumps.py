# Count changed pixels per 0.1 s frame; flag frames >3x their neighbours.
import json, sys
import numpy as np
from PIL import Image
log = json.load(open("shots/scrub/log.json"))
prev = None; rows = []
for e in log:
    a = np.asarray(Image.open(e["name"]).convert("RGB")).astype(np.int16)
    if prev is not None and prev[0] == e["step"]:
        d = int((np.abs(a - prev[1]).max(axis=2) > 24).sum())
        rows.append((e["step"], e["t"], d, e["name"]))
    prev = (e["step"], a)
flag = []
for i, (s, t, d, n) in enumerate(rows):
    nb = [rows[j][2] for j in (i - 1, i + 1) if 0 <= j < len(rows) and rows[j][0] == s]
    ref = max(1, sum(nb) / len(nb)) if nb else 1
    if d > 3 * ref and d > 300:
        flag.append((s, t, d, round(ref), n))
by = {}
for s, t, d, n in rows: by.setdefault(s, []).append(d)
for s, ds in by.items(): print(f"step {s}: frames {len(ds)}  median {int(np.median(ds))}  max {max(ds)}")
print("jumps:", len(flag))
for f in flag: print("  step %d t=%.1f changed %d vs neighbours %d  %s" % f)
