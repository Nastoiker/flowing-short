"use client"
import { PropsWithChildren } from 'react'
import ReduxProvider from '@/stores/provider'
export default function Providers({children}: PropsWithChildren) {
  return <ReduxProvider>{children}</ReduxProvider>
}
