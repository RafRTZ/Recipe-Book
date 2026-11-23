// Checks on the recipe file, and the choice between the copy saved on the phone and a fresh download
// (brief section 4: offline, and the schema guard). Reading and saving the file is the platform's job.

import { SUPPORTED_SCHEMA } from './constants.js';

/**
 * 'ok' when this app can use the file, 'newer' when the file's layout is newer than the app understands,
 * 'invalid' when it is not a recipe file at all.
 */
export function checkSchema(data, supported = SUPPORTED_SCHEMA) {
  if (!data || typeof data !== 'object' || !Number.isInteger(data.schema) || data.schema < 1) return 'invalid';
  if (data.schema > supported) return 'newer';
  const complete =
    typeof data.version === 'string' &&
    Array.isArray(data.recipes) &&
    Array.isArray(data.categories) &&
    data.rules !== null &&
    typeof data.rules === 'object';
  return complete ? 'ok' : 'invalid';
}

/**
 * Decide what to do with the saved copy and a fresh download.
 * @param {object | null} saved the copy on the phone, or null
 * @param {object | null} fetched the download, or null when there is no connection
 * @returns {{ use: 'saved' | 'fetched' | 'none', save: boolean, update: boolean, problem: null | 'newer' | 'offline' | 'invalid' }}
 * `use` is the copy to show now. `save` means keep the download for next time. `update` means the
 * download differs from what is on screen, so the reader is offered "New recipes. Refresh".
 * `problem` is why the newest file is not in use: 'newer' is the schema guard.
 */
export function chooseData(saved, fetched, supported = SUPPORTED_SCHEMA) {
  const haveSaved = checkSchema(saved, supported) === 'ok';
  const state = fetched == null ? 'offline' : checkSchema(fetched, supported);
  if (state !== 'ok') {
    // Keep using the saved copy. With a connection and a good file there is nothing to say.
    const problem = state === 'offline' && haveSaved ? null : state;
    return { use: haveSaved ? 'saved' : 'none', save: false, update: false, problem };
  }
  if (!haveSaved) return { use: 'fetched', save: true, update: false, problem: null };
  const changed = saved.version !== fetched.version;
  return { use: 'saved', save: changed, update: changed, problem: null };
}

/** Recipes by id. */
export function indexRecipes(data) {
  return new Map(data.recipes.map((recipe) => [recipe.id, recipe]));
}

/** The ids of other cards that a piece of the file's HTML links to ("#/recipe/<id>"). */
export function linkedRecipeIds(html) {
  return [...String(html).matchAll(/href="#\/recipe\/([^"]+)"/g)].map((match) => match[1]);
}

/** The line the About footer shows for a recipe file. */
export function describeData(data) {
  return `${data.count} recipes, updated ${data.updated}`;
}
