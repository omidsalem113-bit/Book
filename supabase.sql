-- Run once in Supabase: SQL Editor > New query > paste > Run
create table public.profiles(id uuid primary key references auth.users on delete cascade,
  display_name text not null check(char_length(display_name) between 1 and 40), is_admin boolean not null default false);
create table public.books(id text primary key, title text not null);
create table public.comments(id bigint generated always as identity primary key,
  book_id text not null references public.books(id),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  content text not null check(char_length(content) between 1 and 1000),
  status text not null default 'pending' check(status in('pending','approved','hidden')),
  created_at timestamptz not null default now());
create index on public.comments(book_id,status,created_at desc);
create function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into public.profiles(id,display_name) values(new.id,left(coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'),''),'Reader'),40)); return new; end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
create function public.is_admin() returns boolean language sql security definer stable set search_path=public as
$$ select coalesce((select is_admin from public.profiles where id=auth.uid()),false) $$;
alter table public.profiles enable row level security;
alter table public.books enable row level security;
alter table public.comments enable row level security;
create policy "profiles readable" on public.profiles for select using(true);
create policy "own profile update" on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
revoke update on public.profiles from authenticated; grant update(display_name) on public.profiles to authenticated;
create policy "books readable" on public.books for select using(true);
create policy "read approved, own, or admin" on public.comments for select using(status='approved' or user_id=auth.uid() or public.is_admin());
create policy "insert own pending" on public.comments for insert to authenticated with check(user_id=auth.uid() and status='pending');
create policy "admin moderates" on public.comments for update to authenticated using(public.is_admin()) with check(public.is_admin());
create policy "owner or admin deletes" on public.comments for delete to authenticated using(user_id=auth.uid() or public.is_admin());
-- Register each book once (id must equal "id" in content/book.json):
insert into public.books(id,title) values('da-vinci-code','The Da Vinci Code');
-- Make yourself admin after signing up once on the site:
-- update public.profiles set is_admin=true where id=(select id from auth.users where email='YOUR_EMAIL');
-- Approve a comment: Table Editor > comments > set status to approved.
