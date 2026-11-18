# Data-handling and risk boundaries

The roofing company controls its own Google account, Form responses, Sheets tracker and business email. The vendor should receive only the scoped, authorized access required to set up or maintain the workflow. The public RoofQuote Relay GitHub repository must never contain homeowners' personal details or client credentials.

## Data collected

The Form asks for name, email, optional phone, property ZIP, roofing service type, and optional brief description. Do not request full property street addresses, social security numbers, payment card details, insurance account numbers, or project photos as part of this pilot. The client must publish an appropriate privacy notice and review the question wording before live use.

## Purposes and communications

- A homeowner voluntarily submits an estimate request to a roofing company.
- The system attempts one transactional acknowledgment explaining that the request was received and no appointment is confirmed.
- A monitored staff mailbox receives the lead and can receive up to two **internal** overdue reminders.
- There is no automatic homeowner marketing, auto-booking, calling, SMS or unsupervised follow-up.
- Company staff must handle actual phone calls, emailed opt-outs, and statuses, and may pause processing.

## Storage, retention and deletion

- Raw responses are retained by **Google Forms**. A copy of necessary fields is stored in the private **Google Sheet**; alerts/acknowledgments may also persist in **email**. Google and the client's mailbox provider have their own controls.
- `anonymizeExpiredLeads()` can manually anonymize tracker rows older than the configured retention period, but it **does not delete the Form's source responses, Google email history, or backups**. Do not claim this function accomplishes complete deletion.
- A written retention and erasure procedure must cover **all** stores, including the original Form, Sheet, customer and owner mailboxes, exports, and provider backups where applicable.
- The `Suppressions` tab stores a **salted SHA-256 hash of email**, not the raw address. It is used solely to avoid future automatic receipts after a Do-not-contact status and will persist until the client resolves that suppression policy. A hash is pseudonymous, not automatically anonymous.

## What to do on failures

An email marked `SENT` means MailApp accepted the request, not that the intended recipient opened or received it. `UNKNOWN_REVIEW` means the call had an ambiguous outcome; do **not** auto-retry. `NEEDS_REVIEW_CAP` means volume throttling prevented automated messaging even though the Google Form retained the original request. If an emergency is described, the customer must call the roofer; the service is not emergency dispatch.

## Access and security

- Only approved staff should edit the tracker and script, and the Google account must have multifactor authentication.
- The script intentionally exposes no public webhook endpoint, no API secret, and no administrative web endpoint.
- Avoid giving business owners the public marketing Formspree dashboard as a place to store their homeowners' data. Client data stays under the company's approved systems.
- Keep company-specific identity and contact settings in the client's separate Apps Script project, not the public source repository.
- Check Google Apps Script execution scopes, quotas, trigger creator, response-editor permissions, Form sharing rules and current Workspace policy before launch.

This is a technical data-flow design, not a guarantee of legal compliance. A client's legal/data-protection advisor should approve privacy notices, retention, customer communications and any applicable state or industry-specific obligations.
