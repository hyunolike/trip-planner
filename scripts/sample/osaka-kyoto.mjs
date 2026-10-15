import { trip } from '../../src/data.js';
import { compact, toLink } from './util.mjs';

export { compact, toLink };

export const SLUG = 'osaka-kyoto-family-2026';
const YEAR = trip.days[0].date.slice(0, 4);

export const KNOWN_STOP_KEYS = ['id', 'time', 'title', 'type', 'details', 'duration', 'transport', 'coordinates', 'links', 'transit', 'buffer', 'hotelPhoto', 'approximate', 'timing', 'restaurant', 'photo'];
// dateLabel, routeIndex는 date와 경로 순서에서 다시 계산하는 표시용 값이라 옮기지 않는다.
export const KNOWN_DAY_KEYS = ['number', 'date', 'dateLabel', 'city', 'theme', 'color', 'routeIndex', 'note', 'stops', 'tour'];
export const KNOWN_TOUR_KEYS = ['title', 'seller', 'checkedAt', 'source', 'meeting', 'meetingMap', 'departure', 'returnTime', 'included', 'excluded', 'preparation', 'fees', 'feeNote'];

export function toPhoto(photo) {
  if (!photo) return undefined;
  return compact({
    src: photo.src,
    alt: photo.alt,
    credit: photo.credit,
    license: photo.license,
    licenseUrl: photo.licenseUrl,
    sourceUrl: photo.source,
    context: photo.context,
    focus: photo.focus,
    width: photo.width,
    height: photo.height,
  });
}

function toTransit(transit) {
  if (!transit) return undefined;
  return compact({ mode: transit.mode, label: transit.label, icon: transit.icon, waypoints: transit.waypoints });
}

function toTour(tour) {
  if (!tour) return undefined;
  return compact({
    title: tour.title,
    provider: tour.seller,
    checkedAt: tour.checkedAt,
    source: tour.source && toLink(tour.source),
    meeting: tour.meeting,
    meetingMap: tour.meetingMap,
    departure: tour.departure,
    returnTime: tour.returnTime,
    included: tour.included,
    excluded: tour.excluded,
    preparation: tour.preparation,
    fees: tour.fees?.map((fee) => compact({ title: fee.title, adult: fee.adult, child: fee.child, source: fee.source && toLink(fee.source) })),
    feeNote: tour.feeNote,
  });
}

export function toStop(stop, placeIdByRestaurant = new Map(), guideFor = () => undefined) {
  return compact({
    id: stop.id,
    time: stop.time,
    title: stop.title,
    type: stop.type,
    details: stop.details,
    duration: stop.duration,
    buffer: stop.buffer,
    timing: stop.timing,
    transportIcon: stop.transport,
    coordinates: stop.coordinates,
    approximate: stop.approximate,
    transit: toTransit(stop.transit),
    photo: toPhoto(stop.photo),
    hotelPhoto: toPhoto(stop.hotelPhoto),
    links: stop.links?.map(toLink),
    placeId: stop.restaurant ? placeIdByRestaurant.get(stop.restaurant.name) : undefined,
    guide: guideFor(stop),
  });
}

export function toDay(day, placeIdByRestaurant, guideFor) {
  return compact({
    number: day.number,
    date: day.date,
    city: day.city,
    theme: day.theme,
    note: day.note,
    color: day.color,
    tour: toTour(day.tour),
    stops: day.stops.map((stop) => toStop(stop, placeIdByRestaurant, guideFor)),
  });
}

function toFlight([direction, flight]) {
  return compact({
    direction: direction === 'outbound' ? 'outbound' : 'return',
    airline: flight.airline,
    from: flight.from,
    to: flight.to,
    date: `${YEAR}-${flight.date.replace('.', '-')}`,
    depart: flight.depart,
    arrive: flight.arrive,
  });
}

export function buildOsakaKyotoTrip({ placeIdByRestaurant = new Map(), guideFor, extras = {} } = {}) {
  return compact({
    schemaVersion: 1,
    slug: SLUG,
    title: trip.title,
    subtitle: trip.subtitle,
    startDate: trip.days[0].date,
    endDate: trip.days.at(-1).date,
    timezone: 'Asia/Tokyo',
    visibility: 'link',
    isSample: false,
    coverPhoto: toPhoto(trip.heroPhoto),
    gallery: trip.heroSlides.map((slide) => compact({ photo: toPhoto(slide.photo), place: slide.place, area: slide.area, link: { label: `${slide.place} 소개`, url: slide.blogUrl } })),
    travelers: trip.travelers.map((traveler) => compact({ label: traveler.label, emoji: traveler.emoji })),
    flights: Object.entries(trip.flights).map(toFlight),
    route: trip.route.map((point) => compact({ code: point.code, label: point.label, vehicle: point.vehicle, vehicleLabel: point.vehicleLabel })),
    days: trip.days.map((day) => toDay(day, placeIdByRestaurant, guideFor)),
    ...extras,
    provenance: {
      kind: 'family-original',
      createdAt: '2026-10-16',
      method: 'src/data.js와 가이드 모듈을 그대로 읽어 변환했다. 문구는 고치지 않았다.',
      disclaimer: '실제 가족 여행 일정이다. 예약과 운영 정보는 2026년 10월 기준이며 방문 전 다시 확인해야 한다.',
    },
  });
}

import { buildChecklistGroups, buildGuide, buildLinkGroups, buildPlaces, buildSections } from './osaka-kyoto-extras.mjs';

export function buildOsakaKyotoTripFull() {
  const { places, placeIdByRestaurant } = buildPlaces();
  return buildOsakaKyotoTrip({
    placeIdByRestaurant,
    guideFor: buildGuide,
    extras: { places, linkGroups: buildLinkGroups(), checklistGroups: buildChecklistGroups(), sections: buildSections() },
  });
}
