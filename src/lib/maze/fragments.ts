import type { UlamData } from "./ulam";

// Pick N primes spread evenly across the grid using farthest-point sampling.
export function suggestFragmentCells(
  ulam: UlamData,
  count: number,
): { col: number; row: number }[] {
  if (count <= 0 || ulam.primes.length === 0) return [];
  const primes = ulam.primes;
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