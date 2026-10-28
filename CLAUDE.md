# 한자 노트 앱 (漢字ノート) — Claude Code 작업 지침

이 저장소는 JLPT N5~N1 한자 학습 웹앱 **한자 노트**의 소스다. 마스코트는 노랑 고양이 **강숙이**.
여러 사람이 실제로 쓰는 앱이므로, 모든 수정은 "지금 사용 중인 사람이 다음에 열었을 때 깨지지 않는다"를 기준으로 한다.

> 상세 설계·결정 기록은 `README.md`(원본 메모)와 `docs/` 폴더에 있다. 기능을 바꾸기 전에 반드시 `README.md`의 해당 절을 먼저 읽고, 바꾼 뒤에는 같은 절을 갱신한다.

## 1. 구조 한눈에
- **GitHub Pages**: `vwvwwv123-droid/kangi-note` (Public) → https://vwvwwv123-droid.github.io/kangi-note/ 가 정식 앱 주소. `main`에 푸시하면 1~2분 뒤 반영.
- **파일**: `index.html` 하나에 한자 2,211자 데이터 + 강숙이 SVG + 모든 로직이 들어 있음(약 5.5MB, 단일 파일 앱). 그 외 `manifest.json`, `sw.js`, `icons/`, `supabase/`(SQL·Edge Function), `README.md`.
- **Supabase** (프로젝트 kanji-note, ref `qorknbibcxgunaoehhew`, 서울 리전, 무료 플랜): Auth(이메일), Postgres(RLS), Edge Function `notify` + pg_cron 1분마다. 앱에는 **공개 anon 키만** 들어감.
- **PWA**: 홈 화면 설치, 서비스워커(index.html 네트워크 우선·정적 파일 캐시 우선), Web Push, 앱 아이콘 배지.
- 서버에 연결이 안 되면 자동으로 "이 기기 모드"(로컬 계정)로 동작.

## 2. 절대 규칙
1. **비밀 정보를 커밋하지 않는다.** VAPID 비공개키, CRON_KEY, 키가 들어간 SQL(`supabase/2026-10-16_push_notify.sql`)은 `.gitignore` 대상. 사용자에게 직접 전달한다. Supabase service_role 키는 어디에도 쓰지 않는다.
2. **index.html 수정은 "정확히 1곳 일치" 치환으로만 한다.** 파일이 커서 함수 이름 추측이 자주 틀린다. 먼저 grep/regex로 위치를 확인하고, `assert s.count(old)==1` 패턴(`scripts/replace_once.py`)으로 바꾼다. 일괄 치환·전체 재작성 금지.
3. **수정 후 반드시 검사**: `node scripts/check_syntax.js` (인라인 `<script>` 전부 문법 검사) → 필요하면 Playwright(chromium, 420×860)로 가입→닉네임→채점→스크린샷까지 헤드리스 확인. 사용자에게 손으로 테스트해 달라고 하기 전에 스스로 확인한다.
4. **버전 번호를 올리고 README를 갱신**한 뒤 커밋한다. 커밋 메시지는 한국어, `vNN: 바뀐 내용` 형식. (현재 최신 v29, 2026-10-29 기준.)
   - 레이아웃 수정은 헤드리스 Chromium만 믿지 않는다. 크기 속성 없는 SVG·이미지·입력칸은 실제 폰에서 최소 폭이 다르게 잡힌다(v29). 사용자 실기기 캡처로 확인받는다.
5. **강숙이 말투 금지 구간**: 푸시 알림 문구에는 "강숙이가 먼저 와 있을게!" 같은 캐릭터 대사를 넣지 않는다(사용자가 명시적으로 거부). 알림은 제목 "한자 노트" + 사실 위주 한 줄.
6. **보류된 기능은 되살리지 않는다**: 관리자 사용자 삭제(이메일 차단 포함)는 설계·SQL만 저장소에 남겨 두고 UI는 뺐다(git `509a5d8` 참고). 사용자가 다시 요청할 때만 복구.
7. GitHub·Supabase 대시보드 조작이 필요하면 **화면 위치를 한 단계씩** 안내하고, 메뉴 이름이 다를 수 있음을 전제한다.

## 3. 자주 쓰는 내부 이름 (index.html)
| 이름 | 역할 |
|---|---|
| `card(k)` | 한자 k의 학습 상태. 필드: `S`(안정도, 일) `D`(난이도 1~10) `L`(마지막 복습) `d`(다음 복습 시각) `n`(복습 횟수) `w`(틀린 횟수) `g`(마지막 답, v21~) |
| `grade(k, q)` | 채점(FSRS-5, 목표 기억률 90%). 1=몰라요(+10분) 2=애매 3=알아 4=쉬워(N일 뒤 아침 8시) |
| `at8(t)` | 시각 t를 그날 아침 8시(기기 시간대)로 맞춤 |
| `SQ` | 학습 큐. 몰라요는 큐의 3번째 자리에 다시 삽입 |
| `fPreview` | 버튼 아래 "다음 복습 간격" 미리보기 |
| `showAuth('login'/'signup')`, `authHTML()` | 로그인/가입 화면. 첫 화면은 항상 로그인 탭 |
| `probeCloud()` | 서버 생존 확인 → 실패 시 이 기기 모드 |
| `INIT_URL` | 페이지 로드 직후 URL 사본(`type=recovery` 감지는 Supabase 라이브러리가 해시를 지우기 전에 여기서 읽어야 함) |
| `save()` | progress 저장(약 1초 디바운스). `last_seen`은 30초마다 + 활동 이벤트마다 |
| `flushActivity`, `tickTime`, `tickDaily` | 학습 시간·일별 활동 집계(KST) |
| `$('#menuStats')`, `$('#menuOut')` | 이름 메뉴 항목(사용 설명/내 기록/사용자 분석/닉네임/복습 알림 받기/로그아웃) |

## 4. 서버(Supabase) 요약
- 테이블: `profiles`(닉네임 고유·role·guided·stats·learned·last_seen), `progress`(jsonb), `events`, `daily_activity`, `push_subscriptions`, `notif_log`.
- RLS: 본인 행만 읽기/쓰기. `role=admin`은 전체 읽기. 첫 가입자가 자동 관리자, 사용자가 자기 role 못 바꿈(트리거).
- RPC: `log_activity`, `name_taken`, `is_admin`. (예정: `email_banned`, `admin_delete_user`)
- Auth: Confirm email 꺼짐(가입 즉시 로그인). Site URL = GitHub Pages 주소. 비밀번호 재설정 `redirectTo` = 앱 주소.
- 알림: Edge Function `notify`(`supabase/functions/notify/index.ts`, web-push) ← pg_cron이 1분마다 pg_net으로 호출(헤더 `x-cron-key`). 중복 방지 `notif_log`. Edge Secrets: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `CRON_KEY`, `VAPID_SUBJECT`.
- 무료 한도의 10% 미만 사용 중. egress를 늘리는 변경(진행 데이터 전체를 자주 내려받기 등)은 피한다.

## 5. 알림 규칙 (v22, 사용자 확정 — 임의 변경 금지)
- 복습 시각: 애매/알아/쉬워 → "N일 뒤 아침 8시". 몰라요 → +10분(시간대 무관).
- (A) 몰라요: 앱을 떠난 시각(`last_seen` 멈춤)+10분에 1회, 그 안에 다시 들어오면 안 보냄.
- (B) 매일 08:00 KST: 어제 08:00 이후 **새로** 복습일이 된 카드가 있을 때만. 밀린 카드 재알림 없음. 30장 이상이면 "복습이 N장 쌓였어요. 10장만 먼저 해치울까요?"
- (C) 매월 1일 08:00 KST: 밀린 카드가 있으면 "밀린 한자 복습카드 N개" (이날은 B 대신 C만).
- 배지: 복습 대기 ≥1이면 목록 탭에 주황 "N" + 설치 앱 아이콘 숫자(`setAppBadge`).
- iPhone은 홈 화면에 추가한 앱에서만 알림. 기기마다 '복습 알림 받기'를 눌러야 함.

## 6. 작업 순서(권장)
1. `README.md`에서 관련 절 읽기 → 2. index.html에서 regex로 위치 확인 → 3. `scripts/replace_once.py`로 치환 → 4. `node scripts/check_syntax.js` → 5. (기능 변경이면) Playwright 헤드리스 확인 → 6. README 버전·설명 갱신 → 7. 커밋·푸시 → 8. 사용자에게 바뀐 점 3줄 이내 + 확인 방법 안내.
- **오류를 고쳤으면** `docs/문제해결/YYYY-MM-DD_<요약>.md`에 「증상 → 원인 → 조치 → 확인」으로 기록한다(양식: vault `템플릿/문제해결기록.md`). 공개 저장소이므로 키·토큰 값은 적지 않는다. 확인 못 한 것은 "확인 대기"로 남긴다.

## 7. 남은 할 일 (README "다음 할 일"과 동일)
- (완료 v25) 전 레벨 강숙이 한자 풀이
- 복습 기록이 쌓이면 FSRS 가중치 개인 최적화
- 사용자 늘면 외부 SMTP(Resend 등) 검토(Supabase 기본 메일 한도)
- 관리자 사용자 삭제 기능(보류 중, SQL 준비됨)

## 8. 사용자와의 소통
- 한국어. 구조 설명은 비유(집/땅/금고) 수준으로 한다.
- 구현 전에 동작 조건(기준 시각이 뭔지, 10분 카드가 실제로 어떻게 보이는지 등)을 한 번 정리해 확인받는다. 재작업이 줄어든다.
- 모호한 요청("비밀번호를 찾기")은 첫 줄에 "~로 가정하고 진행합니다"라고 밝히고 진행.
