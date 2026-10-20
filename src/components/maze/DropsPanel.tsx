import { useState } from "react";
import { ChevronDown, ChevronRight, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clampChance, dropPanelWarnings, type DropPoolEntry, type DropTypeRow } from "@/lib/maze/drops";

interface Props {
  tileCount: number;
  dropTypes: DropTypeRow[];
  error: string | null;
  keyDrops: string[];
  dropPool: DropPoolEntry[];
  onChange: (keyDrops: string[], dropPool: DropPoolEntry[]) => void;
}

export function DropsPanel({ tileCount, dropTypes, error, keyDrops, dropPool, onChange }: Props) {
  const [open, setOpen] = useState(true);
  const keyTypes = dropTypes.filter((d) => d.category === "key");
  const poolTypes = dropTypes.filter((d) => d.category !== "key");
  const loaded = dropTypes.length > 0;
  const missingKeys = keyDrops.filter((k) => !keyTypes.some((t) => t.drop_key === k));
  const warnings = dropPanelWarnings(keyDrops, dropPool, tileCount);

  const toggleKey = (k: string) =>
    onChange(keyDrops.includes(k) ? keyDrops.filter((x) => x !== k) : [...keyDrops, k], dropPool);
  const setRow = (i: number, patch: Partial<DropPoolEntry>) =>
    onChange(keyDrops, dropPool.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  return (
    <section className="border-b border-border p-4" aria-label="Drops in this maze">
      <Button variant="ghost" size="sm" className="mb-2 h-6 w-full justify-between px-0 text-[10px] font-semibold uppercase tracking-[0.25em] text-[color:var(--accent-gold)]" aria-expanded={open} onClick={() => setOpen(!open)}>
        Drops in this maze {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
      </Button>
      {open && (
        <div className="space-y-3 text-xs">
          <p>Drop tiles placed: <span className="font-semibold">{tileCount}</span></p>
          {error && <p className="text-destructive">Drop types unavailable: {error}</p>}
          {!error && !loaded && <p className="text-muted-foreground">Loading drop types…</p>}

          <div>
            <h4 className="mb-1 text-[10px] uppercase tracking-widest text-muted-foreground">Keys</h4>
            <div className="flex flex-wrap gap-1">
              {keyTypes.map((t) => {
                const on = keyDrops.includes(t.drop_key);
                return (
                  <button key={t.drop_key} type="button" aria-pressed={on} onClick={() => toggleKey(t.drop_key)}
                    className={`rounded-full border px-2 py-0.5 text-[11px] ${on ? "border-[color:var(--accent-gold)] bg-[color:var(--accent-gold)]/20 text-[color:var(--accent-gold)]" : "border-border text-muted-foreground hover:text-foreground"}`}>
                    {t.name || t.drop_key}
                  </button>
                );
              })}
              {loaded && missingKeys.map((k) => (
                <button key={k} type="button" onClick={() => toggleKey(k)} title="Drop type no longer exists — click to remove"
                  className="rounded-full border border-destructive bg-destructive/15 px-2 py-0.5 text-[11px] text-destructive">
                  {k} ×
                </button>
              ))}
              {loaded && keyTypes.length === 0 && missingKeys.length === 0 && <span className="text-muted-foreground">No key drop types.</span>}
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">One of these keys lands on a random drop tile every run. The player never gets a second copy.</p>
          </div>

          <div>
            <h4 className="mb-1 text-[10px] uppercase tracking-widest text-muted-foreground">Pool</h4>
            <div className="space-y-2">
              {dropPool.map((r, i) => {
                const bad = loaded && !poolTypes.some((t) => t.drop_key === r.drop_key);
                return (
                  <div key={i} className={`rounded border p-2 ${bad ? "border-destructive bg-destructive/10" : "border-border"}`}>
                    <div className="flex items-center gap-1">
                      <select value={r.drop_key} onChange={(e) => setRow(i, { drop_key: e.target.value })}
                        className={`min-w-0 flex-1 rounded border border-border bg-background px-1 py-1 ${bad ? "text-destructive" : ""}`}>
                        {bad && <option value={r.drop_key}>{r.drop_key} (missing)</option>}
                        {poolTypes.map((t) => <option key={t.drop_key} value={t.drop_key}>{t.name || t.drop_key}</option>)}
                      </select>
                      <button type="button" aria-label="Remove drop" onClick={() => onChange(keyDrops, dropPool.filter((_, j) => j !== i))}
                        className="rounded p-1 text-muted-foreground hover:text-destructive"><X className="h-3 w-3" /></button>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <input type="range" min={0} max={100} value={r.chance} aria-label="Chance per run"
                        onChange={(e) => setRow(i, { chance: clampChance(Number(e.target.value)) })} className="flex-1" />
                      <span className="w-9 text-right tabular-nums">{r.chance}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <button type="button" disabled={poolTypes.length === 0}
              onClick={() => onChange(keyDrops, [...dropPool, { drop_key: poolTypes[0].drop_key, chance: 30 }])}
              className="mt-2 flex w-full items-center justify-center gap-1 rounded-md border border-[color:var(--accent-gold)]/40 bg-[color:var(--accent-gold)]/10 px-3 py-1.5 text-xs text-[color:var(--accent-gold)] hover:bg-[color:var(--accent-gold)]/20 disabled:opacity-50">
              <Plus className="h-3 w-3" /> Add drop
            </button>
          </div>

          {warnings.map((w) => <p key={w} className="text-[11px] text-[color:var(--accent-gold)]">⚠ {w}</p>)}
        </div>
      )}
    </section>
  );
}
