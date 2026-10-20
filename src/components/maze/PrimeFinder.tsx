import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPrime, fragmentSummary, isPrimeNumber, type FragmentEntry } from "@/lib/maze/fragments";

interface Props {
  entries: FragmentEntry[];
  showLabels: boolean;
  onShowLabels: (value: boolean) => void;
  onFocus: (entry: FragmentEntry) => void;
}

export function PrimeFinder({ entries, showLabels, onShowLabels, onFocus }: Props) {
  const [open, setOpen] = useState(true);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const summary = useMemo(() => fragmentSummary(entries), [entries]);
  const find = () => {
    if (!/^\d+$/.test(search.trim()) || !Number.isSafeInteger(Number(search))) {
      setMessage("Enter a whole number.");
      return;
    }
    const prime = Number(search);
    const entry = entries.find((entry) => entry.prime === prime);
    if (entry) { setMessage(""); onFocus(entry); }
    else setMessage(`${!isPrimeNumber(prime) ? `${prime} is not prime. ` : ""}No fragment with prime ${prime} in this level.`);
  };
  return (
    <section className="border-b border-border p-4" aria-label="Primes">
      <Button variant="ghost" size="sm" className="mb-2 h-6 w-full justify-between px-0 text-xs text-accent" aria-expanded={open} onClick={() => setOpen(!open)}>
        PRIMES {open ? <ChevronDown /> : <ChevronRight />}
      </Button>
      {open && <>
        <form className="mb-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); find(); }}>
          <input aria-label="Find prime" placeholder="Find prime" inputMode="numeric" value={search} onChange={(e) => { setSearch(e.target.value); setMessage(""); }} className="min-w-0 flex-1 rounded border border-input bg-background px-2 py-1 font-mono text-xs" />
          <Button type="submit" variant="outline" size="sm" className="shrink-0"><Search /> FIND</Button>
        </form>
        {message && <p role="status" className="mb-2 text-xs text-destructive">{message}</p>}
        <div className="max-h-56 overflow-y-auto" aria-label="Draft fragments">
          {entries.length === 0 && <p className="py-2 text-xs text-muted-foreground">No fragments placed.</p>}
          {entries.map((entry, index) => <Button key={`${entry.col},${entry.row}`} variant="ghost" size="sm" className="h-8 w-full justify-between gap-1 px-1 font-mono text-xs" onClick={() => { setMessage(""); onFocus(entry); }} aria-label={`Find fragment ${formatPrime(entry.prime)} at ${entry.col},${entry.row}`}>
            <span className="text-accent">{formatPrime(entry.prime)}</span>
            <span className="text-muted-foreground">{entry.col},{entry.row}</span>
            <span className={`w-12 rounded px-1 py-0.5 text-center font-sans text-[9px] ${index === summary.middleIndex ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"}`}>{index === summary.middleIndex ? "MIDDLE" : "PRIME"}</span>
          </Button>)}
        </div>
        {summary.code && <div className="mt-3 flex justify-between border-t border-border pt-2 font-mono text-sm" aria-label="Prime code"><span className="text-muted-foreground">CODE</span><output className="text-accent">{summary.code}</output></div>}
        {summary.warnings.length > 0 && <div className="mt-2 space-y-1 text-xs text-destructive" role="status">{summary.warnings.map((warning, i) => <p key={i}>{warning}</p>)}</div>}
        <label className="mt-3 flex items-center gap-2 text-xs"><input type="checkbox" checked={showLabels} onChange={(e) => onShowLabels(e.target.checked)} />Show prime labels</label>
      </>}
    </section>
  );
}