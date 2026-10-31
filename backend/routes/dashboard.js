const router = require('express').Router();
const Consumer = require('../models/Consumer');
const Meter = require('../models/Meter');
const Reading = require('../models/Reading');
const Bill = require('../models/Bill');
const { protect, restrictTo } = require('../middleware/auth');
const { asyncHandler, HttpError } = require('../middleware/error');

router.use(protect);

// Admin dashboard numbers -- everything comes straight from MongoDB
router.get(
  '/stats',
  restrictTo('admin'),
  asyncHandler(async (_req, res) => {
    const [totalConsumers, totalMeters, totalBills, paidAgg, pendingAgg, overdueCount, monthly] = await Promise.all([
      Consumer.countDocuments(),
      Meter.countDocuments(),
      Bill.countDocuments(),
      Bill.aggregate([{ $match: { status: 'paid' } }, { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }]),
      Bill.aggregate([{ $match: { status: 'pending' } }, { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }]),
      Bill.countDocuments({ status: 'pending', dueDate: { $lt: new Date() } }),
      Reading.aggregate([
        { $group: { _id: '$period', units: { $sum: '$units' }, readings: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
    ]);

    res.json({
      totalConsumers,
      totalMeters,
      totalBills,
      totalRevenue: paidAgg[0]?.total || 0,
      paidBills: paidAgg[0]?.count || 0,
      pendingAmount: pendingAgg[0]?.total || 0,
      pendingBills: pendingAgg[0]?.count || 0,
      overdueBills: overdueCount,
      monthlyConsumption: monthly.map((m) => ({ period: m._id, units: Math.round(m.units * 100) / 100, readings: m.readings })),
    });
  })
);

// Consumer's own dashboard numbers
router.get(
  '/me',
  restrictTo('consumer'),
  asyncHandler(async (req, res) => {
    const consumer = await Consumer.findOne({ user: req.user._id });
    if (!consumer) throw new HttpError(404, 'No consumer profile is linked to this account.');
    const [bills, readings, meters] = await Promise.all([
      Bill.find({ consumer: consumer._id }).sort({ period: -1 }),
      Reading.find({ consumer: consumer._id }).sort({ period: 1 }),
      Meter.find({ consumer: consumer._id }),
    ]);
    const pending = bills.filter((b) => b.status === 'pending');
    res.json({
      consumer,
      meters,
      latestBill: bills[0] || null,
      totalPending: pending.reduce((s, b) => s + b.amount, 0),
      pendingCount: pending.length,
      totalPaid: bills.filter((b) => b.status === 'paid').reduce((s, b) => s + b.amount, 0),
      monthlyConsumption: readings.map((r) => ({ period: r.period, units: r.units })),
    });
  })
);

module.exports = router;
