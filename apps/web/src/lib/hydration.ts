import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

/** 서버 렌더와 첫 하이드레이션 동안은 false, 브라우저에서 React가 붙은 뒤에는 true. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
