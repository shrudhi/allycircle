import type { RequestFormat } from "@/lib/domain/types";

export const interviewPaceOptions = [
  { value: "active", label: "Actively interviewing", hint: "I’m in a live search and want regular practice." },
  { value: "casual", label: "Casually practicing", hint: "I’m keeping skills sharp, not in a rush." },
] as const;

export type InterviewPace = (typeof interviewPaceOptions)[number]["value"];

export function interviewPaceLabel(pace?: string | null) {
  if (pace === "casual") return "Casually practicing";
  return "Actively interviewing";
}

export function formatLabel(format: string, style: "short" | "detail" = "short") {
  if (format === "reciprocal_swap") {
    return style === "detail" ? "Two-way (60 min)" : "Two-way";
  }
  return style === "detail" ? "Interview Me (30 min)" : "Interview Me";
}

export function formatHint(format: RequestFormat) {
  if (format === "reciprocal_swap") {
    return "You each interview the other for 30 minutes after both of you agree.";
  }
  return "They interview you for 30 minutes.";
}

export function requestStateLabel(state: string) {
  const labels: Record<string, string> = {
    pending: "Waiting for a reply",
    alternate_time_proposed: "New time suggested",
    accepted: "Confirmed",
    converted_to_one_way: "Confirmed as 30 min",
    declined: "Declined",
    cancelled: "Withdrawn",
    expired: "Expired",
    time_unavailable: "That time was taken",
  };
  return labels[state] || state.replaceAll("_", " ");
}

export function sessionStateLabel(state: string) {
  const labels: Record<string, string> = {
    scheduled: "Upcoming",
    awaiting_attendance: "Did you meet?",
    completed: "Completed",
    cancelled: "Cancelled",
    did_not_happen: "Didn’t happen",
  };
  return labels[state] || state.replaceAll("_", " ");
}
