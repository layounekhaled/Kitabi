'use client'

import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from '@/lib/i18n'
import { getAuthHeaders } from '@/lib/admin-auth'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ScanSearch,
} from 'lucide-react'
import { toast } from 'sonner'

interface Category {
  id: string
  nameFr: string
  nameAr: string
  nameEn: string
  slug: string
}

interface Book {
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
  category: Category | null
  priceSale: number | null
  pricePrint: number | null
  margin: number | null
  printDelay: string | null
  isAvailable: boolean
  isDraft: boolean
  isPublished: boolean
  createdAt: string
}

const STATUS_FILTERS = ['all', 'published', 'draft'] as const

// Extracted table component to avoid duplication
function BooksTable({
  books,
  t,
  onEdit,
  onDelete,
  onTogglePublish,
  total,
  page,
  totalPages,
  onPageChange,
}: {
  books: Book[]
  t: ReturnType<typeof useTranslation>['t']
  onEdit: (book: Book) => void
  onDelete: (book: Book) => void
  onTogglePublish: (book: Book) => void
  total: number
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}) {
  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>{t.book.title}</TableHead>
              <TableHead className="hidden md:table-cell">{t.book.author}</TableHead>
              <TableHead className="hidden lg:table-cell">ISBN</TableHead>
              <TableHead>{t.book.price}</TableHead>
              <TableHead>{t.common.status}</TableHead>
              <TableHead className="text-right">{t.common.actions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {books.map((book) => (
              <TableRow key={book.id}>
                <TableCell>
                  {book.coverUrl ? (
                    <img
                      src={book.coverUrl}
                      alt={book.title}
                      className="w-8 h-11 object-cover rounded shadow-sm"
                    />
                  ) : (
                    <div className="w-8 h-11 bg-slate-100 rounded flex items-center justify-center">
                      <BookOpen className="w-3 h-3 text-slate-400" />
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <div className="max-w-[200px] truncate font-medium text-sm">{book.title}</div>
                </TableCell>
                <TableCell className="hidden md:table-cell text-sm text-slate-600">
                  <div className="max-w-[150px] truncate">{book.author}</div>
                </TableCell>
                <TableCell className="hidden lg:table-cell font-mono text-xs text-slate-500">
                  {book.isbn}
                </TableCell>
                <TableCell className="text-sm font-medium">
                  {book.priceSale ? `${book.priceSale} ${t.common.da}` : '-'}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {book.isPublished && (
                      <Badge className="bg-green-100 text-green-700 text-[10px]">{t.admin.published}</Badge>
                    )}
                    {book.isDraft && (
                      <Badge className="bg-yellow-100 text-yellow-700 text-[10px]">{t.admin.draft}</Badge>
                    )}
                    {!book.isAvailable && (
                      <Badge className="bg-red-100 text-red-700 text-[10px]">{t.book.unavailable}</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onTogglePublish(book)}
                      title={book.isPublished ? t.admin.unpublish : t.admin.publish}
                    >
                      {book.isPublished ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onEdit(book)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(book)}
                      className="text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-3 border-t">
        <p className="text-xs text-slate-500">
          {t.common.showing} {books.length} {t.common.of} {total}
        </p>
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="icon"
            disabled={page <= 1}
            onClick={() => onPageChange(Math.max(1, page - 1))}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </>
  )
}

export default function AdminBooks() {
  const { t } = useTranslation()
  const [books, setBooks] = useState<Book[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  // Dialog states
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selectedBook, setSelectedBook] = useState<Book | null>(null)
  const [saving, setSaving] = useState(false)
  const [isbnLooking, setIsbnLooking] = useState(false)

  // Form state
  const [form, setForm] = useState({
    isbn: '',
    title: '',
    author: '',
    description: '',
    coverUrl: '',
    publisher: '',
    pageCount: '',
    language: 'fr',
    publishDate: '',
    categorySlug: '',
    priceSale: '',
    pricePrint: '',
    margin: '',
    printDelay: '',
    isAvailable: true,
    isDraft: true,
    isPublished: false,
  })

  const fetchBooks = useCallback(async () => {
    // Use refreshing for subsequent fetches to avoid skeleton flash
    if (loading && books.length === 0) {
      setLoading(true)
    } else {
      setRefreshing(true)
    }
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        includeDrafts: 'true',
        search,
      })
      if (statusFilter === 'published') {
        params.set('isPublished', 'true')
      } else if (statusFilter === 'draft') {
        params.set('isDraft', 'true')
      }
      const res = await fetch(`/api/books?${params}`, { headers: getAuthHeaders() })
      if (!res.ok) throw new Error('Fetch failed')
      const data = await res.json()
      setBooks(data.books || [])
      setTotalPages(data.pagination?.totalPages || 1)
      setTotal(data.pagination?.total || 0)
    } catch {
      toast.error('Erreur')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [page, search, statusFilter])

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/categories')
      if (!res.ok) return
      const data = await res.json()
      setCategories(data.categories || [])
    } catch {
      // silent
    }
  }, [])

  useEffect(() => {
    fetchBooks()
  }, [fetchBooks])

  // Debounce search input - only trigger API after 400ms of inactivity
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput)
      setPage(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  const resetForm = () => {
    setForm({
      isbn: '',
      title: '',
      author: '',
      description: '',
      coverUrl: '',
      publisher: '',
      pageCount: '',
      language: 'fr',
      publishDate: '',
      categorySlug: '',
      priceSale: '',
      pricePrint: '',
      margin: '',
      printDelay: '',
      isAvailable: true,
      isDraft: true,
      isPublished: false,
    })
  }

  const openNewBook = () => {
    setSelectedBook(null)
    resetForm()
    setEditOpen(true)
  }

  const openEditBook = (book: Book) => {
    setSelectedBook(book)
    setForm({
      isbn: book.isbn,
      title: book.title,
      author: book.author,
      description: book.description || '',
      coverUrl: book.coverUrl || '',
      publisher: book.publisher || '',
      pageCount: book.pageCount?.toString() || '',
      language: book.language,
      publishDate: book.publishDate || '',
      categorySlug: book.categorySlug || '',
      priceSale: book.priceSale?.toString() || '',
      pricePrint: book.pricePrint?.toString() || '',
      margin: book.margin?.toString() || '',
      printDelay: book.printDelay || '',
      isAvailable: book.isAvailable,
      isDraft: book.isDraft,
      isPublished: book.isPublished,
    })
    setEditOpen(true)
  }

  const handleIsbnLookup = async () => {
    if (!form.isbn.trim()) return
    setIsbnLooking(true)
    try {
      const res = await fetch(`/api/books/isbn-lookup?isbn=${encodeURIComponent(form.isbn)}`)
      if (!res.ok) {
        const data = await res.json()
        // Show specific error message (ISBN validation, not found, etc.)
        toast.error(data.error || t.admin.importError)
        return
      }
      const data = await res.json()
      const book = data.book
      setForm((prev) => ({
        ...prev,
        title: book.title || prev.title,
        author: book.author || prev.author,
        description: book.description || prev.description,
        coverUrl: book.coverUrl || prev.coverUrl,
        publisher: book.publisher || prev.publisher,
        pageCount: book.pageCount?.toString() || prev.pageCount,
        language: book.language || prev.language,
        publishDate: book.publishDate || prev.publishDate,
        categorySlug: book.suggestedCategorySlug || prev.categorySlug,
      }))
      // Show warning if any
      if (data.warning) {
        toast.warning(data.warning)
      }
      toast.success(t.admin.autoFill)
    } catch {
      toast.error(t.admin.importError)
    } finally {
      setIsbnLooking(false)
    }
  }

  const handleSaveBook = async () => {
    if (!form.isbn || !form.title || !form.author || !form.language) {
      toast.error(t.common.required)
      return
    }
    setSaving(true)
    try {
      const payload = {
        isbn: form.isbn,
        title: form.title,
        author: form.author,
        description: form.description || null,
        coverUrl: form.coverUrl || null,
        publisher: form.publisher || null,
        pageCount: form.pageCount ? parseInt(form.pageCount) : null,
        language: form.language,
        publishDate: form.publishDate || null,
        categorySlug: form.categorySlug || null,
        priceSale: form.priceSale ? parseFloat(form.priceSale) : null,
        pricePrint: form.pricePrint ? parseFloat(form.pricePrint) : null,
        margin: form.margin ? parseFloat(form.margin) : null,
        printDelay: form.printDelay || null,
        isAvailable: form.isAvailable,
        isDraft: form.isDraft,
        isPublished: form.isPublished,
      }

      if (selectedBook) {
        const res = await fetch(`/api/books/${selectedBook.id}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Update failed')
        }
        toast.success(t.admin.updateBook)
      } else {
        const res = await fetch('/api/books', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Create failed')
        }
        toast.success(t.admin.saveBook)
      }

      setEditOpen(false)
      fetchBooks()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.common.error)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteBook = async () => {
    if (!selectedBook) return
    try {
      const res = await fetch(`/api/books/${selectedBook.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Delete failed')
      }
      toast.success(t.admin.delete)
      setDeleteOpen(false)
      setSelectedBook(null)
      fetchBooks()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.common.error)
    }
  }

  const togglePublish = async (book: Book) => {
    try {
      const res = await fetch(`/api/books/${book.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          isPublished: !book.isPublished,
          isDraft: book.isPublished ? true : false,
        }),
      })
      if (!res.ok) throw new Error('Update failed')
      toast.success(book.isPublished ? t.admin.unpublish : t.admin.publish)
      fetchBooks()
    } catch {
      toast.error(t.common.error)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-800">{t.admin.bookManagement}</h1>
        <Button onClick={openNewBook} className="gap-2 bg-amber-500 hover:bg-amber-600 text-white">
          <Plus className="w-4 h-4" />
          {t.admin.addBook}
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder={t.admin.searchBooks}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              {STATUS_FILTERS.map((filter) => (
                <Button
                  key={filter}
                  variant={statusFilter === filter ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => { setStatusFilter(filter); setPage(1) }}
                  className={statusFilter === filter ? 'bg-amber-500 hover:bg-amber-600 text-white' : ''}
                >
                  {filter === 'all' ? t.admin.all : filter === 'published' ? t.admin.published : t.admin.draft}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Books Table */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : refreshing ? (
            <div className="relative">
              <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
              </div>
              <BooksTable
                books={books}
                t={t}
                onEdit={openEditBook}
                onDelete={(book) => { setSelectedBook(book); setDeleteOpen(true) }}
                onTogglePublish={togglePublish}
                total={total}
                page={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </div>
          ) : books.length === 0 ? (
            <div className="py-12 text-center">
              <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-400">{t.admin.noBooks}</p>
            </div>
          ) : (
            <BooksTable
              books={books}
              t={t}
              onEdit={openEditBook}
              onDelete={(book) => { setSelectedBook(book); setDeleteOpen(true) }}
              onTogglePublish={togglePublish}
              total={total}
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          )}
        </CardContent>
      </Card>

      {/* Edit / Add Book Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedBook ? t.admin.editBook : t.admin.addBook}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* ISBN Lookup */}
            <div className="space-y-2">
              <Label>ISBN</Label>
              <div className="flex gap-2">
                <Input
                  value={form.isbn}
                  onChange={(e) => setForm({ ...form, isbn: e.target.value })}
                  placeholder={t.admin.isbnPlaceholder}
                  disabled={!!selectedBook}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleIsbnLookup}
                  disabled={isbnLooking || !form.isbn}
                  className="shrink-0 gap-2"
                >
                  {isbnLooking ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ScanSearch className="w-4 h-4" />
                  )}
                  {t.admin.autoFill}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Title */}
              <div className="space-y-2">
                <Label>{t.book.title} *</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                />
              </div>

              {/* Author */}
              <div className="space-y-2">
                <Label>{t.book.author} *</Label>
                <Input
                  value={form.author}
                  onChange={(e) => setForm({ ...form, author: e.target.value })}
                  required
                />
              </div>

              {/* Language */}
              <div className="space-y-2">
                <Label>{t.book.language} *</Label>
                <Select value={form.language} onValueChange={(v) => setForm({ ...form, language: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="ar">العربية</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label>{t.admin.categorySlug}</Label>
                <Select value={form.categorySlug || '_none'} onValueChange={(v) => setForm({ ...form, categorySlug: v === '_none' ? '' : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">—</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.slug}>{cat.nameFr}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Publisher */}
              <div className="space-y-2">
                <Label>{t.book.publisher}</Label>
                <Input
                  value={form.publisher}
                  onChange={(e) => setForm({ ...form, publisher: e.target.value })}
                />
              </div>

              {/* Pages */}
              <div className="space-y-2">
                <Label>{t.book.pages}</Label>
                <Input
                  type="number"
                  value={form.pageCount}
                  onChange={(e) => setForm({ ...form, pageCount: e.target.value })}
                />
              </div>

              {/* Publish Date */}
              <div className="space-y-2">
                <Label>{t.book.publishDate}</Label>
                <Input
                  type="date"
                  value={form.publishDate}
                  onChange={(e) => setForm({ ...form, publishDate: e.target.value })}
                />
              </div>

              {/* Print Delay */}
              <div className="space-y-2">
                <Label>{t.admin.printDelay}</Label>
                <Input
                  value={form.printDelay}
                  onChange={(e) => setForm({ ...form, printDelay: e.target.value })}
                  placeholder="3-5 jours"
                />
              </div>

              {/* Price Sale */}
              <div className="space-y-2">
                <Label>{t.admin.priceSale}</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.priceSale}
                  onChange={(e) => setForm({ ...form, priceSale: e.target.value })}
                />
              </div>

              {/* Price Print */}
              <div className="space-y-2">
                <Label>{t.admin.pricePrint}</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.pricePrint}
                  onChange={(e) => setForm({ ...form, pricePrint: e.target.value })}
                />
              </div>

              {/* Margin */}
              <div className="space-y-2">
                <Label>{t.admin.margin}</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.margin}
                  onChange={(e) => setForm({ ...form, margin: e.target.value })}
                />
              </div>

              {/* Cover URL */}
              <div className="space-y-2">
                <Label>{t.admin.coverImage} URL</Label>
                <Input
                  value={form.coverUrl}
                  onChange={(e) => setForm({ ...form, coverUrl: e.target.value })}
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>{t.book.description}</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
              />
            </div>

            {/* Toggles */}
            <div className="flex flex-wrap gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.isAvailable}
                  onCheckedChange={(v) => setForm({ ...form, isAvailable: v })}
                />
                <Label>{t.admin.isAvailable}</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.isDraft}
                  onCheckedChange={(v) => setForm({ ...form, isDraft: v })}
                />
                <Label>{t.admin.isDraft}</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.isPublished}
                  onCheckedChange={(v) => setForm({ ...form, isPublished: v })}
                />
                <Label>{t.admin.isPublished}</Label>
              </div>
            </div>

            {/* Cover Preview */}
            {form.coverUrl && (
              <div className="flex items-start gap-4 p-3 bg-slate-50 rounded-lg">
                <img
                  src={form.coverUrl}
                  alt="Cover preview"
                  className="w-16 h-22 object-cover rounded shadow"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
                <div className="text-xs text-slate-500">
                  <p className="font-medium text-slate-700">{form.title || 'Untitled'}</p>
                  <p>{form.author || 'Unknown Author'}</p>
                  {form.categorySlug && <Badge variant="secondary" className="mt-1 text-[10px]">{form.categorySlug}</Badge>}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>{t.common.cancel}</Button>
            <Button
              onClick={handleSaveBook}
              disabled={saving}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {selectedBook ? t.admin.updateBook : t.admin.saveBook}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.admin.confirmDelete}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.admin.confirmDeleteDesc}
              {selectedBook && (
                <span className="block mt-2 font-medium text-slate-700">
                  &ldquo;{selectedBook.title}&rdquo;
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteBook} className="bg-red-500 hover:bg-red-600 text-white">
              {t.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
