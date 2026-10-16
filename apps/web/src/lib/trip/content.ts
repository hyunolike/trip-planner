import type { components } from '@/lib/api/schema';

type Schemas = components['schemas'];
export type TripDocument = Schemas['TripDocument'];
export type DayDocument = Schemas['DayDocument'];
export type StopDocument = Schemas['StopDocument'];
export type PlaceDocument = Schemas['PlaceDocument'];
export type TripSummary = Schemas['TripSummary'];
export type WeatherResponse = Schemas['WeatherResponse'];
export type MeResponse = Schemas['MeResponse'];

export type LatLng = [number, number];
export type LinkItem = { label: string; url: string; note?: string };
export type Photo = {
  src: string;
  alt: string;
  credit?: string;
  license?: string;
  licenseUrl?: string;
  sourceUrl?: string;
  context?: string;
  focus?: string;
  width?: number;
  height?: number;
};
export type Transit = { mode: string; label: string; icon?: string; waypoints: LatLng[] };
export type Fact = { label: string; value: string };
export type Block =
  | { type: 'paragraph'; title?: string; text: string }
  | { type: 'steps' | 'tips'; title?: string; items: string[] }
  | { type: 'facts'; title?: string; items: Fact[] }
  | { type: 'links'; title?: string; items: LinkItem[] }
  | { type: 'image'; title?: string; photo: Photo }
  | { type: 'html'; title?: string; html: string };
export type Guide = { kind: string; title: string; blocks: Block[] };
export type Fee = { title: string; adult?: string; child?: string; source?: LinkItem };
export type Tour = {
  title: string;
  provider?: string;
  checkedAt?: string;
  source?: LinkItem;
  meeting?: string;
  meetingMap?: string;
  departure?: string;
  returnTime?: string;
  included?: string;
  excluded?: string;
  feeNote?: string;
  preparation: string[];
  fees: Fee[];
};
export type ChecklistItem = { id: string; priority?: string; title: string; description?: string };
export type ChecklistGroup = { id: string; title: string; hint?: string; items: ChecklistItem[] };
export type LinkGroup = { label: string; links: LinkItem[] };
export type Flight = {
  direction: string;
  airline?: string;
  from: string;
  to: string;
  date: string;
  depart: string;
  arrive: string;
  note?: string;
};
export type Traveler = { label: string; emoji?: string };
export type RoutePoint = { code: string; label: string; vehicle?: string; vehicleLabel?: string };
export type LegacySection = { id: string; title: string; blocks: Block[] };
export type Provenance = {
  kind: string;
  createdAt?: string;
  method?: string;
  disclaimer?: string;
  referencedProducts: LinkItem[];
};
export type TripContent = {
  coverPhoto?: Photo;
  travelers: Traveler[];
  flights: Flight[];
  route: RoutePoint[];
  linkGroups: LinkGroup[];
  checklistGroups: ChecklistGroup[];
  sections: LegacySection[];
  provenance?: Provenance;
};
export type PlaceInfo = {
  key: string;
  kind: string;
  name: string;
  area: string;
  branch?: string;
  category?: string;
  items?: string;
  menu?: string;
  address?: string;
  hours?: string;
  coordinates?: LatLng;
  mapUrl?: string;
  note?: string;
  checkedAt?: string;
  facts: Fact[];
  sources: LinkItem[];
  alternatives: string[];
  media: LinkItem[];
};
export type StopView = {
  id: string;
  key: string;
  time: string;
  title: string;
  type: string;
  details: string;
  duration?: string;
  buffer?: string;
  timing?: string;
  transportIcon?: string;
  coordinates?: LatLng;
  approximate: boolean;
  optional: boolean;
  transit?: Transit;
  photo?: Photo;
  hotelPhoto?: Photo;
  links: LinkItem[];
  guide?: Guide;
  placeKey?: string;
};
export type DayView = {
  id: string;
  number: number;
  date: string;
  city: string;
  theme: string;
  note?: string;
  tour?: Tour;
  stops: StopView[];
};
export type TripView = {
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  startDate: string;
  endDate: string;
  timezone: string;
  visibility: string;
  isSample: boolean;
  permissions: { canEdit: boolean; canClone: boolean };
  content: TripContent;
  days: DayView[];
  places: PlaceInfo[];
};

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const text = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() !== '' ? v : undefined);
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const texts = (v: unknown): string[] =>
  list(v)
    .map(text)
    .filter((s): s is string => s !== undefined);
const num = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);
function defined<T>(items: (T | undefined)[]): T[] {
  return items.filter((item): item is T => item !== undefined);
}

export function safeHref(url: unknown): string | undefined {
  if (typeof url !== 'string') return undefined;
  const value = url.trim();
  if (value.startsWith('#')) return value;
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  try {
    const parsed = new URL(value);
    return ['http:', 'https:', 'mailto:', 'tel:'].includes(parsed.protocol) ? value : undefined;
  } catch {
    return undefined;
  }
}

/** 이미지는 같은 사이트 경로나 https만 받는다. */
const safeImageSrc = (src: unknown) => {
  const href = safeHref(src);
  return href && (href.startsWith('/') || href.startsWith('https://')) ? href : undefined;
};

export function readLink(v: unknown): LinkItem | undefined {
  if (!isRecord(v)) return undefined;
  const label = text(v.label);
  const url = safeHref(v.url);
  if (!label || !url) return undefined;
  const note = text(v.note);
  return note ? { label, url, note } : { label, url };
}

const readLinks = (v: unknown) => defined(list(v).map(readLink));

export function readPhoto(v: unknown): Photo | undefined {
  if (!isRecord(v)) return undefined;
  const src = safeImageSrc(v.src);
  const alt = text(v.alt);
  if (!src || !alt) return undefined;
  const photo: Photo = { src, alt };
  for (const key of ['credit', 'license', 'context', 'focus'] as const) {
    const value = text(v[key]);
    if (value) photo[key] = value;
  }
  const licenseUrl = safeHref(v.licenseUrl);
  if (licenseUrl) photo.licenseUrl = licenseUrl;
  const sourceUrl = safeHref(v.sourceUrl ?? v.source);
  if (sourceUrl) photo.sourceUrl = sourceUrl;
  const width = num(v.width);
  const height = num(v.height);
  if (width && height) {
    photo.width = width;
    photo.height = height;
  }
  return photo;
}

export function readCoordinates(v: unknown): LatLng | undefined {
  if (!Array.isArray(v) || v.length !== 2) return undefined;
  const [lat, lng] = v;
  if (typeof lat !== 'number' || typeof lng !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lng))
    return undefined;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return undefined;
  return [lat, lng];
}

function readTransit(v: unknown): Transit | undefined {
  if (!isRecord(v)) return undefined;
  const mode = text(v.mode);
  const label = text(v.label);
  if (!mode || !label) return undefined;
  const icon = text(v.icon);
  const waypoints = defined(list(v.waypoints).map(readCoordinates));
  return icon ? { mode, label, icon, waypoints } : { mode, label, waypoints };
}

function readFact(v: unknown): Fact | undefined {
  if (Array.isArray(v)) {
    const [label, value] = v;
    return text(label) && text(value) ? { label: label as string, value: value as string } : undefined;
  }
  if (isRecord(v) && text(v.label) && text(v.value)) return { label: v.label as string, value: v.value as string };
  return undefined;
}

export function readBlock(v: unknown): Block | undefined {
  if (!isRecord(v)) return undefined;
  const title = text(v.title);
  const withTitle = <T extends object>(block: T) => (title ? { ...block, title } : block);
  const type = v.type;
  switch (type) {
    case 'paragraph': {
      const value = text(v.text);
      return value ? withTitle({ type: 'paragraph' as const, text: value }) : undefined;
    }
    case 'steps':
    case 'tips': {
      const items = texts(v.items);
      return items.length ? withTitle({ type, items }) : undefined;
    }
    case 'facts': {
      const items = defined(list(v.items).map(readFact));
      return items.length ? withTitle({ type: 'facts' as const, items }) : undefined;
    }
    case 'links': {
      const items = readLinks(v.items);
      return items.length ? withTitle({ type: 'links' as const, items }) : undefined;
    }
    case 'image':
    case 'figure': {
      const photo = readPhoto(v.photo ?? v);
      return photo ? withTitle({ type: 'image' as const, photo }) : undefined;
    }
    case 'html': {
      const html = text(v.html);
      return html ? withTitle({ type: 'html' as const, html }) : undefined;
    }
    default:
      return undefined;
  }
}

const readBlocks = (v: unknown) => defined(list(v).map(readBlock));

function readGuide(v: unknown): Guide | undefined {
  if (!isRecord(v)) return undefined;
  const title = text(v.title);
  const blocks = readBlocks(v.blocks);
  if (!title || !blocks.length) return undefined;
  return { kind: text(v.kind) ?? 'place', title, blocks };
}

function readTour(v: unknown): Tour | undefined {
  if (!isRecord(v)) return undefined;
  const title = text(v.title);
  if (!title) return undefined;
  const fees = defined(
    list(v.fees).map((fee): Fee | undefined => {
      if (!isRecord(fee) || !text(fee.title)) return undefined;
      return {
        title: fee.title as string,
        adult: text(fee.adult),
        child: text(fee.child),
        source: readLink(fee.source),
      };
    }),
  );
  return {
    title,
    provider: text(v.provider),
    checkedAt: text(v.checkedAt),
    source: readLink(v.source),
    meeting: text(v.meeting),
    meetingMap: safeHref(v.meetingMap),
    departure: text(v.departure),
    returnTime: text(v.returnTime),
    included: text(v.included),
    excluded: text(v.excluded),
    feeNote: text(v.feeNote),
    preparation: texts(v.preparation),
    fees,
  };
}

function readContent(v: unknown): TripContent {
  const c = isRecord(v) ? v : {};
  const provenance =
    isRecord(c.provenance) && text(c.provenance.kind)
      ? {
          kind: c.provenance.kind as string,
          createdAt: text(c.provenance.createdAt),
          method: text(c.provenance.method),
          disclaimer: text(c.provenance.disclaimer),
          referencedProducts: readLinks(c.provenance.referencedProducts),
        }
      : undefined;
  return {
    coverPhoto: readPhoto(c.coverPhoto),
    travelers: defined(
      list(c.travelers).map((t) =>
        isRecord(t) && text(t.label) ? { label: t.label as string, emoji: text(t.emoji) } : undefined,
      ),
    ),
    flights: defined(
      list(c.flights).map((f): Flight | undefined => {
        if (!isRecord(f)) return undefined;
        const [direction, from, to, date, depart, arrive] = [f.direction, f.from, f.to, f.date, f.depart, f.arrive].map(
          text,
        );
        if (!direction || !from || !to || !date || !depart || !arrive) return undefined;
        return { direction, airline: text(f.airline), from, to, date, depart, arrive, note: text(f.note) };
      }),
    ),
    route: defined(
      list(c.route).map((r) =>
        isRecord(r) && text(r.code) && text(r.label)
          ? {
              code: r.code as string,
              label: r.label as string,
              vehicle: text(r.vehicle),
              vehicleLabel: text(r.vehicleLabel),
            }
          : undefined,
      ),
    ),
    linkGroups: defined(
      list(c.linkGroups).map((g) => {
        if (!isRecord(g) || !text(g.label)) return undefined;
        const links = readLinks(g.links);
        return links.length ? { label: g.label as string, links } : undefined;
      }),
    ),
    checklistGroups: defined(
      list(c.checklistGroups).map((g): ChecklistGroup | undefined => {
        if (!isRecord(g) || !text(g.id) || !text(g.title)) return undefined;
        const items = defined(
          list(g.items).map((i): ChecklistItem | undefined =>
            isRecord(i) && text(i.id) && text(i.title)
              ? {
                  id: i.id as string,
                  title: i.title as string,
                  priority: text(i.priority),
                  description: text(i.description),
                }
              : undefined,
          ),
        );
        return { id: g.id as string, title: g.title as string, hint: text(g.hint), items };
      }),
    ),
    sections: defined(
      list(c.sections).map((s) => {
        if (!isRecord(s) || !text(s.id) || !text(s.title)) return undefined;
        return { id: s.id as string, title: s.title as string, blocks: readBlocks(s.blocks) };
      }),
    ),
    provenance,
  };
}

function readPlace(p: PlaceDocument): PlaceInfo {
  const d = isRecord(p.details) ? p.details : {};
  return {
    key: p.key,
    kind: p.kind,
    name: p.name,
    area: p.area,
    branch: text(d.branch),
    category: text(d.category),
    items: text(d.items),
    menu: text(d.menu),
    address: text(d.address),
    hours: text(d.hours),
    coordinates: readCoordinates(d.coordinates),
    mapUrl: safeHref(d.mapUrl),
    note: text(d.note),
    checkedAt: text(d.checkedAt),
    facts: defined(list(d.facts).map(readFact)),
    sources: readLinks(d.sources),
    alternatives: texts(d.alternatives),
    media: readLinks(d.media),
  };
}

function readStop(s: StopDocument): StopView {
  return {
    id: s.id,
    key: s.key,
    time: s.time,
    title: s.title,
    type: s.type,
    details: s.details,
    duration: text(s.duration),
    buffer: text(s.buffer),
    timing: text(s.timing),
    transportIcon: text(s.transportIcon),
    coordinates: readCoordinates(s.coordinates),
    approximate: s.approximate,
    optional: s.optional,
    transit: readTransit(s.transit),
    photo: readPhoto(s.photo),
    hotelPhoto: readPhoto(s.hotelPhoto),
    links: readLinks(s.links),
    guide: readGuide(s.guide),
    placeKey: text(s.placeKey),
  };
}

export function readTrip(doc: TripDocument): TripView {
  return {
    id: doc.id,
    slug: doc.slug,
    title: doc.title,
    subtitle: text(doc.subtitle),
    startDate: doc.startDate,
    endDate: doc.endDate,
    timezone: doc.timezone,
    visibility: doc.visibility,
    isSample: doc.isSample,
    permissions: doc.permissions,
    content: readContent(doc.content),
    days: doc.days.map((day) => ({
      id: day.id,
      number: day.number,
      date: day.date,
      city: day.city,
      theme: day.theme,
      note: text(day.note),
      tour: readTour(day.tour),
      stops: day.stops.map(readStop),
    })),
    places: doc.places.map(readPlace),
  };
}

export const readSummaryCover = (summary: TripSummary) => readPhoto(summary.coverPhoto);
