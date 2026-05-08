'use client'

import { useEffect } from 'react'
import { useLanguageStore } from '@/stores/language-store'

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const { language, isRTL } = useLanguageStore()

  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr'
    document.documentElement.lang = language
  }, [language, isRTL])

  return <>{children}</>
}
