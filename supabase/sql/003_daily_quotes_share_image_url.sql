ALTER TABLE public.daily_quotes
ADD COLUMN IF NOT EXISTS share_image_url text;

CREATE INDEX IF NOT EXISTS idx_daily_quotes_share_image_url
ON public.daily_quotes(share_image_url)
WHERE share_image_url IS NOT NULL;