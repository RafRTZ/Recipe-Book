// The saved shopping list: which recipes are on it, at how many servings, and which lines are ticked.
// Plain data in, plain data out. Storing it is the platform's job; drawing it is the screen's.
//
// Shape: { items: [{ id, servings, title }], ticks: { [lineId]: lineText } }
// A tick remembers the line as it was printed. If the amount on that line changes, the texts no longer
// match and the tick does not count (docs/DECISIONS.md, kickoff item 7).

import { SERVINGS_MAX, SERVINGS_MIN } from './constants.js';

export const emptyList = () => ({ items: [], ticks: {} });

export function clampServings(value) {
  const whole = Math.round(Number(value));
  if (!Number.isFinite(whole)) return SERVINGS_MIN;
  return Math.min(SERVINGS_MAX, Math.max(SERVINGS_MIN, whole));
}

/** Whatever was read from storage, made safe to use. Unknown or damaged content becomes an empty list. */
export function normalizeList(raw) {
  const list = emptyList();
  if (!raw || typeof raw !== 'object') return list;
  const seen = new Set();
  for (const item of Array.isArray(raw.items) ? raw.items : []) {
    if (!item || typeof item.id !== 'string' || !item.id || seen.has(item.id)) continue;
    seen.add(item.id);
    list.items.push({
      id: item.id,
      servings: clampServings(item.servings),
      title: typeof item.title === 'string' ? item.title : item.id,
    });
  }
  if (raw.ticks && typeof raw.ticks === 'object' && !Array.isArray(raw.ticks)) {
    for (const [id, text] of Object.entries(raw.ticks)) {
      if (typeof text === 'string') list.ticks[id] = text;
    }
  }
  return list;
}

/** The serving count a recipe is on the list for, or null when it is not on the list. */
export function servingsOnList(list, id) {
  const item = list.items.find((entry) => entry.id === id);
  return item ? item.servings : null;
}

/** Add a recipe, or change its count if it is already there. It keeps its place in the list. */
export function setServings(list, recipe, servings) {
  const entry = { id: recipe.id, servings: clampServings(servings), title: recipe.title };
  const at = list.items.findIndex((item) => item.id === recipe.id);
  const items = at === -1 ? [...list.items, entry] : list.items.map((item, i) => (i === at ? entry : item));
  return { ...list, items };
}

export function removeItem(list, id) {
  return { ...list, items: list.items.filter((item) => item.id !== id) };
}

/**
 * Drop entries whose recipe is no longer in the book, and refresh the saved titles.
 * @returns {{ list: object, dropped: string[] }} `dropped` holds the titles that were removed.
 */
export function dropMissing(list, recipesById) {
  const dropped = [];
  const items = [];
  for (const item of list.items) {
    const recipe = recipesById.get(item.id);
    if (!recipe) dropped.push(item.title);
    else items.push({ ...item, title: recipe.title });
  }
  return { list: { ...list, items }, dropped };
}

export const isTicked = (list, line) => list.ticks[line.id] === line.text;

export function toggleTick(list, line) {
  const ticks = { ...list.ticks };
  if (isTicked(list, line)) delete ticks[line.id];
  else ticks[line.id] = line.text;
  return { ...list, ticks };
}

export const clearTicks = (list) => ({ ...list, ticks: {} });

/** Every line of a built list (shop.js), merged lines first, then the ones to check by hand. */
export const allLines = (built) => [...built.scaled, ...built.unscaled];

/** Forget ticks whose line is gone or whose amount has changed, so they cannot come back later. */
export function pruneTicks(list, built) {
  const ticks = {};
  for (const line of allLines(built)) {
    if (isTicked(list, line)) ticks[line.id] = line.text;
  }
  return { ...list, ticks };
}

export const tickedCount = (list, built) => allLines(built).filter((line) => isTicked(list, line)).length;

/** The lines still to get, as Copy and Share send them: one per line, no bullets, no recipe names. */
export function remainingLines(list, built) {
  return allLines(built)
    .filter((line) => !isTicked(list, line))
    .map((line) => line.text);
}

export const remainingText = (list, built) => remainingLines(list, built).join('\n');
