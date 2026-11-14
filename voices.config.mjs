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
// - maya (Zephyr), marcus (Fenrir) and sofia (Autonoe) were auditioned with
//   the user on 2026-11-14 using gemini-3.8-flash-tts: distinct per-character
//   base voices with an energetic workout delivery, EN and KO samples, and the
//   user accepted the direction. (An earlier 2026-11-13 audition had picked
//   Laomedeia/Alnilam; the user found samey, low-energy samples wanting.)
// - The other four voices are un-auditioned draft picks from the official
//   prebuilt list; confirm by audition before bulk generation.
//
// Accent/dialect direction (user-approved 2026-11-13): English gets a regional
// accent per character (US/UK/AU …), Korean gets a regional dialect (사투리)
// per character. The mapping below is a PROPOSAL pending per-character
// auditions — dialect/accent realism from style prompting is not guaranteed,
// so audition every character before locking it. 제주 and North Korean
// dialects are deliberately unused (caricature/oddity risk for a fitness app).

export const VOICE_MODEL = 'gemini-3.8-flash-tts'

export const VOICE_TRAINERS = {
  female: {
    displayName: 'Maya',
    voice: 'Zephyr', // official trait: Bright — auditioned 2026-11-14
    status: 'auditioned',
    accent: { ko: 'standard', en: 'american' },
    style: {
      ko: 'A bright, high-energy female fitness coach. Standard Seoul Korean, quick and encouraging with a big audible smile, playful hype energy that pushes the workout forward.',
      en: 'A bright, high-energy female fitness coach. Standard American English, quick and encouraging with a big audible smile, playful hype energy that pushes the workout forward.',
    },
  },
  male: {
    displayName: 'Leo',
    voice: 'Schedar', // official trait: Even — DRAFT, not auditioned
    status: 'draft',
    accent: { ko: 'chungcheong', en: 'british' }, // PROPOSED
    style: {
      ko: 'A calm, focused male fitness coach. Korean with a gentle Chungcheong-do (central Korean) lilt, unhurried and steady, measured and reassuring. Restrained, not a caricature.',
      en: 'A calm, focused male fitness coach. Measured British English accent, steady low energy, quiet authority, never rushed.',
    },
  },
  sofia: {
    displayName: 'Sofia',
    voice: 'Autonoe', // official trait: Bright — auditioned 2026-11-14
    status: 'auditioned',
    accent: { ko: 'jeolla', en: 'australian' }, // PROPOSED (dialect goes in the bank wording; style only steers intonation)
    style: {
      ko: 'A warm, upbeat female fitness coach. Natural Korean, lively and rhythmic, genuinely celebrating effort like a supportive older sister.',
      en: 'A warm, upbeat female fitness coach. Friendly Australian English accent, lively and rhythmic, genuinely celebrating effort.',
    },
  },
  zara: {
    displayName: 'Zara',
    voice: 'Sadachbia', // official trait: Lively — DRAFT, not auditioned
    status: 'draft',
    accent: { ko: 'standard', en: 'american' }, // PROPOSED (Seoul banmal energy, not a dialect)
    style: {
      ko: 'A bold, high-energy female fitness coach. Standard Seoul Korean in a casual banmal register, loud hype energy, playful and intense.',
      en: 'A bold, high-energy female fitness coach. Standard American English, loud hype energy, playful and intense.',
    },
  },
  marcus: {
    displayName: 'Marcus',
    voice: 'Fenrir', // official trait: Excitable — auditioned 2026-11-14
    status: 'auditioned',
    // Korean dialect direction confirmed worth pursuing in audition; keep the
    // intonation natural and restrained, never a caricature.
    accent: { ko: 'gyeongsang', en: 'american' },
    style: {
      ko: 'A powerful, driven male drill coach with a deep voice. Korean spoken with a natural Busan/Gyeongsang (southeastern Korean) edge, firm and restrained, not exaggerated. Short clipped commands, driving hard through every countdown without shouting abuse.',
      en: 'A powerful, driven male drill coach with a deep voice. General American English. Short clipped commands, driving hard through every countdown without shouting abuse.',
    },
  },
  kai: {
    displayName: 'Kai',
    voice: 'Callirrhoe', // official trait: Easy-going — DRAFT, not auditioned
    status: 'draft',
    accent: { ko: 'gangwon', en: 'australian' }, // PROPOSED
    style: {
      ko: 'An easygoing, mindful male fitness coach. Korean with a soft Gangwon-do (northeastern Korean) rural lilt, relaxed and slow, yoga-teacher calm. Restrained, not a caricature.',
      en: 'An easygoing, mindful male fitness coach. Laid-back Australian English accent, relaxed and slow, yoga-teacher calm.',
    },
  },
  nina: {
    displayName: 'Nina',
    voice: 'Erinome', // official trait: Clear — DRAFT, not auditioned
    status: 'draft',
    accent: { ko: 'standard', en: 'british' }, // PROPOSED
    style: {
      ko: 'A precise, playful female fitness coach. Standard Seoul Korean, crisp articulation, light and fun but exact about form.',
      en: 'A precise, playful female fitness coach. Crisp British English accent, light and fun but exact about form.',
    },
  },
}

export const VOICE_LANGUAGES = ['ko', 'en']
