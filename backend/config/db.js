require('node:dns').setServers(['8.8.8.8', '1.1.1.1']);
const mongoose = require('mongoose');

module.exports = async function connectDB(uri = process.env.MONGO_URI) {
  if (!uri) throw new Error('MONGO_URI is not set. Create backend/.env (see .env.example).');
  await mongoose.connect(uri);
  console.log('MongoDB connected:', mongoose.connection.name);
};
