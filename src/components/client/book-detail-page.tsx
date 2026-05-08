'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ShoppingCart, ChevronRight, ArrowLeft, Printer,
  Info, CheckCircle, BookOpen, Clock
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { useRouterStore } from '@/stores/router-store'
import { useCartStore } from '@/stores/cart-store'
import { useTranslation } from '@/lib/i18n'
import { BookCard, type BookData } from './book-card'
import { toast } from 'sonner'

interface BookDetail {
  id: string
  isbn: string
  title: string
  author: string
  description: string | null
  coverUrl: string | null
  publisher: string | null
  pageCount: number | null
  language: string
  publishDate: string | null
  categorySlug: string | null
  priceSale: number | null
  pricePrint: number | null
  printDelay: string | null
  isAvailable: boolean
  category: {
    nameFr: string
    nameAr: string
    nameEn: string
    slug: string
  } | null
}

const languageLabels: Record<string, string> = {
  fr: 'Français',
  ar: 'العربية',
  en: 'English',
}

export function BookDetailPage() {
  const { t, language } = useTranslation()
  const params = useRouterStore((s) => s.params)
  const goBack = useRouterStore((s) => s.goBack)
  const navigate = useRouterStore((s) => s.navigate)
  const addItem = useCartStore((s) => s.addItem)
  const [book, setBook] = useState<BookDetail | null>(null)
  const [relatedBooks, setRelatedBooks] = useState<BookData[]>([])
  const [loading, setLoading] = useState(true)
  const [quantity, setQuantity] = useState(1)
  const [showFullDesc, setShowFullDesc] = useState(false)

  const bookId = params.id

  useEffect(() => {
    if (!bookId) return
    let cancelled = false
    const controller = new AbortController()

    async function loadBook() {
      try {
        const res = await fetch(`/api/books/${bookId}`, { signal: controller.signal })
        if (!res.ok || cancelled) return
        const data = await res.json()
        if (cancelled) return
        setBook(data.book || null)
        // Fetch related books by same category
        if (data.book?.categorySlug) {
          const relRes = await fetch(`/api/books?category=${data.book.categorySlug}&limit=4`)
          if (!relRes.ok || cancelled) return
          const relData = await relRes.json()
          if (cancelled) return
          setRelatedBooks(
            (relData.books || []).filter((b: BookData) => b.id !== bookId)
          )
        }
      } catch {
        // aborted or network error
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    setLoading(true)
    loadBook()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [bookId])

  const handleAddToCart = () => {
    if (!book || !book.priceSale) return
    for (let i = 0; i < quantity; i++) {
      addItem({
        bookId: book.id,
        title: book.title,
        author: book.author,
        coverUrl: book.coverUrl || '',
        price: book.priceSale,
      })
    }
    toast.success(t('book.addedToCart'), {
      action: {
        label: t('book.goCheck'),
        onClick: () => navigate('cart'),
      },
    })
  }

  const getCategoryName = () => {
    if (!book?.category) return null
    if (language === 'ar') return book.category.nameAr
    if (language === 'en') return book.category.nameEn
    return book.category.nameFr
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Skeleton className="aspect-[3/4] w-full rounded-xl" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-10 w-1/3" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </div>
    )
  }

  if (!book) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 text-center">
        <BookOpen className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
        <p className="text-muted-foreground">{t('common.noResults')}</p>
        <Button variant="outline" onClick={() => navigate('catalog')} className="mt-4">
          {t('book.backToCatalog')}
        </Button>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-6 flex-wrap">
          <button
            onClick={() => navigate('home')}
            className="hover:text-navy transition-colors"
          >
            {t('nav.home')}
          </button>
          <ChevronRight className="h-3.5 w-3.5 rtl-flip" />
          <button
            onClick={() => navigate('catalog')}
            className="hover:text-navy transition-colors"
          >
            {t('nav.catalog')}
          </button>
          <ChevronRight className="h-3.5 w-3.5 rtl-flip" />
          <span className="text-foreground font-medium truncate max-w-[200px]">
            {book.title}
          </span>
        </nav>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Cover Image */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="relative aspect-[3/4] max-w-md mx-auto lg:mx-0 rounded-xl overflow-hidden shadow-xl bg-beige/30">
              {book.coverUrl ? (
                <img
                  src={book.coverUrl}
                  alt={book.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-8">
                  <BookOpen className="h-20 w-20 text-navy/20" />
                  <span className="text-center text-sm text-muted-foreground font-medium">
                    {book.title}
                  </span>
                </div>
              )}
              {!book.isAvailable && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <Badge variant="destructive" className="text-sm">
                    {t('book.unavailable')}
                  </Badge>
                </div>
              )}
            </div>
          </motion.div>

          {/* Book Info */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="space-y-5"
          >
            {/* Title & Author */}
            <div>
              <h1 className="font-heading text-2xl sm:text-3xl font-bold text-navy leading-tight mb-2">
                {book.title}
              </h1>
              <p className="text-lg text-muted-foreground">{book.author}</p>
            </div>

            {/* Price & Badges */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-3xl font-bold text-gold">
                {book.priceSale ? `${book.priceSale.toLocaleString()} ${t('common.da')}` : '—'}
              </span>
              <Badge className="bg-emerald-100 text-emerald-800 border-0">
                {book.isAvailable ? t('book.available') : t('book.unavailable')}
              </Badge>
              {book.language && (
                <Badge variant="secondary">
                  {languageLabels[book.language] || book.language}
                </Badge>
              )}
            </div>

            {/* Print Delay */}
            {book.printDelay && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4 text-gold" />
                <span>{t('book.printDelay')}: {book.printDelay}</span>
              </div>
            )}

            {/* Description */}
            {book.description && (
              <div>
                <h3 className="font-heading text-sm font-semibold text-navy mb-2">
                  {t('book.description')}
                </h3>
                <p className={`text-sm text-muted-foreground leading-relaxed ${!showFullDesc ? 'line-clamp-4' : ''}`}>
                  {book.description}
                </p>
                {book.description.length > 200 && (
                  <button
                    onClick={() => setShowFullDesc(!showFullDesc)}
                    className="text-sm text-gold hover:text-gold/80 font-medium mt-1"
                  >
                    {showFullDesc ? t('common.showLess') : t('common.showMore')}
                  </button>
                )}
              </div>
            )}

            <Separator />

            {/* Specifications */}
            <div>
              <h3 className="font-heading text-sm font-semibold text-navy mb-3">
                {t('book.specifications')}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {book.publisher && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">{t('book.publisher')}:</span>
                    <p className="font-medium text-foreground">{book.publisher}</p>
                  </div>
                )}
                {book.pageCount && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">{t('book.pages')}:</span>
                    <p className="font-medium text-foreground">{book.pageCount}</p>
                  </div>
                )}
                {book.isbn && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">{t('book.isbn')}:</span>
                    <p className="font-medium text-foreground" dir="ltr">{book.isbn}</p>
                  </div>
                )}
                <div className="text-sm">
                  <span className="text-muted-foreground">{t('book.format')}:</span>
                  <p className="font-medium text-foreground">{t('book.paperback')}</p>
                </div>
                {book.publishDate && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">{t('book.publishDate')}:</span>
                    <p className="font-medium text-foreground">{book.publishDate}</p>
                  </div>
                )}
                {getCategoryName() && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">{t('book.category')}:</span>
                    <p className="font-medium text-foreground">{getCategoryName()}</p>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Print on Demand Notice */}
            <Card className="border-gold/30 bg-gold/5">
              <CardContent className="p-3 flex items-start gap-2.5">
                <Info className="h-4 w-4 text-gold mt-0.5 shrink-0" />
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium text-navy">{t('home.printOnDemand')}</span>
                  {' — '}
                  {t('book.printOnDemandNote')} {book.printDelay || '3-5 jours'}
                </div>
              </CardContent>
            </Card>

            {/* Quantity & Add to Cart */}
            <div className="flex items-center gap-4 pt-2">
              <div className="flex items-center border rounded-lg">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-3 py-2 text-sm font-medium hover:bg-muted transition-colors"
                >
                  −
                </button>
                <span className="px-4 py-2 text-sm font-semibold min-w-[40px] text-center border-x">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="px-3 py-2 text-sm font-medium hover:bg-muted transition-colors"
                >
                  +
                </button>
              </div>
              <Button
                size="lg"
                onClick={handleAddToCart}
                disabled={!book.isAvailable || !book.priceSale}
                className="flex-1 bg-gold hover:bg-gold/90 text-white font-semibold h-12 rounded-xl shadow-lg shadow-gold/20"
              >
                <ShoppingCart className="me-2 h-5 w-5" />
                {t('book.addToCart')}
              </Button>
            </div>

            {/* Back to Catalog */}
            <Button
              variant="ghost"
              onClick={() => navigate('catalog')}
              className="text-muted-foreground hover:text-navy gap-1.5"
            >
              <ArrowLeft className="h-4 w-4 rtl-flip" />
              {t('book.backToCatalog')}
            </Button>
          </motion.div>
        </div>

        {/* Related Books */}
        {relatedBooks.length > 0 && (
          <section className="mt-12 sm:mt-16">
            <h2 className="font-heading text-xl sm:text-2xl font-bold text-navy mb-6">
              {t('book.relatedBooks')}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {relatedBooks.map((relBook) => (
                <BookCard key={relBook.id} book={relBook} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
