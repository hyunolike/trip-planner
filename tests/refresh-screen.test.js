/** @vitest-environment jsdom */
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
it('opens the itinerary without a blocking splash or artificial wait', () => {
 const doc = new DOMParser().parseFromString(readFileSync('index.html', 'utf8'), 'text/html');
 expect(doc.querySelector('#refresh-screen')).toBeNull();
 expect(doc.querySelector('#app').hasAttribute('inert')).toBe(false);
 expect(doc.querySelector('script[type="module"]')).not.toBeNull();
 expect(doc.querySelector('#app [role="status"]')).not.toBeNull();
});
