// Pure billing math (no database) -- easy to test and to explain.
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

// units + tariff -> charge breakdown
//   energy = units x rate;  tax = (energy + fixed) x tax%;  total = energy + fixed + tax
function calculateCharges(units, tariff) {
  const energyCharge = round2(units * tariff.ratePerUnit);
  const fixedCharge = round2(tariff.fixedCharge);
  const taxAmount = round2(((energyCharge + fixedCharge) * tariff.taxPercent) / 100);
  const amount = round2(energyCharge + fixedCharge + taxAmount);
  return { energyCharge, fixedCharge, taxAmount, amount };
}

module.exports = { calculateCharges, round2 };
