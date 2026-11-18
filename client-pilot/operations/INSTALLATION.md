# Installation — one roofing client at a time

**Default customer experience:** company owners do not configure code themselves. Follow the [operator-assisted onboarding SOP](../onboarding/OPERATOR_RUNBOOK.md) and use the [local browser installer generator](https://roofquote-relay.pages.dev/operator-installer) to prepare their completed script. The owner still authorizes Google during a supervised account setup; this document remains the technical fallback and acceptance reference.

This checklist is for a **client-approved Google account**. It does not ask you to share passwords or private customer data with RoofQuote Relay or place credentials in GitHub. The account owner must complete Google account authorization, since these permissions cannot legitimately be bypassed by the vendor. The template explicitly creates a **published** Google Form for owner-controlled testing; do not distribute its URL publicly until the customer authorizes live intake.

## Prerequisites

- An actual roofing business has approved a limited test, a named operational owner, an office phone, and a published privacy notice that covers inquiry handling through Google Forms/Sheets and email.
- A monitored, client-controlled Google account can use Google Forms, Sheets, Apps Script, and MailApp. Check Workspace administrative restrictions and quotas. For consumer Gmail, Google currently documents a **100 recipient/day** Apps Script MailApp quota; a Workspace account typically has higher limits, but neither is a service-level guarantee.
- An authorized employee agrees to mark Leads rows with `Contacted`, `Booked`, `Closed - Won`, `Closed - Lost`, or `Do not contact` after a phone/email conversation. Automation cannot detect off-platform calls.
- A client representative signs the scope and data-processing approvals in `PILOT_ACCEPTANCE.md`.

## Create the first instance

1. Sign into the client's chosen Google account. Open https://script.google.com/home/projects/create to create a **standalone** Apps Script project titled `RoofQuote Relay — [Client name]`.
2. Replace the default `Code.gs` content with the contents of [`../apps-script/Code.gs`](../apps-script/Code.gs). **Do not paste live homeowner data** into the source file or a public code repository.
3. Edit only the `RQR_CONFIG` values near the top: replace `businessName`, `ownerEmail`, `officePhone`, and `privacyUrl` with client-approved values. Confirm `timezone` and leave `clientApprovedLive: false`.
4. In Apps Script **Project Settings**, select the client's timezone (for Phoenix: `America/Phoenix`). You may also enable the manifest view and use the included `appsscript.json` after adjusting its timezone if necessary.
5. Save the script. Select the `installClientPilot` function from the function dropdown and click **Run**. Review Google's OAuth permissions carefully. Google may ask for verification steps because this is an Apps Script project accessing Sheets, Forms, triggers, and MailApp.
6. After the function completes, open **Executions / Logs**. You should see two links: `CUSTOMER FORM` (public only when intentionally distributed) and `PRIVATE TRACKER`. Record the links in the owner's private onboarding record.
7. Verify the tracker tabs: `Leads`, `Dashboard`, `Events`, `Suppressions`. Confirm the business owner controls access; add only authorized staff. Never publish the sheet to the web.
8. Call `rqrSystemStatus` from Apps Script; confirm `mode: TEST`, no missing triggers, and available MailApp recipients.

## Confirm that the customer form really works

1. **Only use fictional information** in TEST mode. Open the customer form as a test respondent and submit an example inspection inquiry. Use a safe email address you own, not a real homeowner's address.
2. Verify one new `Leads` row. Confirm it shows `Customer acknowledgment = SENT` and `Owner alert = SENT`. The actual received mail should show **two messages to the owner**: the owner alert plus an explicitly labeled test acknowledgment. A `SENT` flag means MailApp accepted the send, not that the recipient saw it.
3. Change the `Staff status` cell for that row to `Contacted`. Verify the timestamp `First staff status change at` is added. It is a timestamp of the *spreadsheet update*, not a magically observed phone call.
4. Submit a second fictional response and leave its status `New`. For a time-based reminder test, wait for the 45-minute threshold and the next scheduled run, or use carefully adjusted clock fixtures in the local mock tests. Confirm the owner receives a reminder; **no homeowner receives a reminder**.
5. Execute `runOperations` manually (within quota) to test recovery and reminder scanning. Re-running it should not duplicate an already accepted lead or initial acknowledgment.
6. Confirm `sendWeeklyReport` produces the correct status counts in a manual test. Check `dailyHealthCheck` and `Executions` for exceptions.
7. Set a test row to `Do not contact`. Confirm the `Suppressions` tab stores only a salted email hash, and a new fictional inquiry from that same address does not receive an acknowledgment. Staff can still see the new inquiry.

## Go-live gate

**Do not send the Google Form link to homeowners yet.** First obtain the client's written permission for: the actual email copy, company identity and sender address, retention policy, Google data access, anti-spam limits, use of the form on their site, and who updates statuses. Keep the signed record outside the GitHub repository.

When the client authorizes launch, change `clientApprovedLive` to `true`, save and deliberately run `activateClientPilot()` once from the client-owned Apps Script account. Confirm `rqrSystemStatus().mode` is `LIVE`. Then share or embed the customer form on exactly one client-approved website/source. Google Forms supports a share/embedding workflow; follow Google's current UI rather than guessing a hard-coded embed URL. Google changed Forms API publishing defaults during 2026; this script explicitly uses `FormApp.create(name, true)` to publish the form, and the account owner must verify responder permissions.

**Existing website forms or CRMs:** This pilot does not silently integrate with them. Use the client-owned Google Form as the one new intake channel first. A separate, authenticated, source-specific integration can be scoped after verifying the website and data-handling policy. Never post a private customer spreadsheet to the RoofQuote Relay marketing site.

## Interrupted first installation: spreadsheet permission or timezone

If Apps Script stops on `ss.setSpreadsheetTimeZone(RQR_CONFIG.timezone)` with
`You do not have permission to access the requested document`, the newly
created spreadsheet may already exist, but the installer did **not** reach its
installation-complete checkpoint.

1. In the exact Google account running Apps Script, open Drive and search for
   `RoofQuote Relay pilot`. If a partially created tracker exists, leave it
   private and do not share it with customers. Check whether you can open and
   edit it; a different account or incomplete Sheets authorization will also
   affect subsequent spreadsheet operations.
2. The current source version logs the new tracker ID and catches failure of
   the optional timezone-setting operation, rather than immediately aborting.
   **Changes in GitHub do not update any code previously pasted into Apps
   Script.** Re-copy the source or update only the two lines immediately after
   `SpreadsheetApp.create(...)` to match the current source.
3. Save and run `installClientPilot` only **once** after the edit; the
   installer may create a second, separate tracker because the earlier run
   failed before persisting its installation IDs. Do not delete existing
   sheets until you have checked whether they contain any real data.
4. If the next step still says `You do not have permission`, stop rerunning.
   Check the account shown in Google Apps Script and Google Sheets; confirm
   the script was granted full Sheets permissions. If an explicit
   `oauthScopes` list exists in the manifest, verify that it includes
   `https://www.googleapis.com/auth/spreadsheets` and the other scopes used
   by the project. Any changes to scopes require reauthorization.
5. **Before LIVE activation**, open the finished tracker, go to
   **File → Settings**, and verify the spreadsheet time zone is
   `America/Phoenix` (or the company's actual time zone). The Apps Script
   project time zone is a separate setting.

Do not repeatedly run the installer on unresolved permissions: it can create
additional private spreadsheets without producing a complete deployment.

## Troubleshooting

- **No tracker row:** Inspect Google Form's own Responses, Apps Script Executions and trigger permissions. `runOperations` can recover missed events. Do not resubmit real customer details repeatedly to test.
- **Tracker row but `UNKNOWN_REVIEW` email state:** Stop and check Google's sent mailbox, quotas, and execution history. Do **not** blindly retry; an ambiguous send can duplicate homeowner messages.
- **Wrong name/email/phone in tracker:** Ensure no Form questions were deleted/recreated after installation. The script maps item IDs, not titles. If fields were recreated, inspect `RQR_FORM_ITEMS` in Script Properties and reinstall only under a controlled migration plan.
- **No owner reminders:** Confirm the row is still `New`, 45 minutes have elapsed since both intake and first owner alert, and owner MailApp quota remains. Triggers are approximate, not instant.
- **Google blocks authorization or scripts:** Pause rollout and resolve Workspace policies with the client administrator. Do not use unauthorized external accounts as a workaround.
- **Recovery needed:** `repairClientTriggers()` recreates missing handlers without intentionally duplicating existing ones. If script properties or original Form/Sheet ownership are lost, an owner must plan a migration rather than reinstall blindly.

## Important warning about the email sender

MailApp sends through the account that runs the installable triggers. `name` sets a display name and `replyTo` sets the reply destination, but this is **not equivalent to sending from any arbitrary verified company address**. Check the real sender identity in a live test and avoid spoofing claims. The client's domain and mailbox must be configured separately if a branded sending address is required.
