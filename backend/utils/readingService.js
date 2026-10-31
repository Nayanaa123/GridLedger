const Meter = require('../models/Meter');
const Reading = require('../models/Reading');

const periodOf = (date) => `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;

const isBlank = (v) => v === undefined || v === null || String(v).trim() === '';

/**
 * Validates one reading and saves it if valid.
 * Returns { ok: true, reading } or { ok: false, errors: [..] } -- never throws for bad data.
 */
async function validateAndSaveReading(input, source = 'manual') {
  const errors = [];
  const meterId = String(input.meterId || '').trim().toUpperCase();
  const consumerCode = String(input.consumerId || '').trim().toUpperCase();

  // --- meter checks ---
  let meter = null;
  if (!meterId) {
    errors.push('meterId is missing');
  } else {
    meter = await Meter.findOne({ meterId }).populate('consumer');
    if (!meter) errors.push(`Meter ${meterId} does not exist`);
  }
  if (meter) {
    if (consumerCode && meter.consumer.consumerId !== consumerCode) {
      errors.push(`Meter ${meterId} is not assigned to consumer ${consumerCode}`);
    }
    if (meter.status !== 'active') errors.push(`Meter ${meterId} is ${meter.status}, not active`);
  }

  // --- date check ---
  let readingDate = null;
  if (isBlank(input.readingDate)) {
    errors.push('readingDate is missing');
  } else {
    readingDate = new Date(input.readingDate);
    if (Number.isNaN(readingDate.getTime())) {
      errors.push(`readingDate "${input.readingDate}" is not a valid date (use YYYY-MM-DD)`);
      readingDate = null;
    }
  }
  const period = readingDate ? periodOf(readingDate) : null;

  // --- numeric checks ---
  let prev = isBlank(input.previousReading) ? null : Number(input.previousReading);
  const curr = isBlank(input.currentReading) ? null : Number(input.currentReading);

  if (curr === null) errors.push('currentReading is missing');
  else if (!Number.isFinite(curr)) errors.push(`currentReading "${input.currentReading}" is not a number`);
  else if (curr < 0) errors.push('currentReading cannot be negative');

  if (prev === null && meter && period) {
    // fall back to the last stored reading for this meter
    const last = await Reading.findOne({ meterId }).sort({ readingDate: -1 });
    if (last) prev = last.currentReading;
    else errors.push('previousReading is missing and this meter has no earlier reading');
  } else if (prev === null && !meter) {
    errors.push('previousReading is missing');
  } else if (prev !== null && !Number.isFinite(prev)) {
    errors.push(`previousReading "${input.previousReading}" is not a number`);
  } else if (prev !== null && prev < 0) {
    errors.push('previousReading cannot be negative');
  }

  if (Number.isFinite(prev) && Number.isFinite(curr) && curr < prev) {
    errors.push(`currentReading (${curr}) is lower than previousReading (${prev})`);
  }

  // --- duplicate check ---
  if (meter && period) {
    const dup = await Reading.findOne({ meterId, period });
    if (dup) errors.push(`Duplicate: meter ${meterId} already has a reading for ${period}`);
  }

  if (errors.length) return { ok: false, errors };

  try {
    const reading = await Reading.create({
      meter: meter._id,
      meterId,
      consumer: meter.consumer._id,
      consumerId: meter.consumer.consumerId,
      previousReading: prev,
      currentReading: curr,
      units: Math.round((curr - prev) * 100) / 100,
      readingDate,
      period,
      source,
    });
    return { ok: true, reading };
  } catch (err) {
    if (err.code === 11000) return { ok: false, errors: [`Duplicate: meter ${meterId} already has a reading for ${period}`] };
    throw err;
  }
}

module.exports = { validateAndSaveReading, periodOf };
