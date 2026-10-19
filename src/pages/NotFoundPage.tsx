import { Link } from 'react-router-dom'
import { usePageMeta } from '@/app/meta'
import { useT } from '@/i18n'

export function NotFoundPage() {
  const t = useT()
  usePageMeta(t('publicPages.notFound.meta'))
  return (
    <div className="page page--narrow">
      <div className="empty">
        <h1 className="section__title">{t('publicPages.notFound.title')}</h1>
        <p>{t('publicPages.notFound.body')}</p>
        <div className="row row--wrap">
          <Link to="/workouts" className="btn btn--primary">
            {t('publicPages.notFound.browse')}
          </Link>
          <Link to="/exercises" className="btn">
            {t('publicPages.notFound.library')}
          </Link>
        </div>
      </div>
    </div>
  )
}
