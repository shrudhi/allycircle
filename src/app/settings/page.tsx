import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getSessionUser } from "@/lib/auth/session";
import { mySettings } from "@/lib/server/profile";
import {
  availabilityAction,
  availabilityPeriodAction,
  connectCalendarAction,
  deleteAccountAction,
  disconnectCalendarAction,
  removeAvailabilityAction,
  saveProfileAction,
} from "@/app/actions/app";
import { ProfileForm } from "@/components/profile-form";
import { AvailabilityEditor } from "@/components/availability-editor";
import { Button } from "@/components/ui/button";
import { suggestedTopics } from "@/lib/config/topics";
import { isGoogleCalendarConfigured } from "@/lib/integrations/google-calendar";
import { integrationStatus } from "@/lib/integrations/status";
import Link from "next/link";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ calendar?: string; error?: string }>;
}) {
  const current = await getSessionUser();
  if (!current?.profile) redirect("/login");
  const settings = await mySettings();
  const { calendar, error } = await searchParams;
  const calendarLive = isGoogleCalendarConfigured();
  const live = integrationStatus();
  const calendarMessage =
    calendar === "connected"
      ? "Google Calendar is connected. We’ll skip busy times and create Meet after a session is confirmed."
      : calendar === "denied"
        ? "Google access was declined. You can try again when you’re ready."
        : calendar === "failed"
          ? "We couldn’t finish the Google Calendar handshake. Try again, or reconnect after removing AllyCircle from your Google account."
          : calendar === "not_configured"
            ? "Google Calendar keys are not on this server yet. Add them to the environment, or use preview mode locally."
            : null;
  return (
    <AppShell name={current.profile.fullName}>
      <h1 className="font-serif text-4xl">Profile & Settings</h1>
      <p className="mt-2 text-sm text-[#b3b3b3]">
        Keep this current so peers know who they’re sitting across from. Testimonials and interview stats live on{" "}
        <Link href="/record" className="text-[#d4af37]">
          Your record
        </Link>
        .
      </p>
      <div className="mt-8 rounded-2xl border border-[#2d2d2d] bg-[#1e1e1e] p-6">
          <ProfileForm
            action={saveProfileAction}
            next="/settings"
            back="/settings"
            submitLabel="Save profile"
            formError={error}
          fields={settings.fields}
          topicOptions={suggestedTopics.map((topic) => ({ value: topic.id, label: topic.label }))}
          photoPath={settings.profile.photoPath}
          values={{
            fullName: settings.profile.fullName,
            stage: settings.profile.stage,
            experienceYears: settings.profile.experienceYears,
            fieldId: settings.profile.fieldId,
            fieldCustom: settings.profile.fieldCustom,
            currentTitle: settings.profile.currentTitle,
            currentCompany: settings.profile.currentCompany,
            targetRole: settings.profile.targetRole,
            linkedinUrl: settings.profile.linkedinUrl,
            timezone: settings.profile.timezone,
            bio: settings.profile.bio,
            openToBeInterviewed: settings.profile.openToBeInterviewed,
            openToInterviewOthers: settings.profile.openToInterviewOthers,
            interviewPace: settings.profile.interviewPace,
            topics: settings.topics.map((topic) => topic.label),
            jobs: settings.jobs.map((job) => ({
              company: job.company,
              title: job.title || "",
              year: job.year || "",
            })),
            schools: settings.schools.map((school) => ({
              school: school.school,
              degree: school.degree || "",
              course: school.course || "",
            })),
          }}
        />
      </div>

      <section id="calendar" className="mt-8 rounded-2xl border border-[#2d2d2d] bg-[#1e1e1e] p-6">
        <h2 className="font-serif text-2xl">Calendar connection</h2>
        <p className="mt-2 text-sm text-[#a0a0a0]">
          Google login and Calendar are separate. Connecting Calendar lets us read free/busy and create a real Google Meet after a session is confirmed.
        </p>
        <p className="mt-3 text-sm">
          Status: {settings.calendar?.status === "connected" ? "Connected" : "Not connected"}
          {calendarLive ? " · live Google API" : " · preview mode"}
        </p>
        {calendarMessage ? <p className="mt-3 text-sm text-[#d4af37]">{calendarMessage}</p> : null}
        {settings.calendar?.status === "connected" ? (
          <form action={disconnectCalendarAction} className="mt-4">
            <Button variant="outline">Disconnect Calendar</Button>
          </form>
        ) : calendarLive ? (
          <Link href="/api/calendar/google/start" className="mt-4 inline-flex h-10 items-center rounded-lg bg-[#d4af37] px-4 text-sm font-medium text-black">
            Connect Google Calendar
          </Link>
        ) : (
          <form action={connectCalendarAction} className="mt-4">
            <Button className="gold-outline">Connect Calendar (preview)</Button>
          </form>
        )}
      </section>

      <section className="mt-8 rounded-2xl border border-[#2d2d2d] bg-[#1e1e1e] p-6">
        <h2 className="font-serif text-2xl">Production integrations</h2>
        <ul className="mt-4 space-y-2 text-sm text-[#b3b3b3]">
          <li>Database: {live.database === "hosted" ? "DATABASE_URL (hosted Postgres)" : "local PGlite — set DATABASE_URL for production"}</li>
          <li>Google login: {live.googleLogin ? "configured" : "set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET"}</li>
          <li>Google Calendar / Meet: {live.googleCalendar ? "configured" : "same Google client, plus Calendar API and redirect /api/calendar/google/callback"}</li>
          <li>
            Email:{" "}
            {live.emailDeliverable
              ? "Resend can send to anyone from your EMAIL_FROM domain"
              : live.email
                ? "Resend API key is set, but EMAIL_FROM still needs a verified domain — until then accounts work without confirmation mail"
                : "set RESEND_API_KEY (and EMAIL_FROM) — until then mail stays in /dev/inbox"}
          </li>
        </ul>
      </section>

      <section className="mt-8 rounded-2xl border border-[#2d2d2d] bg-[#1e1e1e] p-6">
        <h2 className="font-serif text-2xl">Interview availability</h2>
        <p className="mb-4 mt-2 text-sm text-[#b3b3b3]">
          Set the date window you want to be recommended in, then publish different hours for different weekdays. There is no single from–to range for the whole week.
        </p>
        <AvailabilityEditor
          action={availabilityAction}
          removeAction={removeAvailabilityAction}
          periodAction={availabilityPeriodAction}
          windows={settings.windows}
          availableFrom={settings.profile.availableFrom}
          availableUntil={settings.profile.availableUntil}
        />
      </section>

      <section className="mt-8 rounded-2xl border border-[#2d2d2d] bg-[#1e1e1e] p-6">
        <h2 className="text-lg font-medium">Delete account</h2>
        <p className="mt-2 text-sm text-[#a0a0a0]">This signs you out and removes your profile from the network.</p>
        <form action={deleteAccountAction} className="mt-4">
          <Button variant="destructive">Delete my account</Button>
        </form>
      </section>
    </AppShell>
  );
}
