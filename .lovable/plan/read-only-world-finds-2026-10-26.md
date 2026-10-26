# Read-only WORLD finds

- Add FINDS to the WORLD layer toggles, enabled by default, loading enabled shared `world_finds` rows only.
- Show fixed-screen-size, kind-coloured markers on the current surface/underground layer, dashed for hidden finds; use terrain SVG icons at close zoom.
- Add a compact counted legend and a FINDS side panel with kind/quest filters, title hover, full read-only details, and Center here.
- Keep loading, models, and marker presentation isolated and keyed by find id; leave all writes, existing layers, Builder, generator, and chunk cache unchanged.
- Verify filtering, layer projection and marker sizing with focused tests, then exercise real shared finds in the preview without writes.

## Technical details

Use the existing browser client with loose table typing. A separate marker overlay follows the existing d3 map transform; SVGs render only through image data URIs. Underground finds follow the existing 250×250 layer-cell coordinate convention.