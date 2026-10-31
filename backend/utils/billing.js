const Bill = require('../models/Bill');
const Tariff = require('../models/Tariff');

const { calculateCharges, round2 } = require('./charges');

// Creates a bill for one reading (throws if one already exists)
async function createBillForReading(reading, tariff) {
  tariff = tariff || (await Tariff.getCurrent());
  const existing = await Bill.findOne({ reading: reading._id });
  if (existing) {
    const e = new Error(`Bill already exists for this reading (${existing.billNo}).`);
    e.status = 409;
    throw e;
  }
  const charges = calculateCharges(reading.units, tariff);
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + tariff.dueDays);

  const billNo = `B-${reading.period.replace('-', '')}-${reading.meterId}`;
  return Bill.create({
    billNo,
    consumer: reading.consumer,
    consumerId: reading.consumerId,
    meterId: reading.meterId,
    reading: reading._id,
    period: reading.period,
    previousReading: reading.previousReading,
    currentReading: reading.currentReading,
    units: reading.units,
    ratePerUnit: tariff.ratePerUnit,
    lateFeePercent: tariff.lateFeePercent,
    ...charges,
    dueDate,
  });
}

module.exports = { calculateCharges, createBillForReading, round2 };
