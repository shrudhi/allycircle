import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: ts("created_at").notNull(),
  updatedAt: ts("updated_at").notNull(),
  deletedAt: ts("deleted_at"),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: ts("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: ts("created_at").notNull(),
    updatedAt: ts("updated_at").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_user_idx").on(table.userId)]
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: ts("access_token_expires_at"),
    refreshTokenExpiresAt: ts("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: ts("created_at").notNull(),
    updatedAt: ts("updated_at").notNull(),
  },
  (table) => [index("account_user_idx").on(table.userId)]
);

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: ts("expires_at").notNull(),
  createdAt: ts("created_at"),
  updatedAt: ts("updated_at"),
});

export const profiles = pgTable("profiles", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  fullName: text("full_name").notNull(),
  photoPath: text("photo_path"),
  stage: text("stage").notNull(),
  fieldId: text("field_id").notNull(),
  fieldCustom: text("field_custom"),
  currentTitle: text("current_title"),
  experienceYears: integer("experience_years").notNull(),
  currentCompany: text("current_company"),
  targetRole: text("target_role"),
  bio: text("bio"),
  linkedinUrl: text("linkedin_url"),
  timezone: text("timezone").notNull(),
  openToBeInterviewed: boolean("open_to_be_interviewed").notNull().default(true),
  openToInterviewOthers: boolean("open_to_interview_others").notNull().default(true),
  onboardingComplete: boolean("onboarding_complete").notNull().default(false),
  termsAcceptedAt: ts("terms_accepted_at"),
  lastMeaningfulAt: ts("last_meaningful_at"),
  lastVisitAt: ts("last_visit_at"),
  isTestUser: boolean("is_test_user").notNull().default(false),
  createdAt: ts("created_at").notNull(),
  updatedAt: ts("updated_at").notNull(),
});

export const education = pgTable("education", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  school: text("school").notNull(),
  degree: text("degree"),
  year: text("year"),
});

export const employment = pgTable("employment", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  company: text("company").notNull(),
  title: text("title"),
  year: text("year"),
});

export const userTopics = pgTable(
  "user_topics",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    topicId: text("topic_id"),
    label: text("label").notNull(),
  },
  (table) => [index("user_topics_user_idx").on(table.userId)]
);

export const savedAllies = pgTable(
  "saved_allies",
  {
    viewerId: text("viewer_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    allyId: text("ally_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: ts("created_at").notNull(),
  },
  (table) => [primaryKey({ columns: [table.viewerId, table.allyId] })]
);

export const blocks = pgTable(
  "blocks",
  {
    blockerId: text("blocker_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    blockedId: text("blocked_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: ts("created_at").notNull(),
  },
  (table) => [primaryKey({ columns: [table.blockerId, table.blockedId] })]
);

export const reports = pgTable("reports", {
  id: text("id").primaryKey(),
  reporterId: text("reporter_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  reportedId: text("reported_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  reason: text("reason").notNull(),
  description: text("description"),
  status: text("status").notNull().default("open"),
  createdAt: ts("created_at").notNull(),
});

export const availabilityWindows = pgTable(
  "availability_windows",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    weekday: integer("weekday").notNull(),
    startMinutes: integer("start_minutes").notNull(),
    endMinutes: integer("end_minutes").notNull(),
  },
  (table) => [index("availability_user_idx").on(table.userId)]
);

export const calendarConnections = pgTable("calendar_connections", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  provider: text("provider").notNull().default("google"),
  status: text("status").notNull(),
  scopes: text("scopes"),
  encryptedRefreshToken: text("encrypted_refresh_token"),
  encryptedAccessToken: text("encrypted_access_token"),
  accessTokenExpiresAt: ts("access_token_expires_at"),
  organizerEligible: boolean("organizer_eligible").notNull().default(false),
  mockBusyJson: text("mock_busy_json"),
  revokedAt: ts("revoked_at"),
  updatedAt: ts("updated_at").notNull(),
});

export const practiceRequests = pgTable(
  "practice_requests",
  {
    id: text("id").primaryKey(),
    requesterId: text("requester_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    receiverId: text("receiver_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    format: text("format").notNull(),
    state: text("state").notNull(),
    message: text("message"),
    proposedStartUtc: ts("proposed_start_utc"),
    proposedEndUtc: ts("proposed_end_utc"),
    expiresAt: ts("expires_at").notNull(),
    createdAt: ts("created_at").notNull(),
    updatedAt: ts("updated_at").notNull(),
  },
  (table) => [
    index("requests_receiver_idx").on(table.receiverId, table.state),
    index("requests_requester_idx").on(table.requesterId, table.state),
  ]
);

export const requestEvents = pgTable("request_events", {
  id: text("id").primaryKey(),
  requestId: text("request_id")
    .notNull()
    .references(() => practiceRequests.id, { onDelete: "cascade" }),
  actorId: text("actor_id"),
  fromState: text("from_state"),
  toState: text("to_state").notNull(),
  note: text("note"),
  createdAt: ts("created_at").notNull(),
});

export const practiceSessions = pgTable(
  "practice_sessions",
  {
    id: text("id").primaryKey(),
    requestId: text("request_id").references(() => practiceRequests.id),
    requesterId: text("requester_id").notNull(),
    receiverId: text("receiver_id").notNull(),
    interviewerId: text("interviewer_id"),
    candidateId: text("candidate_id"),
    format: text("format").notNull(),
    startUtc: ts("start_utc").notNull(),
    endUtc: ts("end_utc").notNull(),
    state: text("state").notNull(),
    meetUrl: text("meet_url"),
    meetProvisionState: text("meet_provision_state").notNull().default("pending"),
    calendarEventId: text("calendar_event_id"),
    calendarOrganizerUserId: text("calendar_organizer_user_id"),
    requesterAttendance: text("requester_attendance"),
    receiverAttendance: text("receiver_attendance"),
    pendingRescheduleStartUtc: ts("pending_reschedule_start_utc"),
    pendingRescheduleBy: text("pending_reschedule_by"),
    createdAt: ts("created_at").notNull(),
    updatedAt: ts("updated_at").notNull(),
  },
  (table) => [
    index("sessions_requester_idx").on(table.requesterId, table.startUtc),
    index("sessions_receiver_idx").on(table.receiverId, table.startUtc),
  ]
);

export const conversations = pgTable(
  "conversations",
  {
    id: text("id").primaryKey(),
    userLowId: text("user_low_id").notNull(),
    userHighId: text("user_high_id").notNull(),
    createdAt: ts("created_at").notNull(),
    lastMessageAt: ts("last_message_at").notNull(),
  },
  (table) => [uniqueIndex("conversations_pair_idx").on(table.userLowId, table.userHighId)]
);

export const messages = pgTable(
  "messages",
  {
    id: text("id").primaryKey(),
    conversationId: text("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    senderId: text("sender_id").notNull(),
    body: text("body").notNull(),
    createdAt: ts("created_at").notNull(),
  },
  (table) => [index("messages_conversation_idx").on(table.conversationId, table.createdAt)]
);

export const feedback = pgTable("feedback", {
  id: text("id").primaryKey(),
  sessionId: text("session_id")
    .notNull()
    .references(() => practiceSessions.id, { onDelete: "cascade" }),
  fromUserId: text("from_user_id").notNull(),
  toUserId: text("to_user_id").notNull(),
  practiceAgain: text("practice_again"),
  tagsJson: jsonb("tags_json").$type<string[]>().default([]),
  privateImprovement: text("private_improvement"),
  createdAt: ts("created_at").notNull(),
});

export const testimonials = pgTable("testimonials", {
  id: text("id").primaryKey(),
  sessionId: text("session_id")
    .notNull()
    .references(() => practiceSessions.id, { onDelete: "cascade" }),
  fromUserId: text("from_user_id").notNull(),
  toUserId: text("to_user_id").notNull(),
  body: text("body").notNull(),
  recipientVisible: boolean("recipient_visible").notNull().default(false),
  createdAt: ts("created_at").notNull(),
});

export const notifications = pgTable(
  "notifications",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    href: text("href"),
    readAt: ts("read_at"),
    createdAt: ts("created_at").notNull(),
  },
  (table) => [index("notifications_user_idx").on(table.userId, table.createdAt)]
);

export const jobs = pgTable(
  "jobs",
  {
    id: text("id").primaryKey(),
    type: text("type").notNull(),
    runAt: ts("run_at").notNull(),
    status: text("status").notNull().default("queued"),
    attempts: integer("attempts").notNull().default(0),
    idempotencyKey: text("idempotency_key").notNull().unique(),
    payloadJson: jsonb("payload_json").$type<Record<string, unknown>>().notNull(),
    lastError: text("last_error"),
    createdAt: ts("created_at").notNull(),
  },
  (table) => [index("jobs_status_run_idx").on(table.status, table.runAt)]
);

export const analyticsEventsTable = pgTable(
  "analytics_events",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    userId: text("user_id"),
    propertiesJson: jsonb("properties_json").$type<Record<string, unknown>>().default({}),
    createdAt: ts("created_at").notNull(),
  },
  (table) => [index("analytics_name_idx").on(table.name, table.createdAt)]
);

export const recommendationLogs = pgTable("recommendation_logs", {
  id: text("id").primaryKey(),
  viewerId: text("viewer_id").notNull(),
  allyId: text("ally_id").notNull(),
  rankPosition: integer("rank_position").notNull(),
  reasonCodes: jsonb("reason_codes").$type<string[]>().notNull(),
  rankingVersion: text("ranking_version").notNull(),
  createdAt: ts("created_at").notNull(),
});

export const emailOutbox = pgTable("email_outbox", {
  id: text("id").primaryKey(),
  toEmail: text("to_email").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  href: text("href"),
  createdAt: ts("created_at").notNull(),
});

export const timeOverrides = pgTable("time_overrides", {
  id: text("id").primaryKey().default("global"),
  nowIso: text("now_iso"),
});
