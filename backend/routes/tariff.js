const router = require('express').Router();
const Tariff = require('../models/Tariff');
const { protect, restrictTo } = require('../middleware/auth');
const { asyncHandler, HttpError } = require('../middleware/error');

router.use(protect);

router.get('/', asyncHandler(async (_req, res) => res.json(await Tariff.getCurrent())));

router.put(
  '/',
  restrictTo('admin'),
  asyncHandler(async (req, res) => {
    const t = await Tariff.getCurrent();
    for (const k of ['ratePerUnit', 'fixedCharge', 'taxPercent', 'dueDays']) {
      if (req.body[k] === undefined || req.body[k] === '') continue;
      const v = Number(req.body[k]);
      if (!Number.isFinite(v) || v < 0) throw new HttpError(400, `${k} must be a non-negative number.`);
      t[k] = v;
    }
    await t.save();
    res.json(t);
  })
);

module.exports = router;
