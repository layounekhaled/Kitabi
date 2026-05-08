'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Language = 'fr' | 'ar' | 'en'

interface LanguageState {
  language: Language
  isRTL: boolean
  setLanguage: (lang: Language) => void
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: 'fr',
      isRTL: false,
      setLanguage: (lang: Language) => {
        set({
          language: lang,
          isRTL: lang === 'ar',
        })
        // Update document direction for RTL support
        if (typeof document !== 'undefined') {
          document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
          document.documentElement.lang = lang
        }
      },
    }),
    {
      name: 'kitabi-language',
      onRehydrateStorage: () => (state) => {
        if (state && typeof document !== 'undefined') {
          document.documentElement.dir = state.language === 'ar' ? 'rtl' : 'ltr'
          document.documentElement.lang = state.language
        }
      },
    }
  )
)
