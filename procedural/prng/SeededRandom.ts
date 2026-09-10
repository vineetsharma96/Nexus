/**
 * Deterministic PRNG (Mulberry32 algorithm)
 * Generates consistent pseudo-random values from a 32-bit seed
 */
export class SeededRandom {
  private s: number;

  constructor(seed: number = 133742) {
    this.s = seed | 0;
  }

  /**
   * Returns a float in [0, 1)
   */
  next(): number {
    let t = (this.s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Returns a float in [min, max)
   */
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /**
   * Returns an integer in [min, max]
   */
  rangeInt(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  /**
   * Random boolean with optional true probability
   */
  boolean(chance: number = 0.5): boolean {
    return this.next() < chance;
  }

  /**
   * Pick a random item from an array
   */
  pick<T>(arr: T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }
}
