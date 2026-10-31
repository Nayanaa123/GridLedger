const mongoose = require('mongoose');

const billSchema = new mongoose.Schema(
  {
    billNo: { type: String, required: true, unique: true },
    consumer: { type: mongoose.Schema.Types.ObjectId, ref: 'Consumer', required: true },
    consumerId: { type: String, required: true },
    meterId: { type: String, required: true },
    reading: { type: mongoose.Schema.Types.ObjectId, ref: 'Reading', required: true, unique: true },
    period: { type: String, required: true },
    previousReading: Number,
    currentReading: Number,
    units: { type: Number, required: true },
    ratePerUnit: { type: Number, required: true },
    energyCharge: { type: Number, required: true },
    fixedCharge: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    amount: { type: Number, required: true },
    lateFeePercent: { type: Number, default: 2 }, // rate copied from the tariff when the bill is made
    lateFee: { type: Number, default: 0 },        // saved at the moment of payment
    dueDate: { type: Date, required: true },
    status: { type: String, enum: ['pending', 'paid'], default: 'pending' },
    paidDate: Date,
    paymentMethod: { type: String, enum: ['cash', 'upi', 'card', 'netbanking', null], default: null },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

billSchema.virtual('isOverdue').get(function () {
  return this.status === 'pending' && this.dueDate < new Date();
});

// Late fee to show now: live value while pending and overdue, saved value once paid
billSchema.virtual('lateFeeDue').get(function () {
  if (this.status === 'paid') return this.lateFee || 0;
  if (!this.isOverdue) return 0;
  return Math.round(this.amount * (this.lateFeePercent || 0)) / 100;
});

// Total the consumer has to pay
billSchema.virtual('payable').get(function () {
  return Math.round((this.amount + this.lateFeeDue) * 100) / 100;
});

// Call this just BEFORE setting status to 'paid'
billSchema.methods.settleLateFee = function () {
  this.lateFee = this.isOverdue ? Math.round(this.amount * (this.lateFeePercent || 0)) / 100 : 0;
};

module.exports = mongoose.model('Bill', billSchema);