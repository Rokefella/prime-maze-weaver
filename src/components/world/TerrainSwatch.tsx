import { useEffect, useRef } from 'react';
import type { Terrain } from '@/lib/world/terrain';
export function TerrainSwatch({terrain,animate=false,size=24}:{terrain:Terrain;animate?:boolean;size?:number}) {
 const ref=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{const canvas=ref.current;if(!canvas)return;const ctx=canvas.getContext('2d');if(!ctx)return;let timer:ReturnType<typeof setInterval>|undefined,tick=0;
 const css=getComputedStyle(canvas),fallback=css.getPropertyValue('--terrain-unknown').trim(),mark=css.getPropertyValue('--terrain-mark').trim();
 const draw=()=>{const motion=terrain.moves,t=tick/10;ctx.clearRect(0,0,size,size);ctx.fillStyle=terrain.color||fallback;ctx.fillRect(0,0,size,size);ctx.strokeStyle=mark;ctx.fillStyle=mark;ctx.lineWidth=1;
 if(motion==='none')return;
 ctx.save();ctx.globalAlpha=.35+.25*Math.sin(t*3);ctx.translate(size/2,size/2);
 if(/turn|sweep/.test(motion))ctx.rotate(t);
 const wave=/flow|waves|foam|ripple|ooze/.test(motion),glow=/glow|pulse|flicker|glint|shimmer/.test(motion);
 if(wave){for(let y=-8;y<=8;y+=5){ctx.beginPath();for(let x=-12;x<=12;x++)ctx.lineTo(x,y+Math.sin(x/4+t*(motion==='flow_fast'?6:2))*2);ctx.stroke();}}
 else if(glow){ctx.beginPath();ctx.arc(0,0,3+Math.sin(t*3)*2,0,Math.PI*2);ctx.fill();}
 else {for(let n=0;n<3;n++){const x=(n-1)*6+Math.sin(t+n)*2,y=((t*5+n*7)%24)-12;ctx.fillRect(x,y,2,4);}}
 ctx.restore();};draw();
 const observer=new IntersectionObserver(entries=>{const visible=entries[0]?.isIntersecting;if(timer){clearInterval(timer);timer=undefined;}if(visible&&animate&&terrain.moves!=='none'&&!matchMedia('(prefers-reduced-motion: reduce)').matches)timer=setInterval(()=>{tick++;draw();},100);});observer.observe(canvas);
 return()=>{observer.disconnect();if(timer)clearInterval(timer);};},[terrain.color,terrain.moves,animate,size]);
 return <canvas ref={ref} width={size} height={size} className="terrain-swatch shrink-0" aria-label={`${terrain.name} colour preview`}/>;
}
