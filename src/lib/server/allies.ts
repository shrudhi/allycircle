import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { productConfig } from "@/lib/config/product";
import { professionalFields, resolveProfessionalField } from "@/lib/config/fields";
import { analyticsEvents } from "@/lib/analytics/taxonomy";
import { markMeaningful, track } from "@/lib/analytics/track";
import { requireMarketplaceUser, requireSessionUser } from "@/lib/auth/session";
import { getDb, getNow } from "@/lib/db";
import {
  employment,
  education,
  practiceSessions,
  profiles,
  recommendationLogs,
  savedAllies,
  testimonials,
  userTopics,
} from "@/lib/db/schema";
import { canInterview, canOfferReciprocalSwap } from "@/lib/domain/eligibility";
import { matchReasons, rankAllies } from "@/lib/domain/ranking";
import { helpedPeersCopy, interviewerIdsForCompletedSession } from "@/lib/domain/scheduling";
import { pairAllowed } from "@/lib/server/safety";

function fieldLabel(fieldId: string, fieldCustom?: string | null) {
  return resolveProfessionalField({ fieldId, fieldCustom }).label;
}

export async function interviewsConductedCount(userId: string) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(practiceSessions)
    .where(eq(practiceSessions.state, "completed"));
  return rows.filter((row) =>
    interviewerIdsForCompletedSession({
      format: row.format as "interview_me" | "reciprocal_swap",
      interviewerId: row.interviewerId,
      requesterId: row.requesterId,
      receiverId: row.receiverId,
    }).includes(userId)
  ).length;
}

export async function publicTestimonials(userId: string) {
  const db = await getDb();
  return db
    .select()
    .from(testimonials)
    .where(and(eq(testimonials.toUserId, userId), eq(testimonials.recipientVisible, true)));
}

export async function findAllies(input: {
  query?: string;
  fieldId?: string;
  minExperience?: number;
  company?: string;
  topic?: string;
  tab?: "for-you" | "active" | "saved";
  cursor?: string | null;
}) {
  const current = await requireMarketplaceUser();
  const db = await getDb();
  const now = await getNow();
  const viewer = current.profile;
  const allProfiles = await db.select().from(profiles);
  const topics = await db.select().from(userTopics);
  const saved = await db.select().from(savedAllies).where(eq(savedAllies.viewerId, current.id));
  const savedIds = new Set(saved.map((row) => row.allyId));

  const eligible: { ally: typeof allProfiles[number]; allyTopics: typeof topics }[] = [];
  for (const ally of allProfiles) {
    if (ally.userId === current.id) continue;
    if (!ally.onboardingComplete) continue;
    if (!(await pairAllowed(current.id, ally.userId))) continue;
    const person = {
      id: ally.userId,
      fieldId: ally.fieldId,
      fieldCustom: ally.fieldCustom,
      experienceYears: ally.experienceYears,
      openToBeInterviewed: ally.openToBeInterviewed,
      openToInterviewOthers: ally.openToInterviewOthers,
    };
    if (!canInterview(person, {
      id: viewer.userId,
      fieldId: viewer.fieldId,
      fieldCustom: viewer.fieldCustom,
      experienceYears: viewer.experienceYears,
      openToBeInterviewed: viewer.openToBeInterviewed,
      openToInterviewOthers: viewer.openToInterviewOthers,
    }, true)) {
      continue;
    }
    if (input.tab === "saved" && !savedIds.has(ally.userId)) continue;
    if (input.tab === "active") {
      if (!ally.lastMeaningfulAt) continue;
      const days = (now.getTime() - ally.lastMeaningfulAt.getTime()) / (24 * 60 * 60 * 1000);
      if (days > 7) continue;
    }
    if (input.fieldId && ally.fieldId !== input.fieldId) continue;
    if (typeof input.minExperience === "number" && ally.experienceYears < input.minExperience) continue;
    if (input.company) {
      if (!ally.currentCompany || ally.currentCompany.toLowerCase() !== input.company.toLowerCase()) continue;
    }
    const allyTopics = topics.filter((topic) => topic.userId === ally.userId);
    if (input.topic) {
      const needle = input.topic.toLowerCase();
      if (!allyTopics.some((topic) => topic.label.toLowerCase().includes(needle))) continue;
    }
    const haystack = [
      ally.fullName,
      ally.currentTitle,
      ally.currentCompany,
      fieldLabel(ally.fieldId, ally.fieldCustom),
      ...allyTopics.map((topic) => topic.label),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (input.query && !haystack.includes(input.query.toLowerCase())) continue;
    eligible.push({ ally, allyTopics });
  }

  const viewerTopics = topics.filter((topic) => topic.userId === current.id).map((topic) => topic.label);
  const ranked = rankAllies(
    eligible.map(({ ally, allyTopics }) => {
      const overlap = allyTopics.filter((topic) =>
        viewerTopics.some((label) => label.toLowerCase() === topic.label.toLowerCase())
      );
      return {
        id: ally.userId,
        fieldMatch: true,
        targetRoleAligned: Boolean(
          viewer.targetRole &&
            (ally.currentTitle || "").toLowerCase().includes(viewer.targetRole.toLowerCase())
        ),
        lastMeaningfulAt: ally.lastMeaningfulAt,
        experienceYears: ally.experienceYears,
        viewerExperienceYears: viewer.experienceYears,
        topicOverlapCount: overlap.length,
        hasDeclaredTopics: allyTopics.length > 0,
        hasUpcomingAvailability: true,
        recentPageOneImpressions: 0,
      };
    }),
    now
  );

  const ordered = ranked
    .map((item) => eligible.find((row) => row.ally.userId === item.ally.id)!)
    .filter(Boolean);
  let start = 0;
  if (input.cursor) {
    const index = ordered.findIndex((row) => row.ally.userId === input.cursor);
    start = index >= 0 ? index + 1 : 0;
  }
  const page = ordered.slice(start, start + productConfig.resultsPageSize);
  const nextCursor = page.length === productConfig.resultsPageSize ? page.at(-1)?.ally.userId : null;

  const cards = [];
  for (const [index, row] of page.entries()) {
    const helped = await interviewsConductedCount(row.ally.userId);
    const overlap = row.allyTopics
      .map((topic) => topic.label)
      .filter((label) => viewerTopics.some((item) => item.toLowerCase() === label.toLowerCase()));
    const reasons = matchReasons({
      fieldLabel: fieldLabel(row.ally.fieldId, row.ally.fieldCustom),
      experienceYears: row.ally.experienceYears,
      lastMeaningfulAt: row.ally.lastMeaningfulAt,
      overlappingTopics: overlap,
      now,
    });
    await db.insert(recommendationLogs).values({
      id: nanoid(),
      viewerId: current.id,
      allyId: row.ally.userId,
      rankPosition: start + index + 1,
      reasonCodes: reasons.map((reason) => reason.code),
      rankingVersion: productConfig.rankingVersion,
      createdAt: now,
    });
    cards.push({
      id: row.ally.userId,
      name: row.ally.fullName,
      title: row.ally.currentTitle,
      company: row.ally.currentCompany,
      experienceYears: row.ally.experienceYears,
      fieldLabel: fieldLabel(row.ally.fieldId, row.ally.fieldCustom),
      photoPath: row.ally.photoPath,
      activity: row.ally.lastMeaningfulAt && now.getTime() - row.ally.lastMeaningfulAt.getTime() < 7 * 86400000
        ? "Active this week"
        : row.ally.lastMeaningfulAt && now.getTime() - row.ally.lastMeaningfulAt.getTime() < 30 * 86400000
          ? "Active this month"
          : null,
      helpedCopy: helpedPeersCopy(helped),
      reasons,
      saved: savedIds.has(row.ally.userId),
      canSwap: canOfferReciprocalSwap(
        {
          id: current.id,
          fieldId: viewer.fieldId,
          fieldCustom: viewer.fieldCustom,
          experienceYears: viewer.experienceYears,
          openToBeInterviewed: viewer.openToBeInterviewed,
          openToInterviewOthers: viewer.openToInterviewOthers,
        },
        {
          id: row.ally.userId,
          fieldId: row.ally.fieldId,
          fieldCustom: row.ally.fieldCustom,
          experienceYears: row.ally.experienceYears,
          openToBeInterviewed: row.ally.openToBeInterviewed,
          openToInterviewOthers: row.ally.openToInterviewOthers,
        },
        true
      ),
      isTestUser: row.ally.isTestUser,
    });
  }

  await track(cards.length ? analyticsEvents.ally_search_viewed : analyticsEvents.ally_search_empty, {
    userId: current.id,
    properties: { count: cards.length, tab: input.tab || "for-you" },
  });

  return {
    cards,
    nextCursor,
    viewerField: fieldLabel(viewer.fieldId, viewer.fieldCustom),
    fields: professionalFields,
  };
}

export async function getAllyProfile(allyId: string) {
  const current = await requireMarketplaceUser();
  const db = await getDb();
  const now = await getNow();
  if (!(await pairAllowed(current.id, allyId))) {
    throw new Error("This ally isn’t available.");
  }
  const [ally] = await db.select().from(profiles).where(eq(profiles.userId, allyId)).limit(1);
  if (!ally || !ally.onboardingComplete) throw new Error("We couldn’t find that profile.");
  const [edus, jobs, topics, saved] = await Promise.all([
    db.select().from(education).where(eq(education.userId, allyId)),
    db.select().from(employment).where(eq(employment.userId, allyId)),
    db.select().from(userTopics).where(eq(userTopics.userId, allyId)),
    db
      .select()
      .from(savedAllies)
      .where(and(eq(savedAllies.viewerId, current.id), eq(savedAllies.allyId, allyId))),
  ]);
  const helped = await interviewsConductedCount(allyId);
  const quotes = await publicTestimonials(allyId);
  const viewerTopics = await db.select().from(userTopics).where(eq(userTopics.userId, current.id));
  const overlap = topics
    .map((topic) => topic.label)
    .filter((label) => viewerTopics.some((item) => item.label.toLowerCase() === label.toLowerCase()));
  const reasons = matchReasons({
    fieldLabel: fieldLabel(ally.fieldId, ally.fieldCustom),
    experienceYears: ally.experienceYears,
    lastMeaningfulAt: ally.lastMeaningfulAt,
    overlappingTopics: overlap,
    now,
  });
  const canSwap = canOfferReciprocalSwap(
    {
      id: current.id,
      fieldId: current.profile.fieldId,
      fieldCustom: current.profile.fieldCustom,
      experienceYears: current.profile.experienceYears,
      openToBeInterviewed: current.profile.openToBeInterviewed,
      openToInterviewOthers: current.profile.openToInterviewOthers,
    },
    {
      id: ally.userId,
      fieldId: ally.fieldId,
      fieldCustom: ally.fieldCustom,
      experienceYears: ally.experienceYears,
      openToBeInterviewed: ally.openToBeInterviewed,
      openToInterviewOthers: ally.openToInterviewOthers,
    },
    true
  );
  await track(analyticsEvents.ally_profile_viewed, { userId: current.id, properties: { allyId } });
  return {
    ally,
    fieldLabel: fieldLabel(ally.fieldId, ally.fieldCustom),
    education: edus,
    employment: jobs,
    topics: topics.map((topic) => topic.label),
    saved: saved.length > 0,
    helpedCopy: helpedPeersCopy(helped),
    testimonials: quotes,
    reasons,
    canSwap,
    takingABreak: !ally.openToBeInterviewed && !ally.openToInterviewOthers,
  };
}

export async function toggleSaveAlly(allyId: string) {
  const current = await requireMarketplaceUser();
  const db = await getDb();
  const now = await getNow();
  const existing = await db
    .select()
    .from(savedAllies)
    .where(and(eq(savedAllies.viewerId, current.id), eq(savedAllies.allyId, allyId)));
  if (existing.length) {
    await db
      .delete(savedAllies)
      .where(and(eq(savedAllies.viewerId, current.id), eq(savedAllies.allyId, allyId)));
    await track(analyticsEvents.ally_unsaved, { userId: current.id, properties: { allyId } });
    return { saved: false };
  }
  await db.insert(savedAllies).values({ viewerId: current.id, allyId, createdAt: now });
  await markMeaningful(current.id);
  await track(analyticsEvents.ally_saved, { userId: current.id, properties: { allyId } });
  return { saved: true };
}

export async function getHomeData() {
  const current = await requireSessionUser();
  if (!current.profile?.onboardingComplete) {
    return { needsOnboarding: true as const };
  }
  const db = await getDb();
  const now = await getNow();
  const upcoming = await db
    .select()
    .from(practiceSessions)
    .where(eq(practiceSessions.requesterId, current.id));
  const upcomingB = await db
    .select()
    .from(practiceSessions)
    .where(eq(practiceSessions.receiverId, current.id));
  const sessions = [...upcoming, ...upcomingB]
    .filter((row, index, all) => all.findIndex((item) => item.id === row.id) === index)
    .filter((row) => row.state === "scheduled" || row.state === "awaiting_attendance")
    .filter((row) => row.endUtc.getTime() + 30 * 60 * 1000 >= now.getTime())
    .sort((a, b) => a.startUtc.getTime() - b.startUtc.getTime());
  return {
    needsOnboarding: false as const,
    name: current.profile.fullName,
    nextSession: sessions[0] || null,
    takingABreak: !current.profile.openToBeInterviewed && !current.profile.openToInterviewOthers,
  };
}

export { fieldLabel };
