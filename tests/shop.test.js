// The shopping list (brief 6.3 and rule 8). Every case in data/parity.json must come out as exactly the
// same strings the workspace prints. If one differs, the code is wrong or the brief is ambiguous:
// stop and say which. Never change the data files to make this pass (brief rule 3).

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { indexRecipes } from '../next/app/engine/data.js';
import { buildList, compareCodePoints } from '../next/app/engine/shop.js';

const data = JSON.parse(readFileSync(new URL('../data/recipes.json', import.meta.url), 'utf8'));
const parity = JSON.parse(readFileSync(new URL('../data/parity.json', import.meta.url), 'utf8'));
const byId = indexRecipes(data);

test('the parity file belongs to this recipe file', () => {
  assert.equal(parity.schema, data.schema);
  assert.equal(parity.version, data.version, 'recipes.json and parity.json come from different exports');
  assert.ok(parity.cases.length >= data.recipes.length, 'at least one case per card');
});

test('every card appears in at least one parity case', () => {
  const covered = new Set(parity.cases.flatMap((entry) => entry.items.map((item) => item.id)));
  for (const recipe of data.recipes) assert.ok(covered.has(recipe.id), recipe.id);
});

test(`all ${parity.cases.length} parity cases match line for line`, () => {
  const failures = [];
  for (const entry of parity.cases) {
    const built = buildList(entry.items, byId, data.rules);
    const got = { scaled: built.scaled.map((line) => line.parity), unscaled: built.unscaled.map((line) => line.parity) };
    for (const part of ['scaled', 'unscaled']) {
      const want = entry[part];
      const length = Math.max(want.length, got[part].length);
      for (let i = 0; i < length; i++) {
        if (want[i] !== got[part][i]) failures.push(`${entry.name} [${part} line ${i + 1}]\n    want: ${want[i]}\n    got:  ${got[part][i]}`);
      }
    }
    assert.deepEqual(built.missing, [], entry.name);
  }
  assert.equal(failures.length, 0, `${failures.length} lines differ. First few:\n${failures.slice(0, 8).join('\n')}`);
});

test('a line is its parity string without the bullet and the recipe names', () => {
  const entry = parity.cases.find((c) => c.items.length === 2);
  const built = buildList(entry.items, byId, data.rules);
  for (const line of built.scaled) assert.equal(line.parity, `- ${line.text} (${line.titles.join(', ')})`);
  for (const line of built.unscaled) assert.equal(line.parity, `- ${line.text} (${line.title})`);
});

test('line ids are unique, and a merged line keeps its id when servings change', () => {
  const everyCard = data.recipes.map((recipe) => ({ id: recipe.id, servings: recipe.serves }));
  const built = buildList(everyCard, byId, data.rules);
  const ids = [...built.scaled, ...built.unscaled].map((line) => line.id);
  assert.equal(new Set(ids).size, ids.length);
  const doubled = buildList(everyCard.map((item) => ({ ...item, servings: item.servings * 2 })), byId, data.rules);
  assert.deepEqual(doubled.scaled.map((line) => line.id), built.scaled.map((line) => line.id));
  assert.notDeepEqual(doubled.scaled.map((line) => line.text), built.scaled.map((line) => line.text));
});

test('an id that is not in the book is reported, not guessed at', () => {
  const built = buildList([{ id: 'no-such-card', servings: 4 }, { id: data.recipes[0].id, servings: 2 }], byId, data.rules);
  assert.deepEqual(built.missing, ['no-such-card']);
  assert.ok(built.scaled.length > 0);
});

test('an empty list builds to nothing', () => {
  assert.deepEqual(buildList([], byId, data.rules), { scaled: [], unscaled: [], missing: [] });
});

// Small made-up cards, so each rule of brief 6.3 is pinned down on its own.
const rules = {
  to_base: { tsp: 1, Tbsp: 3, cup: 48, oz: 1, lb: 16 },
  whole_units: ['can', 'clove', null],
  step: { tsp: [1, 8], Tbsp: [1, 2], cup: [1, 4], lb: [1, 4], pinch: [1, 1] },
};
const line = (qty, unit, key, over = {}) => ({
  text: 'as written',
  qty,
  unit,
  unit_text: unit || '',
  item: key,
  item_scaled: key,
  size: '',
  key,
  family: unit in { tsp: 1, Tbsp: 1, cup: 1 } ? 'vol' : unit in { oz: 1, lb: 1 } ? 'wt' : unit,
  shop_item: key,
  ...over,
});
const book = (...recipes) => new Map(recipes.map((recipe) => [recipe.id, recipe]));
const card = (id, serves, ...ingredients) => ({ id, title: id.toUpperCase(), serves, ingredients });
const texts = (built) => built.scaled.map((entry) => entry.parity);

test('volumes merge across units, print in the largest unit seen, and round up to its step', () => {
  const a = card('a', 4, line([1, 1], 'tsp', 'salt'), line([1, 1], 'cup', 'flour'));
  const b = card('b', 4, line([1, 1], 'Tbsp', 'salt'), line([2, 1], 'Tbsp', 'flour'));
  const built = buildList([{ id: 'a', servings: 4 }, { id: 'b', servings: 4 }], book(a, b), rules);
  // flour: 48 + 6 = 54 tsp = 1 1/8 cup, up to 1 1/4. salt: 1 + 3 = 4 tsp = 1 1/3 Tbsp, up to 1 1/2.
  assert.deepEqual(texts(built), ['- 1 1/4 cup flour (A, B)', '- 1 1/2 Tbsp salt (A, B)']);
});

test('the factor is servings over serves, exactly', () => {
  const a = card('a', 3, line([1, 1], 'cup', 'rice'));
  assert.deepEqual(texts(buildList([{ id: 'a', servings: 1 }], book(a), rules)), ['- 1/2 cup rice (A)'], '1/3 cup goes up to 1/2');
  assert.deepEqual(texts(buildList([{ id: 'a', servings: 9 }], book(a), rules)), ['- 3 cup rice (A)']);
});

test('whole units and unit-less lines round up to whole numbers', () => {
  const a = card('a', 4, line([1, 1], 'can', 'beans'), line([3, 1], null, 'egg'), line([1, 1], 'clove', 'garlic'));
  assert.deepEqual(texts(buildList([{ id: 'a', servings: 5 }], book(a), rules)), ['- 2 can beans (A)', '- 4 egg (A)', '- 2 clove garlic (A)']);
});

test('weights merge in ounces and print in pounds when a pound was seen', () => {
  const a = card('a', 1, line([8, 1], 'oz', 'beef'));
  const b = card('b', 1, line([1, 1], 'lb', 'beef'));
  assert.deepEqual(texts(buildList([{ id: 'a', servings: 1 }, { id: 'b', servings: 1 }], book(a, b), rules)), ['- 1 1/2 lb beef (A, B)']);
  assert.deepEqual(texts(buildList([{ id: 'a', servings: 1 }], book(a), rules)), ['- 8 oz beef (A)'], 'ounces alone round up to a whole ounce');
});

test('units outside the rules (grams, quarts) round up to a whole number, at least 1', () => {
  const a = card('a', 10, line([15, 1], 'g', 'yeast'), line([1, 1], 'qt', 'stock'));
  assert.deepEqual(texts(buildList([{ id: 'a', servings: 1 }], book(a), rules)), ['- 1 qt stock (A)', '- 2 g yeast (A)']);
});

test('a different package size or family is a different line', () => {
  const a = card(
    'a',
    1,
    line([1, 1], 'can', 'tomatoes', { size: '(14.5 oz)' }),
    line([1, 1], 'can', 'tomatoes', { size: '(28 oz)' }),
    line([2, 1], 'cup', 'tomatoes'),
  );
  assert.deepEqual(texts(buildList([{ id: 'a', servings: 1 }], book(a), rules)), [
    '- 1 (14.5 oz) can tomatoes (A)',
    '- 1 (28 oz) can tomatoes (A)',
    '- 2 cup tomatoes (A)',
  ]);
});

test('the printed name is the first line\'s shop_item, and a recipe is named once per line', () => {
  const a = card('a', 1, line([1, 1], 'tsp', 'salt', { shop_item: 'kosher salt' }), line([1, 1], 'tsp', 'salt', { shop_item: 'salt' }));
  assert.deepEqual(texts(buildList([{ id: 'a', servings: 1 }], book(a), rules)), ['- 2 tsp kosher salt (A)']);
});

test('lines sort by key by code point, and recipe names sort the same way', () => {
  const z = card('z', 1, line([1, 1], null, 'apple'), line([1, 1], null, 'Zucchini'), line([1, 1], null, 'piña'), line([1, 1], null, 'pizza'));
  const a = card('a', 1, line([1, 1], null, 'apple'));
  const built = buildList([{ id: 'z', servings: 1 }, { id: 'a', servings: 1 }], book(z, a), rules);
  // A dictionary would put apple first and piña before pizza. Code points put capitals first and ñ after z.
  assert.deepEqual(texts(built), ['- 1 Zucchini (Z)', '- 2 apple (A, Z)', '- 1 pizza (Z)', '- 1 piña (Z)']);
});

test('lines with no quantity are listed to check by hand, in recipe and card order', () => {
  const a = card('a', 4, { heading: 'Sauce' }, { text: 'Salt, to taste' }, line([1, 1], 'cup', 'stock'), { text: 'Olive oil' });
  const b = card('b', 2, { text: 'Salt, to taste' }, { text: 'Salt, to taste' });
  const built = buildList([{ id: 'b', servings: 2 }, { id: 'a', servings: 8 }], book(a, b), rules);
  assert.deepEqual(built.unscaled.map((entry) => entry.parity), [
    '- Salt, to taste (B)',
    '- Salt, to taste (B)',
    '- Salt, to taste (A)',
    '- Olive oil (A)',
  ]);
  assert.equal(new Set(built.unscaled.map((entry) => entry.id)).size, 4, 'a repeated line still gets its own id');
});

test('compareCodePoints is not locale order', () => {
  assert.ok(compareCodePoints('Z', 'a') < 0);
  assert.ok(compareCodePoints('a', 'ab') < 0);
  assert.ok(compareCodePoints('é', 'z') > 0);
  assert.equal(compareCodePoints('same', 'same'), 0);
  // An astral character sorts after U+FFFF by code point, though its UTF-16 units would sort before it.
  assert.ok(compareCodePoints('\u{1F35E}', '￿') > 0);
});
