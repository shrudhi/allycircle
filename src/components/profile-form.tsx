"use client";

import { useEffect, useState } from "react";
import { careerStageLabels } from "@/lib/domain/types";
import { interviewPaceOptions } from "@/lib/domain/copy";
import { getTimeZones } from "@/lib/domain/timezone";

type JobRow = { company: string; title: string; year: string };
type SchoolRow = { school: string; degree: string; course: string };

const fieldClass =
  "h-10 w-full rounded-lg border border-[#2d2d2d] bg-[#111] px-3 text-sm text-white";

export function ProfileForm({
  action,
  next,
  back = "/onboarding",
  submitLabel,
  fields,
  topicOptions,
  photoPath,
  values,
  formError,
}: {
  action: (formData: FormData) => void | Promise<void>;
  next?: string;
  back?: string;
  submitLabel: string;
  fields: { id: string; label: string }[];
  topicOptions: { value: string; label: string }[];
  photoPath?: string | null;
  formError?: string;
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
  const [timezone, setTimezone] = useState(values.timezone || "UTC");
  const [zones, setZones] = useState(values.timezone ? [values.timezone] : ["UTC"]);
  const initials = (values.fullName || values.photoName || "A")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  useEffect(() => {
    const detected = values.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    const all = getTimeZones();
    const nextZones = all.includes(detected) ? all : [detected, ...all];
    setTimezone(detected);
    setZones(nextZones);
  }, [values.timezone]);

  return (
    <form action={action} className="space-y-6">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <input type="hidden" name="back" value={back} />
      {formError ? <p className="text-sm text-[#e07070]">{formError}</p> : null}
      <div className="flex items-center gap-4">
        {photoPath ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoPath} alt="" className="size-14 rounded-full border border-[#2d2d2d] object-cover" />
        ) : (
          <span className="flex size-14 shrink-0 items-center justify-center rounded-full border border-[#2d2d2d] bg-[#161616] text-lg font-medium text-[#d4af37]">
            {initials || "A"}
          </span>
        )}
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="photo">
            Photo (optional)
          </label>
          <input id="photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp" className="text-sm text-[#a0a0a0]" />
          <p className="text-xs text-[#a0a0a0]">JPG, PNG, or WebP under 2 MB. We’ll use your initials if you skip this.</p>
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="fullName">
          Full name
        </label>
        <input id="fullName" name="fullName" required defaultValue={values.fullName} className={fieldClass} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="stage">
            Where you are in your career
          </label>
          <select id="stage" name="stage" defaultValue={values.stage} className={fieldClass}>
            {Object.entries(careerStageLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="experienceYears">
            Years of relevant experience
          </label>
          <input
            id="experienceYears"
            name="experienceYears"
            type="number"
            min={0}
            max={40}
            required
            defaultValue={values.experienceYears}
            className={fieldClass}
          />
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="fieldId">
          Professional field
        </label>
        <select id="fieldId" name="fieldId" defaultValue={values.fieldId} className={fieldClass}>
          {fields.map((field) => (
            <option key={field.id} value={field.id}>
              {field.label}
            </option>
          ))}
          <option value="other">My field isn’t listed</option>
        </select>
        <input
          name="fieldCustom"
          defaultValue={values.fieldCustom || ""}
          placeholder="If it isn’t listed, type it here"
          className={fieldClass}
        />
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Companies you’ve worked at</p>
          <button type="button" className="text-xs text-[#d4af37]" onClick={() => setJobs((rows) => [...rows, { company: "", title: "", year: "" }])}>
            Add another company
          </button>
        </div>
        <p className="text-xs text-[#a0a0a0]">Add as many as you like. Put your current or most recent role first.</p>
        {jobs.map((job, index) => (
          <div key={index} className="grid gap-2 rounded-xl border border-[#2d2d2d] p-3 sm:grid-cols-3">
            <input name="jobCompany" defaultValue={job.company} placeholder="Company" className={fieldClass} />
            <input name="jobTitle" defaultValue={job.title} placeholder="Title" className={fieldClass} />
            <input name="jobYear" defaultValue={job.year} placeholder="Years, e.g. 2022–now" className={fieldClass} />
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="targetRole">
          Role you’re preparing for (optional)
        </label>
        <input id="targetRole" name="targetRole" defaultValue={values.targetRole || ""} placeholder="If different from your current title" className={fieldClass} />
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">College or university</p>
          <button type="button" className="text-xs text-[#d4af37]" onClick={() => setSchools((rows) => [...rows, { school: "", degree: "", course: "" }])}>
            Add another school
          </button>
        </div>
        <p className="text-xs text-[#a0a0a0]">Optional. Include the degree and course or major if you want allies to see it.</p>
        {schools.map((school, index) => (
          <div key={index} className="grid gap-2 rounded-xl border border-[#2d2d2d] p-3 sm:grid-cols-3">
            <input name="schoolName" defaultValue={school.school} placeholder="College / university" className={fieldClass} />
            <input name="schoolDegree" defaultValue={school.degree} placeholder="Degree, e.g. B.S." className={fieldClass} />
            <input name="schoolCourse" defaultValue={school.course} placeholder="Course / major" className={fieldClass} />
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="linkedinUrl">
          LinkedIn URL (optional)
        </label>
        <input id="linkedinUrl" name="linkedinUrl" defaultValue={values.linkedinUrl || ""} placeholder="https://www.linkedin.com/in/..." className={fieldClass} />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="timezone">
          Timezone
        </label>
        <select id="timezone" name="timezone" value={timezone} onChange={(event) => setTimezone(event.target.value)} className={fieldClass}>
          {zones.map((zone) => (
            <option key={zone} value={zone}>
              {zone.replaceAll("_", " ")}
            </option>
          ))}
        </select>
        <p className="text-xs text-[#a0a0a0]">We pick this from your current location. Change it if you travel or want times in another zone.</p>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="bio">
          Short bio (optional)
        </label>
        <textarea id="bio" name="bio" defaultValue={values.bio || ""} placeholder="A sentence about how you like to practice." className="min-h-24 w-full rounded-lg border border-[#2d2d2d] bg-[#111] p-3 text-sm" />
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
        <div className="space-y-2 pt-2">
          <label className="text-sm font-medium" htmlFor="interviewPace">
            How intense is your search right now?
          </label>
          <select id="interviewPace" name="interviewPace" defaultValue={values.interviewPace || "active"} className={fieldClass}>
            {interviewPaceOptions.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label} — {item.hint}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium">What can you interview others on? (optional)</p>
        <p className="text-xs text-[#a0a0a0]">Tick any that apply. You can also type your own below.</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {topicOptions.map((topic) => (
            <label key={topic.value} className="flex items-center gap-2 text-sm text-[#a0a0a0]">
              <input type="checkbox" name="topics" value={topic.label} defaultChecked={values.topics.includes(topic.label)} />
              {topic.label}
            </label>
          ))}
        </div>
        <input name="topics" placeholder="Add another topic" className={fieldClass} />
      </div>
      <button type="submit" className="gold-outline h-11 rounded-lg bg-[#d4af37] px-6 text-sm font-medium text-[#111]">
        {submitLabel}
      </button>
    </form>
  );
}
