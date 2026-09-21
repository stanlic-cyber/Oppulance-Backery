const express = require('express');
const nodemailer = require('nodemailer');

const router = express.Router();

// Very small email format check — good enough to catch typos, not meant to be exhaustive
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function buildTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
}

router.post('/', async (req, res) => {
  try {
    const { name, email, message, projectType } = req.body || {};

    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Name, email, and message are required.' });
    }
    if (typeof email !== 'string' || !EMAIL_RE.test(email)) {
      return res.status(400).json({ error: 'That email address doesn\'t look right.' });
    }
    if (String(message).length > 5000) {
      return res.status(400).json({ error: 'Message is too long.' });
    }

    const recipient = process.env.SUPPORT_EMAIL || process.env.EMAIL_TO;
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS || !recipient) {
      console.error('Email env vars are not configured. See .env.example.');
      return res.status(500).json({ error: 'Contact form is not configured yet. Please try again later.' });
    }

    const transporter = buildTransporter();

    const safeName = String(name).slice(0, 200);
    const safeProjectType = String(projectType || 'Not specified').slice(0, 100);
    const safeMessage = String(message).slice(0, 5000);

    await transporter.sendMail({
      from: `"Coreline Systems Website" <${process.env.EMAIL_USER}>`,
      to: recipient,
      replyTo: email,
      subject: `New project inquiry — ${safeName} (${safeProjectType})`,
      text:
`New message from the Coreline Systems contact form:

Name: ${safeName}
Email: ${email}
Project type: ${safeProjectType}

Message:
${safeMessage}`,
      html:
`<div style="font-family:sans-serif; line-height:1.6;">
  <p><strong>New message from the Coreline Systems contact form</strong></p>
  <p><strong>Name:</strong> ${escapeHtml(safeName)}<br>
     <strong>Email:</strong> ${escapeHtml(email)}<br>
     <strong>Project type:</strong> ${escapeHtml(safeProjectType)}</p>
  <p><strong>Message:</strong><br>${escapeHtml(safeMessage).replace(/\n/g, '<br>')}</p>
</div>`
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Contact form error:', err);
    return res.status(500).json({ error: 'Something went wrong sending that. Please try again later.' });
  }
});

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

module.exports = router;
