// The shopping list: several recipes at chosen serving counts, merged into one list (brief 6.3).
// Every rule here is exact, and the output must match data/parity.json line for line (brief rule 8).
// The numbers that drive it (to_base, family, whole_units, step) come from the recipe file's `rules`.

import { ONE, ZERO, add, ceilToStep, cmp, div, frac, fromPair, mul, toMixed } from './fraction.js';
import { isHeading, isScalable } from './scale.js';

/** Compare two strings by code point, the way the workspace sorts. Not localeCompare. */
export function compareCodePoints(a, b) {
  const left = Array.from(a);
  const right = Array.from(b);
  const shared = Math.min(left.length, right.length);
  for (let i = 0; i < shared; i++) {
    const diff = left[i].codePointAt(0) - right[i].codePointAt(0);
    if (diff !== 0) return diff;
  }
  return left.length - right.length;
}

const toBase = (rules, unit) => frac(Object.hasOwn(rules.to_base, unit ?? '') ? rules.to_base[unit] : 1);

/** Shopping rounds up: whole units to a whole number, stepped units to the next step, the rest to 1 or more. */
function roundUp(amount, unit, rules) {
  if (rules.whole_units.includes(unit)) return ceilToStep(amount, ONE);
  if (unit !== null && Object.hasOwn(rules.step, unit)) return ceilToStep(amount, fromPair(rules.step[unit]));
  const whole = ceilToStep(amount, ONE);
  return cmp(whole, ONE) < 0 ? ONE : whole;
}

/**
 * Build the list.
 * @param {{id: string, servings: number}[]} items the recipes on the list, in list order
 * @param {Map<string, object>} recipesById
 * @param {object} rules `rules` from the recipe file
 * @returns {{
 *   scaled: {id: string, text: string, titles: string[], parity: string}[],
 *   unscaled: {id: string, text: string, title: string, parity: string}[],
 *   missing: string[],
 * }}
 * `text` is the line with no bullet and no recipe names. `parity` is the line exactly as the workspace
 * prints it. `id` stays the same for a line while its recipes change, so a tick can follow it.
 */
export function buildList(items, recipesById, rules) {
  const groups = new Map();
  const unscaled = [];
  const missing = [];

  for (const item of items) {
    const recipe = recipesById.get(item.id);
    if (!recipe) {
      missing.push(item.id);
      continue;
    }
    const factor = frac(item.servings, recipe.serves);
    const seenText = new Map();
    for (const line of recipe.ingredients) {
      if (isHeading(line)) continue;
      if (!isScalable(line)) {
        const nth = seenText.get(line.text) || 0;
        seenText.set(line.text, nth + 1);
        unscaled.push({
          id: JSON.stringify(['hand', recipe.id, line.text, nth]),
          text: line.text,
          title: recipe.title,
          parity: `- ${line.text} (${recipe.title})`,
        });
        continue;
      }
      const id = JSON.stringify([line.key, line.family, line.size]);
      let group = groups.get(id);
      if (!group) {
        group = { id, key: line.key, size: line.size, name: line.shop_item, total: ZERO, unit: null, hasUnit: false, titles: [] };
        groups.set(id, group);
      }
      group.total = add(group.total, mul(mul(fromPair(line.qty), factor), toBase(rules, line.unit)));
      if (line.unit !== null && (!group.hasUnit || cmp(toBase(rules, line.unit), toBase(rules, group.unit)) > 0)) {
        group.unit = line.unit;
        group.hasUnit = true;
      }
      if (!group.titles.includes(recipe.title)) group.titles.push(recipe.title);
    }
  }

  // Map keeps first-seen order, and Array.prototype.sort is stable, so equal keys stay in that order.
  const scaled = [...groups.values()]
    .sort((a, b) => compareCodePoints(a.key, b.key))
    .map((group) => {
      const amount = roundUp(div(group.total, toBase(rules, group.unit)), group.unit, rules);
      const text = [toMixed(amount), group.size, group.unit, group.name].filter(Boolean).join(' ');
      const titles = [...group.titles].sort(compareCodePoints);
      return { id: group.id, text, titles, parity: `- ${text} (${titles.join(', ')})` };
    });

  return { scaled, unscaled, missing };
}
