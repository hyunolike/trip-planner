import { osakaTrip } from '@test/fixtures/trip';
import { describe, expect, it } from 'vitest';
import { readTrip } from '@/lib/trip/content';
import { sanitizeLegacyHtml } from './sanitize';

describe('sanitizeLegacyHtml', () => {
  it('removes scripts, styles, frames and event handlers', () => {
    const dirty =
      '<p onclick="steal()">안내</p><script>alert(1)</script><style>body{display:none}</style>' +
      '<iframe src="https://evil.example"></iframe><img src="/images/a.jpg" alt="사진" onerror="steal()">';
    const clean = sanitizeLegacyHtml(dirty);

    expect(clean).not.toMatch(/script|style|iframe|onclick|onerror|steal/);
    expect(clean).toContain('<p>안내</p>');
    expect(clean).toContain('<img src="/images/a.jpg" alt="사진" loading="lazy" decoding="async" />');
  });

  it('drops javascript and protocol-relative urls', () => {
    const clean = sanitizeLegacyHtml(
      '<a href="javascript:alert(1)">나쁜 링크</a><a href="//evil.example/x">상대 프로토콜</a><img src="//evil.example/p.png" alt="x"><img src="http://plain.example/p.png" alt="y">',
    );

    expect(clean).not.toContain('javascript:');
    expect(clean).not.toContain('evil.example');
    expect(clean).not.toContain('plain.example');
    expect(clean).toContain('나쁜 링크');
  });

  it('opens external links in a new tab and keeps in-page anchors in place', () => {
    const clean = sanitizeLegacyHtml(
      '<a href="https://www.osakacastle.net/">공식</a><a href="#preparation" data-view="preparation">준비물</a>',
    );

    expect(clean).toContain(
      '<a href="https://www.osakacastle.net/" target="_blank" rel="noopener noreferrer">공식</a>',
    );
    expect(clean).toContain('<a href="#preparation">준비물</a>');
  });

  it('never lets author-supplied target or rel through, even when the href only looks internal', () => {
    const tabnab = sanitizeLegacyHtml('<a href="https:\\\\evil.example" target="_blank" rel="opener">x</a>');
    expect(tabnab).toContain('target="_blank"');
    expect(tabnab).toContain('rel="noopener noreferrer"');
    expect(tabnab).not.toContain('opener"');
    expect(tabnab).not.toMatch(/rel="opener/);

    const internal = sanitizeLegacyHtml('<a href="/x" target="_top" rel="opener">y</a>');
    expect(internal).toBe('<a href="/x">y</a>');
    expect(sanitizeLegacyHtml('<a href="mailto:a@b.c" target="_blank">m</a>')).toBe('<a href="mailto:a@b.c">m</a>');
  });

  it('strips classes, ids and inline styles so legacy markup cannot borrow app styles', () => {
    const clean = sanitizeLegacyHtml('<div class="skip-link" id="main" style="position:fixed"><b>여권</b></div>');
    expect(clean).toBe('<div><b>여권</b></div>');
  });

  it('keeps the wording of every legacy block in the Osaka Kyoto original', () => {
    const trip = readTrip(osakaTrip());
    const blocks = [
      ...trip.days.flatMap((d) => d.stops.flatMap((s) => s.guide?.blocks ?? [])),
      ...trip.content.sections.flatMap((s) => s.blocks),
    ];
    const html = blocks.filter((b) => b.type === 'html');

    expect(html.length).toBe(25);
    for (const block of html) {
      const clean = sanitizeLegacyHtml(block.html);
      expect(clean).not.toMatch(/<script|on\w+=|javascript:/i);
      const visible = (s: string) =>
        s
          .replace(/<[^>]+>/g, '')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/\s+/g, ' ')
          .trim();
      expect(visible(clean)).toBe(visible(block.html));
    }
  });
});
