import { useEffect, useRef, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: string }>
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)
  const requestingRef = useRef(false)

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault()
      setDeferred(event as BeforeInstallPromptEvent)
    }
    const onInstalled = () => {
      setInstalled(true)
      setDeferred(null)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (installed || deferred === null) {
    return null
  }

  const install = async () => {
    if (requestingRef.current) {
      return
    }
    requestingRef.current = true
    const promptEvent = deferred
    setDeferred(null)
    try {
      await promptEvent.prompt()
      await promptEvent.userChoice
    } catch {
      setDeferred(promptEvent)
    } finally {
      requestingRef.current = false
    }
  }

  return (
    <button
      type="button"
      className="button button--ghost"
      onClick={() => {
        void install()
      }}
    >
      Install app
    </button>
  )
}
