# RoofQuote Relay — operator-assisted onboarding SOP

**Status:** reusable process. No real paying customer or launch authorization is implied.

**Goal:** the roofing company never has to understand, write, configure, or debug code. RoofQuote Relay prepares the installation, guides Google authorization in the client's own account, verifies the complete TEST flow and hands over a simple private tracker.

**Links**
- Client questionnaire: https://roofquote-relay.pages.dev/pilot-start
- Operator installer generator: https://roofquote-relay.pages.dev/operator-installer
- Client guide: CLIENT_GUIDE.md
- Client approval record: LAUNCH_AUTHORIZATION.md
- Existing test/acceptance checklist: ../operations/PILOT_ACCEPTANCE.md

The installer page is **unlisted but not access-restricted**. It prepares company-specific code in the operator's browser without submitting the input fields to a server. No passwords, homeowner information, API keys, or payment credentials may be entered.

## A. Qualify and collect

1. Confirm that the company actually wants a **single-intake-source pilot**. Do not imply automatic integration into an existing CRM, website form, phone service, texting platform or booking system.
2. Ask the authorized representative to use the client questionnaire link above. Formspree sends the business-only submission to the RoofQuote Relay inbox; check both normal Inbox and Spam before deciding it failed.
3. Confirm legal/trade name, company phone, business website if available, monitored owner email, company-owned Google account, and a published privacy notice covering homeowner intake, Google services and email notifications.
4. Confirm who contacts homeowners and updates the tracker, whether a prior system already acknowledges new requests, expected inquiry volume, business hours and emergencies.
5. Agree on the proposed $250 / 14-day pilot (or negotiated alternative), payment, cancellations, scope, incident contact and data handling in a separate agreement. **An intake-form submission does not authorize live messaging or billing.**

**Stop** if there is no client-controlled Google account, no working phone/privacy notice, no named operator, unapproved duplicate acknowledgments, or a requirement for unsupported CRM/phone integrations.

## B. Prepare an installation without hand-editing code

1. Open the operator installer generator link.
2. Enter the company-approved business name, owner notification email, office phone, privacy notice URL and time zone.
3. Select **Prepare TEST-mode installer**.
4. Review the generated summary, then **Copy complete installer code** or **Download prepared Code.gs**.
5. Hold the generated file in a private client-specific channel, not public GitHub. Never reuse one customer's configuration for another.

The generator loads the generic source from the public template at public/onboarding/template.gs.txt. It hard-codes the TEST safety gate (clientApprovedLive: false). After changing the generic engine, refresh that template and rerun onboarding tests before preparing new client installs.

## C. Supervise the company's own Google installation

During a screen-share appointment, the client owner signs into their **own** Google account. RoofQuote Relay does not request a password, passkey, session cookie or verification code.

The client clicks only:
1. Open https://script.google.com/home/projects/create.
2. Name the project RoofQuote Relay — [Company].
3. Open Code.gs, select all its default text, and paste the entire preconfigured code supplied by RoofQuote Relay. No manual configuration is required.
4. Save, select **installClientPilot** in the function dropdown and click **Run once** (not Deploy).
5. Review Google's Sheets/Forms/email/trigger authorization requests and explicitly authorize if acceptable.
6. Copy CUSTOMER FORM and PRIVATE TRACKER links from the execution log into a private onboarding record. Select **rqrSystemStatus** and confirm mode TEST, zero missing triggers and adequate remaining mail quota.

**Why this must be the client's own account:** Google installable triggers run under the account that created them. The real sender of the acknowledgment is the authorizing Google account; a display name or reply-to address cannot impersonate another sender.

**Never rerun installClientPilot after an error without diagnosis.** Partial spreadsheets can remain. Follow the existing INSTALLATION.md, inspect permission failures and verify the real owner account before resuming.

## D. Live-account acceptance in TEST mode

Use fictitious people and an email you control; not genuine homeowner information.

- [ ] Client can access the private Sheet and only approved people are editors.
- [ ] Google Form displays the correct company name, real business phone, applicable privacy notice and non-emergency disclosure.
- [ ] A single fictional submission yields one row and one owner alert plus one clearly marked TEST acknowledgment, both received by the owner.
- [ ] Actual sending Gmail/Workspace identity and reply destination are correct.
- [ ] Changing New to Contacted records the timestamp and prevents future internal reminders.
- [ ] A separate New test lead generates at most two scheduled internal owner reminders; no homeowner reminder is sent.
- [ ] Weekly report reaches the owner and counts match Sheets.
- [ ] Pause → status PAUSED → Resume → status TEST works.
- [ ] System status shows no missing trigger, no unresolved unknown-send errors and usable mail quota.
- [ ] Spreadsheet and Apps Script time zones are correct.
- [ ] Client confirms support channel, deletion/retention approach, and who handles opt-outs.
- [ ] Any existing CRM autoresponder is disabled for this intake channel or duplicate-reply risk is resolved.

The owner's own Google-account test is mandatory. The successful vendor INTERNAL DEMO does not replace it.

## E. Require explicit live authorization

Before real homeowners can submit through the Google Form, complete LAUNCH_AUTHORIZATION.md together with the existing PILOT_ACCEPTANCE.md, plus a suitable signed service agreement.

1. Client authorizes exact transactional email wording, company identity, sender mailbox, privacy policy and handling of homeowner records.
2. Client confirms a human will contact new inquiries, monitor alerts and update statuses; automated reminders go to staff, never homeowners.
3. Vendor verifies all TEST checks and client-specific data permissions.
4. Only after sign-off does the implementation specialist change **clientApprovedLive: true** in the client's private Apps Script copy, with the client's knowledge. The account owner then explicitly runs **activateClientPilot**.
5. Confirm mode LIVE and only then publish/link/embed the company Form on one authorized intake source.

**No automatic LIVE activation from submitting an onboarding form or paying an invoice.**

## F. Handoff and 14-day closeout

Give the owner privately: Customer Form link, PRIVATE TRACKER link, approved editor list, actual sending mailbox, status instructions, support contact, pause/resume instructions, privacy/retention process and the agreed 14-day review date.

Use OWNER_HANDOFF.md as a plain-language quick-reference card. Weekly counts represent staff-entered statuses, not verified calls, confirmed revenue or newly generated leads. At day 14, get explicit consent for a separate ongoing agreement (proposed $750+/month), or follow the client's agreed pause/export/deletion process. No automatic renewal.

## Hard boundaries

Never publish client-specific installers, homeowner records, client credentials, OAuth tokens or Sheet/Form URLs to the public repository. Never bypass Google Workspace restrictions or claim the vendor owns the client's trigger identity. Do not promise emergency dispatch, phone answering, booked appointments, SMS, 24/7 monitoring or an unverified increase in jobs.
