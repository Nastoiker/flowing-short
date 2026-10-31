"use client"
import { PropsWithChildren, useRef } from 'react'
import { AppStore, makeStore } from '@/stores/index'
import { Provider } from 'react-redux'
export default function ReduxProvider({children}: PropsWithChildren) {
  const store = useRef<AppStore | null>(null)
  if (!store.current) store.current = makeStore()
  return <Provider store={store.current}>{children}</Provider>
}
