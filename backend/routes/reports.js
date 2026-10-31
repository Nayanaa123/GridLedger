const router = require('express').Router();
const Bill = require('../models/Bill');
const Reading = require('../models/Reading');
const { protect, restrictTo } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/error');

router.use(protect, restrictTo('admin'));

const round2 = (n) => Math.round(n * 100) / 100;

// send JSON, or a CSV file when ?format=csv
function respond(req, res, rows, columns, filename) {
  if (req.query.format !== 'csv') return res.json(rows);
  const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [columns.join(',')].concat(rows.map((r) => columns.map((c) => q(r[c])).join(',')));
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
  res.send(lines.join('\n'));
}

// GET /api/reports/revenue  -> billed vs collected per month
router.get(
  '/revenue',
  asyncHandler(async (req, res) => {
    const bills = await Bill.find();
    const map = {};
    for (const b of bills) {
      const m = (map[b.period] ||= { period: b.period, billed: 0, collected: 0, outstanding: 0, bills: 0 });
      m.bills += 1;
      m.billed += b.amount;
      if (b.status === 'paid') m.collected += b.amount;
      else m.outstanding += b.amount;
    }
    const rows = Object.values(map)
      .sort((a, b) => a.period.localeCompare(b.period))
      .map((m) => ({ ...m, billed: round2(m.billed), collected: round2(m.collected), outstanding: round2(m.outstanding) }));
    respond(req, res, rows, ['period', 'billed', 'collected', 'outstanding', 'bills'], 'revenue-report');
  })
);

// GET /api/reports/consumption  -> { consumerWise: [...] }
router.get(
  '/consumption',
  asyncHandler(async (req, res) => {
    const readings = await Reading.find().populate('consumer', 'name');
    const map = {};
    for (const r of readings) {
      const c = (map[r.consumerId] ||= { consumerId: r.consumerId, name: r.consumer?.name || '', readings: 0, units: 0 });
      c.readings += 1;
      c.units += r.units;
    }
    const consumerWise = Object.values(map).sort((a, b) => b.units - a.units);
    if (req.query.format === 'csv') {
      return respond(req, res, consumerWise, ['consumerId', 'name', 'readings', 'units'], 'consumption-report');
    }
    res.json({ consumerWise });
  })
);

// GET /api/reports/pending  -> unpaid bills
router.get(
  '/pending',
  asyncHandler(async (req, res) => {
    const bills = await Bill.find({ status: 'pending' }).populate('consumer', 'name').sort({ period: 1, billNo: 1 });
    const rows = bills.map((b) => ({
      billNo: b.billNo,
      consumerId: b.consumerId,
      name: b.consumer?.name || '',
      period: b.period,
      amount: b.amount,
      dueDate: b.dueDate,
      overdue: b.isOverdue ? 'Yes' : 'No',
    }));
    respond(req, res, rows, ['billNo', 'consumerId', 'name', 'period', 'amount', 'dueDate', 'overdue'], 'pending-bills-report');
  })
);

module.exports = router;