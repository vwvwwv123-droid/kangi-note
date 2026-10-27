#!/usr/bin/env python3
"""index.html에서 키워드 위치와 앞뒤 문맥을 출력한다. 함수명을 추측하지 말고 이걸로 먼저 확인.

사용: python3 scripts/find_in_app.py "function grade(" "at8(" "last_seen"
"""
import re, sys

path = 'index.html'
s = open(path, encoding='utf-8').read()
for k in sys.argv[1:]:
    ms = list(re.finditer(re.escape(k), s))
    print(f'## {k!r}: {len(ms)}곳')
    for m in ms[:5]:
        ctx = s[max(0, m.start() - 150):m.start() + 250].replace('\n', ' ')
        print(f'  @{m.start()} | {ctx}\n')
