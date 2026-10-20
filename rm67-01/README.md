# RM 67-01: how it winds itself

An interactive, hand-inked explainer: a Richard Mille RM 67-01 on a wrist and the same watch turned over to show the CRMA6 movement. Ten steps take it from fully unwound to running and back down.

Open `rm67-01.html` in a browser. It is one standalone page.

## Layout

| File | What it is |
|---|---|
| `src/model.mjs` | The model: one pure `step(state, dt, input)` plus `read`, `dayModel` and the spec table with a source for every number. Everything on screen comes from it. |
| `src/geo.js` | Isometric camera, prism, tube and strip solids. |
| `src/art.js` | The drawing: wrist, strap, case, dial, movement, rotor. |
| `src/app.js` | Steps, the live loop, gauges, controls, swatches, sliders. |
| `build.mjs` | Inlines everything into `rm67-01.html`. |
| `tools/` | Checks: `stills.mjs` (mid-step stills + number/overflow checks), `scrub.mjs` + `jumps.py` (pixel change per 0.1 s frame), `ui.mjs` (controls). |
| `stills/` | A still from the middle of every step, and a contact sheet. |

```sh
node build.mjs
node tools/stills.mjs        # writes shots/step1..10.png and checks numbers against the model
node tools/scrub.mjs && python3 tools/jumps.py
node tools/ui.mjs
```

## Sources

- **RM:** Richard Mille's RM 67-01 / CRMA6 specification.
- **std.:** typical Swiss lever values that RM doesn't publish for this caliber.
- **est.:** estimates, flagged on the page.

The page's "Where the numbers come from" section has the full list. It also notes three places where the original brief differed from the real watch: the selector is W · D · H, there is no adjustable-rib rotor, and there is no seconds hand.
