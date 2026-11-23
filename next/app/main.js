// Starts the app: loads the recipe file, keeps the saved list, and switches between the three screens.
// Screens are in ui/. Rules and arithmetic are in engine/. Anything that touches the phone is in platform/.

import { checkSchema, chooseData, indexRecipes } from './engine/data.js';
import { dropMissing, normalizeList } from './engine/list.js';
import { buildIndex } from './engine/search.js';
import { APP_VERSION, CHANNELS, currentChannel, recipeFileUrl } from './platform/channel.js';
import { registerOffline } from './platform/offline.js';
import { createRecipeFile } from './platform/recipefile.js';
import { createStore } from './platform/storage.js';
import { createWakeLock } from './platform/wakelock.js';
import { showBook } from './ui/book.js';
import { h } from './ui/dom.js';
import { showRecipe } from './ui/recipe.js';
import { showShopping } from './ui/shopping.js';

const RECHECK_AFTER_MS = 60 * 1000; // how long the app must have been away before it looks for news again

const channel = currentChannel();
const store = createStore(channel);
const recipeFile = createRecipeFile({ url: recipeFileUrl(channel, globalThis.location.href), channel });

const view = document.getElementById('view');
const notices = document.getElementById('notices');
const tabs = document.getElementById('tabs');

/** Everything the screens share. */
const app = {
  channel,
  version: APP_VERSION,
  wakeLock: createWakeLock(),
  data: null,
  byId: new Map(),
  index: new Map(),
  list: normalizeList(store.get('list')),
  book: { query: '', category: null, scrollY: 0 }, // remembered while the app stays open
  previousRoute: null,
  setList(list) {
    app.list = list;
    store.set('list', list);
    drawTabs();
  },
};

const state = {
  current: null, // the screen on show: { node, leave? }
  route: null,
  applyUpdate: null, // set when a newer app version is waiting
  newData: null, // set when a newer recipe file has been downloaded
  problem: null, // 'newer' | 'offline' | 'invalid' | null
  dropped: [], // titles removed from the list because they left the book
  lastCheck: 0,
};

// ---- routes ----

function parseRoute(hash) {
  const path = String(hash || '').replace(/^#\/?/, '');
  if (path === 'list') return { name: 'list' };
  const recipe = path.match(/^recipe\/([^/?#]+)$/);
  if (recipe) return { name: 'recipe', id: decodeURIComponent(recipe[1]) };
  return { name: 'book' };
}

function draw() {
  if (!app.data) return;
  const route = parseRoute(globalThis.location.hash);
  if (state.current && state.current.leave) state.current.leave();
  app.previousRoute = state.route;
  state.route = route;

  if (route.name === 'recipe') state.current = showRecipe(app, route.id);
  else if (route.name === 'list') state.current = showShopping(app);
  else state.current = showBook(app);

  view.replaceChildren(state.current.node);
  drawTabs();
  globalThis.scrollTo(0, route.name === 'book' ? app.book.scrollY : 0);
}

function drawTabs() {
  if (!app.data) return;
  const name = state.route ? state.route.name : 'book';
  const count = app.list.items.length;
  tabs.hidden = false;
  tabs.replaceChildren(
    h('a', { class: 'tab', href: '#/', 'aria-current': name === 'book' ? 'page' : null, text: 'Book' }),
    h('a', { class: 'tab', href: '#/list', 'aria-current': name === 'list' ? 'page' : null, text: count ? `List (${count})` : 'List' }),
  );
}

// ---- the lines at the top of the screen ----

function noticeLine(text, button = null) {
  return h('div', { class: 'notice' }, h('span', { class: 'notice-text', text }), button);
}

function drawNotices() {
  const lines = [];
  if (state.applyUpdate) {
    lines.push(noticeLine('App updated.', h('button', { type: 'button', class: 'btn small', text: 'Refresh', on: { click: () => state.applyUpdate() } })));
  }
  if (state.newData) {
    lines.push(
      noticeLine(
        'New recipes.',
        h('button', {
          type: 'button',
          class: 'btn small',
          text: 'Refresh',
          on: {
            click: () => {
              const data = state.newData;
              state.newData = null;
              useData(data);
            },
          },
        }),
      ),
    );
  }
  if (state.problem === 'newer' && app.data) {
    lines.push(noticeLine('The recipe file is newer than this app. Update the app.'));
  }
  if (state.dropped.length) {
    lines.push(
      noticeLine(
        `No longer in the book, so removed from your list: ${state.dropped.join(', ')}.`,
        h('button', {
          type: 'button',
          class: 'btn small',
          text: 'OK',
          on: {
            click: () => {
              state.dropped = [];
              drawNotices();
            },
          },
        }),
      ),
    );
  }
  notices.replaceChildren(...lines);
}

// ---- the recipe file ----

function useData(data) {
  app.data = data;
  app.byId = indexRecipes(data);
  app.index = buildIndex(data.recipes);
  if (app.book.category && !data.categories.includes(app.book.category)) app.book.category = null;
  const result = dropMissing(app.list, app.byId);
  if (result.dropped.length) state.dropped = [...state.dropped, ...result.dropped];
  app.setList(result.list);
  drawNotices();
  draw();
}

/** Shown only when there is no recipe file to open at all. */
function drawNothingToShow() {
  const words = {
    newer: 'The recipe file is newer than this app. Update the app.',
    offline: 'There are no recipes on this phone yet. Open the app once with a connection and they will be kept for next time.',
    invalid: 'The recipe file could not be read. Try again in a little while.',
  };
  view.replaceChildren(
    h(
      'div',
      { class: 'screen' },
      h('h1', { text: 'Recipes' }),
      h('p', { class: 'lead', text: words[state.problem] || words.invalid }),
      h('p', {}, h('button', { type: 'button', class: 'btn', text: 'Try again', on: { click: () => checkForNews() } })),
    ),
  );
}

/** Download the recipe file and decide what to do with it. Never blocks a screen that is already up. */
async function checkForNews() {
  state.lastCheck = Date.now();
  const fetched = await recipeFile.download();
  const onScreen = state.newData || app.data;
  const choice = chooseData(onScreen, fetched);
  if (choice.save) await recipeFile.save(fetched);
  state.problem = choice.problem;
  if (choice.use === 'fetched') {
    useData(fetched);
  } else if (choice.update) {
    state.newData = fetched;
  }
  drawNotices();
  if (!app.data) drawNothingToShow();
}

// ---- start ----

function markTestCopy() {
  if (channel !== CHANNELS.NEXT) return;
  // Suggest a different Home Screen name for the test copy, so the two icons cannot be mixed up.
  document.title = 'Recipes Next';
  const title = document.querySelector('meta[name="apple-mobile-web-app-title"]');
  if (title) title.setAttribute('content', 'Recipes Next');
  document.body.classList.add('test-copy');
}

async function start() {
  markTestCopy();

  const offline = registerOffline({
    onUpdateReady(apply) {
      state.applyUpdate = apply;
      drawNotices();
    },
  });

  // The app sets the scroll position itself: back at the Book where the reader left it, otherwise the top.
  if ('scrollRestoration' in globalThis.history) globalThis.history.scrollRestoration = 'manual';
  globalThis.addEventListener('hashchange', draw);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible' || Date.now() - state.lastCheck < RECHECK_AFTER_MS) return;
    offline.check();
    checkForNews();
  });

  // Open at once from the copy on the phone. The download happens behind the screen.
  const saved = await recipeFile.readSaved();
  if (checkSchema(saved) === 'ok') useData(saved);
  await checkForNews();
}

start();
