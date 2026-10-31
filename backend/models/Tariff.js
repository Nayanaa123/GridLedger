const mongoose = require('mongoose');

// Single configurable tariff document (key = "default")
const tariffSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'default', unique: true },
    ratePerUnit: { type: Number, required: true, min: 0, default: 5 },
    fixedCharge: { type: Number, required: true, min: 0, default: 50 },
    taxPercent: { type: Number, required: true, min: 0, max: 100, default: 5 },
    dueDays: { type: Number, required: true, min: 1, default: 15 },
    lateFeePercent: { type: Number, min: 0, max: 100, default: 2 },
  },
  { timestamps: true }
);

tariffSchema.statics.getCurrent = async function () {
  let t = await this.findOne({ key: 'default' });
  if (!t) t = await this.create({ key: 'default' });
  return t;
};

module.exports = mongoose.model('Tariff', tariffSchema);