CREATE TABLE public.game_sessions (
  token uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  played_on date NOT NULL,
  consumed_at timestamptz
);
GRANT ALL ON public.game_sessions TO service_role;
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.game_sessions IS 'Private server-issued round tokens; no browser access. Tokens are bound to a phone and consumed atomically by submitPlay.';
CREATE INDEX game_sessions_phone_day_idx ON public.game_sessions (phone, played_on);