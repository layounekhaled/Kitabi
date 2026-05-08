import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// Types for API responses
interface GoogleBookVolumeInfo {
  title?: string
  authors?: string[]
  description?: string
  imageLinks?: {
    thumbnail?: string
    smallThumbnail?: string
  }
  publisher?: string
  pageCount?: number
  language?: string
  publishedDate?: string
  categories?: string[]
}

interface GoogleBooksResponse {
  totalItems: number
  items?: Array<{
    volumeInfo: GoogleBookVolumeInfo
  }>
}

interface OpenLibraryBookData {
  title?: string
  authors?: Array<{ name?: string }>
  description?: string | { value: string }
  cover?: {
    medium?: string
    large?: string
    small?: string
  }
  publishers?: Array<{ name?: string }>
  number_of_pages?: number
  languages?: Array<{ key?: string }>
  publish_date?: string
  subjects?: Array<{ name?: string }>
}

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
  suggestedCategorySlug: string
  source: string
}

function normalizeLanguage(lang: string | undefined): string {
  if (!lang) return 'fr'
  const lower = lang.toLowerCase()
  if (lower === 'ar' || lower.startsWith('ar')) return 'ar'
  if (lower === 'en' || lower.startsWith('en')) return 'en'
  return 'fr'
}

function suggestCategory(language: string): string {
  switch (language) {
    case 'ar':
      return 'livres-arabe'
    case 'en':
      return 'livres-anglais'
    case 'fr':
    default:
      return 'livres-francais'
  }
}

async function lookupGoogleBooks(isbn: string): Promise<LookupResult | null> {
  try {
    const response = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`,
      { next: { revalidate: 0 } }
    )
    if (!response.ok) return null

    const data: GoogleBooksResponse = await response.json()
    if (!data.items || data.items.length === 0) return null

    const volumeInfo = data.items[0].volumeInfo
    let coverUrl: string | null = null
    if (volumeInfo.imageLinks) {
      coverUrl = (volumeInfo.imageLinks.thumbnail || volumeInfo.imageLinks.smallThumbnail || null)
      if (coverUrl) {
        coverUrl = coverUrl.replace('http://', 'https://').replace('&edge=curl', '')
      }
    }

    const language = normalizeLanguage(volumeInfo.language)
    return {
      title: volumeInfo.title || '',
      author: volumeInfo.authors?.join(', ') || '',
      description: volumeInfo.description || null,
      coverUrl,
      publisher: volumeInfo.publisher || null,
      pageCount: volumeInfo.pageCount || null,
      language,
      publishDate: volumeInfo.publishedDate || null,
      isbn,
      suggestedCategorySlug: suggestCategory(language),
      source: 'google',
    }
  } catch {
    return null
  }
}

async function lookupOpenLibrary(isbn: string): Promise<LookupResult | null> {
  try {
    const response = await fetch(
      `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`,
      { next: { revalidate: 0 } }
    )
    if (!response.ok) return null

    const data = await response.json()
    const bookData: OpenLibraryBookData | undefined = data[`ISBN:${isbn}`]
    if (!bookData) return null

    let coverUrl: string | null = null
    if (bookData.cover) {
      coverUrl = bookData.cover.large || bookData.cover.medium || bookData.cover.small || null
    }

    let description: string | null = null
    if (bookData.description) {
      description = typeof bookData.description === 'string'
        ? bookData.description
        : bookData.description.value
    }

    let language = 'fr'
    if (bookData.languages && bookData.languages.length > 0) {
      const langCode = (bookData.languages[0].key || '').split('/').pop() || ''
      language = normalizeLanguage(langCode)
    }

    return {
      title: bookData.title || '',
      author: bookData.authors?.map(a => a.name).join(', ') || '',
      description,
      coverUrl,
      publisher: bookData.publishers?.[0]?.name || null,
      pageCount: bookData.number_of_pages || null,
      language,
      publishDate: bookData.publish_date || null,
      isbn,
      suggestedCategorySlug: suggestCategory(language),
      source: 'openlibrary',
    }
  } catch {
    return null
  }
}

async function lookupISBN(isbn: string): Promise<LookupResult | null> {
  let result = await lookupGoogleBooks(isbn)
  if (!result) {
    result = await lookupOpenLibrary(isbn)
  }
  return result
}

// POST /api/books/isbn-import - Import multiple ISBNs
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { isbns } = body as { isbns: string[] }

    if (!isbns || !Array.isArray(isbns) || isbns.length === 0) {
      return NextResponse.json(
        { error: 'An array of ISBNs is required' },
        { status: 400 }
      )
    }

    // Limit batch size
    if (isbns.length > 50) {
      return NextResponse.json(
        { error: 'Maximum 50 ISBNs per batch' },
        { status: 400 }
      )
    }

    const imported: Array<{ isbn: string; title: string; id: string }> = []
    const duplicates: Array<{ isbn: string; title: string }> = []
    const notFound: string[] = []
    const errors: Array<{ isbn: string; error: string }> = []

    for (const rawIsbn of isbns) {
      const isbn = rawIsbn.replace(/[-\s]/g, '')

      try {
        // Check if already exists
        const existing = await db.book.findUnique({ where: { isbn } })
        if (existing) {
          duplicates.push({ isbn, title: existing.title })
          continue
        }

        // Look up via APIs
        const lookupResult = await lookupISBN(isbn)
        if (!lookupResult) {
          notFound.push(isbn)
          continue
        }

        // Create draft book
        const book = await db.book.create({
          data: {
            isbn: lookupResult.isbn,
            title: lookupResult.title,
            author: lookupResult.author,
            description: lookupResult.description,
            coverUrl: lookupResult.coverUrl,
            publisher: lookupResult.publisher,
            pageCount: lookupResult.pageCount,
            language: lookupResult.language,
            publishDate: lookupResult.publishDate,
            categorySlug: lookupResult.suggestedCategorySlug,
            isDraft: true,
            isPublished: false,
          },
        })

        imported.push({ isbn, title: book.title, id: book.id })
      } catch (error) {
        console.error(`Error importing ISBN ${isbn}:`, error)
        errors.push({ isbn, error: 'Failed to import' })
      }
    }

    return NextResponse.json({
      imported,
      duplicates,
      notFound,
      errors,
      summary: {
        total: isbns.length,
        imported: imported.length,
        duplicates: duplicates.length,
        notFound: notFound.length,
        errors: errors.length,
      },
    })
  } catch (error) {
    console.error('Error importing ISBNs:', error)
    return NextResponse.json(
      { error: 'Failed to import ISBNs' },
      { status: 500 }
    )
  }
}
