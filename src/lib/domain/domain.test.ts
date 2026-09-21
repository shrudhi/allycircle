import { describe, expect, it } from "vitest";
import { fieldsSharePracticeArea, resolveProfessionalField } from "@/lib/config/fields";
import { canInterview, canOfferReciprocalSwap } from "@/lib/domain/eligibility";
import { rankAllies } from "@/lib/domain/ranking";
import {
  attendanceOutcome,
  convertedOneWayTimes,
  helpedPeersCopy,
  interviewerIdsForCompletedSession,
  isJoinWindowOpen,
  rangesOverlap,
} from "@/lib/domain/scheduling";
import { isRequestExpired, isTakingABreak } from "@/lib/domain/types";

const pm = {
  fieldId: "product-management",
  fieldCustom: null,
  experienceYears: 5,
  openToBeInterviewed: true,
  openToInterviewOthers: true,
};

describe("professional field matching", () => {
  it("maps alias free-text onto a canonical field", () => {
    const resolved = resolveProfessionalField({ fieldId: "other", fieldCustom: "PM" });
    expect(resolved.fieldId).toBe("product-management");
    expect(fieldsSharePracticeArea(resolved, { fieldId: "product-management" })).toBe(true);
  });

  it("keeps unique custom fields matching only the same custom text", () => {
    const a = resolveProfessionalField({ fieldId: "other", fieldCustom: "Climate Policy" });
    const b = resolveProfessionalField({ fieldId: "other", fieldCustom: "climate policy" });
    const c = resolveProfessionalField({ fieldId: "other", fieldCustom: "Sports Analytics" });
    expect(fieldsSharePracticeArea(a, b)).toBe(true);
    expect(fieldsSharePracticeArea(a, c)).toBe(false);
  });
});

describe("eligibility", () => {
  it("allows a more experienced interviewer in the same field", () => {
    expect(
      canInterview(
        { id: "a", ...pm, experienceYears: 7 },
        { id: "b", ...pm, experienceYears: 3 },
        true
      )
    ).toBe(true);
  });

  it("rejects a less experienced interviewer even with matching topics", () => {
    expect(
      canInterview(
        { id: "a", ...pm, experienceYears: 2 },
        { id: "b", ...pm, experienceYears: 6 },
        true
      )
    ).toBe(false);
  });

  it("does not let a paused interviewer receive new matching", () => {
    expect(
      canInterview(
        {
          id: "a",
          ...pm,
          openToBeInterviewed: false,
          openToInterviewOthers: false,
        },
        { id: "b", ...pm },
        true
      )
    ).toBe(false);
    expect(isTakingABreak({ openToBeInterviewed: false, openToInterviewOthers: false })).toBe(true);
  });

  it("gates reciprocal swap on mutual qualification", () => {
    const senior = { id: "a", ...pm, experienceYears: 8 };
    const junior = { id: "b", ...pm, experienceYears: 2 };
    expect(canOfferReciprocalSwap(senior, junior, true)).toBe(false);
    expect(canOfferReciprocalSwap(senior, { id: "c", ...pm, experienceYears: 8 }, true)).toBe(true);
  });
});

describe("ranking", () => {
  it("never uses missing topics as a rejection and keeps new users competitive", () => {
    const now = new Date("2026-09-21T12:00:00Z");
    const ranked = rankAllies(
      [
        {
          id: "new-no-topics",
          fieldMatch: true,
          targetRoleAligned: true,
          lastMeaningfulAt: now,
          experienceYears: 6,
          viewerExperienceYears: 5,
          topicOverlapCount: 0,
          hasDeclaredTopics: false,
          hasUpcomingAvailability: false,
          recentPageOneImpressions: 0,
        },
        {
          id: "overlap",
          fieldMatch: true,
          targetRoleAligned: false,
          lastMeaningfulAt: new Date("2026-06-01T12:00:00Z"),
          experienceYears: 6,
          viewerExperienceYears: 5,
          topicOverlapCount: 3,
          hasDeclaredTopics: true,
          hasUpcomingAvailability: true,
          recentPageOneImpressions: 0,
        },
      ],
      now
    );
    expect(ranked[0].ally.id).toBe("new-no-topics");
  });
});

describe("scheduling and sessions", () => {
  it("converts a swap to the first 30 minutes", () => {
    const start = new Date("2026-09-22T16:00:00Z");
    const converted = convertedOneWayTimes(start);
    expect(converted.endUtc.toISOString()).toBe("2026-09-22T16:30:00.000Z");
  });

  it("opens Join only from T-15 through end+30", () => {
    const startUtc = new Date("2026-09-22T16:00:00Z");
    const endUtc = new Date("2026-09-22T16:30:00Z");
    expect(isJoinWindowOpen({ startUtc, endUtc, now: new Date("2026-09-22T15:44:00Z") })).toBe(false);
    expect(isJoinWindowOpen({ startUtc, endUtc, now: new Date("2026-09-22T15:45:00Z") })).toBe(true);
    expect(isJoinWindowOpen({ startUtc, endUtc, now: new Date("2026-09-22T17:00:00Z") })).toBe(true);
    expect(isJoinWindowOpen({ startUtc, endUtc, now: new Date("2026-09-22T17:01:00Z") })).toBe(false);
  });

  it("detects overlapping bookings", () => {
    expect(
      rangesOverlap(
        new Date("2026-09-22T16:00:00Z"),
        new Date("2026-09-22T17:00:00Z"),
        new Date("2026-09-22T16:30:00Z"),
        new Date("2026-09-22T17:30:00Z")
      )
    ).toBe(true);
    expect(
      rangesOverlap(
        new Date("2026-09-22T16:00:00Z"),
        new Date("2026-09-22T16:30:00Z"),
        new Date("2026-09-22T16:30:00Z"),
        new Date("2026-09-22T17:00:00Z")
      )
    ).toBe(false);
  });

  it("completes a session only when both people say it happened", () => {
    expect(attendanceOutcome("yes", null)).toBe("awaiting_attendance");
    expect(attendanceOutcome("yes", "yes")).toBe("completed");
    expect(attendanceOutcome("yes", "no")).toBe("did_not_happen");
  });

  it("counts reciprocal swaps as interviews conducted by both people", () => {
    expect(
      interviewerIdsForCompletedSession({
        format: "reciprocal_swap",
        interviewerId: "b",
        requesterId: "a",
        receiverId: "b",
      })
    ).toEqual(["a", "b"]);
    expect(helpedPeersCopy(12)).toBe("Helped 12 peers practice");
  });

  it("expires requests after 7 days or when the proposed start has passed", () => {
    const createdAt = new Date("2026-09-01T00:00:00Z");
    expect(
      isRequestExpired({
        createdAt,
        proposedStartUtc: new Date("2026-09-20T00:00:00Z"),
        now: new Date("2026-09-10T00:00:00Z"),
      })
    ).toBe(true);
    expect(
      isRequestExpired({
        createdAt,
        now: new Date("2026-09-07T00:00:00Z"),
      })
    ).toBe(false);
    expect(
      isRequestExpired({
        createdAt,
        now: new Date("2026-09-08T00:00:00Z"),
      })
    ).toBe(true);
  });
});
