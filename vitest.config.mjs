// 루트 pnpm test는 기존 Vite 앱 테스트와 샘플 스크립트 테스트만 돈다. apps/web과 packages는 각자 테스트한다.
export default {
  test: {
    include: ['tests/**/*.test.{js,mjs}'],
  },
};
