---
kind: logging_system
name: No Centralized Logging — Ad-hoc console.log/print Usage
category: logging_system
scope:
    - '**'
source_files:
    - server/src/app.js
    - server/src/config/passport.js
    - server/src/controllers/adminController.js
    - server/src/controllers/aiController.js
    - server/src/controllers/argController.js
    - server/src/controllers/authController.js
    - ai-engine/main.py
    - ai-engine/vision/sam_extractor.py
---

## Summary

The WARG Platform monorepo does **not** implement a centralized logging system. There is no logging framework (no `winston`, `pino`, `morgan`, `bunyan`, `log4js`, `debug`, Python's `logging` module, or equivalent) installed in any service. All runtime output goes through language-native primitives: Node.js `console.log` / `console.error` / `console.warn`, and Python `print()`.

## Evidence by component

### Express server (`server/src/`)
- No logger dependency is imported anywhere under `server/src/`. The only logging calls are scattered `console.*` invocations:
  - `server/src/app.js:78` — `console.error('MySQL Session Store Error (Aiven spool down?):', error);`
  - `server/src/config/passport.js:61,63` — `console.log('✅ Google OAuth strategy registered.')` and `console.warn('⚠️ GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not set...')`
  - Controllers under `server/src/controllers/` use `console.error(...)` for every caught exception path (adminController, aiController, argController, authController, etc.).
- There is no HTTP request/response logger (no `morgan`, no `helmet` logger, no custom request-id middleware). Requests and responses leave no audit trail in stdout.
- No log-level configuration exists; `NODE_ENV` controls session store behavior but has no effect on logging verbosity.

### AI Engine (`ai-engine/main.py`)
- Uses FastAPI with no logging setup. The only `print()` call is in `vision/sam_extractor.py:15`: `print(f"Warning: SAM weights not found...")`.
- No structured fields, timestamps, correlation IDs, or sinks are configured.

### Client SPA (`client/`)
- Browser-side code uses the browser `console` API directly; there is no client-side logger abstraction.

### Documentation site (`warg-docs/`, `WARG-documentation/`)
- Docusaurus-generated files contain no application logging.

## Conventions observed

- **Error paths**: Every controller wraps its logic in try/catch blocks and emits `console.error(error)` (or a prefixed message like `console.error('Signup Error:', error)`). This is the de facto pattern for error reporting in the Express backend.
- **Startup diagnostics**: One-off `console.log` / `console.warn` messages at process startup indicate feature availability (e.g., Google OAuth strategy registration).
- **No structured logs**: Log lines are plain strings with no JSON envelope, no timestamp field, no service name, no request ID, no user context attached.
- **No log routing**: Output always goes to the process stdout/stderr; there is no file sink, syslog, remote collector, or log aggregation layer wired into the services.
- **No log levels**: The codebase does not distinguish between debug/info/warn/error programmatically; severity is conveyed only by which `console.*` method is called.

## Constraints / rules

- There is no enforced rule preventing direct `console.*` usage — it is the only mechanism available.
- Because no logging framework is declared in `package.json` (server) or `requirements.txt` (ai-engine), adding one would require an explicit dependency change; nothing in linting or CI currently enforces a logging policy.
- The absence of a request logger means HTTP traffic is not captured by the application itself; observability must come from the hosting platform (Render/Vercel) access logs if at all.