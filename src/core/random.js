// Seeded random numbers so generated questions are repeatable in tests.
// An rng is a function returning a float in [0, 1), like Math.random.

// mulberry32: small, fast, good enough for picking practice numbers.
export function createRng(seed) {
  let state = seed >>> 0;
  return function rng() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Whole number from min to max, inclusive.
export function randInt(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

export function randPick(rng, items) {
  return items[Math.floor(rng() * items.length)];
}
