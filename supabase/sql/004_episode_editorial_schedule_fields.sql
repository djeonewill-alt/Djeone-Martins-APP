ALTER TABLE public.episodes
ADD COLUMN IF NOT EXISTS editorial_status text;

ALTER TABLE public.episodes
ADD COLUMN IF NOT EXISTS calendar_scheduled_at timestamptz;

ALTER TABLE public.episodes
ADD COLUMN IF NOT EXISTS internal_notes text;

CREATE INDEX IF NOT EXISTS idx_episodes_editorial_status
ON public.episodes(editorial_status)
WHERE editorial_status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_episodes_calendar_scheduled_at
ON public.episodes(calendar_scheduled_at)
WHERE calendar_scheduled_at IS NOT NULL;
