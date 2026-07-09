'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

type PageState = 'verifying' | 'success' | 'pending' | 'error'

function PaymentReturnContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [state, setState] = useState<PageState>('verifying')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const interestId = searchParams.get('interestId')
  const transactionId = searchParams.get('transactionId')
  const isDemo = searchParams.get('demo') === '1'

  useEffect(() => {
    if (isDemo) {
      setState('success')
      return
    }
    if (!interestId || !transactionId) {
      setState('error')
      setErrorMessage('Missing payment details. Please contact support.')
      return
    }

    async function verify() {
      try {
        const res = await fetch('/api/payments/verify-phonepe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ merchantTransactionId: transactionId, interestId }),
        })
        const data = (await res.json()) as {
          success?: boolean
          error?: string
          code?: string
        }
        if (data.success) {
          setState('success')
        } else if (res.status === 402) {
          setState('pending')
          setErrorMessage(data.error ?? 'Payment not yet confirmed.')
        } else {
          setState('error')
          setErrorMessage(data.error ?? 'Verification failed.')
        }
      } catch {
        setState('error')
        setErrorMessage('Could not verify payment. Please try again.')
      }
    }

    void verify()
  }, [interestId, transactionId, isDemo])

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-4 text-center">
        {state === 'verifying' && (
          <>
            <Loader2 className="text-muted-foreground mx-auto h-8 w-8 animate-spin" />
            <p className="text-muted-foreground text-sm">Verifying payment…</p>
          </>
        )}
        {state === 'success' && (
          <>
            <CheckCircle className="mx-auto h-8 w-8 text-green-500" />
            <p className="text-sm font-semibold text-green-800">Payment successful!</p>
            <p className="text-muted-foreground text-xs">
              You can close this window and return to the listing to see the contact details.
            </p>
            <Button variant="outline" className="w-full" onClick={() => router.back()}>
              Go back
            </Button>
          </>
        )}
        {state === 'pending' && (
          <>
            <Loader2 className="mx-auto h-8 w-8 text-amber-500" />
            <p className="text-sm font-semibold text-amber-700">Payment processing…</p>
            <p className="text-muted-foreground text-xs">{errorMessage}</p>
            <Button variant="outline" className="w-full" onClick={() => router.back()}>
              Back to listing
            </Button>
          </>
        )}
        {state === 'error' && (
          <>
            <AlertCircle className="mx-auto h-8 w-8 text-red-500" />
            <p className="text-sm font-semibold text-red-700">Verification issue</p>
            <p className="text-muted-foreground text-xs">
              {errorMessage ?? 'Something went wrong.'}
            </p>
            <div className="space-y-2">
              <Button variant="outline" className="w-full" onClick={() => router.back()}>
                Back to listing
              </Button>
              <a
                href="mailto:support@chapternew.com"
                className="text-muted-foreground block text-xs underline"
              >
                Contact support
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function PaymentReturnPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
        </div>
      }
    >
      <PaymentReturnContent />
    </Suspense>
  )
}
