---
kind: error_handling
name: 'Error Handling in WARG Platform: Per-Controller try/catch with JSON Error Responses'
category: error_handling
scope:
    - '**'
source_files:
    - server/src/app.js
    - server/src/middleware/authMiddleware.js
    - server/src/middleware/antiSpoofing.js
    - server/src/controllers/aiController.js
    - server/src/controllers/authController.js
    - server/src/controllers/adminController.js
---

## Overview

The WARG Platform monorepo handles errors primarily at the Node.js/Express server layer (`server/src/`) and the Python AI microservice (`ai-engine/`). There is no centralized Express error-handling middleware, no custom error class hierarchy, and no sentinel error types. Errors are handled inline via `try`/`catch` blocks inside route handlers and controllers, returning plain JSON objects with an `error` field.

## Server (Express) — `server/src/`

### Central wiring (`app.js`)

`app.js` builds the Express app but does **not** register a global `app.use((err, req, res, next) => ...)` error handler. Unhandled promise rejections or thrown errors bubble up to Express's default error handler, which returns HTML error pages rather than JSON. The only explicit error handling in `app.js` is:

- CORS origin validation callback throws `new Error('Origin not allowed by CORS')`, which Express converts to a 403 response.
- MySQL session store emits an `'error'` event that is logged via `console.error` but does not block requests.

### Middleware-level errors

- `middleware/authMiddleware.js`: Two small synchronous middlewares (`requireAuth`, `requireAdmin`) return early with `res.status(401).json({ error: '...' })` or `res.status(403).json({ error: '...' })`. No `next(err)` is used.
- `middleware/antiSpoofing.js`: Wraps its entire async body in `try { ... } catch (error) { console.error(...); next(); }`. On internal failure it **swallows** the error and lets the request proceed — the comment explicitly says "Don't block legitimate gameplay if the anti-spoofing engine fails internally." Suspicious activity is returned as `res.status(403).json({ error: 'Interaction denied due to suspicious location activity.', flags })`.

### Controller-level errors

Controllers follow a consistent pattern per handler:

1. Validate input → `res.status(400).json({ error: '<message>' })` for missing fields.
2. Call downstream services (Sequelize models, external AI service).
3. Wrap each handler in `try { ... } catch (error) { console.error('<Handler> Error:', error); return res.status(500).json({ error: '<generic message>' }); }`.
4. For the AI controller, non-OK HTTP responses from the Python AI service are converted into `throw new Error(...)` and then caught by the surrounding try/catch, yielding a 500 with a generic message like `Failed to process shape evaluation`.

Examples across controllers include:
- `authController.signup`: 400 for missing fields, 400 for duplicate email/username, 500 for login-after-signup failure, 500 for any uncaught exception.
- `adminController.*`: 404 for not-found resources, 500 for database failures.
- `aiController.evaluate*`: 400 for missing files, 500 for downstream AI service failures.

### Error response shape

There is no unified error envelope. Responses vary:
- `{ error: '...' }` — most common (controllers, auth middleware, anti-spoofing).
- `{ message: '...', user: {...} }` — success responses.
- `{ exists: boolean, field?: string }` — `checkUserExists`.
- `{ error: '...', flags: [...] }` — anti-spoofing denial.

No standardized error code, error type, or stack trace is included in production responses.

### Sequelize model errors

Models under `server/src/models/` are Sequelize ORM definitions; they do not define custom error classes. Database constraint violations and query failures propagate as raw Sequelize exceptions and are caught by the enclosing controller try/catch, resulting in a 500 JSON response.

## Client (browser SPA) — `client/scripts/`

Client-side error handling uses `.catch()` on fetch/XHR calls and Playwright tests assert on error responses. There is no shared error utility module in the client scripts directory; error branches are inline per script file (e.g., `scripts/api.js`, `scripts/game.js`).

## Python AI Microservice — `ai-engine/main.py`

The FastAPI-based AI service defines its own Pydantic error schemas and uses FastAPI's built-in exception handling. It returns structured JSON error responses with HTTP status codes matching the underlying vision library errors (e.g., SAM segmentation failures, OCR failures). This is separate from the Express server's error strategy.

## Conventions Observed

- **Per-handler try/catch**: Every async controller function wraps its body in `try`/`catch` and logs via `console.error` before returning a 500 JSON response.
- **Input validation returns 400**: Missing required parameters/files produce `res.status(400).json({ error: '<human-readable message>' })`.
- **Authorization returns 401/403**: `authMiddleware` distinguishes unauthenticated (401) from banned/admin-required (403).
- **Downstream failures are swallowed and normalized**: The AI controller translates all non-OK responses from the Python service into a single 500 JSON error, hiding the actual error text from clients.
- **Anti-spoofing degrades gracefully**: Internal exceptions in the anti-spoofing middleware are logged and ignored so gameplay continues.
- **No global error middleware**: There is no Express error-handling middleware registered in `app.js`; unhandled errors fall through to Express defaults.
- **No custom error types**: The codebase does not define a base `AppError` class or sentinel error constants; errors are plain `Error` instances or strings.
- **No centralized logging**: Errors are printed to stdout via `console.error` with a handler-specific prefix.