/** @vitest-environment node */
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { validateTrip } from '../../scripts/sample/validate.mjs';

const dir = new URL('../../sample/', import.meta.url);
const files = readdirSync(dir).filter((name) => name.endsWith('.json'));
const load = (name) => JSON.parse(readFileSync(new URL(name, dir), 'utf8'));

describe('sample trips', () => {
  it('has both samples', () => {
    expect(files.sort()).toEqual(['danang-hoian-family-2027.json', 'osaka-kyoto-family-2026.json']);
  });

  it.each(files)('%s is valid', (name) => {
    expect(validateTrip(load(name))).toEqual({ ok: true, errors: [] });
  });

  it('uses unique slugs that match file names', () => {
    for (const name of files) expect(load(name).slug).toBe(name.replace('.json', ''));
  });

  it('marks the researched Danang sample as a public example with sources', () => {
    const danang = load('danang-hoian-family-2027.json');
    expect(danang).toMatchObject({ visibility: 'public', isSample: true, timezone: 'Asia/Ho_Chi_Minh' });
    expect(danang.provenance.kind).toBe('researched-example');
    expect(danang.provenance.referencedProducts.length).toBeGreaterThanOrEqual(2);
    expect(danang.provenance.disclaimer).toContain('예시');
  });

  it('does not claim confirmed bookings in the researched sample', () => {
    const text = readFileSync(new URL('danang-hoian-family-2027.json', dir), 'utf8');
    expect(text).not.toContain('예약 확정');
  });

  it('gives every Danang place a source', () => {
    const danang = load('danang-hoian-family-2027.json');
    for (const place of danang.places) expect(place.sources?.length, place.id).toBeGreaterThan(0);
  });
});
