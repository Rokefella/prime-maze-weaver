import { useCallback, useRef, useState } from 'react';
import { Globe2, Hammer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PraemBuilder } from '@/components/maze/PraemBuilder';
import { WorldWorkspace } from './WorldWorkspace';
import type { SavedLevel } from '@/lib/maze/types';
export function WeaverWorkspace() {
 const [active,setActive]=useState<'builder'|'world'>('builder'),[opened,setOpened]=useState(false);
 const opener=useRef<((draft:SavedLevel)=>boolean)|null>(null);
 const register=useCallback((open:(draft:SavedLevel)=>boolean)=>{opener.current=open;},[]);
 const openDraft=(draft:SavedLevel)=>{if(!opener.current?.(draft))return false;setActive('builder');return true;};
 return <div className="weaver-workspace bg-background text-foreground">
  <header className="flex h-12 items-center justify-between border-b border-border px-4">
   <span className="font-display text-xs uppercase tracking-widest">PRÆM <span className="ml-2 text-muted-foreground">Weaver</span></span>
   <nav className="flex gap-1" aria-label="Workspace"><Button size="sm" variant={active==='builder'?'secondary':'ghost'} aria-pressed={active==='builder'} onClick={()=>setActive('builder')}><Hammer/> BUILDER</Button><Button size="sm" variant={active==='world'?'secondary':'ghost'} aria-pressed={active==='world'} onClick={()=>{setOpened(true);setActive('world');}}><Globe2/> WORLD</Button></nav>
  </header>
  <div className="weaver-content" hidden={active!=='builder'}><PraemBuilder onRegisterDraftOpener={register}/></div>
  {opened&&<div className="weaver-content" hidden={active!=='world'}><WorldWorkspace onOpenDraft={openDraft}/></div>}
 </div>;
}
