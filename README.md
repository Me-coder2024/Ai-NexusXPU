# AI Nexus

A Next.js / TypeScript implementation of the AI Nexus university club website. The visual composition follows the supplied reference: deep-blue frame, cobalt grid, oversized white typography, lime doodles, floating glass cards, and rounded white sections. All branding and content is AI Nexus.

## Run locally

```sh
npm install
npm run dev
```

Open http://localhost:3000. A read-only sample student portal is at `/preview`. Production: `npm run build` then `npm start`.

## Live service setup required

The supplied Firebase and Supabase configurations are stored in ignored `.env.local`. No server secret is included in browser code. `.env.example` documents the names for another environment.

1. In Firebase project `ai-nexus-823e6`, initialize **Authentication**, enable the **Google** provider, and add `localhost` and the deployment hostname under **Authorized domains**. The initial configuration check returned `CONFIGURATION_NOT_FOUND`; merely creating a Firebase web app does not enable Authentication.
2. In the Supabase project SQL Editor, run `supabase/migrations/001_initial.sql` once. The Supabase connection was verified, but the `users` table does not exist yet. API keys cannot execute schema migrations through the normal Data API.
3. Bootstrap the initial administrator by running the following in the SQL Editor after replacing the example email with the owner's Google account:

```sql
insert into public.users(email, name, roles)
values ('owner@example.com', 'Club administrator', array['SUPER_ADMIN']);
```

4. Use Google sign-in, then the Users & roles portal to assign the other team accounts. Students may only use verified Google email addresses ending in `@paruluniversity.ac.in`. Other domains are allowed only for administrator-provisioned non-student accounts.
5. For Firebase token revocation checks, configure the optional server-side `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY` from your service account through deployment secrets. Without them, the Admin SDK still checks token signature, issuer, audience, expiration, Google provider, and verified email; immediate Firebase revocation/disable checks are unavailable. Supabase user disabling and role changes take effect on the next request. Sessions expire within one hour.

## Implemented

- Responsive public home, domain pages, event catalog and details, application form, login, privacy, and error pages.
- Local fonts; no third-party font fetch or analytics tracking.
- Firebase Google authentication and HTTP-only short-lived session cookies.
- Server-side role/module permissions with Supabase role lookup on every request; private tables have RLS enabled and public grants revoked.
- Student profile editing and ownership-scoped student records. Separate administrative capabilities for Super Admin/Config Admin, Lead, permission-based Core Team, Faculty oversight, and Student.
- Club application capture with unique enrollment/email, candidate IDs, stage transitions, and two scored interview rounds.
- Batch creation, atomic capacity-limited student assignment, syllabus, circular audiences, event publishing, registrations, and manual attendance.
- Atomic event registration with capacity checks, duplicate prevention, waitlist status, and registration notifications.
- Research, industry, esports, and certificate-link record management.
- Core-team permission management for Leads; email-based role administration for Admins.
- Database-backed counts, module search/filter/sort/pagination, CSV exports, and audit logging in the same transaction as administrative writes.
- Illustrative public events and student preview are explicitly marked. Forms never claim success without a successful database response.

## Remaining requirements / limitations

This is a working website and operational foundation, **not the complete production-ready platform in the 27-section requirements document**. The following are not implemented yet:

- Full topic/session/resource/assignment hierarchy with per-topic student completion and submissions. The current syllabus is a batch-linked module record; learning progress schema exists but its workflow is not wired.
- Live progress/attendance charts, department/skill analytics, and Excel exports. Current operational analytics are counts; the preview’s progress bars are illustrative.
- Bulk interview scheduling, bulk CSV student import, moving students across batches, and interview notification automation.
- A dedicated multi-role portal switcher. The current portal combines authorized modules for all assigned roles.
- Faculty review/remarks and approval workflows.
- Native file uploads, certificate generation/download automation, QR attendance, and QR registration codes. Resource/certificate links are supported.
- Complete esports roster/match/leaderboard automation, structured research milestones, and partner workflow automation. Current modules manage records and textual milestones.
- Team registrations capture member names/enrollment numbers as text and reserve the configured team size. Per-member uniqueness checks, automatic waitlist promotion, and cancellation are not implemented.
- User-editable configuration records do not yet change public website content. Website content is in source files; institutional dropdown master data is not yet connected.
- Notifications are created for registrations; other automated notifications and read-state controls are not implemented.
- Distributed rate limiting, CAPTCHA/application email verification, retention/deletion workflows, monitoring, live OAuth testing, deployment, and full live-database end-to-end acceptance.
- Table reads currently load at most 1,000 records and paginate/search locally. Use server-side pagination before scaling beyond that.

## Verification

```sh
npm run typecheck
npm run build
npm run test:db
npm test
```

Database tests execute the full SQL migration in local PostgreSQL-compatible PGlite, check student domain constraints, audit transactions, capacity/waitlist behavior, duplicate prevention, and anonymous permission denial. They do not modify the live Supabase project.

Browser tests use installed Microsoft Edge and expect the app on localhost:3000. They cover navigation, form validation, filtering, previews, mobile overflow, RBAC decisions, and unauthenticated API denial. Screenshots are written under `artifacts/`.

Architecture: `src/app` routes and API handlers; `src/components` shared UI; `src/lib` authentication, authorization, validation and database access; `supabase/migrations` relational schema and transaction functions.

Authentication implementation follows [Firebase ID-token verification](https://firebase.google.com/docs/auth/admin/verify-id-tokens). Supabase privileged keys stay server-side as described in [Supabase API-key guidance](https://supabase.com/docs/guides/api/api-keys).
