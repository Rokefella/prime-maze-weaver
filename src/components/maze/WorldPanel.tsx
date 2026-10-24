import { WORLD_LEVEL_MAX, WORLD_LEVEL_MIN } from "@/lib/maze/worldLayers";

export function WorldPanel({ level, era, showNew, onLevel, onShowNew }: {
  level: number;
  era: string | null;
  showNew: boolean;
  onLevel: (level: number) => void;
  onShowNew: (show: boolean) => void;
}) {
  return (
    <div className="border-b border-border p-3">
      <h3 className="font-display text-[10px] uppercase tracking-[0.25em] text-[color:var(--accent-gold)]">World</h3>
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Level {level}</span>
        {era && <span className="text-foreground">{era}</span>}
      </div>
      <input
        type="range"
        aria-label="World level"
        min={WORLD_LEVEL_MIN}
        max={WORLD_LEVEL_MAX}
        step={1}
        value={level}
        onChange={(e) => onLevel(Number(e.target.value))}
        className="mt-1 w-full"
      />
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
        <span>{WORLD_LEVEL_MIN}</span>
        <span>{WORLD_LEVEL_MAX}</span>
      </div>
      <label className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
        <input
          type="checkbox"
          checked={showNew}
          onChange={(e) => onShowNew(e.target.checked)}
        />
        New at this level
      </label>
      <p className="mt-2 text-[10px] text-muted-foreground">
        Painting at level {level} changes the world from level {level} onward.
      </p>
    </div>
  );
}
