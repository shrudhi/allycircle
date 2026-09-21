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

export function helpedPeersCopy(count: number) {
  if (count <= 0) return null;
  if (count === 1) return "Helped 1 peer practice";
  return `Helped ${count} peers practice`;
}
