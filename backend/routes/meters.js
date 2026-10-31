const router = require('express').Router();
const Meter = require('../models/Meter');
const Consumer = require('../models/Consumer');
const Reading = require('../models/Reading');
const { protect, restrictTo } = require('../middleware/auth');
const { asyncHandler, HttpError } = require('../middleware/error');

router.use(protect);

router.get(
  '/',
  restrictTo('admin', 'meter_reader'),
  asyncHandler(async (req, res) => {
    const meters = await Meter.find().populate('consumer', 'consumerId name').sort({ meterId: 1 });
    res.json(meters);
  })
);

// Reading history of one meter
router.get(
  '/:meterId/history',restrictTo('admin'),
  asyncHandler(async (req, res) => {
    const history = await Reading.find({ meterId: req.params.meterId.toUpperCase() }).sort({ readingDate: -1 });
    res.json(history);
  })
);

// POST /api/meters  { meterId, consumerId (e.g. C001), installationDate, status }
router.post(
  '/',restrictTo('admin'),
  asyncHandler(async (req, res) => {
    const { meterId, consumerId, installationDate, status } = req.body;
    if (!meterId || !consumerId) throw new HttpError(400, 'meterId and consumerId are required.');
    const consumer = await Consumer.findOne({ consumerId: String(consumerId).toUpperCase().trim() });
    if (!consumer) throw new HttpError(404, `Consumer ${consumerId} does not exist.`);
    const meter = await Meter.create({ meterId, consumer: consumer._id, installationDate, status });
    res.status(201).json(await meter.populate('consumer', 'consumerId name'));
  })
);

// PUT /api/meters/:id  (reassign, change status / date)
router.put(
  '/:id',restrictTo('admin'),
  asyncHandler(async (req, res) => {
    const meter = await Meter.findById(req.params.id);
    if (!meter) throw new HttpError(404, 'Meter not found.');
    const { consumerId, installationDate, status } = req.body;
    if (consumerId) {
      const consumer = await Consumer.findOne({ consumerId: String(consumerId).toUpperCase().trim() });
      if (!consumer) throw new HttpError(404, `Consumer ${consumerId} does not exist.`);
      meter.consumer = consumer._id;
    }
    if (installationDate) meter.installationDate = installationDate;
    if (status) meter.status = status;
    await meter.save();
    res.json(await meter.populate('consumer', 'consumerId name'));
  })
);

module.exports = router;
