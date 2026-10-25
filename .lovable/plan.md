# WORLD underground and generated terrain

- Add SURFACE | UNDERGROUND to the map toolbar, defaulting to surface. Load the existing underground rows once on first use and colour their 4×4 blocks from the terrain catalogue.
- Filter map places by layer, preserve layer-cell coordinates for picking and dragging, and display descend/ascend connections with target markers on the matching layer.
- Add an off-by-default surface TERRAIN toggle. At 3 px per cell, load visible 128×128 windows with caching and a dim loading grid.
- Add a layer filter and read-only layer/action/target details to PLACES. Existing save and undo paths preserve these fields.
- Keep Builder and stored data unchanged. Verify existing shared data using reads only and add coordinate/cache rule tests.

## Technical details

Keep coordinate conversion and window tiling in a pure WORLD helper; data reads use the existing browser client with loose typing. Surface terrain requests are bounded and cached, with stale views unable to overwrite the active layer. Missing legacy place layers mean surface. Cross-layer targets are projected into the common 1000×1000 view; their markers appear only on their target layer.