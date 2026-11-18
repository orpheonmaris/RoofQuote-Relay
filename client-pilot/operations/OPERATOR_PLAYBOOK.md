# Roofing office operator's playbook

## What to look at each morning

Open the **private tracker** (Google Sheets). The `Dashboard` tab shows counts based on the `Leads` tab; it is not a financial or sales-attribution dashboard.

Check the `Leads` tab for:

- Status **New**: a person needs to contact the customer. Check phone/email and set `Contacted` after actual contact.
- Status **Contacted**: staff has taken an action; update to `Booked` only after a real appointment is agreed.
- Status **Booked**: appointment recorded by staff; the system does not create a calendar reservation.
- **Closed - Won** / **Closed - Lost**: optional downstream office classification; not verified revenue.
- **Do not contact**: triggers future suppression for that email address; never change it casually.

Staff are responsible for seeing and responding to actual email replies and missed phone calls. The system has **no** ability to monitor the company's unrelated inboxes, phone line, scheduling calendar or job status automatically.

## When a customer submits a request

1. The Google Form retains the source response.
2. An Apps Script trigger stores an inquiry in `Leads` and sends the owner an alert.
3. In TEST mode the sample homeowner acknowledgment is sent to the owner instead. In LIVE mode a one-time receipt goes to the homeowner (unless suppressed, stale, or held for review).
4. The owner follows up personally. After 45 minutes without a status update, the system may send one internal reminder, then another no sooner than two hours after the previous reminder. The maximum is two attempts per lead.
5. Once the owner sets a non-New status, reminders stop. No automated email follow-up is sent to homeowners.

## Handling problems

- Any `UNKNOWN_REVIEW`, `NEEDS_REVIEW_CAP` or `STALE_REVIEW` flag requires a human to inspect the row and the corresponding form/email records.
- **Avoid retrying ambiguous sends**; a mail call may have succeeded before a timeout or error.
- Check **Apps Script → Executions** for trigger failures. `dailyHealthCheck` sends a once-per-signature daily warning if possible. Mail quota errors may also prevent error notification emails; inspect the sheet and execution history independently.
- For an active emergency or safety hazard: call the company directly. The intake form and service do not provide 24/7 dispatch or emergency response.
- If a staff member receives a stop/unsubscribe request: mark **Do not contact** on the relevant lead. That records a salted email suppression hash for future automatic acknowledgments. Avoid unsolicited outreach to that person by any other channel.

## Owner controls (run from Apps Script)

| Function | Purpose |
|---|---|
| `rqrSystemStatus()` | Displays mode, form URL, private tracker link, quota estimate, missing triggers |
| `pauseClientPilot()` | Stops script processing and automated messages, but Google Form submissions are still retained |
| `resumeClientPilot()` | Resumes TEST or previously approved LIVE mode; missed requests are recovered on the next scan |
| `repairClientTriggers()` | Restores missing triggers; never run installation a second time |
| `runOperations()` | Checks missed form events and owner reminders immediately (subject to eligibility) |
| `sendWeeklyReport()` | Sends a manual report for review |
| `dailyHealthCheck()` | Checks mail quota, trigger status, known errors and intake limits |
| `anonymizeExpiredLeads()` | **Manual** anonymization of eligible old tracker rows only; source Form responses and sent emails are not deleted |

## What the owner should receive weekly

A count of inquiries and their **current recorded** statuses, the number of rows with unresolved errors, and a link to the tracker. The report does not assert how much revenue the system produced or how quickly a phone call actually took place.

## Pilot success measurement

Use a baseline from the company's existing intake records, then compare actual total inbound requests, timestamp of Google submission, when staff changed statuses, number of New items still unattended, actual owner judgment of time saved, and errors requiring manual intervention. Do not invent a sales-conversion increase.
