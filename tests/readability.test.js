// Readability rules from docs/BUILD_BRIEF.md 6.4, checked against the real stylesheet, in light and in
// dark: every text and background pair at least 4.5:1, body text at least 17 px, nothing under 14 px,
// touch targets at least 48 px (56 in cook mode), cook mode body text at least 22 px. And no colour
// anywhere outside the two token blocks, so the first check really covers every pair.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const NEXT = fileURLToPath(new URL('../next/', import.meta.url));
const css = readFileSync(join(NEXT, 'app/ui/styles.css'), 'utf8');
const bare = css.replace(/\/\*[\s\S]*?\*\//g, '');

const parseTokens = (block) => Object.fromEntries([...block.matchAll(/--([\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
const lightBlock = bare.match(/(?:^|\n):root\s*\{([^}]*)\}/);
const darkBlock = bare.match(/@media \(prefers-color-scheme: dark\)\s*\{\s*:root\s*\{([^}]*)\}\s*\}/);
const light = parseTokens(lightBlock[1]);
const dark = { ...light, ...parseTokens(darkBlock[1]) };
const themes = { light, dark };
const cssOutsideTokens = bare.replace(lightBlock[0], '').replace(darkBlock[0], '');

function filesUnder(dir, extensions) {
  const found = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...filesUnder(path, extensions));
    else if (extensions.some((ext) => entry.name.endsWith(ext))) found.push(path);
  }
  return found;
}

function luminance(hex) {
  const channel = (i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const SURFACES = ['bg', 'card', 'soft', 'warn'];
const TEXT = ['ink', 'sub', 'accent'];
const COLOURS = [...SURFACES, ...TEXT, 'on-accent', 'danger', 'on-danger', 'line', 'edge'];

/** Like assert.doesNotMatch, but a failure shows only the offending text, not the whole stylesheet. */
function absent(text, pattern, message) {
  const found = text.match(pattern);
  assert.ok(!found, `${message}${found ? `: "${found[0].trim()}"` : ''}`);
}

const rule = (selector) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\>"=]/g, '\\$&');
  const match = bare.match(new RegExp(`(?:^|\\n|,\\n)${escaped}(?:,\\n[^{]+)?\\s*\\{([^}]*)\\}`));
  assert.ok(match, `rule for ${selector}`);
  return match[1];
};

test('colour tokens exist in both themes and are plain six-digit hex', () => {
  for (const [theme, tokens] of Object.entries(themes)) {
    for (const name of COLOURS) assert.match(tokens[name] || '', /^#[0-9a-f]{6}$/, `${theme} --${name}`);
  }
  for (const name of COLOURS) assert.ok(name in parseTokens(darkBlock[1]), `the dark block must set --${name}`);
});

test('every text colour reaches 4.5:1 on every surface, in light and in dark', () => {
  for (const [theme, tokens] of Object.entries(themes)) {
    for (const text of TEXT) {
      for (const surface of SURFACES) {
        const ratio = contrast(tokens[text], tokens[surface]);
        assert.ok(ratio >= 4.5, `${theme}: --${text} on --${surface} is ${ratio.toFixed(2)}:1`);
      }
    }
  }
});

test('text on the accent and danger colours reaches 4.5:1', () => {
  for (const [theme, tokens] of Object.entries(themes)) {
    for (const [text, ground] of [['on-accent', 'accent'], ['on-danger', 'danger']]) {
      const ratio = contrast(tokens[text], tokens[ground]);
      assert.ok(ratio >= 4.5, `${theme}: --${text} on --${ground} is ${ratio.toFixed(2)}:1`);
    }
  }
});

test('control outlines and filled buttons reach 3:1 against the surfaces they sit on', () => {
  for (const [theme, tokens] of Object.entries(themes)) {
    for (const shape of ['edge', 'accent', 'danger']) {
      for (const surface of ['bg', 'card', 'soft']) {
        const ratio = contrast(tokens[shape], tokens[surface]);
        assert.ok(ratio >= 3, `${theme}: --${shape} on --${surface} is ${ratio.toFixed(2)}:1`);
      }
    }
  }
});

test('the stylesheet uses no raw colour outside the token blocks, and no opacity', () => {
  absent(cssOutsideTokens, /#[0-9a-fA-F]{3,8}\b/, 'a raw colour');
  absent(cssOutsideTokens, /\b(rgb|rgba|hsl|hsla|color-mix)\(/, 'a raw colour');
  absent(cssOutsideTokens, /\bopacity\s*:/, 'no opacity: it would lower contrast without the test seeing it');
  // Every colour property (color, border-color, accent-color, ...) takes a token. The tap highlight is
  // switched off, which is not a colour anyone reads.
  absent(cssOutsideTokens.replace('-webkit-tap-highlight-color: transparent;', ''), /(?<![\w-])[\w-]*color:(?!\s*var\(--)[^;]*/, 'every colour must be a token');
  absent(cssOutsideTokens, /\bbackground(-color)?:(?!\s*(var\(--|none))[^;]*/, 'every background must be a token');
});

test('scripts and pages set no colours of their own', () => {
  for (const file of filesUnder(NEXT, ['.js'])) {
    const text = readFileSync(file, 'utf8');
    assert.doesNotMatch(text, /#[0-9a-fA-F]{6}\b/, file);
    assert.doesNotMatch(text, /\b(rgb|rgba|hsl|hsla)\(/, file);
    assert.doesNotMatch(text, /\.style\b/, `${file}: no inline styles from scripts`);
  }
  for (const file of filesUnder(NEXT, ['.html'])) {
    const text = readFileSync(file, 'utf8');
    const colours = text.match(/#[0-9a-fA-F]{6}\b/g) || [];
    assert.deepEqual(colours, [light.bg, dark.bg], `${file}: only the two theme colours may appear`);
    assert.ok(text.includes(`<meta name="theme-color" content="${light.bg}" media="(prefers-color-scheme: light)">`), file);
    assert.ok(text.includes(`<meta name="theme-color" content="${dark.bg}" media="(prefers-color-scheme: dark)">`), file);
    assert.doesNotMatch(text, /\sstyle=/, `${file}: no inline styles`);
  }
});

test('the app follows the phone\'s light or dark setting', () => {
  assert.match(readFileSync(join(NEXT, 'index.html'), 'utf8'), /<meta name="color-scheme" content="light dark">/);
  assert.ok(darkBlock, 'a dark token block under prefers-color-scheme: dark');
});

test('the manifest colours match the page background', () => {
  const manifest = JSON.parse(readFileSync(join(NEXT, 'manifest.webmanifest'), 'utf8'));
  assert.equal(manifest.background_color, light.bg);
  assert.equal(manifest.theme_color, light.bg);
});

test('no text under 14 px, and body text is at least 17 px', () => {
  const declarations = [...bare.matchAll(/font-size:\s*([^;]+);/g)].map((m) => m[1].trim());
  assert.ok(declarations.length > 30);
  for (const value of declarations) {
    assert.match(value, /^\d+px$/, `font-size "${value}" must be in px so it can be checked`);
    assert.ok(Number.parseInt(value, 10) >= 14, `font-size ${value} is under 14 px`);
  }
  assert.ok(Number.parseInt(rule('body').match(/font-size:\s*(\d+)px/)[1], 10) >= 17);
  assert.doesNotMatch(bare, /\bfont:\s*\d/, 'no font shorthand with a size');
  assert.doesNotMatch(bare, /font-size:\s*[\d.]+(em|rem|%|vw)/);
});

test('the text a cook reads is at least 17 px, and at least 22 px in cook mode', () => {
  for (const selector of ['.ingredients', '.html', '.check-text', '.row-title']) {
    const px = Number.parseInt(rule(selector).match(/font-size:\s*(\d+)px/)[1], 10);
    assert.ok(px >= 17, `${selector} is ${px} px`);
  }
  const cook = bare.match(/\nbody\.cook \.ingredients,\nbody\.cook \.html\s*\{([^}]*)\}/);
  assert.ok(cook, 'one cook-mode rule for the ingredients and the steps');
  assert.ok(Number.parseInt(cook[1].match(/font-size:\s*(\d+)px/)[1], 10) >= 22);
});

test('touch targets are at least 48 px, and 56 px in cook mode', () => {
  assert.ok(Number.parseInt(light.tap, 10) >= 48, '--tap');
  const cookTap = bare.match(/\nbody\.cook\s*\{([^}]*)\}/);
  assert.ok(cookTap, 'a body.cook rule');
  assert.ok(Number.parseInt(cookTap[1].match(/--tap:\s*(\d+)px/)[1], 10) >= 56, '--tap in cook mode');
  for (const selector of ['.btn', '.link-btn', '.chip', '.step-btn', '.tab', '.search-input', '.row', '.back', '.extra > summary', '.list-recipe-title', '.check']) {
    assert.match(rule(selector), /min-height:\s*var\(--tap\)/, `${selector} must have min-height: var(--tap)`);
  }
  assert.match(rule('.step-btn'), /width:\s*var\(--tap\)/);
  // Nothing may shrink a control below the token. The one small box is the tick box, whose whole row is
  // the target: its label is a .check, checked above.
  const tickBox = rule('.check > input');
  assert.match(tickBox, /height:\s*26px/);
  absent(cssOutsideTokens.replace(tickBox, ''), /(?<![\w-])height:\s*(?:[1-3]?\d|4[0-7])px/, 'a fixed height under 48 px');
});
