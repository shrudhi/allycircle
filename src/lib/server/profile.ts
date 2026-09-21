import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { analyticsEvents } from "@/lib/analytics/taxonomy";
import { markMeaningful, track } from "@/lib/analytics/track";
import { requireMarketplaceUser, requireSessionUser } from "@/lib/auth/session";
import { emailVerificationRequired } from "@/lib/auth/email-policy";
import { OTHER_FIELD_ID, professionalFields, resolveProfessionalField } from "@/lib/config/fields";
import { topicsForField } from "@/lib/config/topics";
import { getDb, getNow } from "@/lib/db";
import {
  availabilityWindows,
  calendarConnections,
  education,
  employment,
  feedback,
  profiles,
  testimonials,
  user,
  userTopics,
} from "@/lib/db/schema";
import { positiveFeedbackTags } from "@/lib/domain/types";
import { getAuth } from "@/lib/auth";
import { headers } from "next/headers";

export async function saveProfileSetup(input: {
  fullName: string;
  stage: string;
  fieldId: string;
  fieldCustom?: string;
  currentTitle?: string;
  experienceYears: number;
  currentCompany?: string;
  targetRole?: string;
  bio?: string;
  linkedinUrl?: string;
  timezone: string;
  openToBeInterviewed: boolean;
  openToInterviewOthers: boolean;
  interviewPace?: string;
  topics?: string[];
  jobs?: { company: string; title?: string; year?: string }[];
  schools?: { school: string; degree?: string; course?: string }[];
}) {
  const current = await requireSessionUser();
  const db = await getDb();
  const now = await getNow();
  if (!input.fullName.trim()) throw new Error("Please add your name.");
  if (!input.timezone) throw new Error("Choose your timezone so we can show times correctly.");
  if (Number.isNaN(input.experienceYears)) throw new Error("Add your relevant experience.");
  const field = resolveProfessionalField({
    fieldId: input.fieldId || OTHER_FIELD_ID,
    fieldCustom: input.fieldCustom,
  });
  if (field.fieldId === OTHER_FIELD_ID && !field.fieldCustom) {
    throw new Error("Tell us your professional field, or choose one from the list.");
  }
  const jobs = (input.jobs || []).filter((job) => job.company.trim());
  const firstJob = jobs[0];
  const values = {
    userId: current.id,
    fullName: input.fullName.trim(),
    stage: input.stage,
    fieldId: field.fieldId,
    fieldCustom: field.fieldCustom,
    currentTitle: firstJob?.title?.trim() || input.currentTitle?.trim() || null,
    experienceYears: Math.max(0, Math.min(10, input.experienceYears)),
    currentCompany: firstJob?.company.trim() || input.currentCompany?.trim() || null,
    targetRole: input.targetRole?.trim() || null,
    bio: input.bio?.trim() || null,
    linkedinUrl: input.linkedinUrl?.trim() || null,
    timezone: input.timezone,
    openToBeInterviewed: input.openToBeInterviewed,
    openToInterviewOthers: input.openToInterviewOthers,
    interviewPace: input.interviewPace === "casual" ? "casual" : "active",
    onboardingComplete: true,
    termsAcceptedAt: current.profile?.termsAcceptedAt || now,
    lastMeaningfulAt: now,
    updatedAt: now,
    createdAt: current.profile?.createdAt || now,
  };
  if (current.profile) {
    await db.update(profiles).set(values).where(eq(profiles.userId, current.id));
  } else {
    await db.insert(profiles).values(values);
  }
  await db.delete(employment).where(eq(employment.userId, current.id));
  for (const job of jobs) {
    await db.insert(employment).values({
      id: nanoid(),
      userId: current.id,
      company: job.company.trim(),
      title: job.title?.trim() || null,
      year: job.year?.trim() || null,
    });
  }
  await db.delete(education).where(eq(education.userId, current.id));
  for (const school of input.schools || []) {
    if (!school.school.trim()) continue;
    await db.insert(education).values({
      id: nanoid(),
      userId: current.id,
      school: school.school.trim(),
      degree: school.degree?.trim() || null,
      course: school.course?.trim() || null,
    });
  }
  await db.delete(userTopics).where(eq(userTopics.userId, current.id));
  for (const label of input.topics || []) {
    await db.insert(userTopics).values({
      id: nanoid(),
      userId: current.id,
      label,
    });
  }
  await db.update(user).set({
    name: input.fullName.trim(),
    emailVerified: emailVerificationRequired() ? current.emailVerified : true,
    updatedAt: now,
  }).where(eq(user.id, current.id));
  await track(
    current.profile?.onboardingComplete ? analyticsEvents.profile_updated : analyticsEvents.onboarding_completed,
    { userId: current.id }
  );
}

export async function removeAvailabilityWindow(windowId: string) {
  const current = await requireMarketplaceUser();
  const db = await getDb();
  await db
    .delete(availabilityWindows)
    .where(and(eq(availabilityWindows.id, windowId), eq(availabilityWindows.userId, current.id)));
  await markMeaningful(current.id);
}

export async function addAvailabilityWindows(windows: { weekday: number; startMinutes: number; endMinutes: number }[]) {
  const current = await requireMarketplaceUser();
  const db = await getDb();
  const existing = await db
    .select()
    .from(availabilityWindows)
    .where(eq(availabilityWindows.userId, current.id));
  for (const window of windows) {
    if (window.endMinutes <= window.startMinutes) continue;
    const duplicate = existing.some(
      (row) =>
        row.weekday === window.weekday &&
        row.startMinutes === window.startMinutes &&
        row.endMinutes === window.endMinutes
    );
    if (duplicate) continue;
    await db.insert(availabilityWindows).values({
      id: nanoid(),
      userId: current.id,
      weekday: window.weekday,
      startMinutes: window.startMinutes,
      endMinutes: window.endMinutes,
    });
  }
  await markMeaningful(current.id);
}

export async function saveAvailabilityPeriod(input: { from?: string; until?: string }) {
  const current = await requireMarketplaceUser();
  const db = await getDb();
  const now = await getNow();
  await db
    .update(profiles)
    .set({
      availableFrom: input.from || null,
      availableUntil: input.until || null,
      updatedAt: now,
    })
    .where(eq(profiles.userId, current.id));
}

export async function connectMockCalendar() {
  const current = await requireMarketplaceUser();
  const db = await getDb();
  const now = await getNow();
  await db
    .insert(calendarConnections)
    .values({
      userId: current.id,
      provider: "google",
      status: "connected",
      scopes: "calendar.events,calendar.freebusy",
      organizerEligible: true,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: calendarConnections.userId,
      set: { status: "connected", organizerEligible: true, revokedAt: null, updatedAt: now },
    });
  await track(analyticsEvents.calendar_connected, { userId: current.id });
}

export async function disconnectCalendar() {
  const current = await requireMarketplaceUser();
  const db = await getDb();
  const now = await getNow();
  try {
    const { revokeGoogleCalendar } = await import("@/lib/integrations/google-calendar");
    await revokeGoogleCalendar(current.id);
  } catch {
    // Still disconnect locally if Google revoke fails.
  }
  await db
    .update(calendarConnections)
    .set({
      status: "revoked",
      organizerEligible: false,
      encryptedRefreshToken: null,
      encryptedAccessToken: null,
      revokedAt: now,
      updatedAt: now,
    })
    .where(eq(calendarConnections.userId, current.id));
  await track(analyticsEvents.calendar_disconnected, { userId: current.id });
}

export async function submitFeedback(input: {
  sessionId: string;
  toUserId: string;
  practiceAgain?: "yes" | "maybe" | "no";
  tags?: string[];
  privateImprovement?: string;
  testimonial?: string;
}) {
  const current = await requireMarketplaceUser();
  const db = await getDb();
  const now = await getNow();
  await db.insert(feedback).values({
    id: nanoid(),
    sessionId: input.sessionId,
    fromUserId: current.id,
    toUserId: input.toUserId,
    practiceAgain: input.practiceAgain || null,
    tagsJson: (input.tags || []).filter((tag) =>
      (positiveFeedbackTags as readonly string[]).includes(tag)
    ),
    privateImprovement: input.privateImprovement?.trim() || null,
    createdAt: now,
  });
  if (input.testimonial?.trim()) {
    await db.insert(testimonials).values({
      id: nanoid(),
      sessionId: input.sessionId,
      fromUserId: current.id,
      toUserId: input.toUserId,
      body: input.testimonial.trim(),
      recipientVisible: false,
      createdAt: now,
    });
  }
  await track(analyticsEvents.feedback_submitted, { userId: current.id });
}

export async function setTestimonialVisible(testimonialId: string, visible: boolean) {
  const current = await requireMarketplaceUser();
  const db = await getDb();
  await db
    .update(testimonials)
    .set({ recipientVisible: visible })
    .where(and(eq(testimonials.id, testimonialId), eq(testimonials.toUserId, current.id)));
  await track(analyticsEvents.testimonial_visibility_changed, {
    userId: current.id,
    properties: { visible },
  });
}

export async function mySettings() {
  const current = await requireMarketplaceUser();
  const db = await getDb();
  const [cal] = await db
    .select()
    .from(calendarConnections)
    .where(eq(calendarConnections.userId, current.id));
  const windows = await db
    .select()
    .from(availabilityWindows)
    .where(eq(availabilityWindows.userId, current.id));
  const topics = await db.select().from(userTopics).where(eq(userTopics.userId, current.id));
  const quotes = await db.select().from(testimonials).where(eq(testimonials.toUserId, current.id));
  const jobs = await db.select().from(employment).where(eq(employment.userId, current.id));
  const schools = await db.select().from(education).where(eq(education.userId, current.id));
  return {
    profile: current.profile,
    calendar: cal || null,
    windows,
    topics,
    testimonials: quotes,
    jobs,
    schools,
    fields: professionalFields,
    suggestedTopics: topicsForField(current.profile.fieldId),
  };
}

export async function deleteAccount() {
  const current = await requireSessionUser();
  const db = await getDb();
  const now = await getNow();
  await db.update(user).set({ deletedAt: now, email: `deleted+${current.id}@invalid.local`, updatedAt: now }).where(eq(user.id, current.id));
  await db
    .update(profiles)
    .set({
      onboardingComplete: false,
      openToBeInterviewed: false,
      openToInterviewOthers: false,
      fullName: "Deleted member",
      updatedAt: now,
    })
    .where(eq(profiles.userId, current.id));
  await track(analyticsEvents.account_deleted, { userId: current.id });
  const auth = await getAuth();
  await auth.api.signOut({ headers: await headers() });
}

export { professionalFields };
