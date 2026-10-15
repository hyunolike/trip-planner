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
