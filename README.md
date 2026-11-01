# Full Stack Auth Module

Sign up, sign in and a protected page. **React + TypeScript** (Vite) frontend, **NestJS + MongoDB** backend.

```
backend/    NestJS 12 API  (Mongoose, JWT + database sessions in an httpOnly cookie, pino logging)
frontend/   React 19 SPA   (react-router, react-hook-form + zod)
```

## Quick start

### Option A: Docker (everything, one command)

```bash
export JWT_SECRET=$(openssl rand -base64 48)
docker compose up --build
```

Open <http://localhost:8080>.

### Option B: local development

Requires Node 22+ and a MongoDB. You can use a local MongoDB
(`docker run -p 27017:27017 mongo:7`) or a MongoDB Atlas cluster.

```bash
# terminal 1: API on :3000
cd backend
cp .env.example .env          # set MONGODB_URI and JWT_SECRET in this file
npm ci --legacy-peer-deps
npm run start:dev

# terminal 2: web app on :5173 (proxies /api to :3000)
cd frontend
npm ci
npm run dev
```

> `--legacy-peer-deps` is needed for the backend: npm's resolver crashes on the
> Nest 12 scaffold's peer-dependency set (`Cannot read properties of null (reading 'edgesOut')`).
> The committed lockfile makes installs reproducible.

For MongoDB Atlas, set `MONGODB_URI` to your cluster connection string and make sure
your current IP address is allowed in the Atlas network access rules. Keep the `.env`
file local; it is ignored by Git and must never be committed.

## Scripts

|            | backend             | frontend        |
| ---------- | ------------------- | --------------- |
| dev server | `npm run start:dev` | `npm run dev`   |
| unit tests | `npm test`          | `npm test`      |
| lint       | `npm run lint`      | `npm run lint`  |
| build      | `npm run build`     | `npm run build` |

## API

The complete API reference is available in [API-DOCUMENTATION.pdf](./API-DOCUMENTATION.pdf).

| Method | Path               | Auth    | Notes                                                     |
| ------ | ------------------ | ------- | --------------------------------------------------------- |
| POST   | `/api/auth/signup` | no      | 201 + sets session cookie; 409 if email taken             |
| POST   | `/api/auth/signin` | no      | 200 + sets session cookie; 401 on bad credentials         |
| POST   | `/api/auth/logout` | no      | 204, deletes the session in MongoDB and clears the cookie |
| GET    | `/api/auth/me`     | **yes** | the protected endpoint; returns the current user          |
| GET    | `/api/health`      | no      | liveness + MongoDB readiness                              |

Field rules (enforced identically on the client and the server):

- **email**: valid format, stored lowercase
- **name**: at least 3 characters
- **password**: at least 8 characters, one letter, one number, one special character (max 72, bcrypt's limit)

All errors share one shape: `{ statusCode, error, message, path, timestamp, requestId }`.
Validation failures return every broken rule in `message` as an array.

## Configuration

See `backend/.env.example`. The app **refuses to start** if `MONGODB_URI` is missing or
`JWT_SECRET` is shorter than 32 characters, rather than falling back to an insecure default.

## Design decisions

- **JWT + a session record in MongoDB.** Sign-in creates a `sessions` document and issues a JWT carrying only the user id (`sub`) and session id (`sid`). Every protected request checks the signature, the expiry **and** that the session still exists, so a token is only as alive as its session.
- **Logout really logs out.** It deletes the session, so a copied token stops working immediately instead of living until it expires. Logging out one device leaves the user's other sessions untouched.
- **Sessions clean themselves up:** a TTL index on `expiresAt` makes MongoDB delete expired sessions. Because that job only runs about once a minute, the expiry is also checked in the query.
- **httpOnly, SameSite=Lax cookie**, not `localStorage`. Page JavaScript can't read it, so an XSS bug can't steal the token. The API also accepts a `Bearer` header so curl/Postman work.
- **Same-origin API** (Vite proxy in dev, nginx in Docker), so the cookie needs no CORS and no `SameSite=None`.
- **bcrypt (cost 12)**; unknown-email sign-ins compare against a dummy hash so timing doesn't reveal which emails exist, and both failures return the same message.
- **Duplicate emails are decided by the unique index**, not a check-then-insert, so two simultaneous sign-ups can't both succeed.
- **Rate limiting**: 100 req/min per IP globally, 10 req/min on sign-up/sign-in.
- **Hardening**: helmet, strict `ValidationPipe` (`whitelist` + `forbidNonWhitelisted`), password hash excluded from queries by default, credentials redacted from logs.
- **Logging**: structured JSON via pino in production (pretty in dev), with a per-request id (`x-request-id`) that is also returned to the client for support.
- **Trade-off:** each protected request costs one extra database lookup for the session. That is cheap at this scale and is the price of instant revocation.
- **Single token, no refresh token.** The session lifetime is `JWT_EXPIRES_IN_SECONDS` (1h by default), after which the user signs in again. Refresh tokens would add rotation and a refresh endpoint for little benefit in a single-app setup.

## Testing

- **Backend unit** (56): DTO validation boundaries, env validation, auth service (hashing, timing-safe failure, duplicates, logout and forged-token handling), and the exact queries the sessions service sends to Mongo.
- **Frontend** (28): schema rules, route guards, full sign-up / sign-in / logout flows against a mocked API.

> **Honest limit:** the automated backend suite is unit-focused and does not talk to a real MongoDB.
> The Mongoose schemas, the unique-index conflict path (error code 11000), `select: false` and the
> sessions TTL index are not covered by automated tests. I tested them by running the app against a real
> MongoDB Atlas cluster, which found a session-lookup bug the unit tests had missed (see `AI.md`).
> A real-MongoDB integration test is listed under "What I'd add next".

## CI

`.github/workflows/ci.yml` runs lint, unit tests and builds for both apps on every push and PR, then builds
both Docker images.

## What I'd add next

"Sign out everywhere" and a list of active sessions, ending all sessions on password change, email verification
and password reset, account lockout after repeated failures, and a real-MongoDB integration test job (service container) in CI.
# Auth_Task
