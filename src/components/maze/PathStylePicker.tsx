import { Button } from "@/components/ui/button";
import { STREET_STYLES } from "@/lib/maze/streetStyles";
import type { StreetStyle } from "@/lib/maze/types";

export function PathStylePicker({ value, onChange }: { value: StreetStyle; onChange: (value: StreetStyle) => void }) {
  return (
    <div className="grid grid-cols-3 gap-1" role="group" aria-label="Path style">
      {STREET_STYLES.map((style) => (
        <Button key={style.key} variant="outline" aria-pressed={value === style.key} onClick={() => onChange(style.key)}
          className={`h-auto min-w-0 flex-col justify-start gap-2 whitespace-normal rounded-md border-2 px-0 py-2 ${value === style.key ? "border-[color:var(--path-style-selected)]" : "border-transparent"}`}>
          <span className="block aspect-square w-full max-w-[72px] bg-repeat bg-[length:24px_24px]" style={{ backgroundImage: `url("${style.image}")` }} />
          <span className="min-h-7 text-center text-[9px] leading-tight">{style.label}</span>
        </Button>
      ))}
    </div>
  );
}