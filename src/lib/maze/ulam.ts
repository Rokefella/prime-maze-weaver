// Ulam spiral utilities.
// Cell numbered 1 is at the center. From 1, step right to 2, then up to 3,
// left to 4, left to 5, down to 6, down to 7, right x3, up x3, left x4, ...
// This is the standard counter-clockwise Ulam spiral (with mathematical y-up).
// In screen coordinates (y grows downward), "up" => row - 1.

export function spiralCenter(size: number): { col: number; row: number } {
  // Standard convention: center at floor((size-1)/2) for both axes.
  const c = Math.floor((size - 1) / 2);
  return { col: c, row: c };
}

/**
 * Returns a Uint32Array of length size*size where arr[row*size+col] = ulam number (>=1).
 * Cells not visited (shouldn't happen for square spiral starting centered) remain 0.
 */
export function buildUlamGrid(size: number): Uint32Array {
  const grid = new Uint32Array(size * size);
  const { col: cx, row: cy } = spiralCenter(size);
  let col = cx;
  let row = cy;
  let n = 1;
  const set = (c: number, r: number, v: number) => {
    if (c >= 0 && c < size && r >= 0 && r < size) grid[r * size + c] = v;
  };
  set(col, row, n);

  // Directions: right, up, left, down (CCW in screen coords up = row-1)
  const dirs = [
    [1, 0], // right
    [0, -1], // up
    [-1, 0], // left
    [0, 1], // down
  ];
  let dirIdx = 0;
  let stepLen = 1;

  while (n < size * size) {
    for (let twice = 0; twice < 2; twice++) {
      const [dc, dr] = dirs[dirIdx];
      for (let s = 0; s < stepLen; s++) {
        col += dc;
        row += dr;
        n += 1;
        set(col, row, n);
        if (n >= size * size) return grid;
      }
      dirIdx = (dirIdx + 1) % 4;
    }
    stepLen += 1;
  }
  return grid;
}

export function buildPrimeMask(maxN: number): Uint8Array {
  // Sieve of Eratosthenes -> Uint8Array length maxN+1 (1 if prime).
  const m = new Uint8Array(maxN + 1);
  if (maxN >= 2) m[2] = 1;
  for (let i = 3; i <= maxN; i += 2) m[i] = 1;
  for (let i = 3; i * i <= maxN; i += 2) {
    if (m[i]) {
      for (let j = i * i; j <= maxN; j += 2 * i) m[j] = 0;
    }
  }
  return m;
}

export interface UlamData {
  size: number;
  numbers: Uint32Array; // index = row*size+col -> ulam n
  isPrime: Uint8Array; // index = row*size+col -> 1 if prime
  primes: { n: number; col: number; row: number }[]; // sorted by n
}

export function buildUlamData(size: number): UlamData {
  const numbers = buildUlamGrid(size);
  const total = size * size;
  const primeMask = buildPrimeMask(total);
  const isPrime = new Uint8Array(total);
  const primes: { n: number; col: number; row: number }[] = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const idx = r * size + c;
      const n = numbers[idx];
      if (n >= 2 && primeMask[n]) {
        isPrime[idx] = 1;
      }
    }
  }
  // Build primes ordered by n for the reference panel.
  const lookup = new Map<number, { col: number; row: number }>();
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const n = numbers[r * size + c];
      lookup.set(n, { col: c, row: r });
    }
  }
  for (let n = 2; n <= total; n++) {
    if (primeMask[n]) {
      const p = lookup.get(n);
      if (p) primes.push({ n, col: p.col, row: p.row });
    }
  }
  return { size, numbers, isPrime, primes };
}