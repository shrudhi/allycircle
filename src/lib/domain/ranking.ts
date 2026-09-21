import { productConfig } from "@/lib/config/product";

export type RankableAlly = {
  id: string;
  fieldMatch: boolean;
  targetRoleAligned: boolean;
  lastMeaningfulAt: Date | null;
  experienceYears: number;
  viewerExperienceYears: number;
  topicOverlapCount: number;
  hasDeclaredTopics: boolean;
  hasUpcomingAvailability: boolean;
  recentPageOneImpressions: number;
  interviewPaceActive?: boolean;
};

export type MatchReason = {
  code: string;
  label: string;
};

export function activityScore(lastMeaningfulAt: Date | null, now: Date) {
  if (!lastMeaningfulAt) return 0;
  const days = (now.getTime() - lastMeaningfulAt.getTime()) / (24 * 60 * 60 * 1000);
  if (days <= productConfig.activityBuckets.thisWeekDays) return 1;
  if (days <= productConfig.activityBuckets.thisMonthDays) return 0.45;
  if (days <= 90) return 0.15;
  return 0;
}

export function experienceFitScore(allyYears: number, viewerYears: number) {
  const delta = allyYears - viewerYears;
  if (delta < 0) return 0;
  if (delta === 0) return 0.85;
  if (delta <= 3) return 1;
  if (delta <= 6) return 0.7;
  return 0.45;
}

export function rankAllies(allies: RankableAlly[], now: Date) {
  const weights = productConfig.rankingWeights;
  return [...allies]
    .map((ally) => {
      const activity = activityScore(ally.lastMeaningfulAt, now);
      const experience = experienceFitScore(ally.experienceYears, ally.viewerExperienceYears);
      const topic = ally.hasDeclaredTopics ? Math.min(1, ally.topicOverlapCount / 3) : 0;
      const availability = ally.hasUpcomingAvailability ? 1 : 0;
      const pace = ally.interviewPaceActive ? 1 : 0.35;
      const freshnessPenalty = Math.min(1, ally.recentPageOneImpressions / 8);
      const score =
        (ally.fieldMatch ? 1 : 0) * weights.fieldAndTarget +
        (ally.targetRoleAligned ? 0.35 : 0) * weights.fieldAndTarget +
        activity * weights.activity +
        experience * weights.experienceFit +
        topic * weights.topicOverlap +
        pace * weights.interviewPace +
        availability * weights.availability -
        freshnessPenalty * weights.freshnessBalance;
      return { ally, score };
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.ally.id.localeCompare(b.ally.id);
    });
}

export function matchReasons(input: {
  fieldLabel: string;
  experienceYears: number;
  lastMeaningfulAt: Date | null;
  overlappingTopics: string[];
  now: Date;
  interviewPace?: string | null;
  availableThisWeek?: boolean;
  currentTitle?: string | null;
}): MatchReason[] {
  const years =
    input.experienceYears >= 10
      ? "10+ years"
      : `${input.experienceYears} year${input.experienceYears === 1 ? "" : "s"}`;
  const reasons: MatchReason[] = [
    {
      code: "experience",
      label: input.currentTitle
        ? `${input.currentTitle} · ${years} in ${input.fieldLabel}`
        : `${years} in ${input.fieldLabel}`,
    },
  ];
  if (input.overlappingTopics[0]) {
    reasons.push({ code: "topic", label: input.overlappingTopics[0] });
  }
  const activity = activityScore(input.lastMeaningfulAt, input.now);
  if (activity >= 1) {
    reasons.push({ code: "active_week", label: "Active this week" });
  } else if (activity >= 0.45) {
    reasons.push({ code: "active_month", label: "Active this month" });
  }
  if (input.availableThisWeek) {
    reasons.push({ code: "available", label: "Available this week" });
  }
  return reasons.slice(0, 3);
}
