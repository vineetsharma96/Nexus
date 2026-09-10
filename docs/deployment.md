# NEXUS Deployment Guide

This guide details how to build, test, and deploy the NEXUS spatial application to production environments.

---

## 1. Prerequisites

- **Node.js**: `v18.18.0` or higher (Node 20+ recommended).
- **Package Manager**: `npm` (v9+), `yarn`, or `pnpm`.
- **Hardware Acceleration**: WebGL2 supported browser (Chrome, Edge, Firefox, Safari, iOS Safari, Chrome Android).

---

## 2. Environment Configuration

Create a `.env.local` file in the root directory:

```env
# Optional: Google Gemini API Key for online generative reasoning
# If omitted or left blank, NEXUS automatically falls back to its offline heuristic engine
GEMINI_API_KEY=your_gemini_api_key_here
```

> **Security Note**: Never prefix `GEMINI_API_KEY` with `NEXT_PUBLIC_`. The key is only read by server-side route handlers (`/api/ai/*`) and is never leaked to the client bundle.

---

## 3. Local Development

```bash
# 1. Install dependencies
npm install

# 2. Run Turbopack development server
npm run dev

# Application will be accessible at http://localhost:3000
```

---

## 4. Production Build & Verification

```bash
# 1. Create optimized production build
npm run build

# 2. Start production server
npm run start
```

Build characteristics:
- App Router with Turbopack compilation.
- Static generation for `/` and `/lite`.
- Dynamic server-rendered API endpoints for `/api/ai/command` and `/api/ai/explain`.

---

## 5. Deployment Platforms

### Vercel (Recommended)
1. Push repository to GitHub.
2. Import project into Vercel.
3. Add `GEMINI_API_KEY` in Project Settings $\to$ Environment Variables.
4. Framework preset: Next.js (Automatic).
5. Deploy.

### Docker Container
```dockerfile
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "start"]
```
