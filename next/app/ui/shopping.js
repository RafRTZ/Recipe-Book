// The shopping list: the recipes on it, the merged list to tick off, Copy and Share (brief 6.3).

import { SERVINGS_MAX, SERVINGS_MIN } from '../engine/constants.js';
import { clearTicks, emptyList, isTicked, pruneTicks, remainingLines, removeItem, setServings, toggleTick } from '../engine/list.js';
import { buildList } from '../engine/shop.js';
import { canShare, copyText, shareText } from '../platform/share.js';
import { h, stepButton } from './dom.js';

const linesWords = (count) => (count === 1 ? '1 line' : `${count} lines`);

export function showShopping(app) {
  const node = h('div', { class: 'screen shopping' });
  let confirmingClear = false;
  let message = '';

  function draw() {
    const built = buildList(app.list.items, app.byId, app.data.rules);
    // Forget ticks that no longer match a line, so they cannot come back by surprise.
    const pruned = pruneTicks(app.list, built);
    if (Object.keys(pruned.ticks).length !== Object.keys(app.list.ticks).length) app.setList(pruned);

    node.replaceChildren(h('header', { class: 'top' }, h('h1', { text: 'Shopping list' })));

    if (app.list.items.length === 0) {
      node.append(
        h('p', { class: 'lead', text: 'Your list is empty. Open a recipe and tap Add to list.' }),
        h('p', {}, h('a', { class: 'btn', href: '#/', text: 'Open the book' })),
      );
      return;
    }

    // ---- the recipes on the list ----
    const recipeRows = app.list.items.filter((item) => app.byId.has(item.id)).map((item) => {
      const recipe = app.byId.get(item.id);
      const change = (count) => {
        app.setList(setServings(app.list, recipe, count));
        draw();
      };
      return h(
        'li',
        { class: 'list-recipe' },
        h('a', { class: 'list-recipe-title', href: `#/recipe/${encodeURIComponent(item.id)}`, text: recipe.title }),
        h(
          'div',
          { class: 'list-recipe-controls' },
          h(
            'div',
            { class: 'stepper compact' },
            stepButton('−', `One serving fewer of ${recipe.title}`, () => change(item.servings - 1), item.servings <= SERVINGS_MIN),
            h('output', { class: 'stepper-value', text: item.servings === 1 ? '1 serving' : `${item.servings} servings` }),
            stepButton('+', `One serving more of ${recipe.title}`, () => change(item.servings + 1), item.servings >= SERVINGS_MAX),
          ),
          h('button', {
            type: 'button',
            class: 'link-btn',
            text: 'Remove',
            'aria-label': `Remove ${recipe.title} from the list`,
            on: {
              click: () => {
                app.setList(removeItem(app.list, item.id));
                draw();
              },
            },
          }),
        ),
      );
    });
    node.append(h('ul', { class: 'list-recipes' }, recipeRows));

    // ---- copy and share ----
    const status = h('p', { class: 'status', role: 'status', text: message });
    const say = (text) => {
      message = text;
      status.textContent = text;
    };
    const send = async (how) => {
      const lines = remainingLines(app.list, buildList(app.list.items, app.byId, app.data.rules));
      if (lines.length === 0) return say('Everything is ticked, so there is nothing to send.');
      const text = lines.join('\n');
      if (how === 'copy') return say((await copyText(text)) ? `Copied ${linesWords(lines.length)}.` : 'Could not copy. Try Share instead.');
      const result = await shareText(text);
      return say(result === 'failed' ? 'Could not open the share sheet. Try Copy instead.' : '');
    };
    node.append(
      h(
        'div',
        { class: 'actions' },
        h('button', { type: 'button', class: 'btn primary', text: 'Copy', on: { click: () => send('copy') } }),
        canShare() ? h('button', { type: 'button', class: 'btn', text: 'Share', on: { click: () => send('share') } }) : null,
      ),
      status,
    );

    // ---- the lines ----
    // Each of the two parts counts its own lines: "12 lines", then "9 of 12 left" once some are ticked.
    const counter = (lines) => {
      const span = h('span', { class: 'left' });
      const redraw = () => {
        const ticked = lines.filter((line) => isTicked(app.list, line)).length;
        span.textContent = ticked === 0 ? linesWords(lines.length) : `${lines.length - ticked} of ${lines.length} left`;
      };
      redraw();
      return { span, redraw };
    };
    const checkRow = (line, from, count) => {
      const box = h('input', { type: 'checkbox', checked: isTicked(app.list, line) });
      const row = h(
        'label',
        { class: isTicked(app.list, line) ? 'check ticked' : 'check' },
        box,
        h('span', { class: 'check-words' }, h('span', { class: 'check-text', text: line.text }), h('span', { class: 'check-from', text: from })),
      );
      box.addEventListener('change', () => {
        if (box.checked !== isTicked(app.list, line)) app.setList(toggleTick(app.list, line));
        row.classList.toggle('ticked', box.checked);
        count.redraw();
        say('');
      });
      return h('li', {}, row);
    };

    if (built.scaled.length) {
      const count = counter(built.scaled);
      node.append(h('h2', {}, 'To buy ', count.span), h('ul', { class: 'checks' }, built.scaled.map((line) => checkRow(line, line.titles.join(', '), count))));
    }
    if (built.unscaled.length) {
      const count = counter(built.unscaled);
      node.append(
        h('h2', {}, 'Check by hand ', count.span),
        h('p', { class: 'note', text: 'These lines have no amount on the card, so they are not added up.' }),
        h('ul', { class: 'checks' }, built.unscaled.map((line) => checkRow(line, line.title, count))),
      );
    }

    // ---- clearing ----
    const clearing = confirmingClear
      ? h(
          'div',
          { class: 'confirm' },
          h('p', { text: 'Take every recipe off the list?' }),
          h(
            'div',
            { class: 'actions' },
            h('button', {
              type: 'button',
              class: 'btn danger',
              text: 'Yes, clear the list',
              on: {
                click: () => {
                  confirmingClear = false;
                  message = '';
                  app.setList(emptyList());
                  draw();
                },
              },
            }),
            h('button', {
              type: 'button',
              class: 'btn',
              text: 'Keep it',
              on: {
                click: () => {
                  confirmingClear = false;
                  draw();
                },
              },
            }),
          ),
        )
      : h(
          'div',
          { class: 'actions end' },
          h('button', {
            type: 'button',
            class: 'btn',
            text: 'Clear checked',
            on: {
              click: () => {
                message = '';
                app.setList(clearTicks(app.list));
                draw();
              },
            },
          }),
          h('button', {
            type: 'button',
            class: 'btn',
            text: 'Clear list',
            on: {
              click: () => {
                confirmingClear = true;
                draw();
              },
            },
          }),
        );
    node.append(clearing);
  }

  draw();
  return { node };
}
