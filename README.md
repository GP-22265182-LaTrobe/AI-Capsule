# AI Capsule

A private library for saving and managing AI prompts. Users sign in with GitHub, and the Express backend issues its own application JWT (stored in a secure, httpOnly cookie) to protect each user's own capsule records.

## Deployment

**Live URL:** `https://ai-capsule-keth.onrender.com`

**Cloud platform:** Render (free web service — see "Storage and persistence" below for the one caveat that comes with it)

## Tech Stack

| Component | Technology |
|---|---|
| Frontend | React (Vite) |
| Backend | Node.js + Express |
| Database | SQLite, via Node's built-in `node:sqlite` module |
| Authentication | GitHub OAuth → Express-issued application JWT |

## 1. Installation and Running

Requires **Node.js 22.5+** (`node:sqlite` needs this; the project was built and tested on Node 22.22).

The frontend and backend run as two separate processes locally, but are served together as one app once deployed.

### Backend
```bash
cd server
npm install
cp .env.example .env   # fill in real values — see "Environment variables" below
node server.js
```
Runs on `http://localhost:3001`.

### Frontend
```bash
cd client
npm install
npm run dev
```
Runs on `http://localhost:5173`. Vite's dev server proxies `/api`, `/login`, `/auth`, and `/logout` to `http://localhost:3001`, so the app behaves as a single origin locally — this matters specifically because the JWT is stored in a cookie, and cookies are origin-scoped.

### Production build (what actually runs on Render)
```bash
npm install --prefix server
npm install --prefix client
npm run build --prefix client
node server/server.js
```
Express serves the built React app as static files and the API from the same process and URL, which avoids CORS and cross-origin cookie issues entirely.

## 2. How the frontend communicates with Express

All frontend requests go through `client/src/services/api.js`, which calls the same-origin paths below with `credentials: "include"` on every request, so the browser sends the `token` cookie automatically. No token handling happens in JavaScript — the frontend never reads, stores, or attaches the JWT itself; the browser does that via the cookie.

## 3. Mandatory API routes

| Method | Route | Access | Purpose |
|---|---|---|---|
| GET | `/` | Public | React landing page |
| GET | `/login` | Public | Redirects to GitHub OAuth |
| GET | `/dashboard` | Protected (client-side) | React dashboard |
| GET | `/api/health` | Public | Returns `{ "status": "ok" }` |
| GET | `/api/capsules` | Protected | List the authenticated user's own capsules |
| POST | `/api/capsules` | Protected | Create a capsule owned by the authenticated user |
| PUT | `/api/capsules/:id` | Protected | Update a capsule, only if it belongs to the authenticated user |
| DELETE | `/api/capsules/:id` | Protected | Delete a capsule, only if it belongs to the authenticated user |

Additional routes used for the OAuth flow itself: `GET /auth/github/callback` (OAuth redirect target) and `GET /logout` (clears the cookie).

## 4. OAuth provider and JWT flow

**Provider used:** GitHub OAuth.

1. `GET /login` redirects the browser to GitHub's OAuth authorize URL.
2. GitHub redirects back to `GET /auth/github/callback` with a temporary code.
3. The backend exchanges that code for a GitHub access token, then fetches the GitHub user's ID and username.
4. The backend signs its **own** application JWT (`{ id, login }`, signed with `JWT_SECRET`) — this is a separate token from GitHub's own access token, which is discarded after this step and never stored.
5. That JWT is set in a cookie named exactly `token`, with `httpOnly: true`, `secure: true` in production, and `sameSite: "lax"`.
6. Every `/api/capsules` route runs through `requireAuth` middleware (`server/middleware/requireAuth.js`), which reads the `token` cookie, calls `jwt.verify()` against `JWT_SECRET`, and rejects with `401` if the cookie is missing or the signature doesn't verify. The verified payload's `id` is used as `user_id` for all database queries — the frontend never sends `user_id` itself.

## 5. Environment variables (names only — no real values below or anywhere in this repo)

| Name | Purpose |
|---|---|
| `PORT` | Port the Express server listens on |
| `NODE_ENV` | `production` on Render; enables the `secure` cookie flag |
| `JWT_SECRET` | Signing secret for the application JWT |
| `GITHUB_CLIENT_ID` | GitHub OAuth App client ID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App client secret |
| `GITHUB_CALLBACK_URL` | Must exactly match the callback URL registered on the GitHub OAuth App |

See `server/.env.example` for the template.

## 6. Database, ownership, and persistence

The `capsules` table is created automatically on backend startup via `CREATE TABLE IF NOT EXISTS` in `server/db.js` — no manual setup step. Schema matches the assignment spec exactly, including `user_id TEXT NOT NULL`.

**Ownership**: `user_id` is never accepted from the client. Every read, update, and delete query filters with `WHERE user_id = ?` using the ID from the *verified* JWT payload (`req.user.id`), not anything supplied in the request body — so one authenticated user cannot read, edit, or delete another user's capsules even if they know the record's numeric ID.

**Persistence**: SQLite here is file-based (`server/capsules.db`). On Render's free tier, the filesystem is **ephemeral** — a restart or new deploy can wipe this file, so capsule data is not guaranteed to persist across deploys. This is a known, accepted limitation of this hosting tier per the assignment brief, not an application bug.

## 7. Required cURL tests

Run against the deployed URL, not localhost:

```bash
curl -i https://ai-capsule-keth.onrender.com/api/capsules
```
**Required result:** `401 Unauthorized`
**Actual result obtained:** {"error":"Unauthorized"}
HTTP/1.1 401 Unauthorized
```bash
curl -i -H "Cookie: token=fake-token-123" https://ai-capsule-keth.onrender.com/api/capsules
```
**Required result:** `401 Unauthorized`
**Actual result obtained:** HTTP/1.1 401 Unauthorized

## 8. AI-assisted development

**AI tool(s) used:** Claude (Anthropic), used throughout for scaffolding the Express/OAuth/JWT code, the React frontend, and deployment troubleshooting.

**Problem found and corrected in AI-generated code or configuration:** The original Render build command (`npm install --prefix client && npm run build --prefix client`) failed in production with `vite: not found`, even though it worked locally. The cause: Render detects `NODE_ENV=production` and skips installing `devDependencies` during the build step — and `vite` plus `@vitejs/plugin-react` were both listed under `devDependencies` in `client/package.json`. Since `NODE_ENV=production` is also needed at runtime (it controls the `secure` flag on the JWT cookie), the fix was to move `vite` and `@vitejs/plugin-react` into regular `dependencies` instead, so they install regardless of `NODE_ENV`. Confirmed the fix by reproducing the exact failure condition locally (`NODE_ENV=production npm install`) before and after the change.

**How OAuth login, JWT verification, and protected API behaviour were verified:** Logged in through the real GitHub OAuth flow and confirmed a `token` cookie was set; confirmed `GET /api/capsules` returns `401` with no cookie and with a deliberately invalid cookie value (`fake-token-123`), and only returns data with a genuinely signed, valid JWT. Also hit a real `incorrect_client_credentials` error from GitHub during setup, traced to a stale/rotated client secret value in Render's environment variables, and resolved it by regenerating the secret on GitHub and re-entering it cleanly on Render.

**How CRUD behaviour and ownership were verified:** Performed a full create/read/update/delete cycle through the UI. Ownership isolation was verified by signing two different JWTs for two different fake user IDs and confirming that the second user's `GET /api/capsules` returned an empty list, and that the second user's `PUT` request against the first user's capsule ID returned `404` rather than succeeding.

**One implementation/deployment decision made and can explain independently:** I chose to serve the built React app as static files from the same Express process rather than deploying frontend and backend separately, specifically to avoid cross-origin cookie complications with the httpOnly JWT cookie — cookies are origin-scoped, so keeping everything on one origin meant no CORS configuration or `SameSite=None`/cross-site cookie handling was ever needed.

## 9. Limitation

SQLite here is file-based and stored on Render's local filesystem, which is ephemeral on the free tier — a restart or new deploy can wipe the `capsules.db` file, so saved capsules are not guaranteed to persist indefinitely. This is a known trade-off of using free-tier SQLite rather than a managed database, and is explicitly called out as an accepted limitation in the assignment brief rather than something this implementation attempts to work around.
