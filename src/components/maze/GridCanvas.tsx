import { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from "react";
import type { BuilderMode, CellState } from "@/lib/maze/types";
import type { UlamData } from "@/lib/maze/ulam";
import {
  PALETTE,
  VILLAGE_PALETTE,
  SHADOW_PALETTE,
  BUILDING_GLYPH,
  swatchFor,
  VILLAGE_EXTRA,
  abbrevCharacter,
} from "@/lib/maze/palette";

export interface GridCanvasHandle {
  centerOn: (col: number, row: number) => void;
}

interface Props {
  ulam: UlamData;
  cells: CellState[];
  showNumbers: boolean;
  highlight?: { col: number; row: number } | null;
  onCellClick: (col: number, row: number, e: { button: number; shiftKey: boolean }) => void;
  onCellHover?: (col: number, row: number | null) => void;
  rotation?: 0 | 1 | 2 | 3; // 0=Purple, 1=Amber (CCW), 3=Teal (CW)
  readOnly?: boolean;
  routeA?: { col: number; row: number } | null;
  routeB?: { col: number; row: number } | null;
  routePath?: Set<number> | null;
  mode?: BuilderMode;
  rectPreview?: { a: { col: number; row: number }; b: { col: number; row: number } } | null;
}

const MIN_SCALE = 0.15;
const MAX_SCALE = 4;

export const GridCanvas = forwardRef<GridCanvasHandle, Props>(function GridCanvas(
  { ulam, cells, showNumbers, highlight, onCellClick, onCellHover, rotation = 0, readOnly = false, routeA = null, routeB = null, routePath = null, mode = "maze", rectPreview = null },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const size = ulam.size;

  // Map a displayed (col,row) to the canonical (col,row) in unrotated space.
  const toCanonical = (c: number, r: number): { col: number; row: number } => {
    switch (rotation) {
      case 1: // CCW: displayed (c,r) <- canonical (size-1-r, c)
        return { col: r, row: size - 1 - c };
      case 2:
        return { col: size - 1 - c, row: size - 1 - r };
      case 3: // CW
        return { col: size - 1 - r, row: c };
      default:
        return { col: c, row: r };
    }
  };

  const canonHighlight = highlight; // highlight passed in canonical; convert to display
  const toDisplay = (c: number, r: number): { col: number; row: number } => {
    switch (rotation) {
      case 1: // canonical (c,r) -> displayed (size-1-r, c)
        return { col: size - 1 - r, row: c };
      case 2:
        return { col: size - 1 - c, row: size - 1 - r };
      case 3:
        return { col: r, row: size - 1 - c };
      default:
        return { col: c, row: r };
    }
  };

  // base cell pixel size at scale=1
  const BASE_CELL = 22;

  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [hover, setHover] = useState<{ col: number; row: number } | null>(null);
  const [viewport, setViewport] = useState({ w: 0, h: 0 });

  // Animation tick for fragment pulse
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      setTick((t) => (t + 1) % 100000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Resize observer
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const rect = el.getBoundingClientRect();
      setViewport({ w: rect.width, h: rect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Fit on first mount / size change
  useEffect(() => {
    if (viewport.w === 0 || viewport.h === 0) return;
    const gridPx = size * BASE_CELL;
    const s = Math.min(viewport.w / gridPx, viewport.h / gridPx) * 0.95;
    const clamped = Math.max(MIN_SCALE, Math.min(MAX_SCALE, s));
    setScale(clamped);
    setOffset({
      x: (viewport.w - gridPx * clamped) / 2,
      y: (viewport.h - gridPx * clamped) / 2,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size, viewport.w, viewport.h]);

  const centerOn = useCallback(
    (col: number, row: number) => {
      const cellPx = BASE_CELL * scale;
      setOffset({
        x: viewport.w / 2 - (col + 0.5) * cellPx,
        y: viewport.h / 2 - (row + 0.5) * cellPx,
      });
    },
    [scale, viewport.w, viewport.h],
  );

  useImperativeHandle(ref, () => ({ centerOn }), [centerOn]);

  // Drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || viewport.w === 0) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = viewport.w * dpr;
    canvas.height = viewport.h * dpr;
    canvas.style.width = `${viewport.w}px`;
    canvas.style.height = `${viewport.h}px`;
    const ctx = canvas.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const bg =
      mode === "village"
        ? VILLAGE_PALETTE.background
        : mode === "shadow_realm"
          ? SHADOW_PALETTE.background
          : PALETTE.background;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, viewport.w, viewport.h);

    const cellPx = BASE_CELL * scale;
    // Determine visible cell range
    const startCol = Math.max(0, Math.floor(-offset.x / cellPx));
    const endCol = Math.min(size - 1, Math.ceil((viewport.w - offset.x) / cellPx));
    const startRow = Math.max(0, Math.floor(-offset.y / cellPx));
    const endRow = Math.min(size - 1, Math.ceil((viewport.h - offset.y) / cellPx));

    const pulse = 0.5 + 0.5 * Math.sin(tick * 0.08);

    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        const canon = toCanonical(c, r);
        const i = canon.row * size + canon.col;
        const cell = cells[i];
        const isPrime = ulam.isPrime[i] === 1;
        const x = Math.floor(offset.x + c * cellPx);
        const y = Math.floor(offset.y + r * cellPx);
        const w = Math.ceil(cellPx);
        const h = Math.ceil(cellPx);

        let fill = PALETTE.corridor;
        if (mode !== "maze") {
          if (
            cell.type === "SQUARE" ||
            cell.type === "ROAD" ||
            cell.type === "LANDMARK" ||
            cell.type === "WHISPER"
          ) {
            ctx.fillStyle = bg;
            ctx.fillRect(x, y, w, h);
            ctx.fillStyle =
              cell.type === "SQUARE"
                ? VILLAGE_EXTRA.square
                : cell.type === "ROAD"
                  ? VILLAGE_EXTRA.road
                  : cell.type === "LANDMARK"
                    ? VILLAGE_EXTRA.landmark
                    : VILLAGE_EXTRA.whisper;
            ctx.fillRect(x, y, w, h);
            if (cell.type === "ROAD") {
              ctx.strokeStyle = VILLAGE_EXTRA.roadBorder;
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(x, y + h - 0.5);
              ctx.lineTo(x + w, y + h - 0.5);
              ctx.stroke();
            }
            if (cell.type === "LANDMARK") {
              ctx.strokeStyle = VILLAGE_EXTRA.landmarkBorder;
              ctx.lineWidth = 0.5;
              ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
              const d = Math.max(2, cellPx * 0.22);
              ctx.beginPath();
              ctx.moveTo(x + w / 2, y + h / 2 - d);
              ctx.lineTo(x + w / 2 + d, y + h / 2);
              ctx.lineTo(x + w / 2, y + h / 2 + d);
              ctx.lineTo(x + w / 2 - d, y + h / 2);
              ctx.closePath();
              ctx.stroke();
            }
            if (cell.type === "WHISPER") {
              ctx.save();
              ctx.strokeStyle = VILLAGE_EXTRA.whisperBorder;
              ctx.lineWidth = 0.5;
              ctx.setLineDash([2, 2]);
              ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
              ctx.restore();
              if (cellPx >= 10) {
                ctx.fillStyle = VILLAGE_EXTRA.whisperGlyph;
                ctx.font = `italic ${Math.floor(cellPx * 0.5)}px ui-serif, Georgia, serif`;
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText("w", x + w / 2, y + h / 2);
              }
            }
            if (routePath && routePath.has(i)) {
              ctx.fillStyle = "rgba(255,140,40,0.55)";
              ctx.fillRect(x, y, w, h);
            }
            continue;
          }
          fill = swatchFor(cell.type, mode);
          ctx.fillStyle = fill;
          ctx.fillRect(x, y, w, h);

          const glyph = BUILDING_GLYPH[cell.type];
          if (glyph) {
            ctx.strokeStyle =
              mode === "village" ? VILLAGE_PALETTE.buildingBorder : SHADOW_PALETTE.buildingBorder;
            ctx.lineWidth = 1.5;
            ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
            if (
              cell.type === "BUILDING_23" ||
              cell.type === "BUILDING_47" ||
              cell.type === "BUILDING_89"
            ) {
              ctx.fillStyle = `rgba(255,215,120,${0.15 + 0.25 * pulse})`;
              ctx.fillRect(x, y, w, h);
            }
            if (cellPx >= 12) {
              ctx.fillStyle = "rgba(255,245,220,0.85)";
              ctx.font = `${Math.floor(cellPx * 0.4)}px ui-monospace, monospace`;
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              ctx.fillText(glyph, x + w / 2, y + h / 2);
            }
          }
          if (cell.type === "FOREST" && cellPx >= 5) {
            ctx.fillStyle = VILLAGE_PALETTE.forestDot;
            const r2 = Math.max(1, cellPx * 0.16);
            ctx.beginPath();
            ctx.arc(x + w / 2, y + h / 2, r2, 0, Math.PI * 2);
            ctx.fill();
          }
          if (cell.type === "GHOST_ZONE" && cellPx >= 4) {
            ctx.fillStyle = SHADOW_PALETTE.ghostMarker;
            const s2 = Math.max(1, Math.floor(cellPx * 0.22));
            ctx.fillRect(x + s2, y + s2, w - 2 * s2, h - 2 * s2);
          }
          if (cell.type === "EYE" && cellPx >= 6) {
            ctx.fillStyle = `rgba(0,0,0,${0.25 + 0.4 * pulse})`;
            ctx.beginPath();
            ctx.arc(x + w / 2, y + h / 2, Math.max(1, cellPx * 0.2), 0, Math.PI * 2);
            ctx.fill();
          }
          if (cell.type === "TRANSFER_POINT" && cellPx >= 6) {
            ctx.strokeStyle = `rgba(255,255,255,${0.35 + 0.5 * pulse})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(x + w / 2, y + h / 2, Math.max(2, cellPx * 0.3), 0, Math.PI * 2);
            ctx.stroke();
          }
          if (cell.type === "NPC" && cell.npc?.name && cellPx >= 9) {
            ctx.fillStyle = "rgba(160,140,200,0.8)";
            ctx.font = "8px ui-monospace, monospace";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(abbrevCharacter(cell.npc.name), x + w / 2, y + h / 2);
          }
          if (routePath && routePath.has(i)) {
            ctx.fillStyle = "rgba(255,140,40,0.55)";
            ctx.fillRect(x, y, w, h);
          }
          continue;
        }
        switch (cell.type) {
          case "WALL":
            fill = PALETTE.wall;
            break;
          case "CORRIDOR":
            fill = isPrime ? PALETTE.primeCorridor : PALETTE.corridor;
            break;
          case "FRAGMENT": {
            // pulsate
            const a = 0.55 + 0.45 * pulse;
            ctx.fillStyle = isPrime ? PALETTE.primeCorridor : PALETTE.corridor;
            ctx.fillRect(x, y, w, h);
            ctx.fillStyle = `rgba(184,123,255,${a})`;
            ctx.fillRect(x, y, w, h);
            continue;
          }
          case "GOLDEN_DOOR":
            fill = PALETTE.goldenDoor;
            break;
          case "START":
            fill = PALETTE.start;
            break;
          case "BLUE_DOOR":
            fill = PALETTE.blueDoor;
            break;
          case "DOOR_TO_ROOM":
            fill = PALETTE.doorToRoom;
            break;
          case "NPC":
            fill = PALETTE.npc;
            break;
          case "VEIL":
            fill = PALETTE.veil;
            break;
          case "DROP":
            fill = PALETTE.drop;
            break;
        }
        ctx.fillStyle = fill;
        ctx.fillRect(x, y, w, h);

        if (cell.type === "NPC" && cell.npc?.name && cellPx >= 9) {
          ctx.fillStyle = "rgba(160,140,200,0.8)";
          ctx.font = "8px ui-monospace, monospace";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(abbrevCharacter(cell.npc.name), x + w / 2, y + h / 2);
        }

        // Veil overlay: faint diagonal hint so designer can distinguish from wall
        if (cell.type === "VEIL" && cellPx >= 4) {
          ctx.fillStyle = PALETTE.veilMarker;
          const s = Math.max(1, Math.floor(cellPx * 0.18));
          ctx.fillRect(x + s, y + s, w - 2 * s, h - 2 * s);
        }
        // Drop overlay: small inner dot
        if (cell.type === "DROP" && cellPx >= 6) {
          ctx.fillStyle = "rgba(0,0,0,0.45)";
          const r2 = Math.max(1, cellPx * 0.18);
          ctx.beginPath();
          ctx.arc(x + w / 2, y + h / 2, r2, 0, Math.PI * 2);
          ctx.fill();
        }
        // Route path overlay
        if (routePath && routePath.has(i)) {
          ctx.fillStyle = "rgba(255,140,40,0.55)";
          ctx.fillRect(x, y, w, h);
        }
      }
    }

    // grid lines (only if cells big enough)
    if (cellPx >= 6) {
      ctx.strokeStyle = PALETTE.gridLine;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let c = startCol; c <= endCol + 1; c++) {
        const x = Math.floor(offset.x + c * cellPx) + 0.5;
        ctx.moveTo(x, Math.floor(offset.y + startRow * cellPx));
        ctx.lineTo(x, Math.floor(offset.y + (endRow + 1) * cellPx));
      }
      for (let r = startRow; r <= endRow + 1; r++) {
        const y = Math.floor(offset.y + r * cellPx) + 0.5;
        ctx.moveTo(Math.floor(offset.x + startCol * cellPx), y);
        ctx.lineTo(Math.floor(offset.x + (endCol + 1) * cellPx), y);
      }
      ctx.stroke();
    }

    // numbers overlay
    if (showNumbers && cellPx >= 16) {
      ctx.font = `${Math.floor(cellPx * 0.38)}px ui-monospace, monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (let r = startRow; r <= endRow; r++) {
        for (let c = startCol; c <= endCol; c++) {
          const canon = toCanonical(c, r);
          const i = canon.row * size + canon.col;
          ctx.fillStyle = ulam.isPrime[i] ? PALETTE.primeNumber : PALETTE.nonPrimeNumber;
          ctx.fillText(
            String(ulam.numbers[i]),
            offset.x + (c + 0.5) * cellPx,
            offset.y + (r + 0.5) * cellPx,
          );
        }
      }
    }

    // hover outline
    if (hover && hover.col >= startCol && hover.col <= endCol && hover.row >= startRow && hover.row <= endRow) {
      ctx.strokeStyle = PALETTE.hoverOutline;
      ctx.lineWidth = 2;
      ctx.strokeRect(
        offset.x + hover.col * cellPx + 1,
        offset.y + hover.row * cellPx + 1,
        cellPx - 2,
        cellPx - 2,
      );
    }

    // highlight (from prime list click) — convert canonical to display
    if (canonHighlight) {
      const dh = toDisplay(canonHighlight.col, canonHighlight.row);
      ctx.strokeStyle = PALETTE.highlight;
      ctx.lineWidth = 3;
      ctx.strokeRect(
        offset.x + dh.col * cellPx + 1,
        offset.y + dh.row * cellPx + 1,
        cellPx - 2,
        cellPx - 2,
      );
    }

    // Route endpoints A (green) and B (red)
    const drawEndpoint = (pt: { col: number; row: number }, color: string) => {
      const d = toDisplay(pt.col, pt.row);
      ctx.fillStyle = color;
      ctx.fillRect(offset.x + d.col * cellPx, offset.y + d.row * cellPx, cellPx, cellPx);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.strokeRect(
        offset.x + d.col * cellPx + 1,
        offset.y + d.row * cellPx + 1,
        cellPx - 2,
        cellPx - 2,
      );
    };
    if (routeA) drawEndpoint(routeA, "#22c55e");
    if (routeB) drawEndpoint(routeB, "#ef4444");

    // Rectangle fill preview
    if (rectPreview) {
      const c0 = Math.min(rectPreview.a.col, rectPreview.b.col);
      const c1 = Math.max(rectPreview.a.col, rectPreview.b.col);
      const r0 = Math.min(rectPreview.a.row, rectPreview.b.row);
      const r1 = Math.max(rectPreview.a.row, rectPreview.b.row);
      ctx.fillStyle = "rgba(200,150,58,0.15)";
      for (let r = r0; r <= r1; r++) {
        for (let c = c0; c <= c1; c++) {
          const d = toDisplay(c, r);
          ctx.fillRect(offset.x + d.col * cellPx, offset.y + d.row * cellPx, cellPx, cellPx);
        }
      }
      ctx.strokeStyle = "rgba(200,150,58,0.6)";
      ctx.lineWidth = 1.5;
      const dA = toDisplay(c0, r0);
      const dB = toDisplay(c1, r1);
      const x0 = Math.min(dA.col, dB.col);
      const y0 = Math.min(dA.row, dB.row);
      const wCells = Math.abs(dB.col - dA.col) + 1;
      const hCells = Math.abs(dB.row - dA.row) + 1;
      ctx.strokeRect(offset.x + x0 * cellPx, offset.y + y0 * cellPx, wCells * cellPx, hCells * cellPx);
    }
  }, [cells, ulam, scale, offset, viewport, showNumbers, hover, highlight, tick, size, rotation, routeA, routeB, routePath, mode, rectPreview]);

  // Mouse events
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number; moved: boolean; button: number } | null>(null);

  const pickCell = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const cellPx = BASE_CELL * scale;
    const c = Math.floor((x - offset.x) / cellPx);
    const r = Math.floor((y - offset.y) / cellPx);
    if (c < 0 || c >= size || r < 0 || r >= size) return null;
    return { col: c, row: r };
  };

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden"
      style={{ touchAction: "none" }}
    >
      <canvas
        ref={canvasRef}
        className="block cursor-crosshair"
        onMouseDown={(e) => {
          dragRef.current = {
            x: e.clientX,
            y: e.clientY,
            ox: offset.x,
            oy: offset.y,
            moved: false,
            button: e.button,
          };
        }}
        onMouseMove={(e) => {
          const d = dragRef.current;
          if (d) {
            const dx = e.clientX - d.x;
            const dy = e.clientY - d.y;
            // Middle-click or shift+left = pan; left-drag also pans if moved > threshold
            if (d.button === 1 || e.shiftKey) {
              setOffset({ x: d.ox + dx, y: d.oy + dy });
              d.moved = true;
              return;
            }
            if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
              setOffset({ x: d.ox + dx, y: d.oy + dy });
              d.moved = true;
              return;
            }
          }
          const cell = pickCell(e.clientX, e.clientY);
          setHover(cell);
          onCellHover?.(cell?.col ?? 0, cell?.row ?? null);
        }}
        onMouseUp={(e) => {
          const d = dragRef.current;
          dragRef.current = null;
          if (!d || d.moved) return;
          if (readOnly) return;
          const cell = pickCell(e.clientX, e.clientY);
          if (cell) {
            const canon = toCanonical(cell.col, cell.row);
            onCellClick(canon.col, canon.row, { button: e.button, shiftKey: e.shiftKey });
          }
        }}
        onMouseLeave={() => {
          dragRef.current = null;
          setHover(null);
          onCellHover?.(0, null);
        }}
        onContextMenu={(e) => e.preventDefault()}
        onWheel={(e) => {
          e.preventDefault();
          const rect = canvasRef.current!.getBoundingClientRect();
          const mx = e.clientX - rect.left;
          const my = e.clientY - rect.top;
          const delta = -e.deltaY * 0.0015;
          const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale * (1 + delta)));
          // Zoom around mouse position
          const k = newScale / scale;
          setOffset({
            x: mx - (mx - offset.x) * k,
            y: my - (my - offset.y) * k,
          });
          setScale(newScale);
        }}
      />
      {/* Hover tooltip */}
      {hover && (
        <div className="pointer-events-none absolute right-3 top-3 rounded-md border border-border bg-card/90 px-3 py-1.5 text-xs font-mono text-muted-foreground backdrop-blur">
          {(() => {
            const canon = toCanonical(hover.col, hover.row);
            const i = canon.row * size + canon.col;
            return (
              <>
                <span className="text-foreground">#{ulam.numbers[i]}</span>
                {ulam.isPrime[i] ? (
                  <span className="ml-2 text-[color:var(--accent-gold)]">prime</span>
                ) : null}
                <span className="ml-2">
                  ({canon.col},{canon.row})
                </span>
              </>
            );
          })()}
        </div>
      )}
      {/* Zoom controls */}
      <div className="absolute bottom-3 right-3 flex flex-col gap-1">
        <button
          className="rounded border border-border bg-card/80 px-2 py-1 text-sm text-foreground hover:bg-card"
          onClick={() => {
            const cx = viewport.w / 2;
            const cy = viewport.h / 2;
            const newScale = Math.min(MAX_SCALE, scale * 1.2);
            const k = newScale / scale;
            setOffset({ x: cx - (cx - offset.x) * k, y: cy - (cy - offset.y) * k });
            setScale(newScale);
          }}
        >
          +
        </button>
        <button
          className="rounded border border-border bg-card/80 px-2 py-1 text-sm text-foreground hover:bg-card"
          onClick={() => {
            const cx = viewport.w / 2;
            const cy = viewport.h / 2;
            const newScale = Math.max(MIN_SCALE, scale * 0.8);
            const k = newScale / scale;
            setOffset({ x: cx - (cx - offset.x) * k, y: cy - (cy - offset.y) * k });
            setScale(newScale);
          }}
        >
          −
        </button>
        <button
          className="rounded border border-border bg-card/80 px-2 py-1 text-[10px] text-foreground hover:bg-card"
          onClick={() => {
            const gridPx = size * BASE_CELL;
            const s = Math.min(viewport.w / gridPx, viewport.h / gridPx) * 0.95;
            const clamped = Math.max(MIN_SCALE, Math.min(MAX_SCALE, s));
            setScale(clamped);
            setOffset({
              x: (viewport.w - gridPx * clamped) / 2,
              y: (viewport.h - gridPx * clamped) / 2,
            });
          }}
        >
          FIT
        </button>
      </div>
    </div>
  );
});