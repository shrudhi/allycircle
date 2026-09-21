# AllyCircle

Peer-practice network for professionals preparing for interviews. The MVP helps you find someone in your field, agree a time, run a 30-minute Interview Me or 60-minute reciprocal swap, then leave collaborative feedback.

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
- Public signal is “Helped N peers practice”, never a star rating
- Block is immediate; existing sessions are not deleted
- Account deletion lives in Settings
- Reschedule keeps the same session until the other person accepts a new time
- History includes Practice again, which opens a new request with that ally
- Photos are optional; initials show on cards when there isn’t one

## Architecture

Next.js App Router, TypeScript, Tailwind, shadcn/ui, Postgres (PGlite locally), Better Auth (email + Google), background jobs for Meet provisioning and reminders, first-party analytics events.
