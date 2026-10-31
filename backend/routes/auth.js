const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Consumer = require('../models/Consumer');
const { protect } = require('../middleware/auth');
const { asyncHandler, HttpError } = require('../middleware/error');

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) throw new HttpError(400, 'Email and password are required.');

    const user = await User.findOne({ email: String(email).toLowerCase().trim() });
    const ok = user && (await bcrypt.compare(password, user.passwordHash));
    if (!ok) throw new HttpError(401, 'Invalid email or password.');

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '1d',
    });
    const consumer = user.role === 'consumer' ? await Consumer.findOne({ user: user._id }) : null;
    res.json({ token, user, consumer });
  })
);

router.get(
  '/me',
  protect,
  asyncHandler(async (req, res) => {
    const consumer = req.user.role === 'consumer' ? await Consumer.findOne({ user: req.user._id }) : null;
    res.json({ user: req.user, consumer });
  })
);

module.exports = router;
