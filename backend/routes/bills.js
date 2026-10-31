const router = require('express').Router();
const Bill = require('../models/Bill');
const Reading = require('../models/Reading');
const Consumer = require('../models/Consumer');
const Tariff = require('../models/Tariff');
const { protect, restrictTo } = require('../middleware/auth');
const { asyncHandler, HttpError } = require('../middleware/error');
const { createBillForReading } = require('../utils/billing');

router.use(protect);

// GET /api/bills?status=&period=&search=   (admin: all, consumer: own)
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const filter = {};
    if (req.user.role === 'consumer') {
      const c = await Consumer.findOne({ user: req.user._id });
      if (!c) return res.json([]);
      filter.consumer = c._id;
    } else if (req.query.search) {
      const rx = new RegExp(req.query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ consumerId: rx }, { meterId: rx }, { billNo: rx }];
    }
    if (req.query.period) filter.period = req.query.period;
    if (req.query.status === 'paid') filter.status = 'paid';
    if (req.query.status === 'pending') filter.status = 'pending';
    if (req.query.status === 'overdue') {
      filter.status = 'pending';
      filter.dueDate = { $lt: new Date() };
    }
    const bills = await Bill.find(filter).populate('consumer', 'name consumerId address').sort({ period: -1, consumerId: 1 });
    res.json(bills);
  })
);

// GET /api/bills/:id
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const bill = await Bill.findById(req.params.id).populate('consumer', 'name consumerId address user');
    if (!bill) throw new HttpError(404, 'Bill not found.');
    if (req.user.role === 'consumer' && String(bill.consumer.user) !== String(req.user._id)) {
      throw new HttpError(403, 'You can only view your own bills.');
    }
    res.json(bill);
  })
);

// POST /api/bills  { readingId }  -> bill for one reading
router.post(
  '/',
  restrictTo('admin'),
  asyncHandler(async (req, res) => {
    const reading = await Reading.findById(req.body.readingId);
    if (!reading) throw new HttpError(404, 'Reading not found.');
    res.status(201).json(await createBillForReading(reading));
  })
);

// POST /api/bills/generate  { period?: "YYYY-MM" } -> bills for all un-billed readings
router.post(
  '/generate',
  restrictTo('admin'),
  asyncHandler(async (req, res) => {
    const filter = req.body.period ? { period: req.body.period } : {};
    const readings = await Reading.find(filter);
    const billedIds = new Set((await Bill.find({ reading: { $in: readings.map((r) => r._id) } }).select('reading')).map((b) => String(b.reading)));
    const pending = readings.filter((r) => !billedIds.has(String(r._id)));

    const tariff = await Tariff.getCurrent();
    const created = [];
    for (const r of pending) created.push(await createBillForReading(r, tariff));
    res.status(201).json({
      generated: created.length,
      skipped: readings.length - pending.length,
      message: created.length ? `${created.length} bill(s) generated.` : 'No un-billed readings found.',
    });
  })
);

// PATCH /api/bills/:id/payment  { status: "paid"|"pending", paymentMethod }
router.patch(
  '/:id/payment',
  restrictTo('admin'),
  asyncHandler(async (req, res) => {
    const { status, paymentMethod } = req.body;
    if (!['paid', 'pending'].includes(status)) throw new HttpError(400, 'status must be "paid" or "pending".');
    const bill = await Bill.findById(req.params.id);
    if (!bill) throw new HttpError(404, 'Bill not found.');

    if (status === 'paid') {
      if (!['cash', 'upi', 'card', 'netbanking'].includes(paymentMethod)) {
        throw new HttpError(400, 'paymentMethod must be one of: cash, upi, card, netbanking.');
      }
            bill.settleLateFee();
      bill.status = 'paid';
      bill.paidDate = new Date();
      bill.paymentMethod = paymentMethod;
    } else {
      bill.lateFee = 0;
      bill.status = 'pending';
      bill.paidDate = undefined;
      bill.paymentMethod = null;
    }
    await bill.save();
    res.json(bill);
  })
);
// PATCH /api/bills/:id/pay  { paymentMethod }  -> consumer pays own bill (simulated)
router.patch(
  '/:id/pay',
  restrictTo('consumer'),
  asyncHandler(async (req, res) => {
    const { paymentMethod } = req.body;
    if (!['upi', 'card', 'netbanking'].includes(paymentMethod)) {
      throw new HttpError(400, 'Choose UPI, card or net banking.');
    }
    const consumer = await Consumer.findOne({ user: req.user._id });
    const bill = await Bill.findById(req.params.id);
    if (!bill) throw new HttpError(404, 'Bill not found.');
    if (!consumer || String(bill.consumer) !== String(consumer._id)) {
      throw new HttpError(403, 'You can only pay your own bills.');
    }
    if (bill.status === 'paid') throw new HttpError(400, 'This bill is already paid.');
    bill.settleLateFee();
    bill.status = 'paid';
    bill.paidDate = new Date();
    bill.paymentMethod = paymentMethod;
    await bill.save();
    res.json(bill);
  })
);
module.exports = router;
