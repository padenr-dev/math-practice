// Exact rational arithmetic. Every answer (integer, decimal, fraction) is
// compared as a fraction { num, den } with den > 0, so 0.1 + 0.2 never bites.

export function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a;
}

export function lcm(a, b) {
  return Math.abs(a * b) / gcd(a, b);
}

export function makeFraction(num, den) {
  if (!Number.isInteger(num) || !Number.isInteger(den) || den === 0) {
    throw new Error(`invalid fraction ${num}/${den}`);
  }
  return den < 0 ? { num: -num, den: -den } : { num, den };
}

export function simplifyFraction(f) {
  const g = gcd(f.num, f.den) || 1;
  return makeFraction(f.num / g, f.den / g);
}

export function isSimplest(f) {
  return gcd(f.num, f.den) === 1;
}

export function fractionsEqual(a, b) {
  return a.num * b.den === b.num * a.den;
}

export function addFractions(a, b) {
  return simplifyFraction(makeFraction(a.num * b.den + b.num * a.den, a.den * b.den));
}

// 7/4 -> "1 3/4", 3/4 -> "3/4", 8/4 -> "2". Expects a simplified fraction.
export function formatMixed(f) {
  const sign = f.num < 0 ? '-' : '';
  const n = Math.abs(f.num);
  const whole = Math.floor(n / f.den);
  const rest = n % f.den;
  if (rest === 0) return sign + whole;
  return sign + (whole ? `${whole} ${rest}/${f.den}` : `${rest}/${f.den}`);
}

export function formatFraction(f) {
  return f.den === 1 ? String(f.num) : `${f.num}/${f.den}`;
}

// formatDecimal(367, 2) -> "3.67"; formatDecimal(40, 1) -> "4.0". Keeps trailing zeros.
export function formatDecimal(scaled, places) {
  const sign = scaled < 0 ? '-' : '';
  const digits = String(Math.abs(scaled)).padStart(places + 1, '0');
  if (places === 0) return sign + digits;
  return `${sign}${digits.slice(0, -places)}.${digits.slice(-places)}`;
}
