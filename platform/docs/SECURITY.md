# Security and production acceptance — RoofQuote Relay v1

## Current validation status

This repository is a **production-shaped implementation with mocked/local tests**, not an audited, real-customer production deployment. Local tests use Node SQLite as a D1 adapter, mocked Turnstile Siteverify responses, and a fake Resend API. No homeowner messages have been sent through this version.

## Access and isolation

- Passwordless email authentication: single-use links expire after 10 minutes, secret-hashed token storage, 7-day HTTP-only Secure SameSite=Strict session cookies.
- Authorized operator email can manage all companies. Only a company owner can approve its own LIVE activation; staff can update company-scoped leads.
- Every lead, membership, outbox and suppression SQL query is restricted to its organization. Never reuse foreign company identifiers without a membership check.
- Audit events record status/approval changes with minimal detail, not homeowner messages.
- Changing staff access currently means adding the email through the dashboard. Revocation requires an operator-run database action (not yet a UI); complete that before larger deployments or long-term service contracts.

## Intake and communications

- All public submissions require Turnstile server-side validation. Cloudflare IP/email rate windows slow abuse, but they are **not** complete DoS protection.
- Body size and fields are constrained, and public form pages escape all company data.
- An `Idempotency-Key` is supplied to Resend; mail attempts are recorded in D1. Network-unknown outcomes are marked for review rather than blindly retried.
- The first homeowner acknowledgment uses warm, factual language; no appointment is promised. No SMS or automatic homeowner marketing.
- The app may show emails as provider-accepted. This is **not** proof of delivery or reading. For robust bounce/webhook processing, signed Resend webhooks and suppression reconciliation are a future requirement.
- Reminders go to the company owner only, at roughly 45 minutes and 2 hours after the first reminder; schedules can run late and are not emergency dispatch.
- When a request is marked Do not contact, a keyed hash of email is stored and future acknowledgments are suppressed. The original lead still exists until deleted.

## Data handling

- D1 stores name/email/phone/ZIP/service/notes, not full home addresses or payment card data.
- CSV exports are member-gated and escape spreadsheet formula prefixes.
- Deleting a lead removes its current app database record (and related outbox data), but not messages already in Outlook/Resend or any backups/exports. Customer contracts must disclose those retention limits.
- The `sessions` and rate-window tables are periodically cleaned. Homeowner leads currently have **no automatic TTL deletion**; deploy a legal/operational retention policy and verify actual erasure before client launch.
- No secrets belong in public GitHub. Use Cloudflare encrypted Worker Secrets.

## Pre-production unresolved items

1. Register and verify an owned sending domain; do not use placeholder `MAIL_FROM`.
2. Bind a real D1 database and apply/verify migration.
3. Configure Cloudflare Turnstile for both preview and final custom domain.
4. Verify real magic-link login and customer transactional email delivery.
5. Conduct a real database backup and restore drill; validate permissions/revocation and incident response.
6. Verify hosted form disclosures, email policies, DNC processing and retention with the client.
7. Test load, concurrent intake/outbox claims and provider outages on Cloudflare's actual runtime; mock tests are insufficient for service-level reliability claims.
8. Add signed webhooks and bounce/delivery-state reconciliation prior to making claims of guaranteed delivery.
9. Upgrade staff management to include in-dashboard revocation and session invalidation before operating at scale.

Do not send real homeowner data through the app until these applicable gates have been addressed.
