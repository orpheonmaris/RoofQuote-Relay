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

Formspree's project-level **Restrict to Domain** setting, if used, should allow `roofquoterelay.com` (and `roofquote-relay.pages.dev` only while using the old hostname for tests). Confirm `roofquoterelay@outlook.com` is verified as the recipient. Do not disable spam filtering simply to get internal tests through.

The former `functions/api/contact.js` relay was removed. The Cloudflare `FORM_ENDPOINT` environment variable is now unused and may be deleted from project settings; never store form API keys in website code.

## Before retiring the old domains

1. Submit one legitimate, clearly identified internal test from `https://roofquoterelay.com/`.
2. Confirm it appears in Formspree's normal **Inbox**, not only Spam.
3. Confirm that a notification arrives in `roofquoterelay@outlook.com`.
4. Leave the old Netlify site up only if needed as a verified fallback; configure an intentional redirect after confirming the new domain and email notifications.

No client financial information, homeowner data, or credentials should be committed to this repository.

## Search and social preview metadata

The live canonical hostname is `https://roofquoterelay.com`. Homepage and privacy canonical URLs, Open Graph and Twitter preview image links, Schema.org JSON-LD, `robots.txt`, and `sitemap.xml` use the verified custom domain. The standalone `/thank-you` page is marked `noindex` and has no canonical link. The social preview image is `public/social-preview.png` (1200 × 630 pixels).

**Domain confirmed:** `https://roofquoterelay.com/` serves the production website. Metadata now points to it. Check `www.roofquoterelay.com` and make it redirect (301) to the apex through Cloudflare if desired; the apex is the canonical. Consider redirecting `roofquote-relay.pages.dev` and the legacy Netlify domain to the new domain to reduce duplicate access. Keep the Formspree domain restriction aligned with the apex domain and re-test form notification delivery after the migration.
