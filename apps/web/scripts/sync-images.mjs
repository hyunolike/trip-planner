// 샘플 이미지는 5번 계획에서 객체 저장소로 옮긴다. 그 전까지 기존 앱의 public 폴더를 복사해 서빙한다.
import { cpSync, existsSync } from 'node:fs';

const pairs = [
  ['../../../public/images/', '../public/images/'],
  ['../../../public/illustrations/', '../public/illustrations/'],
];

for (const [from, to] of pairs) {
  const source = new URL(from, import.meta.url);
  if (!existsSync(source)) {
    console.error(`missing ${source.pathname}`);
    process.exit(1);
  }
  cpSync(source, new URL(to, import.meta.url), { recursive: true });
}
console.log('synced sample images and illustrations');
