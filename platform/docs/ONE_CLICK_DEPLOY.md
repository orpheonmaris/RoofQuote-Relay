# One-click Cloudflare deployment — RoofQuote Relay

**Recommended:** [Open the Cloudflare deployment wizard](https://deploy.workers.cloudflare.com/?url=https://github.com/orpheonmaris/RoofQuote-Relay/tree/main/platform).

## What it does

Cloudflare will authenticate you into your own Cloudflare and GitHub accounts, copy the isolated `platform/` application into a new repository, provision a D1 database named `roofquote-relay-platform`, apply `migrations/0001_schema.sql`, and publish the `roofquote-relay-app` Worker through Workers Builds. A custom domain is not required for this setup stage. The existing `roofquote-relay.pages.dev` marketing website is unaffected.

If Cloudflare offers customization, keep the app name distinct from the marketing site. You can inspect the selected D1 name and binding `DB`; never grant permissions to an unrelated repository or app. If the deployment wizard asks you to purchase a paid service, do not buy it automatically; the initial test should fit on a free plan, subject to Cloudflare's current plan limits.

**Do not enter personal passwords, Resend API keys, Turnstile secret keys, or session keys into public GitHub files or this chat.** Cloudflare private configuration or its deployment wizard is where those go.

## Verify infrastructure, not homeowner readiness

When the wizard reports success, open the exact Worker URL Cloudflare provides and append `/healthz`. A successful first-stage result resembles:

```json
{
  "database": "connected",
  "authenticationConfigured": false,
  "mailConfigured": false,
  "spamConfigured": false
}
```

The boolean flags will change after their respective services are configured. If the Worker returns `database_unavailable`, inspect the build log for a D1 migration error and make sure the generated cloned repository has a real `database_id` value. If the wizard cannot auto-provision D1, fall back to the explicit manual D1 creation workflow in `docs/SETUP_NO_CODE.md`; do not activate intake.

## Remaining account-owner actions

1. Complete **Resend** registration and verify an email-sending domain you own. The `@outlook.com` mailbox can receive alerts, but it does not automatically authorize sending as your own domain.
2. In Cloudflare Worker **Settings → Variables and Secrets**, set `SESSION_SECRET` (random 32+ characters), `RESEND_API_KEY` (Secret), `MAIL_FROM` (Text), and `APP_ORIGIN` (the actual deployed HTTPS Worker origin). The `OPERATOR_EMAIL` is prefilled as `roofquoterelay@outlook.com` in the source's public config.
3. Create a Cloudflare Turnstile widget for the actual Worker hostname, and configure `TURNSTILE_SITE_KEY` (Text) and `TURNSTILE_SECRET` (Secret).
4. After setting up email, visit the Worker's `/login`, request a sign-in link to the operator address, and verify receipt. No homeowner emails should be sent yet.
5. Verify a complete synthetic workflow (draft company, sample intake, owner alerts, email statuses, reminders, suppression, exports, pause/resume), then require each roofing owner to approve live intake and their own privacy disclosures.

The app deliberately blocks sign-in and customer intake when required secrets or email services are missing. This is safe-by-default, not a broken deployment.

## Updating later

The Deploy to Cloudflare wizard creates a new repo containing the application, configured with the D1 database ID. Future commits to that **new repository** will deploy automatically. The original repository still has the source template; changes there do not automatically synchronize with the copied deployment.

Existing Netlify and Google TEST demonstration systems can remain available until the native platform has been fully accepted.
