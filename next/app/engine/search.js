// Finding a recipe: search as you type, and the book's sections by category (brief 6.1).

import { isHeading } from './scale.js';

/** Lower case with accents removed, so "jalapeno" finds "jalapeño". */
export function fold(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase();
}

/** Everything search looks at for one recipe: title, tags, ingredient text, and source. */
export function haystack(recipe) {
  const parts = [recipe.title, ...recipe.tags, recipe.source];
  for (const line of recipe.ingredients) parts.push(isHeading(line) ? line.heading : line.text);
  return fold(parts.join('\n'));
}

/** Folded haystacks for every recipe, built once per recipe file. */
export function buildIndex(recipes) {
  return new Map(recipes.map((recipe) => [recipe.id, haystack(recipe)]));
}

/** True when every word of the query appears somewhere in the recipe. An empty query matches all. */
export function matches(index, recipe, query) {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const text = index.get(recipe.id) || '';
  return words.every((word) => text.includes(word));
}

export function compareTitles(a, b) {
  const left = fold(a.title);
  const right = fold(b.title);
  return left < right ? -1 : left > right ? 1 : 0;
}

/**
 * The book as sections: [{ category, recipes }] in the file's category order, titles sorted inside
 * each, empty sections left out.
 * @param {object} data the recipe file
 * @param {Map<string, string>} index from buildIndex
 * @param {{ category?: string | null, query?: string }} filter `category` null or absent means All
 */
export function bookSections(data, index, { category = null, query = '' } = {}) {
  const sections = [];
  for (const name of data.categories) {
    if (category && name !== category) continue;
    const recipes = data.recipes
      .filter((recipe) => recipe.category === name && matches(index, recipe, query))
      .sort(compareTitles);
    if (recipes.length) sections.push({ category: name, recipes });
  }
  return sections;
}
