const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema(
  {
    complaintNo: { type: String, required: true, unique: true },
    consumer: { type: mongoose.Schema.Types.ObjectId, ref: 'Consumer', required: true },
    consumerId: { type: String, required: true },
    category: { type: String, enum: ['billing', 'meter', 'power_cut', 'other'], required: true },
    subject: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, required: true, trim: true, maxlength: 1000 },
    status: { type: String, enum: ['open', 'in_progress', 'resolved'], default: 'open' },
    adminReply: { type: String, default: '', trim: true, maxlength: 1000 },
    resolvedAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model('Complaint', complaintSchema);