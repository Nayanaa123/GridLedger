const mongoose = require('mongoose');

const readingSchema = new mongoose.Schema(
  {
    meter: { type: mongoose.Schema.Types.ObjectId, ref: 'Meter', required: true },
    meterId: { type: String, required: true },
    consumer: { type: mongoose.Schema.Types.ObjectId, ref: 'Consumer', required: true },
    consumerId: { type: String, required: true },
    previousReading: { type: Number, required: true, min: 0 },
    currentReading: { type: Number, required: true, min: 0 },
    units: { type: Number, required: true, min: 0 },
    readingDate: { type: Date, required: true },
    period: { type: String, required: true }, // "YYYY-MM" billing period
    source: { type: String, enum: ['manual', 'csv'], default: 'manual' },
  },
  { timestamps: true }
);

// One reading per meter per billing period (blocks duplicates at DB level too)
readingSchema.index({ meterId: 1, period: 1 }, { unique: true });

module.exports = mongoose.model('Reading', readingSchema);
