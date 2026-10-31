const router = require('express').Router();
const multer = require('multer');
const { parse } = require('csv-parse/sync');
const Reading = require('../models/Reading');
const Consumer = require('../models/Consumer');
const Tariff = require('../models/Tariff');
const Bill = require('../models/Bill');
const { protect, restrictTo } = require('../middleware/auth');
const { asyncHandler, HttpError } = require('../middleware/error');
const { validateAndSaveReading } = require('../utils/readingService');
const { createBillForReading } = require('../utils/billing');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
const REQUIRED_COLUMNS = ['consumerId', 'meterId', 'previousReading', 'currentReading', 'readingDate'];

router.use(protect);

// GET /api/readings  (admin: all, consumer: own)
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const filter = {};
    if (req.user.role === 'consumer') {
      const c = await Consumer.findOne({ user: req.user._id });
      if (!c) return res.json([]);
      filter.consumer = c._id;
    } else {
      if (req.query.period) filter.period = req.query.period;
      if (req.query.meterId) filter.meterId = req.query.meterId.toUpperCase();
    }
    const readings = await Reading.find(filter).sort({ readingDate: -1, createdAt: -1 }).limit(500);
    const billed = new Set((await Bill.find({ reading: { $in: readings.map((r) => r._id) } }).select('reading')).map((b) => String(b.reading)));
    res.json(readings.map((r) => ({ ...r.toObject(), billed: billed.has(String(r._id)) })));
  })
);

// POST /api/readings  (manual entry)
router.post(
  '/',
  restrictTo('admin', 'meter_reader'),
  asyncHandler(async (req, res) => {
    const result = await validateAndSaveReading(req.body, 'manual');
    if (!result.ok) throw new HttpError(400, result.errors.join('; '), result.errors);
    res.status(201).json(result.reading);
  })
);

// POST /api/readings/upload  (multipart: file=<csv>, generateBills=true|false)
router.post(
  '/upload',
  restrictTo('admin', 'meter_reader'),
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new HttpError(400, 'Please attach a CSV file (field name: file).');

    let rows;
    try {
      rows = parse(req.file.buffer.toString('utf8'), {
        columns: (header) => header.map((h) => h.trim()),
        skip_empty_lines: true,
        trim: true,
        bom: true,
        relax_column_count: false,
      });
    } catch (err) {
      throw new HttpError(400, `CSV could not be read: ${err.message}`);
    }
    if (!rows.length) throw new HttpError(400, 'The CSV file has no data rows.');

    const missing = REQUIRED_COLUMNS.filter((c) => !(c in rows[0]));
    if (missing.length) {
      throw new HttpError(400, `Missing required column(s): ${missing.join(', ')}. Expected: ${REQUIRED_COLUMNS.join(', ')}`);
    }

    const generateBills = String(req.body.generateBills) === 'true' && req.user.role === 'admin';
    const tariff = generateBills ? await Tariff.getCurrent() : null;
    const accepted = [];
    const rejected = [];
    let billsGenerated = 0;

    for (let i = 0; i < rows.length; i++) {
      const rowNo = i + 2; // +1 for header, +1 for 1-based numbering
      const result = await validateAndSaveReading(rows[i], 'csv');
      if (!result.ok) {
        rejected.push({ row: rowNo, data: rows[i], errors: result.errors });
        continue;
      }
      accepted.push(result.reading);
      if (generateBills) {
        await createBillForReading(result.reading, tariff);
        billsGenerated++;
      }
    }

    res.status(201).json({
      totalRows: rows.length,
      accepted: accepted.length,
      rejected: rejected.length,
      billsGenerated,
      rejectedRows: rejected,
      acceptedReadings: accepted,
    });
  })
);
// DELETE /api/readings/:id  (undo a mistaken entry)
router.delete(
  '/:id',
  restrictTo('admin', 'meter_reader'),
  asyncHandler(async (req, res) => {
    const reading = await Reading.findById(req.params.id);
    if (!reading) throw new HttpError(404, 'Reading not found.');

    if (await Bill.exists({ reading: reading._id })) {
      throw new HttpError(400, 'A bill was already generated for this reading, so it cannot be deleted.');
    }

    const latest = await Reading.findOne({ meterId: reading.meterId }).sort({ readingDate: -1, createdAt: -1 });
    if (String(latest._id) !== String(reading._id)) {
      throw new HttpError(400, 'Only the latest reading of a meter can be deleted.');
    }

    if (req.user.role === 'meter_reader') {
      const minutesOld = (Date.now() - new Date(reading.createdAt).getTime()) / 60000;
      if (minutesOld > 30) {
        throw new HttpError(403, 'Meter readers can delete only readings entered in the last 30 minutes. Ask the admin.');
      }
    }

    await reading.deleteOne();
    res.json({ message: 'Reading deleted.' });
  })
);
module.exports = router;
