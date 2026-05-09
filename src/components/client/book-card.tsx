'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ShoppingCart, BookOpen, Star } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useRouterStore } from '@/stores/router-store'
import { useCartStore } from '@/stores/cart-store'
import { useTranslation } from '@/lib/i18n'
import { toast } from 'sonner'
import { getGenreLabel } from '@/lib/genre-utils'

export interface BookData {
  id: string
  title: string
  author: string
  coverUrl: string | null
  priceSale: number | null
  language: string
  categorySlug: string | null
  genre: string | null
  isAvailable: boolean
}

interface BookCardProps {
  book: BookData
}

const languageLabels: Record<string, string> = {
  fr: 'FR',
  ar: 'AR',
  en: 'EN',
}

const languageColors: Record<string, string> = {
  fr: 'bg-blue-500 text-white',
  ar: 'bg-emerald-600 text-white',
  en: 'bg-amber-500 text-white',
}

export function BookCard({ book }: BookCardProps) {
  const { t, language } = useTranslation()
  const navigate = useRouterStore((s) => s.navigate)
  const addItem = useCartStore((s) => s.addItem)
  const [isAdding, setIsAdding] = useState(false)

  const handleCardClick = () => {
    navigate('bookDetail', { id: book.id })
  }

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!book.priceSale) return
    setIsAdding(true)
    addItem({
      bookId: book.id,
      title: book.title,
      author: book.author,
      coverUrl: book.coverUrl || '',
      price: book.priceSale,
    })
    toast.success(t('cart.itemAdded'))
    setTimeout(() => setIsAdding(false), 600)
  }

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        className="group cursor-pointer overflow-hidden border border-border/30 shadow-sm hover:shadow-xl rounded-2xl transition-all duration-300 bg-white h-full flex flex-col"
        onClick={handleCardClick}
      >
        {/* Cover Image */}
        <div className="relative aspect-[3/4] overflow-hidden bg-gradient-to-br from-gray-100 to-gray-50">
          {book.coverUrl ? (
            <>
              <img
                src={book.coverUrl}
                alt={book.title}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />
              {/* Gradient overlay at bottom */}
              <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              {/* Hover cart button on image */}
              {book.isAvailable && book.priceSale && (
                <div className="absolute bottom-3 end-3 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                  <Button
                    size="sm"
                    className={`h-10 w-10 p-0 rounded-full bg-gold hover:bg-gold/90 text-white shadow-lg shadow-gold/30 border-0 ${isAdding ? 'scale-110' : ''} transition-transform`}
                    onClick={handleAddToCart}
                    disabled={isAdding}
                  >
                    <ShoppingCart className={`h-4 w-4 ${isAdding ? 'scale-125' : ''} transition-transform`} />
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-navy/5">
                <BookOpen className="h-8 w-8 text-navy/20" />
              </div>
              <span className="text-center text-xs text-muted-foreground/70 line-clamp-2 font-medium">
                {book.title}
              </span>
            </div>
          )}

          {/* Language Badge - top left */}
          {book.language && (
            <Badge
              className={`absolute top-2.5 start-2.5 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md shadow-sm ${languageColors[book.language] || 'bg-gray-500 text-white'}`}
            >
              {languageLabels[book.language] || book.language}
            </Badge>
          )}

          {/* Genre tag - top right */}
          {book.genre && (
            <Badge
              className="absolute top-2.5 end-2.5 text-[9px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md bg-white/90 text-navy backdrop-blur-sm shadow-sm border border-border/20"
            >
              {getGenreLabel(book.genre, language)}
            </Badge>
          )}

          {/* Unavailable Overlay */}
          {!book.isAvailable && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-[2px]">
              <Badge variant="destructive" className="text-xs font-medium">
                {t('book.unavailable')}
              </Badge>
            </div>
          )}
        </div>

        {/* Book Info */}
        <CardContent className="p-3.5 space-y-1.5 flex-1 flex flex-col justify-end">
          {/* Title */}
          <h3 className="font-heading text-sm font-semibold text-navy line-clamp-2 leading-snug group-hover:text-gold transition-colors duration-200 min-h-[2.5rem]">
            {book.title}
          </h3>

          {/* Author */}
          <p className="text-xs text-muted-foreground line-clamp-1">
            {book.author}
          </p>

          {/* Price */}
          <div className="flex items-center justify-between pt-2 border-t border-border/20 mt-auto">
            <span className="text-base font-bold text-navy">
              {book.priceSale ? `${book.priceSale.toLocaleString()} ` : '—'}
              <span className="text-[10px] font-semibold text-gold">{t('common.da')}</span>
            </span>
            <Button
              size="sm"
              variant="outline"
              className="h-7 w-7 p-0 rounded-full border-gold/30 text-gold hover:bg-gold hover:text-white transition-colors"
              onClick={handleAddToCart}
              disabled={!book.isAvailable || !book.priceSale || isAdding}
            >
              <ShoppingCart className={`h-3 w-3 ${isAdding ? 'scale-125' : ''} transition-transform`} />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
