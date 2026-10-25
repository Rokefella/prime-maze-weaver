# Terrain catalogue and brushes

- Add WORLD’s TERRAIN panel with catalogue counts, grouped filters, visible-row animated swatches, full editing, and creation without deletion.
- Add enabled terrain chips to ERAS and editable UTC day/night controls with cycle warnings and NIGHT PREVIEW on the map.
- Extend WORLD’s 100-step session history to terrain edits/creation and day/night saves. Undoing creation disables the new terrain rather than deleting it, preserving the no-delete catalogue rule; redo restores it.
- Add a Village terrain brush, defaulting named world area drafts to their explicitly assigned era, with SHOW ALL and search. Existing supported tile equivalents remain existing tiles; other entries use TERRAIN plus its key.
- Draw static terrain marks and hover details, preserving existing painting, rectangle fill, layered drafts, and legacy exports.

## Data and technical details
- Use only the existing shared browser client and loose table typing. No tables, migrations, seeds, or unrelated data changes.
- Share terrain definitions/filtering/painting and UTC phase calculations in small pure helpers; preserve extraCells import/export for the new optional terrain key.
- Verify catalogue counts, Fire filters/chips, colour save/readback/undo, night display, and packed_sand/TREE save/reload in a temporary draft. Restore the test colour and remove only that draft.
- Run focused rule tests and inspect desktop/mobile layouts. Return the complete changed-file list.