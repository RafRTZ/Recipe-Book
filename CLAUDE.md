# Recipe Book app

Static web app on GitHub Pages (https://rafrtz.github.io/Recipe-Book/), used by two people on iPhones from
a Home Screen icon. The owner is not a developer: explain in plain language, and ask when unsure. Put steps
for the owner in the chat itself, numbered, with the exact setting and button names.

- Full spec: `docs/BUILD_BRIEF.md` (read it before changing anything).
- Answers and decisions since the brief: `docs/DECISIONS.md`. Where the two disagree, DECISIONS wins.
- The owner's iPhone checklist: `docs/TESTING.md`.

## Rules (brief section 3)

1. Never break the live app. Edit app code only under `next/`. The root app files (`index.html`, `app/`,
   `assets/`, `manifest.webmanifest`, `sw.js`) change only when the owner says "promote", and only through
   `scripts/promote.sh`.
2. A push that changes the live app needs the owner's word "promote". Other pushes (`next/`, tests, docs,
   data) go out when ready: check the live app files are untouched, push, tell the owner what went out.
3. `data/` is written only by the export command. Never edit `data/recipes.json` or `data/parity.json` by
   hand, and never fix a failing test by changing them.
4. Never write into the owner's workspace. Read it only by running the export command. If the data
   contract (brief section 5) needs to change, stop and tell the owner: that is a workspace job.
5. No secrets, no private material; the repo is public. No photos, PDFs, email addresses, or `.env` files.
   No keys in chat. Commits use this repo's no-reply identity; never change it.
6. Ask before installing anything on the Mac.
7. No build step, no framework, no runtime CDN. Plain HTML, CSS, and ES modules. Nothing third-party
   without asking; if allowed, vendor it pinned with its version and source URL.
8. Shopping logic is pure and exact. `next/app/engine/` has no DOM, storage, or network. Quantities are
   exact fractions, never floating point. The list must match `data/parity.json` line for line, and the
   cook-view examples in brief 6.2 are normative. If output differs, stop and say which is wrong.
9. Say what could not be verified. Home Screen mode, offline in a store, wake lock, the share sheet, and
   pasting into Reminders cannot be proven on a Mac. They go on the device checklist.
10. Stop at every checkpoint and report in the format of brief section 9.
11. When the brief is ambiguous or wrong, stop and ask. Record the answer in `docs/DECISIONS.md`.
12. No license file, no analytics, no third-party logos. Every page carries
    `<meta name="robots" content="noindex, nofollow">`.

## Commands

- Run tests: `node --test` (Node's built-in runner, no dependencies). They must pass before every commit.
- Serve locally: `node scripts/serve.mjs`, then open http://localhost:8081/next/ (the root is the live copy).
- Promote, only when told: `sh scripts/promote.sh`.
- Regenerate icons after editing the drawing: `node scripts/make-icons.mjs`.
- Export recipes: the command in brief section 5, unchanged. The `data/` folder must already exist.

## Layout and conventions

- `next/app/engine/`: pure logic (fractions, cook scaling, shopping list, saved list, search, data checks).
  `next/app/platform/`: version and channel, storage, the recipe file, wake lock, copy and share.
  `next/app/ui/`: screens and `styles.css`. `tests/`: `*.test.js`, importing from `next/app/`.
- Storage keys are `rb:<channel>:v1:<name>`. The channel comes from the URL: `/next/` is `next`, anything
  else is `live`. Never read or write another channel's keys.
- Bump `APP_VERSION` in `next/app/platform/channel.js` and `VERSION` in `next/sw.js` together, with every
  change the owner will test on a phone. A new file under `next/` also goes in the list in `next/sw.js`.
- The `*_html` fields of the recipe file go in through `setTrustedHtml` only. Every other string is set
  with `textContent`.
- Colours are tokens in `styles.css` only. Body text 17 px or more, nothing under 14, contrast 4.5:1,
  touch targets 48 px (56 in cook mode).
- Writing style everywhere (UI, comments, docs, commits): plain, no en or em dashes, no emojis, no filler.
- Pushing: `git push deploy main` (a key for this one repo, see `docs/DECISIONS.md`), then
  `git fetch origin`. Then check `/next/` on the site and that the root app is unchanged.
