import { productConfig } from "@/lib/config/product";

export function joinWindow(input: { startUtc: Date; endUtc: Date }) {
  const opensAt = new Date(
    input.startUtc.getTime() - productConfig.joinWindowBeforeMinutes * 60 * 1000
  );
  const closesAt = new Date(
    input.endUtc.getTime() + productConfig.joinWindowAfterMinutes * 60 * 1000
  );
  return { opensAt, closesAt };
}

export function isJoinWindowOpen(input: { startUtc: Date; endUtc: Date; now: Date }) {
  const { opensAt, closesAt } = joinWindow(input);
  return input.now.getTime() >= opensAt.getTime() && input.now.getTime() <= closesAt.getTime();
}

export function convertedOneWayTimes(startUtc: Date) {
  const endUtc = new Date(startUtc.getTime() + productConfig.interviewMeMinutes * 60 * 1000);
  return { startUtc, endUtc };
}

export function sessionDurationMinutes(format: "interview_me" | "reciprocal_swap") {
  return format === "reciprocal_swap"
    ? productConfig.reciprocalSwapMinutes
    : productConfig.interviewMeMinutes;
}

export function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart.getTime() < bEnd.getTime() && bStart.getTime() < aEnd.getTime();
}

export function attendanceOutcome(requester: "yes" | "no" | null, receiver: "yes" | "no" | null) {
  if (requester === "no" || receiver === "no") return "did_not_happen" as const;
  if (requester === "yes" && receiver === "yes") return "completed" as const;
  return "awaiting_attendance" as const;
}

export function interviewerIdsForCompletedSession(input: {
  format: "interview_me" | "reciprocal_swap";
  interviewerId: string | null;
  requesterId: string;
  receiverId: string;
}) {
  if (input.format === "reciprocal_swap") {
    return [input.requesterId, input.receiverId];
  }
  return input.interviewerId ? [input.interviewerId] : [input.receiverId];
}

export function interviewsConductedCopy(count: number) {
  if (count <= 0) return null;
  if (count === 1) return "1 interview conducted";
  return `${count} interviews conducted`;
}

export function helpedPeersCopy(count: number) {
  return interviewsConductedCopy(count);
}

export function twoWayEndFromStart(startUtc: Date) {
  return new Date(startUtc.getTime() + productConfig.reciprocalSwapMinutes * 60 * 1000);
}

export function activityLabel(lastMeaningfulAt: Date | null, now: Date) {
  if (!lastMeaningfulAt) return null;
  const days = (now.getTime() - lastMeaningfulAt.getTime()) / (24 * 60 * 60 * 1000);
  if (days <= productConfig.activityBuckets.thisWeekDays) return "Active this week";
  if (days <= productConfig.activityBuckets.thisMonthDays) return "Active this month";
  if (days <= 90) return "Recently active";
  return null;
}

export const experienceBands = [
  { value: "0-2", label: "0–2 years" },
  { value: "3-5", label: "3–5 years" },
  { value: "6-8", label: "6–8 years" },
  { value: "9+", label: "9+ years" },
] as const;

export function matchesExperienceBand(years: number, band?: string | null) {
  if (!band) return true;
  if (band === "0-2") return years >= 0 && years <= 2;
  if (band === "3-5") return years >= 3 && years <= 5;
  if (band === "6-8") return years >= 6 && years <= 8;
  if (band === "9+") return years >= 9;
  return true;
}
