import { Link } from 'react-router-dom'
import { usePageMeta } from '@/app/meta'

export function NotFoundPage() {
  usePageMeta('Page not found')
  return (
    <div className="page page--narrow">
      <div className="empty">
        <h1 className="section__title">We could not find that page</h1>
        <p>The link may be broken or the page may have moved.</p>
        <div className="row row--wrap">
          <Link to="/workouts" className="btn btn--primary">
            Browse workouts
          </Link>
          <Link to="/exercises" className="btn">
            Exercise library
          </Link>
        </div>
      </div>
    </div>
  )
}
