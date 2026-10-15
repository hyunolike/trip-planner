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
