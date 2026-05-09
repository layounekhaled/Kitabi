'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from '@/lib/i18n'
import { getAuthHeaders } from '@/lib/admin-auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
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
  Download,
  Loader2,
  BookOpen,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileDown,
  Save,
} from 'lucide-react'
import { toast } from 'sonner'

interface LookupResult {
  title: string
  author: string
  description: string | null
  coverUrl: string | null
  publisher: string | null
  pageCount: number | null
  language: string
  publishDate: string | null
  isbn: string
  categories: string[]
  suggestedCategorySlug: string
  source: string
}

interface PricingInfo {
  pageCount: number
  pricePurchase: number
  margin: number
  priceSale: number
}

interface ImportResult {
  isbn: string
  status: 'imported' | 'duplicate' | 'not_found' | 'error'
  title?: string
  message?: string
}

export default function AdminImport() {
  const { t } = useTranslation()
  const [isbn, setIsbn] = useState('')
  const [looking, setLooking] = useState(false)
  const [lookupResult, setLookupResult] = useState<LookupResult | null>(null)
  const [lookupError, setLookupError] = useState('')

  // Form for saving
  const [priceSale, setPriceSale] = useState('')
  const [pricePrint, setPricePrint] = useState('')
  const [margin, setMargin] = useState('')
  const [printDelay, setPrintDelay] = useState('3-5 jours')
  const [categorySlug, setCategorySlug] = useState('')
  const [saving, setSaving] = useState(false)

  // Bulk import
  const [bulkIsbns, setBulkIsbns] = useState('')
  const [bulkImporting, setBulkImporting] = useState(false)
  const [importResults, setImportResults] = useState<ImportResult[]>([])

  // Categories
  const [categories, setCategories] = useState<Array<{ id: string; slug: string; nameFr: string }>>([])

  // Load categories
  useEffect(() => {
    fetch('/api/categories')
      .then((r) => r.json())
      .then((d) => setCategories(d.categories || []))
      .catch(() => {})
  }, [])

  const handleLookup = async () => {
    if (!isbn.trim()) return
    setLooking(true)
    setLookupResult(null)
    setLookupError('')
    try {
      const res = await fetch(`/api/books/isbn-lookup?isbn=${encodeURIComponent(isbn)}`)
      const data = await res.json()
      if (!res.ok) {
        // Show specific error (ISBN validation, not found, etc.)
        setLookupError(data.error || 'Book not found')
        return
      }
      setLookupResult(data.book)
      setCategorySlug(data.book.suggestedCategorySlug || '')
      // Auto-fill prices from calculated pricing
      if (data.pricing) {
        setPriceSale(data.pricing.priceSale.toString())
        setPricePrint(data.pricing.pricePurchase.toString())
        setMargin(data.pricing.margin.toString())
      }
      if (data.warning) {
        toast.warning(data.warning)
      }
    } catch {
      setLookupError('Network error')
    } finally {
      setLooking(false)
    }
  }

  const handleSaveDraft = async () => {
    if (!lookupResult) return
    setSaving(true)
    try {
      const res = await fetch('/api/books', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          isbn: lookupResult.isbn,
          title: lookupResult.title,
          author: lookupResult.author,
          description: lookupResult.description,
          coverUrl: lookupResult.coverUrl,
          publisher: lookupResult.publisher,
          pageCount: lookupResult.pageCount,
          language: lookupResult.language,
          publishDate: lookupResult.publishDate,
          categorySlug: categorySlug || lookupResult.suggestedCategorySlug,
          priceSale: priceSale ? parseFloat(priceSale) : null,
          pricePrint: pricePrint ? parseFloat(pricePrint) : null,
          margin: margin ? parseFloat(margin) : null,
          printDelay: printDelay || null,
          isAvailable: true,
          isDraft: true,
          isPublished: false,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Save failed')
      }
      toast.success(t.admin.importSuccess)
      setLookupResult(null)
      setIsbn('')
      setPriceSale('')
      setPricePrint('')
      setMargin('')
      setPrintDelay('3-5 jours')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.admin.importError)
    } finally {
      setSaving(false)
    }
  }

  const handleBulkImport = async () => {
    const isbnList = bulkIsbns
      .split('\n')
      .map((s) => s.trim().replace(/[-\s]/g, ''))
      .filter(Boolean)

    if (isbnList.length === 0) return

    setBulkImporting(true)
    setImportResults([])
    try {
      const res = await fetch('/api/books/isbn-import', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ isbns: isbnList }),
      })
      const data = await res.json()
      // API returns { imported, duplicates, notFound, errors, summary }
      // Convert to ImportResult[] format for the results table
      const results: ImportResult[] = [
        ...(data.imported || []).map((r: { isbn: string; title: string }) => ({
          isbn: r.isbn,
          status: 'imported' as const,
          title: r.title,
        })),
        ...(data.duplicates || []).map((r: { isbn: string; title: string }) => ({
          isbn: r.isbn,
          status: 'duplicate' as const,
          title: r.title,
        })),
        ...(data.notFound || []).map((isbn: string) => ({
          isbn,
          status: 'not_found' as const,
        })),
        ...(data.errors || []).map((r: { isbn: string; error: string }) => ({
          isbn: r.isbn,
          status: 'error' as const,
          message: r.error,
        })),
      ]
      setImportResults(results)
      const importedCount = results.filter((r) => r.status === 'imported').length
      toast.success(`${importedCount} book(s) imported`)
      setBulkIsbns('')
    } catch {
      toast.error(t.admin.importError)
    } finally {
      setBulkImporting(false)
    }
  }

  const resultIcon = (status: string) => {
    switch (status) {
      case 'imported': return <CheckCircle2 className="w-4 h-4 text-green-500" />
      case 'duplicate': return <AlertTriangle className="w-4 h-4 text-yellow-500" />
      case 'not_found': return <XCircle className="w-4 h-4 text-red-500" />
      default: return <XCircle className="w-4 h-4 text-red-500" />
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">{t.admin.isbnImport}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Single ISBN Lookup */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Search className="w-4 h-4 text-amber-500" />
              {t.admin.isbnInput}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={isbn}
                onChange={(e) => setIsbn(e.target.value)}
                placeholder={t.admin.isbnPlaceholder}
                onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
              />
              <Button
                onClick={handleLookup}
                disabled={looking || !isbn.trim()}
                className="shrink-0 bg-amber-500 hover:bg-amber-600 text-white gap-2"
              >
                {looking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                {t.admin.importButton}
              </Button>
            </div>

            {looking && (
              <div className="flex items-center gap-2 p-4 bg-amber-50 rounded-lg text-amber-700 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                {t.admin.fetchingBook}
              </div>
            )}

            {lookupError && (
              <div className="p-4 bg-red-50 rounded-lg text-red-600 text-sm">
                {lookupError}
              </div>
            )}

            {lookupResult && (
              <div className="space-y-4">
                <Separator />

                {/* Book Preview */}
                <div className="flex gap-4 p-3 bg-slate-50 rounded-lg">
                  {lookupResult.coverUrl ? (
                    <img
                      src={lookupResult.coverUrl}
                      alt={lookupResult.title}
                      className="w-20 h-28 object-cover rounded shadow"
                    />
                  ) : (
                    <div className="w-20 h-28 bg-slate-200 rounded flex items-center justify-center">
                      <BookOpen className="w-6 h-6 text-slate-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0 text-sm">
                    <h3 className="font-semibold text-slate-800 truncate">{lookupResult.title}</h3>
                    <p className="text-slate-600 truncate">{lookupResult.author}</p>
                    {lookupResult.publisher && <p className="text-slate-500 text-xs mt-1">{lookupResult.publisher}</p>}
                    {lookupResult.pageCount && <p className="text-slate-500 text-xs">{lookupResult.pageCount} pages</p>}
                    <div className="flex gap-2 mt-2">
                      <Badge variant="secondary" className="text-[10px]">
                        {lookupResult.language.toUpperCase()}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px]">
                        {lookupResult.source}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px]">
                        {lookupResult.suggestedCategorySlug}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Price info banner */}
                <div className="p-3 bg-blue-50 rounded-lg text-blue-700 text-xs space-y-1">
                  <p className="font-semibold">Calcul automatique des prix :</p>
                  <p>Prix d'achat = ({lookupResult.pageCount || '?'} pages × 2,5 DA) + 200 DA (couverture)</p>
                  <p>Marge fixe = 800 DA</p>
                  <p className="font-semibold">Prix de vente = Prix d'achat + 800 DA</p>
                </div>

                {/* Price & Settings Form */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t.admin.priceSale} (DA)</Label>
                    <Input
                      type="number"
                      step="1"
                      value={priceSale}
                      onChange={(e) => setPriceSale(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t.admin.pricePrint} - Prix d'achat (DA)</Label>
                    <Input
                      type="number"
                      step="1"
                      value={pricePrint}
                      onChange={(e) => setPricePrint(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Marge (DA)</Label>
                    <Input
                      type="number"
                      step="1"
                      value={margin}
                      onChange={(e) => setMargin(e.target.value)}
                      placeholder="800"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t.admin.printDelay}</Label>
                    <Input
                      value={printDelay}
                      onChange={(e) => setPrintDelay(e.target.value)}
                      placeholder="3-5 jours"
                    />
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <Label className="text-xs">{t.admin.categorySlug}</Label>
                    <Select value={categorySlug || '_none'} onValueChange={(v) => setCategorySlug(v === '_none' ? '' : v)}>
                      <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">—</SelectItem>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.slug}>{cat.nameFr}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  onClick={handleSaveDraft}
                  disabled={saving}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {t.admin.saveBook} ({t.admin.draft})
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bulk ISBN Import */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <FileDown className="w-4 h-4 text-amber-500" />
              {t.admin.bulkImport || 'Import en masse'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">{t.admin.isbnListLabel || 'Liste ISBN (un par ligne)'}</Label>
              <Textarea
                value={bulkIsbns}
                onChange={(e) => setBulkIsbns(e.target.value)}
                placeholder={"978-2-07-036822-8\n978-2-07-040850-4\n978-2-07-041239-6"}
                rows={8}
                className="font-mono text-sm"
              />
            </div>

            <Button
              onClick={handleBulkImport}
              disabled={bulkImporting || !bulkIsbns.trim()}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white gap-2"
            >
              {bulkImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {t.admin.importAll || 'Tout importer'}
            </Button>

            {/* Import Results */}
            {importResults.length > 0 && (
              <div className="space-y-2">
                <Separator />
                <div className="flex gap-4 text-xs text-slate-500">
                  <span className="text-green-600">
                    <CheckCircle2 className="w-3 h-3 inline mr-1" />
                    {importResults.filter((r) => r.status === 'imported').length} imported
                  </span>
                  <span className="text-yellow-600">
                    <AlertTriangle className="w-3 h-3 inline mr-1" />
                    {importResults.filter((r) => r.status === 'duplicate').length} duplicates
                  </span>
                  <span className="text-red-600">
                    <XCircle className="w-3 h-3 inline mr-1" />
                    {importResults.filter((r) => r.status === 'not_found').length} not found
                  </span>
                </div>

                <div className="max-h-64 overflow-y-auto rounded border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8"></TableHead>
                        <TableHead>ISBN</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importResults.map((result, i) => (
                        <TableRow key={i}>
                          <TableCell>{resultIcon(result.status)}</TableCell>
                          <TableCell className="font-mono text-xs">{result.isbn}</TableCell>
                          <TableCell className="text-xs truncate max-w-[150px]">
                            {result.title || '-'}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={`text-[10px] ${
                                result.status === 'imported' ? 'bg-green-100 text-green-700' :
                                result.status === 'duplicate' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-red-100 text-red-700'
                              }`}
                            >
                              {result.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
