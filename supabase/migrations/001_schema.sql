-- ============================================================
-- Finance Tracker - Supabase Database Schema
-- ============================================================

-- Families: groups admins and kids together
CREATE TABLE families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  join_code TEXT UNIQUE NOT NULL DEFAULT substr(replace(gen_random_uuid()::text, '-', ''), 1, 8),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Profiles: links every Supabase Auth user to a family and role
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'kid')),
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Kids: child accounts managed by admins
CREATE TABLE kids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  avatar TEXT NOT NULL DEFAULT '',
  allowance_amount NUMERIC NOT NULL DEFAULT 0,
  allowance_frequency TEXT NOT NULL DEFAULT 'monthly' CHECK (allowance_frequency IN ('weekly', 'monthly')),
  balance NUMERIC NOT NULL DEFAULT 0,
  savings_goal_name TEXT,
  savings_goal_target NUMERIC,
  last_allowance_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (family_id, name)
);

-- Transactions: every financial event for a kid
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kid_id UUID NOT NULL REFERENCES kids(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('add', 'subtract')),
  amount NUMERIC NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'other',
  date TIMESTAMPTZ NOT NULL DEFAULT now(),
  transfer_id UUID
);

CREATE INDEX idx_transactions_kid_id ON transactions(kid_id);
CREATE INDEX idx_transactions_date ON transactions(date DESC);

-- Notifications: in-app notification history
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  kid_id UUID REFERENCES kids(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  date TIMESTAMPTZ NOT NULL DEFAULT now(),
  data JSONB
);

CREATE INDEX idx_notifications_family_id ON notifications(family_id);
CREATE INDEX idx_notifications_date ON notifications(date DESC);

-- Notification preferences: per-family settings
CREATE TABLE notification_preferences (
  family_id UUID PRIMARY KEY REFERENCES families(id) ON DELETE CASCADE,
  allowance BOOLEAN NOT NULL DEFAULT true,
  transactions BOOLEAN NOT NULL DEFAULT true,
  transfers BOOLEAN NOT NULL DEFAULT true,
  goal_milestones BOOLEAN NOT NULL DEFAULT true,
  push_enabled BOOLEAN NOT NULL DEFAULT true
);

-- Reached milestones: tracks which savings-goal milestones have fired
CREATE TABLE reached_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kid_id UUID NOT NULL REFERENCES kids(id) ON DELETE CASCADE,
  threshold INTEGER NOT NULL,
  reached_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (kid_id, threshold)
);

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE kids ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE reached_milestones ENABLE ROW LEVEL SECURITY;

-- Helper: get the current user's family_id
CREATE OR REPLACE FUNCTION get_my_family_id()
RETURNS UUID AS $$
  SELECT family_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Families: users can read their own family
CREATE POLICY "Users can view own family"
  ON families FOR SELECT
  USING (id = get_my_family_id());

-- Families: authenticated users can create a family (for signup flow)
CREATE POLICY "Authenticated users can create a family"
  ON families FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Profiles: users can read profiles in their family
CREATE POLICY "Users can view family profiles"
  ON profiles FOR SELECT
  USING (family_id = get_my_family_id());

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- Kids: scoped to family
CREATE POLICY "Users can view family kids"
  ON kids FOR SELECT
  USING (family_id = get_my_family_id());

CREATE POLICY "Admins can insert kids"
  ON kids FOR INSERT
  WITH CHECK (
    family_id = get_my_family_id()
    AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update kids"
  ON kids FOR UPDATE
  USING (
    family_id = get_my_family_id()
    AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete kids"
  ON kids FOR DELETE
  USING (
    family_id = get_my_family_id()
    AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Transactions: visible to family members, writable by admins and the kid themselves
CREATE POLICY "Users can view family transactions"
  ON transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM kids WHERE kids.id = transactions.kid_id AND kids.family_id = get_my_family_id()
    )
  );

CREATE POLICY "Family members can insert transactions"
  ON transactions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM kids WHERE kids.id = transactions.kid_id AND kids.family_id = get_my_family_id()
    )
  );

CREATE POLICY "Admins can update transactions"
  ON transactions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM kids k
      WHERE k.id = transactions.kid_id
        AND k.family_id = get_my_family_id()
    )
    AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete transactions"
  ON transactions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM kids k
      WHERE k.id = transactions.kid_id
        AND k.family_id = get_my_family_id()
    )
    AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Notifications: scoped to family
CREATE POLICY "Users can view family notifications"
  ON notifications FOR SELECT
  USING (family_id = get_my_family_id());

CREATE POLICY "Users can insert family notifications"
  ON notifications FOR INSERT
  WITH CHECK (family_id = get_my_family_id());

CREATE POLICY "Users can update family notifications"
  ON notifications FOR UPDATE
  USING (family_id = get_my_family_id());

CREATE POLICY "Users can delete family notifications"
  ON notifications FOR DELETE
  USING (family_id = get_my_family_id());

-- Notification preferences: scoped to family
CREATE POLICY "Users can view family notification prefs"
  ON notification_preferences FOR SELECT
  USING (family_id = get_my_family_id());

CREATE POLICY "Users can upsert family notification prefs"
  ON notification_preferences FOR INSERT
  WITH CHECK (family_id = get_my_family_id());

CREATE POLICY "Users can update family notification prefs"
  ON notification_preferences FOR UPDATE
  USING (family_id = get_my_family_id());

-- Reached milestones: scoped to family via kid
CREATE POLICY "Users can view family milestones"
  ON reached_milestones FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM kids WHERE kids.id = reached_milestones.kid_id AND kids.family_id = get_my_family_id()
    )
  );

CREATE POLICY "Users can insert family milestones"
  ON reached_milestones FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM kids WHERE kids.id = reached_milestones.kid_id AND kids.family_id = get_my_family_id()
    )
  );

-- ============================================================
-- Auto-create profile on signup via trigger
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_family_id UUID;
BEGIN
  -- Determine the family_id: use the one passed in metadata, or generate a new one
  new_family_id := COALESCE(
    (NEW.raw_user_meta_data->>'family_id')::uuid,
    gen_random_uuid()
  );

  -- If this is a new admin (no family_id was passed), create the family FIRST
  IF NEW.raw_user_meta_data->>'family_id' IS NULL THEN
    INSERT INTO families (id) VALUES (new_family_id);
  END IF;

  -- Now create the profile (family row already exists)
  INSERT INTO profiles (id, family_id, role, display_name)
  VALUES (
    NEW.id,
    new_family_id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'admin'),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );

  -- Create default notification preferences for the family
  INSERT INTO notification_preferences (family_id)
  VALUES (new_family_id)
  ON CONFLICT (family_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
