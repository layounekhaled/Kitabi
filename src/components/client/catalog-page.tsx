'use client'

import { useEffect, useState, useCallback } from 'react'
import { Search, SlidersHorizontal, X, ChevronLeft, ChevronRight, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { useRouterStore } from '@/stores/router-store'
import { useTranslation } from '@/lib/i18n'
import { BookCard, type BookData } from './book-card'

interface Category {
  id: string
  slug: string
  nameFr: string
  nameAr: string
  nameEn: string
}

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

const languageOptions = [
  { value: 'ar', labelFr: 'Arabe', labelAr: 'العربية', labelEn: 'Arabic' },
  { value: 'fr', labelFr: 'Français', labelAr: 'الفرنسية', labelEn: 'French' },
  { value: 'en', labelFr: 'Anglais', labelAr: 'الإنجليزية', labelEn: 'English' },
]

const genreLabels: Record<string, { fr: string; ar: string; en: string }> = {
  roman: { fr: 'Roman', ar: 'رواية', en: 'Fiction' },
  histoire: { fr: 'Histoire', ar: 'تاريخ', en: 'History' },
  sciences: { fr: 'Sciences', ar: 'علوم', en: 'Science' },
  philosophie: { fr: 'Philosophie', ar: 'فلسفة', en: 'Philosophy' },
  religion: { fr: 'Religion', ar: 'دين', en: 'Religion' },
  poesie: { fr: 'Poésie', ar: 'شعر', en: 'Poetry' },
  enfants: { fr: 'Enfants', ar: 'أطفال', en: 'Children' },
  biographie: { fr: 'Biographie', ar: 'سيرة', en: 'Biography' },
  education: { fr: 'Éducation', ar: 'تعليم', en: 'Education' },
  politique: { fr: 'Politique', ar: 'سياسة', en: 'Politics' },
  art: { fr: 'Art', ar: 'فن', en: 'Art' },
  economie: { fr: 'Économie', ar: 'اقتصاد', en: 'Economics' },
  droit: { fr: 'Droit', ar: 'قانون', en: 'Law' },
  medecine: { fr: 'Médecine', ar: 'طب', en: 'Medicine' },
  psychologie: { fr: 'Psychologie', ar: 'علم نفس', en: 'Psychology' },
  informatique: { fr: 'Informatique', ar: 'حاسوب', en: 'Computers' },
  sociologie: { fr: 'Sociologie', ar: 'علم اجتماع', en: 'Sociology' },
  lettres: { fr: 'Lettres', ar: 'أدب', en: 'Literature' },
}

export function CatalogPage() {
  const { t, language } = useTranslation()
  const params = useRouterStore((s) => s.params)

  const [books, setBooks] = useState<BookData[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [genres, setGenres] = useState<Array<{ genre: string; count: number }>>([])
  const [pagination, setPagination] = useState<PaginationInfo>({ page: 1, limit: 12, total: 0, totalPages: 0 })
  const [loading, setLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState(params.category || '')
  const [selectedGenre, setSelectedGenre] = useState(params.genre || '')
  const [selectedLanguage, setSelectedLanguage] = useState(params.language || '')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [page, setPage] = useState(1)

  // Fetch categories
  useEffect(() => {
    fetch('/api/categories')
      .then((res) => res.json())
      .then((data) => {
        setCategories(data.categories || data || [])
      })
      .catch(() => {})
    fetch('/api/books/genres')
      .then((res) => res.json())
      .then((data) => {
        setGenres(data.genres || [])
      })
      .catch(() => {})
  }, [])

  // Fetch books
  const fetchBooks = useCallback(async () => {
    setLoading(true)
    try {
      const searchParams = new URLSearchParams()
      searchParams.set('page', String(page))
      searchParams.set('limit', '12')
      if (search) searchParams.set('search', search)
      if (selectedCategory) searchParams.set('category', selectedCategory)
      if (selectedGenre) searchParams.set('genre', selectedGenre)
      if (selectedLanguage) searchParams.set('language', selectedLanguage)
      if (minPrice) searchParams.set('minPrice', minPrice)
      if (maxPrice) searchParams.set('maxPrice', maxPrice)

      const res = await fetch(`/api/books?${searchParams.toString()}`)
      if (res.ok) {
        const data = await res.json()
        let fetchedBooks = data.books || []
        // Client-side sorting
        if (sortBy === 'priceLow') {
          fetchedBooks = [...fetchedBooks].sort((a, b) => (a.priceSale || 0) - (b.priceSale || 0))
        } else if (sortBy === 'priceHigh') {
          fetchedBooks = [...fetchedBooks].sort((a, b) => (b.priceSale || 0) - (a.priceSale || 0))
        } else if (sortBy === 'titleAZ') {
          fetchedBooks = [...fetchedBooks].sort((a, b) => a.title.localeCompare(b.title))
        } else if (sortBy === 'titleZA') {
          fetchedBooks = [...fetchedBooks].sort((a, b) => b.title.localeCompare(a.title))
        }
        setBooks(fetchedBooks)
        setPagination(data.pagination || { page, limit: 12, total: 0, totalPages: 0 })
      }
    } catch {
      // silently handle
    } finally {
      setLoading(false)
    }
  }, [page, search, selectedCategory, selectedGenre, selectedLanguage, minPrice, maxPrice, sortBy])

  useEffect(() => {
    fetchBooks()
  }, [fetchBooks])

  // Debounced search
  const [searchInput, setSearchInput] = useState('')
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput)
      setPage(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [searchInput])

  const resetFilters = () => {
    setSelectedCategory('')
    setSelectedGenre('')
    setSelectedLanguage('')
    setMinPrice('')
    setMaxPrice('')
    setSearch('')
    setSearchInput('')
    setSortBy('newest')
    setPage(1)
  }

  const activeFilterCount = [
    selectedCategory,
    selectedGenre,
    selectedLanguage,
    minPrice,
    maxPrice,
  ].filter(Boolean).length

  const getCategoryName = (cat: Category) => {
    if (language === 'ar') return cat.nameAr
    if (language === 'en') return cat.nameEn
    return cat.nameFr
  }

  const getLangLabel = (opt: typeof languageOptions[0]) => {
    if (language === 'ar') return opt.labelAr
    if (language === 'en') return opt.labelEn
    return opt.labelFr
  }

  const getGenreLabel = (slug: string) => {
    return genreLabels[slug]?.[language] || genreLabels[slug]?.fr || slug
  }

  const FilterContent = () => (
    <div className="space-y-5">
      {/* Category */}
      <div>
        <label className="text-sm font-medium text-foreground mb-1.5 block">
          {t('catalog.category')}
        </label>
        <Select value={selectedCategory} onValueChange={(v) => { setSelectedCategory(v === '__all__' ? '' : v); setPage(1) }}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t('catalog.allCategories')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{t('catalog.allCategories')}</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.slug} value={cat.slug}>
                {getCategoryName(cat)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Language */}
      <div>
        <label className="text-sm font-medium text-foreground mb-1.5 block">
          {t('catalog.language')}
        </label>
        <Select value={selectedLanguage} onValueChange={(v) => { setSelectedLanguage(v === '__all__' ? '' : v); setPage(1) }}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t('catalog.allLanguages')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{t('catalog.allLanguages')}</SelectItem>
            {languageOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {getLangLabel(opt)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Genre */}
      <div>
        <label className="text-sm font-medium text-foreground mb-1.5 block">
          {t('catalog.genre') || 'Genre'}
        </label>
        <Select value={selectedGenre} onValueChange={(v) => { setSelectedGenre(v === '__all__' ? '' : v); setPage(1) }}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t('catalog.allGenres') || 'Tous les genres'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{t('catalog.allGenres') || 'Tous les genres'}</SelectItem>
            {genres.map((g) => (
              <SelectItem key={g.genre} value={g.genre!}>
                {getGenreLabel(g.genre)} ({g.count})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Price Range */}
      <div>
        <label className="text-sm font-medium text-foreground mb-1.5 block">
          {t('catalog.priceRange')}
        </label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            placeholder={t('catalog.minPrice')}
            value={minPrice}
            onChange={(e) => { setMinPrice(e.target.value); setPage(1) }}
            className="h-9"
          />
          <span className="text-muted-foreground">—</span>
          <Input
            type="number"
            placeholder={t('catalog.maxPrice')}
            value={maxPrice}
            onChange={(e) => { setMaxPrice(e.target.value); setPage(1) }}
            className="h-9"
          />
        </div>
      </div>

      <Separator />

      <Button
        variant="outline"
        onClick={resetFilters}
        className="w-full"
      >
        {t('catalog.resetFilters')}
      </Button>
    </div>
  )

  return (
    <div className="animate-fade-in">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-navy mb-4">
            {t('nav.catalog')}
          </h1>

          {/* Search & Sort Row */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('common.searchPlaceholder')}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="ps-9 h-10"
              />
              {searchInput && (
                <button
                  onClick={() => { setSearchInput(''); setSearch('') }}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[180px] h-10">
                  <SelectValue placeholder={t('catalog.sortBy')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">{t('catalog.sortNewest')}</SelectItem>
                  <SelectItem value="priceLow">{t('catalog.sortPriceLow')}</SelectItem>
                  <SelectItem value="priceHigh">{t('catalog.sortPriceHigh')}</SelectItem>
                  <SelectItem value="titleAZ">{t('catalog.sortTitleAZ')}</SelectItem>
                  <SelectItem value="titleZA">{t('catalog.sortTitleZA')}</SelectItem>
                </SelectContent>
              </Select>
              {/* Mobile Filter Button */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="lg:hidden h-10 w-10 relative">
                    <SlidersHorizontal className="h-4 w-4" />
                    {activeFilterCount > 0 && (
                      <Badge className="absolute -top-1.5 -end-1.5 h-5 min-w-5 flex items-center justify-center bg-gold text-white text-[10px] font-bold border-0 px-1">
                        {activeFilterCount}
                      </Badge>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="end" className="w-80">
                  <SheetHeader>
                    <SheetTitle>{t('catalog.filterBy')}</SheetTitle>
                  </SheetHeader>
                  <div className="mt-4">
                    <FilterContent />
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>

          {/* Active Filters */}
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <span className="text-xs text-muted-foreground font-medium">{t('catalog.activeFilters')}:</span>
              {selectedCategory && (
                <Badge variant="secondary" className="gap-1">
                  {categories.find((c) => c.slug === selectedCategory)
                    ? getCategoryName(categories.find((c) => c.slug === selectedCategory)!)
                    : selectedCategory}
                  <button onClick={() => { setSelectedCategory(''); setPage(1) }}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {selectedLanguage && (
                <Badge variant="secondary" className="gap-1">
                  {getLangLabel(languageOptions.find((o) => o.value === selectedLanguage)!)}
                  <button onClick={() => { setSelectedLanguage(''); setPage(1) }}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {selectedGenre && (
                <Badge variant="secondary" className="gap-1">
                  {getGenreLabel(selectedGenre)}
                  <button onClick={() => { setSelectedGenre(''); setPage(1) }}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {minPrice && (
                <Badge variant="secondary" className="gap-1">
                  {t('catalog.minPrice')}: {minPrice} {t('common.da')}
                  <button onClick={() => { setMinPrice(''); setPage(1) }}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {maxPrice && (
                <Badge variant="secondary" className="gap-1">
                  {t('catalog.maxPrice')}: {maxPrice} {t('common.da')}
                  <button onClick={() => { setMaxPrice(''); setPage(1) }}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              <button
                onClick={resetFilters}
                className="text-xs text-gold hover:text-gold/80 font-medium"
              >
                {t('catalog.clearAll')}
              </button>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="flex gap-8">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:block w-64 shrink-0">
            <Card>
              <CardContent className="p-4">
                <h3 className="font-heading text-sm font-semibold text-navy mb-4">
                  {t('catalog.filterBy')}
                </h3>
                <FilterContent />
              </CardContent>
            </Card>
          </aside>

          {/* Book Grid */}
          <div className="flex-1 min-w-0">
            {/* Results Count */}
            <div className="mb-4 text-sm text-muted-foreground">
              {loading ? (
                <Skeleton className="h-4 w-40" />
              ) : (
                <span>
                  {t('catalog.showing')} {books.length} {pagination.total === 1 ? t('catalog.result') : t('catalog.results')} ({pagination.total} {t('catalog.books')})
                </span>
              )}
            </div>

            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-4 sm:gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="space-y-3">
                    <Skeleton className="aspect-[3/4] w-full rounded-lg" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-4 w-1/3" />
                  </div>
                ))}
              </div>
            ) : books.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-4 sm:gap-6">
                {books.map((book) => (
                  <BookCard key={book.id} book={book} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <BookOpen className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
                <p className="text-lg font-medium text-muted-foreground">
                  {t('catalog.noResults')}
                </p>
                <Button
                  variant="outline"
                  onClick={resetFilters}
                  className="mt-4"
                >
                  {t('catalog.resetFilters')}
                </Button>
              </div>
            )}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="gap-1"
                >
                  <ChevronLeft className="h-4 w-4 rtl-flip" />
                  {t('common.previous')}
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, pagination.totalPages) }).map((_, i) => {
                    let pageNum: number
                    if (pagination.totalPages <= 5) {
                      pageNum = i + 1
                    } else if (page <= 3) {
                      pageNum = i + 1
                    } else if (page >= pagination.totalPages - 2) {
                      pageNum = pagination.totalPages - 4 + i
                    } else {
                      pageNum = page - 2 + i
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={page === pageNum ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPage(pageNum)}
                        className={`w-9 h-9 p-0 ${page === pageNum ? 'bg-navy text-white' : ''}`}
                      >
                        {pageNum}
                      </Button>
                    )
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={page === pagination.totalPages}
                  className="gap-1"
                >
                  {t('common.next')}
                  <ChevronRight className="h-4 w-4 rtl-flip" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
