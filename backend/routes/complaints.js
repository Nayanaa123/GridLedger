const router = require('express').Router();
const Complaint = require('../models/Complaint');
const Consumer = require('../models/Consumer');
const { protect, restrictTo } = require('../middleware/auth');
const { asyncHandler, HttpError } = require('../middleware/error');

router.use(protect);

// GET /api/complaints?status=   (admin: all, consumer: own)
router.get(
  '/',
  restrictTo('admin', 'consumer'),
  asyncHandler(async (req, res) => {
    const filter = {};
    if (req.user.role === 'consumer') {
      const c = await Consumer.findOne({ user: req.user._id });
      if (!c) return res.json([]);
      filter.consumer = c._id;
    }
    if (['open', 'in_progress', 'resolved'].includes(req.query.status)) filter.status = req.query.status;
    const list = await Complaint.find(filter).populate('consumer', 'name consumerId').sort({ createdAt: -1 });
    res.json(list);
  })
);

// POST /api/complaints   (consumer raises a complaint)
router.post(
  '/',
  restrictTo('consumer'),
  asyncHandler(async (req, res) => {
    const { category, subject, description } = req.body;
    if (!category || !subject || !description) throw new HttpError(400, 'Category, subject and description are required.');
    const consumer = await Consumer.findOne({ user: req.user._id });
    if (!consumer) throw new HttpError(404, 'Consumer profile not found.');

    const count = await Complaint.countDocuments();
    const complaintNo = `CMP-${String(count + 1).padStart(4, '0')}`;
    const complaint = await Complaint.create({
      complaintNo,
      consumer: consumer._id,
      consumerId: consumer.consumerId,
      category,
      subject,
      description,
    });
    res.status(201).json(complaint);
  })
);

// PATCH /api/complaints/:id   (admin replies / changes status)
router.patch(
  '/:id',
  restrictTo('admin'),
  asyncHandler(async (req, res) => {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) throw new HttpError(404, 'Complaint not found.');
    const { status, adminReply } = req.body;
    if (status !== undefined) {
      if (!['open', 'in_progress', 'resolved'].includes(status)) throw new HttpError(400, 'Invalid status.');
      complaint.status = status;
      complaint.resolvedAt = status === 'resolved' ? new Date() : undefined;
    }
    if (adminReply !== undefined) complaint.adminReply = adminReply;
    await complaint.save();
    res.json(complaint);
  })
);

module.exports = router;