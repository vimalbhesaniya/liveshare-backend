# LiveShare Next.js Backend (MongoDB + Socket.io)

Full backend migrated from `server/` — **MongoDB only** (no AWS Lambda / DynamoDB).

## Stack

- **Next.js 15** App Router — REST API routes
- **MongoDB** (Mongoose) — snippet storage
- **Socket.io** — realtime collaboration (custom Node server)
- **No AWS** required for this project

## Quick start

```bash
cd liveshare-next
cp .env.example .env.local
# Edit MONGODB_URI

npm install
npm run dev
```

Server runs at **http://localhost:3000**

- `GET  /api/health`
- `GET  /api/snippets/:code`
- `POST /api/snippets`
- `PATCH /api/snippets/:code`
- `POST /api/snippets/:code/unlock`
- `GET  /api/snippets/view/:viewToken`
- **Socket.io** on the same port

## Connect existing Vite frontend

In the main `liveshare` project `.env`:

```env
VITE_BACKEND_URL=http://localhost:3000
```

Or leave empty and use Vite proxy (defaults to `http://localhost:3000`).

Run Vite on `:8080` and this backend on `:3000`.

## Deploy

Deploy to any Node host that supports **long-lived WebSockets**:

- Railway, Render, Fly.io, Oracle VM, etc.

**Not Vercel-only** — Socket.io needs the custom `server.ts`.

```bash
npm run build
npm start
```

## Environment

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | yes | MongoDB Atlas or local |
| `CLIENT_ORIGIN` | yes | Comma-separated CORS origins |
| `PORT` | no | Default `3000` |
| `VIEW_LINK_SECRET` | no | View token signing secret |

## Project layout

```
liveshare-next/
  server.ts                 # Custom server (Next + Socket.io)
  src/
    app/api/                # REST routes
    lib/db.ts               # Mongo connection
    lib/snippets/           # Store + API helpers
    lib/password.ts
    lib/view-token.ts
    models/CodeSnippet.ts
    socket/index.ts         # Socket.io handlers
```
