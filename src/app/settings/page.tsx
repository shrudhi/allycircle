import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getSessionUser } from "@/lib/auth/session";
import { mySettings } from "@/lib/server/profile";
import {
  availabilityAction,
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
import Link from "next/link";

export default async function SettingsPage() {
  const current = await getSessionUser();
  if (!current?.profile) redirect("/login");
  const settings = await mySettings();
  return (
    <AppShell name={current.profile.fullName}>
      <h1 className="text-3xl font-semibold">Profile & Settings</h1>
      <p className="mt-2 text-sm text-[#a0a0a0]">
        Keep this current so allies know who they’re practicing with. Testimonials and interview stats live on{" "}
        <Link href="/record" className="text-[#d4af37]">
          Your record
        </Link>
        .
      </p>
      <div className="mt-8 rounded-2xl border border-[#2d2d2d] bg-[#1e1e1e] p-6">
        <ProfileForm
          action={saveProfileAction}
          next="/settings"
          submitLabel="Save profile"
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
        <h2 className="text-lg font-medium">Calendar connection</h2>
        <p className="mt-2 text-sm text-[#a0a0a0]">
          Google login and Calendar are separate. Connecting Calendar lets us check when you’re busy and create the Meet invite after a session is confirmed.
        </p>
        <p className="mt-3 text-sm">Status: {settings.calendar?.status === "connected" ? "Connected" : "Not connected"}</p>
        {settings.calendar?.status === "connected" ? (
          <form action={disconnectCalendarAction} className="mt-4">
            <Button variant="outline">Disconnect Calendar</Button>
          </form>
        ) : (
          <form action={connectCalendarAction} className="mt-4">
            <Button className="gold-outline">Connect Google Calendar (preview)</Button>
          </form>
        )}
      </section>

      <section className="mt-8 rounded-2xl border border-[#2d2d2d] bg-[#1e1e1e] p-6">
        <h2 className="text-lg font-medium">When you’re free to practice</h2>
        <AvailabilityEditor action={availabilityAction} removeAction={removeAvailabilityAction} windows={settings.windows} />
      </section>

      <section className="mt-8 rounded-2xl border border-[#2d2d2d] bg-[#1e1e1e] p-6">
        <h2 className="text-lg font-medium">Delete account</h2>
        <p className="mt-2 text-sm text-[#a0a0a0]">This signs you out and removes your profile from the practice network.</p>
        <form action={deleteAccountAction} className="mt-4">
          <Button variant="destructive">Delete my account</Button>
        </form>
      </section>
    </AppShell>
  );
}
