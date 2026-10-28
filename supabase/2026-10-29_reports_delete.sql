-- 한자 노트 · 신고 삭제 권한 (v34)
-- Supabase 대시보드 > SQL Editor 에 붙여넣고 Run (한 번만). 2026-10-29_reports.sql 을 먼저 실행했어야 함.
-- 관리자만 신고를 지울 수 있음. 신고를 지우면 그 신고의 메시지(report_messages)도 함께 지워짐(on delete cascade).

drop policy if exists reports_delete_admin on public.reports;
create policy reports_delete_admin on public.reports for delete to authenticated
  using (public.is_admin());

-- 첨부 이미지도 관리자만 지울 수 있음
drop policy if exists reports_img_delete on storage.objects;
create policy reports_img_delete on storage.objects for delete to authenticated
  using (bucket_id = 'reports' and public.is_admin());
