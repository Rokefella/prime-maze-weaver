import {describe,it,expect} from 'bun:test';
import {FIND_KINDS,NO_QUEST,filterFinds,countFinds,findMarker} from './finds';
const find=(id,layer,kind,quest_key=null)=>({id,layer,kind,quest_key,x:125,y:125,visibility:'visible'});
describe('Read-only WORLD finds',()=>{
 const rows=[find('a',0,'cache_steps'),find('b',1,'cache_steps'),find('c',0,'sigil','quest_1')];
 it('shows only the current layer',()=>expect(filterFinds(rows,0,new Set(FIND_KINDS),new Set([NO_QUEST,'quest_1'])).map(f=>f.id)).toEqual(['a','c']));
 it('filters kinds independently',()=>expect(filterFinds(rows,0,new Set(['sigil']),new Set([NO_QUEST,'quest_1'])).map(f=>f.id)).toEqual(['c']));
 it('null quests match no quest only',()=>expect(filterFinds(rows,0,new Set(FIND_KINDS),new Set([NO_QUEST])).map(f=>f.id)).toEqual(['a']));
 it('counts every kind, including zero counts',()=>expect(countFinds(rows)).toEqual({cache_steps:2,cache_credits:0,thing:0,tool:0,words:0,quest_object:0,landmark:0,sigil:1}));
 it('keeps low zoom markers at ten screen pixels',()=>{expect(findMarker(rows[0],{x:0,y:0,k:.05},true).size).toBe(10);expect(findMarker(rows[0],{x:0,y:0,k:2},true).size).toBe(10);});
 it('projects underground coordinates into four-cell surface blocks',()=>expect(findMarker(rows[1],{x:10,y:20,k:1},false)).toMatchObject({x:512,y:522}));
 it('uses sprites only at three or more pixels per cell',()=>{expect(findMarker(rows[0],{x:0,y:0,k:3},true)).toMatchObject({icon:true,size:24});expect(findMarker(rows[0],{x:0,y:0,k:30},false).icon).toBe(false);});
 it('retains hidden outlines independently of zoom',()=>expect(findMarker({...rows[0],visibility:'hidden'},{x:0,y:0,k:.05},false).hidden).toBe(true));
});