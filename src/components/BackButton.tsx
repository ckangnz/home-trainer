import { useNavigate } from 'react-router-dom'
import { useT } from '@/i18n'
import { Icon } from '@/app/Icons'

export function BackButton({ fallback, label }: { fallback: string; label?: string }) {
  const navigate = useNavigate()
  const t = useT()
  const back = () => {
    const index = (window.history.state as { idx?: number } | null)?.idx ?? 0
    if (index > 0) {
      navigate(-1)
    } else {
      navigate(fallback, { replace: true })
    }
  }
  return (
    <button type="button" className="btn btn--ghost btn--small page-back" onClick={back}>
      <Icon name="back" />
      {label ?? t('common.back')}
    </button>
  )
}
