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

## Pushing with a key for this one repo, 2026-11-23

- **The owner asked for it at the start:** a deploy key for this repo only, set up the way the Kalita
  Wave notes describe. Nothing was installed.
- **What was set up on this Mac.** A new key pair: the private half is the file
  `~/.ssh/recipe_book_deploy`, with no passphrase so a push needs nobody at the keyboard; the public half
  is beside it with `.pub`. Its fingerprint is `SHA256:zKf8Rn631hHLjmsK13NRZCEC+P53aE7OCQewqV0+gEM`. The
  Kalita Wave key could not be reused: GitHub lets a deploy key belong to one repo only. GitHub's own
  server keys, fetched from `https://api.github.com/meta`, are in `~/.ssh/recipe_book_known_hosts`; they
  are the same three keys the Kalita Wave file holds. In this repo's local git settings (not committed)
  there is a second remote named `deploy` that pushes over SSH with that key. The `origin` remote that
  GitHub Desktop uses is plain https and is unchanged.
- **The owner's part.** Adding the public half to the repo on GitHub: Settings, Deploy keys, Add deploy
  key, with "Allow write access" ticked. Until that is done the key opens nothing. The public half is
  not pasted into the chat (brief rule 5); `pbcopy < ~/.ssh/recipe_book_deploy.pub` puts it on the
  clipboard.
- **How to push with it.** `git push deploy main`, then `git fetch origin` so git's picture of GitHub is
  up to date (brief section 7 relies on that picture), then check the site.
- **How to take it away.** Delete the key on that same GitHub page. To clean up the Mac as well: delete
  the two key files and the known hosts file, and run `git remote remove deploy` and
  `git config --unset core.sshCommand` in the repo.
- **When a push needs a word.** As brief rule 2 has it: a push that changes the live app needs
  "promote". Pushes of the test copy, tests, docs, and data go out when ready, and the owner is told
  what went out.

## Milestone 1 build, 2026-11-23 (version 1.0.0-m1.1)

### Decisions made while building (the brief did not specify these)

- **Who keeps the saved recipe file.** The page does, in a store of its own named `rb-<channel>-data`,
  not the service worker. The brief's "stale while revalidate" is done there: open at once from the
  saved copy, download behind the screen, compare versions. This way a file with a newer schema is
  looked at and refused before it can replace the copy that works.
- **The service worker** serves only the files in its own list and passes everything else to the
  network. The live copy's worker therefore never answers for `next/` or `data/`, though both sit
  inside its folder. An install is all or nothing. A new version waits until the reader taps Refresh on
  the "App updated." line, or until the app is next opened from cold.
- **Two version numbers that must match.** `APP_VERSION` in `channel.js` and `VERSION` in `sw.js`. A
  test fails if they differ, or if a file under `next/` is missing from the worker's list.
- **When the app looks for news.** At every open, and again when the reader comes back to it after a
  minute or more away.
- **With no recipe file at all** the app shows one of three plain messages (no connection yet, file
  newer than the app, file unreadable) and a "Try again" button.
- **Book.** Under "All" the recipes sit under category headings in the file's order. Search results stay
  grouped the same way. A search needs every word typed, ignores capitals and accents, and looks at
  headings inside the ingredient list too. The search, the chip, and the scroll position are remembered
  while the app stays open.
- **Recipe.** "Serves 12 (estimated)" when the card's count is an estimate. An "As written (N)" button
  sits beside "Family dinner (3)". The picker starts at the card's count each time a recipe is opened.
  The Add button reads "Add to list (6 servings)", then "On your list for 6 servings." with "Open
  list", or "Change list to 8 servings" when the picker has moved.
- **Cook mode.** It hides the two tabs, the description, the facts, and the Add button, and sets the
  ingredients and steps at 23 px. A tapped step turns grey and stays grey until the recipe is left.
  When the phone gives no wake lock, the line reads: "This phone will not keep the screen on for this
  app. In Settings, Display & Brightness, set Auto-Lock to Never while you cook."
- **Shopping list lines print exactly as the workspace prints them**, so a line reads "1 1/2 cup chicken
  stock". The unit-word swap of kickoff item 10 is for the cook view only. Changing it on the list would
  break parity, so it would be a workspace change.
- **Shopping list screen.** Each of its two parts counts its own lines ("23 lines", then "20 of 23
  left"). Share shows only when the phone offers a share sheet. "Clear list" asks on the page itself,
  with "Yes, clear the list" and "Keep it". A recipe's title on the list opens the recipe.
- **What is stored.** One entry, `rb:<channel>:v1:list`: the recipes on the list (id, servings, title)
  and the ticks. The title is kept so that a recipe that leaves the book can be named when it is
  dropped.
- **Exact arithmetic** uses whole numbers of any size (BigInt), so a sum over many cards cannot overflow.
- **A new unit word on a card** ("pint", say) fails a test until it is added to the app's short list of
  unit words. The app itself would simply show the word as written.
- **Look.** A green accent on warm paper, and a dark set of colours that follows the phone. The icon is
  a cream bowl with three wisps of steam on the green.
- **Local server.** Port 8081, so it can run beside the Kalita Wave server. It has test modes
  (`/__test?recipes=newer`, `changed`, `fewer`, `down`, `normal`) that swap the recipe file in memory,
  for trying the schema guard and a dead connection. Nothing on disk changes.
- **Extra files.** `.claude/launch.json`, `scripts/make-icons.mjs`, `.nojekyll`, `.gitignore`, and
  `tests/fixtures/cook-examples.json`.

### Checked on the Mac

- 141 tests pass. In a throwaway copy, 27 mistakes were made on purpose, one at a time, and each was
  caught by at least one test.
- In a desktop browser at 402 by 790 and 375 by 647, in light and in dark: the Book, search, chips, a
  recipe, the picker, cook mode, the list, ticks, Copy, Clear checked, and Clear list. All 48 recipes
  open, none scrolls sideways, and the list with every card on it shows 360 lines and 59 by hand, the
  same counts as the parity file.
- With the local server switched off, the app opened straight into a recipe from what the browser had
  kept.
- "New recipes." and its Refresh, a recipe dropped from the list and named, the schema guard with and
  without a saved copy, and "App updated." with its Refresh were each produced and seen.
- The promote script was run in a throwaway copy, not in this repo. The promoted files matched the test
  copy byte for byte, and in a browser the two copies kept separate files, separate lists, and separate
  service workers.

### Not verified

Anything on an iPhone. The list is in `docs/TESTING.md`.

### Open questions for the owner

1. The iOS versions of the two phones.
2. The servings picker moves one serving per tap, so the Pullman bread from 28 to 14 is 14 taps. A hold
   that repeats, or a number that can be typed, could be added if wanted.
3. For a Recipes session in the workspace: kickoff items 4 and 14. Also, three Source links are plain
   `http` (Easy Artisan Bread, Quinoa Salad with Kale, Pine Nuts, and Parmesan, Zesty Lime Shrimp and
   Avocado Salad). They open outside the app either way.

## The key was added, and the first push, 2026-11-23

- **Adding the key.** The owner's first try pasted the key's fingerprint into GitHub's Key box and asked
  "is this correct? what was I supposed to do with that copy from step 1?". The instructions had not
  made clear that the copy command was to be run, not copied. Claude then ran it, which put the public
  half on the clipboard, and the owner pasted that and answered "Added". GitHub then accepted the key
  from this Mac.
- **The first push.** `main` was created on GitHub with six commits, the newest `b98dce9`. Before it:
  the working tree was clean and all 141 tests passed. After it, checked on GitHub: six commits, every
  author and committer address is the account's no-reply address, and each commit is linked to the
  account. `git fetch origin` was run, and `main` follows `origin/main`.
- **What the push put on GitHub.** The brief, the first export, the rules and notes, the placeholder at
  the root, and the app under `next/` at version 1.0.0-m1.1. No promote was involved.
- **Pages was still off** when this was written, so the site answered "not found". Turning it on is the
  owner's step: Settings, Pages, "Deploy from a branch", `main`, `/ (root)`, Save.
