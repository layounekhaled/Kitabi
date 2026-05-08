'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  BookOpen, Printer, Award, Library, Truck,
  ArrowRight, Sparkles, Info
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useRouterStore } from '@/stores/router-store'
import { useTranslation } from '@/lib/i18n'
import { BookCard, type BookData } from './book-card'

interface CategoryCard {
  slug: string
  icon: React.ReactNode
  titleFr: string
  titleAr: string
  titleEn: string
  descFr: string
  descAr: string
  descEn: string
  color: string
  langParam: string
}

const categoryCards: CategoryCard[] = [
  {
    slug: 'livres-arabe',
    icon: <BookOpen className="h-8 w-8" />,
    titleFr: 'Livres en Arabe',
    titleAr: 'كتب عربية',
    titleEn: 'Arabic Books',
    descFr: 'Découvrez notre sélection de livres en langue arabe',
    descAr: 'اكتشف مجموعتنا من الكتب العربية',
    descEn: 'Discover our selection of Arabic books',
    color: 'from-emerald-600 to-emerald-800',
    langParam: 'ar',
  },
  {
    slug: 'livres-francais',
    icon: <BookOpen className="h-8 w-8" />,
    titleFr: 'Livres en Français',
    titleAr: 'كتب فرنسية',
    titleEn: 'French Books',
    descFr: 'Explorez notre collection de livres en français',
    descAr: 'استكشف مجموعتنا من الكتب الفرنسية',
    descEn: 'Explore our collection of French books',
    color: 'from-blue-700 to-blue-900',
    langParam: 'fr',
  },
  {
    slug: 'livres-anglais',
    icon: <BookOpen className="h-8 w-8" />,
    titleFr: 'Livres en Anglais',
    titleAr: 'كتب إنجليزية',
    titleEn: 'English Books',
    descFr: 'Parcourez nos livres en langue anglaise',
    descAr: 'تصفح كتبنا باللغة الإنجليزية',
    descEn: 'Browse our English language books',
    color: 'from-amber-600 to-amber-800',
    langParam: 'en',
  },
]

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5 },
  }),
}

export function HomePage() {
  const { t, language } = useTranslation()
  const navigate = useRouterStore((s) => s.navigate)
  const [featuredBooks, setFeaturedBooks] = useState<BookData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchFeatured() {
      try {
        const res = await fetch('/api/books?limit=8')
        if (res.ok) {
          const data = await res.json()
          setFeaturedBooks(data.books || [])
        }
      } catch {
        // silently handle
      } finally {
        setLoading(false)
      }
    }
    fetchFeatured()
  }, [])

  const getCategoryTitle = (cat: CategoryCard) => {
    if (language === 'ar') return cat.titleAr
    if (language === 'en') return cat.titleEn
    return cat.titleFr
  }

  const getCategoryDesc = (cat: CategoryCard) => {
    if (language === 'ar') return cat.descAr
    if (language === 'en') return cat.descEn
    return cat.descFr
  }

  const whyFeatures = [
    { icon: <Printer className="h-8 w-8 text-gold" />, title: t('home.fastPrinting'), desc: t('home.fastPrintingDesc') },
    { icon: <Award className="h-8 w-8 text-gold" />, title: t('home.qualityPrint'), desc: t('home.qualityPrintDesc') },
    { icon: <Library className="h-8 w-8 text-gold" />, title: t('home.wideSelection'), desc: t('home.wideSelectionDesc') },
    { icon: <Truck className="h-8 w-8 text-gold" />, title: t('home.deliveryAcross'), desc: t('home.deliveryAcrossDesc') },
  ]

  const steps = [
    { num: '1', title: t('home.step1'), desc: t('home.step1Desc'), icon: <BookOpen className="h-7 w-7" /> },
    { num: '2', title: t('home.step2'), desc: t('home.step2Desc'), icon: <Printer className="h-7 w-7" /> },
    { num: '3', title: t('home.step3'), desc: t('home.step3Desc'), icon: <Truck className="h-7 w-7" /> },
    { num: '4', title: t('home.step4'), desc: t('home.step4Desc'), icon: <Sparkles className="h-7 w-7" /> },
  ]

  return (
    <div className="animate-fade-in">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-navy">
        <div className="absolute inset-0 bg-gradient-to-br from-navy via-navy/95 to-navy/80" />
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 start-10 w-72 h-72 bg-gold rounded-full blur-3xl" />
          <div className="absolute bottom-10 end-10 w-96 h-96 bg-gold/50 rounded-full blur-3xl" />
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
              <Button
                size="lg"
                onClick={() => navigate('catalog')}
                className="bg-gold hover:bg-gold/90 text-white font-semibold px-8 h-12 text-base rounded-xl shadow-lg shadow-gold/25"
              >
                {t('home.exploreCatalog')}
                <ArrowRight className="ms-2 h-5 w-5 rtl-flip" />
              </Button>
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

      {/* Category Cards */}
      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            className="text-center mb-10"
          >
            <h2 className="font-heading text-2xl sm:text-3xl font-bold text-navy">
              {t('home.browseCategories')}
            </h2>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            {categoryCards.map((cat, i) => (
              <motion.div
                key={cat.slug}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-30px' }}
              >
                <Card
                  className="cursor-pointer group overflow-hidden border-0 shadow-md hover:shadow-xl transition-all duration-300"
                  onClick={() => navigate('catalog', { language: cat.langParam, category: cat.slug })}
                >
                  <div className={`bg-gradient-to-br ${cat.color} p-6 sm:p-8 text-white`}>
                    <div className="mb-3 opacity-80 group-hover:scale-110 transition-transform">
                      {cat.icon}
                    </div>
                    <h3 className="font-heading text-lg sm:text-xl font-bold mb-2">
                      {getCategoryTitle(cat)}
                    </h3>
                    <p className="text-sm text-white/80">
                      {getCategoryDesc(cat)}
                    </p>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Books */}
      <section className="py-12 sm:py-16 bg-beige/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-heading text-2xl sm:text-3xl font-bold text-navy">
              {t('home.featuredBooks')}
            </h2>
            <Button
              variant="outline"
              onClick={() => navigate('catalog')}
              className="border-gold/40 text-gold hover:bg-gold hover:text-white"
            >
              {t('home.viewAll')}
              <ArrowRight className="ms-1.5 h-4 w-4 rtl-flip" />
            </Button>
          </div>
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="aspect-[3/4] w-full rounded-lg" />
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

      {/* Why Kitabi */}
      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            className="text-center mb-10"
          >
            <h2 className="font-heading text-2xl sm:text-3xl font-bold text-navy mb-3">
              {t('home.whyKitabi')}
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
                <Card className="h-full border-border/50 text-center hover:shadow-lg transition-shadow">
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

      {/* How It Works */}
      <section className="py-12 sm:py-16 bg-beige/40">
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

      {/* Print on Demand Notice */}
      <section className="py-12 sm:py-16">
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
