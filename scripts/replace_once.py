#!/usr/bin/env python3
"""index.html 안전 치환: old 문자열이 정확히 1곳일 때만 new로 바꾼다.

사용:
  python3 scripts/replace_once.py index.html old.txt new.txt
  (old.txt/new.txt 에 바꿀 문자열을 그대로 넣는다. 공백·줄바꿈 포함 정확 일치)

파이썬 안에서 쓸 때:
  from replace_once import replace_once
  replace_once('index.html', old, new)
"""
import sys


def replace_once(path, old, new):
    s = open(path, encoding='utf-8').read()
    n = s.count(old)
    if n != 1:
        raise SystemExit(f'[중단] "{old[:60]}..." 일치 {n}곳 (정확히 1곳이어야 함). 아무것도 바꾸지 않음.')
    open(path, 'w', encoding='utf-8').write(s.replace(old, new, 1))
    print(f'ok: {path} 1곳 치환')


if __name__ == '__main__':
    if len(sys.argv) != 4:
        raise SystemExit(__doc__)
    path, oldf, newf = sys.argv[1:]
    replace_once(path, open(oldf, encoding='utf-8').read(), open(newf, encoding='utf-8').read())
