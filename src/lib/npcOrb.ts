import { createElement } from "react";

export interface NpcOrbPalette {
  o0: string;
  o1: string;
  o2: string;
  o3: string;
  symbol: string;
}

export const NPC_ORB: Record<string, NpcOrbPalette> = {
  bernard: { o0: "#6a4a10", o1: "#c8963a", o2: "#e0b055", o3: "#fff0c0", symbol: "M1 0h3v1h-3zM0 1h5v3h-5zM2 4h1v1h-1z" },
  merchant: { o0: "#14402a", o1: "#2f8f5a", o2: "#4fbf7a", o3: "#c9ffd9", symbol: "M1 0h3v1h-3zM0 1h1v3h-1zM4 1h1v3h-1zM1 4h3v1h-3zM2 2h1v1h-1z" },
  chef: { o0: "#5a200e", o1: "#c8502a", o2: "#ee7a4a", o3: "#ffd8c0", symbol: "M2 0h1v1h-1zM0 1h5v1h-5zM0 2h5v3h-5z" },
  painter: { o0: "#4a1038", o1: "#b83a8a", o2: "#e070b8", o3: "#ffd0ee", symbol: "M4 0h1v1h-1zM3 1h1v1h-1zM2 2h1v1h-1zM0 3h2v2h-2z" },
  hacker: { o0: "#0a3a44", o1: "#1f9fb0", o2: "#4fd0e0", o3: "#d0fbff", symbol: "M2 0h1v1h-1zM1 1h1v1h-1zM0 2h1v1h-1zM1 3h1v1h-1zM2 4h1v1h-1zM3 1h1v1h-1zM4 2h1v1h-1zM3 3h1v1h-1z" },
  priest: { o0: "#3a2f80", o1: "#7a6ad8", o2: "#a898f0", o3: "#eae6ff", symbol: "M2 0h1v5h-1zM0 2h5v1h-5z" },
  keeper: { o0: "#1f2a40", o1: "#5a6a8a", o2: "#8ea0c0", o3: "#dbe6ff", symbol: "M0 0h3v1h-3zM0 1h1v2h-1zM2 1h1v2h-1zM0 3h3v1h-3zM3 2h2v1h-2zM4 3h1v1h-1z" },
  banker: { o0: "#3a4a10", o1: "#8aa030", o2: "#b8d050", o3: "#f0ffb0", symbol: "M2 0h1v1h-1zM0 1h5v1h-5zM0 2h1v1h-1zM4 2h1v1h-1zM0 3h2v1h-2zM3 3h2v1h-2z" },
  alexandra: { o0: "#6a3008", o1: "#d0701a", o2: "#f0a040", o3: "#ffe8c8", symbol: "M2 0h1v1h-1zM1 1h3v1h-3zM1 2h3v2h-3zM2 4h1v1h-1z" },
  architect: { o0: "#0f3a36", o1: "#2a8a80", o2: "#4fc0b0", o3: "#c8fff4", symbol: "M2 0h1v1h-1zM1 1h3v1h-3zM0 2h5v1h-5zM0 4h5v1h-5z" },
};

type NpcIdentity = string | { name?: string; npcKey?: string; npc_key?: string };
const UNKNOWN: NpcOrbPalette = { o0: "#2a2f45", o1: "#5a6382", o2: "#8ea0c0", o3: "#dbe6ff", symbol: "" };

export function npcOrbFor(npc: NpcIdentity): NpcOrbPalette {
  const names = typeof npc === "string" ? [npc] : [npc.npcKey, npc.npc_key, npc.name];
  for (const name of names) {
    const match = Object.keys(NPC_ORB).find((key) => name?.toLowerCase().includes(key));
    if (match) return NPC_ORB[match];
  }
  return UNKNOWN;
}

// A stepped, round silhouette in a 20 × 20 cell, shared by SVG and canvas.
const OUTLINE = "M7 7h6v1h2v2h1v5h-1v2h-2v1H7v-1H5v-2H4v-5h1V8h2z";
const BODY = "M7 8h6v1h2v6h-1v2H6v-2H5V9h2z";
const HIGHLIGHT = "M7 9h5v1H8v3H6v-2h1z";
const GLINT = "M7 9h2v2H7z";

function orbParts(palette: NpcOrbPalette) {
  return [
    { d: OUTLINE, fill: palette.o0 },
    { d: BODY, fill: palette.o1 },
    { d: HIGHLIGHT, fill: palette.o2 },
    { d: GLINT, fill: palette.o3 },
  ];
}

export function NpcOrbMini({ npc, size = 20 }: { npc: NpcIdentity; size?: number }) {
  const palette = npcOrbFor(npc);
  return createElement("svg", { width: size, height: size, viewBox: "0 0 20 20", "aria-hidden": true, className: "shrink-0", shapeRendering: "crispEdges" },
    createElement("ellipse", { cx: 10, cy: 17.5, rx: 8, ry: 2, fill: palette.o2, opacity: 0.16, shapeRendering: "geometricPrecision" }),
    ...orbParts(palette).map((part) => createElement("path", { key: part.d, ...part })),
    size >= 16 && palette.symbol ? createElement("path", { d: palette.symbol, fill: palette.o3, transform: "translate(7.5 1)" }) : null,
  );
}

// Canvas cannot render React nodes: paint the miniature's exact same geometry directly.
// Cache paths lazily so server imports never evaluate browser-only Path2D.
const paths = new Map<string, Path2D>();
function pathFor(d: string) {
  let path = paths.get(d);
  if (!path) {
    path = new Path2D(d);
    paths.set(d, path);
  }
  return path;
}

export function drawNpcOrb(ctx: CanvasRenderingContext2D, npc: NpcIdentity, x: number, y: number, size: number) {
  const palette = npcOrbFor(npc);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 20, size / 20);
  ctx.fillStyle = palette.o2;
  ctx.globalAlpha = 0.16;
  ctx.beginPath();
  ctx.ellipse(10, 17.5, 8, 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  for (const part of orbParts(palette)) {
    ctx.fillStyle = part.fill;
    ctx.fill(pathFor(part.d));
  }
  if (size >= 16 && palette.symbol) {
    ctx.translate(7.5, 1);
    ctx.fillStyle = palette.o3;
    ctx.fill(pathFor(palette.symbol));
  }
  ctx.restore();
}