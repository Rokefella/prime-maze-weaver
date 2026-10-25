# Separate WORLD workspace

- Add BUILDER | WORLD navigation while keeping the existing builder mounted so unsaved work survives switching.
- Load the existing shared database's settings, eras, areas, places, links and sigil icons once when WORLD first opens. No migrations, tables or sample data.
- Build a canvas overview with cursor-anchored zoom, drag pan, era rings, areas, place markers, route/link/prime overlays and hover coordinates.
- Add ERAS, AREA, PLACES, LINKS and MEASURE panels with the requested editing and saving actions, draft creation/opening, draggable places and maze-route totals.
- Verify the prime formula, ring warnings, measurements and blank Village export with tests; check the real WORLD screen and safe live save/readback flows.

## Technical details

Use isolated browser-client data helpers and pure world geometry helpers, with canvas rendering scheduled through requestAnimationFrame. Existing builder data formats and tools remain unchanged; only a narrow external draft-open hook is added. Existing rows supply all map content. Area era display derives from its centre unless an explicit era_id override exists.