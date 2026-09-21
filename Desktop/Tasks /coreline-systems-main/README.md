# Coreline Systems

Company website for Coreline Systems, served by a small Express backend with working
contact and subscription forms (submissions arrive by email — no database needed).

## Project structure

```
coreline-systems/
  server.js            Express app entry point
  routes/
    contact.js          POST /api/contact — validates + emails form submissions
    subscribe.js        POST /api/subscribe — validates + emails subscriber notifications
  public/
    index.html           The whole site (HTML/CSS/JS in one file)
    media/
      coreline-promo.mp4
      poster.jpg
      everything-grandeur.jpg
  .env.example           Copy to .env and fill in real values
  package.json
```

## Setup (first time, in VS Code)

1. Open this folder in VS Code.
2. Open a terminal (``Ctrl+` `` / `` Cmd+` ``) and install dependencies:
   ```
   npm install
   ```
3. Copy the environment example file and fill in real values:
   ```
   cp .env.example .env
   ```
   Then edit `.env`:
   - `EMAIL_USER` — the Gmail address that will send the notification emails
   - `EMAIL_PASS` — a **Gmail App Password** (not your normal password). Generate one at
     https://myaccount.google.com/apppasswords — this requires 2-Step Verification to be
     turned on for that Google account first.
   - `EMAIL_TO` — where you want contact and subscription notifications delivered
     (currently `matemarumbidzai2@gmail.com` in `.env.example`)

4. Run it locally:
   ```
   npm start
   ```
   Then open http://localhost:3000 in your browser.

   For auto-restart while you're editing:
   ```
   npm run dev
   ```

## How the contact form works

- The form on the site posts to `/api/contact`.
- `routes/contact.js` validates the input, blocks obvious bots via a hidden honeypot field,
  and sends you an email (reply-to is set to the sender's address, so you can just hit
  "reply" in your inbox).
- `server.js` rate-limits that endpoint to 5 submissions per 15 minutes per visitor, so it
  can't easily be spammed.
- If `.env` isn't configured yet, the form fails gracefully with a message telling the
  visitor to use WhatsApp or email directly instead — it won't crash the server.

## Deployment

This uses the same pattern as the Everything Grandeur project — deploys well to Render:

1. Push this project to a GitHub repo.
2. On [Render](https://render.com), create a new **Web Service** from that repo.
3. Build command: `npm install`
4. Start command: `npm start`
5. Add the same three environment variables from your `.env` file in Render's
   Environment settings (`EMAIL_USER`, `EMAIL_PASS`, `EMAIL_TO`) — **do not** commit
   your real `.env` file to GitHub.

## Notes

- `media/` must stay inside `public/` — the video and images are referenced with
  relative paths from `index.html`.
- The whole front end is one HTML file with inline CSS/JS by design, to keep things
  simple. If it grows a lot, splitting into separate `.css`/`.js` files under
  `public/` is a natural next step — just update the `<link>`/`<script src>` tags.
