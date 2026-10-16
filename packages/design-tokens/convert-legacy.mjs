import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const LEGACY = fileURLToPath(new URL('../../design-system/tokens.json', import.meta.url));
export const TARGET = fileURLToPath(new URL('./tokens.json', import.meta.url));

/** value가 {light, dark} 쌍이면 밝은 값을 $value에, 어두운 값을 $extensions에 둔다. */
function token(type, value, description) {
  const themed = value !== null && typeof value === 'object' && 'light' in value && 'dark' in value;
  return {
    $type: type,
    $value: themed ? value.light : value,
    ...(description ? { $description: description } : {}),
    ...(themed ? { $extensions: { 'app.tripnote': { dark: value.dark } } } : {}),
  };
}

const group = (list, type) => Object.fromEntries(list.map((t) => [t.name, token(type, t.value, t.usage)]));

function textStyle(family, s) {
  return token(
    'typography',
    {
      fontFamily: `{font.${family}}`,
      fontSize: s.fontSize,
      lineHeight: s.lineHeight,
      fontWeight: s.fontWeight,
      ...(s.letterSpacing ? { letterSpacing: s.letterSpacing } : {}),
    },
    s.usage,
  );
}

/** 아티팩트 형식(design-system/tokens.json)을 DTCG 구조로 바꾼다. */
export function convert(legacy) {
  return {
    $description: '여행노트 디자인 토큰. design-system/tokens.json에서 변환했고, 이후에는 이 파일이 원본이다. 고친 뒤 pnpm --filter @tripnote/design-tokens build를 돌린다.',
    color: group(legacy.color.tokens, 'color'),
    font: Object.fromEntries(Object.entries(legacy.type.families).map(([name, stack]) => [name, token('fontFamily', stack)])),
    text: Object.fromEntries(legacy.type.groups.flatMap((g) => g.styles.map((s) => [s.name, textStyle(g.family, s)]))),
    space: group(legacy.spacing.tokens, 'dimension'),
    radius: group(legacy.radius.tokens, 'dimension'),
    shadow: group(legacy.shadow.tokens, 'shadow'),
    size: group(legacy.size.tokens, 'dimension'),
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const legacy = JSON.parse(readFileSync(LEGACY, 'utf8'));
  writeFileSync(TARGET, `${JSON.stringify(convert(legacy), null, 2)}\n`);
}
