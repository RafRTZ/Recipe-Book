// Exact fractions (brief rule 8): no floating point anywhere in the quantities.

import test from 'node:test';
import assert from 'node:assert/strict';
import { ONE, ZERO, add, ceilToStep, cmp, div, eq, frac, fromPair, isWhole, mul, roundToStep, toDecimal, toMixed } from '../next/app/engine/fraction.js';

test('fractions are kept in lowest terms with a positive denominator', () => {
  assert.deepEqual(frac(2, 4), frac(1, 2));
  assert.deepEqual(frac(3, -6), frac(-1, 2));
  assert.equal(frac(6, 3).n, 2n);
  assert.equal(frac(6, 3).d, 1n);
  assert.throws(() => frac(1, 0));
});

test('fromPair reads the recipe file form and refuses anything else', () => {
  assert.deepEqual(fromPair([3, 2]), frac(3, 2));
  assert.throws(() => fromPair([1.5, 1]));
  assert.throws(() => fromPair([1]));
  assert.throws(() => fromPair('1/2'));
});

test('a third of a cup three times is exactly one cup', () => {
  const third = frac(1, 3);
  assert.ok(eq(add(add(third, third), third), ONE));
  assert.ok(eq(mul(frac(2, 3), frac(3, 2)), ONE));
  assert.ok(eq(div(frac(1, 2), frac(1, 4)), frac(2)));
  assert.ok(eq(add(ZERO, frac(5, 7)), frac(5, 7)));
});

test('compare and isWhole', () => {
  assert.ok(cmp(frac(1, 3), frac(1, 2)) < 0);
  assert.ok(cmp(frac(2, 4), frac(1, 2)) === 0);
  assert.ok(cmp(frac(7, 8), frac(3, 4)) > 0);
  assert.ok(isWhole(frac(4, 2)));
  assert.ok(!isWhole(frac(1, 2)));
});

test('ceilToStep goes up to the next step and leaves an exact step alone', () => {
  assert.ok(eq(ceilToStep(frac(9, 10), frac(1, 8)), ONE));
  assert.ok(eq(ceilToStep(frac(1, 2), frac(1, 4)), frac(1, 2)));
  assert.ok(eq(ceilToStep(frac(1, 100), ONE), ONE));
  assert.ok(eq(ceilToStep(frac(5, 2), ONE), frac(3)));
  assert.ok(eq(ceilToStep(ZERO, ONE), ZERO));
});

test('roundToStep goes to the nearest step, and a half goes up', () => {
  assert.ok(eq(roundToStep(frac(29, 2), ONE), frac(15)), '14.5 oz reads 15');
  assert.ok(eq(roundToStep(frac(9, 10), frac(1, 8)), frac(7, 8)));
  assert.ok(eq(roundToStep(frac(3, 20), frac(1, 8)), frac(1, 8)));
  assert.ok(eq(roundToStep(frac(6, 5), frac(1, 4)), frac(5, 4)));
  assert.ok(eq(roundToStep(frac(1, 16), frac(1, 8)), frac(1, 8)), 'exactly half a step goes up');
  assert.ok(eq(roundToStep(frac(1, 20), frac(1, 8)), ZERO), 'under half a step goes to zero; the caller applies the floor');
});

test('mixed numbers', () => {
  assert.equal(toMixed(frac(5, 4)), '1 1/4');
  assert.equal(toMixed(frac(1, 2)), '1/2');
  assert.equal(toMixed(frac(7, 8)), '7/8');
  assert.equal(toMixed(frac(15)), '15');
  assert.equal(toMixed(ZERO), '0');
});

test('decimals are exact, and a fraction with no exact decimal stays a fraction', () => {
  assert.equal(toDecimal(frac(15, 2)), '7.5');
  assert.equal(toDecimal(frac(153)), '153');
  assert.equal(toDecimal(frac(1, 4)), '0.25');
  assert.equal(toDecimal(frac(21, 20)), '1.05');
  assert.equal(toDecimal(frac(1, 3)), '1/3');
});

test('large sums stay exact, where ordinary numbers would lose digits', () => {
  // 1/3 + 1/7 + 1/11 + ... over many odd denominators: the common denominator passes 2^53.
  const denominators = [3, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53];
  let sum = ZERO;
  for (const d of denominators) sum = add(sum, frac(1, d));
  assert.ok(sum.d > 2n ** 53n);
  let back = sum;
  for (const d of denominators) back = add(back, frac(-1, d));
  assert.ok(eq(back, ZERO));
});
