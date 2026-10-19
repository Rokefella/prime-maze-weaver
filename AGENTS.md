# Architecture rules

- Keep Village entrance definitions and missing-entrance validation in the shared maze palette module, so canvas colors, tool identification, and publishing checks use the same type registry.
- Preserve special tiles through the existing extraCells export/import mechanism, so legacy levels round-trip without schema changes.