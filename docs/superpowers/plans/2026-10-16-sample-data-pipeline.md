# 샘플 데이터 파이프라인 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 오사카·교토 일정을 한 글자도 잃지 않고 `sample/osaka-kyoto-family-2026.json`으로 내보내고, 조사해 만든 다낭·호이안 샘플과 함께 하나의 스키마로 검증하는 도구를 만든다.

**Architecture:** 내보내기 도구는 기존 `src/` 모듈을 import만 하고 고치지 않는다. 구조화할 수 있는 데이터(스톱, 장소, 체크리스트, 명소 가이드)는 스키마 필드로 옮기고, 기존 렌더 함수가 그리는 안내 HTML은 `html` 블록으로 보관한다. 기존 앱이 그리는 모든 링크와 이미지 경로가 JSON에 남는지를 테스트가 확인한다.

**Tech Stack:** Node.js 22, ESM, Vitest 3(기존), jsdom 26(기존), Ajv 8 + ajv-formats 3(신규), JSON Schema 2020-12

**Spec:** `docs/superpowers/specs/2026-10-15-b2c-trip-planner-design.md` 3.6절 "기존 오사카·교토 데이터 이관"

## Global Constraints

- `src/`, `public/`, `tests/`의 기존 파일은 수정하지 않는다. 새 테스트는 `tests/sample/`에 둔다.
- 오사카·교토 원본 문구는 고치지 않는다. 변환은 필드 이름과 구조만 바꾼다.
- 오사카·교토: `slug=osaka-kyoto-family-2026`, `visibility=link`, `isSample=false`, `provenance.kind=family-original`.
- 다낭·호이안: `slug=danang-hoian-family-2027`, `visibility=public`, `isSample=true`, `provenance.kind=researched-example`.
- 내보내기 결과는 결정적이어야 한다. 같은 입력이면 바이트가 같은 JSON을 쓴다(현재 시각을 넣지 않는다).
- 스톱 50개, 날짜 4개를 유지한다.
- JSON은 UTF-8, 2칸 들여쓰기, 끝에 줄바꿈 하나.

## Review Focus

- 기존 화면의 링크·이미지 중 HTML 안에서 `&amp;`로 인코딩된 URL: 텍스트 검색이 아니라 HTML을 파싱해 비교해야 누락으로 오판하지 않는다. Task 4 테스트가 파싱해서 비교한다.
- 원본 객체에 새 키가 생긴 경우(예: 스톱에 새 필드 추가): 변환기가 조용히 버리면 안 된다. Task 2와 3이 "알려진 키 목록" 테스트로 막는다.
- 여러 스톱이 같은 식당을 가리키는 경우: 장소가 두 번 생기면 안 된다. Task 3 테스트가 이름 중복을 확인한다.
- 다낭 샘플의 날짜가 시작일과 어긋나거나 자정 넘는 귀국편 시각이 거꾸로 적힌 경우: 검증기가 날짜별로 정확한 위치를 알려야 한다. Task 1 테스트가 오류 문구를 확인한다.
- 같은 내보내기를 두 번 돌렸을 때 결과가 달라지는 경우: 시더의 멱등성이 깨진다. Task 4 테스트가 두 번 빌드해 비교한다.

---

### Task 1: 스키마 보강과 검증기

원본 데이터에는 스키마 v1이 모르는 형태가 있다. 스톱 유형 `breakfast`, `bath`, `tour`, 이동 수단 `cablecar`, 사진의 `context`·`focus`·`width`·`height`·`licenseUrl`, 날짜별 `tour`, 숙소 사진, 장소의 부가 정보, 여행 대표 사진 갤러리, 기존 화면 보관용 섹션이다. 모두 선택 필드로 추가하므로 다낭 샘플은 그대로 유효하다.

**Files:**
- Modify: `sample/schema/trip.schema.json`
- Create: `scripts/sample/validate.mjs`
- Create: `tests/sample/validate.test.js`
- Modify: `package.json` (devDependencies, scripts)

**Interfaces:**
- Produces: `validateTrip(trip: object): { ok: boolean, errors: string[] }`, `semanticErrors(trip: object): string[]` (from `scripts/sample/validate.mjs`)
- Produces: CLI `pnpm sample:validate` — 인자로 받은 JSON 파일을 모두 검증하고 하나라도 실패하면 종료 코드 1

- [ ] **Step 1: 의존성 설치**

```bash
pnpm install --frozen-lockfile
pnpm add -D ajv@^8.17.1 ajv-formats@^3.0.1
```

Expected: `package.json` devDependencies에 `ajv`, `ajv-formats`가 추가된다.

- [ ] **Step 2: 스키마 보강**

`sample/schema/trip.schema.json`을 다음과 같이 고친다.

1. 최상위 `properties`에 추가:

```json
"gallery": { "type": "array", "items": { "type": "object", "additionalProperties": false, "required": ["photo", "place"], "properties": { "photo": { "$ref": "#/$defs/photo" }, "place": { "type": "string" }, "area": { "type": "string" }, "link": { "$ref": "#/$defs/link" } } } },
"sections": { "type": "array", "items": { "type": "object", "additionalProperties": false, "required": ["id", "title", "blocks"], "properties": { "id": { "type": "string", "pattern": "^[a-z0-9-]+$" }, "title": { "type": "string" }, "legacy": { "type": "boolean", "description": "기존 Vite 앱 화면을 그대로 보관한 섹션. 새 화면은 구조화 필드를 우선 쓰고 이 섹션은 보조로만 쓴다." }, "blocks": { "type": "array", "items": { "$ref": "#/$defs/block" } } } } }
```

2. `$defs.photo.properties`에 추가:

```json
"licenseUrl": { "type": "string", "format": "uri" },
"context": { "type": "string" },
"focus": { "type": "string" },
"width": { "type": "integer" },
"height": { "type": "integer" }
```

3. `$defs.transit.properties.mode.enum`에 `"cablecar"` 추가.

4. `$defs.stop.properties.type.enum`에 `"breakfast"`, `"bath"`, `"tour"` 추가. `$defs.stop.properties`에 추가:

```json
"hotelPhoto": { "$ref": "#/$defs/photo" }
```

5. `$defs.block.properties`에 `"title": { "type": "string" }` 추가.

6. `$defs.day.properties`에 추가:

```json
"tour": { "$ref": "#/$defs/tour" }
```

7. `$defs`에 추가:

```json
"tour": {
  "type": "object",
  "additionalProperties": false,
  "required": ["title"],
  "properties": {
    "title": { "type": "string" },
    "provider": { "type": "string" },
    "checkedAt": { "type": "string" },
    "source": { "$ref": "#/$defs/link" },
    "meeting": { "type": "string" },
    "meetingMap": { "type": "string", "format": "uri" },
    "departure": { "type": "string" },
    "returnTime": { "type": "string" },
    "included": { "type": "string" },
    "excluded": { "type": "string" },
    "preparation": { "type": "array", "items": { "type": "string" } },
    "fees": { "type": "array", "items": { "type": "object", "additionalProperties": false, "required": ["title"], "properties": { "title": { "type": "string" }, "adult": { "type": "string" }, "child": { "type": "string" }, "source": { "$ref": "#/$defs/link" } } } }
  }
}
```

8. `$defs.place.properties`에 추가:

```json
"icon": { "type": "string" },
"mapQuery": { "type": "string" },
"facts": { "type": "array", "items": { "type": "array", "prefixItems": [ { "type": "string" }, { "type": "string" } ], "items": false, "minItems": 2 } },
"media": { "type": "array", "items": { "$ref": "#/$defs/link" } },
"alternatives": { "type": "array", "items": { "type": "string" } }
```

Run: `python3 -c "import json;json.load(open('sample/schema/trip.schema.json'))"`
Expected: 출력 없이 종료(JSON 문법 오류 없음).

- [ ] **Step 3: 실패하는 테스트 작성**

`tests/sample/validate.test.js`:

```js
/** @vitest-environment node */
import { describe, expect, it } from 'vitest';
import { semanticErrors, validateTrip } from '../../scripts/sample/validate.mjs';

const stop = (id, time) => ({ id, time, title: id, type: 'sight', details: 'd' });
const base = () => ({
  schemaVersion: 1,
  slug: 'test-trip',
  title: '테스트 여행',
  startDate: '2027-03-03',
  endDate: '2027-03-04',
  visibility: 'public',
  isSample: true,
  days: [
    { number: 1, date: '2027-03-03', city: 'DANANG', theme: '도착', stops: [stop('d1-a', '09:00'), stop('d1-b', '10:00')] },
    { number: 2, date: '2027-03-04', city: 'HOI AN', theme: '올드타운', stops: [stop('d2-a', '08:00')] },
  ],
  provenance: { kind: 'researched-example', createdAt: '2026-10-16' },
});

describe('validateTrip', () => {
  it('accepts a minimal valid trip', () => {
    expect(validateTrip(base())).toEqual({ ok: true, errors: [] });
  });

  it('rejects unknown properties with the JSON path', () => {
    const trip = base();
    trip.days[0].stops[0].colour = 'red';
    const result = validateTrip(trip);
    expect(result.ok).toBe(false);
    expect(result.errors.join('\n')).toContain('/days/0/stops/0');
  });

  it('rejects a time that is not HH:MM', () => {
    const trip = base();
    trip.days[0].stops[0].time = '9:00';
    expect(validateTrip(trip).ok).toBe(false);
  });
});

describe('semanticErrors', () => {
  it('reports a day whose date does not follow the start date', () => {
    const trip = base();
    trip.days[1].date = '2027-03-05';
    expect(semanticErrors(trip)).toContain('day 2: date 2027-03-05 should be 2027-03-04');
  });

  it('reports stops that go backwards in time within a day', () => {
    const trip = base();
    trip.days[0].stops[1].time = '08:30';
    expect(semanticErrors(trip)).toContain('day 1: d1-b at 08:30 is earlier than 09:00');
  });

  it('reports duplicate stop ids across days', () => {
    const trip = base();
    trip.days[1].stops[0].id = 'd1-a';
    expect(semanticErrors(trip)).toContain('duplicate stop id d1-a');
  });

  it('reports day numbers that skip', () => {
    const trip = base();
    trip.days[1].number = 3;
    expect(semanticErrors(trip)).toContain('day 2: number is 3');
  });

  it('reports a day after the end date', () => {
    const trip = base();
    trip.endDate = '2027-03-03';
    expect(semanticErrors(trip)).toContain('day 2: 2027-03-04 is after endDate 2027-03-03');
  });

  it('reports a stop that points to a missing place', () => {
    const trip = base();
    trip.places = [{ id: 'pho-1', kind: 'dining', name: '퍼', area: '다낭' }];
    trip.days[0].stops[0].placeId = 'pho-2';
    expect(semanticErrors(trip)).toContain('d1-a: placeId pho-2 does not exist');
  });

  it('reports duplicate place ids', () => {
    const trip = base();
    trip.places = [
      { id: 'pho-1', kind: 'dining', name: '퍼', area: '다낭' },
      { id: 'pho-1', kind: 'dining', name: '퍼2', area: '다낭' },
    ];
    expect(semanticErrors(trip)).toContain('duplicate place id pho-1');
  });
});
```

- [ ] **Step 4: 테스트가 실패하는지 확인**

Run: `pnpm vitest run tests/sample/validate.test.js`
Expected: FAIL — `Failed to load url ../../scripts/sample/validate.mjs`

- [ ] **Step 5: 검증기 구현**

`scripts/sample/validate.mjs`:

```js
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const schema = JSON.parse(readFileSync(new URL('../../sample/schema/trip.schema.json', import.meta.url), 'utf8'));
const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const validateSchema = ajv.compile(schema);

function addDays(isoDate, days) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function semanticErrors(trip) {
  const errors = [];
  const stopIds = new Set();
  const placeIds = new Set();

  for (const place of trip.places ?? []) {
    if (placeIds.has(place.id)) errors.push(`duplicate place id ${place.id}`);
    placeIds.add(place.id);
  }

  trip.days.forEach((day, index) => {
    if (day.number !== index + 1) errors.push(`day ${index + 1}: number is ${day.number}`);
    const expected = addDays(trip.startDate, index);
    if (day.date !== expected) errors.push(`day ${index + 1}: date ${day.date} should be ${expected}`);
    if (day.date > trip.endDate) errors.push(`day ${index + 1}: ${day.date} is after endDate ${trip.endDate}`);

    let previous = '00:00';
    for (const stop of day.stops) {
      if (stopIds.has(stop.id)) errors.push(`duplicate stop id ${stop.id}`);
      stopIds.add(stop.id);
      if (stop.time < previous) errors.push(`day ${index + 1}: ${stop.id} at ${stop.time} is earlier than ${previous}`);
      previous = stop.time;
      if (stop.placeId && !placeIds.has(stop.placeId)) errors.push(`${stop.id}: placeId ${stop.placeId} does not exist`);
    }
  });

  return errors;
}

export function validateTrip(trip) {
  const schemaOk = validateSchema(trip);
  const errors = schemaOk
    ? semanticErrors(trip)
    : validateSchema.errors.map((error) => `${error.instancePath || '/'} ${error.message}`);
  return { ok: errors.length === 0, errors };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const files = process.argv.slice(2);
  let failed = false;
  for (const file of files) {
    const { ok, errors } = validateTrip(JSON.parse(readFileSync(file, 'utf8')));
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${file}`);
    errors.forEach((error) => console.log(`     ${error}`));
    failed ||= !ok;
  }
  process.exit(failed ? 1 : 0);
}
```

`package.json`의 `scripts`에 추가:

```json
"sample:validate": "node scripts/sample/validate.mjs sample/*.json"
```

- [ ] **Step 6: 테스트 통과 확인**

Run: `pnpm vitest run tests/sample/validate.test.js`
Expected: PASS (10 tests)

- [ ] **Step 7: 기존 테스트가 그대로인지 확인**

Run: `pnpm test`
Expected: 기존 16개 파일과 새 파일 모두 PASS

- [ ] **Step 8: Commit**

```bash
git add sample/schema/trip.schema.json scripts/sample/validate.mjs tests/sample/validate.test.js package.json pnpm-lock.yaml
git commit -m "feat(sample): add trip schema validator with semantic checks"
```

---

### Task 2: 여행·날짜·스톱 변환

**Files:**
- Create: `scripts/sample/util.mjs`
- Create: `scripts/sample/osaka-kyoto.mjs`
- Create: `tests/sample/osaka-kyoto.test.js`

**Interfaces:**
- Consumes: `validateTrip` (Task 1)
- Produces: `compact(object)`, `toLink(link)` (from `scripts/sample/util.mjs`. 두 변환 모듈이 서로를 import하지 않도록 공용 함수를 따로 둔다)
- Produces: `SLUG = 'osaka-kyoto-family-2026'`, `toPhoto(photo)`, `toStop(stop, placeIdByRestaurant: Map<string,string>)`, `toDay(day, placeIdByRestaurant)`, `buildOsakaKyotoTrip(): object` (from `scripts/sample/osaka-kyoto.mjs`). Task 2에서는 `guide`, `places`, `checklistGroups`, `linkGroups`, `sections` 없이 만든다. Task 3이 채운다.
- Produces: `KNOWN_STOP_KEYS`, `KNOWN_DAY_KEYS`, `KNOWN_TOUR_KEYS` 배열 (같은 파일). 원본에 새 키가 생기면 테스트가 실패해 변환 누락을 알린다.

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/sample/osaka-kyoto.test.js`:

```js
/** @vitest-environment node */
import { describe, expect, it } from 'vitest';
import { trip } from '../../src/data.js';
import { validateTrip } from '../../scripts/sample/validate.mjs';
import { KNOWN_DAY_KEYS, KNOWN_STOP_KEYS, KNOWN_TOUR_KEYS, SLUG, buildOsakaKyotoTrip, toPhoto } from '../../scripts/sample/osaka-kyoto.mjs';

describe('buildOsakaKyotoTrip', () => {
  const out = buildOsakaKyotoTrip();

  it('produces a schema-valid trip', () => {
    expect(validateTrip(out)).toEqual({ ok: true, errors: [] });
  });

  it('keeps identity and visibility from the spec', () => {
    expect(out).toMatchObject({ slug: SLUG, visibility: 'link', isSample: false, startDate: '2026-10-21', endDate: '2026-10-24', timezone: 'Asia/Tokyo' });
    expect(out.provenance.kind).toBe('family-original');
  });

  it('keeps all 4 days and 50 stops in order', () => {
    expect(out.days.map((day) => day.stops.length)).toEqual(trip.days.map((day) => day.stops.length));
    expect(out.days.flatMap((day) => day.stops.map((stop) => stop.id))).toEqual(trip.days.flatMap((day) => day.stops.map((stop) => stop.id)));
    expect(out.days.flatMap((day) => day.stops)).toHaveLength(50);
  });

  it('keeps stop text unchanged', () => {
    const source = trip.days.flatMap((day) => day.stops);
    const mapped = out.days.flatMap((day) => day.stops);
    source.forEach((stop, index) => {
      expect(mapped[index]).toMatchObject({ time: stop.time, title: stop.title, type: stop.type, details: stop.details });
      if (stop.buffer) expect(mapped[index].buffer).toBe(stop.buffer);
      if (stop.timing) expect(mapped[index].timing).toBe(stop.timing);
      if (stop.transport) expect(mapped[index].transportIcon).toBe(stop.transport);
    });
  });

  it('converts flight dates to ISO dates', () => {
    expect(out.flights).toEqual([
      expect.objectContaining({ direction: 'outbound', from: 'GMP', to: 'KIX', date: '2026-10-21', depart: '08:10' }),
      expect.objectContaining({ direction: 'return', from: 'KIX', to: 'GMP', date: '2026-10-24', depart: '20:30' }),
    ]);
  });

  it('maps the day tour without dropping fields', () => {
    const sourceDay = trip.days.find((day) => day.tour);
    const mappedDay = out.days[sourceDay.number - 1];
    expect(mappedDay.tour.title).toBe(sourceDay.tour.title);
    expect(mappedDay.tour.provider).toBe(sourceDay.tour.seller);
    expect(mappedDay.tour.fees).toHaveLength(sourceDay.tour.fees.length);
  });

  it('renames photo.source to sourceUrl', () => {
    expect(toPhoto({ src: '/a.webp', alt: 'a', source: 'https://example.com/a' })).toEqual({ src: '/a.webp', alt: 'a', sourceUrl: 'https://example.com/a' });
  });

  it('knows every key used in the original data', () => {
    const stopKeys = new Set(trip.days.flatMap((day) => day.stops.flatMap((stop) => Object.keys(stop))));
    const dayKeys = new Set(trip.days.flatMap((day) => Object.keys(day)));
    const tourKeys = new Set(trip.days.filter((day) => day.tour).flatMap((day) => Object.keys(day.tour)));
    expect([...stopKeys].filter((key) => !KNOWN_STOP_KEYS.includes(key))).toEqual([]);
    expect([...dayKeys].filter((key) => !KNOWN_DAY_KEYS.includes(key))).toEqual([]);
    expect([...tourKeys].filter((key) => !KNOWN_TOUR_KEYS.includes(key))).toEqual([]);
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `pnpm vitest run tests/sample/osaka-kyoto.test.js`
Expected: FAIL — `Failed to load url ../../scripts/sample/osaka-kyoto.mjs`

- [ ] **Step 3: 변환기 구현**

`scripts/sample/util.mjs`:

```js
export function compact(object) {
  return Object.fromEntries(
    Object.entries(object).filter(([, value]) => value !== undefined && value !== null && value !== '' && !(Array.isArray(value) && value.length === 0)),
  );
}

export function toLink(link) {
  return compact({ label: link.label, url: link.url, note: link.note });
}
```

`scripts/sample/osaka-kyoto.mjs`:

```js
import { trip } from '../../src/data.js';
import { compact, toLink } from './util.mjs';

export { compact, toLink };

export const SLUG = 'osaka-kyoto-family-2026';
const YEAR = trip.days[0].date.slice(0, 4);

export const KNOWN_STOP_KEYS = ['id', 'time', 'title', 'type', 'details', 'duration', 'transport', 'coordinates', 'links', 'transit', 'buffer', 'hotelPhoto', 'approximate', 'timing', 'restaurant', 'photo'];
// dateLabel, routeIndex는 date와 경로 순서에서 다시 계산하는 표시용 값이라 옮기지 않는다.
export const KNOWN_DAY_KEYS = ['number', 'date', 'dateLabel', 'city', 'theme', 'color', 'routeIndex', 'note', 'stops', 'tour'];
export const KNOWN_TOUR_KEYS = ['title', 'seller', 'checkedAt', 'source', 'meeting', 'meetingMap', 'departure', 'returnTime', 'included', 'excluded', 'preparation', 'fees'];

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
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm vitest run tests/sample/osaka-kyoto.test.js`
Expected: PASS (8 tests). `knows every key`가 실패하면 실패 메시지의 키를 읽고, 그 키를 변환 함수와 `KNOWN_*` 목록에 함께 추가한다. 목록에만 추가하고 변환을 빼면 안 된다.

- [ ] **Step 5: Commit**

```bash
git add scripts/sample/util.mjs scripts/sample/osaka-kyoto.mjs tests/sample/osaka-kyoto.test.js
git commit -m "feat(sample): convert Osaka Kyoto days and stops to the sample schema"
```

---

### Task 3: 장소·가이드·체크리스트·링크·보관 섹션

**Files:**
- Create: `scripts/sample/osaka-kyoto-extras.mjs`
- Modify: `scripts/sample/osaka-kyoto.mjs` (마지막에 `buildOsakaKyotoTripFull` 추가)
- Modify: `tests/sample/osaka-kyoto.test.js` (테스트 추가)

**Interfaces:**
- Consumes: `compact`, `toLink` (`scripts/sample/util.mjs`), `buildOsakaKyotoTrip` (Task 2)
- Produces: `buildPlaces(): { places: object[], placeIdByRestaurant: Map<string,string> }`, `buildGuide(stop): object | undefined`, `buildChecklistGroups(): object[]`, `buildLinkGroups(): object[]`, `buildSections(): object[]` (from `scripts/sample/osaka-kyoto-extras.mjs`)
- Produces: `buildOsakaKyotoTripFull(): object` (from `scripts/sample/osaka-kyoto.mjs`) — Task 4의 내보내기 CLI와 2번 계획의 시더 테스트가 이 결과를 쓴다.

- [ ] **Step 1: 실패하는 테스트 추가**

`tests/sample/osaka-kyoto.test.js` 끝에 추가:

```js
import { osakaDining, osakaShopping, kyotoShopping } from '../../src/data.js';
import { placeGuides } from '../../src/place-guides.js';
import { preparationGroups } from '../../src/preparation.js';
import { buildOsakaKyotoTripFull } from '../../scripts/sample/osaka-kyoto.mjs';

describe('buildOsakaKyotoTripFull', () => {
  const out = buildOsakaKyotoTripFull();
  const stops = out.days.flatMap((day) => day.stops);

  it('is schema-valid', () => {
    expect(validateTrip(out)).toEqual({ ok: true, errors: [] });
  });

  it('includes every dining and shopping candidate as a place', () => {
    const ids = out.places.map((place) => place.id);
    for (const item of [...osakaDining, ...osakaShopping, ...kyotoShopping]) expect(ids).toContain(item.id);
  });

  it('turns stop restaurants into dining places without duplicates', () => {
    const sourceNames = new Set(trip.days.flatMap((day) => day.stops).filter((stop) => stop.restaurant).map((stop) => stop.restaurant.name));
    const mealPlaces = out.places.filter((place) => place.id.startsWith('meal-'));
    expect(mealPlaces.map((place) => place.name).sort()).toEqual([...sourceNames].sort());
    for (const stop of trip.days.flatMap((day) => day.stops).filter((s) => s.restaurant)) {
      const mapped = stops.find((s) => s.id === stop.id);
      expect(out.places.find((place) => place.id === mapped.placeId).name).toBe(stop.restaurant.name);
    }
  });

  it('turns place guides into structured blocks', () => {
    for (const stopId of Object.keys(placeGuides)) {
      const guide = stops.find((stop) => stop.id === stopId).guide;
      expect(guide.kind).toBe('place');
      expect(guide.blocks.find((block) => block.type === 'steps').items).toEqual(placeGuides[stopId].steps);
    }
  });

  it('keeps hotel, breakfast and transit guides as html blocks', () => {
    const htmlTitles = stops.flatMap((stop) => stop.guide?.blocks.filter((block) => block.type === 'html').map((block) => block.title) ?? []);
    expect(htmlTitles).toEqual(expect.arrayContaining(['숙소 안내', '조식 안내', '이동 안내']));
  });

  it('maps every checklist item with its priority', () => {
    expect(out.checklistGroups.map((group) => group.items.length)).toEqual(preparationGroups.map((group) => group.items.length));
    expect(out.checklistGroups[0].items[0]).toEqual({ id: 'passports', priority: '필수', title: '가족 3명 여권 원본', description: preparationGroups[0].items[0][3] });
  });

  it('keeps the legacy screens as sections', () => {
    expect(out.sections.map((section) => section.id)).toEqual(['overview', 'airport', 'food', 'shopping', 'links', 'preparation']);
    for (const section of out.sections) {
      expect(section.legacy).toBe(true);
      expect(section.blocks[0].html.length).toBeGreaterThan(200);
    }
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `pnpm vitest run tests/sample/osaka-kyoto.test.js`
Expected: FAIL — `buildOsakaKyotoTripFull is not a function` 또는 export 없음

- [ ] **Step 3: 부가 데이터 변환 구현**

`scripts/sample/osaka-kyoto-extras.mjs`:

```js
import { JSDOM } from 'jsdom';
import { airportGuide, kyotoShopping, officialLinks, osakaDining, osakaShopping, trip } from '../../src/data.js';
import { placeGuides } from '../../src/place-guides.js';
import { renderCastleCourse } from '../../src/castle-course.js';
import { renderHotelGuide } from '../../src/hotel-guides.js';
import { renderBreakfastGuide } from '../../src/breakfast-guides.js';
import { renderBathGuide, renderTransitGuide } from '../../src/transit-guides.js';
import { renderDeckGuide } from '../../src/deck-route.js';
import { renderDotonboriHighlight } from '../../src/dotonbori-highlight.js';
import { preparationGroups, renderDonkiCoupon, renderDutyFreePickup } from '../../src/preparation.js';
import { renderAirportGuide, renderApp } from '../../src/render.js';
import { compact, toLink } from './util.mjs';

const STATE = { completedStops: [], completedPreparation: [], day4Option: 'slow-kyoto' };

const htmlBlock = (title, html) => ({ type: 'html', title, html });

export function buildPlaces() {
  const placeIdByRestaurant = new Map();
  const mealPlaces = [];
  for (const day of trip.days) {
    for (const stop of day.stops) {
      const restaurant = stop.restaurant;
      if (!restaurant || placeIdByRestaurant.has(restaurant.name)) continue;
      const id = `meal-${stop.id}`;
      placeIdByRestaurant.set(restaurant.name, id);
      mealPlaces.push(compact({
        id,
        kind: 'dining',
        name: restaurant.name,
        branch: restaurant.english,
        area: stop.title,
        menu: restaurant.menu,
        note: restaurant.note,
        alternatives: restaurant.alternatives,
        sources: restaurant.link ? [toLink(restaurant.link)] : undefined,
      }));
    }
  }

  const dining = osakaDining.map((item) => compact({
    id: item.id, kind: 'dining', name: item.name, branch: item.branch, area: item.area, category: item.category, icon: item.icon,
    menu: item.menu, address: item.address, hours: item.hours, mapUrl: item.mapUrl, note: item.note,
    sources: [item.source, item.menuSource].filter(Boolean).map(toLink), checkedAt: item.checkedAt,
  }));

  const shopping = [...osakaShopping, ...kyotoShopping].map((item) => compact({
    id: item.id, kind: 'shopping', name: item.name, branch: item.branch, area: item.area, category: item.category, icon: item.icon,
    items: item.items, address: item.address, hours: item.hours, mapUrl: item.mapUrl, mapQuery: item.mapQuery, note: item.note,
    facts: [['찾아가기', item.access], ['면세', item.taxFree], ['입장', item.admission], ['같이 보기', item.nearby]].filter(([, value]) => value),
    media: item.video ? [{ label: item.video.title, url: item.video.url }] : undefined,
    sources: [item.source, item.extraSource, item.admissionSource].filter(Boolean).map(toLink),
    checkedAt: item.checkedAt,
  }));

  return { places: [...mealPlaces, ...dining, ...shopping], placeIdByRestaurant };
}

export function buildGuide(stop) {
  const blocks = [];
  let kind;
  let title;

  const place = placeGuides[stop.id];
  if (place) {
    kind = 'place';
    title = `${place.name} 가는 방법·방문 팁`;
    blocks.push({ type: 'paragraph', text: place.message });
    blocks.push({ type: 'facts', items: [['출발', place.from], ['이동', place.mode]] });
    blocks.push({ type: 'steps', items: place.steps });
    if (place.alternative) blocks.push({ type: 'paragraph', text: place.alternative });
    if (stop.id === 'd1-castle') blocks.push(htmlBlock('오사카성 관람 코스 지도', renderCastleCourse()));
    blocks.push({ type: 'facts', items: place.facts });
    blocks.push({ type: 'tips', items: place.tips });
    blocks.push({ type: 'links', items: place.sources.map(toLink) });
  }

  const extras = [
    ['place', '도톤보리 사진 포인트', renderDotonboriHighlight(stop.id)],
    ['place', '호텔에서 식당까지 연결 동선', stop.id === 'd1-lunch' ? renderDeckGuide() : ''],
    ['hotel', '숙소 안내', renderHotelGuide(stop.id)],
    ['breakfast', '조식 안내', renderBreakfastGuide(stop.id)],
    ['airport', '출국 전 면세품 수령', stop.id === 'd1-gmp' ? renderDutyFreePickup(true) : ''],
    ['place', '돈키호테 할인쿠폰', renderDonkiCoupon(stop.id)],
    ['transit', '이동 안내', renderTransitGuide(stop.id)],
    ['transit', '목욕·휴식 안내', renderBathGuide(stop.id)],
  ];
  for (const [extraKind, extraTitle, html] of extras) {
    if (!html) continue;
    kind ??= extraKind;
    title ??= extraTitle;
    blocks.push(htmlBlock(extraTitle, html));
  }

  return blocks.length ? { kind, title, blocks } : undefined;
}

export function buildChecklistGroups() {
  return preparationGroups.map((group) => compact({
    id: group.id,
    title: group.title,
    hint: group.hint,
    items: group.items.map(([id, priority, title, description]) => compact({ id, priority, title, description })),
  }));
}

export function buildLinkGroups() {
  return [
    { label: '공식 안내', links: Object.values(officialLinks).map(toLink) },
    { label: '여행지 소개', links: trip.heroSlides.map((slide) => ({ label: slide.place, url: slide.blogUrl })) },
  ];
}

function viewHtml(view, selector) {
  const html = renderApp(trip, airportGuide, 0, STATE, false, false, false, 'other', false, view, 'summary');
  return new JSDOM(html).window.document.querySelector(selector).innerHTML;
}

export function buildSections() {
  return [
    { id: 'overview', title: '여행 개요', legacy: true, blocks: [htmlBlock('항공편·경로·카운트다운', viewHtml('itinerary', '.trip-overview'))] },
    { id: 'airport', title: '공항 이용 안내', legacy: true, blocks: [htmlBlock('공항 이용 안내', renderAirportGuide(airportGuide))] },
    { id: 'food', title: '맛집', legacy: true, blocks: [htmlBlock('맛집', viewHtml('food', '.dining-view'))] },
    { id: 'shopping', title: '쇼핑', legacy: true, blocks: [htmlBlock('쇼핑', viewHtml('shopping', '.shopping-view'))] },
    { id: 'links', title: '예약·공식 링크', legacy: true, blocks: [htmlBlock('예약·공식 링크', viewHtml('links', '.links-view'))] },
    { id: 'preparation', title: '준비물', legacy: true, blocks: [htmlBlock('준비물', viewHtml('preparation', '.preparation-view'))] },
  ];
}
```

`scripts/sample/osaka-kyoto.mjs` 끝에 추가(`osaka-kyoto-extras.mjs`는 `util.mjs`만 import하므로 순환 참조가 생기지 않는다):

```js
import { buildChecklistGroups, buildGuide, buildLinkGroups, buildPlaces, buildSections } from './osaka-kyoto-extras.mjs';

export function buildOsakaKyotoTripFull() {
  const { places, placeIdByRestaurant } = buildPlaces();
  return buildOsakaKyotoTrip({
    placeIdByRestaurant,
    guideFor: buildGuide,
    extras: { places, linkGroups: buildLinkGroups(), checklistGroups: buildChecklistGroups(), sections: buildSections() },
  });
}
```

`buildOsakaKyotoTrip`의 반환 객체에서 `...extras`는 `days` 다음, `provenance` 앞에 있으므로 키 순서가 스키마 문서 순서와 같다.

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm vitest run tests/sample/osaka-kyoto.test.js`
Expected: PASS (15 tests)

- [ ] **Step 5: Commit**

```bash
git add scripts/sample/osaka-kyoto.mjs scripts/sample/osaka-kyoto-extras.mjs tests/sample/osaka-kyoto.test.js
git commit -m "feat(sample): export places, guides, checklists and legacy sections"
```

---

### Task 4: 손실 검사와 내보내기 CLI

기존 앱은 모든 날짜와 모든 화면에서 링크와 이미지를 그린다. 그 URL이 하나라도 JSON에 없으면 변환에서 잃은 것이다. 좌표로 즉석 생성하는 Google 지도 링크만 예외다. 새 앱도 같은 좌표로 다시 만든다.

**Files:**
- Create: `tests/sample/osaka-kyoto-coverage.test.js`
- Create: `scripts/sample/export-osaka-kyoto.mjs`
- Create: `sample/osaka-kyoto-family-2026.json` (CLI 실행 결과)
- Modify: `package.json` (scripts)

**Interfaces:**
- Consumes: `buildOsakaKyotoTripFull` (Task 3), `validateTrip` (Task 1)
- Produces: CLI `pnpm sample:export` — `sample/osaka-kyoto-family-2026.json`을 쓴다. 검증에 실패하면 파일을 쓰지 않고 종료 코드 1.

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/sample/osaka-kyoto-coverage.test.js`:

```js
/** @vitest-environment node */
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { airportGuide, trip } from '../../src/data.js';
import { createGoogleMapsUrl } from '../../src/map.js';
import { renderApp } from '../../src/render.js';
import { buildOsakaKyotoTripFull } from '../../scripts/sample/osaka-kyoto.mjs';

const STATE = { completedStops: [], completedPreparation: [], day4Option: 'slow-kyoto' };
const VIEWS = ['itinerary', 'food', 'shopping', 'links', 'preparation'];
const APP_CHROME = ['/icons/', '/illustrations/', '/fonts/', '/manifest', '/images/brand/'];

function urlsIn(html) {
  const document = new JSDOM(html).window.document;
  return [...document.querySelectorAll('[href], [src]')]
    .map((element) => element.getAttribute('href') ?? element.getAttribute('src'))
    .filter((url) => url && !url.startsWith('#') && !url.startsWith('data:') && !url.startsWith('javascript:'))
    .filter((url) => !APP_CHROME.some((prefix) => url.startsWith(prefix)));
}

function legacyUrls() {
  const urls = new Set();
  trip.days.forEach((_, dayIndex) => {
    for (const view of VIEWS) {
      const html = renderApp(trip, airportGuide, dayIndex, STATE, true, true, false, 'other', false, view, 'detail');
      urlsIn(html).forEach((url) => urls.add(url));
    }
  });
  return urls;
}

function isDerivedFromCoordinates(url) {
  if (url.startsWith('https://www.google.com/maps/dir/?')) return true;
  return trip.days.some((day) => day.stops.some((stop) => stop.coordinates && createGoogleMapsUrl(stop.coordinates) === url));
}

function urlsInTrip(value, urls = new Set()) {
  if (typeof value === 'string') {
    if (/^(https?:\/\/|\/)/.test(value)) urls.add(value);
    if (value.includes('<')) urlsIn(value).forEach((url) => urls.add(url));
  } else if (Array.isArray(value)) {
    value.forEach((item) => urlsInTrip(item, urls));
  } else if (value && typeof value === 'object') {
    Object.values(value).forEach((item) => urlsInTrip(item, urls));
  }
  return urls;
}

describe('Osaka Kyoto export coverage', () => {
  it('keeps every link and image the legacy app renders', () => {
    const exported = urlsInTrip(buildOsakaKyotoTripFull());
    const missing = [...legacyUrls()].filter((url) => !exported.has(url) && !isDerivedFromCoordinates(url));
    expect(missing).toEqual([]);
  });

  it('is deterministic', () => {
    expect(JSON.stringify(buildOsakaKyotoTripFull())).toBe(JSON.stringify(buildOsakaKyotoTripFull()));
  });

  it('matches the committed JSON file', () => {
    const committed = readFileSync(new URL('../../sample/osaka-kyoto-family-2026.json', import.meta.url), 'utf8');
    expect(committed).toBe(`${JSON.stringify(buildOsakaKyotoTripFull(), null, 2)}\n`);
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `pnpm vitest run tests/sample/osaka-kyoto-coverage.test.js`
Expected: 첫 두 테스트는 PASS 또는 `missing` 목록과 함께 FAIL, 세 번째는 `ENOENT ... osaka-kyoto-family-2026.json`으로 FAIL.

`missing`이 비어 있지 않으면 각 URL이 기존 앱의 어느 렌더 함수에서 나오는지 `grep -rn "<URL 일부>" src/`로 찾는다. 그 함수의 출력을 Task 3의 `buildGuide` 또는 `buildSections`에 추가한다. 테스트의 예외 목록을 늘려 맞추지 않는다.

- [ ] **Step 3: 내보내기 CLI 구현**

`scripts/sample/export-osaka-kyoto.mjs`:

```js
import { writeFileSync } from 'node:fs';
import { buildOsakaKyotoTripFull } from './osaka-kyoto.mjs';
import { validateTrip } from './validate.mjs';

const target = new URL('../../sample/osaka-kyoto-family-2026.json', import.meta.url);
const data = buildOsakaKyotoTripFull();
const { ok, errors } = validateTrip(data);
if (!ok) {
  console.error(errors.join('\n'));
  process.exit(1);
}
writeFileSync(target, `${JSON.stringify(data, null, 2)}\n`);
const stopCount = data.days.reduce((count, day) => count + day.stops.length, 0);
console.log(`wrote ${target.pathname} · ${data.days.length} days · ${stopCount} stops · ${data.places.length} places`);
```

`package.json`의 `scripts`에 추가:

```json
"sample:export": "node scripts/sample/export-osaka-kyoto.mjs"
```

- [ ] **Step 4: 내보내기 실행**

Run: `pnpm sample:export`
Expected: `wrote .../sample/osaka-kyoto-family-2026.json · 4 days · 50 stops · <N> places`

- [ ] **Step 5: 테스트 통과 확인**

Run: `pnpm vitest run tests/sample/osaka-kyoto-coverage.test.js`
Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

```bash
git add tests/sample/osaka-kyoto-coverage.test.js scripts/sample/export-osaka-kyoto.mjs sample/osaka-kyoto-family-2026.json package.json
git commit -m "feat(sample): export Osaka Kyoto trip and guard against lost links"
```

---

### Task 5: 두 샘플 일괄 검증

다낭·호이안 JSON(`sample/danang-hoian-family-2027.json`)은 조사 작업으로 이미 만들어졌다. 이 작업은 두 샘플이 함께 검증되고, 다낭 샘플이 스펙의 공개 샘플 조건을 지키는지 고정한다.

**Files:**
- Create: `tests/sample/samples.test.js`
- Modify: `package.json` (`test` 스크립트)

**Interfaces:**
- Consumes: `validateTrip` (Task 1)
- Produces: `pnpm test`가 샘플 검증을 포함한다. 2번 계획의 시더는 `sample/*.json` 중 이 테스트를 통과한 파일만 적재한다고 가정한다.

- [ ] **Step 1: 테스트 작성**

`tests/sample/samples.test.js`:

```js
/** @vitest-environment node */
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { validateTrip } from '../../scripts/sample/validate.mjs';

const dir = new URL('../../sample/', import.meta.url);
const files = readdirSync(dir).filter((name) => name.endsWith('.json'));
const load = (name) => JSON.parse(readFileSync(new URL(name, dir), 'utf8'));

describe('sample trips', () => {
  it('has both samples', () => {
    expect(files.sort()).toEqual(['danang-hoian-family-2027.json', 'osaka-kyoto-family-2026.json']);
  });

  it.each(files)('%s is valid', (name) => {
    expect(validateTrip(load(name))).toEqual({ ok: true, errors: [] });
  });

  it('uses unique slugs that match file names', () => {
    for (const name of files) expect(load(name).slug).toBe(name.replace('.json', ''));
  });

  it('marks the researched Danang sample as a public example with sources', () => {
    const danang = load('danang-hoian-family-2027.json');
    expect(danang).toMatchObject({ visibility: 'public', isSample: true, timezone: 'Asia/Ho_Chi_Minh' });
    expect(danang.provenance.kind).toBe('researched-example');
    expect(danang.provenance.referencedProducts.length).toBeGreaterThanOrEqual(2);
    expect(danang.provenance.disclaimer).toContain('예시');
  });

  it('does not claim confirmed bookings in the researched sample', () => {
    const text = readFileSync(new URL('danang-hoian-family-2027.json', dir), 'utf8');
    expect(text).not.toContain('예약 확정');
  });

  it('gives every Danang place a source', () => {
    const danang = load('danang-hoian-family-2027.json');
    for (const place of danang.places) expect(place.sources?.length, place.id).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: 테스트 실행**

Run: `pnpm vitest run tests/sample/samples.test.js`
Expected: PASS. 다낭 파일이 실패하면 오류 경로를 보고 `sample/danang-hoian-family-2027.json`을 고친다. 사실 관계를 바꾸는 수정이면 `sample/danang-hoian-family-2027.sources.md`에 이유를 한 줄 남긴다.

- [ ] **Step 3: CLI 검증 확인**

Run: `pnpm sample:validate`
Expected:

```
ok   sample/danang-hoian-family-2027.json
ok   sample/osaka-kyoto-family-2026.json
```

- [ ] **Step 4: 전체 테스트**

Run: `pnpm test`
Expected: 기존 16개 파일 + `tests/sample/` 4개 파일 모두 PASS

- [ ] **Step 5: Commit**

```bash
git add tests/sample/samples.test.js sample/danang-hoian-family-2027.json sample/danang-hoian-family-2027.sources.md
git commit -m "test(sample): validate both sample trips together"
```
