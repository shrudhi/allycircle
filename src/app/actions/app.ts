"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  saveProfileSetup,
  addAvailabilityWindows,
  removeAvailabilityWindow,
  saveAvailabilityPeriod,
  connectMockCalendar,
  disconnectCalendar,
  submitFeedback,
  setTestimonialVisible,
  deleteAccount,
} from "@/lib/server/profile";
import { toggleSaveAlly } from "@/lib/server/allies";
import { createPracticeRequest, respondToRequest } from "@/lib/server/requests";
import {
  sendMessage,
  recordAttendance,
  cancelSession,
  joinSession,
  markNotificationsRead,
  proposeReschedule,
  respondToReschedule,
  superLikeAlly,
  proposeSessionTwoWay,
  respondSessionTwoWay,
} from "@/lib/server/sessions";
import { blockUser, reportUser } from "@/lib/server/moderation";
import { saveProfilePhoto } from "@/lib/server/photos";
import { requireSessionUser } from "@/lib/auth/session";
import { setNowOverride } from "@/lib/db";
import type { ReportReason } from "@/lib/domain/types";
import { isGoogleCalendarConfigured } from "@/lib/integrations/google-calendar";

export async function saveProfileAction(formData: FormData) {
  const topics = formData.getAll("topics").map(String).map((item) => item.trim()).filter(Boolean);
  const companies = formData.getAll("jobCompany").map(String);
  const titles = formData.getAll("jobTitle").map(String);
  const years = formData.getAll("jobYear").map(String);
  const jobs = companies.map((company, index) => ({
    company,
    title: titles[index] || "",
    year: years[index] || "",
  }));
  const schoolNames = formData.getAll("schoolName").map(String);
  const degrees = formData.getAll("schoolDegree").map(String);
  const courses = formData.getAll("schoolCourse").map(String);
  const schools = schoolNames.map((school, index) => ({
    school,
    degree: degrees[index] || "",
    course: courses[index] || "",
  }));
  await saveProfileSetup({
    fullName: String(formData.get("fullName") || ""),
    stage: String(formData.get("stage") || "working_professional"),
    fieldId: String(formData.get("fieldId") || ""),
    fieldCustom: String(formData.get("fieldCustom") || ""),
    experienceYears: Number(formData.get("experienceYears") || 0),
    targetRole: String(formData.get("targetRole") || ""),
    bio: String(formData.get("bio") || ""),
    linkedinUrl: String(formData.get("linkedinUrl") || ""),
    timezone: String(formData.get("timezone") || "UTC"),
    openToBeInterviewed: formData.get("openToBeInterviewed") === "on",
    openToInterviewOthers: formData.get("openToInterviewOthers") === "on",
    interviewPace: String(formData.get("interviewPace") || "active"),
    topics,
    jobs,
    schools,
  });
  const photo = formData.get("photo");
  if (photo instanceof File && photo.size > 0) {
    const current = await requireSessionUser();
    await saveProfilePhoto(current.id, photo);
  }
  const next = String(formData.get("next") || "/home");
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/home");
}

export async function toggleSaveAction(allyId: string) {
  await toggleSaveAlly(allyId);
  revalidatePath("/allies");
  revalidatePath(`/allies/${allyId}`);
}

export async function sendRequestAction(formData: FormData) {
  const result = await createPracticeRequest({
    allyId: String(formData.get("allyId")),
    message: String(formData.get("message") || ""),
    startIso: String(formData.get("startIso") || "") || undefined,
    openToTwoWay: formData.get("openToTwoWay") === "on",
  });
  redirect(`/practice/requests/${result.id}`);
}

export async function respondAction(formData: FormData) {
  const result = await respondToRequest({
    requestId: String(formData.get("requestId")),
    action: String(formData.get("action")) as
      | "accept"
      | "convert"
      | "decline"
      | "cancel"
      | "propose"
      | "propose_two_way"
      | "confirm_two_way",
    startIso: String(formData.get("startIso") || "") || undefined,
    acceptAsTwoWay: formData.get("acceptAsTwoWay") === "on",
  });
  if (result.ok && "sessionId" in result && result.sessionId) {
    redirect(`/practice/sessions/${result.sessionId}`);
  }
  revalidatePath("/practice");
}

export async function sendMessageAction(formData: FormData) {
  const otherId = String(formData.get("otherId"));
  const result = await sendMessage(otherId, String(formData.get("body") || ""));
  redirect(`/messages?id=${result.conversationId}`);
}

export async function replyMessageAction(formData: FormData) {
  await sendMessage(String(formData.get("otherId")), String(formData.get("body") || ""));
  revalidatePath("/messages");
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

export async function proposeRescheduleAction(formData: FormData) {
  await proposeReschedule(String(formData.get("sessionId")), String(formData.get("startIso") || ""));
  revalidatePath(`/practice/sessions/${String(formData.get("sessionId"))}`);
}

export async function respondRescheduleAction(formData: FormData) {
  await respondToReschedule(
    String(formData.get("sessionId")),
    String(formData.get("action")) as "accept" | "decline"
  );
  revalidatePath(`/practice/sessions/${String(formData.get("sessionId"))}`);
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
  revalidatePath("/record");
}

export async function availabilityAction(formData: FormData) {
  const weekday = Number(formData.get("weekday"));
  if (Number.isNaN(weekday) || weekday < 0 || weekday > 6) {
    throw new Error("Choose a day.");
  }
  const starts = formData.getAll("startTime").map(String);
  const ends = formData.getAll("endTime").map(String);
  const windows = starts.map((start, index) => {
    const startParts = start.split(":");
    const endParts = String(ends[index] || "").split(":");
    return {
      weekday,
      startMinutes: Number(startParts[0] || 0) * 60 + Number(startParts[1] || 0),
      endMinutes: Number(endParts[0] || 0) * 60 + Number(endParts[1] || 0),
    };
  });
  await addAvailabilityWindows(windows);
  revalidatePath("/settings");
}

export async function availabilityPeriodAction(formData: FormData) {
  await saveAvailabilityPeriod({
    from: String(formData.get("availableFrom") || "") || undefined,
    until: String(formData.get("availableUntil") || "") || undefined,
  });
  revalidatePath("/settings");
}

export async function removeAvailabilityAction(formData: FormData) {
  await removeAvailabilityWindow(String(formData.get("windowId")));
  revalidatePath("/settings");
}

export async function setClockAction(formData: FormData) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("The preview clock isn’t available in production.");
  }
  const intent = String(formData.get("intent") || "set");
  if (intent === "clear") {
    await setNowOverride(null);
  } else {
    const local = String(formData.get("nowLocal") || "");
    if (!local) throw new Error("Choose a time to jump the preview clock.");
    await setNowOverride(new Date(local).toISOString());
  }
  revalidatePath("/dev/clock");
  revalidatePath("/practice");
}

export async function connectCalendarAction() {
  if (isGoogleCalendarConfigured()) {
    redirect("/api/calendar/google/start");
  }
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

export async function respondSessionTwoWayAction(formData: FormData) {
  await respondSessionTwoWay(
    String(formData.get("sessionId")),
    String(formData.get("action")) as "accept" | "decline"
  );
  revalidatePath(`/practice/sessions/${String(formData.get("sessionId"))}`);
}

export async function proposeSessionTwoWayAction(formData: FormData) {
  await proposeSessionTwoWay(String(formData.get("sessionId")));
  revalidatePath(`/practice/sessions/${String(formData.get("sessionId"))}`);
}

export async function superLikeAction(formData: FormData) {
  await superLikeAlly(String(formData.get("sessionId")));
  revalidatePath(`/practice/sessions/${String(formData.get("sessionId"))}`);
  revalidatePath("/record");
}
