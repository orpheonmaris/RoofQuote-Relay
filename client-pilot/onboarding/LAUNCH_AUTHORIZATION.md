# RoofQuote Relay — client go-live authorization

**Private client agreement record — template only.** A completed questionnaire, paid invoice, or installation in TEST mode is **not** permission to begin emailing homeowners. Use this form together with a signed service agreement and the technical PILOT_ACCEPTANCE checklist. Do not store completed client forms or homeowner information in the public GitHub repository.

## 1. Company identity and accountable people

| Item | Client-approved value |
|---|---|
| Legal/trade business name | |
| Company website | |
| Authorized company representative and title | |
| Contact email and monitored inbox | |
| Business office and emergency phone | |
| Google account that owns the installation | |
| Actual Google account shown as outbound email sender | |
| Published privacy policy URL | |
| Appointed employee responsible for calling customers | |
| Person monitoring the owner alerts | |
| Emergency and failed-automation contact | |
| Pilot start and end dates | |
| Exact scope and agreed pilot fee (proposed $250 / 14 days) | |
| Billing/invoice terms and refund/cancellation agreement | |

## 2. Approved single-source workflow

**Authorized intake location** (client-owned Google Form URL and approved website page where linked/embedded):

_____________________________________________________________________

**Current website/CRM autoresponders reviewed:** Yes / No / Not applicable

**Decision about duplicates** (if another system sends confirmation):

_____________________________________________________________________

The client understands the pilot covers a newly created, company-owned Google Form and a private Sheets lead tracker. Integrating an existing website form or CRM requires separate technical assessment and authorization. The vendor does not generate leads or monitor incoming phone calls, appointments, or existing email replies automatically.

## 3. Client-confirmed homeowner communications

- [ ] The company has reviewed the **exact current acknowledgment email** shown in a TEST message and approves its text for this company.
- [ ] The company has checked the **actual sender address** (the Google account that owns the triggers). A configured display name or reply-to does not impersonate an arbitrary mailbox.
- [ ] The company authorizes one factual transactional receipt for a voluntary new Form submission; no unsolicited marketing or automatic homeowner follow-up.
- [ ] The company has verified its business identity, office phone, response contact, privacy notice and escalation path.
- [ ] The company understands acknowledgment does **not** mean an inspection or appointment is booked. Human staff must arrange and confirm one.
- [ ] The company approves up to two **internal owner/staff** reminders for items still marked New, with no automatic homeowner reminders.
- [ ] A responsible staff member will monitor alerts, contact customers promptly, change statuses accurately, and honor opt-outs.
- [ ] The company has established any applicable notice/consent, communications, and record-retention requirements.

## 4. Google account, privacy and system limitations

- [ ] The company controls the Google account, Form, private Sheet, mail sending identity and any related Workspace subscription.
- [ ] Google Forms/Sheets/mail permissions and access lists have been reviewed; only authorized people may view customer data.
- [ ] The company agrees on retention, deletion/export and opt-out handling for the original Form responses, Sheet, emails, exports and backups.
- [ ] The company accepts Google Apps Script quotas, non-guaranteed email delivery, approximate trigger timing, and manual handling of unknown-send errors.
- [ ] The company has tested and understands pause/resume procedures, daily error review and how to reach support.
- [ ] The company understands this is **not** emergency dispatch, telephone answering, customer scheduling, SMS, voice AI or a guaranteed lead-conversion improvement.

## 5. Test-mode acceptance before activation

Record date/time and owner initials beside every result.

| Gate | Verified by / date |
|---|---|
| Company-owned Google account created its own five triggers | |
| System reports TEST and zero missing triggers | |
| Fictional form response created exactly one Lead row | |
| Owner received one actual alert and one TEST-only receipt | |
| Sender identity and reply-to verified | |
| Staff status change and timestamp worked | |
| Internal reminder sent; stops after status change | |
| Weekly report, health check and mail quota checked | |
| Pause and resume safely returned to TEST | |
| Form, lead tracker and privacy responsibilities reviewed | |
| Unresolved processing or email concerns: NONE | |

**Technical issues that remain open (must be resolved before launch):**

_____________________________________________________________________

## 6. Explicit approval

By signing, the authorized company representative approves **this specific, tested, company-owned installation** for the limited single-source workflow and customer-facing copy described above. This authorization does not permit additional integrations, unsolicited email, marketing messages, SMS, phone bots, or unreviewed code changes.

**Client authorized representative:** ________________________________

**Title:** ____________________   **Date:** ____________________

**RoofQuote Relay implementation operator:** ________________________

**Date:** ____________________

**LIVE-activation record** (filled in only after signature and technical verification):

- Approved company-specific script update by: ______________________
- Company account owner who ran activateClientPilot: _________________
- Timestamp / timezone: ______________________
- rqrSystemStatus result: LIVE / Not activated
- Public client-owned Google Form link verified: Yes / No
- Human owner monitor confirmed: Yes / No

**Important:** The questionnaire at /pilot-start is not this agreement. The private installation remains in TEST mode until the company owner deliberately authorizes LIVE after the above gates.
