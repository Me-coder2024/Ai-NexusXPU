# Security review — 24 September 2026

This is a focused application review, not a penetration-test certification or a guarantee against compromise.

## Verified

- The production Supabase publishable key was denied read access to all 19 application tables (HTTP 401). No private record contents were requested or returned.
- A non-mutating probe of `mutate_record` with an unsupported table name was denied to the publishable key (permission error 42501). SQL grants in the migration revoke public access to privileged functions.
- Supabase server keys are isolated in `server-only` database code. No Supabase secret-key values were found in compiled browser JavaScript or tracked source. `.env.local` is ignored and has not been tracked in repository history.
- Production dependency audit: zero known vulnerabilities at review time.
- Firebase verifies signed ID tokens, expiry, issuer/audience through the Admin SDK, verified email, and Google sign-in provider. Roles come from Supabase, not submitted form fields or browser-selected roles.
- Student queries are scoped to the account, assigned batch, or membership as appropriate. Administrative mutations check server-side role/module permissions. Disabled users cannot obtain portal access.
- API input is validated with Zod; database values are passed through Supabase queries/RPC parameters. The administrative RPC uses a table allowlist and quoted identifiers; raw applicant text is not concatenated into SQL.
- Rendering uses React text escaping; no raw HTML rendering or eval was found in application source.

## Changes in this update

- Streamed request-body size limits and explicit JSON validation for application, login, registration, and portal writes. Malformed/oversized requests return controlled 400/413 responses.
- Removed internal Firebase/database exception details from public responses.
- Added explicit API `no-store` headers and a limited CSP covering frames, base URLs, objects, and form destinations. This is not a strict script CSP.
- Public application submission now saves the application only. Account/profile provisioning moves to the first successful Google sign-in. Matching personal-email applicants retain their existing portal journey; verified university emails retain direct student registration. Existing accounts and role assignments are unchanged. All newly provisioned accounts receive only STUDENT.
- Official Instagram/WhatsApp links use `noopener noreferrer` and appear on the application page, confirmation, dashboard overview, and applications view.

## Data-flow checks

- University-email test application: saved and confirmed in Supabase.
- First-year personal-email test application: saved and confirmed in Supabase.
- Temporary test records were removed; existing records and schema were not changed.
- Type checking, production build, validation tests, API rejection tests, and mobile link checks passed. Local database tests cover atomic capacity, duplicate registration prevention, audit transactions, and public permission denial.
- Interactive Google sign-in as a real user was not automated during this review. Firebase token verification and existing account login flow remain in place.

## Remaining actions and limits

- Rotate the Supabase secret previously shared in chat through the Supabase dashboard, then update only server-side Vercel/local environment variables. Do not put it in a `NEXT_PUBLIC_*` variable. Rotation was not performed by this review.
- Add durable rate limiting / bot protection (for example through Vercel Firewall and a verified CAPTCHA integration). Request-size limits do not stop distributed spam or denial-of-service attacks.
- Configure Firebase service-account credentials if immediate revoked-token checks are required. Without them, cryptographically valid tokens remain usable until expiry (at most one hour); database account disabling and role changes are checked on each request.
- Public applications cannot prove ownership of an enrollment number. Ownership verification or staff review is needed to prevent malicious duplicate applications blocking a legitimate applicant.
- Review all multi-role combinations with real test accounts, use least-privilege staff permissions, and enable MFA on the Supabase, Firebase, GitHub, and Vercel owner accounts. Backup/restore, infrastructure configuration, and account-level security were not assessed here.

The Supabase project URL and publishable key are public identifiers. Private data protection comes from database grants/RLS and the authenticated server, not from hiding that URL. See [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys) and [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security).
