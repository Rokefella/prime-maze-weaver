import { describe,it,expect } from 'bun:test';
import { plotNumber,isPrime,eraAt,ringWarnings,measureLeg,mazeRoute } from './model';
import { blankAreaDraft } from './data';
import { importLevel } from '../maze/storage';
describe('Open world rules',()=>{
 for(const [x,y,n] of [[125,125,1],[126,125,2],[126,124,3],[124,126,7],[127,126,10],[0,0,62501]]) it(`plot ${x},${y} is ${n}`,()=>expect(plotNumber(x,y)).toBe(n));
 it('tests primality, including centre',()=>{expect(isPrime(1)).toBe(false);expect(isPrime(2)).toBe(true);expect(isPrime(62501)).toBe(true);expect(isPrime(10)).toBe(false);});
 const eras=[{id:1,order_index:1,name:'Outer',ring_from:251,ring_to:500,step_cost:3},{id:2,order_index:2,name:'Inner',ring_from:0,ring_to:250,step_cost:1}];
 it('uses inclusive Chebyshev rings around 500,500',()=>{expect(eraAt(eras,0,0).name).toBe('Outer');expect(eraAt(eras,750,500).name).toBe('Inner');expect(eraAt(eras,751,500).name).toBe('Outer');expect(eraAt(eras,500,500).name).toBe('Inner');});
 it('reports overlap',()=>expect(ringWarnings([{...eras[0],ring_from:250},eras[1]])).toContain('Overlap at Outer'));
 it('reports gaps',()=>expect(ringWarnings([{...eras[0],ring_from:252},eras[1]])).toContain('Gap 251–251'));
 it('measures Manhattan distance and sampled average step cost',()=>{expect(measureLeg({x:500,y:500},{x:510,y:520},eras)).toEqual({distance:30,steps:30});const leg=measureLeg({x:740,y:500},{x:780,y:500},eras);expect(leg.distance).toBe(40);expect(leg.steps).toBe(88);});
 it('orders maze entrances, optionally starting at start',()=>{const p=[{id:'b',kind:'maze_entrance',maze_level:2},{id:'s',kind:'start'},{id:'a',kind:'maze_entrance',maze_level:1},{id:'t',kind:'town'}];expect(mazeRoute(p,true).map(p=>p.id)).toEqual(['s','a','b']);});
 it('creates an exact 50x50 OPEN Village draft at level zero',()=>{const draft=blankAreaDraft(3,7);expect(draft.gridSize).toBe(50);expect(draft.mode).toBe('village');expect(draft.levelNumber).toBe(0);expect(draft.levelName).toBe('world_3_7');const loaded=importLevel(draft);expect(loaded.cells).toHaveLength(2500);expect(loaded.cells.every(c=>c.type==='OPEN')).toBe(true);});
});
