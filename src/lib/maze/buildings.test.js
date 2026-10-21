import { describe, it, expect } from "bun:test";
import { BUILDING_TONES, BUILDING_AGES, buildingColors, ageBuildings, nextVillage } from "./buildings";
import { exportLevel, importLevel } from "./storage";
import { buildUlamData } from "./ulam";
const meta = { mode: "village", levelNumber: 1, levelName: "Village1", requiredFragments: 0, notes: "" };
const ulam = buildUlamData(5);
const blank = () => Array.from({length:25}, () => ({type:"OPEN"}));
describe("Village buildings", () => {
  it("uses all six specified base tones", () => {
    expect(BUILDING_TONES.map((t) => [t.name, buildingColors(t.name, 4).wall])).toEqual([["terracotta","#c8603a"],["sand","#d4b078"],["slate","#6a86a8"],["sage","#7a9a6a"],["plum","#8a5a8a"],["stone","#8a8a96"]]);
  });
  it("applies age brightness and grey mixing with roofs 35% darker", () => {
    expect(BUILDING_AGES.map((age) => buildingColors("sand",age))).toEqual([{wall:"#5d4f39",roof:"#3d3325"},{wall:"#816d4d",roof:"#544732"},{wall:"#a88d62",roof:"#6d5b3f"},{wall:"#d4b078",roof:"#8a724e"}]);
  });
  it("defaults legacy buildings to sand age 4 without rewriting fields", () => {
    const cells=blank();cells[0]={type:"BUILDING_S"};
    const data=exportLevel(cells,ulam,meta);
    const loaded=importLevel(data);
    expect(buildingColors(loaded.cells[0].tone,loaded.cells[0].age).wall).toBe("#d4b078");
    expect(exportLevel(loaded.cells,ulam,loaded.meta)).toEqual(data);
    expect(data.extraCells[0]).toEqual({col:0,row:0,type:"BUILDING_S"});
  });
  it("round-trips each tone and age on building extraCells", () => {
    for(const tone of BUILDING_TONES)for(const age of BUILDING_AGES){
      const cells=blank();cells[0]={type:"BUILDING_M",tone:tone.name,age};
      const data=exportLevel(cells,ulam,meta);
      expect(data.extraCells[0]).toEqual({col:0,row:0,type:"BUILDING_M",tone:tone.name,age});
      expect(importLevel(data).cells[0]).toEqual(cells[0]);
    }
  });
  it("AGE ALL decrements all building types to minimum 1 and counts only changes", () => {
    const cells=[{type:"BUILDING_S"},{type:"BUILDING_M",tone:"sage",age:2},{type:"BUILDING_L",age:1},{type:"BUILDING_23",age:4},{type:"ROAD"}];
    const aged=ageBuildings(cells);
    expect(aged.changed).toBe(3);
    expect(aged.cells.map((c)=>c.age)).toEqual([3,1,1,3,undefined]);
    expect(cells[0]).toEqual({type:"BUILDING_S"});
    expect(aged.cells[4]).toBe(cells[4]);
  });
  it("creates Village2 from Village1 with older buildings and no source mutation", () => {
    const cells=[{type:"BUILDING_L",tone:"plum",age:4},{type:"DOOR_MAZE"}];
    const next=nextVillage(cells,meta);
    expect(next.meta.levelName).toBe("Village2");expect(next.meta.levelNumber).toBe(2);
    expect(next.cells[0]).toEqual({type:"BUILDING_L",tone:"plum",age:3});
    expect(cells[0].age).toBe(4);expect(meta.levelNumber).toBe(1);
  });
  it("leaves other modes' exports untouched", () => {
    const cells=blank();cells[0]={type:"BUILDING_S",tone:"plum",age:2};
    expect(exportLevel(cells,ulam,{...meta,mode:"library"}).extraCells[0]).toEqual({col:0,row:0,type:"BUILDING_S"});
  });
});