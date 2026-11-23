// The Book: search, category chips, and every recipe (brief 6.1).

import { describeData } from '../engine/data.js';
import { bookSections } from '../engine/search.js';
import { CHANNELS } from '../platform/channel.js';
import { clear, h } from './dom.js';

const BADGES = { partial: 'Missing info', 'needs-check': 'Check' };

function recipeRow(recipe) {
  const meta = [];
  if (recipe.time) meta.push(h('span', { text: recipe.time }));
  meta.push(h('span', { text: `Serves ${recipe.serves}` }));
  if (BADGES[recipe.status]) meta.push(h('span', { class: 'badge', text: BADGES[recipe.status] }));
  return h(
    'li',
    {},
    h('a', { class: 'row', href: `#/recipe/${encodeURIComponent(recipe.id)}` }, h('span', { class: 'row-title', text: recipe.title }), h('span', { class: 'row-meta' }, meta)),
  );
}

export function showBook(app) {
  const data = app.data;
  const results = h('div', { class: 'results' });
  const chipRow = h('div', { class: 'chips', role: 'group', 'aria-label': 'Category' });

  const input = h('input', {
    type: 'search',
    class: 'search-input',
    placeholder: 'Search recipes',
    'aria-label': 'Search recipes',
    value: app.book.query,
    autocomplete: 'off',
    autocorrect: 'off',
    autocapitalize: 'off',
    spellcheck: 'false',
    enterkeyhint: 'search',
  });
  const clearButton = h('button', { type: 'button', class: 'link-btn search-clear', text: 'Clear' });

  function drawResults() {
    const sections = bookSections(data, app.index, app.book);
    const total = sections.reduce((sum, section) => sum + section.recipes.length, 0);
    clearButton.hidden = app.book.query === '';
    clear(results);
    if (app.book.query.trim() !== '') {
      results.append(h('p', { class: 'count', text: total === 0 ? 'No recipes match.' : total === 1 ? '1 recipe' : `${total} recipes` }));
    }
    for (const section of sections) {
      // With one category chosen, its name is already on the chip.
      if (!app.book.category) results.append(h('h2', { class: 'category', text: section.category }));
      results.append(h('ul', { class: 'rows' }, section.recipes.map(recipeRow)));
    }
  }

  function drawChips() {
    const used = data.categories.filter((name) => data.recipes.some((recipe) => recipe.category === name));
    const chip = (label, value) =>
      h('button', {
        type: 'button',
        class: 'chip',
        'aria-pressed': String(app.book.category === value),
        text: label,
        on: {
          click: () => {
            app.book.category = value;
            drawChips();
            drawResults();
          },
        },
      });
    chipRow.replaceChildren(chip('All', null), ...used.map((name) => chip(name, name)));
  }

  input.addEventListener('input', () => {
    app.book.query = input.value;
    drawResults();
  });
  clearButton.addEventListener('click', () => {
    input.value = '';
    app.book.query = '';
    drawResults();
    input.focus();
  });

  drawChips();
  drawResults();

  const copy = app.channel === CHANNELS.NEXT ? ', test copy' : '';
  const node = h(
    'div',
    { class: 'screen book' },
    h('header', { class: 'top' }, h('h1', { text: 'Recipes' }), app.channel === CHANNELS.NEXT ? h('span', { class: 'badge', text: 'NEXT' }) : null),
    h('div', { class: 'search' }, input, clearButton),
    chipRow,
    results,
    h('p', { class: 'about', text: `Recipes ${app.version}${copy}. ${describeData(data)}.` }),
  );

  return {
    node,
    leave() {
      app.book.scrollY = globalThis.scrollY;
    },
  };
}
