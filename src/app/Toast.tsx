import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'

interface ToastContextValue {
  notify: (message: string) => void
}

const ToastContext = createContext<ToastContextValue>({ notify: () => {} })

const TOAST_MS = 2600

export function ToastProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<{ id: number; text: string }[]>([])
  const counter = useRef(0)

  const notify = useCallback((text: string) => {
    counter.current += 1
    const id = counter.current
    setMessages((current) => [...current.slice(-2), { id, text }])
    window.setTimeout(() => setMessages((current) => current.filter((message) => message.id !== id)), TOAST_MS)
  }, [])

  const value = useMemo(() => ({ notify }), [notify])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-region" role="status" aria-live="polite">
        {messages.map((message) => (
          <div key={message.id} className="toast">
            {message.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  return useContext(ToastContext)
}
