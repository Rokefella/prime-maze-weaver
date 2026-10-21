# Architecture rules

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
