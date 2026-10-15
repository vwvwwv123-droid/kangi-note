# 한자 노트 앱 (漢字ノート)

- 앱 주소(정식, 2026-10-16~): https://vwvwwv123-droid.github.io/kangi-note/ — GitHub Pages, 저장소 vwvwwv123-droid/kangi-note(Public, 파일 index.html 하나). 2026-10-16부터 Claude가 GitHub에 직접 푸시(Claude GitHub App 설치됨) → 수정하면 Claude가 main에 올리고 1~2분 뒤 같은 주소에 반영. 저장소에 README.md(이 메모)도 함께 둠.
- 옛 아티팩트 링크: https://claude.ai/artifact/J2daucHtcxidefpCnZZ2Xw — 아티팩트 안에서는 외부 서버가 막혀 '이 기기 모드'로만 동작하므로 폰·PC 공용에는 쓰지 않음.
- 강숙이 캐릭터 시트: https://claude.ai/artifact/8cEgu97nC5DYhHnaEybQA6
- 복습 방식 비교 문서(지금 방식 vs FSRS): https://claude.ai/code/artifact/12a91aa7-e135-4849-ae1d-95774eec7d34
- 단독 HTML 파일(kanji-note.html)도 매 변경 때 같이 갱신해서 보냄 — 폰/PC에서 Claude 없이 열기용, 이 파일이 Supabase 서버에 연결됨.
- 범위: JLPT N5(79)·N4(166)·N3(367)·N2(367)·N1(1,232) = 2,211자 (v17, 2026-10-15 N2·N1 추가 완료).
- 데이터 출처: 읽기·JLPT 레벨·획수는 davidluzgouveia/kanji-data(KANJIDIC 기반). 획순은 KanjiVG(CC BY-SA 3.0). 읽기 빈도순은 JmdictFurigana + wordfreq. 훈음·단어·예문·부수·부품·암기 문장·장면은 직접 작성.
- 계획: 지금은 아티팩트, 나중에 앱으로 전환 예정. 여러 사람이 쓰는 앱.

## 서버 (Supabase) — v17
- 프로젝트: kanji-note (ref qorknbibcxgunaoehhew, 서울 ap-northeast-2, 무료 플랜, org vwvwwv123@gmail.com's Org)
- URL https://qorknbibcxgunaoehhew.supabase.co, 앱에는 공개 anon 키만 들어감.
- 테이블: profiles(닉네임 고유·role·guided·stats·learned·last_seen), progress(학습 상태 jsonb), events(login/review/quiz/write), daily_activity(사용자·날짜별 학습 시간/복습/활동, KST).
- RLS: 본인 것만 읽기/쓰기, 관리자(role=admin)는 전체 읽기. 첫 가입자가 자동 관리자. 사용자가 자기 role 못 바꿈(트리거).
- RPC: log_activity(시간·복습 누적), name_taken(닉네임 중복 확인), is_admin(), email_banned(가입 전 차단 확인), admin_delete_user(관리자 전용 삭제).
- 사용자 삭제(v19, 2026-10-16): 관리자가 사용자 분석 표에서 삭제 → 기록 전부 삭제 + 이메일이 banned_emails에 등록되어 재가입 불가(auth.users 트리거로 차단). 관리자 자신·다른 관리자는 삭제 불가. 차단 해제는 banned_emails에서 행 삭제. SQL: supabase/2026-10-16_admin_delete_user.sql (SQL Editor에서 1회 실행 필요).
- 서버 연결 안 되면(예: Claude 아티팩트 미리보기에서 외부 서버 차단) 자동으로 "이 기기 모드"(로컬 계정)로 동작.
- 이메일 인증: 2026-10-16 Confirm email 끔(가입 즉시 로그인). Site URL은 https://vwvwwv123-droid.github.io/kangi-note/ 로 설정돼 있음.
- 관리자: 서버 첫 가입자(2026-10-16 폰에서 가입한 계정)가 자동 관리자 — 이름 메뉴에 '사용자 분석' 보임.
- 교훈: Claude 아티팩트 링크로 열면 외부 서버가 막혀 로컬 계정만 생기고 기기 간 공유 안 됨 → 반드시 GitHub Pages 주소로 접속.

## 로그인·가이드·분석 — v18 (2026-10-16)
- 로그인/회원가입 화면: 강숙이가 토리이·벚꽃 앞에서 「ようこそ!」 손 흔드는 장면. 첫 화면은 항상 로그인 탭, 이메일 예시 hyunwoo@gmail.com. 가입 후 닉네임(2~12자) 설정.
- 비밀번호 찾기(v18): 로그인 버튼 아래 '비밀번호 찾기' → 이메일 입력 → Supabase 재설정 메일(redirectTo=앱 주소) → 링크 열면 '새 비밀번호 정하기' 화면(URL의 type=recovery 감지) → 변경 후 바로 앱 진입. 서버 연결 안 되면 버튼 비활성.
- 첫 로그인 시 강숙이 사용 설명 9장: 소개, FSRS, 능동적 회상, 연상 기억법·이중 부호화, 획순·운동 기억, 맥락 학습, 인출 연습·섞어 풀기·생성 효과, 분산 학습·습관, 시작. 이름 메뉴에서 다시 보기.
- 이름 메뉴: 강숙이의 사용 설명 / 내 학습 기록 / 사용자 분석(관리자) / 닉네임 바꾸기 / 로그아웃.
- 사용자 분석: 가입자, 오늘 접속, 7일 활성, 총 학습 시간, 14일 일별 접속자 막대그래프, 사용자별 표(가입일·마지막 접속·접속 횟수·학습 시간·공부한 한자·복습·정답률), CSV 복사.

## 복습: FSRS-5 (v17)
- 목표 기억률 90%, 한자별 안정도 S·난이도 D. 버튼 4개: 몰라요(10분 뒤)·애매해요·알아요·쉬워요, 버튼 아래 다음 복습 간격. 키 1~4.
- "외움" = 기억 안정도 21일 이상. 상세 화면에 현재 기억률 % 표시. 예전 박스 기록은 자동 변환.

## 탭 구성: 오늘 / 카드 / 퀴즈 / 작문 / 목록 / 즐겨찾기
- 오늘: 검색창(한국어·가나·한자 + 손글씨) → 오늘 할 일 → 레벨별 진도(N5~N1) → 오늘의 한자(사용자가 고른 학습 레벨 범위의 단어, 자정마다 바뀜)
- [학습 시작] → 학습 설정(레벨, 하루 새 한자, 카드 수)
- 작문: 범위(오늘/지금까지 공부한 한자) + 문제 수, 강숙이 O/형광펜 피드백.
- 퀴즈·목록 레벨 칩 N5~N1.

## 한자별 내용
- N5·N4: 훈음, 음독/훈독, 단어 2개, 예문 3개, 부수, 부품 조립도, 강숙이 그림, 암기 문장, 획순
- N3·N2·N1: 훈음, 음독/훈독, 단어 2개, 예문 3개(레벨 수준), 부수, 획순. 강숙이 그림·암기 문장은 나중에.
- 돋보기 사전: 앱 밖 한자 526자 훈음 포함.

## 마스코트: 강숙이
- 노랑 고양이, 배·얼굴 흰색. 몸 #F6C445, 배·얼굴 #FFFAF0, 줄무늬 #D9A12A, 남색 스카프 #2F4A8A + 빨간 구슬.
- SVG 장면 엔진(포즈·팔·표정·소품 약 140종), 대본 형식 `字|토큰;토큰|캡션`.

## 다음 할 일
- N3~N1 강숙이 그림·암기 문장 (나중에)
- 복습 기록 쌓이면 FSRS 가중치 개인 최적화
- 사용자 늘면 Supabase 기본 메일 발송 한도(시간당 몇 통) 때문에 외부 SMTP(Resend 등) 연결 검토.
- GitHub를 Claude에 연결하면 index.html 업로드를 수동 대신 자동으로 가능.