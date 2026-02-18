-- Push tokens: stores device push tokens for remote notifications
CREATE TABLE push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, token)
);

CREATE INDEX idx_push_tokens_family_id ON push_tokens(family_id);

ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view family push tokens"
  ON push_tokens FOR SELECT
  USING (family_id = get_my_family_id());

CREATE POLICY "Users can insert own push tokens"
  ON push_tokens FOR INSERT
  WITH CHECK (user_id = auth.uid() AND family_id = get_my_family_id());

CREATE POLICY "Users can update own push tokens"
  ON push_tokens FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own push tokens"
  ON push_tokens FOR DELETE
  USING (user_id = auth.uid());
