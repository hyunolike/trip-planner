'use client';

import { useSyncExternalStore } from 'react';
import type { LegacySection, TripView } from './content';

export const SECTIONS = ['itinerary', 'food', 'shopping', 'links', 'preparation'] as const;
export type SectionId = (typeof SECTIONS)[number];

export function sectionFromHash(hash: string): SectionId {
  const id = hash.replace(/^#/, '');
  return (SECTIONS as readonly string[]).includes(id) ? (id as SectionId) : 'itinerary';
}

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

const TABBED = new Set(['food', 'shopping', 'links', 'preparation']);

function covered(trip: TripView, id: string): boolean {
  switch (id) {
    case 'food':
      return trip.places.some((p) => p.kind === 'dining');
    case 'shopping':
      return trip.places.some((p) => p.kind === 'shopping');
    case 'links':
      return trip.content.linkGroups.length > 0;
    case 'preparation':
      return trip.content.checklistGroups.length > 0;
    default:
      return false;
  }
}

/** 이관 섹션 중 지금 보여 줄 것. 'info'는 탭이 없는 섹션(개요, 공항 안내 등)이다. */
export function legacySectionsFor(trip: TripView, section: SectionId | 'info'): LegacySection[] {
  return trip.content.sections.filter((s) => {
    if (section === 'info') return !TABBED.has(s.id);
    return s.id === section && !covered(trip, s.id);
  });
}
