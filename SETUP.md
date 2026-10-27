# Claude Code로 옮기기 — 설치 순서

## 1. 저장소 가져오기
```bash
git clone https://github.com/vwvwwv123-droid/kangi-note.git
cd kangi-note
```
(이미 README.md·index.html·manifest.json·sw.js·icons/·supabase/ 가 들어 있음. claude.ai 프로젝트 지식 파일의 `kanji-note.html`은 이 `index.html`과 같은 것이므로 따로 옮길 필요 없음.)

## 2. 이 묶음의 파일을 저장소 루트에 복사
```
CLAUDE.md                 ← Claude Code가 세션마다 자동으로 읽는 지침
docs/CHAT_HISTORY.md      ← claude.ai 대화에서 나온 결정·교훈
docs/PROJECT_NOTES.md     ← claude.ai 프로젝트 지식 파일(README) 사본. 저장소 README.md와 같으면 삭제해도 됨
scripts/replace_once.py   ← 정확히 1곳 치환
scripts/check_syntax.js   ← 인라인 script 문법 검사
scripts/find_in_app.py    ← 키워드 위치 찾기
```

## 3. Claude Code 시작
```bash
cd kangi-note
claude
```
첫 메시지 예: `CLAUDE.md 읽고 현재 README 기준 최신 버전과 남은 할 일을 요약해줘`

## 4. 비밀 정보(저장소 밖에 보관)
Claude Code에도 넣지 말고, 필요할 때 Supabase 대시보드에서 직접 다룬다.
- VAPID 비공개키, CRON_KEY → Supabase Edge Secrets에만 존재
- `supabase/2026-10-16_push_notify.sql`(키 포함) → `.gitignore` 유지
- 앱에 들어가는 것은 Supabase URL + anon 키뿐

## 5. 선택: 권한 설정
`.claude/settings.json` 에 자주 쓰는 명령을 허용해 두면 매번 확인창이 안 뜬다.
```json
{
  "permissions": {
    "allow": [
      "Bash(node scripts/check_syntax.js*)",
      "Bash(python3 scripts/*)",
      "Bash(git status*)", "Bash(git diff*)", "Bash(git log*)"
    ]
  }
}
```
푸시(`git push`)는 허용 목록에 넣지 말고 매번 확인하는 편이 안전하다.
