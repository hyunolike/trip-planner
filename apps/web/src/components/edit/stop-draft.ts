import { type LinkItem, readLink, type StopDocument } from '@/lib/trip/content';

export type StopDraft = {
  title: string;
  time: string;
  type: string;
  duration: string;
  details: string;
  buffer: string;
  latitude: string;
  longitude: string;
  linkLabel: string;
  linkUrl: string;
  linkNote?: string;
  extraLinks?: string;
};

export type DraftLink = { id: string; label: string; url: string; note: string };

export function restoreStopDraft(
  raw: string | null,
  initial: StopDraft,
  stopVersion?: number,
): { draft: StopDraft; stale: boolean; baseVersion: number | null } {
  const fresh = { draft: initial, stale: false, baseVersion: stopVersion ?? null };
  if (!raw) return fresh;
  try {
    const stored: unknown = JSON.parse(raw);
    if (!stored || typeof stored !== 'object') return fresh;
    const envelope = 'version' in stored && stored.version === 1 && 'draft' in stored;
    const candidate = envelope ? stored.draft : stored;
    if (!candidate || typeof candidate !== 'object') return fresh;
    const valid = Object.keys(initial).every((key) =>
      key in candidate
        ? typeof candidate[key as keyof typeof candidate] === 'string'
        : key === 'linkNote' || key === 'extraLinks',
    );
    if (!valid) return fresh;
    const baseVersion =
      envelope && 'baseVersion' in stored && typeof stored.baseVersion === 'number' ? stored.baseVersion : null;
    return {
      draft: { ...initial, ...candidate },
      stale: stopVersion !== undefined && baseVersion !== stopVersion,
      baseVersion,
    };
  } catch {
    return fresh;
  }
}

export function extraDraftLinks(draft: StopDraft): DraftLink[] {
  try {
    const value: unknown = JSON.parse(draft.extraLinks ?? '[]');
    if (
      Array.isArray(value) &&
      value.every(
        (item: unknown) =>
          item &&
          typeof item === 'object' &&
          'id' in item &&
          typeof item.id === 'string' &&
          'label' in item &&
          typeof item.label === 'string' &&
          'url' in item &&
          typeof item.url === 'string' &&
          'note' in item &&
          typeof item.note === 'string',
      )
    )
      return value as DraftLink[];
  } catch {
    /* Keep malformed local drafts out of an API request. */
  }
  return [];
}

export function defaultStopTime(previous?: Pick<StopDocument, 'time' | 'duration'>): string {
  const match = previous?.time.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return '09:00';
  const duration = previous?.duration ?? '';
  const hours = Number(duration.match(/(\d+)\s*시간/)?.[1] ?? 0);
  const minutes = Number(duration.match(/(\d+)\s*분/)?.[1] ?? (/^\d+$/.test(duration) ? duration : 0));
  const total = (Number(match[1]) * 60 + Number(match[2]) + hours * 60 + minutes) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export function toStopDraft(stop?: StopDocument, previous?: StopDocument): StopDraft {
  const links = Array.isArray(stop?.links) ? stop.links.flatMap((value: unknown) => readLink(value) ?? []) : [];
  const link = links[0];
  return {
    title: stop?.title ?? '',
    time: stop?.time.slice(0, 5) ?? defaultStopTime(previous),
    type: stop?.type ?? 'sight',
    duration: stop?.duration ?? '',
    details: stop?.details ?? '',
    buffer: stop?.buffer ?? '',
    latitude: stop?.coordinates?.[0]?.toString() ?? '',
    longitude: stop?.coordinates?.[1]?.toString() ?? '',
    linkLabel: link && typeof link.label === 'string' ? link.label : '',
    linkUrl: link && typeof link.url === 'string' ? link.url : '',
    linkNote: link?.note ?? '',
    extraLinks: JSON.stringify(
      links.slice(1).map((item, index) => ({ ...item, id: `existing-${index}`, note: item.note ?? '' })),
    ),
  };
}

export function stopDraftBody(draft: StopDraft) {
  if (!draft.title.trim()) throw new Error('제목을 입력해 주세요.');
  if (draft.time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(draft.time)) throw new Error('시간을 확인해 주세요.');
  const links: LinkItem[] = [];
  const allLinks = [
    { label: draft.linkLabel, url: draft.linkUrl, note: draft.linkNote ?? '' },
    ...extraDraftLinks(draft),
  ];
  for (const link of allLinks) {
    if (!link.url.trim() && !link.label.trim() && !link.note.trim()) continue;
    let url: URL;
    try {
      url = new URL(link.url.trim());
    } catch {
      throw new Error('링크 주소를 확인해 주세요.');
    }
    if (!['https:', 'http:'].includes(url.protocol)) throw new Error('http 또는 https 링크만 사용할 수 있어요.');
    links.push({ label: link.label.trim() || '링크', url: url.href, ...(link.note.trim() ? { note: link.note } : {}) });
  }
  const hasCoordinates = Boolean(draft.latitude.trim() || draft.longitude.trim());
  let coordinates: number[] | null = null;
  if (hasCoordinates) {
    const lat = Number(draft.latitude);
    const lng = Number(draft.longitude);
    if (
      !draft.latitude.trim() ||
      !draft.longitude.trim() ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      Math.abs(lat) > 90 ||
      Math.abs(lng) > 180
    )
      throw new Error('위도와 경도를 함께 확인해 주세요.');
    coordinates = [lat, lng];
  }
  return {
    title: draft.title.trim(),
    time: draft.time || '09:00',
    type: draft.type || 'sight',
    duration: draft.duration,
    details: draft.details,
    buffer: draft.buffer,
    links,
    coordinates,
    clearCoordinates: !coordinates,
  };
}
