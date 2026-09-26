# AI Nexus role portals

Google sign-in routes each account to `/portal/admin`, `/portal/core-team`, `/portal/faculty`, or `/portal/student`. Role lookup uses the verified Google email and the server database on every request. When an account has several roles, dashboard priority is Admin, Core Team, Faculty, Student; its permitted modules reflect all its roles.

## Admin setup

1. Open **Users & roles**. Enter an exact Google email and name, select roles and save. Existing applicants can be edited without changing their application.
2. For Core Team interviewers, grant **View + Edit** on Applications and Interviews. For attendance, grant **View + Edit** on Attendance and **View** on Batches.
3. Open **Batches**. Set the total intake limit for each academic year, then create Incubation 1 batches with strengths, schedules, rooms, Core Team and faculty assignments.
4. Use **Assigned tasks** to delegate event, media, research, industry or esports work with deadlines. For event operations, select the related event and grant the relevant module access. Admin creates events/projects; assigned Core Team members operate them.
5. Core Team schedules and evaluates first interviews. Admin reviews the recommendation and finalizes selection into a matching-year batch. Selection checks both batch capacity and total year intake in one database transaction.

## Other portals

- **Core Team:** personal task queue, explicitly granted modules, interview evaluations, and attendance for assigned batches. It cannot assign roles or make final admissions decisions.
- **Student:** own application/interview status, own batch, active syllabus/resources, self-reported lesson completion, own attendance, registrations, assigned research, certificates and notifications.
- **Faculty:** monitoring across students/batches, progress and attendance, reports, mentoring remarks. Activity approval requires the extra Feedback → Approve permission.

## Data and deployment

Migration `003_club_workflow.sql` adds fields and tables; it does not reset or delete prior applications, registrations, profiles or attendance. Existing batches without a year must be configured before admissions use them. All new private tables deny anonymous and browser-authenticated database access. Database secret keys stay on the server.

The existing application form and registration endpoint are preserved. Personal-email first-year applicants retain the existing verified-Google application-linked login path. New student access otherwise requires a university email.

Google login establishes its HTTP-only cookie through a Server Action, then navigates without a full page reload. Firebase refreshes the session while the portal is open; sign-out clears both Firebase and server sessions. An actual Google account is needed for final human verification of each granted role.

Checks: `npm run build`, `node tests/club-workflow.mjs`, `npm run test:db`, and `npx playwright test tests/role-portals.spec.ts tests/security-and-updates.spec.ts tests/application-validation.spec.ts`.
