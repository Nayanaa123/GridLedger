const router = require('express').Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Consumer = require('../models/Consumer');
const Meter = require('../models/Meter');
const Bill = require('../models/Bill');
const Reading = require('../models/Reading');
const { protect, restrictTo } = require('../middleware/auth');
const { asyncHandler, HttpError } = require('../middleware/error');

router.use(protect, restrictTo('admin'));

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// GET /api/consumers?search=
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const filter = {};
    if (req.query.search) {
      const rx = new RegExp(escapeRegex(req.query.search), 'i');
      filter.$or = [{ name: rx }, { consumerId: rx }, { address: rx }, { phone: rx }];
    }
    const consumers = await Consumer.find(filter).populate('user', 'email').sort({ consumerId: 1 });
    const meters = await Meter.find({ consumer: { $in: consumers.map((c) => c._id) } });
    const byConsumer = {};
    meters.forEach((m) => (byConsumer[m.consumer] = [...(byConsumer[m.consumer] || []), m.meterId]));
    res.json(consumers.map((c) => ({ ...c.toObject(), meters: byConsumer[c._id] || [] })));
  })
);

// POST /api/consumers  (also creates the consumer's login account)
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { consumerId, name, address, phone, email, password } = req.body;
    if (!consumerId || !name || !address || !email) {
      throw new HttpError(400, 'consumerId, name, address and email are required.');
    }
    if (await Consumer.findOne({ consumerId: String(consumerId).toUpperCase().trim() })) {
      throw new HttpError(409, `Consumer ID ${consumerId} already exists.`);
    }
    if (await User.findOne({ email: String(email).toLowerCase().trim() })) {
      throw new HttpError(409, `Email ${email} is already registered.`);
    }
    const user = await User.create({
      name,
      email,
      role: 'consumer',
      passwordHash: await bcrypt.hash(password || 'consumer123', 10),
    });
    try {
      const consumer = await Consumer.create({ consumerId, name, address, phone, user: user._id });
      res.status(201).json(consumer);
    } catch (err) {
      await User.findByIdAndDelete(user._id); // roll back the user if consumer creation fails
      throw err;
    }
  })
);

// PUT /api/consumers/:id
router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const consumer = await Consumer.findById(req.params.id);
    if (!consumer) throw new HttpError(404, 'Consumer not found.');
    const { name, address, phone, email, password } = req.body;
    if (name) consumer.name = name;
    if (address) consumer.address = address;
    if (phone !== undefined) consumer.phone = phone;
    await consumer.save();

    const user = await User.findById(consumer.user);
    if (user) {
      if (name) user.name = name;
      if (email) user.email = email;
      if (password) user.passwordHash = await bcrypt.hash(password, 10);
      await user.save();
    }
    res.json(consumer);
  })
);

// DELETE /api/consumers/:id  (blocked if billing records exist)
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const consumer = await Consumer.findById(req.params.id);
    if (!consumer) throw new HttpError(404, 'Consumer not found.');
    if (await Bill.exists({ consumer: consumer._id })) {
      throw new HttpError(409, 'Cannot delete a consumer who has bills. Billing records must be preserved.');
    }
    await Reading.deleteMany({ consumer: consumer._id });
    await Meter.deleteMany({ consumer: consumer._id });
    await User.findByIdAndDelete(consumer.user);
    await consumer.deleteOne();
    res.json({ message: 'Consumer deleted.' });
  })
);

module.exports = router;
