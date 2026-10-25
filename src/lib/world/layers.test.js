import {describe,it,expect} from 'bun:test';
import {placeLayer,mapPoint,layerCoords,placeFacts,transitionTarget,visibleTiles,TerrainWindowCache} from './layers';
describe('WORLD layer coordinates',()=>{
 it('legacy places default to surface',()=>expect(placeLayer({})).toBe(0));
 it('underground cell 249 occupies the final 4x4 block',()=>{expect(mapPoint(249,249,1)).toEqual({x:998,y:998});expect(layerCoords(999,999,1)).toEqual({x:249,y:249});});
 it('surface coordinates are not multiplied',()=>{expect(mapPoint(25,25,0)).toEqual({x:25.5,y:25.5});expect(layerCoords(25.5,25.5,0)).toEqual({x:25,y:25});});
 it('bounds underground dragging to 0..249',()=>{expect(layerCoords(-10,1005,1)).toEqual({x:0,y:249});});
 it('underground cells are surface plots, including centre plot',()=>{expect(placeFacts({layer:1,x:125,y:125})).toMatchObject({px:125,py:125,ax:10,ay:10});});
 it('descend projects target into underground 4x4 block',()=>expect(transitionTarget({action:'descend',target_layer:1,target_x:125,target_y:133})).toEqual({layer:1,x:502,y:534}));
 it('ascend preserves target surface coordinates',()=>expect(transitionTarget({action:'ascend',target_layer:0,target_x:783,target_y:638})).toEqual({layer:0,x:783.5,y:638.5}));
 it('missing targets never become zero-coordinate markers',()=>expect(transitionTarget({action:'descend',target_layer:1,target_x:null,target_y:1})).toBeNull());
 it('tiles cover viewport with calls at most 128x128, clipping world edges',()=>{const tiles=visibleTiles(900,900,1100,1100);expect(tiles).toEqual([{x0:896,y0:896,w:104,h:104}]);expect(visibleTiles(-10,-10,129,129)).toHaveLength(4);expect(visibleTiles(1001,0,1100,100)).toEqual([]);});
 it('cache deduplicates reads and limits concurrency to four',async()=>{let active=0,max=0,calls=0;const cache=new TerrainWindowCache(async tile=>{calls++;active++;max=Math.max(max,active);await new Promise(r=>setTimeout(r,3));active--;return {...tile,keys:[],rows:[]};},()=>{});const tiles=visibleTiles(0,0,500,500);cache.request(tiles);cache.request(tiles);while(cache.tiles.size<tiles.length)await new Promise(r=>setTimeout(r,5));cache.request(tiles);expect(calls).toBe(16);expect(max).toBe(4);cache.dispose();});
});