-- Daily bodyweight log — one entry per user per date
CREATE TABLE IF NOT EXISTS daily_bodyweight (
  id         TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id    TEXT        NOT NULL,
  date       DATE        NOT NULL,
  weight_lbs NUMERIC(6, 2) NOT NULL CHECK (weight_lbs > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT daily_bodyweight_user_date_unique UNIQUE (user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_daily_bodyweight_user_date
  ON daily_bodyweight (user_id, date DESC);

ALTER TABLE daily_bodyweight ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own bodyweight"
  ON daily_bodyweight
  FOR ALL
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);
