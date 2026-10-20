import type { UlamData } from "./ulam";
import type { CellState } from "./types";

export interface FragmentEntry { prime: number; col: number; row: number }

export function formatPrime(n: number): string { return String(n).padStart(5, "0"); }

export function isPrimeNumber(n: number): boolean {
  if (!Number.isSafeInteger(n) || n < 2) return false;
  if (n % 2 === 0) return n === 2;
  for (let divisor = 3; divisor <= Math.sqrt(n); divisor += 2) {
    if (n % divisor === 0) return false;
  }
  return true;
}

export function draftFragments(cells: CellState[], ulam: UlamData): FragmentEntry[] {
  return cells.flatMap((cell, i) => cell.type === "FRAGMENT"
    ? [{ prime: ulam.numbers[i], col: i % ulam.size, row: Math.floor(i / ulam.size) }]
    : []).sort((a, b) => a.prime - b.prime);
}

export function fragmentSummary(entries: FragmentEntry[]) {
  const middleIndex = entries.length % 2 === 1 ? Math.floor(entries.length / 2) : -1;
  const code = entries.length >= 3 && middleIndex >= 0
    ? formatPrime(entries.reduce((sum, entry, i) => sum + (i === middleIndex ? 0 : entry.prime), 0)) : "";
  const warnings: string[] = [];
  if (entries.length > 0 && entries.length % 2 === 0) warnings.push("The code rule needs an odd number of primes");
  const seen = new Set<number>();
  for (const { prime } of entries) {
    if (!isPrimeNumber(prime)) warnings.push(`${prime} is not prime`);
    if (prime >= 100000 && isPrimeNumber(prime) && !warnings.includes("Found numbers show in 5 digits, keep primes below 100000")) warnings.push("Found numbers show in 5 digits, keep primes below 100000");
    if (seen.has(prime)) warnings.push(`Duplicate prime ${prime}`);
    seen.add(prime);
  }
  return { middleIndex, code, warnings };
}

// Pick N primes spread evenly across the grid using farthest-point sampling.
// If a reachability mask is supplied, only primes on reachable (non-wall,
// connected) cells are considered.
export function suggestFragmentCells(
  ulam: UlamData,
  count: number,
  reachable?: Uint8Array,
): { col: number; row: number }[] {
  if (count <= 0 || ulam.primes.length === 0) return [];
  const size = ulam.size;
  const primes = reachable
    ? ulam.primes.filter((p) => reachable[p.row * size + p.col] === 1)
    : ulam.primes;
  if (primes.length === 0) return [];
  const target = Math.min(count, primes.length);

  // Start with prime closest to center.
  const center = (ulam.size - 1) / 2;
  let bestIdx = 0;
  let bestDist = Infinity;
  for (let i = 0; i < primes.length; i++) {
    const dx = primes[i].col - center;
    const dy = primes[i].row - center;
    const d = dx * dx + dy * dy;
    if (d < bestDist) {
      bestDist = d;
      bestIdx = i;
    }
  }

  const picked: number[] = [bestIdx];
  const pickedSet = new Set<number>([bestIdx]);

  // Distances to nearest picked
  const dists = new Float64Array(primes.length);
  for (let i = 0; i < primes.length; i++) {
    const dx = primes[i].col - primes[bestIdx].col;
    const dy = primes[i].row - primes[bestIdx].row;
    dists[i] = dx * dx + dy * dy;
  }

  while (picked.length < target) {
    let farIdx = -1;
    let farD = -1;
    for (let i = 0; i < primes.length; i++) {
      if (pickedSet.has(i)) continue;
      if (dists[i] > farD) {
        farD = dists[i];
        farIdx = i;
      }
    }
    if (farIdx === -1) break;
    picked.push(farIdx);
    pickedSet.add(farIdx);
    for (let i = 0; i < primes.length; i++) {
      const dx = primes[i].col - primes[farIdx].col;
      const dy = primes[i].row - primes[farIdx].row;
      const d = dx * dx + dy * dy;
      if (d < dists[i]) dists[i] = d;
    }
  }

  return picked.map((i) => ({ col: primes[i].col, row: primes[i].row }));
}