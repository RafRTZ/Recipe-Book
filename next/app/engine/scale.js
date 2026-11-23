// The cook view: one recipe's ingredient lines at a chosen number of servings (brief 6.2).
// For reading while cooking, so amounts round to the nearest handy step. Shopping (shop.js) rounds up.

import {
  COOK_STEP,
  COOK_STEP_OTHER,
  COOK_STEP_WHOLE_UNIT,
  METRIC_SMALL_BELOW,
  METRIC_SMALL_STEP,
  METRIC_STEP,
  METRIC_UNITS,
  UNIT_WORDS,
} from './constants.js';
import { ONE, cmp, eq, frac, fromPair, mul, roundToStep, toDecimal, toMixed } from './fraction.js';

const SINGULAR = new Map(UNIT_WORDS.map(([one, many]) => [one, [one, many]]));
const PLURAL = new Map(UNIT_WORDS.map(([one, many]) => [many, [one, many]]));

export const isHeading = (line) => typeof line.heading === 'string';
export const isScalable = (line) => Array.isArray(line.qty);

/** True when the picker is away from the card's own count, so amounts are worked out, not as written. */
export const isScaled = (recipe, servings) => servings !== recipe.serves;

/** The rounding step for a unit. `exact` is the scaled amount before rounding. */
export function cookStep(unit, exact, rules) {
  if (COOK_STEP[unit]) return fromPair(COOK_STEP[unit]);
  if (METRIC_UNITS.includes(unit)) {
    return fromPair(cmp(exact, frac(METRIC_SMALL_BELOW)) < 0 ? METRIC_SMALL_STEP : METRIC_STEP);
  }
  if (rules.whole_units.includes(unit)) return fromPair(COOK_STEP_WHOLE_UNIT);
  return fromPair(COOK_STEP_OTHER);
}

/** One amount scaled by `factor` and rounded for the cook view. Never less than one step. */
export function cookAmount(unit, pair, factor, rules) {
  const exact = mul(fromPair(pair), factor);
  const step = cookStep(unit, exact, rules);
  const rounded = roundToStep(exact, step);
  return cmp(rounded, step) < 0 ? step : rounded;
}

/** Grams and millilitres print as decimals ("7.5"); everything else as a mixed number ("1 1/4"). */
export function formatCookAmount(unit, amount) {
  return METRIC_UNITS.includes(unit) ? toDecimal(amount) : toMixed(amount);
}

/** "cup" or "cups" to suit the amount. A unit that is not a known word comes back unchanged. */
export function unitWord(unitText, amount) {
  const pair = SINGULAR.get(unitText) || PLURAL.get(unitText);
  if (!pair) return unitText;
  return cmp(amount, ONE) > 0 ? pair[1] : pair[0];
}

/** The text of one ingredient line at `servings`. At the card's own count it is the line as written. */
export function cookLine(recipe, line, servings, rules) {
  if (!isScalable(line) || !isScaled(recipe, servings)) return line.text;
  const factor = frac(servings, recipe.serves);
  const high = cookAmount(line.unit, line.qty, factor, rules);
  let amount = formatCookAmount(line.unit, high);
  if (line.qty_low) {
    const low = cookAmount(line.unit, line.qty_low, factor, rules);
    if (!eq(low, high)) amount = `${formatCookAmount(line.unit, low)} to ${amount}`;
  }
  return [amount, line.size, unitWord(line.unit_text, high), line.item_scaled].filter(Boolean).join(' ');
}

/**
 * Every ingredient entry of a recipe, ready to show:
 * { kind: 'heading' | 'line', text, changed } where `changed` marks a line whose amount was worked out.
 */
export function cookIngredients(recipe, servings, rules) {
  const scaled = isScaled(recipe, servings);
  return recipe.ingredients.map((line) => {
    if (isHeading(line)) return { kind: 'heading', text: line.heading, changed: false };
    return { kind: 'line', text: cookLine(recipe, line, servings, rules), changed: scaled && isScalable(line) };
  });
}
