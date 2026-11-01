# AI.md: how AI was used

## Summary

Claude generated most of the code, tests, CI/Docker config and docs from a short brief
("implement the attached test task, include the bonus items, use React and Nest"). I directed scope and
stack, reviewed and edited the result, ran it on my own machine against a real MongoDB Atlas cluster, and
found and fixed a bug the AI's own tests had missed (see "What the AI got wrong", item 8).

## What was AI-assisted

| Area             | AI contribution                                                                                                             |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Backend scaffold | Nest CLI scaffold, then replaced the sample app with config/users/auth/health modules                                       |
| Auth logic       | Signup/signin, bcrypt hashing, JWT cookie strategy, protected `/auth/me`, logout, then database-backed sessions (see below) |
| Hardening        | helmet, throttling, strict validation, env validation, exception filter, pino logging with redaction                        |
| Frontend         | Vite + React + TS, react-hook-form + zod forms, auth context, route guards, styling                                         |
| Tests            | 56 backend unit, 28 frontend tests                                                                                          |
| Delivery         | Dockerfiles, nginx, compose, GitHub Actions, README, API documentation PDF                                                  |

## What worked well

- **Reading the task PDF first and mapping every line to a requirement** (the fields, the 3-character
  name rule, the password rules, "at least one protected endpoint", the bonus list) before writing code.
- **Writing tests for validation and authentication boundaries early.** This caught real bugs in the
  password rules, error responses, and session handling before delivery.
- **Scaffolding with the official CLI** rather than from memory, because Nest had moved to v12
  (ESM and Vitest) and hand-written config for the old layout would have been wrong.
- **Checking current package versions** instead of trusting remembered ones.
- **Adding temporary debug logging** to find the session bug (item 8) instead of guessing at causes.

## A design decision I made

I chose **a JWT that carries a session id, checked against a `sessions` collection on every request**.
This keeps the benefits of JWT authentication while allowing immediate server-side revocation: logout
deletes the session, so a copied token stops working immediately instead of remaining valid until it
expires. A TTL index removes expired sessions automatically. This approach also keeps the
implementation smaller and avoids the additional rotation and refresh-endpoint complexity of separate
access and refresh tokens.

## What the AI got wrong and had to fix

Items 1 to 7 were found by running the code in the AI's build environment. Item 8 was found by me, on my own
machine, and it is the most important one.

1. **npm crashed installing the scaffold** (`Cannot read properties of null (reading 'edgesOut')`),
   a deterministic resolver failure on Nest 12's peer set. Worked around with `--legacy-peer-deps`
   and applied it consistently to the Dockerfile and CI so they don't fail the same way.
2. **Only one password-rule message was ever reported.** Three stacked `@Matches` decorators share the
   constraint name `matches`, and class-validator keys messages by name, so later rules overwrote earlier
   ones. A unit test asserting all broken rules are reported failed. Fixed with a small `PasswordRule`
   decorator giving each rule a unique name.
3. **Error responses reported the wrong path** (`/nope` instead of `/api/nope`) because `req.url`
   drops the mount prefix. Switched to `req.originalUrl`.
4. **A bcrypt hash computed at construction time** (`hashSync`, ~380ms) blocked the event loop on every
   start. Replaced with a precomputed constant for the timing-equalising dummy hash.
5. **Deleted the scaffold's `public/` folder but left the favicon link**, which would 404.
6. **Password error UX:** the first version hid the password error entirely when the checklist was shown,
   leaving a failed submit with no error state on the field. Now points the user at the checklist.
7. Two of my own test expectations were wrong (empty-email message wording) and were corrected to match
   the better behaviour rather than the other way round.
8. **Users were logged out on every page refresh (found by me, against a real MongoDB).**
   - **Symptom:** sign-in worked and showed the home page, but pressing F5 sent me back to `/signin`.
     Opening `/api/auth/me` directly returned 401, even though the session document was visible in
     MongoDB Compass.
   - **How I found it:** I first suspected the browser and the cookie settings (the AI's first guesses),
     and tested in other browsers with the same result. I then added temporary logging to the JWT guard,
     which showed the token was valid and the cookie was sent, so the rejection came from the session
     lookup. Logging the lookup showed the session existed in the database but
     `Model.exists({ _id, userId, expiresAt })` returned `null`.
   - **Root cause:** in `session.schema.ts` the AI declared `userId` as
     `@Prop({ type: Types.ObjectId, ... })`. Through `@nestjs/mongoose` that type resolves to Mongoose's
     `Mixed`, not `ObjectId`. Mixed fields are not cast in queries, so the lookup compared the string id
     from the JWT against the ObjectId stored in the database, and never matched. The AI confirmed this by
     building the schema and checking `SessionSchema.path('userId').instance`, which printed `Mixed`.
   - **Fix:** `@Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', ... })`, importing
     `Schema as MongooseSchema` from `mongoose`. After the fix the instance is `ObjectId`, the query
     matches, and refresh keeps the user signed in. I then removed the debug logging.
   - **Why the tests missed it:** the unit and e2e tests used in-memory fakes for the sessions store, so
     they never exercised Mongoose's real query casting. I had flagged the lack of a real-database test as
     a known gap, and this bug was exactly what that gap could hide.
   - **Lesson:** a green test suite does not replace running the app against the real database. A
     real-MongoDB integration test of `SessionsService.isActive` would have caught this, and is on my
     list of next steps.

## Decisions that differ from the "obvious" AI default

- **httpOnly cookie instead of `localStorage` for the JWT**, and a same-origin proxy so no CORS is needed.
- **Same error for unknown email and wrong password**, plus timing equalisation, to prevent account enumeration.
- **Unique index decides duplicate emails** (catch error 11000) instead of check-then-insert, which races.
- **Fail-fast config:** no default `JWT_SECRET`; boot aborts if it's weak or missing.
- **Max password length of 72** to match bcrypt's silent truncation.
- **Sign-in does not re-check password complexity**, so it doesn't leak the policy.

## What was NOT verified (be upfront about this)

- The automated tests still use in-memory fakes for the users and sessions stores, so the Mongoose
  schemas, the 11000 duplicate-email path, `select: false` and the sessions TTL index are not covered by
  automated tests. I did run the app by hand against MongoDB Atlas (sign-up, sign-in, refresh, protected
  endpoint), which is how item 8 was found.
- The Docker images were **not built or run** by the AI.
- Visual design was checked by me in a browser, but there are no automated UI tests beyond the component tests.

## My own decisions

- I selected React with TypeScript for the frontend and NestJS with MongoDB for the backend.
- I chose JWT authentication backed by database sessions so tokens remain stateless to verify while
  sessions can still be revoked immediately.
- I chose an httpOnly, SameSite cookie rather than storing the token in `localStorage`, reducing the
  risk of token theft through client-side JavaScript.
- I kept strict validation, rate limiting, password hashing, and consistent error responses because
  they improve the reliability and security of the authentication flow.
- I tested the finished app myself against a real database, debugged the refresh problem, and applied the
  fix, rather than trusting that passing tests meant the app worked.
- I removed the AI's Swagger setup and the e2e test suite to keep the repo smaller. API documentation is
  provided as a PDF instead.
