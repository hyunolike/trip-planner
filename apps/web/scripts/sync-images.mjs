// 샘플 이미지는 5번 계획에서 객체 저장소로 옮긴다. 그 전까지 기존 앱의 public 폴더를 복사해 서빙한다.
import { cpSync, existsSync, mkdirSync } from 'node:fs';

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
// MapLibre 6은 워커 파일 위치를 import.meta.url로 찾는데, 번들러가 이 값을 바꿔 운영 빌드에서 워커가 뜨지 않는다. 워커를 public에서 직접 서빙한다.
mkdirSync(new URL('../public/maplibre/', import.meta.url), { recursive: true });
for (const file of ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']) {
  cpSync(
    new URL(`../node_modules/maplibre-gl/dist/${file}`, import.meta.url),
    new URL(`../public/maplibre/${file}`, import.meta.url),
  );
}
console.log('synced sample images and illustrations');
