export const productConfig = {
  name: "AllyCircle",
  tagline: "Your network. Your prep team.",
  valueProposition:
    "Stop practicing mock interviews in front of a mirror or navigating an isolating job search alone. AllyCircle connects you with real professionals and peers in your field to sync schedules, share mock interviews, and hit your career goals together.",
  interviewMeMinutes: 30,
  reciprocalSwapMinutes: 60,
  resultsPageSize: 12,
  requestExpiryDays: 7,
  minNoticeHours: 24,
  bufferMinutes: 0,
  bookingHorizonDays: 14,
  joinWindowBeforeMinutes: 15,
  joinWindowAfterMinutes: 30,
  photoMaxBytes: 2 * 1024 * 1024,
  photoMimeTypes: ["image/jpeg", "image/png", "image/webp"] as const,
  rankingVersion: "v1",
  rankingWeights: {
    fieldAndTarget: 24,
    activity: 18,
    experienceFit: 14,
    topicOverlap: 10,
    availability: 10,
    freshnessBalance: 8,
  },
  activityBuckets: {
    thisWeekDays: 7,
    thisMonthDays: 30,
  },
  rateLimits: {
    loginPerHour: 12,
    resetPerHour: 5,
    messagesPerMinute: 20,
    requestsPerDay: 15,
    reportsPerDay: 8,
    searchPerMinute: 30,
  },
  termsVersion: "placeholder-v1",
  privacyVersion: "placeholder-v1",
} as const;

export type ProductConfig = typeof productConfig;
