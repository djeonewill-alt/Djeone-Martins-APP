-- Djeone App - Auth real com Supabase
-- Rode este SQL no Supabase SQL Editor antes de trocar a tela de cadastro.

alter table public.profiles
add column if not exists auth_user_id uuid references auth.users(id) on delete cascade;

alter table public.profiles
add column if not exists email text;

create unique index if not exists profiles_auth_user_id_unique
on public.profiles(auth_user_id)
where auth_user_id is not null;

create index if not exists profiles_email_index
on public.profiles(email);

create index if not exists profiles_phone_index
on public.profiles(phone);