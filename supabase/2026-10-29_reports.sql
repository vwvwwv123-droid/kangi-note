-- 한자 노트 · 오류 신고 + 관리자 답장 (v31)
-- Supabase 대시보드 > SQL Editor 에 붙여넣고 Run (한 번만). 다시 실행해도 안전하게 작성함.
-- 전제: public.is_admin() 함수가 이미 있음 (v17).

-- 1) 신고
create table if not exists public.reports (
  id          bigint generated always as identity primary key,
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  kind        text not null check (kind in ('kanji','explain','screen','etc')),
  body        text not null check (char_length(body) between 1 and 2000),
  kanji       text,
  context     jsonb not null default '{}'::jsonb,   -- 화면·앱 버전·기기 (앱이 자동으로 채움)
  images      text[] not null default '{}',         -- storage 'reports' 버킷 안 경로
  status      text not null default 'new' check (status in ('new','seen','fixed'))
);
create index if not exists reports_created_idx on public.reports (created_at desc);
create index if not exists reports_user_idx on public.reports (user_id);
alter table public.reports enable row level security;

drop policy if exists reports_insert_own on public.reports;
create policy reports_insert_own on public.reports for insert to authenticated
  with check (user_id = auth.uid() and status = 'new');
drop policy if exists reports_select on public.reports;
create policy reports_select on public.reports for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
drop policy if exists reports_update_admin on public.reports;
create policy reports_update_admin on public.reports for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- 2) 관리자 → 신고자 메시지 (일방향)
create table if not exists public.report_messages (
  id          bigint generated always as identity primary key,
  report_id   bigint not null references public.reports(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,  -- 받는 사람(신고자)
  body        text not null check (char_length(body) between 1 and 2000),
  created_at  timestamptz not null default now(),
  seen_at     timestamptz
);
create index if not exists report_messages_user_idx on public.report_messages (user_id, seen_at);
alter table public.report_messages enable row level security;

drop policy if exists rmsg_select on public.report_messages;
create policy rmsg_select on public.report_messages for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
drop policy if exists rmsg_insert_admin on public.report_messages;
create policy rmsg_insert_admin on public.report_messages for insert to authenticated
  with check (public.is_admin()
    and user_id = (select r.user_id from public.reports r where r.id = report_id));
-- 수정·삭제 정책 없음. 읽음 표시는 아래 함수로만.

create or replace function public.mark_report_messages_seen()
returns void language sql security definer set search_path = public as $$
  update public.report_messages set seen_at = now()
  where user_id = auth.uid() and seen_at is null;
$$;
revoke all on function public.mark_report_messages_seen() from public;
grant execute on function public.mark_report_messages_seen() to authenticated;

-- 3) 첨부 이미지 저장소 (비공개, 장당 1MB, 이미지만)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('reports', 'reports', false, 1048576, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- 경로 규칙: <user_id>/<파일명>. 본인 폴더에만 올리고, 본인·관리자만 읽음.
drop policy if exists reports_img_insert on storage.objects;
create policy reports_img_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'reports' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists reports_img_select on storage.objects;
create policy reports_img_select on storage.objects for select to authenticated
  using (bucket_id = 'reports' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

-- 4) (v34) 관리자 삭제 — 2026-10-29_reports_delete.sql 과 같은 내용. 처음 설정할 때 함께 적용됨.
drop policy if exists reports_delete_admin on public.reports;
create policy reports_delete_admin on public.reports for delete to authenticated
  using (public.is_admin());
drop policy if exists reports_img_delete on storage.objects;
create policy reports_img_delete on storage.objects for delete to authenticated
  using (bucket_id = 'reports' and public.is_admin());
