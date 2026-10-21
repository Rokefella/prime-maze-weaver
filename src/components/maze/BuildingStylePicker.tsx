import { Button } from "@/components/ui/button";
import { BUILDING_AGES, BUILDING_TONES, buildingColors } from "@/lib/maze/buildings";
import type { BuildingAge, BuildingTone } from "@/lib/maze/types";

export function BuildingStylePicker({ tone, age, onTone, onAge }: {
  tone: BuildingTone; age: BuildingAge;
  onTone: (tone: BuildingTone) => void; onAge: (age: BuildingAge) => void;
}) {
  return <div className="col-span-2 my-1 space-y-2 border-y border-border py-2">
    <div className="flex items-center justify-between gap-1" role="group" aria-label="Building tone">
      <span className="text-[10px] text-muted-foreground">TONE</span>
      {BUILDING_TONES.map((entry) => <Button key={entry.name} variant="ghost" size="icon" aria-label={`Tone ${entry.name}`} aria-pressed={tone === entry.name} title={entry.name} onClick={() => onTone(entry.name)} className={`h-5 w-5 rounded-full border-2 p-0 hover:brightness-110 ${tone === entry.name ? "border-foreground ring-1 ring-ring" : "border-transparent"}`} style={{ backgroundColor: entry.color }} />)}
    </div>
    <div className="flex items-center gap-1.5" role="group" aria-label="Building age">
      <span className="mr-auto text-[10px] text-muted-foreground">AGE</span>
      {BUILDING_AGES.map((value) => <Button key={value} variant="ghost" aria-label={`Age ${value}`} aria-pressed={age === value} onClick={() => onAge(value)} className={`h-6 min-w-7 rounded px-1.5 text-[10px] text-foreground hover:brightness-110 ${age === value ? "border border-foreground" : "border border-transparent"}`} style={{ backgroundColor: buildingColors(tone, value).wall }}>{value === 1 ? "OLD" : value === 4 ? "NEW" : value}</Button>)}
    </div>
  </div>;
}