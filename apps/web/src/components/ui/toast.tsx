'use client'

import * as ToastPrimitive from '@radix-ui/react-toast'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'
import { createContext, useCallback, useContext, useState } from 'react'

import { cn } from '@/lib/utils'

type ToastVariant = 'success' | 'error' | 'info'

interface Toast {
  id: string
  message: string
  variant: ToastVariant
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant) => void
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

let _idCounter = 0

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((message: string, variant: ToastVariant = 'info') => {
    const id = String(++_idCounter)
    setToasts((prev) => [...prev, { id, message, variant }])
  }, [])

  function dismiss(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <ToastContext.Provider value={{ toast }}>
      <ToastPrimitive.Provider swipeDirection="right" duration={4000}>
        {children}

        {toasts.map((t) => (
          <ToastPrimitive.Root
            key={t.id}
            open
            onOpenChange={(open) => {
              if (!open) dismiss(t.id)
            }}
            className={cn(
              'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border px-4 py-3 shadow-lg',
              'data-[state=open]:animate-in data-[state=closed]:animate-out',
              'data-[swipe=end]:animate-out data-[swipe=cancel]:translate-x-0',
              'data-[state=closed]:fade-out-80 data-[state=open]:slide-in-from-bottom-4',
              'data-[state=closed]:slide-out-to-right-full',
              'transition-all duration-200',
              t.variant === 'success' && 'border-green-200 bg-white',
              t.variant === 'error' && 'border-red-200 bg-white',
              t.variant === 'info' && 'border-[var(--color-border)] bg-white',
            )}
          >
            <span className="mt-0.5 shrink-0">
              {t.variant === 'success' && <CheckCircle2 className="h-4 w-4 text-green-600" />}
              {t.variant === 'error' && <AlertCircle className="h-4 w-4 text-red-500" />}
              {t.variant === 'info' && <Info className="h-4 w-4 text-blue-500" />}
            </span>
            <ToastPrimitive.Description className="flex-1 text-sm text-[var(--color-foreground)]">
              {t.message}
            </ToastPrimitive.Description>
            <ToastPrimitive.Close
              onClick={() => dismiss(t.id)}
              className="shrink-0 rounded p-0.5 text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--color-foreground)]"
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </ToastPrimitive.Close>
          </ToastPrimitive.Root>
        ))}

        <ToastPrimitive.Viewport className="fixed bottom-20 right-4 z-[100] flex w-full max-w-sm flex-col gap-2 lg:bottom-6" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  )
}
