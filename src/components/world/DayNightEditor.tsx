import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';
import { cyclePhase, phaseTotal, type DayNight } from '@/lib/world/terrain';
import { Field, Input } from './WorldEditors';
export function DayNightEditor({value,onChange,onSave,busy}:{value:DayNight|undefined;onChange:(d:DayNight)=>void;onSave:(d:DayNight)=>void;busy:boolean}) {
 const [now,setNow]=useState<number|null>(null);useEffect(()=>{setNow(Date.now());const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[]);
 if(!value)return <p className="world-warning">Day/night settings are unavailable.</p>;
 const phase=now===null?null:cyclePhase(value,now);
 return <section className="mb-5 border-b border-border pb-4"><h3 className="mb-3 font-display text-sm">DAY AND NIGHT</h3><div className="grid grid-cols-2 gap-2">{(['cycle_minutes','day','dusk','night','dawn','night_view_delta'] as const).map(key=><Field key={key} label={key==='night_view_delta'?'Night view change':key.replaceAll('_',' ')}><Input type="number" min={key==='night_view_delta'?undefined:0} step="0.1" value={value[key]} onChange={v=>onChange({...value,[key]:Number(v)})}/></Field>)}</div>
 <div className="day-night-bar relative mb-2 flex h-7 overflow-hidden border border-border" aria-label="UTC day/night cycle">{(['day','dusk','night','dawn'] as const).map(key=><div key={key} className={`phase-${key} min-w-0 overflow-hidden text-center text-[9px] leading-7`} style={{width:`${Math.max(0,value[key])/Math.max(.01,value.cycle_minutes)*100}%`}}>{key}</div>)}{phase&&<span aria-label="Current phase marker" className="phase-marker absolute inset-y-0" style={{left:`${phase.fraction*100}%`}}/>}</div>
 <p className="mb-3 text-[10px] text-muted-foreground">UTC · {phase?.phase??'—'}</p>{phaseTotal(value)!==value.cycle_minutes&&<p role="status" className="world-warning">Phases total {phaseTotal(value)} minutes; cycle is {value.cycle_minutes}.</p>}
 <Button size="sm" variant="outline" disabled={busy||value.cycle_minutes<=0||['day','dusk','night','dawn'].some(k=>Number(value[k])<0)} onClick={()=>onSave(value)}><Save/> Save day/night</Button></section>;
}
