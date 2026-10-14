# AllyCircle

Peer interview network for professionals preparing for their next role. Find someone in your field, book from their calendar, run a 30-minute Interview Me or 60-minute two-way session, then leave collaborative feedback.

## Run locally

1. Install Node.js 20+.
2. Copy environment values:

```bash
cp .env.example .env.local
```

3. Install and start:

```bash
npm install
npm run dev
```

The app listens on [http://127.0.0.1:43131](http://127.0.0.1:43131).

4. Run tests:

```bash
npm test
```

## Local test accounts

Development seeds labelled test allies (not mixed into production). Password for all of them:

`Practice123!`

Example: `avery.chen@test.allycircle.local`

Sign up with your own email to practice the real onboarding flow, then Find People will show the test professionals in Product Management and other fields.

Development-only tools:

- `/dev/inbox` — password reset and notification emails
- `/dev/clock` — jump the server clock to test Join Session (T-15 through end+30), reminders, and request expiry
- `/internal/metrics` — funnel and product health
- `/record` — interviews given, pending requests, notes, and testimonial visibility

## Real-world integrations

Copy `.env.example` to `.env.local` (or your host’s secret store). Until a key is set, that slice stays on the local fallback so development still works.

1. **Database** — set `DATABASE_URL` to Postgres/Supabase. Without it, the app uses embedded PGlite in `.data/`.
2. **Google login** — create an OAuth client. Authorized redirect: `{NEXT_PUBLIC_APP_URL}/api/auth/callback/google`. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
3. **Google Calendar + Meet** — enable Calendar API on the same (or a dedicated) OAuth client. Authorized redirect: `{NEXT_PUBLIC_APP_URL}/api/calendar/google/callback`. Scopes: `calendar.events`, `calendar.freebusy`. Connect from Settings → Calendar. After a session is confirmed we create a Calendar event with a Meet link and skip busy times when booking.
4. **Email** — set `RESEND_API_KEY` and `EMAIL_FROM`. Verification, resets, and session mail then send through Resend. Without it, messages land in `/dev/inbox`.
5. **Jobs** — Meet provisioning and reminders run from `/api/jobs`. Logged-in clients poll it; in production also set `CRON_SECRET` and hit that path on a schedule (Vercel cron is included).

Set `NEXT_PUBLIC_APP_URL` and `AUTH_SECRET` before any public deploy. Replace the Terms/Privacy placeholders with counsel-reviewed copy.

## What is mocked until you connect accounts

Do **not** paste secrets into chat. Put them in `.env.local` or your host’s secret settings.

| Feature | Local / preview | When you connect it |
| --- | --- | --- |
| Email/password login | Works | Same |
| Google login | Button hidden until `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Create OAuth credentials, add callback `{APP_URL}/api/auth/callback/google` |
| Google Calendar + Meet | “Connect Calendar (preview)” creates a mock Meet link after confirmation | Set Google Calendar OAuth and Calendar API |
| Email delivery | Written to `/dev/inbox` and server logs | Set `RESEND_API_KEY` (or another provider later) |
| Database | Embedded Postgres (PGlite) in `.data/` | Set `DATABASE_URL` to your Supabase/Postgres connection string |

## Product rules implemented from PRD v13 + your clarifications

- Professional field matching, with a free-text option if the field is not listed
- Topics never block an otherwise qualified interviewer
- Atomic booking with overlap protection and warm “that time was just booked” copy
- Join Session from T-15 through end+30, server-enforced
- Meet links may appear in Google Calendar invites once the room exists
- Session is completed only after both people confirm it happened
- Public signal is interviews conducted as interviewer, never a star rating
- Block is immediate; existing sessions are not deleted
- Account deletion lives in Settings
- Reschedule keeps the same session until the other person accepts a new time
- History includes Practice again, which opens a new request with that ally
- Photos are optional; initials show on cards when there isn’t one

## Interview availability

Settings → Interview availability is the place to publish weekly hours, date overrides, duration, notice, buffers, and timezone. Bookable times are never pre-materialized. The server availability engine:

1. Loads each person’s period, weekly windows, date overrides, and interview preferences
2. Generates candidate slots from those rules (duration must fit entirely inside a window, including buffers)
3. Subtracts Google Calendar free/busy when a calendar is connected — a failed calendar check is treated as unknown, not free
4. Subtracts confirmed AllyCircle sessions and pending requests for both people
5. Intersects interviewer and candidate slots, then ranks a few recommended times

The booking calendar only enables a date when at least one genuinely free slot exists. Confirming a request re-checks availability and locks both profile rows in a transaction so two accepts cannot create overlapping sessions.

Outlook is not supported. Google Calendar remains optional: without it, times use AllyCircle hours and bookings only.

## Architecture

Next.js App Router, TypeScript, Tailwind, shadcn/ui, Postgres (PGlite locally), Better Auth (email + Google), background jobs for Meet provisioning and reminders, first-party analytics events.
