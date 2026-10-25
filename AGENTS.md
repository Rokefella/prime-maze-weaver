# Architecture rules
- Keep Maze skin hash/topology selection and canvas drawing in the shared skins helper; browser-client skinData reads/saves and optional top-level overrides preserve legacy geometry, while WORLD uses saved snapshots for skin undo/redo.

- Keep Village building colour/age calculations and next-village transforms in the shared buildings helper; legacy defaults are render-time only so untouched exports stay lossless.

- Keep saved-draft grouping/search/state in DraftLibrary and its pure libraryGroups helper; pass existing load/delete callbacks through unchanged so presentation never changes persistence.

- Keep Village entrance definitions and missing-entrance validation in the shared maze palette module, so canvas colors, tool identification, and publishing checks use the same type registry.
- Preserve special tiles through the existing extraCells export/import mechanism, so legacy levels round-trip without schema changes.
- Keep NPC identity matching and orb geometry in the shared npcOrb helper, with React SVG and canvas adapters, so picker previews and grid rendering agree without altering saved cells.
- Derive prime-finder entries from current FRAGMENT cells and their canonical Ulam numbers in shared fragment helpers, so navigation, labels, and code calculations agree without changing saved data.
- Keep Console door placement and validation in a shared Maze-only helper, so single-cell uniqueness also holds when rectangle fill is selected.- Keep Maze run-drop settings (keyDrops, dropPool) on LevelMeta and emit them only for Maze mode when non-empty, so legacy levels re-export unchanged.
- Keep Start place singleton/warning and Ghost orb tones/validation in the shared spawnGhost helper; both export as optional extraCells types so legacy levels re-export unchanged.
- Keep shared Ghost title reads/creation in ghostTitles and optional-field normalization in spawnGhost; Ghost names must not be imported as NPC identity.
- Share Village street SVG assets between PathStylePicker and canvas patterns; keep streetStyle optional so legacy defaults remain render-only and metadata copies preserve explicit choices.
- Keep Village world-layer timeline logic (active entry, painting splits, window/era reads) in the shared worldLayers helper; cells stay the current-level view and extraCells remains the saved preview so legacy drafts and readers are unchanged.
- Keep the standalone WORLD workspace in components/world and lib/world, using only the existing browser client for external world tables; never provision schema or seed data because the authoritative tables live outside this workspace.
- Keep Builder mounted across workspace switching and open WORLD area drafts through its existing importer with an unsaved-work confirmation, so navigation preserves editor state and formats.
- Keep open-world plot numbering, ring membership, route ordering and measurement in the pure world model, and use d3-zoom for canvas navigation so all readouts and overlays share geometry and touch behavior.
- Keep WORLD session undo/redo step types and labels in the pure history helper; WorldWorkspace replays steps through the existing data helpers with last-saved snapshots and id remapping, so re-inserts never rewrite history.
- Keep terrain catalogue models, filters, tile-equivalence mapping and UTC cycle calculations in lib/world/terrain; use terrainData exclusively with the shared browser client and serialize optional terrain keys through the shared extra-cell converters, preserving layered and legacy drafts.
- Terrain creation undo disables the row rather than deleting catalogue data; WORLD history replays terrain and day/night through their existing shared-table helpers.
- Keep WORLD layer coordinate projection, transition targets and window tiling/cache in lib/world/layers; map inputs return stored layer-cell coordinates and read-only terrain windows use bounded shared-client requests, so saved place snapshots and Builder formats remain unchanged.
