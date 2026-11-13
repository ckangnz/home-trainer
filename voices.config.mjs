// Voice coach configuration for scripts/generate-voices.ts.
//
// Public configuration only. No secrets. The API key is read from the
// GEMINI_API_KEY environment variable (see env.example) and is never stored here.
//
// Model and API contract follow the official Gemini speech-generation docs:
// https://ai.google.dev/gemini-api/docs/speech-generation
// Prebuilt voice list: same page, "Prebuilt voices" table.
//
// Voice/style provenance:
// - maya (Laomedeia) and marcus (Alnilam) were auditioned with the user on
//   2026-11-13 using gemini-3.8-flash-tts (combined-cue WAV auditions).
// - The other five voices are un-auditioned draft picks from the official
//   prebuilt list; confirm by audition before bulk generation.
// - Dialect mapping beyond marcus is a user decision (see docs/voice-coach.md).

export const VOICE_MODEL = 'gemini-3.8-flash-tts'

export const VOICE_TRAINERS = {
  female: {
    displayName: 'Maya',
    voice: 'Laomedeia', // official trait: Upbeat — auditioned 2026-11-13
    status: 'auditioned',
    dialect: { ko: 'standard', en: 'standard' },
    style: {
      ko: 'An upbeat, encouraging female fitness coach. Standard Seoul Korean, bright vocal smile, energetic but never shouting, warm gym-buddy tone.',
      en: 'An upbeat, encouraging female fitness coach. Standard American English, bright vocal smile, energetic but never shouting, warm gym-buddy tone.',
    },
  },
  male: {
    displayName: 'Leo',
    voice: 'Schedar', // official trait: Even — DRAFT, not auditioned
    status: 'draft',
    dialect: { ko: 'standard', en: 'standard' },
    style: {
      ko: 'A calm, focused male fitness coach. Standard Seoul Korean, steady low energy, measured and reassuring.',
      en: 'A calm, focused male fitness coach. Standard American English, steady low energy, measured and reassuring.',
    },
  },
  sofia: {
    displayName: 'Sofia',
    voice: 'Sulafat', // official trait: Warm — DRAFT, not auditioned
    status: 'draft',
    dialect: { ko: 'standard', en: 'standard' },
    style: {
      ko: 'A warm, motivating female fitness coach. Standard Seoul Korean, gentle and encouraging, like a supportive friend.',
      en: 'A warm, motivating female fitness coach. Standard American English, gentle and encouraging, like a supportive friend.',
    },
  },
  zara: {
    displayName: 'Zara',
    voice: 'Sadachbia', // official trait: Lively — DRAFT, not auditioned
    status: 'draft',
    dialect: { ko: 'standard', en: 'standard' },
    style: {
      ko: 'A bold, high-energy female fitness coach. Standard Seoul Korean, casual banmal register, loud hype energy, playful and intense.',
      en: 'A bold, high-energy female fitness coach. Standard American English, loud hype energy, playful and intense.',
    },
  },
  marcus: {
    displayName: 'Marcus',
    voice: 'Alnilam', // official trait: Firm — auditioned 2026-11-13
    status: 'auditioned',
    // Korean dialect direction confirmed worth pursuing in audition; keep the
    // intonation natural and restrained, never a caricature.
    dialect: { ko: 'gyeongsang', en: 'standard' },
    style: {
      ko: 'A powerful, driven male drill coach with a deep, firm voice. Korean spoken with a natural Busan/Gyeongsang (southeastern Korean) intonation, firm and restrained, not exaggerated. Short clipped commands, intimidating but caring.',
      en: 'A powerful, driven male drill coach with a deep, firm voice. General American English. Short clipped commands, intimidating but caring.',
    },
  },
  kai: {
    displayName: 'Kai',
    voice: 'Callirrhoe', // official trait: Easy-going — DRAFT, not auditioned
    status: 'draft',
    dialect: { ko: 'standard', en: 'standard' },
    style: {
      ko: 'An easygoing, mindful male fitness coach. Standard Seoul Korean, relaxed and slow, yoga-teacher calm.',
      en: 'An easygoing, mindful male fitness coach. Standard American English, relaxed and slow, yoga-teacher calm.',
    },
  },
  nina: {
    displayName: 'Nina',
    voice: 'Erinome', // official trait: Clear — DRAFT, not auditioned
    status: 'draft',
    dialect: { ko: 'standard', en: 'standard' },
    style: {
      ko: 'A precise, playful female fitness coach. Standard Seoul Korean, crisp articulation, light and fun but exact about form.',
      en: 'A precise, playful female fitness coach. Standard American English, crisp articulation, light and fun but exact about form.',
    },
  },
}

export const VOICE_LANGUAGES = ['ko', 'en']
