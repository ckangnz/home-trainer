import type { Catalog } from '../../catalog'
import type { common as en } from '../../en/common'

export const common = {
  loading: '불러오는 중',
  save: '저장',
  saving: '저장 중…',
  cancel: '취소',
  close: '닫기',
  back: '뒤로',
  delete: '삭제',
  remove: '빼기',
  edit: '편집',
  done: '완료',
  retry: '다시 시도',
  search: '검색',
  clear: '지우기',
  clearFilters: '필터 초기화',
  all: '전체',
  more: '더 보기',
  start: '시작',
  share: '공유',
  copy: '복사',
  copied: '복사했어요',
  signIn: '로그인',
  signOut: '로그아웃',
  continueWithGoogle: 'Google로 계속하기',
  dot: ' · ',
} satisfies Catalog<typeof en>
