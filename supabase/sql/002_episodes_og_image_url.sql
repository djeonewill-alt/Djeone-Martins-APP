alter table public.episodes
add column if not exists og_image_url text;

create index if not exists idx_episodes_og_image_url
on public.episodes(og_image_url)
where og_image_url is not null;
