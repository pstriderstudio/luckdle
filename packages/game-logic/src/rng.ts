/**
 * Random number sources. Official outcomes use {@link secureRng} (Web Crypto,
 * available in Deno, browsers, and Node). Tests use {@link seededRng}.
 */
export interface Rng {
  /** Uniform integer in [0, maxExclusive). */
  int(maxExclusive: number): number;
  /** Uniform float in [0, 1). */
  float(): number;
}

const UINT32 = 2 ** 32;

function fromUint32(next: () => number): Rng {
  return {
    int(maxExclusive) {
      if (!Number.isInteger(maxExclusive) || maxExclusive < 1 || maxExclusive > UINT32) {
        throw new RangeError(`maxExclusive must be an integer in [1, 2^32], got ${maxExclusive}`);
      }
      // Rejection sampling removes modulo bias.
      const limit = UINT32 - (UINT32 % maxExclusive);
      let x: number;
      do x = next();
      while (x >= limit);
      return x % maxExclusive;
    },
    float() {
      // 53 random bits.
      const hi = next() >>> 5;
      const lo = next() >>> 6;
      return (hi * 67108864 + lo) / 9007199254740992;
    },
  };
}

/** Cryptographically secure RNG backed by crypto.getRandomValues. */
export function secureRng(): Rng {
  const buffer = new Uint32Array(64);
  let index = buffer.length;
  return fromUint32(() => {
    if (index >= buffer.length) {
      crypto.getRandomValues(buffer);
      index = 0;
    }
    return buffer[index++];
  });
}

/** Deterministic RNG (sfc32) for tests and simulations. Never use for official outcomes. */
export function seededRng(seed: number): Rng {
  let a = 0x9e3779b9;
  let b = 0x243f6a88;
  let c = 0xb7e15162;
  let d = seed >>> 0;
  const next = () => {
    a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
    const t = (a + b) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    d = (d + 1) | 0;
    const r = (t + d) | 0;
    c = (c + r) | 0;
    return r >>> 0;
  };
  for (let i = 0; i < 15; i++) next();
  return fromUint32(next);
}

/**
 * Picks an index from integer weights (e.g. per-mille odds), exactly.
 * Weights must be non-negative integers with a positive sum.
 */
export function pickWeighted(rng: Rng, weights: readonly number[]): number {
  const total = weights.reduce((s, w) => s + w, 0);
  let r = rng.int(total);
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r < 0) return i;
  }
  throw new Error('unreachable');
}

/** Uniformly picks one element. */
export function pickOne<T>(rng: Rng, items: readonly T[]): T {
  if (items.length === 0) throw new Error('Cannot pick from an empty list');
  return items[rng.int(items.length)];
}
