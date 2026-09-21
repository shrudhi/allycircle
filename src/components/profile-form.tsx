"use client";

import { useActionState, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SearchSelect } from "@/components/search-select";
import { MultiSearchSelect } from "@/components/multi-search-select";
import { TimezoneSelect } from "@/components/timezone-select";
import { Initials } from "@/components/initials";
import { careerStageLabels } from "@/lib/domain/types";
import { interviewPaceOptions } from "@/lib/domain/copy";
import { cn } from "@/lib/utils";

type JobRow = { company: string; title: string; year: string };
type SchoolRow = { school: string; degree: string; course: string };

export function ProfileForm({
  action,
  next,
  submitLabel,
  fields,
  topicOptions,
  photoPath,
  values,
}: {
  action: (
    state: { error?: string } | null,
    formData: FormData
  ) => Promise<{ error?: string } | null>;
  next?: string;
  submitLabel: string;
  fields: { id: string; label: string }[];
  topicOptions: { value: string; label: string }[];
  photoPath?: string | null;
  values: {
    fullName: string;
    photoName?: string;
    stage: string;
    experienceYears: number;
    fieldId: string;
    fieldCustom?: string | null;
    currentTitle?: string | null;
    currentCompany?: string | null;
    targetRole?: string | null;
    linkedinUrl?: string | null;
    timezone?: string;
    bio?: string | null;
    openToBeInterviewed: boolean;
    openToInterviewOthers: boolean;
    interviewPace?: string | null;
    topics: string[];
    jobs: JobRow[];
    schools: SchoolRow[];
  };
}) {
  const [jobs, setJobs] = useState<JobRow[]>(
    values.jobs.length ? values.jobs : [{ company: values.currentCompany || "", title: values.currentTitle || "", year: "" }]
  );
  const [schools, setSchools] = useState<SchoolRow[]>(
    values.schools.length ? values.schools : [{ school: "", degree: "", course: "" }]
  );

  const [state, formAction, pending] = useActionState(action, null as { error?: string } | null);

  return (
    <form action={formAction} className="space-y-6">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <div className="flex items-center gap-4">
        <Initials name={values.fullName || values.photoName || "A"} photoPath={photoPath} size="lg" />
        <div className="space-y-2">
          <Label>Photo (optional)</Label>
          <Input name="photo" type="file" accept="image/jpeg,image/png,image/webp" />
          <p className="text-xs text-[#a0a0a0]">JPG, PNG, or WebP under 2 MB. We’ll use your initials if you skip this.</p>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="fullName">Full name</Label>
        <Input id="fullName" name="fullName" required defaultValue={values.fullName} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Where you are in your career</Label>
          <SearchSelect
            name="stage"
            defaultValue={values.stage}
            options={Object.entries(careerStageLabels).map(([value, label]) => ({ value, label }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="experienceYears">Years of relevant experience</Label>
          <Input id="experienceYears" name="experienceYears" type="number" min={0} max={40} required defaultValue={values.experienceYears} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Professional field</Label>
        <SearchSelect
          name="fieldId"
          defaultValue={values.fieldId}
          options={[...fields.map((field) => ({ value: field.id, label: field.label })), { value: "other", label: "My field isn’t listed" }]}
          placeholder="Search fields"
        />
        <Input name="fieldCustom" defaultValue={values.fieldCustom || ""} placeholder="If it isn’t listed, type it here" />
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Companies you’ve worked at</Label>
          <button
            type="button"
            className="text-xs text-[#d4af37]"
            onClick={() => setJobs((rows) => [...rows, { company: "", title: "", year: "" }])}
          >
            Add another company
          </button>
        </div>
        <p className="text-xs text-[#a0a0a0]">Add as many as you like. Put your current or most recent role first.</p>
        {jobs.map((job, index) => (
          <div key={index} className="grid gap-2 rounded-xl border border-[#2d2d2d] p-3 sm:grid-cols-3">
            <Input name="jobCompany" defaultValue={job.company} placeholder="Company" />
            <Input name="jobTitle" defaultValue={job.title} placeholder="Title" />
            <Input name="jobYear" defaultValue={job.year} placeholder="Years, e.g. 2022–now" />
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <Label htmlFor="targetRole">Role you’re preparing for (optional)</Label>
        <Input id="targetRole" name="targetRole" defaultValue={values.targetRole || ""} placeholder="If different from your current title" />
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>College or university</Label>
          <button
            type="button"
            className="text-xs text-[#d4af37]"
            onClick={() => setSchools((rows) => [...rows, { school: "", degree: "", course: "" }])}
          >
            Add another school
          </button>
        </div>
        <p className="text-xs text-[#a0a0a0]">Optional. Include the degree and course or major if you want allies to see it.</p>
        {schools.map((school, index) => (
          <div key={index} className="grid gap-2 rounded-xl border border-[#2d2d2d] p-3 sm:grid-cols-3">
            <Input name="schoolName" defaultValue={school.school} placeholder="College / university" />
            <Input name="schoolDegree" defaultValue={school.degree} placeholder="Degree, e.g. B.S." />
            <Input name="schoolCourse" defaultValue={school.course} placeholder="Course / major" />
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <Label htmlFor="linkedinUrl">LinkedIn URL (optional)</Label>
        <Input id="linkedinUrl" name="linkedinUrl" placeholder="https://www.linkedin.com/in/..." defaultValue={values.linkedinUrl || ""} />
      </div>
      <div className="space-y-2">
        <Label>Timezone</Label>
        <TimezoneSelect name="timezone" defaultValue={values.timezone} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="bio">Short bio (optional)</Label>
        <Textarea id="bio" name="bio" defaultValue={values.bio || ""} placeholder="A sentence about how you like to practice." />
      </div>
      <div className="space-y-3 rounded-xl border border-[#2d2d2d] p-4">
        <p className="text-sm font-medium">How do you want to practice?</p>
        <label className="flex gap-2 text-sm text-[#a0a0a0]">
          <input type="checkbox" name="openToBeInterviewed" defaultChecked={values.openToBeInterviewed} />
          I’m open to being interviewed
        </label>
        <label className="flex gap-2 text-sm text-[#a0a0a0]">
          <input type="checkbox" name="openToInterviewOthers" defaultChecked={values.openToInterviewOthers} />
          I’m open to interviewing others
        </label>
        <p className="text-xs text-[#a0a0a0]">Turn both off if you need a break. Existing sessions stay on your calendar.</p>
        <div className="space-y-2 pt-2">
          <Label>How intense is your search right now?</Label>
          <SearchSelect
            name="interviewPace"
            defaultValue={values.interviewPace || "active"}
            options={interviewPaceOptions.map((item) => ({ value: item.value, label: `${item.label} — ${item.hint}` }))}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>What can you interview others on? (optional)</Label>
        <p className="text-xs text-[#a0a0a0]">
          Pick from the list or type your own. This shows on your profile and helps us introduce you to people practicing those topics.
        </p>
        <MultiSearchSelect name="topics" options={topicOptions} defaultValues={values.topics} placeholder="Add a topic" />
      </div>
      {state?.error ? <p className="text-sm text-[#e07070]">{state.error}</p> : null}
      <button type="submit" className={cn(buttonVariants({ size: "lg" }), "gold-outline h-11 px-6")} disabled={pending}>
        {pending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
