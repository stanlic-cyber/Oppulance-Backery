require('dotenv').config();
const express = require('express');
const path = require('path');
const rateLimit = require('express-rate-limit');
const contactRouter = require('./routes/contact');
const subscribeRouter = require('./routes/subscribe');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Serve the site
app.use(express.static(path.join(__dirname, 'public')));

// Basic rate limiting on the contact endpoint — 5 submissions per 15 minutes per IP
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many messages sent — please try again later or reach out on WhatsApp.' }
});

app.use('/api/contact', contactLimiter, contactRouter);
app.use('/api/subscribe', contactLimiter, subscribeRouter);

// Fallback to index.html for any other route (single-page site)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Coreline Systems running at http://localhost:${PORT}`);
});
