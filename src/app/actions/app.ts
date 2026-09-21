"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { saveProfileSetup, saveAvailability, connectMockCalendar, disconnectCalendar, submitFeedback, setTestimonialVisible, deleteAccount } from "@/lib/server/profile";
import { toggleSaveAlly } from "@/lib/server/allies";
import { createPracticeRequest, respondToRequest } from "@/lib/server/requests";
import { sendMessage, recordAttendance, cancelSession, joinSession, markNotificationsRead } from "@/lib/server/sessions";
import { blockUser, reportUser } from "@/lib/server/moderation";
import type { RequestFormat } from "@/lib/domain/types";
import type { ReportReason } from "@/lib/domain/types";

export async function saveProfileAction(formData: FormData) {
  const topics = formData.getAll("topics").map(String);
  await saveProfileSetup({
    fullName: String(formData.get("fullName") || ""),
    stage: String(formData.get("stage") || "working_professional"),
    fieldId: String(formData.get("fieldId") || ""),
    fieldCustom: String(formData.get("fieldCustom") || ""),
    currentTitle: String(formData.get("currentTitle") || ""),
    experienceYears: Number(formData.get("experienceYears") || 0),
    currentCompany: String(formData.get("currentCompany") || ""),
    targetRole: String(formData.get("targetRole") || ""),
    school: String(formData.get("school") || ""),
    degree: String(formData.get("degree") || ""),
    bio: String(formData.get("bio") || ""),
    linkedinUrl: String(formData.get("linkedinUrl") || ""),
    timezone: String(formData.get("timezone") || "UTC"),
    openToBeInterviewed: formData.get("openToBeInterviewed") === "on",
    openToInterviewOthers: formData.get("openToInterviewOthers") === "on",
    topics,
  });
  redirect("/home");
}

export async function toggleSaveAction(allyId: string) {
  await toggleSaveAlly(allyId);
  revalidatePath("/allies");
  revalidatePath(`/allies/${allyId}`);
}

export async function sendRequestAction(formData: FormData) {
  const result = await createPracticeRequest({
    allyId: String(formData.get("allyId")),
    format: String(formData.get("format")) as RequestFormat,
    message: String(formData.get("message") || ""),
    startIso: String(formData.get("startIso") || "") || undefined,
  });
  redirect(`/practice/requests/${result.id}`);
}

export async function respondAction(formData: FormData) {
  const result = await respondToRequest({
    requestId: String(formData.get("requestId")),
    action: String(formData.get("action")) as "accept" | "convert" | "decline" | "cancel" | "propose",
    startIso: String(formData.get("startIso") || "") || undefined,
  });
  if (result.ok && "sessionId" in result && result.sessionId) {
    redirect(`/practice/sessions/${result.sessionId}`);
  }
  revalidatePath("/practice");
}

export async function sendMessageAction(formData: FormData) {
  const otherId = String(formData.get("otherId"));
  const result = await sendMessage(otherId, String(formData.get("body") || ""));
  redirect(`/messages/${result.conversationId}`);
}

export async function replyMessageAction(formData: FormData) {
  await sendMessage(String(formData.get("otherId")), String(formData.get("body") || ""));
  revalidatePath(`/messages/${String(formData.get("conversationId"))}`);
}

export async function attendanceAction(formData: FormData) {
  await recordAttendance(String(formData.get("sessionId")), String(formData.get("happened")) as "yes" | "no");
  revalidatePath(`/practice/sessions/${String(formData.get("sessionId"))}`);
}

export async function cancelSessionAction(formData: FormData) {
  await cancelSession(String(formData.get("sessionId")));
  redirect("/practice");
}

export async function joinSessionAction(sessionId: string) {
  return joinSession(sessionId);
}

export async function feedbackAction(formData: FormData) {
  await submitFeedback({
    sessionId: String(formData.get("sessionId")),
    toUserId: String(formData.get("toUserId")),
    practiceAgain: (String(formData.get("practiceAgain") || "") || undefined) as "yes" | "maybe" | "no" | undefined,
    tags: formData.getAll("tags").map(String),
    privateImprovement: String(formData.get("privateImprovement") || ""),
    testimonial: String(formData.get("testimonial") || ""),
  });
  redirect("/practice");
}

export async function testimonialVisibilityAction(formData: FormData) {
  await setTestimonialVisible(String(formData.get("id")), formData.get("visible") === "on");
  revalidatePath("/settings");
}

export async function availabilityAction(formData: FormData) {
  const weekday = Number(formData.get("weekday"));
  const startHour = Number(formData.get("startHour"));
  const endHour = Number(formData.get("endHour"));
  const current = await (await import("@/lib/auth/session")).requireMarketplaceUser();
  const { getDb } = await import("@/lib/db");
  const { availabilityWindows } = await import("@/lib/db/schema");
  const { eq } = await import("drizzle-orm");
  const db = await getDb();
  const existing = await db
    .select()
    .from(availabilityWindows)
    .where(eq(availabilityWindows.userId, current.id));
  const windows = existing.map((window) => ({
    weekday: window.weekday,
    startMinutes: window.startMinutes,
    endMinutes: window.endMinutes,
  }));
  if (!Number.isNaN(weekday) && !Number.isNaN(startHour) && !Number.isNaN(endHour)) {
    windows.push({ weekday, startMinutes: startHour * 60, endMinutes: endHour * 60 });
  }
  await saveAvailability(windows);
  revalidatePath("/settings");
}

export async function connectCalendarAction() {
  await connectMockCalendar();
  revalidatePath("/settings");
}

export async function disconnectCalendarAction() {
  await disconnectCalendar();
  revalidatePath("/settings");
}

export async function blockAction(formData: FormData) {
  await blockUser(String(formData.get("userId")));
  redirect("/allies");
}

export async function reportAction(formData: FormData) {
  await reportUser({
    userId: String(formData.get("userId")),
    reason: String(formData.get("reason")) as ReportReason,
    description: String(formData.get("description") || ""),
  });
  revalidatePath("/allies");
}

export async function deleteAccountAction() {
  await deleteAccount();
  redirect("/");
}

export async function markReadAction() {
  await markNotificationsRead();
  revalidatePath("/notifications");
}
