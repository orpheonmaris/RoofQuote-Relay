# RoofQuote Relay

Public website source for RoofQuote Relay, deployed using **Cloudflare Pages** from the `main` branch of this GitHub repository.

## Files and hosting

- `public/`: website HTML, CSS, JavaScript, graphics, privacy notice, and SEO files.
- Cloudflare Pages: framework preset **None**, build command `exit 0` (or blank), build output `public`, root directory repository root.
- Any commit to `main` automatically triggers a new Pages production deployment.

## Business contact form

The contact form uses **Formspree's official form endpoint directly from the visitor's browser**:

`https://formspree.io/f/mvkaalrp`

The browser's real website origin is preserved for Formspree's domain filtering, instead of proxying submissions through a Cloudflare Worker. The form's JavaScript handles pending/error states and redirects to `/thank-you` after an HTTP success; without JavaScript, the native HTML POST works through Formspree's default confirmation. **An HTTP success does not guarantee inbox classification**: Formspree can still mark submissions as spam.

Formspree's project-level **Restrict to Domain** setting, if used, should allow `roofquote-relay.pages.dev`. Confirm `roofquoterelay@outlook.com` is verified as the recipient. Do not disable spam filtering simply to get internal tests through.

The former `functions/api/contact.js` relay was removed. The Cloudflare `FORM_ENDPOINT` environment variable is now unused and may be deleted from project settings; never store form API keys in website code.

## Before retiring Netlify

1. Submit one legitimate, clearly identified internal test from `https://roofquote-relay.pages.dev/`.
2. Confirm it appears in Formspree's normal **Inbox**, not only Spam.
3. Confirm that a notification arrives in `roofquoterelay@outlook.com`.
4. Keep the Netlify site active until the complete sequence is verified.

No client financial information, homeowner data, or credentials should be committed to this repository.
