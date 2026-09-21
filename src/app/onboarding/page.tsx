import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { professionalFields } from "@/lib/config/fields";
import { suggestedTopics } from "@/lib/config/topics";
import { getTimeZones, guessTimeZone } from "@/lib/domain/timezone";
import { careerStageLabels } from "@/lib/domain/types";
import { saveProfileAction } from "@/app/actions/app";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Logo } from "@/components/logo";

export default async function OnboardingPage() {
  const current = await getSessionUser();
  if (!current) redirect("/login");
  const timezones = getTimeZones();
  const guessed = current.profile?.timezone || guessTimeZone();

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Logo href="/home" />
      <form action={saveProfileAction} className="elevator-rise mt-8 space-y-6 rounded-2xl border border-[#2d2d2d] bg-[#1e1e1e] p-6">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-[#d4af37]">Profile setup</p>
          <h1 className="mt-2 text-2xl font-semibold">Tell allies who you are</h1>
          <p className="mt-2 text-sm text-[#a0a0a0]">
            We’ll use your professional field to introduce you to people in the same kind of work. You can skip photo,
            company, school and LinkedIn — we never invent missing details.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="fullName">Full name</Label>
          <Input id="fullName" name="fullName" required defaultValue={current.profile?.fullName || current.name} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="photo">Photo (optional)</Label>
          <Input id="photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp" />
          <p className="text-xs text-[#a0a0a0]">JPG, PNG, or WebP under 2 MB. We’ll use your initials if you skip this.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="stage">Current stage</Label>
            <select id="stage" name="stage" className="h-8 w-full rounded-lg border border-[#2d2d2d] bg-[#111] px-2 text-sm" defaultValue={current.profile?.stage || "working_professional"}>
              {Object.entries(careerStageLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="experienceYears">Relevant experience (years)</Label>
            <Input id="experienceYears" name="experienceYears" type="number" min={0} max={10} required defaultValue={current.profile?.experienceYears ?? 3} />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="fieldId">Professional field</Label>
          <select id="fieldId" name="fieldId" className="h-8 w-full rounded-lg border border-[#2d2d2d] bg-[#111] px-2 text-sm" defaultValue={current.profile?.fieldId || "product-management"}>
            {professionalFields.map((field) => (
              <option key={field.id} value={field.id}>
                {field.label}
              </option>
            ))}
            <option value="other">My field isn’t listed</option>
          </select>
          <Input name="fieldCustom" placeholder="If it isn’t listed, type it here" defaultValue={current.profile?.fieldCustom || ""} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="currentTitle">Current title (optional)</Label>
            <Input id="currentTitle" name="currentTitle" defaultValue={current.profile?.currentTitle || ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="currentCompany">Current company (optional)</Label>
            <Input id="currentCompany" name="currentCompany" defaultValue={current.profile?.currentCompany || ""} />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="targetRole">Target role if different (optional)</Label>
          <Input id="targetRole" name="targetRole" defaultValue={current.profile?.targetRole || ""} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="school">College / university (optional)</Label>
            <Input id="school" name="school" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="degree">Degree (optional)</Label>
            <Input id="degree" name="degree" />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="linkedinUrl">LinkedIn URL (optional)</Label>
          <Input id="linkedinUrl" name="linkedinUrl" placeholder="https://www.linkedin.com/in/..." defaultValue={current.profile?.linkedinUrl || ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="timezone">Timezone</Label>
          <select id="timezone" name="timezone" className="h-8 w-full rounded-lg border border-[#2d2d2d] bg-[#111] px-2 text-sm" defaultValue={guessed}>
            {timezones.map((zone) => (
              <option key={zone} value={zone}>
                {zone}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="bio">Short bio (optional)</Label>
          <Textarea id="bio" name="bio" defaultValue={current.profile?.bio || ""} />
        </div>
        <div className="space-y-3 rounded-xl border border-[#2d2d2d] p-4">
          <p className="text-sm font-medium">Practice preferences</p>
          <label className="flex gap-2 text-sm text-[#a0a0a0]">
            <input type="checkbox" name="openToBeInterviewed" defaultChecked={current.profile?.openToBeInterviewed !== false} />
            Open to being interviewed
          </label>
          <label className="flex gap-2 text-sm text-[#a0a0a0]">
            <input type="checkbox" name="openToInterviewOthers" defaultChecked={current.profile?.openToInterviewOthers !== false} />
            Open to interviewing others
          </label>
          <p className="text-xs text-[#a0a0a0]">Turning both off means you’re taking a break from new requests. Existing sessions stay.</p>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">What can you interview others on? (optional)</p>
          <div className="flex flex-wrap gap-2">
            {suggestedTopics.map((topic) => (
              <label key={topic.id} className="flex items-center gap-2 rounded-full border border-[#2d2d2d] px-3 py-1 text-xs">
                <input type="checkbox" name="topics" value={topic.label} />
                {topic.label}
              </label>
            ))}
          </div>
        </div>
        <Button type="submit" className="h-10 gold-outline">
          Save and continue
        </Button>
      </form>
    </div>
  );
}
