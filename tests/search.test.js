// Finding a recipe (brief 6.1): search over title, tags, ingredient text, and source, and the book's
// sections in category order.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { bookSections, buildIndex, fold, haystack, matches } from '../next/app/engine/search.js';

const data = JSON.parse(readFileSync(new URL('../data/recipes.json', import.meta.url), 'utf8'));
const index = buildIndex(data.recipes);
const found = (query, category = null) => bookSections(data, index, { category, query }).flatMap((section) => section.recipes);

const sample = {
  id: 'sample',
  title: 'Jalapeño Poppers',
  category: 'Appetizers and Dips',
  tags: ['party', 'spicy'],
  source: 'Aunt May',
  ingredients: [{ heading: 'For the filling' }, { text: '8 oz cream cheese' }, { text: 'Salt, to taste' }],
};
const sampleIndex = buildIndex([sample]);

test('fold lowers case and removes accents', () => {
  assert.equal(fold('Jalapeño CRÈME'), 'jalapeno creme');
  assert.equal(fold(null), '');
});

test('search looks at title, tags, ingredient text, and source', () => {
  for (const query of ['poppers', 'spicy', 'cream cheese', 'aunt may', 'filling']) {
    assert.ok(matches(sampleIndex, sample, query), query);
  }
  assert.ok(!matches(sampleIndex, sample, 'chocolate'));
  assert.ok(!haystack(sample).includes('appetizers'), 'the category is a chip, not a search field');
});

test('search ignores case and accents, and needs every word', () => {
  assert.ok(matches(sampleIndex, sample, 'JALAPENO'));
  assert.ok(matches(sampleIndex, sample, 'jalapeño'));
  assert.ok(matches(sampleIndex, sample, '  cheese   party '));
  assert.ok(!matches(sampleIndex, sample, 'cheese chocolate'));
  assert.ok(matches(sampleIndex, sample, ''));
  assert.ok(matches(sampleIndex, sample, 'pop'), 'matches as you type');
});

test('with no search and no chip, every recipe appears once, in category order, titles sorted', () => {
  const sections = bookSections(data, index);
  assert.deepEqual(sections.map((section) => section.category), data.categories.filter((name) => data.recipes.some((r) => r.category === name)));
  assert.equal(sections.flatMap((section) => section.recipes).length, data.recipes.length);
  for (const section of sections) {
    const titles = section.recipes.map((recipe) => fold(recipe.title));
    assert.deepEqual(titles, [...titles].sort(), section.category);
    for (const recipe of section.recipes) assert.equal(recipe.category, section.category);
  }
});

test('a chip narrows the book to one category', () => {
  const sections = bookSections(data, index, { category: 'Seafood' });
  assert.deepEqual(sections.map((section) => section.category), ['Seafood']);
  assert.equal(sections[0].recipes.length, data.recipes.filter((recipe) => recipe.category === 'Seafood').length);
});

test('searching the real book', () => {
  const chili = found('chili');
  assert.ok(chili.some((recipe) => recipe.title === "Grandma's Chili"));
  assert.ok(found('sourdough').length >= 3);
  assert.deepEqual(found('zzzz no such thing'), []);
  assert.ok(found('salmon', 'Desserts').length === 0, 'a chip and a search apply together');
  for (const recipe of data.recipes) assert.ok(found(recipe.title).some((hit) => hit.id === recipe.id), `"${recipe.title}" finds itself`);
});

test('bookSections does not reorder the recipe file', () => {
  const before = data.recipes.map((recipe) => recipe.id).join();
  bookSections(data, index, { query: 'a' });
  assert.equal(data.recipes.map((recipe) => recipe.id).join(), before);
});
