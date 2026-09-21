export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS "user" (
  id text PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  email_verified boolean NOT NULL DEFAULT false,
  image text,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  deleted_at timestamptz
);
CREATE TABLE IF NOT EXISTS session (
  id text PRIMARY KEY,
  expires_at timestamptz NOT NULL,
  token text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  ip_address text,
  user_agent text,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS account (
  id text PRIMARY KEY,
  account_id text NOT NULL,
  provider_id text NOT NULL,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  access_token text,
  refresh_token text,
  id_token text,
  access_token_expires_at timestamptz,
  refresh_token_expires_at timestamptz,
  scope text,
  password text,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS verification (
  id text PRIMARY KEY,
  identifier text NOT NULL,
  value text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz,
  updated_at timestamptz
);
CREATE TABLE IF NOT EXISTS profiles (
  user_id text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  photo_path text,
  stage text NOT NULL,
  field_id text NOT NULL,
  field_custom text,
  current_title text,
  experience_years integer NOT NULL,
  current_company text,
  target_role text,
  bio text,
  linkedin_url text,
  timezone text NOT NULL,
  open_to_be_interviewed boolean NOT NULL DEFAULT true,
  open_to_interview_others boolean NOT NULL DEFAULT true,
  onboarding_complete boolean NOT NULL DEFAULT false,
  terms_accepted_at timestamptz,
  last_meaningful_at timestamptz,
  last_visit_at timestamptz,
  is_test_user boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS education (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  school text NOT NULL,
  degree text,
  year text
);
CREATE TABLE IF NOT EXISTS employment (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  company text NOT NULL,
  title text,
  year text
);
CREATE TABLE IF NOT EXISTS user_topics (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  topic_id text,
  label text NOT NULL
);
CREATE TABLE IF NOT EXISTS saved_allies (
  viewer_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  ally_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL,
  PRIMARY KEY (viewer_id, ally_id)
);
CREATE TABLE IF NOT EXISTS blocks (
  blocker_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  blocked_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL,
  PRIMARY KEY (blocker_id, blocked_id)
);
CREATE TABLE IF NOT EXISTS reports (
  id text PRIMARY KEY,
  reporter_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  reported_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  reason text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS availability_windows (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  weekday integer NOT NULL,
  start_minutes integer NOT NULL,
  end_minutes integer NOT NULL
);
CREATE TABLE IF NOT EXISTS calendar_connections (
  user_id text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'google',
  status text NOT NULL,
  scopes text,
  encrypted_refresh_token text,
  encrypted_access_token text,
  access_token_expires_at timestamptz,
  organizer_eligible boolean NOT NULL DEFAULT false,
  mock_busy_json text,
  revoked_at timestamptz,
  updated_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS practice_requests (
  id text PRIMARY KEY,
  requester_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  receiver_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  format text NOT NULL,
  state text NOT NULL,
  message text,
  proposed_start_utc timestamptz,
  proposed_end_utc timestamptz,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS request_events (
  id text PRIMARY KEY,
  request_id text NOT NULL REFERENCES practice_requests(id) ON DELETE CASCADE,
  actor_id text,
  from_state text,
  to_state text NOT NULL,
  note text,
  created_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS practice_sessions (
  id text PRIMARY KEY,
  request_id text REFERENCES practice_requests(id),
  requester_id text NOT NULL,
  receiver_id text NOT NULL,
  interviewer_id text,
  candidate_id text,
  format text NOT NULL,
  start_utc timestamptz NOT NULL,
  end_utc timestamptz NOT NULL,
  state text NOT NULL,
  meet_url text,
  meet_provision_state text NOT NULL DEFAULT 'pending',
  calendar_event_id text,
  calendar_organizer_user_id text,
  requester_attendance text,
  receiver_attendance text,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS conversations (
  id text PRIMARY KEY,
  user_low_id text NOT NULL,
  user_high_id text NOT NULL,
  created_at timestamptz NOT NULL,
  last_message_at timestamptz NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS conversations_pair_idx ON conversations(user_low_id, user_high_id);
CREATE TABLE IF NOT EXISTS messages (
  id text PRIMARY KEY,
  conversation_id text NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id text NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS feedback (
  id text PRIMARY KEY,
  session_id text NOT NULL REFERENCES practice_sessions(id) ON DELETE CASCADE,
  from_user_id text NOT NULL,
  to_user_id text NOT NULL,
  practice_again text,
  tags_json jsonb DEFAULT '[]'::jsonb,
  private_improvement text,
  created_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS testimonials (
  id text PRIMARY KEY,
  session_id text NOT NULL REFERENCES practice_sessions(id) ON DELETE CASCADE,
  from_user_id text NOT NULL,
  to_user_id text NOT NULL,
  body text NOT NULL,
  recipient_visible boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS notifications (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  href text,
  read_at timestamptz,
  created_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS jobs (
  id text PRIMARY KEY,
  type text NOT NULL,
  run_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  attempts integer NOT NULL DEFAULT 0,
  idempotency_key text NOT NULL UNIQUE,
  payload_json jsonb NOT NULL,
  last_error text,
  created_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS analytics_events (
  id text PRIMARY KEY,
  name text NOT NULL,
  user_id text,
  properties_json jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS recommendation_logs (
  id text PRIMARY KEY,
  viewer_id text NOT NULL,
  ally_id text NOT NULL,
  rank_position integer NOT NULL,
  reason_codes jsonb NOT NULL,
  ranking_version text NOT NULL,
  created_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS email_outbox (
  id text PRIMARY KEY,
  to_email text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  href text,
  created_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS time_overrides (
  id text PRIMARY KEY DEFAULT 'global',
  now_iso text
);
ALTER TABLE practice_sessions ADD COLUMN IF NOT EXISTS pending_reschedule_start_utc timestamptz;
ALTER TABLE practice_sessions ADD COLUMN IF NOT EXISTS pending_reschedule_by text;
`;
