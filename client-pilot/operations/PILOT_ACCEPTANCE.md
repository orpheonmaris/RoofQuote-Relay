# Client authorization and production acceptance checklist

This is an **unsigned template**. No client approval is implied.

## Confirm scope and authority

| Field | To be completed by customer owner |
|---|---|
| Legal business name | |
| Contact / authorized signatory | |
| Business phone | |
| Monitored owner email and actual sending Google account | |
| Published privacy notice URL | |
| Google Form link (only after test) | |
| Private tracker link, editors, and account recovery owner | |
| Covered source | One new client-owned Google Form; other integrations separately scoped |
| Pilot start/end | 14-day pilot window after live approval |
| Fee / billing terms | Proposed $250 pilot; no automatic continuation |
| External messages approved by | |
| Retention and incident notice policy approved by | |

## Acceptance gates (every row must be verified in the client's real account)

- [ ] **G0 Identity & permissions:** Correct client owns Google Form, Sheet, Apps Script and mailbox; staff permissions least-privilege.
- [ ] **G1 TEST-mode installation:** `installClientPilot()` executed once; no current homeowner records used.
- [ ] **G2 Trigger health:** Five handlers present; no exception in Apps Script's Executions history.
- [ ] **G3 Submission capture:** One fictional Google Form response yields exactly one `Leads` row; an event replay doesn't duplicate.
- [ ] **G4 Owner alert:** One real test owner email received; actual sender/reply destination verified.
- [ ] **G5 Homeowner receipt:** Test copy correct; in TEST, sent only to owner; no guarantees of booking or emergency dispatch.
- [ ] **G6 Status & reminder:** Staff changes `New` to `Contacted`, timestamps appear and future internal reminders stop; delayed New sample generates one owner reminder at/after threshold.
- [ ] **G7 Suppression:** `Do not contact` suppresses repeat automatic receipt for the address while owner still sees new inquiry.
- [ ] **G8 Recovery:** Simulated missed trigger/paused mode leaves response recoverable in Google Forms and detectable after `runOperations()`.
- [ ] **G9 Quota/error handling:** MailApp quota and error states evaluated; staff know how to handle `UNKNOWN_REVIEW` without blind retries.
- [ ] **G10 Privacy:** Google Forms/Sheets/email storage, access, retention, deletion, and subcontractor disclosure approved. No homeowners' confidential material placed in public GitHub/marketing form.
- [ ] **G11 Customer-facing form:** Form embedded/shared only by company owner; emergency phone, privacy link, and no-booking disclosure reviewed.
- [ ] **G12 Live activation:** Authorized representative signed below; then `clientApprovedLive: true` and `activateClientPilot()` run manually by account owner.

**Client approval signature:** ______________________

**Date:** ______________________

**Approved live mode/account owner:** ______________________

## Day-14 review

- Number of inbound requests and actual handled statuses from tracker: __________
- Failures requiring operator intervention: __________
- Time investment or missed inquiries identified by client: __________
- Client wishes to continue? Yes / No / Needs changes
- Separate recurring service agreement signed? Yes / No

The pilot demonstrates operational tracking, **not** the causal value of a booked roofing job. No client is automatically billed after the pilot.
