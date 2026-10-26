import { Crosshair, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FIND_KINDS, FIND_LABELS, NO_QUEST, countFinds, type FindDrop, type FindKind, type WorldFind } from '@/lib/world/finds';

const flags=(value:unknown)=>value==null?'—':typeof value==='string'?value:JSON.stringify(value,null,2);
export function FindsPanel({rows,shown,drops,kinds,quests,onKinds,onQuests,selected,onSelect,onCenter,loading,error,onRetry}:{rows:WorldFind[];shown:WorldFind[];drops:FindDrop[];kinds:Set<FindKind>;quests:Set<string>;onKinds:(next:Set<FindKind>)=>void;onQuests:(next:Set<string>)=>void;selected:WorldFind|null;onSelect:(find:WorldFind|null)=>void;onCenter:(find:WorldFind)=>void;loading:boolean;error:string;onRetry:()=>void}) {
 const counts=countFinds(rows),questKeys=[...new Set(rows.map(f=>f.quest_key??NO_QUEST))].sort();
 const toggle=<T,>(values:Set<T>,key:T)=>{const next=new Set(values);if(next.has(key))next.delete(key);else next.add(key);return next;};
 return <section aria-label="Finds panel" className="space-y-4">
  <h2 className="font-display text-sm">{rows.length} finds <span className="text-xs text-muted-foreground">· {shown.length} shown</span></h2>
  {loading&&<p role="status" className="text-xs">Loading finds…</p>}
  {error&&<div role="alert" className="text-xs text-destructive">{error}<Button size="sm" variant="outline" onClick={onRetry}>Retry finds</Button></div>}
  <fieldset><legend className="mb-2 text-xs text-muted-foreground">Kind</legend><div className="flex flex-wrap gap-1">{FIND_KINDS.map(kind=><Button key={kind} size="sm" variant={kinds.has(kind)?'secondary':'outline'} className={`find-${kind} h-auto min-h-7 px-2 text-[11px]`} aria-pressed={kinds.has(kind)} onClick={()=>onKinds(toggle(kinds,kind))}><i className="find-legend-dot"/>{FIND_LABELS[kind]} {counts[kind]}</Button>)}</div></fieldset>
  <fieldset><legend className="mb-2 text-xs text-muted-foreground">Quest</legend><div className="flex flex-wrap gap-1">{questKeys.map(key=><Button key={key} size="sm" variant={quests.has(key)?'secondary':'outline'} className="h-auto min-h-7 whitespace-normal break-words px-2 text-[11px]" aria-pressed={quests.has(key)} onClick={()=>onQuests(toggle(quests,key))}>{key} · {rows.filter(f=>(f.quest_key??NO_QUEST)===key).length}</Button>)}</div></fieldset>
  {selected&&<section className="border-y border-border py-3" aria-label="Find details">
   <div className="mb-3 flex items-start justify-between gap-2"><h3 className="break-words font-display text-sm">{selected.title||selected.find_key}</h3><Button size="icon" variant="ghost" aria-label="Close find details" onClick={()=>onSelect(null)}><X/></Button></div>
   <dl className="find-details">{[
    ['Find key',selected.find_key],['Kind',FIND_LABELS[selected.kind]],['Visibility',selected.visibility],
    ['Coordinates',`${selected.x}, ${selected.y} · layer ${selected.layer} (${selected.layer===1?'underground':'surface'})`],
    ['Amount',selected.amount??'—'],['Drop',selected.drop_key?`${drops.find(d=>d.drop_key===selected.drop_key)?.name??selected.drop_key} (${selected.drop_key})`:'—'],
    ['Quest',selected.quest_key??NO_QUEST],['Requires flags',flags(selected.requires_flags)],['Grants flags',flags(selected.grants_flags)],
    ['Text',selected.text||'—'],['Note',selected.note||'—']
   ].map(([key,value])=><div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl>
   <Button size="sm" variant="outline" onClick={()=>onCenter(selected)}><Crosshair/>Center here</Button>
  </section>}
  <div className="space-y-1" aria-label="Visible finds">{shown.map(f=><Button key={f.id} variant={f.id===selected?.id?'secondary':'ghost'} className="h-auto min-h-8 w-full justify-start whitespace-normal break-words px-2 text-left text-xs" onClick={()=>onSelect(f)}><i className={`find-legend-dot find-${f.kind}`}/>{f.title||f.find_key}</Button>)}</div>
  {!loading&&!shown.length&&<p className="text-xs text-muted-foreground">No finds in this layer and filter selection.</p>}
 </section>;
}