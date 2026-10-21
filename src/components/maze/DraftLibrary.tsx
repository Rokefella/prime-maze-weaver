import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SavedLevel } from "@/lib/maze/types";
import { groupLibraryDrafts, initialLibraryGroups, libraryGroupFor, LIBRARY_GROUPS_KEY, type LibraryGroupState } from "@/lib/maze/libraryGroups";

export function DraftLibrary({ library, currentId, onLoad, onDelete }: {
  library: SavedLevel[];
  currentId: string | null;
  onLoad: (draft: SavedLevel) => void;
  onDelete: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [openGroups, setOpenGroups] = useState<LibraryGroupState>(() => initialLibraryGroups());
  const [restored, setRestored] = useState(false);
  const current = library.find((draft) => draft.id === currentId);
  const currentGroup = current ? libraryGroupFor(current) : undefined;
  const groups = useMemo(() => groupLibraryDrafts(library, search), [library, search]);
  const searching = Boolean(search.trim());

  useEffect(() => {
    let saved: unknown;
    try { saved = JSON.parse(localStorage.getItem(LIBRARY_GROUPS_KEY) ?? "null"); } catch { /* Keep defaults when storage is unavailable or invalid. */ }
    setOpenGroups(initialLibraryGroups(saved));
    setRestored(true);
  }, []);

  useEffect(() => {
    if (!restored || !currentGroup) return;
    setOpenGroups((previous) => previous[currentGroup] ? previous : { ...previous, [currentGroup]: true });
  }, [restored, currentGroup, currentId]);

  useEffect(() => {
    if (!restored) return;
    try { localStorage.setItem(LIBRARY_GROUPS_KEY, JSON.stringify(openGroups)); } catch { /* Draft actions never depend on local storage. */ }
  }, [openGroups, restored]);

  const setAll = (open: boolean) => setOpenGroups(initialLibraryGroups(Object.fromEntries(Object.keys(openGroups).map((group) => [group, open]))));

  return (
    <div className="flex min-h-0 flex-1 flex-col" aria-label="Draft Library">
      <div className="px-3 pb-2">
        <div className="mb-2 flex items-center justify-between gap-1">
          <Button variant="ghost" size="sm" className="h-6 px-1 text-[10px] text-muted-foreground hover:bg-card/60 hover:text-foreground" onClick={() => setAll(true)}>EXPAND ALL</Button>
          <Button variant="ghost" size="sm" className="h-6 px-1 text-[10px] text-muted-foreground hover:bg-card/60 hover:text-foreground" onClick={() => setAll(false)}>COLLAPSE ALL</Button>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-2 size-3.5 text-muted-foreground" />
          <Input type="search" aria-label="Search drafts" placeholder="Search drafts…" value={search} onChange={(event) => setSearch(event.target.value)} className="h-8 pl-7 pr-7 text-xs md:text-xs" />
          {search && <Button variant="ghost" size="icon" aria-label="Clear draft search" className="absolute right-0 top-0 h-8 w-7 hover:bg-card/60" onClick={() => setSearch("")}><X /></Button>}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-3">
        {groups.length === 0 && <div className="px-2 py-3 text-xs text-muted-foreground">No matching drafts.</div>}
        {groups.map(({ name, rows, ready }) => {
          const open = searching || openGroups[name];
          const contentId = `library-${name.toLowerCase().replaceAll(" ", "-")}`;
          return (
            <section key={name} aria-label={name}>
              <Button variant="ghost" className="h-9 w-full justify-start gap-1.5 rounded-md px-1.5 hover:bg-card/60 hover:text-foreground" aria-expanded={open} aria-controls={contentId} onClick={() => setOpenGroups((previous) => ({ ...previous, [name]: !previous[name] }))}>
                <ChevronRight className={`size-3.5 transition-transform duration-200 motion-reduce:transition-none ${open ? "rotate-90" : ""}`} />
                <span className="min-w-0 text-[11px] uppercase tracking-[0.15em]">{name}</span>
                <span className="text-[10px] text-muted-foreground">{rows.length}</span>
                {ready > 0 && <span className="ml-auto shrink-0 rounded bg-[color:var(--accent-gold)]/20 px-1 py-0.5 text-[9px] font-normal text-[color:var(--accent-gold)]">{ready} ready</span>}
              </Button>
              <div id={contentId} aria-hidden={!open} inert={!open} className={`grid transition-[grid-template-rows] duration-200 ease-in-out motion-reduce:transition-none ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                <div className="min-h-0 overflow-hidden">
                  {rows.map((sl) => (
                    <div key={sl.id} className={`group mb-1 flex items-center justify-between rounded-md border px-2 py-2 hover:bg-card/60 ${currentId === sl.id ? "border-[color:var(--accent-gold)]/60 bg-[color:var(--accent-gold)]/5" : "border-transparent hover:border-border"}`}>
                      <Button variant="ghost" className="h-auto min-w-0 flex-1 flex-col items-start gap-0 whitespace-normal rounded-none p-0 text-left font-normal hover:bg-transparent hover:text-foreground" onClick={() => onLoad(sl)} aria-current={currentId === sl.id ? "true" : undefined}>
                        <span className="flex w-full min-w-0 items-center gap-1.5">
                          <span className="min-w-0 truncate text-sm text-foreground" title={sl.data.levelName}>{sl.data.levelName}</span>
                          <span className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] uppercase tracking-wider ${sl.status === "ready" ? "bg-[color:var(--accent-gold)]/20 text-[color:var(--accent-gold)]" : "bg-muted/40 text-muted-foreground"}`}>{sl.status ?? "draft"}</span>
                        </span>
                        <span className="max-w-full break-words text-[10px] text-muted-foreground">L{sl.data.levelNumber} · {sl.data.gridSize}×{sl.data.gridSize} · {(sl.data.mode ?? "maze").replaceAll("_", " ")}</span>
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => onDelete(sl.id)} className="ml-1 h-5 w-5 shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100 hover:bg-transparent hover:text-destructive" aria-label={`Delete ${sl.data.levelName}`} title={`Delete ${sl.data.levelName}`}><X className="size-3" /></Button>
                    </div>
                  ))}
                  {rows.length === 0 && <div className="px-2 py-2 text-[10px] text-muted-foreground">No saved drafts.</div>}
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}