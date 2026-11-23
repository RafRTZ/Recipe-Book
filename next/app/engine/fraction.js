// Exact fractions. A fraction is a frozen pair { n, d } of BigInt with d > 0 and no common factor.
// Nothing here uses floating point, so "1/3 cup three times" is exactly 1 cup (brief rule 8).

function gcd(a, b) {
  let x = a < 0n ? -a : a;
  let y = b < 0n ? -b : b;
  while (y) [x, y] = [y, x % y];
  return x;
}

/** A fraction from whole numbers. frac(3, 4) is three quarters. */
export function frac(n, d = 1) {
  let num = BigInt(n);
  let den = BigInt(d);
  if (den === 0n) throw new Error('A fraction cannot have a zero denominator');
  if (den < 0n) {
    num = -num;
    den = -den;
  }
  const g = gcd(num, den) || 1n;
  return Object.freeze({ n: num / g, d: den / g });
}

/** A fraction from the [numerator, denominator] pairs the recipe file uses. */
export function fromPair(pair) {
  if (!Array.isArray(pair) || pair.length !== 2) throw new Error('Expected [numerator, denominator]');
  if (!Number.isInteger(pair[0]) || !Number.isInteger(pair[1])) throw new Error('A quantity must be two whole numbers');
  return frac(pair[0], pair[1]);
}

export const ZERO = frac(0);
export const ONE = frac(1);

export const add = (a, b) => frac(a.n * b.d + b.n * a.d, a.d * b.d);
export const mul = (a, b) => frac(a.n * b.n, a.d * b.d);
export const div = (a, b) => frac(a.n * b.d, a.d * b.n);

/** Negative, zero, or positive, like a sort comparator. */
export function cmp(a, b) {
  const left = a.n * b.d;
  const right = b.n * a.d;
  return left < right ? -1 : left > right ? 1 : 0;
}

export const eq = (a, b) => a.n === b.n && a.d === b.d;
export const isWhole = (a) => a.d === 1n;

/** The smallest multiple of step that is not below x. */
export function ceilToStep(x, step) {
  const q = div(x, step);
  const whole = (q.n + q.d - 1n) / q.d;
  return mul(frac(whole), step);
}

/** The multiple of step nearest to x. A value exactly halfway goes up. */
export function roundToStep(x, step) {
  const q = div(x, step);
  const whole = (2n * q.n + q.d) / (2n * q.d);
  return mul(frac(whole), step);
}

/** "1 1/4", "3/4", "2". The way a cook writes an amount. */
export function toMixed(x) {
  const whole = x.n / x.d;
  const rest = x.n % x.d;
  if (rest === 0n) return String(whole);
  return `${whole ? `${whole} ` : ''}${rest}/${x.d}`;
}

/**
 * A decimal with the fewest digits that say it exactly, such as "7.5". Only for fractions whose
 * denominator divides a power of ten; anything else falls back to the mixed number.
 */
export function toDecimal(x) {
  if (x.d === 1n) return String(x.n);
  let scale = 1n;
  for (let digits = 1; digits <= 6; digits++) {
    scale *= 10n;
    if ((x.n * scale) % x.d === 0n) {
      const scaled = (x.n * scale) / x.d;
      const whole = scaled / scale;
      const rest = String(scaled % scale).padStart(digits, '0');
      return `${whole}.${rest}`;
    }
  }
  return toMixed(x);
}
