const express = require('express');
const nodemailer = require('nodemailer');

const router = express.Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function buildTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

router.post('/', async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim() : '';

  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'Enter a valid email address.' });
  }

  const recipient = process.env.SUPPORT_EMAIL || process.env.EMAIL_TO;
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS || !recipient) {
    console.error('Email env vars are not configured. See .env.example.');
    return res.status(500).json({ error: 'Subscriptions are temporarily unavailable. Please try again later.' });
  }

  try {
    await buildTransporter().sendMail({
      from: `"Coreline Systems Website" <${process.env.EMAIL_USER}>`,
      to: recipient,
      replyTo: email,
      subject: 'New Coreline Systems subscriber',
      text: `A visitor subscribed with this email address: ${email}`,
      html: `<p>A visitor subscribed with this email address:</p><p><strong>${escapeHtml(email)}</strong></p>`,
    });
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Subscription error:', error);
    return res.status(500).json({ error: 'Something went wrong processing your subscription. Please try again later.' });
  }
});

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

module.exports = router;