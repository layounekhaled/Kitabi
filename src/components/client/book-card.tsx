'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ShoppingCart, BookOpen } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useRouterStore } from '@/stores/router-store'
import { useCartStore } from '@/stores/cart-store'
import { useTranslation } from '@/lib/i18n'
import { toast } from 'sonner'

export interface BookData {
  id: string
  title: string
  author: string
  coverUrl: string | null
  priceSale: number | null
  language: string
  categorySlug: string | null
  isAvailable: boolean
}

interface BookCardProps {
  book: BookData
}

const languageLabels: Record<string, string> = {
  fr: 'Français',
  ar: 'العربية',
  en: 'English',
}

const languageColors: Record<string, string> = {
  fr: 'bg-blue-100 text-blue-800',
  ar: 'bg-emerald-100 text-emerald-800',
  en: 'bg-amber-100 text-amber-800',
}

export function BookCard({ book }: BookCardProps) {
  const { t } = useTranslation()
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
        className="group cursor-pointer overflow-hidden border border-border/50 shadow-sm hover:shadow-lg transition-shadow duration-300"
        onClick={handleCardClick}
      >
        <div className="relative aspect-[3/4] overflow-hidden bg-muted">
          {book.coverUrl ? (
            <img
              src={book.coverUrl}
              alt={book.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-beige/50 p-4">
              <BookOpen className="h-12 w-12 text-navy/30" />
              <span className="text-center text-xs text-muted-foreground line-clamp-2 font-medium">
                {book.title}
              </span>
            </div>
          )}
          {book.language && (
            <Badge
              className={`absolute top-2 start-2 text-[10px] font-medium px-1.5 py-0.5 ${languageColors[book.language] || 'bg-gray-100 text-gray-800'}`}
            >
              {languageLabels[book.language] || book.language}
            </Badge>
          )}
          {!book.isAvailable && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <Badge variant="destructive" className="text-xs">
                {t('book.unavailable')}
              </Badge>
            </div>
          )}
        </div>
        <CardContent className="p-3 space-y-1.5">
          <h3 className="font-heading text-sm font-semibold text-navy line-clamp-2 leading-snug">
            {book.title}
          </h3>
          <p className="text-xs text-muted-foreground line-clamp-1">
            {book.author}
          </p>
          <div className="flex items-center justify-between pt-1">
            <span className="text-base font-bold text-gold">
              {book.priceSale ? `${book.priceSale.toLocaleString()} ${t('common.da')}` : '—'}
            </span>
            <Button
              size="sm"
              variant="outline"
              className="h-8 w-8 p-0 rounded-full border-gold/40 text-gold hover:bg-gold hover:text-white transition-colors"
              onClick={handleAddToCart}
              disabled={!book.isAvailable || !book.priceSale || isAdding}
            >
              <ShoppingCart className={`h-3.5 w-3.5 ${isAdding ? 'scale-125' : ''} transition-transform`} />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
