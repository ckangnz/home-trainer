import type { Catalog } from '../../catalog'
import type { settings as en } from '../../en/settings'

export const settings = {
  title: '설정',
  language: {
    title: '언어 · Language',
    label: '언어 · Language',
    hint: '메뉴, 동작, 운동에 쓸 언어를 골라요.',
    auto: '자동 (기기 언어)',
    en: 'English',
    ko: '한국어',
  },
  trainer: '내 트레이너',
  trainerPicker: {
    trainer: '트레이너',
    skinTone: '피부색',
    skinLabel: '피부색 {skin}',
    skins: { light: '밝은 톤', medium: '중간 톤', deep: '어두운 톤' },
    taglines: {
      female: '밝고 응원을 잘해요',
      male: '차분하고 집중력 있어요',
      sofia: '따뜻하게 동기를 북돋아요',
      zara: '대담하고 에너지 넘쳐요',
      marcus: '힘차고 열정적이에요',
      kai: '느긋하고 마음챙김을 중시해요',
      nina: '정확하고 유쾌해요',
    },
  },
  calories: {
    title: '칼로리',
    weight: '체중',
    weightHint: '소모 칼로리를 계산할 때 써요. 이 기기에만 저장돼요.',
  },
  coach: {
    title: '코치',
    voice: '음성 코치',
    voiceHint: '동작, 휴식, 중간 지점을 알려줘요.',
    beeps: '카운트다운 신호음',
    beepsHint: '마지막 3초와 새 동작이 시작될 때 신호음이 울려요.',
    vibration: '진동',
    vibrationHint: '지원되는 휴대폰에서 신호음과 함께 진동해요.',
    keepAwake: '화면 켜두기',
    keepAwakeHint: '운동하는 동안 화면이 꺼지지 않게 해요.',
    voiceSelect: '음성',
    systemVoice: '시스템 기본값',
    test: '소리 테스트',
    testPhrase: '푸시업 30초. 할 수 있어요!',
  },
  account: {
    photo: {
      updated: 'Google 사진으로 업데이트했어요.',
      unchanged: '이미 Google 계정 사진과 같아요.',
      missing: 'Google에 이 계정의 프로필 사진이 없어요. myaccount.google.com에서 사진을 추가한 뒤 다시 새로고침해 주세요.',
    },
    title: '계정',
    signedInAs: '{name} 계정으로 로그인했어요.',
    googleAccount: 'Google',
    friends: '친구',
    refreshing: '업데이트 중…',
    refreshPhoto: 'Google 사진 새로고침',
  },
  about: {
    title: '정보',
    body: 'HomeTrainer는 일부 휴식 화면과 기록·친구 페이지에 표시되는 광고로 운영되는 무료 앱이에요. 운동 안내는 일반 정보이며 의학적 조언이 아니에요.',
    privacy: '개인정보처리방침',
    terms: '이용약관',
  },
} satisfies Catalog<typeof en>
