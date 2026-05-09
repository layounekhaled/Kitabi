'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { useRouterStore } from '@/stores/router-store'
import { useTranslation } from '@/lib/i18n'
import { BookCard, type BookData } from './book-card'
import { genreLabels, getGenreLabel, getGenreIcon, getGenreColor } from '@/lib/genre-utils'

interface GenreGroup {
  genre: string
  count: number
  books: BookData[]
}

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5 },
  }),
}

export function GenresPage() {
  const { t, language } = useTranslation()
  const navigate = useRouterStore((s) => s.navigate)
  const [genreGroups, setGenreGroups] = useState<GenreGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedGenre, setExpandedGenre] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch genres list
        const genresRes = await fetch('/api/books/genres')
        if (!genresRes.ok) return
        const genresData = await genresRes.json()
        const genres = (genresData.genres || []).slice(0, 12)

        // Fetch books for each genre (4 books per genre for preview)
        const groups: GenreGroup[] = []
        for (const g of genres) {
          try {
            const booksRes = await fetch(`/api/books?genre=${g.genre}&limit=6`)
            if (booksRes.ok) {
              const booksData = await booksRes.json()
              groups.push({
                genre: g.genre,
                count: g.count,
                books: (booksData.books || []).slice(0, 6),
              })
            }
          } catch {
            // skip genre on error
          }
        }

        setGenreGroups(groups)
      } catch {
        // silently handle
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <Skeleton className="h-10 w-64 mb-3" />
          <Skeleton className="h-5 w-96 mb-10" />
          <div className="space-y-10">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i}>
                <Skeleton className="h-8 w-40 mb-4" />
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <div key={j} className="space-y-2">
                      <Skeleton className="aspect-[3/4] w-full rounded-xl" />
                      <Skeleton className="h-3 w-3/4" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (genreGroups.length === 0) {
    return (
      <div className="animate-fade-in">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 text-center">
          <BookOpen className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
          <h1 className="font-heading text-2xl font-bold text-navy mb-3">
            {language === 'ar' ? 'لا توجد أنواع بعد' : language === 'en' ? 'No genres yet' : 'Aucun genre pour le moment'}
          </h1>
          <p className="text-muted-foreground mb-6">
            {language === 'ar' ? 'استكشف الكتالوج لرؤية الكتب المتاحة' : language === 'en' ? 'Browse the catalog to see available books' : 'Parcourez le catalogue pour voir les livres disponibles'}
          </p>
          <Button onClick={() => navigate('catalog')} className="bg-gold hover:bg-gold/90 text-white">
            {t('nav.catalog')}
            <ArrowRight className="ms-2 h-4 w-4 rtl-flip" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="bg-gradient-to-br from-navy via-navy/95 to-navy/80 py-12 sm:py-16 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 start-1/4 w-64 h-64 bg-gold rounded-full blur-3xl" />
          <div className="absolute bottom-0 end-1/4 w-48 h-48 bg-gold/50 rounded-full blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-3"
          >
            {language === 'ar' ? 'تصفح حسب النوع الأدبي' : language === 'en' ? 'Browse by Genre' : 'Parcourir par Genre'}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-white/60 text-lg"
          >
            {language === 'ar' ? 'اكتشف كتبك المفضلة مصنفة حسب نوعها' : language === 'en' ? 'Discover your favorite books, organized by genre' : 'Découvrez vos livres préférés, classés par genre'}
          </motion.p>
        </div>
      </div>

      {/* Genre Sections */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="space-y-12 sm:space-y-16">
          {genreGroups.map((group, idx) => {
            const info = genreLabels[group.genre]
            const isExpanded = expandedGenre === group.genre
            const booksToShow = isExpanded ? group.books : group.books.slice(0, 4)
            const hasMore = group.books.length > 4 || group.count > 4

            return (
              <motion.section
                key={group.genre}
                custom={idx}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-50px' }}
              >
                {/* Genre Header */}
                <div
                  className="flex items-center justify-between mb-6 cursor-pointer group"
                  onClick={() => setExpandedGenre(isExpanded ? null : group.genre)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${getGenreColor(group.genre)} text-white shadow-lg`}>
                      <span className="text-2xl">{getGenreIcon(group.genre)}</span>
                    </div>
                    <div>
                      <h2 className="font-heading text-xl sm:text-2xl font-bold text-navy group-hover:text-gold transition-colors">
                        {getGenreLabel(group.genre, language)}
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        {group.count} {language === 'ar' ? 'كتاب' : language === 'en' ? 'books' : 'livres'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate('catalog', { genre: group.genre })
                      }}
                      className="border-gold/30 text-gold hover:bg-gold hover:text-white text-xs"
                    >
                      {language === 'ar' ? 'عرض الكل' : language === 'en' ? 'View all' : 'Voir tout'}
                      <ArrowRight className="ms-1.5 h-3.5 w-3.5 rtl-flip" />
                    </Button>
                    {hasMore && (
                      <Badge
                        variant="secondary"
                        className="text-xs px-2 py-0.5 cursor-pointer hover:bg-gold/10 transition-colors"
                      >
                        {isExpanded ? '−' : `+${Math.max(0, group.count - 4)}`}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Books Grid */}
                {group.books.length > 0 ? (
                  <div className={`grid gap-4 sm:gap-5 transition-all duration-300 ${
                    isExpanded
                      ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6'
                      : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
                  }`}>
                    {booksToShow.map((book) => (
                      <BookCard key={book.id} book={book} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-beige/30 rounded-2xl border border-dashed border-border/40">
                    <BookOpen className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">
                      {language === 'ar' ? 'لا توجد كتب في هذا النوع' : language === 'en' ? 'No books in this genre yet' : 'Aucun livre dans ce genre'}
                    </p>
                  </div>
                )}

                {/* Divider between sections */}
                {idx < genreGroups.length - 1 && (
                  <div className="mt-12 sm:mt-16 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
                )}
              </motion.section>
            )
          })}
        </div>
      </div>
    </div>
  )
}
