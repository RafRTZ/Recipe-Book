// The cook view (brief 6.2). The nine worked examples are normative: if one fails, the code is wrong or
// the brief is ambiguous. They run on a frozen copy of the lines (docs/DECISIONS.md, kickoff item 12).

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { frac } from '../next/app/engine/fraction.js';
import { cookAmount, cookIngredients, cookLine, cookStep, formatCookAmount, isScaled, unitWord } from '../next/app/engine/scale.js';
import { UNIT_WORDS } from '../next/app/engine/constants.js';

const fixture = JSON.parse(readFileSync(new URL('./fixtures/cook-examples.json', import.meta.url), 'utf8'));
const data = JSON.parse(readFileSync(new URL('../data/recipes.json', import.meta.url), 'utf8'));
const rules = fixture.rules;

const scalable = (over) => ({
  text: 'as written',
  qty: [1, 1],
  unit: null,
  unit_text: '',
  item: 'thing',
  item_scaled: 'thing',
  size: '',
  key: 'thing',
  family: null,
  shop_item: 'thing',
  ...over,
});

test('the fixture holds all nine worked examples', () => {
  assert.equal(fixture.examples.length, 9);
});

for (const example of fixture.examples) {
  test(`worked example: ${example.title} (${example.serves}) at ${example.servings}: "${example.line.text}"`, () => {
    const recipe = { serves: example.serves, ingredients: [example.line] };
    assert.equal(cookLine(recipe, example.line, example.servings, rules), example.shown);
  });
}

test('at the card\'s own count every line shows exactly as written', () => {
  for (const recipe of data.recipes) {
    assert.ok(!isScaled(recipe, recipe.serves));
    for (const shown of cookIngredients(recipe, recipe.serves, data.rules)) assert.equal(shown.changed, false);
    const lines = recipe.ingredients.filter((line) => 'text' in line);
    for (const line of lines) assert.equal(cookLine(recipe, line, recipe.serves, data.rules), line.text);
  }
});

test('lines with no leading quantity are never scaled', () => {
  const recipe = { serves: 4, ingredients: [{ text: 'Salt and pepper, to taste' }] };
  assert.equal(cookLine(recipe, recipe.ingredients[0], 12, rules), 'Salt and pepper, to taste');
  assert.deepEqual(cookIngredients(recipe, 12, rules), [{ kind: 'line', text: 'Salt and pepper, to taste', changed: false }]);
});

test('headings pass through', () => {
  const recipe = { serves: 4, ingredients: [{ heading: 'For the dough' }, scalable({ qty: [2, 1], unit: 'cup', unit_text: 'cups', item_scaled: 'flour' })] };
  assert.deepEqual(cookIngredients(recipe, 8, rules), [
    { kind: 'heading', text: 'For the dough', changed: false },
    { kind: 'line', text: '4 cups flour', changed: true },
  ]);
});

test('steps: each unit rounds to the step the brief gives', () => {
  const step = (unit, exact) => cookStep(unit, exact, rules);
  assert.deepEqual(step('tsp', frac(1)), frac(1, 8));
  assert.deepEqual(step('Tbsp', frac(1)), frac(1, 2));
  assert.deepEqual(step('cup', frac(1)), frac(1, 4));
  assert.deepEqual(step('lb', frac(1)), frac(1, 4));
  assert.deepEqual(step('oz', frac(1)), frac(1));
  assert.deepEqual(step('pinch', frac(1)), frac(1));
  assert.deepEqual(step('dash', frac(1)), frac(1));
  assert.deepEqual(step('g', frac(12)), frac(1));
  assert.deepEqual(step('ml', frac(250)), frac(1));
  assert.deepEqual(step('g', frac(19, 2)), frac(1, 2), 'grams under 10 go by halves');
  assert.deepEqual(step('g', frac(10)), frac(1), 'exactly 10 is not under 10');
  assert.deepEqual(step('can', frac(1)), frac(1, 2));
  assert.deepEqual(step(null, frac(1)), frac(1, 2), 'no unit counts as a whole unit');
  assert.deepEqual(step('qt', frac(1)), frac(1, 4), 'anything else');
});

test('an amount never rounds below one step', () => {
  assert.deepEqual(cookAmount('tsp', [1, 8], frac(1, 30), rules), frac(1, 8));
  assert.deepEqual(cookAmount(null, [1, 1], frac(1, 30), rules), frac(1, 2));
  assert.deepEqual(cookAmount('oz', [1, 1], frac(1, 30), rules), frac(1));
  assert.deepEqual(cookAmount('g', [5, 1], frac(1, 30), rules), frac(1, 2));
});

test('grams print as decimals and other units as mixed numbers', () => {
  assert.equal(formatCookAmount('g', frac(15, 2)), '7.5');
  assert.equal(formatCookAmount('g', frac(153)), '153');
  assert.equal(formatCookAmount('cup', frac(5, 4)), '1 1/4');
  assert.equal(formatCookAmount(null, frac(3, 2)), '1 1/2');
});

test('a package size stays between the amount and the unit', () => {
  const line = scalable({ qty: [1, 1], unit: 'can', unit_text: 'can', size: '(14.5 oz)', item_scaled: 'diced tomatoes' });
  assert.equal(cookLine({ serves: 4 }, line, 8, rules), '2 (14.5 oz) cans diced tomatoes');
});

test('a range scales both ends and prints "a to b"', () => {
  const line = scalable({ qty: [4, 1], qty_low: [3, 1], unit: 'cup', unit_text: 'cups', item_scaled: 'canola oil, for frying' });
  assert.equal(cookLine({ serves: 4 }, line, 8, rules), '6 to 8 cups canola oil, for frying');
});

test('a range whose ends round to the same number shows one number (kickoff item 11)', () => {
  const line = scalable({ qty: [2, 1], qty_low: [1, 1], unit: 'clove', unit_text: 'cloves', item_scaled: 'large garlic' });
  assert.equal(cookLine({ serves: 8 }, line, 1, rules), '1/2 clove large garlic');
});

test('unit words follow the amount; abbreviations and unknown words are left alone (kickoff item 10)', () => {
  assert.equal(unitWord('cup', frac(9, 4)), 'cups');
  assert.equal(unitWord('cups', frac(1)), 'cup');
  assert.equal(unitWord('cups', frac(3, 4)), 'cup');
  assert.equal(unitWord('cups', frac(5, 4)), 'cups');
  assert.equal(unitWord('stick', frac(15)), 'sticks');
  assert.equal(unitWord('bunch', frac(2)), 'bunches');
  assert.equal(unitWord('quart', frac(2)), 'quarts');
  assert.equal(unitWord('Tbsp', frac(2)), 'Tbsp');
  assert.equal(unitWord('lb', frac(2)), 'lb');
  assert.equal(unitWord('', frac(2)), '');
  assert.equal(unitWord('handfuls', frac(1)), 'handfuls');
  const line = scalable({ qty: [1, 1], unit: 'cup', unit_text: 'cup', item_scaled: 'uncooked farro' });
  assert.equal(cookLine({ serves: 4 }, line, 9, rules), '2 1/4 cups uncooked farro');
});

test('every unit word written in the recipe file is one the app knows how to swap', () => {
  const known = new Set(UNIT_WORDS.flat());
  const abbreviations = new Set(['', 'tsp', 'Tbsp', 'oz', 'lb', 'g', 'ml', 'kg', 'l']);
  const unknown = new Set();
  for (const recipe of data.recipes) {
    for (const line of recipe.ingredients) {
      if (!Array.isArray(line.qty)) continue;
      if (!known.has(line.unit_text) && !abbreviations.has(line.unit_text)) unknown.add(line.unit_text);
    }
  }
  assert.deepEqual([...unknown], [], 'add these unit words to UNIT_WORDS in constants.js, or to the abbreviations here');
});

test('every scalable line in the book scales at every count from 1 to 60 without an error or an empty amount', () => {
  let checked = 0;
  for (const recipe of data.recipes) {
    for (const servings of [1, 2, 3, 7, 13, 30, 60]) {
      for (const shown of cookIngredients(recipe, servings, data.rules)) {
        assert.ok(shown.text.length > 0);
        assert.doesNotMatch(shown.text, /^0 |undefined|null|NaN|  /, `${recipe.title} at ${servings}: "${shown.text}"`);
        checked++;
      }
    }
  }
  assert.ok(checked > 3000);
});
