# Testing on the iPhones

This is the owner's checklist. Nothing on it can be proven on a Mac, so nothing on it counts as working
until it has been tried on a real phone. Do every item on both phones, from the Home Screen icon.

**Status, 2026-11-23:** version 1.0.0-m1.1 is built and passes its 141 tests on the Mac. It has been
clicked through in a desktop browser at phone sizes, in light and in dark. Nothing below has been tried
on a phone yet.

## Where things are

- **Test copy:** https://rafrtz.github.io/Recipe-Book/next/ gets every change first.
- **Live app:** https://rafrtz.github.io/Recipe-Book/ is a one-line placeholder until you say "promote".
- The capitals in `Recipe-Book` matter. The address in lower case is an error page.

## Set up each phone

1. Note the phone's iOS version (Settings app, General, About). Keeping the screen awake needs iOS 18.4
   or later.
2. Open the test copy link in Safari.
3. Tap Share, then Add to Home Screen. The name should already read "Recipes Next". If it reads
   "Recipes", type "Recipes Next", so it cannot be mixed up with the live icon later.
4. Open it from the new icon. From here on, always use the icon, not Safari. The icon and Safari each
   keep their own shopping list.
5. Scroll to the bottom of the Book. The small line should read
   "Recipes 1.0.0-m1.1, test copy. 48 recipes, updated 2026-11-23."

## Part 1: Checkpoint 1, version 1.0.0-m1.1

For each check, a "yes" or a "no, and what happened" is enough. Say which phone.

### Home Screen

- **H1.** The icon is a cream bowl with steam on green, and the name under it is "Recipes Next".
- **H2.** Opened from the icon, the app fills the screen with no Safari address bar or toolbar.
- **H3.** The two tabs at the bottom, Book and List, sit above the home bar and are not cut off. Nothing
  at the top is hidden under the clock or the camera.

### Finding a recipe

- **F1.** Type "chili" in the search box. Grandma's Chili is listed while you type, and the keyboard does
  not cover it in a way that stops you tapping it.
- **F2.** Type "jalapeno" with no accent. Recipes that use jalapenos are listed.
- **F3.** Tap Clear, then a category chip such as Seafood. Only that category shows. The row of chips
  scrolls sideways.
- **F4.** Open a recipe, then tap "Book" at the top left. You are back where you were in the list, with
  the same search or chip.
- **F5.** Recipes marked "Missing info" or "Check" show a yellow banner inside: "Some details are
  missing. See Notes."

### Cooking from it

- **C1.** Open Pumpkin Soup and tap "Family dinner (3)". The lines read "1 1/4 cups cooked pumpkin",
  "7/8 tsp salt", and "1/8 tsp curry powder", and a line above the ingredients says "Scaled from 5
  servings. Steps and notes keep the original amounts."
- **C2.** A baking recipe in grams: open Sourdough Sandwich Bread (Pullman) and tap "Family dinner (3)".
  The first lines read "7.5 g all-purpose flour", "7.5 g water", and "1 g ripe sourdough starter". Tap
  "As written (28)" and they read 71 g, 71 g, and 7 g again.
- **C3.** Plus and minus change the count one serving at a time, and stop at 1 and at 60.
- **C4.** Tap "Cook mode". The text gets larger, the two tabs at the bottom go away, and the line under
  the button reads "The screen will stay on. Tap a step when it is done." If it gives advice about
  Auto-Lock instead, note that and the phone's iOS version.
- **C5.** With cook mode on and Auto-Lock at its usual setting, leave the phone untouched for 10
  minutes. The screen stays on.
- **C6.** Still in cook mode, switch to another app for a moment and come back. Leave it 10 minutes
  again. The screen still stays on.
- **C7.** Tap a step. It turns grey. Tap it again and it is back. A tap with a knuckle works.
- **C8.** Prop the phone on the counter in cook mode and step back. The ingredients and steps can be
  read from a step away. Say so if the text should be larger still.
- **C9.** Tap "Leave cook mode", or tap "Book". The text is normal again, and the phone sleeps as usual
  afterward.

### Links

- **K1.** Open Pizza Dough and White Pizza and tap the link to the other pizza card. It opens inside the
  app.
- **K2.** Open Easy Artisan Bread and tap the Source link. The web page opens outside the recipe, and
  closing it brings you back to the recipe.

### The shopping list

- **L1.** Add three recipes: Pumpkin Soup at 3, Grandma's Chili at 6, and Guacamole at 6. The List tab
  reads "List (3)". The list has 23 lines under "To buy" and 1 under "Check by hand", and starts with
  "2 avocados (make sure they are ripe)".
- **L2.** Change a recipe's servings on the list with plus and minus. The amounts change.
- **L3.** Tick a few lines. They are struck through, and the count reads, for example, "20 of 23 left".
- **L4.** Swipe the app away and open it again. The three recipes and the ticks are still there.
- **L5.** Tap Copy. It says how many lines were copied. Open Reminders, open your grocery list, and
  paste. Note whether each line becomes its own reminder or everything lands in one. Ticked lines and
  recipe names should not be in what was pasted.
- **L6.** Tap Share and choose Reminders. Note what arrives: one reminder per line, or one reminder
  holding everything.
- **L7.** Tap Share and choose Messages. The list arrives as plain text, one line per item.
- **L8.** "Clear checked" unticks every box. "Clear list" asks first, and "Keep it" leaves the list
  alone.

### No signal

- **O1.** After the app has been opened once with a connection: swipe it away, turn on airplane mode,
  and open it from the icon. The Book opens, a recipe opens, and the list opens. Nothing complains.
- **O2.** Still in airplane mode: build a list, tick lines, and tap Copy. All of it works.
- **O3.** In a real store with weak signal, the app opens without a long wait.

### Light and dark

- **D1.** Switch the phone between light and dark (Control Center, long press on brightness). The app
  follows, and every line of text is easy to read in both.

### Updates (these need a later push, so they come after the first round)

- **U1.** After a recipe card has changed and the new recipe file has been pushed: open the app with a
  connection. A line at the top reads "New recipes." with a Refresh button. Allow up to 10 minutes
  after the push, and it may take a second open. Tap Refresh: the line at the bottom of the Book shows
  the new date.
- **U2.** After a new app version has been pushed: open the app with a connection. A line at the top
  reads "App updated." with a Refresh button, possibly on the second open. Tap it: the line at the
  bottom of the Book shows the new version, and your list is still there.

## Not verified yet

Everything in Part 1. The parts a Mac cannot stand in for at all:

- Home Screen mode: the name the phone suggests, the full-screen layout, and the safe areas at the top
  and bottom.
- Keeping the screen awake in cook mode. In the desktop browser the request was refused, so only the
  advice line has been seen; the "screen will stay on" line has not.
- Opening with no signal from a Home Screen icon. It works in a desktop browser with the server
  switched off.
- The share sheet. The desktop browser has none, so the Share button has never been shown or tapped.
- What Reminders and Messages do with the copied or shared text.
- How long a phone keeps the saved recipes and the list when the app is not opened for weeks.
