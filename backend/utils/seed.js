// Run:  npm run seed
// Creates: admin account, default tariff, 5 demo consumers (C001-C005) with meters (M001-M005)
require('dotenv').config();
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Consumer = require('../models/Consumer');
const Meter = require('../models/Meter');
const Tariff = require('../models/Tariff');

const DEMO = [
  ['C001', 'Aarav Sharma', '12 Lake View Road, Pune', '9876500001'],
  ['C002', 'Priya Nair', '45 Green Park, Kochi', '9876500002'],
  ['C003', 'Rohan Mehta', '7 Sector 21, Chandigarh', '9876500003'],
  ['C004', 'Sneha Iyer', '88 Temple Street, Chennai', '9876500004'],
  ['C005', 'Vikram Singh', '23 Civil Lines, Jaipur', '9876500005'],
];

async function seed() {
  await connectDB();

  if (!(await User.findOne({ email: 'admin@gridledger.com' }))) {
    await User.create({ name: 'Admin', email: 'admin@gridledger.com', role: 'admin', passwordHash: await bcrypt.hash('admin123', 10) });
    console.log('Admin created  ->  admin@gridledger.com / admin123');
  }
    if (!(await User.findOne({ email: 'reader@gridledger.com' }))) {
    await User.create({ name: 'Meter Reader', email: 'reader@gridledger.com', role: 'meter_reader', passwordHash: await bcrypt.hash('reader123', 10) });
    console.log('Meter reader created  ->  reader@gridledger.com / reader123');
  }
  await Tariff.getCurrent();

  for (const [i, [consumerId, name, address, phone]] of DEMO.entries()) {
    if (await Consumer.findOne({ consumerId })) continue;
    const email = `${consumerId.toLowerCase()}@example.com`;
    const user = await User.create({ name, email, role: 'consumer', passwordHash: await bcrypt.hash('consumer123', 10) });
    const consumer = await Consumer.create({ consumerId, name, address, phone, user: user._id });
    await Meter.create({ meterId: `M00${i + 1}`, consumer: consumer._id, installationDate: new Date('2025-01-15'), status: 'active' });
    console.log(`Consumer ${consumerId} created  ->  ${email} / consumer123   (meter M00${i + 1})`);
  }

  console.log('Seed complete.');
  await mongoose.disconnect();
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
