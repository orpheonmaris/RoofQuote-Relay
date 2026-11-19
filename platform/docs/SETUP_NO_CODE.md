# RoofQuote Relay app — setup guide (no programming experience required)

This is a **separate Cloudflare Worker** next to your already-working Cloudflare Pages marketing site. Leave the existing Pages project in place. The application code is built; it still needs a database ID, authorized email domain and Cloudflare settings before it can be used live. **Do not invite homeowners before acceptance tests.**

## A. Create the database — owner action

1. Open https://dash.cloudflare.com/ and sign in to your Cloudflare account.
2. Open **Storage & Databases → D1 SQL Database → Create** (menu labels can vary).
3. Name it **`roofquote-relay-platform`**. Create it and copy the generated **Database ID** (a UUID).
4. Send the **Database ID only** to your ChatGPT conversation so the assistant can update `platform/wrangler.jsonc` in your connected GitHub repository. A D1 database ID is not a password. **Never paste an API token or signing secret in chat.**
5. Once the Worker is connected to your database, open that D1 database's **Console** and execute the schema from `platform/migrations/0001_schema.sql`. This creates the tables. Prefer using Wrangler `d1 migrations apply ... --remote` for subsequent changes; do not run arbitrary SQL from someone you do not trust.

## B. Create the separate Worker from GitHub

1. In Cloudflare select **Workers & Pages → Create application → Continue with GitHub**.
2. Choose the existing repository `orpheonmaris/RoofQuote-Relay` (not a new repository).
3. Set **Project/Worker name**: `roofquote-relay-app`.
4. Set **Root directory**: `platform` — this is necessary because the marketing website is in the same repository.
5. **Build command:** leave blank (no framework build required). **Deploy command:** `npx wrangler deploy`.
6. If Cloudflare permits a preview before environment configuration, keep the app private: without a database binding, the server returns a configuration error, not customer records.
7. When deployed you should get a Worker URL similar to `https://roofquote-relay-app.<account>.workers.dev`. The exact address must come from Cloudflare. Do not guess it.

The name of the Worker in Cloudflare must match `name` in `platform/wrangler.jsonc`. Keep the current Pages site separate.

## C. Set up sending email — owner action, after your domain is ready

1. Register and verify your custom domain first (for example, `roofquoterelay.com`, **only if you actually own it**).
2. Open https://resend.com/ and create an account you control. Add the domain under **Domains** and follow its DNS verification instructions. Do **not** attempt to send mail as a roofing company's domain unless that company authorized it and domain verification succeeds.
3. Create a restricted sending API key. Place the key in Cloudflare **Worker → Settings → Variables and Secrets** as **`RESEND_API_KEY`** and mark it **Secret**. Don't put it in GitHub, ChatGPT or browser JavaScript.
4. Set **`MAIL_FROM`** (plain text variable) to the real verified sender, e.g. `RoofQuote Relay <notifications@your-verified-domain.com>`.
5. Set **`OPERATOR_EMAIL`** to your actual monitored business inbox: `roofquoterelay@outlook.com`.

Email signing, staff login, owner alerting, homeowner acknowledgments and weekly reports all depend on verified outgoing mail. **Until this is configured, do not switch clients to this app.**

## D. Create Turnstile anti-spam protection — owner action

1. Cloudflare → **Turnstile → Add widget**, for the exact Worker hostname (and later the custom domain you control).
2. Save the widget's **public Site Key** as text variable **`TURNSTILE_SITE_KEY`**.
3. Save its **private Secret Key** as a **Cloudflare Secret** named **`TURNSTILE_SECRET`**. Never expose it in a webpage or public repository.
4. In the application, the browser produces a token; the Worker verifies it with Cloudflare before recording a homeowner inquiry. Without both settings, intake is disabled by design.

## E. Configure sign-in and final address — owner action

Under Cloudflare Worker **Settings → Variables and Secrets**:

| Name | Type | Value |
|---|---|---|
| `OPERATOR_EMAIL` | Text | `roofquoterelay@outlook.com` |
| `APP_ORIGIN` | Text | Exact HTTPS URL assigned by Cloudflare (later replace with custom app domain) |
| `MAIL_FROM` | Text | Verified sending email address from Step C |
| `SESSION_SECRET` | **Secret** | Cryptographically random 32+ byte secret; generate in password manager or with `openssl rand -hex 32` locally |
| `RESEND_API_KEY` | **Secret** | Restricted API key from Resend |
| `TURNSTILE_SITE_KEY` | Text | Cloudflare Turnstile public site key |
| `TURNSTILE_SECRET` | **Secret** | Cloudflare Turnstile secret key |

The D1 database is configured as a **D1 binding** named `DB`, not as a text secret. Do not mistakenly paste your database ID into the form as a credential.

After changing Workers' runtime secrets/settings, deploy/redeploy as needed, then visit `/healthz`. It should show a connected database and both mail/spam protection configured. Don't mistake this health check for an end-to-end production acceptance test.

## F. Open the private lead desk

1. Visit your Worker's URL + `/login`.
2. Enter `roofquoterelay@outlook.com` and click **Email me a sign-in link**.
3. Open the one-time email link (valid 10 minutes). The private dashboard opens.
4. Create a draft company workspace with business name, slug and the intended owner's email. Do not use a real homeowner's details for testing.
5. Before activation, click **Create fictional test inquiry**. The lead should show in the dashboard and CSV export; no homeowner email is sent.
6. Fill in real company phone and privacy URL (approved by the client), then have the **company owner** sign in and expressly approve activation using the displayed phrase. A business operator cannot activate a different company's messages unilaterally.

## G. Client acceptance before sending anything live

- Obtain written customer authorization for the one form, transactional email wording, reply-to identity, privacy notice, retention, who responds, and whom the owner will allow as staff.
- Check that homeowner confirmations are **sent from an actually verified address** and contain the company name, real office number and realistic next steps.
- Test with *fictional* data on an authorized test account. Confirm customer inquiry capture, owner alert, homeowner acknowledgment, reminders, staff statuses, CSV export, weekly summary and a simulated provider failure.
- Test unauthorized user access to another company's data; check logs, database permissions and web security settings.
- Verify correct owner access and the manual pause control. Only then enable the public form on the client's approved website.

## Domain switch later

After purchasing a domain, attach a subdomain like `app.roofquoterelay.com` to this Worker. Keep `roofquoterelay.com` for the marketing website. Update `APP_ORIGIN`, Turnstile allowed hostnames, email verification and all links only after HTTPS is confirmed.

## Costs and quotas

Cloudflare Workers and D1 have free allowances, but production usage, storage and emails can incur costs. Resend's free tier currently lists 3,000 emails/month with a 100/day limit. Auth links, owner notifications, acknowledgements and reminders **all count** toward that cap. Never promise uncapped traffic on a free tier.
