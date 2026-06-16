-- SERIES-OPEN-001: Add is_open field to control whether a series
-- can receive new episodes in the Novo Episodio flow.
--
-- is_open = true  (default): series appears in the Novo Episodio selector
-- is_open = false:           series is hidden from the Novo Episodio selector
--
-- This does NOT affect the public catalog, existing episodes, or any other flow.

ALTER TABLE public.series
ADD COLUMN IF NOT EXISTS is_open boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_series_is_open
ON public.series(is_open);