# Upload RoofQuote Relay to GitHub and deploy to Cloudflare Pages

## 1 — Populate the repository

1. Open https://github.com/orpheonmaris/RoofQuote-Relay
2. If the repository is still empty, choose **uploading an existing file**. Otherwise select **Add file → Upload files**.
3. Extract the GitHub-ready ZIP. Drag **both folders `public` and `functions` plus the root files** (`README.md`, `.gitignore`, `CLOUDFLARE_SETUP.md`) into GitHub. Do not upload the ZIP itself.
4. Confirm the GitHub file list has `public/index.html` and `functions/api/contact.js` in those exact directories, then commit to `main`.
5. Set repo visibility to **Private** if you want restricted source access (Settings → General → Danger Zone → Change repository visibility); Cloudflare supports private GitHub repositories. Do not store API keys in the repository.

## 2 — Connect Cloudflare Pages to GitHub

1. Open https://dash.cloudflare.com/ → **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**.
2. Connect GitHub, allow access to `orpheonmaris/RoofQuote-Relay`, choose that repository.
3. Framework **None**, production branch `main`, **Build command blank** (or `exit 0`), **Build output directory `public`**, root directory default.
4. Deploy. The `pages.dev` preview will have the website and a Cloudflare Pages Function at `/api/contact`, but the form is not operational until the next section is completed.

## 3 — Activate the contact form (required before routing real traffic)

The previous form used Netlify Forms, which does not function on Cloudflare. This version uses a Cloudflare Pages Function to forward to Formspree and safely rejects unconfigured submissions.

1. Create a Formspree account at https://formspree.io/ and create a contact form. Configure notifications to **roofquoterelay@outlook.com**, complete any email verification, and copy its endpoint in the exact format `https://formspree.io/f/xxxxxxxx`.
2. Cloudflare Pages project → **Settings → Variables and Secrets** (may be labeled **Environment variables**). Set **`FORM_ENDPOINT`** to your Formspree form URL in **Production**; add it to Preview if you plan to test there.
3. Trigger a new deployment if required after adding the variable.
4. Visit the Cloudflare `pages.dev` site and submit **fictional test data** using an email address you control. Confirm you land on `/thank-you`, the submission appears in Formspree, and a notification arrives at `roofquoterelay@outlook.com`.
5. Try a blank required field and a second test to ensure validation and notification. If Formspree is disconnected, the handler shows an unavailable message with a mailto link instead of falsely claiming a successful form submission.

Formspree currently offers a Free tier with a limit of 50 submissions/month. More volume may require a paid tier.

## 4 — Domain and search settings

Keep your existing Netlify site up while testing Cloudflare. Do **not** disconnect Netlify Forms until the Cloudflare contact workflow is proven.

After purchasing a domain and switching the site to Cloudflare:
- Add both `roofquoterelay.com` and `www.roofquoterelay.com` under **Pages → Custom domains** and choose one canonical version.
- Update `rel=canonical`, `og:url`, `og:image`, Organization schema URLs, and `sitemap.xml` / `robots.txt` to the real domain; these currently reference the previous Netlify URL intentionally while migration is in progress.
- Configure a real branded email account separately; Cloudflare Email Routing alone only forwards incoming mail.
- Change DNS only after HTTPS, privacy, form deliverability and mobile layout are tested.
- Keep the previous Netlify site available until you're satisfied with the cutover.

## 5 — Updating the website

Edit files in GitHub and commit to `main` to trigger an automatic Cloudflare deployment. Before significant edits, create a branch or pull request to test previews without publishing to production.

For the static website, modify `public/index.html`, `public/styles.css`, `public/app.js`, or other assets. For form handling, modify `functions/api/contact.js`. Do not edit customer records into GitHub.
