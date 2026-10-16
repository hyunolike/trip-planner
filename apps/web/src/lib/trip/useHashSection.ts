'use client';

import { useSyncExternalStore } from 'react';
import { type SectionId, sectionFromHash } from './sections';

function subscribe(onChange: () => void) {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}

export function useHashSection(): SectionId {
  return useSyncExternalStore(
    subscribe,
    () => sectionFromHash(window.location.hash),
    () => 'itinerary',
  );
}
