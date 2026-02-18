-- Enable Supabase Realtime for tables that need live cross-device sync.
-- This adds the tables to the supabase_realtime publication so that
-- postgres_changes events are broadcast to connected clients.

ALTER PUBLICATION supabase_realtime ADD TABLE kids;
ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
