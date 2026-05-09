'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen, Award, Library, Truck,
  ArrowRight, Sparkles, ChevronLeft, ChevronRight,
  Star, Users, TrendingUp, Shield, Globe
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useRouterStore } from '@/stores/router-store'
import { useTranslation } from '@/lib/i18n'
import { BookCard, type BookData } from './book-card'

// ─── Slider Data ───
const slides = [
  {
    image: '/slider/slide1.webp',
    titleFr: 'Votre librairie en ligne favorite',
    titleAr: 'مكتبتك الإلكترونية المفضلة',
    titleEn: 'Your Favorite Online Bookstore',
    subtitleFr: 'Des milliers de livres en français, arabe et anglais',
    subtitleAr: 'آلاف الكتب بالفرنسية والعربية والإنجليزية',
    subtitleEn: 'Thousands of books in French, Arabic and English',
    ctaFr: 'Explorer le catalogue',
    ctaAr: 'استكشف الكتالوج',
    ctaEn: 'Explore the Catalog',
  },
  {
    image: '/slider/slide2.webp',
    titleFr: 'La lecture, un plaisir accessible',
    titleAr: 'القراءة متعة في متناول الجميع',
    titleEn: 'Reading, an Accessible Pleasure',
    subtitleFr: 'Livraison rapide partout en Algérie, paiement à la livraison',
    subtitleAr: 'توصيل سريع لكل ولايات الجزائر، الدفع عند الاستلام',
    subtitleEn: 'Fast delivery across Algeria, pay on delivery',
    ctaFr: 'Découvrir nos livres',
    ctaAr: 'اكتشف كتبنا',
    ctaEn: 'Discover Our Books',
  },
  {
    image: '/slider/slide3.webp',
    titleFr: 'Des livres soigneusement sélectionnés',
    titleAr: 'كتب مختارة بعناية',
    titleEn: 'Carefully Selected Books',
    subtitleFr: 'Romans, sciences, religion, histoire et bien plus encore',
    subtitleAr: 'روايات، علوم، دين، تاريخ وأكثر',
    subtitleEn: 'Novels, sciences, religion, history and more',
    ctaFr: 'Voir les nouveautés',
    ctaAr: 'شاهد الجديد',
    ctaEn: 'See What\'s New',
  },
]

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
    gradient: 'from-emerald-500 to-teal-600',
    bgLight: 'bg-emerald-50',
    textColor: 'text-emerald-700',
    count: 0,
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
    gradient: 'from-blue-500 to-indigo-600',
    bgLight: 'bg-blue-50',
    textColor: 'text-blue-700',
    count: 0,
  },
  {
    code: 'en',
    flag: '🇬🇧',
    titleFr: 'Livres en Anglais',
    titleAr: 'كتب باللغة الإنجليزية',
    titleEn: 'English Books',
    descFr: 'Fiction, science, biographies et plus',
    descAr: 'روايات، علوم، سير ذاتية وأكثر',
    descEn: 'Fiction, science, biographies and more',
    gradient: 'from-amber-500 to-orange-600',
    bgLight: 'bg-amber-50',
    textColor: 'text-amber-700',
    count: 0,
  },
]

// ─── Animations ───
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: 'easeOut' },
  }),
}

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? '100%' : '-100%',
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? '-100%' : '100%',
    opacity: 0,
  }),
}

// ─── Testimonials Data ───
const testimonials = [
  {
    nameFr: 'Amina B.',
    nameAr: 'أمينة ب.',
    nameEn: 'Amina B.',
    textFr: 'Excellent service ! J\'ai reçu mes livres en 3 jours. La qualité est au rendez-vous et les prix sont très compétitifs.',
    textAr: 'خدمة ممتازة! استلمت كتبي في 3 أيام. الجودة رائعة والأسعار منافسة جدا.',
    textEn: 'Excellent service! I received my books in 3 days. Great quality and very competitive prices.',
    rating: 5,
  },
  {
    nameFr: 'Karim M.',
    nameAr: 'كريم م.',
    nameEn: 'Karim M.',
    textFr: 'Kitabi est devenu ma librairie préférée. Un large choix de livres en arabe et en français. Je recommande !',
    textAr: 'كتبي أصبحت مكتبتي المفضلة. تشكيلة واسعة من الكتب بالعربية والفرنسية. أنصح بها!',
    textEn: 'Kitabi has become my favorite bookstore. A wide selection of books in Arabic and French. Highly recommended!',
    rating: 5,
  },
  {
    nameFr: 'Sarah L.',
    nameAr: 'سارة ل.',
    nameEn: 'Sarah L.',
    textFr: 'Très satisfaite de ma commande. Les livres étaient bien emballés et la livraison était rapide partout en Algérie.',
    textAr: 'أنا سعيدة جدا بطلبي. الكتب كانت مغلفة جيدا والتوصيل كان سريعا لكل الولايات.',
    textEn: 'Very satisfied with my order. Books were well packaged and delivery was fast across Algeria.',
    rating: 5,
  },
]

export function HomePage() {
  const { t, language } = useTranslation()
  const navigate = useRouterStore((s) => s.navigate)
  const [featuredBooks, setFeaturedBooks] = useState<BookData[]>([])
  const [loadingBooks, setLoadingBooks] = useState(true)
  const [langBookCounts, setLangBookCounts] = useState<Record<string, number>>({})

  // ─── Slider State ───
  const [[currentSlide, direction], setCurrentSlide] = useState([0, 0])
  const slideInterval = useRef<ReturnType<typeof setInterval> | null>(null)

  const startAutoSlide = useCallback(() => {
    if (slideInterval.current) clearInterval(slideInterval.current)
    slideInterval.current = setInterval(() => {
      setCurrentSlide(([prev]) => [prev === slides.length - 1 ? 0 : prev + 1, 1])
    }, 5000)
  }, [])

  const goToSlide = (index: number) => {
    setCurrentSlide([index, index > currentSlide ? 1 : -1])
    startAutoSlide()
  }

  const prevSlide = () => {
    setCurrentSlide(([prev]) => [prev === 0 ? slides.length - 1 : prev - 1, -1])
    startAutoSlide()
  }

  const nextSlide = () => {
    setCurrentSlide(([prev]) => [prev === slides.length - 1 ? 0 : prev + 1, 1])
    startAutoSlide()
  }

  useEffect(() => {
    startAutoSlide()
    return () => {
      if (slideInterval.current) clearInterval(slideInterval.current)
    }
  }, [startAutoSlide])

  // Fetch book counts per language
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

  const getSlideTitle = (slide: typeof slides[0]) => {
    if (language === 'ar') return slide.titleAr
    if (language === 'en') return slide.titleEn
    return slide.titleFr
  }

  const getSlideSubtitle = (slide: typeof slides[0]) => {
    if (language === 'ar') return slide.subtitleAr
    if (language === 'en') return slide.subtitleEn
    return slide.subtitleFr
  }

  const getSlideCta = (slide: typeof slides[0]) => {
    if (language === 'ar') return slide.ctaAr
    if (language === 'en') return slide.ctaEn
    return slide.ctaFr
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

  const whyFeatures = [
    { icon: <Library className="h-7 w-7 text-gold" />, title: t('home.wideSelection'), desc: t('home.wideSelectionDesc') },
    { icon: <Award className="h-7 w-7 text-gold" />, title: t('home.qualityPrint'), desc: t('home.qualityPrintDesc') },
    { icon: <Truck className="h-7 w-7 text-gold" />, title: t('home.deliveryAcross'), desc: t('home.deliveryAcrossDesc') },
    { icon: <Shield className="h-7 w-7 text-gold" />, title: language === 'ar' ? 'دفع آمن' : language === 'en' ? 'Secure Payment' : 'Paiement sécurisé', desc: language === 'ar' ? 'ادفع عند الاستلام بكل أمان وراحة' : language === 'en' ? 'Pay on delivery with complete safety and peace of mind' : 'Payez à la livraison en toute sécurité et sérénité' },
  ]

  const steps = [
    { num: '1', title: t('home.step1'), desc: t('home.step1Desc'), icon: <BookOpen className="h-6 w-6" /> },
    { num: '2', title: t('home.step2'), desc: t('home.step2Desc'), icon: <Users className="h-6 w-6" /> },
    { num: '3', title: t('home.step3'), desc: t('home.step3Desc'), icon: <Truck className="h-6 w-6" /> },
    { num: '4', title: t('home.step4'), desc: t('home.step4Desc'), icon: <Sparkles className="h-6 w-6" /> },
  ]

  // Stats
  const stats = [
    { icon: <BookOpen className="h-6 w-6" />, value: '5000+', label: language === 'ar' ? 'كتاب' : language === 'en' ? 'Books' : 'Livres' },
    { icon: <Users className="h-6 w-6" />, value: '2000+', label: language === 'ar' ? 'عميل سعيد' : language === 'en' ? 'Happy Customers' : 'Clients satisfaits' },
    { icon: <TrendingUp className="h-6 w-6" />, value: '58', label: language === 'ar' ? 'ولاية مغطاة' : language === 'en' ? 'Wilayas Covered' : 'Wilayas couvertes' },
    { icon: <Star className="h-6 w-6" />, value: '4.8', label: language === 'ar' ? 'تقييم العملاء' : language === 'en' ? 'Customer Rating' : 'Avis clients' },
  ]

  return (
    <div className="animate-fade-in">
      {/* ═══════ HERO CAROUSEL ═══════ */}
      <section className="relative w-full h-[500px] sm:h-[550px] lg:h-[600px] overflow-hidden">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={currentSlide}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="absolute inset-0"
          >
            {/* Background Image */}
            <div className="absolute inset-0">
              <img
                src={slides[currentSlide].image}
                alt=""
                className="w-full h-full object-cover"
              />
              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/10" />
            </div>

            {/* Slide Content */}
            <div className="relative h-full mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="max-w-xl text-white"
              >
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold/20 backdrop-blur-sm text-gold text-xs font-semibold mb-4 border border-gold/20">
                  <Sparkles className="h-3.5 w-3.5" />
                  {language === 'ar' ? 'مكتبتك الإلكترونية' : language === 'en' ? 'Online Bookstore' : 'Librairie en ligne'}
                </div>
                <h1 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight mb-4 text-white drop-shadow-lg">
                  {getSlideTitle(slides[currentSlide])}
                </h1>
                <p className="text-base sm:text-lg text-white/85 mb-8 leading-relaxed drop-shadow">
                  {getSlideSubtitle(slides[currentSlide])}
                </p>
                <div className="flex items-center gap-3">
                  <Button
                    size="lg"
                    onClick={() => navigate('catalog')}
                    className="bg-gold hover:bg-gold/90 text-white font-semibold px-8 h-12 rounded-xl shadow-lg shadow-gold/30 transition-all hover:shadow-xl hover:shadow-gold/40 hover:scale-[1.02]"
                  >
                    {getSlideCta(slides[currentSlide])}
                    <ArrowRight className="ms-2 h-4 w-4 rtl-flip" />
                  </Button>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation Arrows */}
        <button
          onClick={prevSlide}
          className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-10 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/25 transition-all border border-white/20"
          aria-label="Previous slide"
        >
          <ChevronLeft className="h-5 w-5 rtl-flip" />
        </button>
        <button
          onClick={nextSlide}
          className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-10 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/25 transition-all border border-white/20"
          aria-label="Next slide"
        >
          <ChevronRight className="h-5 w-5 rtl-flip" />
        </button>

        {/* Dots */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goToSlide(i)}
              className={`h-2 rounded-full transition-all duration-500 ${
                i === currentSlide
                  ? 'w-8 bg-gold'
                  : 'w-2 bg-white/40 hover:bg-white/70'
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      </section>

      {/* ═══════ STATS BAR ═══════ */}
      <section className="bg-navy py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="flex items-center gap-3"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gold/15 shrink-0">
                  {stat.icon}
                </div>
                <div>
                  <p className="text-2xl font-bold text-gold">{stat.value}</p>
                  <p className="text-xs text-white/70 font-medium">{stat.label}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ BROWSE BY LANGUAGE ═══════ */}
      <section className="py-16 sm:py-20 bg-gradient-to-b from-white to-beige/20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-gold mb-3">
              <Globe className="h-4 w-4" />
              {language === 'ar' ? 'اختر لغة الكتاب' : language === 'en' ? 'Choose the book language' : 'Choisissez la langue du livre'}
            </div>
            <h2 className="font-heading text-2xl sm:text-3xl font-bold text-navy">
              {language === 'ar' ? 'تصفح حسب اللغة' : language === 'en' ? 'Browse by Language' : 'Parcourir par langue'}
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-4xl mx-auto">
            {bookLanguages.map((lang, i) => (
              <motion.div
                key={lang.code}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
              >
                <button
                  onClick={() => navigate('catalog', { language: lang.code })}
                  className="group w-full text-start overflow-hidden rounded-2xl bg-white shadow-sm border border-border/30 hover:shadow-xl hover:border-gold/30 transition-all duration-300 hover:-translate-y-1"
                >
                  {/* Gradient Top */}
                  <div className={`h-2 bg-gradient-to-r ${lang.gradient}`} />
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-3xl">{lang.flag}</span>
                      <div>
                        <h3 className="font-heading text-base font-bold text-navy group-hover:text-gold transition-colors">
                          {getLangTitle(lang)}
                        </h3>
                        {langBookCounts[lang.code] !== undefined && (
                          <p className="text-xs text-muted-foreground">
                            {langBookCounts[lang.code]} {language === 'ar' ? 'كتاب' : language === 'en' ? 'books' : 'livres'}
                          </p>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {getLangDesc(lang)}
                    </p>
                    <div className="flex items-center gap-1 mt-4 text-gold text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                      {language === 'ar' ? 'تصفح الكتب' : language === 'en' ? 'Browse books' : 'Parcourir les livres'}
                      <ArrowRight className="h-4 w-4 rtl-flip" />
                    </div>
                  </div>
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ FEATURED BOOKS ═══════ */}
      <section className="py-16 sm:py-20 bg-beige/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="flex items-end justify-between mb-10"
          >
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-gold mb-2">
                <Star className="h-4 w-4" />
                {language === 'ar' ? 'الأكثر طلبا' : language === 'en' ? 'Most Popular' : 'Les plus demandés'}
              </div>
              <h2 className="font-heading text-2xl sm:text-3xl font-bold text-navy">
                {t('home.featuredBooks')}
              </h2>
            </div>
            <Button
              variant="outline"
              onClick={() => navigate('catalog')}
              className="border-gold/40 text-gold hover:bg-gold hover:text-white font-medium rounded-full px-5 hidden sm:flex"
            >
              {t('home.viewAll')}
              <ArrowRight className="ms-1.5 h-4 w-4 rtl-flip" />
            </Button>
          </motion.div>

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

          <div className="flex justify-center mt-8 sm:hidden">
            <Button
              variant="outline"
              onClick={() => navigate('catalog')}
              className="border-gold/40 text-gold hover:bg-gold hover:text-white font-medium rounded-full px-5"
            >
              {t('home.viewAll')}
              <ArrowRight className="ms-1.5 h-4 w-4 rtl-flip" />
            </Button>
          </div>
        </div>
      </section>

      {/* ═══════ WHY KITIBI ═══════ */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h2 className="font-heading text-2xl sm:text-3xl font-bold text-navy mb-3">
              {t('home.whyKitibi')}
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              {language === 'ar'
                ? 'نقدم لك تجربة تسوق كتب فريدة مع جودة عالية وتوصيل سريع'
                : language === 'en'
                  ? 'We offer you a unique book shopping experience with high quality and fast delivery'
                  : 'Nous vous offrons une expérience d\'achat de livres unique avec qualité et livraison rapide'}
            </p>
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
                <Card className="h-full border-border/30 text-center hover:shadow-xl hover:-translate-y-1 transition-all duration-300 rounded-2xl overflow-hidden">
                  {/* Top accent line */}
                  <div className="h-1 gold-shimmer" />
                  <CardContent className="p-6 space-y-3">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gold/10">
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

      {/* ═══════ HOW IT WORKS ═══════ */}
      <section className="py-16 sm:py-20 bg-navy">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h2 className="font-heading text-2xl sm:text-3xl font-bold text-white mb-3">
              {t('home.howItWorks')}
            </h2>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, i) => (
              <motion.div
                key={step.num}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-30px' }}
                className="relative text-center"
              >
                {/* Connector line */}
                {i < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-8 start-[calc(50%+2rem)] w-[calc(100%-4rem)] h-px bg-gradient-to-r from-gold/30 to-gold/10" />
                )}
                <div className="relative z-10 mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gold text-navy mb-4 shadow-lg shadow-gold/20">
                  {step.icon}
                </div>
                <div className="absolute -top-1 start-1/2 -translate-x-1/2 bg-white text-navy text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center shadow-md z-20">
                  {step.num}
                </div>
                <h3 className="font-heading text-base font-semibold text-white mb-2 mt-1">
                  {step.title}
                </h3>
                <p className="text-sm text-white/60 leading-relaxed">
                  {step.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ TESTIMONIALS ═══════ */}
      <section className="py-16 sm:py-20 bg-gradient-to-b from-beige/20 to-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <div className="flex items-center justify-center gap-1 text-gold mb-3">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className="h-5 w-5 fill-gold" />
              ))}
            </div>
            <h2 className="font-heading text-2xl sm:text-3xl font-bold text-navy">
              {language === 'ar' ? 'ماذا يقول عملاؤنا' : language === 'en' ? 'What Our Customers Say' : 'Ce que disent nos clients'}
            </h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((test, i) => (
              <motion.div
                key={i}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
              >
                <Card className="h-full border-border/30 rounded-2xl hover:shadow-lg transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-0.5 text-gold mb-4">
                      {Array.from({ length: test.rating }).map((_, s) => (
                        <Star key={s} className="h-4 w-4 fill-gold" />
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-4 italic">
                      &ldquo;{language === 'ar' ? test.textAr : language === 'en' ? test.textEn : test.textFr}&rdquo;
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold/10 text-gold font-bold text-sm">
                        {test.nameFr.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-navy">
                          {language === 'ar' ? test.nameAr : language === 'en' ? test.nameEn : test.nameFr}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {language === 'ar' ? 'عميل موثوق' : language === 'en' ? 'Verified Customer' : 'Client vérifié'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ CTA SECTION ═══════ */}
      <section className="relative py-20 sm:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-navy via-navy to-navy/90" />
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 start-20 w-72 h-72 bg-gold rounded-full blur-3xl" />
          <div className="absolute bottom-10 end-20 w-96 h-96 bg-gold/50 rounded-full blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <BookOpen className="h-12 w-12 text-gold mx-auto mb-6" />
            <h2 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-4">
              {language === 'ar'
                ? 'ابدأ رحلتك مع القراءة اليوم'
                : language === 'en'
                  ? 'Start Your Reading Journey Today'
                  : 'Commencez votre aventure de lecture aujourd\'hui'}
            </h2>
            <p className="text-base sm:text-lg text-white/70 mb-8 leading-relaxed max-w-xl mx-auto">
              {language === 'ar'
                ? 'اكتشف آلاف الكتب في مختلف اللغات والأنواع. توصيل سريع لكل ولايات الجزائر.'
                : language === 'en'
                  ? 'Discover thousands of books in various languages and genres. Fast delivery across all of Algeria.'
                  : 'Découvrez des milliers de livres dans différentes langues et genres. Livraison rapide partout en Algérie.'}
            </p>
            <Button
              size="lg"
              onClick={() => navigate('catalog')}
              className="bg-gold hover:bg-gold/90 text-white font-semibold px-10 h-13 rounded-xl shadow-lg shadow-gold/30 transition-all hover:shadow-xl hover:scale-[1.02]"
            >
              {t('home.exploreCatalog')}
              <ArrowRight className="ms-2 h-4 w-4 rtl-flip" />
            </Button>
          </motion.div>
        </div>
      </section>
    </div>
  )
}

