const express = require('express');
const cors = require('cors');
const { errorHandler } = require('./middleware/error');

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ status: 'ok', app: 'GridLedger' }));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/consumers', require('./routes/consumers'));
app.use('/api/meters', require('./routes/meters'));
app.use('/api/readings', require('./routes/readings'));
app.use('/api/bills', require('./routes/bills'));
app.use('/api/tariff', require('./routes/tariff'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/complaints', require('./routes/complaints'));

app.use((req, res) => res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` }));
app.use(errorHandler);

module.exports = app;
