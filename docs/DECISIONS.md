# Decisions

Answers to questions the build brief left open. Newest section last. If something here disagrees with
`BUILD_BRIEF.md`, this file wins, because it records what the owner said after the brief was written.

## Kickoff, 2026-11-23 (owner: "OK, use defaults")

### What the kickoff did

- The brief was copied to `docs/BUILD_BRIEF.md` byte for byte.
- The folder was not a git repo, so `git init` was run (branch `main`) and `origin` was added over https,
  the same way the Kalita Wave repo has it.
- The commit identity for this repo only is `Ryan Fritz` with GitHub's no-reply address for the account.
  The Mac's global git email was not touched.
- The export refused to run until `data/` existed. The brief does not say so. The empty folder was made
  by hand once and the export then wrote 48 recipes and 284 parity cases, the same bytes on a second run.
- The rules of brief 6.2 and 6.3 were tried against the real files before anything was built: all 284
  parity cases matched line for line, and all nine worked examples matched.

### Questions with an agreed default

1. **Placeholder at the root.** Brief 6.5 wants a placeholder there, and rule 1 says root files change only
   through `promote.sh`. The placeholder `index.html` is written by hand once. Its first push does not need
   the word "promote". From the first promote on, the root changes only through the script.
2. **The brief is public.** `docs/BUILD_BRIEF.md` is committed. It carries the Mac user name inside file
   paths, both first names, and workspace folder names. Accepted, as it was for Kalita Wave.
3. **What noindex cannot cover.** Only HTML pages can carry the robots tag. `data/recipes.json` (every
   recipe in full), the brief, and the other plain files are served without it, and GitHub Pages has no
   setting that adds it. Accepted.
4. **Data pushes are not tested first.** Brief section 7 pushes `data/` to both copies with no test run.
   Suggested to the owner: the workspace step should run `node --test` in this repo and not push if it
   fails. That is a change for a Recipes session in the workspace, not for this repo.
5. **Commit trailer.** Commits made by Claude end with a "Co-Authored-By" line that holds a no-reply
   address. Kept, as it was for Kalita Wave.
6. **"Clear checked".** The list is worked out from the recipes on it, so a checked line cannot be
   deleted. "Clear checked" unticks every box.
7. **A tick when the amount changes.** A tick belongs to the line as it is printed. If the amount on that
   line changes later (a recipe added, a serving count changed), the tick is cleared, because "already
   have it" may no longer be true.
8. **Copy and Share.** They send the unticked merged lines, then the unticked "Check by hand" lines as
   written. No bullets and no recipe names.
9. **New recipes while the app is open.** The app shows a one-tap line, "New recipes. Refresh", and never
   swaps the recipes under the reader. A new app version is offered the same way. Either one is simply in
   use the next time the app is opened.
10. **Singular and plural.** At a scaled count the app swaps the unit word to match the amount: "cup" and
    "cups", "can" and "cans", and so on. Only unit words are swapped. Item words stay as written, so
    "1/2 avocados" still reads as the brief's example does. This departs from the letter of brief 6.2,
    which shows `unit_text` as written.
11. **A range whose two ends round to the same number** is shown as one number: "1/2", not "1/2 to 1/2".
12. **Tests for the worked examples.** They run on a frozen copy of the nine lines, kept in
    `tests/fixtures/`, so an edit to one of those cards cannot fail a test while the app is unchanged. The
    parity tests always run on the current `data/` files.
13. **The test copy's name.** On `/next/` the page suggests "Recipes Next" for the Home Screen.

### Found in the data, for a Recipes session in the workspace

14. Six lines have a stray space before a comma in `item_scaled`, for example "seedless cucumber ,
    peeled and thinly sliced". The cards: Honey Soy Tuna with Asian Cucumber Salad, Shrimp Saganaki,
    Sourdough Cinnamon Rolls, and Sourdough Discard Waffles (three lines). It shows in the cook view at
    any scaled count. The app does not patch it, so the fix belongs in the export.

### Owner inputs still to come

- **iOS versions of the two phones.** Cook mode's wake lock needs iOS 18.4 or later in a Home Screen app.
  The Kalita Wave notes record one phone on iOS 27.2.1 on 2026-11-20 and do not say which phone.

### Readings of the brief

- In the shopping list the printed unit is the normalised one ("cup", never "cups"), as the parity file
  has it.
- A recipe's title appears once on a merged line even when two of its own lines merged into it.
- A range shops at its high end.
- When the units on a merged line are not in `to_base`, the first one seen is printed.
- The cook-view steps of brief 6.2 are constants in the app. `rules.step` in the data file belongs to the
  shopping list and has no entry for `oz`, `g`, or the whole units. A change to cook-view rounding is an
  app change, not a data change.
- "0.5 below 10" for grams and millilitres is judged on the exact scaled amount, before rounding.
