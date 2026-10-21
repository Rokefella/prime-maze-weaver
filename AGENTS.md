# Architecture rules

- Keep Village entrance definitions and missing-entrance validation in the shared maze palette module, so canvas colors, tool identification, and publishing checks use the same type registry.
- Preserve special tiles through the existing extraCells export/import mechanism, so legacy levels round-trip without schema changes.
- Keep NPC identity matching and orb geometry in the shared npcOrb helper, with React SVG and canvas adapters, so picker previews and grid rendering agree without altering saved cells.
- Derive prime-finder entries from current FRAGMENT cells and their canonical Ulam numbers in shared fragment helpers, so navigation, labels, and code calculations agree without changing saved data.
- Keep Console door placement and validation in a shared Maze-only helper, so single-cell uniqueness also holds when rectangle fill is selected.- Keep Maze run-drop settings (keyDrops, dropPool) on LevelMeta and emit them only for Maze mode when non-empty, so legacy levels re-export unchanged.
