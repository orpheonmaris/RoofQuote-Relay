# Client service acceptance checklist (not yet signed)

- [ ] Separate Worker deployed from `platform/` without replacing the sales site.
- [ ] D1 migration successfully created all tables.
- [ ] Verified sender domain and transactional email provider configured.
- [ ] Turnstile public form challenge generated and independently validated server-side.
- [ ] Authorized operator logs in using a real one-time email link.
- [ ] Company owner signs in and can access only its own company's data.
- [ ] Staff cannot read another company's leads (negative test).
- [ ] Draft workspace creates fictional test lead without customer messaging.
- [ ] Company owner signs scope and privacy/retention terms.
- [ ] Owner enables LIVE explicitly and publishes one authorized form source.
- [ ] One fictional public form creates exactly one lead; repeat submission key does not duplicate.
- [ ] Real transactional acknowledgment reaches the designated test mailbox.
- [ ] Owner notification reaches the verified owner mailbox and leads link opens.
- [ ] Status change prevents reminders and records first-contact timestamp.
- [ ] Two overdue internal reminders are attempted on the configured schedule; no third reminder.
- [ ] Weekly report matches database statuses.
- [ ] Error/uncertain message is visible in the exception list and never blindly resent.
- [ ] Pause stops fresh intake while keeping dashboard available.
- [ ] CSV export, data deletion, unsubscribe/suppression and retention policy reviewed.
- [ ] Domain, SSL, emergency contact, and staff access reviewed by actual company owner.

**Approval**: company owner ___________________ Date ___________  Operator ___________________

No charge, activation or customer record transfer is implied by this unsigned template.
