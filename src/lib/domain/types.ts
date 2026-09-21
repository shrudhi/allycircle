import { productConfig } from "@/lib/config/product";

export type CareerStage =
  | "student"
  | "intern"
  | "working_professional"
  | "between_roles";

export type RequestFormat = "interview_me" | "reciprocal_swap";

export type RequestState =
  | "draft"
  | "pending"
  | "alternate_time_proposed"
  | "accepted"
  | "converted_to_one_way"
  | "declined"
  | "cancelled"
  | "expired"
  | "time_unavailable";

export type SessionState =
  | "scheduled"
  | "awaiting_attendance"
  | "completed"
  | "cancelled"
  | "did_not_happen";

export type AttendanceAnswer = "yes" | "no";

export type PracticeAgain = "yes" | "maybe" | "no";

export type MeetProvisionState = "pending" | "ready" | "failed" | "not_applicable";

export const positiveFeedbackTags = [
  "Supportive",
  "Good questions",
  "Constructive feedback",
  "Well prepared",
  "Helpful conversation",
] as const;

export type PositiveFeedbackTag = (typeof positiveFeedbackTags)[number];

export const reportReasons = [
  "inappropriate_behavior",
  "spam",
  "harassment",
  "fake_or_misleading_profile",
  "other",
] as const;

export type ReportReason = (typeof reportReasons)[number];

export const reportReasonLabels: Record<ReportReason, string> = {
  inappropriate_behavior: "Inappropriate behavior",
  spam: "Spam",
  harassment: "Harassment",
  fake_or_misleading_profile: "Fake or misleading profile",
  other: "Another reason",
};

export const careerStageLabels: Record<CareerStage, string> = {
  student: "Student",
  intern: "Intern",
  working_professional: "Working professional",
  between_roles: "Between roles",
};

export function experienceLabel(years: number) {
  if (years >= 10) return "10+ years relevant experience";
  if (years === 1) return "1 year relevant experience";
  return `${years} years relevant experience`;
}

export function isTakingABreak(prefs: {
  openToBeInterviewed: boolean;
  openToInterviewOthers: boolean;
}) {
  return !prefs.openToBeInterviewed && !prefs.openToInterviewOthers;
}

export function requestExpiryAt(input: {
  createdAt: Date;
  proposedStartUtc?: Date | null;
  now?: Date;
}) {
  const fromCreated = new Date(
    input.createdAt.getTime() + productConfig.requestExpiryDays * 24 * 60 * 60 * 1000
  );
  if (!input.proposedStartUtc) return fromCreated;
  return fromCreated.getTime() <= input.proposedStartUtc.getTime()
    ? fromCreated
    : input.proposedStartUtc;
}

export function isRequestExpired(input: {
  createdAt: Date;
  proposedStartUtc?: Date | null;
  now: Date;
}) {
  return input.now.getTime() >= requestExpiryAt(input).getTime();
}
