# Build brief: Recipe Book app, v1

Draft 1, 2026-11-23. Written for Claude Code by the repo owner ("I"). Read the whole file before changing anything. Modeled on the brief that built the Kalita Wave app (`RafRTZ/Kalita-Wave`); where this brief is silent, follow that repo's working habits (next/ and promote, deploy key, plain-language reports).

## 0. Kickoff (do this first, change nothing else)

1. If this file is not already at `docs/BUILD_BRIEF.md` in the repo, copy it there unchanged from `/Users/ryanfritz/Documents/Claude-Workspace/Projects/Personal/Recipes/Recipe-Book-App-Brief.md`. Never summarize or reword it.
2. Check tooling without installing anything: `git status`, `git remote -v`, `node -v`, and that the export command in section 5 runs.
3. Set this repo's commit identity before the first commit: `git config user.name "Ryan Fritz"` and `git config user.email <id>+RafRTZ@users.noreply.github.com`, with `<id>` read from `https://api.github.com/users/RafRTZ`. Confirm with me before committing. (The Kalita history carries a personal email; this repo must not.)
4. Reply with: (a) anything in this brief that is ambiguous, contradictory, or a mistake, (b) which Owner inputs in section 2 are still TBD, (c) your proposed file layout and order of work.
5. Wait for my OK. Then create `CLAUDE.md` (60 lines max: the rules in section 3, the commands, pointers into `docs/`) and start Milestone 1.

## 1. Context

**What exists.** The family recipe collection lives outside this repo, as one markdown card per recipe in my Claude workspace (`Projects/Personal/Recipes/Cards/`, 48 cards on 2026-11-23). The cards are the source of truth and are only ever edited there. A Python export in the workspace turns them into two JSON files in this repo's `data/` folder (section 5). This repo is the app that reads them.

**Who uses it.** Two people, Cristin and me, each on an iPhone, from a Home Screen icon. Three moments: finding a recipe (often on the couch, deciding what to make), cooking from it (phone propped on the kitchen counter, hands messy, glancing from a step away), and shopping (in a grocery store, where cell signal is often weak or gone). Cristin reads, cooks, and makes lists; she never edits recipes. Neither of us should ever need Claude to use the app.

**Me.** Not a developer. Comfortable directing Claude Code, a beginner with GitHub, and I use GitHub Desktop. I want something I can maintain by asking you, with as few moving parts as possible.

**What I want, in priority order.**
1. Find a recipe fast: search and browse by category.
2. Cook from it: the full card, readable at arm's length, with a servings picker that rescales the ingredients.
3. Make a shopping list: pick a few recipes and serving counts, get one merged list I can check off, copy, or share into my Reminders grocery list.
4. Works with no signal, from the last copy on the phone.

## 2. Owner inputs

If one of these is still TBD when you reach the part that needs it, ask me. Do not guess.

| Input | Value |
|---|---|
| Repo | `RafRTZ/Recipe-Book`, public, GitHub Pages from `main`, root. Site: https://rafrtz.github.io/Recipe-Book/ |
| Public site | Fine (decided 2026-11-23). Every page carries `noindex`. No photos or PDFs, ever |
| Home Screen name | Recipes |
| Users and devices | Ryan and Cristin, iPhones, Home Screen mode. iOS versions: TBD (wake lock needs iOS 18.4 or later in Home Screen apps) |
| Who edits recipes | Nobody, in the app. Recipes change only through the workspace and the export |
| Shopping list | One per phone, never shared or synced. Copy and Share send it out as plain text |
| Default servings for a family dinner | 3 (comes in the data file as `rules.default_servings`) |

## 3. Rules

1. **Never break the live app.** Edit app code only under `next/`. The root app files change only when I say "promote", and only through `scripts/promote.sh`.
2. **Pushes.** A push that changes the live app needs my word "promote". Other pushes (`next/`, tests, docs, data) go out when ready: check the live app files are untouched, push, tell me what went out.
3. **`data/` is written only by the export command** (section 5). Never edit `data/recipes.json` or `data/parity.json` by hand, and never "fix" a failing test by changing them.
4. **Never write into my workspace** (`/Users/ryanfritz/Documents/Claude-Workspace/`). From this repo you may read it only by running the export command. If the data contract in section 5 needs to change, stop and tell me; that change is made in a Recipes session in the workspace, not here.
5. **No secrets, no private material.** The repo is public. No photos, PDFs, email addresses, or anything from the workspace beyond what the export writes. No `.env` files. No keys in chat.
6. **Ask before installing anything on my Mac.** Say what it is and why.
7. **No build step, no framework, no runtime CDN.** Plain HTML, CSS, and ES modules. Nothing third-party is expected; if something is needed, ask, then vendor it pinned with its version and source URL.
8. **Shopping logic is pure and exact.** Everything in `next/app/engine/` is plain functions with no DOM, storage, or network. Quantities are exact fractions (integer numerator and denominator), never floating point. The shopping list must match `data/parity.json` line for line, and the cook-view examples in 6.2 are normative. If your output differs, your code is wrong or this brief is ambiguous: stop and tell me which.
9. **Say what you could not verify.** Home Screen mode, offline in a store, wake lock, the share sheet, and pasting into Reminders cannot be proven on a Mac. Put them on my device checklist; never report them as working.
10. **Stop at every checkpoint** and report in the format in section 9.
11. **When this brief is ambiguous or wrong, stop and ask.** Record the answer in `docs/DECISIONS.md`.
12. No open-source license file. No analytics. No third-party brand logos. `<meta name="robots" content="noindex, nofollow">` on every page (a `robots.txt` in a project site is ignored by crawlers, so the meta tag is the control).

## 4. Architecture (decided)

```
index.html, app/, assets/, manifest.webmanifest, sw.js   live app (written only by scripts/promote.sh)
data/recipes.json, data/parity.json                     written only by the export; read by live and next
next/                                                   the only place app code is edited
  index.html  app/engine/  app/ui/  app/platform/  assets/  manifest.webmanifest  sw.js
tests/                                                  node --test
scripts/promote.sh, scripts/serve.mjs
docs/                                                   BUILD_BRIEF.md, DECISIONS.md, TESTING.md
CLAUDE.md
```

- `next/` is served at https://rafrtz.github.io/Recipe-Book/next/ after a push; that is how I test on a phone without touching the live app. Both copies read the one `data/recipes.json`, so a data push updates both with no promote.
- **Storage** keys are namespaced by channel and version (`rb:next:v1:...`, `rb:live:v1:...`) so the test copy never touches the live copy's list.
- **Offline.** Each copy has its own service worker, scoped to its own folder, with cache names that include the channel and app version. The app shell is cache-first. `data/recipes.json` is stale-while-revalidate: the app opens at once from the cached copy, fetches in the background, and if the `version` changed, shows the new recipes (or a one-tap "New recipes, refresh"). Nothing ever waits on the network; a dead connection in a store must still open the book and the list. The app version and the data's `updated` date and `count` show in a small About line.
- **Schema guard.** The app checks `schema` in the data file. If it is newer than the app understands, keep using the cached copy and show one plain line: "The recipe file is newer than this app. Update the app."
- **No backend, no accounts, no sync.** The list lives in the phone's local storage.
- Show the app version (`APP_VERSION` in `next/app/platform/`) in About; bump it with every change I will test on a phone.

## 5. Data contract (schema 1, owned by the workspace)

**Export command** (run from anywhere; writes both files, prints a one-line summary):

```
/Users/ryanfritz/.venvs/claude-ws/bin/python3 -I /Users/ryanfritz/Documents/Claude-Workspace/Projects/Personal/Recipes/scripts/build_book.py /Users/ryanfritz/Documents/Claude-Workspace/Projects/Personal/Recipes/Cards /Users/ryanfritz/GitHub/Recipe-Book/data
```

It refuses to write if a card fails its checks or if the output would carry a local path, a photo or PDF path, a `_Reference` link, or an email address. With no card changes it writes byte-identical files, so git stays clean.

**`data/recipes.json`**

- Top level: `schema` (1), `version` (12-character content hash), `updated` (ISO date the content last changed), `count`, `categories` (display order), `rules`, `recipes`.
- `rules`: `default_servings` (3), `to_base` (`tsp` 1, `Tbsp` 3, `cup` 48, `oz` 1, `lb` 16), `family` (`tsp`, `Tbsp`, `cup` are `vol`; `oz`, `lb` are `wt`), `whole_units` (list, `null` included, meaning no unit), `step` (per unit, as `[numerator, denominator]`).
- Each recipe: `id` (stable, lowercase, from the card's file name; use it in URLs and in the saved list), `title`, `category`, `tags[]`, `serves` (whole number), `serves_basis` (`stated` or `estimated`), `yield`, `time`, `source`, `source_url`, `status` (`complete`, `partial`, `needs-check`), `description`, `ingredients[]`, `steps_html`, `notes_html`, `sections[]` (`{title, html}`: other, earlier, or lighter versions and side recipes, never scaled).
- `ingredients[]` holds three kinds of entry, in card order:
  - `{heading}`: a sub-heading such as "For the dough".
  - `{text}` alone: a line with no leading quantity ("Salt and pepper, to taste"); shown as written, never scaled.
  - `{text, qty, unit, unit_text, item, item_scaled, size, key, family, shop_item}`, plus `qty_low` for a range: a scalable line. `qty` and `qty_low` are `[numerator, denominator]`; `qty` is the high end of a range. `unit` is normalized or `null`; `unit_text` is the unit as written. `size` is a package size such as "(14.5 oz)". `item_scaled` is the item with number-bearing parentheticals removed. `key`, `family`, and `size` are the merge key; `shop_item` is the printed shopping name.
- The `*_html` fields are generated by the export from our own cards and are safe to insert as HTML. Every other string is text: set it with `textContent`, never `innerHTML`. Links to other cards arrive as `#/recipe/<id>`; web links open outside the app.

**`data/parity.json`**: `schema`, `version`, `cases[]` of `{name, items: [{id, servings}], scaled[], unscaled[]}`. The lines are exactly what the workspace `shop` command prints for those cards and servings (284 cases on 2026-11-23: every card at several counts, neighbouring pairs, and every card at once). Test fixtures only; the app never loads this file.

## 6. Milestone 1: the app

### 6.1 Book (home)

- Search box at the top, matching title, tags, ingredient text, and source, as you type.
- Category chips in `categories` order, plus All. Recipes listed by title within each category.
- Each row: title, time if any, serves, and a small badge for `partial` ("Missing info") or `needs-check` ("Check").
- The About line at the bottom (section 4).

### 6.2 Recipe and cook view

- Title, description, then serves, time, yield, and source (linked when `source_url` is set). For `partial` or `needs-check`, a plain banner: "Some details are missing. See Notes."
- **Servings picker**: a stepper from 1 to 60, starting at the card's `serves`, with a one-tap "Family dinner (3)". At the card's own count every line shows exactly as written (`text`). At any other count, scalable lines show `qty`, `size`, `unit_text`, `item_scaled`, and a line above the ingredients reads "Scaled from N servings. Steps and notes keep the original amounts."
- **Cook-view rounding** (for reading while cooking, different from shopping, which rounds up). Factor is servings / serves, exact. Round to the nearest step, halves up, never below one step: `tsp` 1/8, `Tbsp` 1/2, `cup` 1/4, `lb` 1/4, `oz` 1, `pinch` and `dash` 1, `g` and `ml` 1 (0.5 below 10, shown as a decimal such as 7.5), whole units (`whole_units`, including no unit) 1/2, anything else 1/4. Fractions print as mixed numbers ("1 1/4"). A range scales both ends and prints "a to b".
- **Worked examples (normative):**

| Recipe (serves) | Servings | Line as written | Shown |
|---|---|---|---|
| Grandma's Chili (12) | 6 | 1 lb sirloin | 1/2 lb sirloin |
| Grandma's Chili (12) | 6 | 29 oz Hunt's Traditional Sauce | 15 oz Hunt's Traditional Sauce |
| Grandma's Chili (12) | 6 | 3 jalapenos | 1 1/2 jalapenos |
| Pumpkin Soup (5) | 3 | 2 cups cooked pumpkin | 1 1/4 cups cooked pumpkin |
| Pumpkin Soup (5) | 3 | 1 1/2 tsp salt | 7/8 tsp salt |
| Pumpkin Soup (5) | 3 | 1/4 tsp curry powder | 1/8 tsp curry powder |
| Sourdough Sandwich Bread (Pullman) (28) | 14 | 15 g fine sea salt | 7.5 g fine sea salt |
| Sourdough Sandwich Bread (Pullman) (28) | 14 | 305 g water, warmed or cooled so the dough lands near 78 F | 153 g water, warmed or cooled so the dough lands near 78 F |
| Guacamole (24) | 2 | 8 avocados (make sure they are ripe) | 1/2 avocados (make sure they are ripe) |

- Steps, then Notes, then each extra section under its title, collapsed by default.
- **Add to list** with the picker's current count. If the recipe is already on the list, update its count instead.
- **Cook mode** (a toggle): larger text, tap a step to dim it as done, and hold a screen wake lock while on, re-acquired when the page becomes visible again. Feature-detect; if wake lock is missing, one line of advice. Leaving the recipe ends cook mode.

### 6.3 Shopping list

- The recipes on the list, each with its servings stepper and a remove control.
- The merged list: the scaled lines, in parity order, each with a checkbox (checked means got it or already have it) and the recipe names in small text. Then "Check by hand": the unscaled lines with their recipe names, also checkable.
- **The engine function that builds the list must reproduce every `parity.json` case exactly**, as the same strings (`- <qty> <size> <unit> <shop_item> (<titles>)`). The rules, all exact: factor = servings / serves; merge by (`key`, `family`, `size`) in first-seen order; add `qty x factor x to_base[unit]` (1 for units not in `to_base`); the printed name is the first line's `shop_item`; the printed unit is the largest-`to_base` unit seen, or none if the lines had none; quantity rounds up: whole units to a whole number, units in `step` up to the next step, everything else up to a whole number (at least 1); sort by `key`, stable, comparing strings by code point (not `localeCompare`); titles sorted the same way and joined with ", ". Unscaled lines are `- <text> (<title>)` in recipe and card order.
- **Copy** puts the unchecked items on the clipboard as plain text, one per line, no bullets, no recipe names. **Share** sends the same text through the share sheet. Clear checked, and Clear list (with a confirm).
- One list per phone, saved in local storage. Entries whose `id` no longer exists after a data update are dropped with one line saying which.

### 6.4 Readability and Home Screen

- Follows the phone's light or dark setting. Body text at least 17 px, nothing under 14 px, every text and background pair at least 4.5:1, touch targets at least 48 px (56 in cook mode). Cook mode body text at least 22 px.
- Web app manifest, a simple original icon, `apple-touch-icon`, standalone display, name "Recipes".

### 6.5 Acceptance and Checkpoint 1

- `node --test` passes, including every `parity.json` case, the 6.2 examples, and the schema guard.
- Every recipe opens; every link inside `*_html` to another card opens that card.
- The live root holds only a placeholder until the first promote (the first promote publishes the app).
- `docs/TESTING.md` has my device checklist for two iPhones in Home Screen mode: add to Home Screen; open in airplane mode after one online open; search and open a recipe; servings picker on a baking recipe in grams; cook mode keeps the screen on through 10 minutes; build a three-recipe list; Copy, then paste into the Reminders grocery list (note whether each line becomes its own reminder); Share into Reminders and into Messages; a data update shows up on the next online open; text readable from a step away.
- **Checkpoint 1: stop.** I test `/next/` on both phones. After fixes, I say "promote".

## 7. Updating recipes (after Checkpoint 1)

When a card changes in the workspace, a Recipes session runs the export, then commits only `data/` (`git -C /Users/ryanfritz/GitHub/Recipe-Book commit -m "Recipes: <what changed>" -- data/`) and pushes with the deploy key. Before pushing, it checks `git log origin/main..main`: if anything other than its own data commit is waiting, it does not push and tells me. That step is in the workspace's Recipes `CLAUDE.md` (section "Recipe book app", approved 2026-11-23); on a machine without this repo it is skipped and caught up by the next export on the laptop. Nothing in this repo has to change for it.

## 8. Not now (leave room, build nothing)

- Editing recipes in the app; accounts; a shared or live list between phones.
- Photos of the original cards or cookbook pages (they stay private in the workspace).
- Meal planning for the week, "what can I make with X", nutrition, comments back to the workspace.
- A native iPhone app.

## 9. Checkpoint report format

1. What changed, in plain language, five lines or fewer.
2. Test output, pasted.
3. What you could not verify and why.
4. My device checklist for this checkpoint.
5. Decisions you made that I did not specify, and open questions.
6. The exact next step, and what a push would change on the live site.

## 10. References

- GitHub Pages sites are public even from a private repo; private sites need Enterprise Cloud: https://docs.github.com/en/enterprise-cloud@latest/pages/getting-started-with-github-pages/about-privately-published-github-pages-sites
- Creating a GitHub Pages site: https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site
- Screen Wake Lock in Home Screen web apps, iOS 18.4: https://webkit.org/blog/16574/webkit-features-in-safari-18-4/
- The Kalita Wave repo, for working habits: `/Users/ryanfritz/GitHub/Kalita-Wave/CLAUDE.md` and its `docs/DECISIONS.md` (deploy key setup).
