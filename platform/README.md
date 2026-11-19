# Deploy RoofQuote Relay (automatic database setup)

**No Cloudflare database ID is needed up front.** Use Cloudflare's official deployment wizard:

**[Deploy RoofQuote Relay Native Platform to Cloudflare](https://deploy.workers.cloudflare.com/?url=https://github.com/orpheonmaris/RoofQuote-Relay/tree/main/platform)**

Cloudflare will copy the self-contained `platform/` app into a **new GitHub repository in your account**, provision and bind its own **D1 database**, apply the initial schema through the repository's `deploy` script, and publish a **separate Cloudflare Worker**. This does **not** modify the existing marketing website (`roofquote-relay.pages.dev`). Cloudflare may ask you to authorize the new project or configure environment variables; **review before approving any paid plan**. If setup does not complete, do not use the new dashboard with real homeowner data.

The application remains **in setup/TEST readiness, not production** until a verified sending domain, Resend, session secret, Turnstile, staff authorization, and real end-to-end acceptance tests are completed. Cloudflare automatically creating a database is not the same as activating the business.

See [One-click owner instructions](docs/ONE_CLICK_DEPLOY.md).

---

# RoofQuote Relay — Native Web Platform (v1 preview)

A separate, client-facing operations application for RoofQuote Relay. This replaces the **Google Forms / Google Sheets / Google Apps Script dependency** for new clients after deployment and acceptance testing. It does **not** alter the existing Cloudflare Pages marketing website, Formspree sales contact form, or Google demonstration.

**Status:** Implementation and local integration tests completed; **not deployed to a production Cloudflare Worker**, not connected to a live D1 database or verified outgoing email domain, and not yet certified for processing real homeowners. The administrator must still provision services, test actual email delivery, review privacy/retention, and obtain each roofing client's live-activation approval.

## Application capabilities

- Private browser dashboard with owner and staff logins via short-lived, single-use email links (no passwords distributed).
- Multiple roofing companies under an operator account; company records scoped by membership.
- Company-branded public inquiry form (`/q/company-slug`) with verified Cloudflare Turnstile tokens.
- Cloudflare D1 storage, scoped event log, limited per-IP/per-email rate windows, and idempotent submissions.
- Transactional homeowner acknowledgment and immediate owner notification using Resend and a verified sender domain.
- 45-minute and 2-hour-later **internal** reminders for requests still marked New, with a two-reminder cap.
- Status updates (`New`, `Contacted`, `Booked`, `Closed - Won`, `Closed - Lost`, `Do not contact`) and hashed opt-out suppression.
- Weekly operational reports by email; dashboard shows current counts, recent requests, and delivery exceptions.
- CSV lead export (spreadsheet-formula escaping), controlled deletion of app-held leads, pause/resume public intake.
- Safe internal sample-lead generator when the company is in DRAFT / PAUSED mode, without homeowner mail.

## Deliberate product boundaries

- Does not generate roofing leads, record phone calls, detect replies to unrelated emails, book appointments, send SMS, make callbacks, guarantee more sales, or handle emergencies.
- Requires staff to update statuses after real phone/email contact.
- A successful email API response means **the sending provider accepted the message**, not guaranteed inbox delivery; errors marked for review are not silently retried.
- Deleted app records may still exist in recipient inboxes, the sending provider's logs, backups, or exported files.
- Does not include self-service billing or payment collection. This remains manual/through a separate processor.
- Initial intake is one branded form per roofer; integrating a pre-existing website form or CRM needs an approved site-specific integration.
- **Live intake is disabled by default**. Only the company owner account can activate after acknowledging a specific go-live approval and configuring the verified domain/phone/privacy notice.

## Repository directory

```
platform/
  src/core.mjs              # validation, storage, email queue, cron, metrics
  src/index.mjs             # HTTP API, scoped auth, forms, owner controls
  public/app.html           # dashboard shell
  public/app.js             # dashboard data management
  public/login.js           # magic-link sign-in
  public/public.js          # public customer form submission
  public/style.css          # responsive UI
  migrations/0001_schema.sql  # D1 data model
  tests/platform.test.mjs   # local D1/HTTP/cron/email integration tests (Node 22)
  docs/SETUP_NO_CODE.md     # click-oriented setup for business owner
  docs/SECURITY.md          # data access, acceptance and risk boundaries
  wrangler.jsonc            # separate Cloudflare Worker, not Pages
```

## Start here

Follow **[docs/SETUP_NO_CODE.md](docs/SETUP_NO_CODE.md)**.

**Cloudflare project name:** `roofquote-relay-app` (a separate Worker; the existing `roofquote-relay` Pages site stays unchanged).

**Database name:** `roofquote-relay-platform` (new D1 database; requires user-created ID in `wrangler.jsonc`).

**Git repository:** `orpheonmaris/RoofQuote-Relay`, root directory for the new Workers Builds project: `platform`.

**Email:** Resend's API, with a domain you control and have verified. `roofquoterelay@outlook.com` remains the operator/notification mailbox; it is not by itself a verified sending domain.

**Spam protection:** Cloudflare Turnstile, with server-side Siteverify enforcement. Do not disable it in production.

## Test offline

`node --test tests/platform.test.mjs` (Node 22+ has an experimental built-in SQLite module used by the mocks). No external packages or real credentials are needed for tests. Tests simulate D1 semantics, Resend responses and Turnstile validation; they are not production acceptance tests.

## Live-email and authentication caveat

The dashboard's passwordless login itself requires a working verified email sender. Until a verified sender/domain is provisioned, the application can be built and inspected, but staff cannot receive magic links. Set `OPERATOR_EMAIL` to the account authorized to administer the service, `APP_ORIGIN` to the exact deployed Worker origin, and use Cloudflare secrets for `SESSION_SECRET`, `RESEND_API_KEY`, `TURNSTILE_SECRET`. Never commit credentials to Git.
