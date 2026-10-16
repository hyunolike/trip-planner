// design-system/assets/Icons의 SVG를 인라인 SVG 조각으로 바꾼다. 선과 점의 고정 잉크를 currentColor로 바꿔 CSS 색을 따르게 한다.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';

const source = new URL('../../../design-system/assets/Icons/', import.meta.url);
const target = new URL('../src/components/ui/icons.generated.ts', import.meta.url);

const entries = readdirSync(source)
  .filter((file) => file.endsWith('.svg'))
  .sort()
  .map((file) => {
    const svg = readFileSync(new URL(file, source), 'utf8');
    const inner = svg
      .replace(/^[\s\S]*?<svg[^>]*>/, '')
      .replace(/<\/svg>\s*$/, '')
      .replace(/<title>[\s\S]*?<\/title>/g, '')
      .replace(/#171b22/gi, 'currentColor')
      .replace(/\s+/g, ' ')
      .trim();
    return [file.replace('.svg', ''), inner];
  });

const body = entries.map(([name, inner]) => `  '${name}': ${JSON.stringify(inner)},`).join('\n');
writeFileSync(
  target,
  `// 자동 생성 파일. pnpm gen:icons로 다시 만든다.\nexport const iconPaths = {\n${body}\n} as const;\n\nexport type IconName = keyof typeof iconPaths;\n`,
);
console.log(`wrote ${entries.length} icons`);
