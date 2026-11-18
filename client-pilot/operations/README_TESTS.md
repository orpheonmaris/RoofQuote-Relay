# Testing notes

Run `node tests/client-pilot.test.cjs` from this folder's parent (or run the file directly). The local test harness simulates FormApp, SpreadsheetApp, PropertiesService, MailApp, LockService, ScriptApp and Utilities in Node.js and checks behavior including idempotency, correct recipient routing, 15-minute scan logic, status changes, quotas, error states, DNC suppression, and manual anonymization.

The tests do **not** make live Google API calls or send messages. They do **not** certify actual Google Form permissions, form integration/embedding, mail deliverability, or a client's privacy compliance. The separately signed `PILOT_ACCEPTANCE.md` controls live launch.
