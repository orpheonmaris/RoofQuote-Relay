# RoofQuote Relay — your daily quick guide

**Keep this page with the two links provided privately after your installation.**

**Your customer form:** ____________________________________________

**Your private lead tracker:** _____________________________________

**Your office phone:** ____________________________________________

**Your monitored email:** ________________________________________

**RoofQuote Relay support:** roofquoterelay@outlook.com

## When someone requests a roofing estimate

1. You get an email alert. Open the private **Leads** Google Sheet and find the newest row.
2. Acknowledge the work as a real person: call or email the homeowner as your business normally would. The automatic receipt only says the request arrived.
3. Change **Staff status** from **New** to **Contacted** when you have actually made contact or completed the relevant outreach (use the definition agreed for your pilot).
4. Choose **Booked** only when the customer has actually agreed to an appointment. The system does not book one.
5. If the homeowner asks you to stop contacting them, set **Do not contact** and honor the request in your other channels too.
6. Review any rows still marked **New**. A maximum of two automatic staff reminders may arrive while a row remains New; they are reminders to your team, not messages to the homeowner.

## Where to look

| Google Sheet tab | What it means |
|---|---|
| **Leads** | Actual submitted inquiry details and editable Staff status |
| **Dashboard** | Current counts by recorded status (not proof of completed sales) |
| **Events** | Operational activity and diagnostic notes |
| **Suppressions** | Hashed opt-out records; do not manually edit unless instructed |

## If something goes wrong

**The next step is always a person, not repeated automatic sending.**

- **No email alert or missing row:** Check the source Google Form's Responses, the Sheet and your spam folder. Tell RoofQuote Relay support what happened. Do not submit real customer details repeatedly for testing.
- **UNKNOWN_REVIEW / NEEDS_REVIEW_CAP / STALE_REVIEW:** Ask support to investigate; a message may already have been sent. Do not click a retry repeatedly.
- **Emergency leak or safety hazard:** Direct the caller to the real company's office/emergency number. RoofQuote Relay is not emergency dispatch.
- **Need to stop automatic processing:** Contact your designated account operator to run **pauseClientPilot** from the client-owned Google Apps Script project. The Google Form can still receive original responses while processing is paused; do not leave it publicly advertised unattended.
- **Need to restart:** After reviewing any missing requests, the designated Google account owner can run **resumeClientPilot**. If the previous mode was LIVE, the previously approved configuration must still be valid.

## What the weekly report can and cannot tell you

It counts inquiry rows and the statuses your people entered. It does not verify that a call was actually completed, that a job was won, or that the automation caused more revenue.

## Your pilot and account ownership

- Pilot period: __________________ to __________________.
- Pilot scope and fee: __________________________________.
- There is **no automatic subscription** at the end of the 14-day pilot unless a separate ongoing agreement is signed.
- You own the company Google Form, Sheet, Apps Script and Google account. RoofQuote Relay must not retain your password or claim that its staff independently control your data.
- Please keep the list of people with Google Sheet editing access current. Contact support about exporting or deleting data when the pilot ends.

**Owner confirmation:** I know which inbox gets alerts, where to see leads, who contacts homeowners, and how to ask for help. Initials: ______ Date: ______
