# RoofQuote Relay

Static promotional website for the independent RoofQuote Relay pilot service.

This repository is structured for **Cloudflare Pages Git integration**, using the original website files (v4) as its source. No framework or package installation is required.

- **`public/`**: HTML, CSS, JavaScript, icons, site preview image, `robots.txt` and static redirects.
- **`functions/api/contact.js`**: Cloudflare Pages server-side form handler. Uses the `FORM_ENDPOINT` environment variable to forward validated business inquiries to Formspree; fails visibly and safely if not configured.
- **`CLOUDFLARE_SETUP.md`**: Step-by-step hosting, form, domain and email migration instructions.

## Deployment settings

- Platform: Cloudflare **Pages** via GitHub (not Direct Upload)
- Framework preset: **None**
- Production branch: `main`
- Build command: leave blank (or `exit 0` if the dashboard requires a command)
- Build output directory: `public`
- Root directory: default / repository root

The Cloudflare preview is not a complete replacement for your original Netlify site until `FORM_ENDPOINT` is configured and a real test submission reaches the business inbox.

> This repository deliberately contains **no payment credentials, API keys, homeowner records, or customer data**.

## Troubleshooting: Contact form configuration

If the form POST to `/api/contact` shows **“Our online request form is temporarily unavailable”**, the running Cloudflare Pages Function did not receive a valid `FORM_ENDPOINT` binding. In the Pages project, confirm `Settings → Variables and Secrets` has an exact `FORM_ENDPOINT` text variable set to the full Formspree URL for **Production**, save it, then deploy a new production build. On a successful upstream submission the function redirects to `/thank-you`; if Formspree rejects a request it instead shows a separate temporary-error page. Do not enter any Formspree API keys into public website code.
