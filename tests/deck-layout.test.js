/** @vitest-environment jsdom */
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { renderDeckGuide, hotelLucuaRoute } from '../src/deck-route.js';

it('keeps the long bridge directions in the flexible content column rather than the number column', () => {
  document.head.innerHTML = `<style>${readFileSync('src/design-system.css', 'utf8')}</style>`;
  document.body.innerHTML = renderDeckGuide();
  const steps = [...document.querySelectorAll('.deck-guide .guide-steps li')];
  expect(steps).toHaveLength(hotelLucuaRoute.steps.length);
  for (const [index, step] of steps.entries()) {
    const content = step.querySelector('.deck-step-content');
    expect(step.children).toHaveLength(1);
    expect([...step.childNodes].filter(node => node.nodeType === 3 && node.textContent.trim())).toHaveLength(0);
    expect(content.querySelector('b').textContent).toBe(hotelLucuaRoute.steps[index][0]);
    expect(content.querySelector('p').textContent).toBe(hotelLucuaRoute.steps[index][1]);
    expect(getComputedStyle(content).gridColumn).toBe('2');
    expect(getComputedStyle(content).minWidth).toBe('0');
    expect(getComputedStyle(content.querySelector('p')).whiteSpace).toBe('normal');
  }
});
