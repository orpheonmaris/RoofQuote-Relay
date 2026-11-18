# Client Pilot Engine 1.0 — QA report

## Automated verification

- **46/46 mocked behavior tests passed** with Node.js (see `tests/client-pilot.test.cjs`).
- Source syntax parses in Node.js as modern JavaScript (the `.gs` file is source-compatible JavaScript with Google global APIs).
- Tests run without any live Google account, email sending, or homeowner information.

### Coverage includes

1. Installer configuration guards and creation of the client-owned Form, Sheet, Dashboard, Events, suppression storage, and five triggers.
2. Immediate owner notification and homeowner acknowledgment routing in TEST versus LIVE mode.
3. Deduplication of repeated Form response IDs and recovery of missed trigger events.
4. Graceful handling of a corrupt response without blocking later valid responses.
5. Stale requests not being automatically acknowledged after prolonged interruption; no duplicate first-time owner reminder upon late recovery.
6. Staff status timestamping, stopping reminders when records cease to be New, and no homeowner follow-up engine.
7. Timing: 45-minute first internal reminder, at least 120 minutes before a second, maximum two attempts per lead.
8. Daily intake cap and MailApp failures preserving an auditable row for manual review, with no blind retransmission after an unknown outcome.
9. Salted-email-hash Do-not-contact suppression and formula-injection escaping for spreadsheet fields.
10. Weekly report, health check, missing-trigger repair, manual retention operation, pause/resume, and written-approval go-live gate.

## What is NOT proven

- Real Google Apps Script OAuth authorization, trigger dispatch, Google Forms responder permissions, publication/embedding, actual MailApp sending and receiving, or client mailbox identity.
- Real Google quota behavior, whether Google classified a message as spam, or a client team's response times.
- Contractual, state privacy-law, insurance, and operational compliance.
- A signed customer contract, paying pilot, booked roofing job, or measured ROI.

The installation cannot be called **production-validated** until the client-specific acceptance gates in `PILOT_ACCEPTANCE.md` have all passed in an authorized customer-owned Google account.

## Technical choices and limitations

- **Single-tenant:** one separate Apps Script project, Form, Sheet and mailbox per roofing client. No shared multi-client homeowner database.
- **Account-owned:** Google permissions are issued by the customer account holder; vendor cannot automate sign-in/consent away.
- **No webhook:** homeowner data originates from Google Forms; integrating an existing site/CRM requires a separate scoped backend and tests.
- **No automating homeowner reminders:** phone calls and unrelated mailbox replies are invisible; default only sends one requested transactional receipt, then staff reminders internally.
- **At most once per attempted email:** records a state before sending, prevents blind automatic duplicate sends, surfaces unknown outcomes for manual investigation. Tradeoff: a failed attempt may not be retried automatically.
- **Trigger recovery:** a 15-minute scan detects missed Form response events (up to the configured window), not immediate guaranteed SLA delivery.
- **Manual privacy cleanup:** tracker can be anonymized, but original Form responses, emails, and backups still require separate management.

## Evidence record

Local tests captured in `tests/last-test-run.txt` during the build; the reproducible test file is included so any developer can rerun it. The code and documentation have no client-specific keys or homeowner records.
