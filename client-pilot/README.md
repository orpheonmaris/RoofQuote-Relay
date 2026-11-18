# RoofQuote Relay — client pilot engine 1.0

**Purpose.** A narrowly scoped, deployable operational system for an independent roofing company that wants to capture website estimate inquiries, acknowledge receipt, alert the appropriate employee, track staff handling, send *internal* overdue reminders, and report recorded outcomes. It is **not** the RoofQuote Relay marketing website and is **not** a lead-generation system.

## What is included

| Module | What it does | Boundary |
|---|---|---|
| Client-owned Google Form | Records an inbound non-emergency roofing request | Initially one form/source; existing CRM or telephone integration is a separate project |
| Client-owned Google Sheet | `Dashboard`, `Leads`, `Events`, `Suppressions` | Private to client-approved staff; spreadsheet edits require careful access control |
| Automatic receipt | Sends one factual email to homeowner once the client explicitly goes live | TEST mode sends *only to the configured owner*; no appointment is promised |
| Immediate owner alert | Sends details of a new inquiry to the monitored owner mailbox | Mail delivery is attempted, not guaranteed; uncertain send outcomes are flagged |
| 15-minute operations trigger | Recovers missed form-trigger events and checks overdue statuses | Trigger scheduling is approximate; not real-time emergency dispatch |
| Internal reminders | One owner reminder after 45 minutes marked New, second after another 120 minutes | No automatic reminders are sent to homeowners |
| Staff status updates | Dropdown: New, Contacted, Booked, Closed - Won, Closed - Lost, Do not contact | Staff must actually update statuses, including after phone calls |
| Weekly digest + daily health check | Reports observed requests and operational errors | No claim of new revenue, automatic booking or verified phone contact |
| Privacy and suppression | Tracks hashed Do-not-contact addresses, prevents automatic repeat acknowledgements, includes manual anonymization | Source Google Forms and email records need a separate retention/deletion policy |

## Source tree

- [`apps-script/Code.gs`](apps-script/Code.gs): single copy/paste Google Apps Script file for a **client-owned** deployment.
- [`apps-script/appsscript.json`](apps-script/appsscript.json): optional timezone/runtime manifest; set timezone to the client’s locale.
- [`tests/client-pilot.test.cjs`](tests/client-pilot.test.cjs): Google-service mocks for behavior tests, run with Node.js.
- [`operations/INSTALLATION.md`](operations/INSTALLATION.md): installation and first fictional submission.
- [`operations/PILOT_ACCEPTANCE.md`](operations/PILOT_ACCEPTANCE.md): actual-account, client-signed readiness gates.
- [`operations/OPERATOR_PLAYBOOK.md`](operations/OPERATOR_PLAYBOOK.md): daily operation, pausing and triage.
- [`operations/DATA_HANDLING.md`](operations/DATA_HANDLING.md): privacy, limits, suppression, and deletion.
- [`operations/SERVICE_SCOPE.md`](operations/SERVICE_SCOPE.md): proposed pilot deliverables and commercial exclusions.
- [`operations/CLIENT_INTAKE.md`](operations/CLIENT_INTAKE.md): information to collect from the first real customer without putting it in GitHub.
- [`operations/QA_REPORT.md`](operations/QA_REPORT.md): 46 mocked tests, known limits and live acceptance requirements.

## Safety and deployment status

- The **source and mocked test harness are ready**. The template contains placeholders for real company identity, phone, and privacy policy. It has not been installed in a real roofing customer account.
- The engine starts in `TEST` mode. In `TEST`, both the simulated customer receipt and owner alert are sent **only to the configured business owner email**. Distribute the form URL only to authorized testers until after sign-off.
- Live homeowner messaging requires editing `clientApprovedLive: false` to `true` **after written permission**, and manually running `activateClientPilot()` as the client-account owner.
- It is not suitable for high-volume lead sources, emergency dispatch, financial/medical details, or customer data copied into a public GitHub repository.
- Do not confuse the business owner’s real Google Form with the RoofQuote Relay public marketing request form (`roofquote-relay.pages.dev`). The marketing form contacts RoofQuote Relay itself; the new Google Form collects homeowner requests **for the roofing company**.

## Testing

```bash
node tests/client-pilot.test.cjs
```

The local tests simulate Google Apps Script and Google services. A successful test **does not verify** real permissions, email delivery, Google Form publishing, quota behavior, reply handling, or data retention.

## Official service references

- [Apps Script installable trigger events](https://developers.google.com/apps-script/guides/triggers/events)
- [Apps Script time-driven triggers](https://developers.google.com/apps-script/guides/triggers/installable)
- [MailApp quotas](https://developers.google.com/apps-script/guides/services/quotas)
- [MailApp reference](https://developers.google.com/apps-script/reference/mail/mail-app)

**Commercial status:** no live pilot is claimed by this source package. A proposed $250 / 14-day pilot and $750/month follow-on are offers to validate, not guaranteed sales.
