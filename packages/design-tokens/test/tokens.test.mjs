import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { convert, LEGACY, TARGET } from '../convert-legacy.mjs';

const css = readFileSync(new URL('../dist/tokens.css', import.meta.url), 'utf8');

test('tokens.json is the converted design system source', () => {
  const legacy = JSON.parse(readFileSync(LEGACY, 'utf8'));
  assert.deepEqual(JSON.parse(readFileSync(TARGET, 'utf8')), convert(legacy));
});

test('light values live on :root and dark values in both dark blocks', () => {
  const root = css.slice(css.indexOf(':root {'), css.indexOf('}'));
  assert.match(root, /--canvas: #f7f8fa;/);
  assert.match(root, /--brand: #2456d6;/);
  assert.match(root, /--space-1: 4px;/);
  assert.match(root, /--shadow-sm: 0 1px 2px #171b220f;/);
  assert.equal(css.match(/--canvas: #0f1216;/g).length, 2);
  assert.equal(css.match(/--on-brand: #0f1216;/g).length, 2);
  assert.match(css, /:root\[data-theme="dark"\]/);
  assert.match(css, /:root:not\(\[data-theme="light"\]\)/);
});

test('type styles become font shorthands that point at the family variables', () => {
  assert.match(css, /--font-sans: "IBM Plex Sans KR", "Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif;/);
  assert.match(css, /--text-display-xl: 700 40px\/48px var\(--font-display\);/);
  assert.match(css, /--text-display-xl-tracking: -0\.01em;/);
  assert.match(css, /--text-body-lg: 400 17px\/28px var\(--font-sans\);/);
  assert.match(css, /--text-data-lg: 500 20px\/24px var\(--font-mono\);/);
});

test('every variable the component css reads is defined', () => {
  const bundle = readFileSync(new URL('../../../design-system/components/bundle.css', import.meta.url), 'utf8');
  const local = new Set([...bundle.matchAll(/(?:^|[;{\s])--([a-z0-9-]+)\s*:/g)].map((m) => m[1]));
  const used = new Set([...bundle.matchAll(/var\(--([a-z0-9-]+)/g)].map((m) => m[1]));
  const defined = new Set([...css.matchAll(/--([a-z0-9-]+):/g)].map((m) => m[1]));
  assert.deepEqual([...used].filter((name) => !defined.has(name) && !local.has(name)), []);
});

test('the js export carries both themes for map layers', async () => {
  const { colors } = await import('../dist/tokens.js');
  assert.equal(colors.light['transit-train'], '#2456d6');
  assert.equal(colors.dark['transit-train'], '#7a9bf7');
  assert.equal(colors.light.brand, '#2456d6');
});
