import { Link } from 'react-router-dom'
import { EXERCISES, getExercise } from '@/exercises'
import { CATEGORY_ORDER } from '@/exercises/labels'
import { useContent, useT } from '@/i18n'
import { CURATED_WORKOUTS } from '@/workouts/curated'
import { WorkoutCard } from '@/components/WorkoutCard'
import { usePageMeta } from '@/app/meta'
import { SITE } from '@/app/site'
import { Icon, type IconName } from '@/app/Icons'
import './landing.css'
import { ExerciseFigure } from '@/components/ExerciseFigure'

const FEATURES: { icon: IconName; key: 'moves' | 'build' | 'share' | 'friends' | 'health' | 'install' }[] = [
  { icon: 'grid', key: 'moves' },
  { icon: 'edit', key: 'build' },
  { icon: 'share', key: 'share' },
  { icon: 'users', key: 'friends' },
  { icon: 'heart', key: 'health' },
  { icon: 'download', key: 'install' },
]

const FAQ = ['free', 'install', 'signIn', 'sevenMinute'] as const

const MOVE_COUNT = Math.max(10, Math.floor(EXERCISES.length / 10) * 10)

export function LandingPage() {
  usePageMeta(SITE.name)
  const t = useT()
  const content = useContent()
  const hero = getExercise('jumping-jacks') ?? EXERCISES[0]
  return (
    <div className="landing">
      <section className="hero">
        <div className="hero__copy">
          <p className="eyebrow">{t('publicPages.landing.eyebrow')}</p>
          <h1 className="hero__title">{t('publicPages.landing.title')}</h1>
          <p className="hero__lead">{t('publicPages.landing.lead')}</p>
          <div className="row row--wrap">
            <Link to="/workouts/classic-7-minute" className="btn btn--primary btn--lg">
              <Icon name="play" />
              {t('publicPages.landing.start')}
            </Link>
            <Link to="/exercises" className="btn btn--lg">
              {t('publicPages.landing.browse')}
            </Link>
          </div>
        </div>
        {hero ? (
          <div className="hero__stage stage">
            <ExerciseFigure exerciseId={hero.id} label={t('publicPages.landing.demonstration', { name: content.exerciseName(hero) })} />
          </div>
        ) : null}
      </section>

      <section className="features" aria-label={t('publicPages.landing.featuresLabel')}>
        {FEATURES.map((feature) => (
          <article key={feature.key} className="feature card">
            <span className="feature__icon">
              <Icon name={feature.icon} />
            </span>
            <h2 className="feature__title">{t(`publicPages.landing.features.${feature.key}.title`, { n: MOVE_COUNT })}</h2>
            <p className="muted">{t(`publicPages.landing.features.${feature.key}.body`)}</p>
          </article>
        ))}
      </section>

      <section className="section">
        <div className="section__head">
          <h2 className="section__title">{t('publicPages.landing.popular')}</h2>
          <Link to="/workouts" className="section__link">
            {t('publicPages.landing.seeAll')}
          </Link>
        </div>
        <div className="grid grid--wide">
          {CURATED_WORKOUTS.slice(0, 6).map((workout) => (
            <WorkoutCard key={workout.id} workout={workout} />
          ))}
        </div>
      </section>

      <section className="section">
        <h2 className="section__title">{t('publicPages.landing.trainWhat')}</h2>
        <div className="chip-row">
          {CATEGORY_ORDER.map((category) => (
            <Link key={category} to={`/exercises?category=${category}`} className="chip">
              {content.labels.category[category]}
            </Link>
          ))}
        </div>
      </section>

      <section className="section faq">
        <h2 className="section__title">{t('publicPages.landing.questions')}</h2>
        {FAQ.map((entry) => (
          <details key={entry} className="faq__item">
            <summary>{t(`publicPages.landing.faq.${entry}.q`)}</summary>
            <p className="muted">{t(`publicPages.landing.faq.${entry}.a`)}</p>
          </details>
        ))}
      </section>
    </div>
  )
}
