"use client"
import { useEffect, useState } from 'react'
import { useCheckAuthQuery } from '@/stores/slices/regapi'

/** Wait for browser hydration and never send protected requests for anonymous visitors. */
export function useCurrentUser() {
  const [hasToken, setHasToken] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => {
    const update = () => { setHasToken(Boolean(localStorage.getItem('token'))); setHydrated(true) }
    update()
    window.addEventListener('storage', update)
    window.addEventListener('auth-changed', update)
    return () => {
      window.removeEventListener('storage', update)
      window.removeEventListener('auth-changed', update)
    }
  }, [])
  const query = useCheckAuthQuery({}, { skip: !hasToken })
  return {...query, isLoading: !hydrated || query.isLoading}
}
