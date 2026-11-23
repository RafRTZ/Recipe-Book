// One recipe: the full card, the servings picker, Add to list, and cook mode (brief 6.2).

import { SERVINGS_MAX, SERVINGS_MIN } from '../engine/constants.js';
import { clampServings, servingsOnList, setServings } from '../engine/list.js';
import { cookIngredients, isScaled } from '../engine/scale.js';
import { clear, h, setTrustedHtml, stepButton, webLink } from './dom.js';

const servingsWords = (count) => (count === 1 ? '1 serving' : `${count} servings`);

function notFound() {
  return h(
    'div',
    { class: 'screen' },
    h('h1', { text: 'Not in the book' }),
    h('p', { class: 'lead', text: 'This recipe is not in the book any more.' }),
    h('p', {}, h('a', { class: 'btn', href: '#/', text: 'Open the book' })),
  );
}

export function showRecipe(app, id) {
  const recipe = app.byId.get(id);
  if (!recipe) return { node: notFound() };

  const rules = app.data.rules;
  const family = rules.default_servings;
  let servings = recipe.serves;
  let cooking = false;

  // ---- servings picker and ingredients ----

  const amount = h('output', { class: 'stepper-value', 'aria-live': 'polite' });
  const minus = stepButton('−', 'One serving fewer', () => choose(servings - 1));
  const plus = stepButton('+', 'One serving more', () => choose(servings + 1));
  const familyButton = h('button', { type: 'button', class: 'chip', text: `Family dinner (${family})`, on: { click: () => choose(family) } });
  const writtenButton =
    recipe.serves === family ? null : h('button', { type: 'button', class: 'chip', text: `As written (${recipe.serves})`, on: { click: () => choose(recipe.serves) } });
  const scaledNote = h('p', { class: 'scaled-note', text: `Scaled from ${servingsWords(recipe.serves)}. Steps and notes keep the original amounts.` });
  const ingredients = h('ul', { class: 'ingredients' });
  const addBox = h('div', { class: 'add-box' });

  function drawAddBox() {
    const onList = servingsOnList(app.list, recipe.id);
    const add = () => {
      app.setList(setServings(app.list, recipe, servings));
      drawAddBox();
    };
    clear(addBox);
    if (onList === null) {
      addBox.append(h('button', { type: 'button', class: 'btn primary wide', text: `Add to list (${servingsWords(servings)})`, on: { click: add } }));
    } else if (onList === servings) {
      addBox.append(h('p', { class: 'on-list', text: `On your list for ${servingsWords(onList)}.` }), h('a', { class: 'btn wide', href: '#/list', text: 'Open list' }));
    } else {
      addBox.append(
        h('p', { class: 'on-list', text: `On your list for ${servingsWords(onList)}.` }),
        h('button', { type: 'button', class: 'btn primary wide', text: `Change list to ${servingsWords(servings)}`, on: { click: add } }),
      );
    }
  }

  function drawServings() {
    amount.textContent = servingsWords(servings);
    minus.disabled = servings <= SERVINGS_MIN;
    plus.disabled = servings >= SERVINGS_MAX;
    familyButton.setAttribute('aria-pressed', String(servings === family));
    if (writtenButton) writtenButton.setAttribute('aria-pressed', String(servings === recipe.serves));
    scaledNote.hidden = !isScaled(recipe, servings);
    ingredients.replaceChildren(
      ...cookIngredients(recipe, servings, rules).map((line) => h('li', { class: line.kind === 'heading' ? 'ing-heading' : null, text: line.text })),
    );
    drawAddBox();
  }

  function choose(count) {
    servings = clampServings(count);
    drawServings();
  }

  // ---- cook mode ----

  const cookButton = h('button', { type: 'button', class: 'btn cook-toggle', 'aria-pressed': 'false', text: 'Cook mode', on: { click: () => setCooking(!cooking) } });
  const cookStatus = h('p', { class: 'cook-status', hidden: true });
  const SLEEP_ADVICE = 'This phone will not keep the screen on for this app. In Settings, Display & Brightness, set Auto-Lock to Never while you cook.';

  function setCooking(on) {
    if (cooking === on) return;
    cooking = on;
    document.body.classList.toggle('cook', on);
    cookButton.setAttribute('aria-pressed', String(on));
    cookButton.textContent = on ? 'Leave cook mode' : 'Cook mode';
    cookStatus.hidden = !on;
    if (!on) {
      app.wakeLock.release();
      return;
    }
    cookStatus.textContent = 'Tap a step when it is done.';
    if (!app.wakeLock.supported) {
      cookStatus.textContent = `Tap a step when it is done. ${SLEEP_ADVICE}`;
      return;
    }
    app.wakeLock.acquire().then((held) => {
      if (!cooking) return;
      cookStatus.textContent = held ? 'The screen will stay on. Tap a step when it is done.' : `Tap a step when it is done. ${SLEEP_ADVICE}`;
    });
  }

  const steps = setTrustedHtml(h('div', { class: 'html steps' }), recipe.steps_html);
  steps.addEventListener('click', (event) => {
    if (!cooking || event.target.closest('a')) return;
    // The numbered step that was tapped, even when the tap landed on a list inside it.
    let step = event.target.closest('li');
    while (step && step.parentElement.closest('li')) step = step.parentElement.closest('li');
    if (!step || step.parentElement.tagName !== 'OL') return;
    step.classList.toggle('done');
  });

  // ---- the card ----

  const facts = [h('div', { text: `Serves ${recipe.serves}${recipe.serves_basis === 'estimated' ? ' (estimated)' : ''}` })];
  if (recipe.time) facts.push(h('div', { text: `Time: ${recipe.time}` }));
  if (recipe.yield) facts.push(h('div', { text: `Makes: ${recipe.yield}` }));
  if (recipe.source) facts.push(h('div', {}, 'Source: ', webLink(recipe.source, recipe.source_url)));

  const fromList = app.previousRoute && app.previousRoute.name === 'list';
  const incomplete = recipe.status === 'partial' || recipe.status === 'needs-check';

  const node = h(
    'article',
    { class: 'screen recipe' },
    h('div', { class: 'recipe-bar' }, h('a', { class: 'back', href: fromList ? '#/list' : '#/', text: fromList ? '‹ List' : '‹ Book' }), cookButton),
    cookStatus,
    h('h1', { text: recipe.title }),
    recipe.description ? h('p', { class: 'desc', text: recipe.description }) : null,
    h('div', { class: 'facts' }, facts),
    incomplete ? h('p', { class: 'banner', text: 'Some details are missing. See Notes.' }) : null,
    h(
      'section',
      { class: 'servings', 'aria-label': 'Servings' },
      h('div', { class: 'stepper' }, minus, amount, plus),
      h('div', { class: 'shortcuts' }, familyButton, writtenButton),
    ),
    h('h2', { text: 'Ingredients' }),
    scaledNote,
    ingredients,
    addBox,
    h('h2', { text: 'Steps' }),
    steps,
    recipe.notes_html ? h('h2', { text: 'Notes' }) : null,
    recipe.notes_html ? setTrustedHtml(h('div', { class: 'html notes' }), recipe.notes_html) : null,
    recipe.sections.map((section) => h('details', { class: 'extra' }, h('summary', { text: section.title }), setTrustedHtml(h('div', { class: 'html' }), section.html))),
  );

  drawServings();

  return {
    node,
    leave() {
      setCooking(false);
    },
  };
}
