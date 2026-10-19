import { localizer } from '@/i18n/content'
import type { Language } from '@/i18n/types'
import { CATEGORY_LABEL, EQUIPMENT_LABEL, MUSCLE_LABEL } from './labels'
import type { ExerciseInfo } from './types'

type Searchable = Pick<ExerciseInfo, 'id' | 'name' | 'summary' | 'category' | 'tags' | 'muscles' | 'equipment' | 'family' | 'variant'>

const haystacks = new WeakMap<Searchable, string>()
const koreanHaystacks = new WeakMap<Searchable, string>()

function koreanHaystack(exercise: Searchable): string {
  let text = koreanHaystacks.get(exercise)
  if (text === undefined) {
    const content = localizer('ko')
    const { labels } = content
    text = [
      haystack(exercise),
      content.exerciseName(exercise),
      content.exerciseVariant(exercise),
      exercise.family ? labels.family[exercise.family] : undefined,
      content.exerciseSummary(exercise),
      labels.category[exercise.category],
      ...exercise.tags.map((tag) => labels.category[tag]),
      ...exercise.muscles.map((muscle) => labels.muscle[muscle]),
      labels.equipment[exercise.equipment],
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    if (content.language === 'ko') {
      koreanHaystacks.set(exercise, text)
    }
  }
  return text
}

function haystack(exercise: Searchable): string {
  let text = haystacks.get(exercise)
  if (text === undefined) {
    text = [
      exercise.name,
      exercise.variant,
      exercise.family?.replace(/-/g, ' '),
      exercise.summary,
      CATEGORY_LABEL[exercise.category],
      ...exercise.tags.map((tag) => CATEGORY_LABEL[tag]),
      ...exercise.muscles.map((muscle) => MUSCLE_LABEL[muscle]),
      EQUIPMENT_LABEL[exercise.equipment],
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .replace(/[-‑]/g, ' ')
    haystacks.set(exercise, text)
  }
  return text
}

export function matchesQuery(exercise: Searchable, query: string, language: Language = 'en'): boolean {
  const words = query.toLowerCase().replace(/[-‑]/g, ' ').split(/\s+/).filter(Boolean)
  if (words.length === 0) {
    return true
  }
  const text = language === 'ko' ? koreanHaystack(exercise) : haystack(exercise)
  return words.every((word) => text.includes(word.endsWith('s') && word.length > 3 ? word.slice(0, -1) : word))
}
