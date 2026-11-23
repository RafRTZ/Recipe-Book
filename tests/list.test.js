// The saved shopping list (brief 6.3, and docs/DECISIONS.md kickoff items 6 to 8).

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { indexRecipes } from '../next/app/engine/data.js';
import { buildList } from '../next/app/engine/shop.js';
import {
  clampServings,
  clearTicks,
  dropMissing,
  emptyList,
  isTicked,
  normalizeList,
  pruneTicks,
  remainingLines,
  remainingText,
  removeItem,
  servingsOnList,
  setServings,
  tickedCount,
  toggleTick,
} from '../next/app/engine/list.js';

const data = JSON.parse(readFileSync(new URL('../data/recipes.json', import.meta.url), 'utf8'));
const byId = indexRecipes(data);
const [first, second, third] = data.recipes;
const build = (list) => buildList(list.items, byId, data.rules);

test('adding a recipe puts it on the list; adding it again changes its count and keeps its place', () => {
  let list = emptyList();
  list = setServings(list, first, 4);
  list = setServings(list, second, 2);
  assert.deepEqual(list.items.map((item) => [item.id, item.servings]), [[first.id, 4], [second.id, 2]]);
  list = setServings(list, first, 6);
  assert.deepEqual(list.items.map((item) => [item.id, item.servings]), [[first.id, 6], [second.id, 2]]);
  assert.equal(servingsOnList(list, first.id), 6);
  assert.equal(servingsOnList(list, third.id), null);
  assert.equal(list.items[0].title, first.title);
});

test('servings stay whole and between 1 and 60', () => {
  assert.equal(clampServings(0), 1);
  assert.equal(clampServings(61), 60);
  assert.equal(clampServings(2.6), 3);
  assert.equal(clampServings('abc'), 1);
  assert.equal(setServings(emptyList(), first, 500).items[0].servings, 60);
});

test('removing a recipe takes it off the list', () => {
  let list = setServings(setServings(emptyList(), first, 4), second, 2);
  list = removeItem(list, first.id);
  assert.deepEqual(list.items.map((item) => item.id), [second.id]);
});

test('functions return new lists and leave the old one alone', () => {
  const list = setServings(emptyList(), first, 4);
  const frozen = JSON.stringify(list);
  const line = build(list).scaled[0];
  toggleTick(list, line);
  setServings(list, second, 2);
  removeItem(list, first.id);
  clearTicks(list);
  assert.equal(JSON.stringify(list), frozen);
});

test('a recipe that left the book is dropped, and its title is reported', () => {
  let list = setServings(emptyList(), first, 4);
  list = { ...list, items: [...list.items, { id: 'gone-card', servings: 2, title: 'Gone Card' }] };
  const result = dropMissing(list, byId);
  assert.deepEqual(result.dropped, ['Gone Card']);
  assert.deepEqual(result.list.items.map((item) => item.id), [first.id]);
  assert.deepEqual(dropMissing(result.list, byId).dropped, []);
});

test('dropMissing refreshes a saved title that changed in the book', () => {
  const list = { items: [{ id: first.id, servings: 4, title: 'Old Name' }], ticks: {} };
  assert.equal(dropMissing(list, byId).list.items[0].title, first.title);
});

test('ticking a line, and unticking it', () => {
  let list = setServings(emptyList(), first, first.serves);
  const built = build(list);
  const line = built.scaled[0];
  assert.equal(isTicked(list, line), false);
  list = toggleTick(list, line);
  assert.equal(isTicked(list, line), true);
  assert.equal(tickedCount(list, built), 1);
  list = toggleTick(list, line);
  assert.equal(isTicked(list, line), false);
});

test('a tick clears when the amount on its line changes (kickoff item 7)', () => {
  let list = setServings(emptyList(), first, first.serves);
  const before = build(list);
  for (const line of before.scaled) list = toggleTick(list, line);
  assert.equal(tickedCount(list, before), before.scaled.length);

  list = setServings(list, first, first.serves * 3);
  const after = build(list);
  const changed = after.scaled.filter((line, i) => line.text !== before.scaled[i].text);
  assert.ok(changed.length > 0, 'tripling the servings changes some amounts');
  for (const line of changed) assert.equal(isTicked(list, line), false, line.text);

  // After pruning, going back to the old count does not bring the old ticks back.
  list = pruneTicks(list, after);
  list = setServings(list, first, first.serves);
  const again = build(list);
  const stillTicked = again.scaled.filter((line) => isTicked(list, line)).map((line) => line.text);
  const unchangedTexts = after.scaled.filter((line, i) => line.text === before.scaled[i].text).map((line) => line.text);
  assert.deepEqual(stillTicked, unchangedTexts);
});

test('a tick stays when another recipe is added that does not touch its line', () => {
  let list = setServings(emptyList(), first, first.serves);
  const before = build(list);
  const line = before.scaled[0];
  list = toggleTick(list, line);
  list = setServings(list, second, second.serves);
  const after = build(list);
  const same = after.scaled.find((entry) => entry.id === line.id);
  assert.equal(isTicked(list, same), same.text === line.text);
});

test('"Clear checked" unticks every box and keeps the recipes (kickoff item 6)', () => {
  let list = setServings(emptyList(), first, 4);
  const built = build(list);
  for (const line of [...built.scaled, ...built.unscaled]) list = toggleTick(list, line);
  list = clearTicks(list);
  assert.equal(tickedCount(list, built), 0);
  assert.equal(list.items.length, 1);
});

test('Copy and Share send the unticked lines: merged first, then by hand, no bullets, no recipe names (kickoff item 8)', () => {
  const withHand = data.recipes.find((recipe) => recipe.ingredients.some((line) => 'text' in line && !('qty' in line)));
  let list = setServings(emptyList(), withHand, withHand.serves);
  const built = build(list);
  assert.ok(built.unscaled.length > 0);
  assert.deepEqual(remainingLines(list, built), [...built.scaled.map((l) => l.text), ...built.unscaled.map((l) => l.text)]);
  list = toggleTick(list, built.scaled[0]);
  list = toggleTick(list, built.unscaled[0]);
  const lines = remainingLines(list, built);
  assert.equal(lines.length, built.scaled.length + built.unscaled.length - 2);
  assert.ok(!lines.includes(built.scaled[0].text) || built.scaled.filter((l) => l.text === built.scaled[0].text).length > 1);
  const text = remainingText(list, built);
  assert.equal(text.split('\n').length, lines.length);
  assert.doesNotMatch(text, /^- /m);
  assert.ok(!text.includes(`(${withHand.title})`));
});

test('whatever storage hands back becomes a usable list', () => {
  assert.deepEqual(normalizeList(null), emptyList());
  assert.deepEqual(normalizeList('nonsense'), emptyList());
  assert.deepEqual(normalizeList({ items: 'x', ticks: [] }), emptyList());
  const messy = {
    items: [
      { id: 'a', servings: 4, title: 'A' },
      { id: 'a', servings: 9, title: 'A again' },
      { id: '', servings: 2 },
      null,
      { id: 'b', servings: 999 },
      { servings: 3 },
    ],
    ticks: { one: 'text', two: 5 },
    extra: true,
  };
  assert.deepEqual(normalizeList(messy), {
    items: [
      { id: 'a', servings: 4, title: 'A' },
      { id: 'b', servings: 60, title: 'b' },
    ],
    ticks: { one: 'text' },
  });
});
