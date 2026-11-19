# RoofQuote Relay: Cloudflare Pages operating guide

## Deployment

- GitHub: `orpheonmaris/RoofQuote-Relay`, production branch `main`
- Cloudflare Pages project: `roofquote-relay`
- Build: framework **None**, output `public`, build command `exit 0` or leave blank
- Primary website: https://roofquoterelay.com/
- Previous Pages hostname: https://roofquote-relay.pages.dev/ (deprecated canonical)

Commit approved website changes to GitHub's `main` branch; Cloudflare Pages deploys them automatically.

## Contact system

The website posts directly from the browser to `https://formspree.io/f/mvkaalrp`.

- Formspree project: **RoofQuote Relay — Demo Requests**
- Notification email: `roofquoterelay@outlook.com`
- If enabled, **Restrict to Domain** is configured at the **Formspree Project Settings**, with `roofquoterelay.com` (no protocol). Include the prior `roofquote-relay.pages.dev` hostname only if you still intend to test the old address.
- The Cloudflare site uses `Referrer-Policy: strict-origin-when-cross-origin`, allowing the true domain origin to be provided to Formspree.
- The old server-side Cloudflare relay has been removed. Cloudflare's `FORM_ENDPOINT` project variable is obsolete and can be removed; it no longer affects the website.

### Delivery verification

1. Submit a single, accurately labeled internal test on the canonical `roofquoterelay.com` homepage (not a numbered deployment preview). Use an address you control.
2. Verify that Formspree classified it in **Inbox** rather than Spam.
3. Verify that Formspree emailed `roofquoterelay@outlook.com`. Spam-classified submissions can be delivered upstream without generating notifications.
4. If submissions still go to Spam, inspect Project Settings, form-specific spam filtering, and any Formspree support feedback. Do not assume an HTTP 200 response proves inbox delivery.

The form shows a loading message, disables repeated clicks, handles rate limits, and redirects to the branded thank-you page for an upstream successful response. If scripts are disabled, standard browser form submission uses Formspree's hosted confirmation.

## Privacy and security

The browser submits contact information directly to Formspree, not through a Cloudflare proxy. Review Formspree account privacy, retention, and inbox permissions. The public form ID is not a secret. Don't store API keys, credentials, or customer data in GitHub.

## Domain migration (verified)

The `roofquoterelay.com` HTTPS site is verified and the canonical, OG/Twitter/JSON-LD, sitemap and robots references have been updated to it. Before retiring other domains, test one legitimate submission and Formspree notification **from the custom domain**; allow this hostname in Formspree Project Settings if restrictions are enabled. The `www` subdomain was not confirmed and may need an account-level Cloudflare redirect. Redirect the old Netlify domain and `pages.dev` hostname after verification to prevent duplicates.
