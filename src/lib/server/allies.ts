import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { productConfig } from "@/lib/config/product";
import { professionalFields, resolveProfessionalField } from "@/lib/config/fields";
import { suggestedTopics } from "@/lib/config/topics";
import { analyticsEvents } from "@/lib/analytics/taxonomy";
import { markMeaningful, track } from "@/lib/analytics/track";
import { requireMarketplaceUser, requireSessionUser } from "@/lib/auth/session";
import { getDb, getNow } from "@/lib/db";
import {
  availabilityWindows,
  conversations,
  education,
  employment,
  feedback,
  practiceRequests,
  practiceSessions,
  profiles,
  recommendationLogs,
  savedAllies,
  superLikes,
  testimonials,
  userTopics,
} from "@/lib/db/schema";
import { canInterview, canOfferReciprocalSwap } from "@/lib/domain/eligibility";
import { matchReasons, rankAllies } from "@/lib/domain/ranking";
import {
  activityLabel,
  interviewsConductedCopy,
  interviewerIdsForCompletedSession,
  matchesExperienceBand,
} from "@/lib/domain/scheduling";
import { weekdayInTimeZone } from "@/lib/domain/timezone";
import { pairAllowed } from "@/lib/server/safety";

async function pastConnectionIds(userId: string) {
  const db = await getDb();
  const ids = new Set<string>();
  const sessions = await db.select().from(practiceSessions);
  for (const row of sessions) {
    if (row.requesterId === userId) ids.add(row.receiverId);
    if (row.receiverId === userId) ids.add(row.requesterId);
  }
  const requests = await db.select().from(practiceRequests);
  for (const row of requests) {
    if (row.requesterId === userId) ids.add(row.receiverId);
    if (row.receiverId === userId) ids.add(row.requesterId);
  }
  const threads = await db.select().from(conversations);
  for (const row of threads) {
    if (row.userLowId === userId) ids.add(row.userHighId);
    if (row.userHighId === userId) ids.add(row.userLowId);
  }
  ids.delete(userId);
  return ids;
}

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
  experienceBand?: string;
  company?: string;
  topic?: string;
  availability?: string;
  format?: "interview_me" | "reciprocal_swap";
  tab?: "for-you" | "connected" | "saved";
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
  const connectedIds = input.tab === "connected" ? await pastConnectionIds(current.id) : null;
  const jobs = await db.select().from(employment);
  const windows = await db.select().from(availabilityWindows);
  const viewerPerson = {
    id: viewer.userId,
    fieldId: viewer.fieldId,
    fieldCustom: viewer.fieldCustom,
    experienceYears: viewer.experienceYears,
    openToBeInterviewed: viewer.openToBeInterviewed,
    openToInterviewOthers: viewer.openToInterviewOthers,
  };

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
    if (!canInterview(person, viewerPerson, true)) continue;
    if (input.tab === "saved" && !savedIds.has(ally.userId)) continue;
    if (input.tab === "connected" && !connectedIds?.has(ally.userId)) continue;
    if (input.fieldId && ally.fieldId !== input.fieldId) continue;
    if (!matchesExperienceBand(ally.experienceYears, input.experienceBand)) continue;
    const allyJobs = jobs.filter((job) => job.userId === ally.userId);
    if (input.company) {
      const needle = input.company.toLowerCase();
      const companyHit =
        (ally.currentCompany || "").toLowerCase().includes(needle) ||
        allyJobs.some((job) => job.company.toLowerCase().includes(needle));
      if (!companyHit) continue;
    }
    const allyTopics = topics.filter((topic) => topic.userId === ally.userId);
    const allyWindows = windows.filter((row) => row.userId === ally.userId);
    const canSwap = canOfferReciprocalSwap(viewerPerson, person, true);
    if (input.format === "reciprocal_swap" && (!canSwap || !ally.openToBeInterviewed || !ally.openToInterviewOthers)) {
      continue;
    }
    if (input.availability) {
      if (!allyWindows.length) continue;
      if (input.availability === "today") {
        const weekday = weekdayInTimeZone(now, ally.timezone);
        if (!allyWindows.some((row) => row.weekday === weekday)) continue;
      } else if (input.availability !== "week" && /^[0-6]$/.test(input.availability)) {
        const weekday = Number(input.availability);
        if (!allyWindows.some((row) => row.weekday === weekday)) continue;
      }
    }
    if (input.topic) {
      const needle = input.topic.toLowerCase();
      const topicHit =
        allyTopics.some((topic) => topic.label.toLowerCase().includes(needle)) ||
        fieldLabel(ally.fieldId, ally.fieldCustom).toLowerCase().includes(needle) ||
        (ally.currentTitle || "").toLowerCase().includes(needle);
      if (!topicHit) continue;
    }
    const haystack = [
      ally.fullName,
      ally.currentTitle,
      ally.currentCompany,
      fieldLabel(ally.fieldId, ally.fieldCustom),
      ...allyTopics.map((topic) => topic.label),
      ...allyJobs.map((job) => `${job.company} ${job.title || ""}`),
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
        hasUpcomingAvailability: windows.some((row) => row.userId === ally.userId),
        recentPageOneImpressions: 0,
        interviewPaceActive: ally.interviewPace !== "casual",
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
    const hasWindows = windows.some((item) => item.userId === row.ally.userId);
    const reasons = matchReasons({
      fieldLabel: fieldLabel(row.ally.fieldId, row.ally.fieldCustom),
      experienceYears: row.ally.experienceYears,
      lastMeaningfulAt: row.ally.lastMeaningfulAt,
      overlappingTopics: overlap,
      now,
      interviewPace: row.ally.interviewPace,
      availableThisWeek: hasWindows,
      currentTitle: row.ally.currentTitle,
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
      activity: activityLabel(row.ally.lastMeaningfulAt, now),
      helpedCopy: interviewsConductedCopy(helped),
      interviewsConducted: helped,
      linkedinUrl: row.ally.linkedinUrl,
      openToTwoWay: row.ally.openToBeInterviewed && row.ally.openToInterviewOthers,
      topics: row.allyTopics.map((topic) => topic.label).slice(0, 4),
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
    topics: suggestedTopics,
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
      interviewPace: ally.interviewPace,
      currentTitle: ally.currentTitle,
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
  const likes = await db.select().from(superLikes).where(eq(superLikes.toUserId, allyId));
  return {
    ally,
    fieldLabel: fieldLabel(ally.fieldId, ally.fieldCustom),
    education: edus,
    employment: jobs,
    topics: topics.map((topic) => topic.label),
    saved: saved.length > 0,
    helpedCopy: interviewsConductedCopy(helped),
    interviewsConducted: helped,
    activity: activityLabel(ally.lastMeaningfulAt, now),
    openToTwoWay: ally.openToBeInterviewed && ally.openToInterviewOthers,
    testimonials: quotes,
    reasons,
    canSwap,
    takingABreak: !ally.openToBeInterviewed && !ally.openToInterviewOthers,
    interviewPace: ally.interviewPace,
    superLikeCount: likes.length,
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
  const allSessions = [...upcoming, ...upcomingB].filter(
    (row, index, all) => all.findIndex((item) => item.id === row.id) === index
  );
  const sessions = allSessions
    .filter((row) => row.state === "scheduled")
    .filter((row) => row.endUtc.getTime() >= now.getTime())
    .sort((a, b) => a.startUtc.getTime() - b.startUtc.getTime());
  const next = sessions[0] || null;
  const people = await db.select().from(profiles);
  const otherId = next
    ? next.requesterId === current.id
      ? next.receiverId
      : next.requesterId
    : null;
  return {
    needsOnboarding: false as const,
    name: current.profile.fullName,
    fieldLabel: fieldLabel(current.profile.fieldId, current.profile.fieldCustom),
    nextSession: next
      ? {
          ...next,
          otherName: people.find((row) => row.userId === otherId)?.fullName || "Ally",
          otherId,
        }
      : null,
    takingABreak: !current.profile.openToBeInterviewed && !current.profile.openToInterviewOthers,
    isNew: allSessions.length === 0,
  };
}

export async function getRecordData() {
  const current = await requireMarketplaceUser();
  const db = await getDb();
  const interviewsGiven = await interviewsConductedCount(current.id);
  const requests = await db.select().from(practiceRequests);
  const people = await db.select().from(profiles);
  const nameFor = (userId: string) => people.find((row) => row.userId === userId)?.fullName || "Ally";
  const mine = requests.filter((row) => row.requesterId === current.id || row.receiverId === current.id);
  const pending = mine
    .filter((row) => ["pending", "alternate_time_proposed", "time_unavailable"].includes(row.state))
    .map((row) => ({
      ...row,
      otherName: nameFor(row.requesterId === current.id ? row.receiverId : row.requesterId),
      direction: row.requesterId === current.id ? "sent" : "received",
    }));
  const notes = await db.select().from(feedback).where(eq(feedback.toUserId, current.id));
  const quotes = await db.select().from(testimonials).where(eq(testimonials.toUserId, current.id));
  const likes = await db.select().from(superLikes).where(eq(superLikes.toUserId, current.id));
  return {
    interviewsGiven,
    pending,
    feedback: notes.map((row) => ({
      ...row,
      fromName: nameFor(row.fromUserId),
    })),
    testimonials: quotes,
    superLikeCount: likes.length,
  };
}

export { fieldLabel };
