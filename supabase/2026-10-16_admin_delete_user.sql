-- 한자 노트 · 관리자 사용자 삭제 + 삭제된 이메일 재가입 차단
-- Supabase 대시보드 > SQL Editor 에 붙여넣고 Run (한 번만)

-- 1) 재가입 차단 이메일 목록
create table if not exists public.banned_emails (
  email      text primary key,
  banned_at  timestamptz not null default now(),
  banned_by  uuid
);
alter table public.banned_emails enable row level security;
-- 정책 없음 = 일반 사용자는 직접 읽기/쓰기 불가. 아래 함수(security definer)로만 접근.

-- 2) 가입 시 차단 (auth.users 에 행이 들어가기 전에 막음)
create or replace function public.block_banned_signup()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.banned_emails b where b.email = lower(new.email)) then
    raise exception 'EMAIL_BANNED';
  end if;
  return new;
end $$;
drop trigger if exists trg_block_banned_signup on auth.users;
create trigger trg_block_banned_signup
  before insert on auth.users
  for each row execute function public.block_banned_signup();

-- 3) 앱이 가입 전에 친절한 안내를 띄우기 위한 확인 함수
create or replace function public.email_banned(p_email text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.banned_emails where email = lower(trim(p_email)));
$$;
revoke all on function public.email_banned(text) from public;
grant execute on function public.email_banned(text) to anon, authenticated;

-- 4) 관리자 삭제: 이메일을 차단 목록에 넣고, 모든 기록과 계정을 지움
create or replace function public.admin_delete_user(p_uid uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_email text;
begin
  if not public.is_admin() then raise exception 'NOT_ADMIN'; end if;
  if p_uid = auth.uid() then raise exception 'CANNOT_DELETE_SELF'; end if;
  select email into v_email from auth.users where id = p_uid;
  if v_email is null then raise exception 'NOT_FOUND'; end if;
  if exists (select 1 from public.profiles where id = p_uid and role = 'admin') then raise exception 'CANNOT_DELETE_ADMIN'; end if;

  insert into public.banned_emails (email, banned_by) values (lower(v_email), auth.uid())
    on conflict (email) do nothing;

  delete from public.daily_activity where user_id = p_uid;
  delete from public.events         where user_id = p_uid;
  delete from public.progress       where user_id = p_uid;
  delete from public.profiles       where id = p_uid;
  delete from auth.users            where id = p_uid;
end $$;
revoke all on function public.admin_delete_user(uuid) from public;
grant execute on function public.admin_delete_user(uuid) to authenticated;

-- (참고) 차단 해제하려면:  delete from public.banned_emails where email = 'someone@example.com';
