# SeedCo App - Setup & Deployment Guide

## Project status

- Frontend: React 19 + Vite 6
- Backend: Express 4 + TypeScript + ESM
- Database: MongoDB
- AI: fallback responses and manual-safe flow
- Build validation: passing

## Quick start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

### 3. Validate the build

```bash
npm run build
npx tsc --noEmit
```

### 4. Start the app

```bash
npm start
```

The app listens on http://localhost:3000.

---

## Environment configuration

```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:3000
MONGODB_DB=seedco
```

---

## Development

### Run the dev server

```bash
npm run dev
```

This starts the app in development mode with Vite and the Express API.

### Available scripts

- `npm run dev` - development mode
- `npm run build` - production build
- `npm start` - production server
- `npm run lint` - TypeScript validation

---

## Browser location behavior

The app uses a browser geolocation prompt for location-aware insights, but it is designed to recover gracefully when permission is denied or the browser cannot resolve the device position.

If geolocation is blocked, the app will:

- show the location prompt with a clear error message
- let the user choose manual location entry
- save a safe fallback location so the app does not keep reopening the prompt

This prevents repeated redirects and location loops.

---

## API surface

All API routes are under `/api`.

### Core routes

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/system/health`
- `GET /api/dashboard/stats`
- `GET /api/dashboard/analytics`
- `GET /api/weather/:location`
- `GET /api/alerts`
- `GET /api/marketplace/prices`
- `POST /api/chat`

---

## Troubleshooting

### Port is already in use

```bash
PORT=3001 npm start
```

### Browser blocks geolocation

- Use the manual location flow in the popup
- Confirm the browser allows location access in site settings
- Continue with the safe fallback location if the browser remains restricted

### Build errors

```bash
rm -rf node_modules dist
npm install
npm run build
```

### TypeScript checks

```bash
npx tsc --noEmit
```

---

## Verified status

- Build status: passing
- Type check status: passing
- Lint status: passing
- Manual location fallback: implemented
- Repeated location prompt loop: fixed by safe fallback state

**Status**: Ready for local development and manual browser testing with geolocation permission handling in place.

## Docker container image

Use the following Dockerfile to build and run the app in a container:

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Environment for Production

```env
NODE_ENV=production
PORT=3000
```

---

## Support & Resources

- **React**: <https://react.dev>
- **Vite**: <https://vitejs.dev>
- **Express**: <https://expressjs.com>
- **MongoDB**: <https://www.mongodb.com>

---

Generated: 2026
Version: 1.1.0
