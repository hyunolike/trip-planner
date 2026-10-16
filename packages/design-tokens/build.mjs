import { fileURLToPath } from 'node:url';
import StyleDictionary from 'style-dictionary';

const HEADER = '/* 자동 생성 파일. packages/design-tokens/tokens.json을 고치고 pnpm --filter @tripnote/design-tokens build를 돌린다. */\n';

const valueOf = (t) => t.$value ?? t.value;
const darkOf = (t) => t.$extensions?.['app.tripnote']?.dark;

/** 디자인 시스템과 bundle.css가 쓰는 이름을 그대로 낸다. 그룹 이름은 서체 가족(font-)과 글자 스타일(text-)에만 붙인다. */
function cssName(t) {
  const [groupName] = t.path;
  const name = t.path.at(-1);
  if (groupName === 'font') return `font-${name}`;
  if (groupName === 'text') return `text-${name}`;
  return name;
}

function textLines(t) {
  const v = valueOf(t);
  const family = String(t.original.$value.fontFamily).replace(/^\{font\.(\w+)\}$/, 'var(--font-$1)');
  const lines = [`  --${cssName(t)}: ${v.fontWeight} ${v.fontSize}/${v.lineHeight} ${family};`];
  if (v.letterSpacing) lines.push(`  --${cssName(t)}-tracking: ${v.letterSpacing};`);
  return lines;
}

const formats = {
  'tripnote/css-themes': ({ dictionary }) => {
    const tokens = dictionary.allTokens;
    const light = tokens.flatMap((t) => (t.path[0] === 'text' ? textLines(t) : [`  --${cssName(t)}: ${valueOf(t)};`]));
    const dark = tokens.filter(darkOf).map((t) => `  --${cssName(t)}: ${darkOf(t)};`);
    return [
      HEADER,
      ':root {',
      '  color-scheme: light;',
      ...light,
      '}',
      '',
      '@media (prefers-color-scheme: dark) {',
      '  :root:not([data-theme="light"]) {',
      '    color-scheme: dark;',
      ...dark.map((line) => `  ${line}`),
      '  }',
      '}',
      '',
      ':root[data-theme="dark"] {',
      '  color-scheme: dark;',
      ...dark,
      '}',
      '',
    ].join('\n');
  },
  'tripnote/js-colors': ({ dictionary }) => {
    const colors = dictionary.allTokens.filter((t) => t.path[0] === 'color');
    const light = Object.fromEntries(colors.map((t) => [t.path.at(-1), valueOf(t)]));
    const dark = Object.fromEntries(colors.map((t) => [t.path.at(-1), darkOf(t) ?? valueOf(t)]));
    return `${HEADER}export const colors = ${JSON.stringify({ light, dark }, null, 2)};\n`;
  },
  'tripnote/dts': ({ dictionary }) => {
    const names = dictionary.allTokens.filter((t) => t.path[0] === 'color').map((t) => JSON.stringify(t.path.at(-1)));
    return `${HEADER}export type ColorName = ${names.join(' | ')};\nexport declare const colors: { light: Record<ColorName, string>; dark: Record<ColorName, string> };\n`;
  },
};

export async function build() {
  const sd = new StyleDictionary({
    source: [fileURLToPath(new URL('./tokens.json', import.meta.url))],
    usesDtcg: true,
    hooks: { formats },
    log: { verbosity: 'default' },
    platforms: {
      web: {
        buildPath: fileURLToPath(new URL('./dist/', import.meta.url)),
        files: [
          { destination: 'tokens.css', format: 'tripnote/css-themes' },
          { destination: 'tokens.js', format: 'tripnote/js-colors' },
          { destination: 'tokens.d.ts', format: 'tripnote/dts' },
        ],
      },
    },
  });
  await sd.buildAllPlatforms();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await build();
