import { Link } from 'react-router-dom'
import { Figure } from '@/figure/Figure'
import { EXERCISES, getExercise } from '@/exercises'
import { CATEGORY_LABEL, CATEGORY_ORDER } from '@/exercises/labels'
import { CURATED_WORKOUTS } from '@/workouts/curated'
import { WorkoutCard } from '@/components/WorkoutCard'
import { usePageMeta } from '@/app/meta'
import { SITE } from '@/app/site'
import { Icon, type IconName } from '@/app/Icons'
import './landing.css'

const FEATURES: { icon: IconName; title: string; body: string }[] = [
  {
    icon: 'grid',
    title: `${Math.max(10, Math.floor(EXERCISES.length / 10) * 10)}+ animated moves`,
    body: 'Bodyweight, dumbbells, kettlebells, barbells, stretching, and foam rolling. Each move has an animation, steps, form tips, and a muscle map.',
  },
  {
    icon: 'edit',
    title: 'Build your own routine',
    body: 'Pick exercises, set time or reps, add sets and rounds, and choose your rest.',
  },
  {
    icon: 'share',
    title: 'Share with a code',
    body: 'Send a short code to a friend and your routine lands in their list in one tap.',
  },
  {
    icon: 'users',
    title: 'Train with friends',
    body: 'Add friends or your personal trainer to see each other’s workouts and copy each other’s routines.',
  },
  {
    icon: 'heart',
    title: 'Save to Health',
    body: 'Send finished workouts with time and estimated calories to Apple Health, or export a file for other apps.',
  },
  {
    icon: 'download',
    title: 'No download needed',
    body: 'Runs in your browser and installs to your home screen. Workouts you have opened work offline.',
  },
]

const FAQ = [
  {
    q: 'Is HomeTrainer really free?',
    a: 'Yes. Every workout, exercise, and feature is free. A small ad appears on some rest screens, never while you are exercising.',
  },
  {
    q: 'Do I need to install anything?',
    a: 'No. Open the site in any modern browser. On a phone you can add it to your home screen so it opens full screen like an app.',
  },
  {
    q: 'Why do I need to sign in?',
    a: 'Signing in with Google lets us save your routines and workout history to your account so they follow you to any device.',
  },
  {
    q: 'What is the 7-minute workout?',
    a: 'A circuit of 12 bodyweight exercises, 30 seconds each with 10 seconds of transition, described by Klika and Jordan in 2013. Repeat it two or three times for a longer session.',
  },
]

export function LandingPage() {
  usePageMeta(SITE.name)
  const hero = getExercise('jumping-jacks') ?? EXERCISES[0]
  return (
    <div className="landing">
      <section className="hero">
        <div className="hero__copy">
          <p className="eyebrow">Free · No download · No subscription</p>
          <h1 className="hero__title">Your free 7-minute workout coach</h1>
          <p className="hero__lead">
            Follow animated guides with a voice coach, build routines with time, reps, sets, and rounds, and share them
            with friends using a simple code.
          </p>
          <div className="row row--wrap">
            <Link to="/workouts/classic-7-minute" className="btn btn--primary btn--lg">
              <Icon name="play" />
              Start the 7-minute workout
            </Link>
            <Link to="/exercises" className="btn btn--lg">
              Browse exercises
            </Link>
          </div>
        </div>
        {hero ? (
          <div className="hero__stage stage">
            <Figure animation={hero.animation} label={`${hero.name} demonstration`} />
          </div>
        ) : null}
      </section>

      <section className="features" aria-label="Features">
        {FEATURES.map((feature) => (
          <article key={feature.title} className="feature card">
            <span className="feature__icon">
              <Icon name={feature.icon} />
            </span>
            <h2 className="feature__title">{feature.title}</h2>
            <p className="muted">{feature.body}</p>
          </article>
        ))}
      </section>

      <section className="section">
        <div className="section__head">
          <h2 className="section__title">Popular workouts</h2>
          <Link to="/workouts" className="section__link">
            See all
          </Link>
        </div>
        <div className="grid grid--wide">
          {CURATED_WORKOUTS.slice(0, 6).map((workout) => (
            <WorkoutCard key={workout.id} workout={workout} />
          ))}
        </div>
      </section>

      <section className="section">
        <h2 className="section__title">Train what you want</h2>
        <div className="chip-row">
          {CATEGORY_ORDER.map((category) => (
            <Link key={category} to={`/exercises?category=${category}`} className="chip">
              {CATEGORY_LABEL[category]}
            </Link>
          ))}
        </div>
      </section>

      <section className="section faq">
        <h2 className="section__title">Questions</h2>
        {FAQ.map((entry) => (
          <details key={entry.q} className="faq__item">
            <summary>{entry.q}</summary>
            <p className="muted">{entry.a}</p>
          </details>
        ))}
      </section>
    </div>
  )
}
