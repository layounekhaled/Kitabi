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
  industryIdentifiers?: Array<{
    type: string
    identifier: string
  }>
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
  authors?: Array<{ name?: string; url?: string }>
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

// Normalize language code to our system
function normalizeLanguage(lang: string | undefined): string {
  if (!lang) return 'fr'
  const lower = lang.toLowerCase()
  if (lower === 'ar' || lower.startsWith('ar')) return 'ar'
  if (lower === 'en' || lower.startsWith('en')) return 'en'
  if (lower === 'fr' || lower.startsWith('fr')) return 'fr'
  // Default based on common patterns
  return 'fr'
}

// Suggest category slug based on language
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

// Try Google Books API
async function lookupGoogleBooks(isbn: string) {
  try {
    const response = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`,
      { next: { revalidate: 0 } }
    )

    if (!response.ok) return null

    const data: GoogleBooksResponse = await response.json()

    if (!data.items || data.items.length === 0) return null

    const volumeInfo = data.items[0].volumeInfo

    // Get the best cover image
    let coverUrl: string | null = null
    if (volumeInfo.imageLinks) {
      coverUrl = volumeInfo.imageLinks.thumbnail || volumeInfo.imageLinks.smallThumbnail || null
      // Upgrade to larger image
      if (coverUrl) {
        coverUrl = coverUrl.replace('http://', 'https://')
        coverUrl = coverUrl.replace('&edge=curl', '')
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
      categories: volumeInfo.categories || [],
      suggestedCategorySlug: suggestCategory(language),
      source: 'google',
    }
  } catch (error) {
    console.error('Google Books API error:', error)
    return null
  }
}

// Try Open Library API
async function lookupOpenLibrary(isbn: string) {
  try {
    const response = await fetch(
      `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`,
      { next: { revalidate: 0 } }
    )

    if (!response.ok) return null

    const data = await response.json()
    const bookKey = `ISBN:${isbn}`
    const bookData: OpenLibraryBookData | undefined = data[bookKey]

    if (!bookData) return null

    // Extract cover URL
    let coverUrl: string | null = null
    if (bookData.cover) {
      coverUrl = bookData.cover.large || bookData.cover.medium || bookData.cover.small || null
    }

    // Extract description
    let description: string | null = null
    if (bookData.description) {
      description = typeof bookData.description === 'string'
        ? bookData.description
        : bookData.description.value
    }

    // Extract language
    let language = 'fr'
    if (bookData.languages && bookData.languages.length > 0) {
      const langKey = bookData.languages[0].key || ''
      const langCode = langKey.split('/').pop() || ''
      language = normalizeLanguage(langCode)
    }

    // Extract categories
    const categories = bookData.subjects?.map(s => s.name || '') || []

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
      categories,
      suggestedCategorySlug: suggestCategory(language),
      source: 'openlibrary',
    }
  } catch (error) {
    console.error('Open Library API error:', error)
    return null
  }
}

// GET /api/books/isbn-lookup - Look up a book by ISBN
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const isbn = searchParams.get('isbn')

    if (!isbn) {
      return NextResponse.json(
        { error: 'ISBN parameter is required' },
        { status: 400 }
      )
    }

    // Clean ISBN - remove dashes and spaces
    const cleanIsbn = isbn.replace(/[-\s]/g, '')

    // Try Google Books first
    let result = await lookupGoogleBooks(cleanIsbn)

    // If no results from Google, try Open Library
    if (!result) {
      result = await lookupOpenLibrary(cleanIsbn)
    }

    if (!result) {
      return NextResponse.json(
        { error: 'Book not found in any external database', isbn: cleanIsbn },
        { status: 404 }
      )
    }

    return NextResponse.json({ book: result })
  } catch (error) {
    console.error('Error looking up ISBN:', error)
    return NextResponse.json(
      { error: 'Failed to look up ISBN' },
      { status: 500 }
    )
  }
}
