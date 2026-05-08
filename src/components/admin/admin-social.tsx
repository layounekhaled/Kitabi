'use client'

import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from '@/lib/i18n'
import { getAuthHeaders } from '@/lib/admin-auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
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
  Share2,
  Send,
  Calendar,
  Loader2,
  BookOpen,
  Facebook,
  Instagram,
  AlertTriangle,
} from 'lucide-react'
import { toast } from 'sonner'

interface PublishedBook {
  id: string
  title: string
  author: string
  coverUrl: string | null
  language: string
  priceSale: number | null
  pricePrint: number | null
  pageCount: number | null
}

interface SocialPost {
  id: string
  bookId: string | null
  platform: string
  content: string
  imageUrl: string | null
  scheduledAt: string | null
  publishedAt: string | null
  status: string
  createdAt: string
  book: {
    id: string
    title: string
    author: string
    coverUrl: string | null
  } | null
}

const POST_STATUS_COLORS: Record<string, string> = {
  brouillon: 'bg-slate-100 text-slate-600',
  programmee: 'bg-blue-100 text-blue-700',
  publiee: 'bg-green-100 text-green-700',
  echouee: 'bg-red-100 text-red-700',
}

export default function AdminSocial() {
  const { t } = useTranslation()
  const [books, setBooks] = useState<PublishedBook[]>([])
  const [posts, setPosts] = useState<SocialPost[]>([])
  const [loading, setLoading] = useState(true)

  // Form
  const [selectedBookId, setSelectedBookId] = useState('')
  const [platforms, setPlatforms] = useState<string[]>(['facebook'])
  const [content, setContent] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const [publishing, setPublishing] = useState(false)

  // Selected book info
  const selectedBook = books.find((b) => b.id === selectedBookId)

  const fetchBooks = useCallback(async () => {
    try {
      const res = await fetch('/api/books?limit=100&includeDrafts=true', { headers: getAuthHeaders() })
      const data = await res.json()
      const published = (data.books || []).filter((b: PublishedBook) => b.priceSale)
      setBooks(published)
    } catch {
      // silent
    }
  }, [])

  const fetchPosts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/social', { headers: getAuthHeaders() })
      const data = await res.json()
      setPosts(data.posts || [])
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBooks()
    fetchPosts()
  }, [fetchBooks, fetchPosts])

  // Auto-generate content when book is selected
  useEffect(() => {
    if (selectedBook && !content) {
      const isArabic = selectedBook.language === 'ar'
      const price = selectedBook.priceSale ? `${selectedBook.priceSale} DA` : ''

      if (isArabic) {
        setContent(
          `📚 كتاب جديد متوفر!\n\n📕 "${selectedBook.title}"\n✍️ ${selectedBook.author}\n${selectedBook.pageCount ? `📄 ${selectedBook.pageCount} صفحة\n` : ''}${price ? `💰 السعر: ${price}\n` : ''}\n🚚 التوصيل لجميع الولايات\n\n#كتابي #كتب_عربية #قراءة`
        )
      } else if (selectedBook.language === 'en') {
        setContent(
          `📚 New book available!\n\n📕 "${selectedBook.title}"\n✍️ ${selectedBook.author}\n${selectedBook.pageCount ? `📄 ${selectedBook.pageCount} pages\n` : ''}${price ? `💰 Price: ${price}\n` : ''}\n🚚 Delivery across Algeria\n\n#kitabi #books #reading #algeria`
        )
      } else {
        setContent(
          `📚 Nouveau livre disponible !\n\n📕 "${selectedBook.title}"\n✍️ ${selectedBook.author}\n${selectedBook.pageCount ? `📄 ${selectedBook.pageCount} pages\n` : ''}${price ? `💰 Prix: ${price}\n` : ''}\n🚚 Livraison dans toutes les wilayas\n\n#kitabi #livres #lecture #algérie`
        )
      }
    }
  }, [selectedBook, content])

  const togglePlatform = (platform: string) => {
    setPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform]
    )
  }

  const handlePublish = async (schedule: boolean) => {
    if (!selectedBookId || platforms.length === 0) {
      toast.error(t.common.required)
      return
    }
    setPublishing(true)
    try {
      for (const platform of platforms) {
        const scheduledAt = schedule && scheduledDate && scheduledTime
          ? new Date(`${scheduledDate}T${scheduledTime}`).toISOString()
          : undefined

        const res = await fetch('/api/social', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            bookId: selectedBookId,
            platform,
            content,
            autoGenerate: !content,
            scheduledAt,
          }),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Failed')
        }
      }
      toast.success(schedule ? t.admin.schedulePost : t.admin.publishNow)
      // Reset
      setSelectedBookId('')
      setContent('')
      setScheduledDate('')
      setScheduledTime('')
      fetchPosts()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.common.error)
    } finally {
      setPublishing(false)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">{t.admin.socialMediaManagement}</h1>

      {/* API Notice */}
      <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800">
          <p className="font-medium">Meta API Configuration Required</p>
          <p className="text-amber-700 mt-1">
            To publish to Facebook and Instagram, you need to configure Meta Graph API credentials in your .env file.
            For this MVP, the UI is ready but actual publishing requires API keys (FACEBOOK_PAGE_ID, FACEBOOK_ACCESS_TOKEN, etc.).
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Create Post */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Share2 className="w-4 h-4 text-amber-500" />
              Create Post
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Book Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs">Select Book *</Label>
              <Select value={selectedBookId} onValueChange={(v) => { setSelectedBookId(v); setContent('') }}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a book..." />
                </SelectTrigger>
                <SelectContent>
                  {books.map((book) => (
                    <SelectItem key={book.id} value={book.id}>
                      <span className="truncate">{book.title} — {book.author}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Book Preview */}
            {selectedBook && (
              <div className="flex gap-3 p-3 bg-slate-50 rounded-lg">
                {selectedBook.coverUrl ? (
                  <img
                    src={selectedBook.coverUrl}
                    alt={selectedBook.title}
                    className="w-14 h-20 object-cover rounded shadow"
                  />
                ) : (
                  <div className="w-14 h-20 bg-slate-200 rounded flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-slate-400" />
                  </div>
                )}
                <div className="text-sm min-w-0">
                  <p className="font-medium truncate">{selectedBook.title}</p>
                  <p className="text-slate-500 text-xs">{selectedBook.author}</p>
                  <div className="flex gap-1 mt-1">
                    <Badge variant="secondary" className="text-[10px]">{selectedBook.language.toUpperCase()}</Badge>
                    {selectedBook.priceSale && (
                      <Badge variant="secondary" className="text-[10px]">{selectedBook.priceSale} DA</Badge>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Platform Selection */}
            <div className="space-y-1.5">
              <Label className="text-xs">{t.admin.socialPlatform} *</Label>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="facebook"
                    checked={platforms.includes('facebook')}
                    onCheckedChange={() => togglePlatform('facebook')}
                  />
                  <Label htmlFor="facebook" className="text-sm flex items-center gap-1.5 cursor-pointer">
                    <Facebook className="w-4 h-4 text-blue-600" />
                    {t.admin.facebook}
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="instagram"
                    checked={platforms.includes('instagram')}
                    onCheckedChange={() => togglePlatform('instagram')}
                  />
                  <Label htmlFor="instagram" className="text-sm flex items-center gap-1.5 cursor-pointer">
                    <Instagram className="w-4 h-4 text-pink-600" />
                    {t.admin.instagram}
                  </Label>
                </div>
              </div>
            </div>

            {/* Post Content */}
            <div className="space-y-1.5">
              <Label className="text-xs">{t.admin.postContent}</Label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={6}
                placeholder="Write your post content or leave empty to auto-generate..."
              />
            </div>

            {/* Schedule */}
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {t.admin.schedulePost} (optional)
              </Label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="flex-1"
                />
                <Input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>

            <Separator />

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                onClick={() => handlePublish(false)}
                disabled={publishing || !selectedBookId || platforms.length === 0}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white gap-2"
              >
                {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {t.admin.publishNow}
              </Button>
              <Button
                onClick={() => handlePublish(true)}
                disabled={publishing || !selectedBookId || platforms.length === 0 || !scheduledDate}
                variant="outline"
                className="flex-1 gap-2"
              >
                <Calendar className="w-4 h-4" />
                {t.admin.schedulePost}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Posts History */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Posts History</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-16 bg-slate-100 rounded animate-pulse" />
                ))}
              </div>
            ) : posts.length === 0 ? (
              <div className="py-12 text-center">
                <Share2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-400">No posts yet</p>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto space-y-3">
                {posts.map((post) => (
                  <div key={post.id} className="p-3 border rounded-lg space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {post.platform === 'facebook' ? (
                          <Facebook className="w-4 h-4 text-blue-600" />
                        ) : (
                          <Instagram className="w-4 h-4 text-pink-600" />
                        )}
                        <span className="text-xs font-medium text-slate-600">
                          {post.book?.title || 'No book'}
                        </span>
                      </div>
                      <Badge
                        variant="secondary"
                        className={`text-[10px] ${POST_STATUS_COLORS[post.status] || ''}`}
                      >
                        {t.admin[post.status as keyof typeof t.admin] || post.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2">{post.content}</p>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400">
                      <span>{formatDate(post.createdAt)}</span>
                      {post.scheduledAt && (
                        <span className="text-blue-500">
                          Scheduled: {formatDate(post.scheduledAt)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
