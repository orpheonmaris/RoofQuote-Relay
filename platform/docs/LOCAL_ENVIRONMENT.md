# Local environment reference (NOT the live Cloudflare setup)

Do not place production credentials in this repository. Create a local `.dev.vars` file only on your own computer for local testing, or add secrets directly in Cloudflare Worker settings after deployment. Never commit the local file.

```dotenv
# Local only. Do NOT commit actual values.
OPERATOR_EMAIL=roofquoterelay@outlook.com
APP_ORIGIN=http://localhost:8787
SESSION_SECRET=REPLACE_WITH_32_PLUS_RANDOM_BYTES
RESEND_API_KEY=REPLACE_WITH_EMAIL_PROVIDER_API_KEY
MAIL_FROM=RoofQuote Relay <notifications@YOUR_VERIFIED_DOMAIN>
TURNSTILE_SITE_KEY=REPLACE_WITH_TURNSTILE_SITE_KEY
TURNSTILE_SECRET=REPLACE_WITH_TURNSTILE_SECRET
```

Deploy to Cloudflare intentionally **does not request these secrets at initial infrastructure provisioning**. Do not attempt real account login or homeowner intake until the production Worker has a verified email provider, secret values and Turnstile configured.
