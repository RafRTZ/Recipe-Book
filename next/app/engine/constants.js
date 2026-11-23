// Numbers and word lists the engine uses. Shopping rules are NOT here: they arrive in the recipe file
// (`rules`) and are owned by the workspace. These are the app's own, from docs/BUILD_BRIEF.md.

/** The newest recipe file layout this app understands (brief section 5). */
export const SUPPORTED_SCHEMA = 1;

/** The servings picker (brief 6.2). */
export const SERVINGS_MIN = 1;
export const SERVINGS_MAX = 60;

/**
 * Cook-view rounding steps (brief 6.2), as [numerator, denominator]. For reading while cooking:
 * round to the nearest step, halves up, never below one step. Shopping rounds differently.
 */
export const COOK_STEP = Object.freeze({
  tsp: [1, 8],
  Tbsp: [1, 2],
  cup: [1, 4],
  lb: [1, 4],
  oz: [1, 1],
  pinch: [1, 1],
  dash: [1, 1],
});
export const COOK_STEP_WHOLE_UNIT = Object.freeze([1, 2]); // cans, cloves, and lines with no unit
export const COOK_STEP_OTHER = Object.freeze([1, 4]);

/** Grams and millilitres: whole numbers, or halves when the exact scaled amount is under 10. */
export const METRIC_UNITS = Object.freeze(['g', 'ml']);
export const METRIC_STEP = Object.freeze([1, 1]);
export const METRIC_SMALL_STEP = Object.freeze([1, 2]);
export const METRIC_SMALL_BELOW = 10;

/**
 * Unit words that change with the amount (docs/DECISIONS.md, kickoff item 10): singular up to 1,
 * plural above it. Only a unit written as one of these words is swapped. Abbreviations (tsp, Tbsp, oz,
 * lb, g) and the words of the item itself are left exactly as the card has them.
 */
export const UNIT_WORDS = Object.freeze([
  ['bag', 'bags'],
  ['bottle', 'bottles'],
  ['box', 'boxes'],
  ['bunch', 'bunches'],
  ['can', 'cans'],
  ['clove', 'cloves'],
  ['cup', 'cups'],
  ['dash', 'dashes'],
  ['head', 'heads'],
  ['jar', 'jars'],
  ['package', 'packages'],
  ['pinch', 'pinches'],
  ['quart', 'quarts'],
  ['slice', 'slices'],
  ['sprig', 'sprigs'],
  ['stalk', 'stalks'],
  ['stick', 'sticks'],
]);
