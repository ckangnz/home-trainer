import type { Catalog } from '../../catalog'
import type { shell as en } from '../../en/shell'

export const shell = {
  nav: {
    primary: '주 메뉴',
    footer: '하단 메뉴',
    home: '홈',
    workouts: '운동',
    exercises: '동작',
    friends: '친구',
    history: '기록',
    settings: '설정',
  },
  accountAndSettings: '계정 및 설정',
  friendRequests: '친구 요청 {count}개',
  footer: {
    workouts: '운동',
    library: '동작 라이브러리',
    privacy: '개인정보',
    terms: '이용약관',
    support: '{name} 후원하기',
    disclaimer: '{name}는 광고로 운영되는 무료 앱이에요. 운동 안내는 일반 정보이며 의학적 조언이 아니에요.',
  },
  signInPanel: {
    title: '로그인하고 계속하기',
    body: 'HomeTrainer는 무료예요. Google로 로그인하면 운동을 재생하고, 나만의 운동을 저장하고, 친구가 공유한 운동을 가져오고, 연속 기록을 이어갈 수 있어요.',
    privacyBefore: '운동과 기록만 저장해요. 자세한 내용은 ',
    privacyLink: '개인정보처리방침',
    privacyAfter: '을 확인하세요.',
  },
  auth: {
    sessionFailed: '로그인 상태를 확인하지 못했어요. 다시 로그인해 주세요.',
    loadFailed: '로그인을 불러오지 못했어요. 연결을 확인하고 새로고침해 주세요.',
  },
  setup: {
    title: 'Firebase가 설정되지 않았어요',
  },
} satisfies Catalog<typeof en>
