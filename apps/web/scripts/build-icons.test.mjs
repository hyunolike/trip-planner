import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// jsdom 환경에서는 URL 객체를 fs가 받지 못해 문자열 경로로 푼다.
const here = fileURLToPath(import.meta.url);
const at = (relative) => resolve(here, '..', relative);

const generated = readFileSync(at('../src/components/ui/icons.generated.ts'), 'utf8');
const sources = readdirSync(at('../../../design-system/assets/Icons/')).filter((f) => f.endsWith('.svg'));

describe('icons.generated.ts', () => {
  it('has one entry per design system icon', () => {
    expect(sources).toHaveLength(53);
    for (const file of sources) expect(generated).toContain(`'${file.replace('.svg', '')}':`);
  });

  it('draws with currentColor and keeps no fixed ink or labels', () => {
    expect(generated).not.toMatch(/#171b22/i);
    expect(generated).not.toContain('aria-label');
    expect(generated).toContain('currentColor');
  });
});
