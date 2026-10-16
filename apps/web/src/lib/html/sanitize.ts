import sanitizeHtml from 'sanitize-html';

// 브라우저와 같은 규칙으로 주소를 해석해 판단한다. "https:\\x"나 앞 공백처럼 정규식을 피하는 주소도 잡는다.
const BASE = 'http://x.invalid';
function isExternal(href: string | undefined): boolean {
  if (!href) return false;
  try {
    const url = new URL(href.trim(), BASE);
    return (url.protocol === 'http:' || url.protocol === 'https:') && url.origin !== BASE;
  } catch {
    return false;
  }
}

// transformTags가 더하는 target, rel, loading, decoding도 허용 목록을 거치므로 함께 적는다.
const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'section',
    'aside',
    'div',
    'p',
    'h2',
    'h3',
    'h4',
    'h5',
    'b',
    'strong',
    'em',
    'i',
    'small',
    'mark',
    'span',
    'br',
    'hr',
    'ul',
    'ol',
    'li',
    'dl',
    'dt',
    'dd',
    'a',
    'img',
    'figure',
    'figcaption',
    'table',
    'thead',
    'tbody',
    'tr',
    'th',
    'td',
    'details',
    'summary',
    'blockquote',
    'code',
    'sup',
    'sub',
  ],
  allowedAttributes: {
    a: ['href', 'title', 'target', 'rel'],
    img: ['src', 'alt', 'width', 'height', 'loading', 'decoding'],
    td: ['colspan', 'rowspan'],
    th: ['colspan', 'rowspan', 'scope'],
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesByTag: { img: ['https'] },
  allowProtocolRelative: false,
  transformTags: {
    // 작성자가 준 target, rel은 버리고 href, title만 받아 새로 만든다.
    a: (tagName, attribs) => {
      const next: Record<string, string> = {};
      if (attribs.href !== undefined) next.href = attribs.href;
      if (attribs.title !== undefined) next.title = attribs.title;
      if (isExternal(attribs.href)) {
        next.target = '_blank';
        next.rel = 'noopener noreferrer';
      }
      return { tagName, attribs: next };
    },
    img: (tagName, attribs) => ({ tagName, attribs: { ...attribs, loading: 'lazy', decoding: 'async' } }),
  },
  // http 이미지나 프로토콜 상대 주소는 src가 지워진다. src 없는 빈 이미지는 통째로 지운다.
  exclusiveFilter: (frame) => frame.tag === 'img' && !frame.attribs.src,
};

/** 이관 데이터의 HTML만 받는다. 허용 목록 밖의 태그와 속성, 스크립트 스킴은 모두 지운다. */
export function sanitizeLegacyHtml(html: string): string {
  return sanitizeHtml(html, OPTIONS);
}
