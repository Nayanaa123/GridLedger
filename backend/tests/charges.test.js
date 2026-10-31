// Run: npm test   (uses Node's built-in test runner -- no extra packages)
const test = require('node:test');
const assert = require('node:assert');
const { calculateCharges } = require('../utils/charges');

test('example from the project brief: 150 units @ Rs5, no fixed/tax = Rs750', () => {
  const r = calculateCharges(150, { ratePerUnit: 5, fixedCharge: 0, taxPercent: 0 });
  assert.deepStrictEqual(r, { energyCharge: 750, fixedCharge: 0, taxAmount: 0, amount: 750 });
});

test('default tariff: 150 units, Rs5/unit, Rs50 fixed, 5% tax = Rs840', () => {
  const r = calculateCharges(150, { ratePerUnit: 5, fixedCharge: 50, taxPercent: 5 });
  assert.strictEqual(r.energyCharge, 750);
  assert.strictEqual(r.taxAmount, 40);
  assert.strictEqual(r.amount, 840);
});

test('zero units still bills the fixed charge + tax', () => {
  const r = calculateCharges(0, { ratePerUnit: 5, fixedCharge: 50, taxPercent: 5 });
  assert.strictEqual(r.amount, 52.5);
});

test('rounds to 2 decimals', () => {
  const r = calculateCharges(33.333, { ratePerUnit: 4.55, fixedCharge: 0, taxPercent: 0 });
  assert.strictEqual(r.amount, 151.67);
});
