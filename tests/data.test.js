// The recipe file: the schema guard and the saved-copy rules (brief section 4), and checks that today's
// export is the shape the app expects (brief section 5). A failure in the second half means the export
// changed: tell the owner, and never edit data/ to make it pass (brief rules 3 and 4).

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SUPPORTED_SCHEMA } from '../next/app/engine/constants.js';
import { checkSchema, chooseData, describeData, indexRecipes, linkedRecipeIds } from '../next/app/engine/data.js';

const data = JSON.parse(readFileSync(new URL('../data/recipes.json', import.meta.url), 'utf8'));
const file = (over = {}) => ({ schema: 1, version: 'aaaaaaaaaaaa', updated: '2026-11-23', count: 0, categories: [], rules: {}, recipes: [], ...over });

test('schema guard: this app understands schema 1', () => {
  assert.equal(SUPPORTED_SCHEMA, 1);
  assert.equal(checkSchema(data), 'ok');
  assert.equal(checkSchema(file()), 'ok');
});

test('schema guard: a newer file is recognised as newer, whatever else it holds', () => {
  assert.equal(checkSchema(file({ schema: 2 })), 'newer');
  assert.equal(checkSchema({ schema: 7 }), 'newer');
  assert.equal(checkSchema(file({ schema: 2 }), 2), 'ok', 'a later app that understands schema 2 accepts it');
});

test('schema guard: anything that is not a recipe file is invalid', () => {
  for (const bad of [null, undefined, 'text', 42, [], {}, { schema: '1' }, { schema: 0 }, { schema: 1.5 }, file({ recipes: null }), file({ rules: null }), file({ version: 5 })]) {
    assert.equal(checkSchema(bad), 'invalid');
  }
});

test('first open with a connection: use the download and save it', () => {
  assert.deepEqual(chooseData(null, file()), { use: 'fetched', save: true, update: false, problem: null });
});

test('first open with no connection: nothing to show, and the reason is offline', () => {
  assert.deepEqual(chooseData(null, null), { use: 'none', save: false, update: false, problem: 'offline' });
});

test('no connection later: the saved copy opens with no complaint', () => {
  assert.deepEqual(chooseData(file(), null), { use: 'saved', save: false, update: false, problem: null });
});

test('same version: keep the saved copy and save nothing', () => {
  assert.deepEqual(chooseData(file(), file()), { use: 'saved', save: false, update: false, problem: null });
});

test('new version: the saved copy stays on screen, the download is kept, and an update is offered', () => {
  assert.deepEqual(chooseData(file(), file({ version: 'bbbbbbbbbbbb' })), { use: 'saved', save: true, update: true, problem: null });
});

test('schema guard: a newer file never replaces the saved copy', () => {
  assert.deepEqual(chooseData(file(), file({ schema: 2, version: 'bbbbbbbbbbbb' })), { use: 'saved', save: false, update: false, problem: 'newer' });
});

test('schema guard: a newer file and nothing saved: nothing to show, and the reason is newer', () => {
  assert.deepEqual(chooseData(null, file({ schema: 2 })), { use: 'none', save: false, update: false, problem: 'newer' });
});

test('a damaged download never replaces the saved copy', () => {
  assert.deepEqual(chooseData(file(), { nonsense: true }), { use: 'saved', save: false, update: false, problem: 'invalid' });
  assert.deepEqual(chooseData(null, { nonsense: true }), { use: 'none', save: false, update: false, problem: 'invalid' });
});

test('a damaged saved copy is treated as no saved copy', () => {
  assert.deepEqual(chooseData({ nonsense: true }, file()), { use: 'fetched', save: true, update: false, problem: null });
  assert.deepEqual(chooseData(file({ schema: 2 }), null), { use: 'none', save: false, update: false, problem: 'offline' });
});

test('linkedRecipeIds finds links to other cards', () => {
  assert.deepEqual(linkedRecipeIds('<p>See <a href="#/recipe/granola">Granola</a> and <a href="https://example.com" target="_blank" rel="noopener">this</a>.</p>'), ['granola']);
  assert.deepEqual(linkedRecipeIds(''), []);
});

test('the About line', () => {
  assert.equal(describeData({ count: 48, updated: '2026-11-23' }), '48 recipes, updated 2026-11-23');
});

// ---- today's export ----

const htmlParts = (recipe) => [recipe.steps_html, recipe.notes_html, ...recipe.sections.map((section) => section.html)];

test('export: top-level fields', () => {
  assert.equal(data.schema, 1);
  assert.match(data.version, /^[0-9a-f]{12}$/);
  assert.match(data.updated, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(data.count, data.recipes.length);
  assert.equal(new Set(data.categories).size, data.categories.length);
  assert.ok(Number.isInteger(data.rules.default_servings) && data.rules.default_servings >= 1);
  for (const key of ['to_base', 'family', 'step']) assert.equal(typeof data.rules[key], 'object');
  assert.ok(Array.isArray(data.rules.whole_units) && data.rules.whole_units.includes(null));
});

test('export: every recipe has the fields the screens read, with the right types', () => {
  const ids = new Set();
  for (const recipe of data.recipes) {
    assert.match(recipe.id, /^[a-z0-9-]+$/, recipe.id);
    assert.ok(!ids.has(recipe.id), `duplicate id ${recipe.id}`);
    ids.add(recipe.id);
    for (const key of ['title', 'category', 'serves_basis', 'yield', 'time', 'source', 'source_url', 'status', 'description', 'steps_html', 'notes_html']) {
      assert.equal(typeof recipe[key], 'string', `${recipe.id}.${key}`);
    }
    assert.ok(recipe.title.length > 0);
    assert.ok(data.categories.includes(recipe.category), `${recipe.id}: category "${recipe.category}" is not in the list`);
    assert.ok(Number.isInteger(recipe.serves) && recipe.serves >= 1, `${recipe.id}.serves`);
    assert.ok(['stated', 'estimated'].includes(recipe.serves_basis), `${recipe.id}.serves_basis`);
    assert.ok(['complete', 'partial', 'needs-check'].includes(recipe.status), `${recipe.id}.status`);
    assert.ok(Array.isArray(recipe.tags) && recipe.tags.every((tag) => typeof tag === 'string'));
    assert.ok(Array.isArray(recipe.sections));
    for (const section of recipe.sections) {
      assert.equal(typeof section.title, 'string');
      assert.equal(typeof section.html, 'string');
    }
    assert.ok(recipe.source_url === '' || /^https?:\/\//.test(recipe.source_url), `${recipe.id}.source_url`);
  }
});

test('export: every ingredient entry is a heading, a plain line, or a scalable line', () => {
  for (const recipe of data.recipes) {
    for (const line of recipe.ingredients) {
      if ('heading' in line) {
        assert.deepEqual(Object.keys(line), ['heading'], recipe.id);
        continue;
      }
      assert.equal(typeof line.text, 'string');
      if (!('qty' in line)) {
        assert.deepEqual(Object.keys(line), ['text'], `${recipe.id}: "${line.text}"`);
        continue;
      }
      for (const pair of [line.qty, ...('qty_low' in line ? [line.qty_low] : [])]) {
        assert.ok(Array.isArray(pair) && pair.length === 2 && pair.every(Number.isInteger) && pair[0] > 0 && pair[1] > 0, `${recipe.id}: "${line.text}"`);
      }
      assert.ok(line.unit === null || typeof line.unit === 'string');
      for (const key of ['unit_text', 'item', 'item_scaled', 'size', 'key', 'shop_item']) assert.equal(typeof line[key], 'string', `${recipe.id}: "${line.text}" ${key}`);
      assert.ok(line.key.length > 0 && line.shop_item.length > 0);
    }
  }
});

test('export: every link to another card opens a card that exists (brief 6.5)', () => {
  const byId = indexRecipes(data);
  let links = 0;
  for (const recipe of data.recipes) {
    for (const html of htmlParts(recipe)) {
      for (const id of linkedRecipeIds(html)) {
        assert.ok(byId.has(id), `${recipe.id} links to "${id}", which is not in the book`);
        links++;
      }
    }
  }
  assert.ok(links >= 1);
});

test('export: the HTML fields hold only plain formatting, and web links open outside the app', () => {
  const allowed = new Set(['a', 'li', 'ol', 'p', 'strong', 'ul', 'em', 'br', 'h3', 'h4']);
  for (const recipe of data.recipes) {
    for (const html of htmlParts(recipe)) {
      for (const match of html.matchAll(/<\/?([a-zA-Z0-9]+)([^>]*)>/g)) {
        assert.ok(allowed.has(match[1]), `${recipe.id}: <${match[1]}> is not an expected tag`);
        assert.doesNotMatch(match[2], /\bon\w+\s*=|javascript:|style\s*=/i, `${recipe.id}: ${match[0]}`);
      }
      assert.doesNotMatch(html, /<script|<iframe|<img|<object|<embed|<form/i, recipe.id);
      for (const match of html.matchAll(/<a\s([^>]*)>/g)) {
        const href = (match[1].match(/href="([^"]*)"/) || [])[1] || '';
        if (href.startsWith('#/recipe/')) continue;
        assert.match(href, /^https?:\/\//, `${recipe.id}: link "${href}"`);
        assert.match(match[1], /target="_blank"/, `${recipe.id}: a web link must open outside the app`);
        assert.match(match[1], /rel="[^"]*noopener/, `${recipe.id}: a web link needs rel="noopener"`);
      }
    }
  }
});

test('export: the steps of every recipe hold at least one numbered step', () => {
  for (const recipe of data.recipes) assert.match(recipe.steps_html, /<ol[ >][\s\S]*<li>/, recipe.id);
});

test('export: nothing private slipped through (brief rule 5)', () => {
  const raw = readFileSync(new URL('../data/recipes.json', import.meta.url), 'utf8');
  assert.doesNotMatch(raw, /\/Users\/|[A-Za-z]:\\\\|_Reference|\.pdf\b|\.heic\b|\.jpe?g\b|\.png\b/i);
  assert.doesNotMatch(raw, /[\w.+-]+@[\w-]+\.[a-z]{2,}/i, 'no email addresses');
});
