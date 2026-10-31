const mongoose = require('mongoose');

const meterSchema = new mongoose.Schema(
  {
    meterId: { type: String, required: true, unique: true, trim: true, uppercase: true },
    consumer: { type: mongoose.Schema.Types.ObjectId, ref: 'Consumer', required: true },
    installationDate: { type: Date, default: Date.now },
    status: { type: String, enum: ['active', 'inactive', 'faulty'], default: 'active' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Meter', meterSchema);
