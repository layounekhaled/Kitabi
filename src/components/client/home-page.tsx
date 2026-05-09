'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen, Printer, Award, Library, Truck,
  ArrowRight, Sparkles, Info, Tag, ChevronRight,
  Globe, Languages, BookMarked, Search
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { useRouterStore } from '@/stores/router-store'
import { useTranslation } from '@/lib/i18n'
import { BookCard, type BookData } from './book-card'
import { getGenreLabel, getGenreIcon, getGenreColor, genreLabels } from '@/lib/genre-utils'

// ─── Language Selection Data ───
const bookLanguages = [
  {
    code: 'ar',
    flag: '🇩🇿',
    titleFr: 'Livres en Arabe',
    titleAr: 'كتب باللغة العربية',
    titleEn: 'Arabic Books',
    descFr: 'روايات، شعر، دين، تاريخ وأكثر',
    descAr: 'روايات، شعر، دين، تاريخ وأكثر',
    descEn: 'Novels, poetry, religion, history and more',
    color: 'from-emerald-500 to-teal-700',
    bgLight: 'bg-emerald-50',
    textColor: 'text-emerald-700',
    icon: '📖',
  },
  {
    code: 'fr',
    flag: '🇫🇷',
    titleFr: 'Livres en Français',
    titleAr: 'كتب باللغة الفرنسية',
    titleEn: 'French Books',
    descFr: 'Romans, sciences, philosophie, art et plus',
    descAr: 'روايات، علوم، فلسفة، فن وأكثر',
    descEn: 'Novels, sciences, philosophy, art and more',
    color: 'from-blue-500 to-indigo-700',
    bgLight: 'bg-blue-50',
    textColor: 'text-blue-700',
    icon: '📚',
  },
  {
    code: 'en',
    flag: '🇬🇧',
    titleFr: 'Livres en Anglais',
    titleAr: 'كتب باللغة الإنجليزية',
    titleEn: 'English Books',
    descFr: 'Fiction, science, education, biographies and more',
    descAr: 'روايات، علوم، تعليم، سير ذاتية وأكثر',
    descEn: 'Fiction, science, education, biographies and more',
    color: 'from-amber-500 to-orange-700',
    bgLight: 'bg-amber-50',
    textColor: 'text-amber-700',
    icon: '📕',
  },
]

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5 },
  }),
}

const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
}

interface GenreWithBooks {
  genre: string
  count: number
  books: BookData[]
}

export function HomePage() {
  const { t, language } = useTranslation()
  const navigate = useRouterStore((s) => s.navigate)
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null)
  const [genresForLang, setGenresForLang] = useState<Array<{ genre: string; count: number }>>([])
  const [genreBooks, setGenreBooks] = useState<GenreWithBooks[]>([])
  const [featuredBooks, setFeaturedBooks] = useState<BookData[]>([])
  const [loadingGenres, setLoadingGenres] = useState(false)
  const [loadingBooks, setLoadingBooks] = useState(true)
  const [langBookCounts, setLangBookCounts] = useState<Record<string, number>>({})

  // Fetch total book counts per language
  useEffect(() => {
    async function fetchCounts() {
      try {
        const results: Record<string, number> = {}
        await Promise.all(
          ['ar', 'fr', 'en'].map(async (lang) => {
            const res = await fetch(`/api/books?language=${lang}&limit=1`)
            if (res.ok) {
              const data = await res.json()
              results[lang] = data.pagination?.total || 0
            }
          })
        )
        setLangBookCounts(results)
      } catch { /* silent */ }
    }
    fetchCounts()
  }, [])

  // Fetch featured books
  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/books?limit=8')
        if (res.ok) {
          const data = await res.json()
          setFeaturedBooks(data.books || [])
        }
      } catch { /* silent */ } finally {
        setLoadingBooks(false)
      }
    }
    fetchData()
  }, [])

  // Fetch genres when language is selected
  const fetchGenresForLang = useCallback(async (lang: string) => {
    setLoadingGenres(true)
    try {
      const res = await fetch(`/api/books/genres?language=${lang}`)
      if (res.ok) {
        const data = await res.json()
        setGenresForLang(data.genres || [])

        // Fetch 4 books per genre for preview
        const genreData: GenreWithBooks[] = []
        const topGenres = (data.genres || []).slice(0, 6)
        await Promise.all(
          topGenres.map(async (g: { genre: string; count: number }) => {
            try {
              const booksRes = await fetch(`/api/books?genre=${g.genre}&language=${lang}&limit=4`)
              if (booksRes.ok) {
                const bd = await booksRes.json()
                genreData.push({
                  genre: g.genre,
                  count: g.count,
                  books: (bd.books || []).slice(0, 4),
                })
              }
            } catch { /* skip */ }
          })
        )
        setGenreBooks(genreData)
      }
    } catch { /* silent */ } finally {
      setLoadingGenres(false)
    }
  }, [])

  const handleLanguageSelect = (langCode: string) => {
    if (selectedLanguage === langCode) {
      setSelectedLanguage(null)
      setGenresForLang([])
      setGenreBooks([])
    } else {
      setSelectedLanguage(langCode)
      fetchGenresForLang(langCode)
    }
  }

  const handleGenreClick = (genreSlug: string) => {
    navigate('catalog', { language: selectedLanguage!, genre: genreSlug })
  }

  const getLangTitle = (lang: typeof bookLanguages[0]) => {
    if (language === 'ar') return lang.titleAr
    if (language === 'en') return lang.titleEn
    return lang.titleFr
  }

  const getLangDesc = (lang: typeof bookLanguages[0]) => {
    if (language === 'ar') return lang.descAr
    if (language === 'en') return lang.descEn
    return lang.descFr
  }

  const browseByGenreTitle = language === 'ar' ? 'تصفح حسب النوع' : language === 'en' ? 'Browse by Genre' : 'Parcourir par genre'

  const whyFeatures = [
    { icon: <Printer className="h-7 w-7 text-gold" />, title: t('home.fastPrinting'), desc: t('home.fastPrintingDesc') },
    { icon: <Award className="h-7 w-7 text-gold" />, title: t('home.qualityPrint'), desc: t('home.qualityPrintDesc') },
    { icon: <Library className="h-7 w-7 text-gold" />, title: t('home.wideSelection'), desc: t('home.wideSelectionDesc') },
    { icon: <Truck className="h-7 w-7 text-gold" />, title: t('home.deliveryAcross'), desc: t('home.deliveryAcrossDesc') },
  ]

  const steps = [
    { num: '1', title: t('home.step1'), desc: t('home.step1Desc'), icon: <BookOpen className="h-6 w-6" /> },
    { num: '2', title: t('home.step2'), desc: t('home.step2Desc'), icon: <Printer className="h-6 w-6" /> },
    { num: '3', title: t('home.step3'), desc: t('home.step3Desc'), icon: <Truck className="h-6 w-6" /> },
    { num: '4', title: t('home.step4'), desc: t('home.step4Desc'), icon: <Sparkles className="h-6 w-6" /> },
  ]

  return (
    <div className="animate-fade-in">
      {/* ═══════ Hero Section ═══════ */}
      <section className="relative overflow-hidden bg-navy">
        <div className="absolute inset-0 bg-gradient-to-br from-navy via-navy/95 to-navy/80" />
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 start-10 w-72 h-72 bg-gold rounded-full blur-3xl" />
          <div className="absolute bottom-10 end-10 w-96 h-96 bg-gold/50 rounded-full blur-3xl" />
          <div className="absolute top-1/2 start-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-white/5 rounded-full blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-28">
          <div className="max-w-3xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gold/20 text-gold text-sm font-medium mb-6">
                <Sparkles className="h-4 w-4" />
                {t('home.printOnDemand')}
              </div>
              <h1 className="font-heading text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-white leading-tight mb-6">
                {t('home.heroTitle')}
              </h1>
              <p className="text-lg sm:text-xl text-white/70 mb-8 leading-relaxed">
                {t('home.heroSubtitle')}
              </p>

              {/* ─── Step 1: Language Selection ─── */}
              <div className="mt-8">
                <p className="text-white/50 text-sm font-medium uppercase tracking-wider mb-4">
                  {language === 'ar' ? 'خطوة ١: اختر لغة الكتاب' : language === 'en' ? 'Step 1: Choose the book language' : 'Étape 1 : Choisissez la langue du livre'}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto">
                  {bookLanguages.map((lang, i) => (
                    <motion.button
                      key={lang.code}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 + i * 0.1, duration: 0.4 }}
                      onClick={() => handleLanguageSelect(lang.code)}
                      className={`relative overflow-hidden rounded-2xl p-4 sm:p-5 text-start transition-all duration-300 group ${
                        selectedLanguage === lang.code
                          ? `bg-gradient-to-br ${lang.color} text-white shadow-lg shadow-black/20 scale-[1.02]`
                          : 'bg-white/10 backdrop-blur-sm text-white hover:bg-white/15 border border-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">{lang.flag}</span>
                        <div>
                          <h3 className="font-heading text-sm sm:text-base font-bold leading-tight">
                            {getLangTitle(lang)}
                          </h3>
                        </div>
                      </div>
                      <p className={`text-xs leading-relaxed ${selectedLanguage === lang.code ? 'text-white/80' : 'text-white/50'}`}>
                        {getLangDesc(lang)}
                      </p>
                      {langBookCounts[lang.code] !== undefined && (
                        <Badge
                          className={`mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full border-0 ${
                            selectedLanguage === lang.code
                              ? 'bg-white/20 text-white'
                              : 'bg-white/10 text-white/70'
                          }`}
                        >
                          {langBookCounts[lang.code]} {language === 'ar' ? 'كتاب' : language === 'en' ? 'books' : 'livres'}
                        </Badge>
                      )}
                      {selectedLanguage === lang.code && (
                        <motion.div
                          layoutId="langCheck"
                          className="absolute top-2 end-2 h-6 w-6 bg-white/20 rounded-full flex items-center justify-center"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                        >
                          <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </motion.div>
                      )}
                    </motion.button>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
        {/* Bottom wave */}
        <div className="absolute bottom-0 w-full overflow-hidden leading-none">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
            <path d="M0 60L1440 60L1440 0C1440 0 1080 60 720 60C360 60 0 0 0 0L0 60Z" fill="white" />
          </svg>
        </div>
      </section>

      {/* ═══════ Step 2: Genre Selection (shown after language) ═══════ */}
      <AnimatePresence mode="wait">
        {selectedLanguage && (
          <motion.section
            key={selectedLanguage}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="py-12 sm:py-16 bg-gradient-to-b from-white to-beige/30">
              <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                {/* Step indicator */}
                <div className="text-center mb-8">
                  <div className="inline-flex items-center gap-2 text-sm font-medium text-gold mb-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gold text-white text-xs font-bold">2</span>
                    {language === 'ar'
                      ? 'اختر النوع الأدبي'
                      : language === 'en'
                        ? 'Choose the literary genre'
                        : 'Choisissez le genre littéraire'}
                  </div>
                  <h2 className="font-heading text-2xl sm:text-3xl font-bold text-navy">
                    {browseByGenreTitle}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-2">
                    {language === 'ar'
                      ? 'تصفح الأنواع المتاحة واختر ما يناسبك'
                      : language === 'en'
                        ? 'Browse available genres and pick what interests you'
                        : 'Parcourez les genres disponibles et choisissez ce qui vous intéresse'}
                  </p>
                </div>

                {/* "All books in this language" button */}
                <div className="flex justify-center mb-8">
                  <Button
                    variant="outline"
                    onClick={() => navigate('catalog', { language: selectedLanguage })}
                    className="border-gold/40 text-gold hover:bg-gold hover:text-white font-medium rounded-full px-6"
                  >
                    <BookOpen className="me-2 h-4 w-4" />
                    {language === 'ar'
                      ? 'عرض جميع الكتب'
                      : language === 'en'
                        ? `View all ${bookLanguages.find(l => l.code === selectedLanguage)?.flag} books`
                        : `Voir tous les livres ${bookLanguages.find(l => l.code === selectedLanguage)?.flag}`}
                    <ArrowRight className="ms-2 h-4 w-4 rtl-flip" />
                  </Button>
                </div>

                {loadingGenres ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                    {Array.from({ length: 12 }).map((_, i) => (
                      <div key={i} className="space-y-3">
                        <Skeleton className="aspect-square w-full rounded-2xl" />
                        <Skeleton className="h-4 w-3/4 mx-auto" />
                        <Skeleton className="h-3 w-1/2 mx-auto" />
                      </div>
                    ))}
                  </div>
                ) : genresForLang.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
                    {genresForLang.map((g, i) => {
                      const info = genreLabels[g.genre]
                      return (
                        <motion.div
                          key={g.genre}
                          custom={i}
                          variants={fadeUp}
                          initial="hidden"
                          animate="visible"
                        >
                          <button
                            onClick={() => handleGenreClick(g.genre)}
                            className="group w-full text-start"
                          >
                            <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${getGenreColor(g.genre)} p-4 sm:p-5 text-white shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1`}>
                              <div className="absolute top-2 end-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <ArrowRight className="h-4 w-4 rtl-flip" />
                              </div>
                              <div className="text-3xl mb-3">{getGenreIcon(g.genre)}</div>
                              <h3 className="font-heading text-sm font-bold mb-1 leading-tight">
                                {getGenreLabel(g.genre, language)}
                              </h3>
                              <p className="text-xs text-white/70">
                                {g.count} {language === 'ar' ? 'كتاب' : language === 'en' ? 'books' : 'livres'}
                              </p>
                            </div>
                          </button>
                        </motion.div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <BookOpen className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                    <p className="text-muted-foreground">
                      {language === 'ar'
                        ? 'لا توجد كتب مصنفة في هذه اللغة بعد'
                        : language === 'en'
                          ? 'No classified books in this language yet'
                          : 'Aucun livre classé dans cette langue pour le moment'}
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => navigate('catalog', { language: selectedLanguage })}
                      className="mt-4"
                    >
                      {language === 'ar'
                        ? 'تصفح جميع الكتب'
                        : language === 'en'
                          ? 'Browse all books'
                          : 'Parcourir tous les livres'}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* ═══════ Genre Book Previews (shown after language & genres loaded) ═══════ */}
      <AnimatePresence mode="wait">
        {selectedLanguage && genreBooks.length > 0 && !loadingGenres && (
          <motion.section
            key={`books-${selectedLanguage}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="py-12 sm:py-16"
          >
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="space-y-10">
                {genreBooks.map((group, idx) => (
                  <motion.div
                    key={group.genre}
                    custom={idx}
                    variants={fadeUp}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: '-30px' }}
                  >
                    {/* Genre Header */}
                    <div
                      className="flex items-center justify-between mb-4 cursor-pointer group"
                      onClick={() => handleGenreClick(group.genre)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${getGenreColor(group.genre)} text-white shadow-sm`}>
                          <span className="text-xl">{getGenreIcon(group.genre)}</span>
                        </div>
                        <div>
                          <h3 className="font-heading text-lg font-bold text-navy group-hover:text-gold transition-colors">
                            {getGenreLabel(group.genre, language)}
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            {group.count} {language === 'ar' ? 'كتاب' : language === 'en' ? 'books' : 'livres'}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-gold text-xs"
                      >
                        {language === 'ar' ? 'المزيد' : language === 'en' ? 'More' : 'Plus'}
                        <ChevronRight className="ms-1 h-3.5 w-3.5 rtl-flip" />
                      </Button>
                    </div>

                    {/* Books Preview */}
                    {group.books.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                        {group.books.map((book) => (
                          <BookCard key={book.id} book={book} />
                        ))}
                      </div>
                    ) : null}

                    {/* Divider */}
                    {idx < genreBooks.length - 1 && (
                      <div className="mt-10 h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* ═══════ Featured Books (shown only when no language selected) ═══════ */}
      {!selectedLanguage && (
        <section className="py-12 sm:py-16 bg-beige/40">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="font-heading text-2xl sm:text-3xl font-bold text-navy">
                  {t('home.featuredBooks')}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {language === 'ar' ? 'أحدث الإضافات إلى مكتبتنا' : language === 'en' ? 'Latest additions to our library' : 'Derniers ajouts à notre catalogue'}
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => navigate('catalog')}
                className="border-gold/40 text-gold hover:bg-gold hover:text-white"
              >
                {t('home.viewAll')}
                <ArrowRight className="ms-1.5 h-4 w-4 rtl-flip" />
              </Button>
            </div>
            {loadingBooks ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="space-y-3">
                    <Skeleton className="aspect-[3/4] w-full rounded-xl" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-4 w-1/3" />
                  </div>
                ))}
              </div>
            ) : featuredBooks.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                {featuredBooks.map((book) => (
                  <BookCard key={book.id} book={book} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>{t('common.noResults')}</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ═══════ Why Kitibi ═══════ */}
      <section className="py-12 sm:py-16 bg-beige/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            className="text-center mb-10"
          >
            <h2 className="font-heading text-2xl sm:text-3xl font-bold text-navy mb-3">
              {t('home.whyKitibi')}
            </h2>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {whyFeatures.map((feature, i) => (
              <motion.div
                key={feature.title}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-30px' }}
              >
                <Card className="h-full border-border/50 text-center hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                  <CardContent className="p-6 space-y-3">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gold/10">
                      {feature.icon}
                    </div>
                    <h3 className="font-heading text-base font-semibold text-navy">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {feature.desc}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ How It Works ═══════ */}
      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            className="text-center mb-10"
          >
            <h2 className="font-heading text-2xl sm:text-3xl font-bold text-navy mb-3">
              {t('home.howItWorks')}
            </h2>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, i) => (
              <motion.div
                key={step.num}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-30px' }}
              >
                <div className="relative text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-navy text-white mb-4 shadow-lg">
                    {step.icon}
                  </div>
                  <div className="absolute top-0 start-1/2 -translate-x-1/2 -translate-y-1 bg-gold text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center">
                    {step.num}
                  </div>
                  <h3 className="font-heading text-base font-semibold text-navy mb-2 mt-1">
                    {step.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ Print on Demand Notice ═══════ */}
      <section className="py-12 sm:py-16 bg-beige/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Card className="border-gold/30 bg-gradient-to-r from-gold/5 to-transparent">
            <CardContent className="p-6 sm:p-8 flex flex-col sm:flex-row items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gold/10">
                <Info className="h-6 w-6 text-gold" />
              </div>
              <div>
                <h3 className="font-heading text-lg font-semibold text-navy mb-2">
                  {t('home.printOnDemand')}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t('home.printOnDemandDesc')}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
