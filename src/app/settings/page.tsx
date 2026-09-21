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
  testimonialVisibilityAction,
} from "@/app/actions/app";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Initials } from "@/components/initials";
import { careerStageLabels } from "@/lib/domain/types";

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default async function SettingsPage() {
  const current = await getSessionUser();
  if (!current?.profile) redirect("/login");
  const settings = await mySettings();
  return (
    <AppShell name={current.profile.fullName}>
      <h1 className="text-3xl font-semibold">Profile & Settings</h1>
      <form action={saveProfileAction} className="mt-8 space-y-4 rounded-2xl border border-[#2d2d2d] bg-[#1e1e1e] p-6">
        <input type="hidden" name="next" value="/settings" />
        <div className="flex items-center gap-4">
          <Initials name={settings.profile.fullName} photoPath={settings.profile.photoPath} size="lg" />
          <div className="space-y-2">
            <Label>Photo (optional)</Label>
            <Input name="photo" type="file" accept="image/jpeg,image/png,image/webp" />
            <p className="text-xs text-[#a0a0a0]">JPG, PNG, or WebP under 2 MB. Initials show if you skip this.</p>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Full name</Label>
          <Input name="fullName" defaultValue={settings.profile.fullName} required />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Stage</Label>
            <select name="stage" className="h-8 w-full rounded-lg border border-[#2d2d2d] bg-[#111] px-2 text-sm" defaultValue={settings.profile.stage}>
              {Object.entries(careerStageLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Years of relevant experience</Label>
            <Input name="experienceYears" type="number" min={0} max={10} defaultValue={settings.profile.experienceYears} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Professional field</Label>
          <select name="fieldId" className="h-8 w-full rounded-lg border border-[#2d2d2d] bg-[#111] px-2 text-sm" defaultValue={settings.profile.fieldId}>
            {settings.fields.map((field) => (
              <option key={field.id} value={field.id}>{field.label}</option>
            ))}
            <option value="other">My field isn’t listed</option>
          </select>
          <Input name="fieldCustom" defaultValue={settings.profile.fieldCustom || ""} placeholder="Or type your field" />
        </div>
        <Input name="currentTitle" defaultValue={settings.profile.currentTitle || ""} placeholder="Title" />
        <Input name="currentCompany" defaultValue={settings.profile.currentCompany || ""} placeholder="Company" />
        <Input name="timezone" defaultValue={settings.profile.timezone} />
        <label className="flex gap-2 text-sm">
          <input type="checkbox" name="openToBeInterviewed" defaultChecked={settings.profile.openToBeInterviewed} />
          Open to being interviewed
        </label>
        <label className="flex gap-2 text-sm">
          <input type="checkbox" name="openToInterviewOthers" defaultChecked={settings.profile.openToInterviewOthers} />
          Open to interviewing others
        </label>
        <Button>Save profile</Button>
      </form>

      <section id="calendar" className="mt-8 rounded-2xl border border-[#2d2d2d] bg-[#1e1e1e] p-6">
        <h2 className="text-lg font-medium">Calendar connection</h2>
        <p className="mt-2 text-sm text-[#a0a0a0]">
          Google login and Calendar are separate. Connecting Calendar lets us check free/busy and create the Meet invite after a session is confirmed.
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
        <h2 className="text-lg font-medium">Weekly availability</h2>
        <p className="mt-2 text-sm text-[#a0a0a0]">24-hour notice, 14-day horizon. Times are in your timezone.</p>
        <form action={availabilityAction} className="mt-4 grid gap-3 md:grid-cols-4">
          <select name="weekday" className="h-9 rounded-lg border border-[#2d2d2d] bg-[#111] px-2 text-sm">
            {weekdays.map((label, index) => (
              <option key={label} value={index}>
                {label}
              </option>
            ))}
          </select>
          <Input name="startHour" type="number" min={0} max={23} defaultValue={18} />
          <Input name="endHour" type="number" min={1} max={24} defaultValue={21} />
          <Button type="submit" variant="outline">
            Add window
          </Button>
        </form>
        <div className="mt-4 space-y-2">
          {settings.windows.length === 0 ? <p className="text-sm text-[#a0a0a0]">None yet.</p> : null}
          {settings.windows.map((window) => (
            <form key={window.id} action={removeAvailabilityAction} className="flex items-center justify-between gap-3 text-sm">
              <input type="hidden" name="windowId" value={window.id} />
              <p>
                {weekdays[window.weekday]} {Math.floor(window.startMinutes / 60)}:00–
                {Math.floor(window.endMinutes / 60)}:00
              </p>
              <Button type="submit" variant="ghost" size="sm">
                Remove
              </Button>
            </form>
          ))}
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-[#2d2d2d] bg-[#1e1e1e] p-6">
        <h2 className="text-lg font-medium">Testimonials about you</h2>
        {settings.testimonials.length === 0 ? <p className="mt-2 text-sm text-[#a0a0a0]">None yet.</p> : null}
        {settings.testimonials.map((item) => (
          <form key={item.id} action={testimonialVisibilityAction} className="mt-4 flex items-start justify-between gap-3 text-sm">
            <input type="hidden" name="id" value={item.id} />
            <p className="text-[#a0a0a0]">“{item.body}”</p>
            <label className="flex items-center gap-2">
              <input type="checkbox" name="visible" defaultChecked={item.recipientVisible} />
              Show on profile
            </label>
            <Button variant="outline" size="sm">Save</Button>
          </form>
        ))}
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
