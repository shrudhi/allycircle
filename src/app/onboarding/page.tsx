import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { professionalFields } from "@/lib/config/fields";
import { suggestedTopics } from "@/lib/config/topics";
import { saveProfileAction } from "@/app/actions/app";
import { ProfileForm } from "@/components/profile-form";
import { Logo } from "@/components/logo";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const current = await getSessionUser();
  if (!current) redirect("/login");
  const { error } = await searchParams;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Logo href="/home" />
      <div className="elevator-rise mt-8 rounded-2xl border border-[#2d2d2d] bg-[#1e1e1e] p-6">
        <p className="text-xs uppercase tracking-[0.16em] text-[#d4af37]">Profile setup</p>
        <h1 className="mt-2 font-serif text-2xl">A few details so we can introduce you</h1>
        <p className="mt-2 text-sm text-[#a0a0a0]">
          We match you with people in the same kind of work. Skip anything you don’t want to share. After you save,
          you’ll reach Home. Google Calendar is under your initials → Profile & Settings.
        </p>
        <div className="mt-8">
          <ProfileForm
            action={saveProfileAction}
            back="/onboarding"
            submitLabel="Save and continue"
            formError={error}
            fields={professionalFields}
            topicOptions={suggestedTopics.map((topic) => ({ value: topic.id, label: topic.label }))}
            values={{
              fullName: current.profile?.fullName || current.name || "",
              photoName: current.name,
              stage: current.profile?.stage || "working_professional",
              experienceYears: current.profile?.experienceYears ?? 3,
              fieldId: current.profile?.fieldId || "product-management",
              fieldCustom: current.profile?.fieldCustom,
              currentTitle: current.profile?.currentTitle,
              currentCompany: current.profile?.currentCompany,
              targetRole: current.profile?.targetRole,
              linkedinUrl: current.profile?.linkedinUrl,
              timezone: current.profile?.timezone,
              bio: current.profile?.bio,
              openToBeInterviewed: current.profile?.openToBeInterviewed !== false,
              openToInterviewOthers: current.profile?.openToInterviewOthers !== false,
              interviewPace: current.profile?.interviewPace || "active",
              topics: [],
              jobs: [],
              schools: [],
            }}
          />
        </div>
      </div>
    </div>
  );
}
