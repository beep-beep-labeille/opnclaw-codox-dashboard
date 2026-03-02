-- RLS policies (recommended)
-- Goal: keep the dashboard public-read via Netlify function only.
-- So we can LOCK DOWN direct anon access to the table.

alter table public.events enable row level security;

-- No direct access for anon/authenticated by default.
revoke all on table public.events from anon;
revoke all on table public.events from authenticated;

-- If you DO want direct reads from the browser using anon key, uncomment:
-- grant select on table public.events to anon;
-- create policy "anon_read" on public.events for select to anon using (true);
