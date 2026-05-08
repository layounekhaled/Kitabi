// Shared ISBN lookup utility for Google Books and Open Library APIs

// Types for API responses
interface GoogleBookVolumeInfo {
  title?: string
  subtitle?: string
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

export interface LookupResult {
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

// ---- ISBN Validation ----

/**
 * Validate ISBN-10 check digit
 */
function isValidIsbn10(isbn: string): boolean {
  if (isbn.length !== 10) return false
  let sum = 0
  for (let i = 0; i < 9; i++) {
    const digit = parseInt(isbn[i], 10)
    if (isNaN(digit)) return false
    sum += digit * (10 - i)
  }
  const lastChar = isbn[9].toUpperCase()
  const lastDigit = lastChar === 'X' ? 10 : parseInt(lastChar, 10)
  if (isNaN(lastDigit)) return false
  sum += lastDigit
  return sum % 11 === 0
}

/**
 * Validate ISBN-13 check digit
 */
function isValidIsbn13(isbn: string): boolean {
  if (isbn.length !== 13) return false
  let sum = 0
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(isbn[i], 10)
    if (isNaN(digit)) return false
    sum += digit * (i % 2 === 0 ? 1 : 3)
  }
  const checkDigit = (10 - (sum % 10)) % 10
  return parseInt(isbn[12], 10) === checkDigit
}

/**
 * Validate an ISBN (10 or 13 digits)
 */
export function isValidIsbn(isbn: string): boolean {
  const clean = isbn.replace(/[-\s]/g, '')
  if (clean.length === 10) return isValidIsbn10(clean)
  if (clean.length === 13) return isValidIsbn13(clean)
  return false
}

/**
 * Convert ISBN-10 to ISBN-13
 */
export function isbn10To13(isbn10: string): string | null {
  const clean = isbn10.replace(/[-\s]/g, '')
  if (clean.length !== 10 || !isValidIsbn10(clean)) return null
  const prefix = '978' + clean.slice(0, 9)
  let sum = 0
  for (let i = 0; i < 12; i++) {
    sum += parseInt(prefix[i], 10) * (i % 2 === 0 ? 1 : 3)
  }
  const checkDigit = (10 - (sum % 10)) % 10
  return prefix + checkDigit
}

/**
 * Normalize an ISBN: if it's a valid ISBN-10, convert to ISBN-13
 */
export function normalizeIsbn(isbn: string): string {
  const clean = isbn.replace(/[-\s]/g, '')
  if (clean.length === 10 && isValidIsbn10(clean)) {
    return isbn10To13(clean) || clean
  }
  return clean
}

// ---- Language & Category Helpers ----

function normalizeLanguage(lang: string | undefined): string {
  if (!lang) return 'fr'
  const lower = lang.toLowerCase()
  if (lower === 'ar' || lower.startsWith('ar')) return 'ar'
  if (lower === 'en' || lower.startsWith('en')) return 'en'
  if (lower === 'fr' || lower.startsWith('fr')) return 'fr'
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

// ---- Google Books API ----

/**
 * Check if any of the industry identifiers in a Google Books result match the searched ISBN.
 * This prevents Google's fuzzy matching from returning the wrong book.
 */
function isbnMatchesResult(volumeInfo: GoogleBookVolumeInfo, searchedIsbn: string): boolean {
  const identifiers = volumeInfo.industryIdentifiers
  if (!identifiers || identifiers.length === 0) return false

  // Normalize the searched ISBN
  const normalizedSearch = normalizeIsbn(searchedIsbn)

  for (const id of identifiers) {
    const idValue = id.identifier.replace(/[-\s]/g, '')
    // Direct match
    if (idValue === searchedIsbn || idValue === normalizedSearch) return true
    // ISBN-10 match: convert to ISBN-13 and compare
    if (id.type === 'ISBN_10' && idValue.length === 10) {
      const as13 = isbn10To13(idValue)
      if (as13 === normalizedSearch || as13 === searchedIsbn) return true
    }
    // ISBN-13 match
    if (id.type === 'ISBN_13' && idValue.length === 13) {
      if (idValue === searchedIsbn || idValue === normalizedSearch) return true
    }
  }
  return false
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

    // Find the first result whose ISBN actually matches the searched ISBN
    // Google Books sometimes returns books with different ISBNs (fuzzy matching)
    let matchedItem = null
    for (const item of data.items) {
      if (isbnMatchesResult(item.volumeInfo, isbn)) {
        matchedItem = item
        break
      }
    }

    // If no exact match found, don't return a wrong book
    if (!matchedItem) {
      console.warn(`Google Books returned results for ISBN ${isbn} but none matched the searched ISBN. Skipping fuzzy match.`)
      return null
    }

    const volumeInfo = matchedItem.volumeInfo

    // Get the best cover image
    let coverUrl: string | null = null
    if (volumeInfo.imageLinks) {
      coverUrl = volumeInfo.imageLinks.thumbnail || volumeInfo.imageLinks.smallThumbnail || null
      if (coverUrl) {
        coverUrl = coverUrl.replace('http://', 'https://').replace('&edge=curl', '')
        // Upgrade to larger image quality
        coverUrl = coverUrl.replace(/&zoom=\d/, '&zoom=2')
      }
    }

    const language = normalizeLanguage(volumeInfo.language)
    const normalizedIsbn = normalizeIsbn(isbn)

    // Combine title + subtitle if available
    const fullTitle = volumeInfo.subtitle
      ? `${volumeInfo.title}: ${volumeInfo.subtitle}`
      : (volumeInfo.title || '')

    return {
      title: fullTitle,
      author: volumeInfo.authors?.join(', ') || '',
      description: volumeInfo.description || null,
      coverUrl,
      publisher: volumeInfo.publisher || null,
      pageCount: volumeInfo.pageCount || null,
      language,
      publishDate: volumeInfo.publishedDate || null,
      isbn: normalizedIsbn,
      categories: volumeInfo.categories || [],
      suggestedCategorySlug: suggestCategory(language),
      source: 'google',
    }
  } catch (error) {
    console.error('Google Books API error:', error)
    return null
  }
}

// ---- Open Library API ----

async function lookupOpenLibrary(isbn: string): Promise<LookupResult | null> {
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
    const categories = bookData.subjects?.map(s => s.name || '').filter(Boolean) || []
    const normalizedIsbn = normalizeIsbn(isbn)

    return {
      title: bookData.title || '',
      author: bookData.authors?.map(a => a.name).join(', ') || '',
      description,
      coverUrl,
      publisher: bookData.publishers?.[0]?.name || null,
      pageCount: bookData.number_of_pages || null,
      language,
      publishDate: bookData.publish_date || null,
      isbn: normalizedIsbn,
      categories,
      suggestedCategorySlug: suggestCategory(language),
      source: 'openlibrary',
    }
  } catch (error) {
    console.error('Open Library API error:', error)
    return null
  }
}

// ---- Main Lookup Function ----

/**
 * Look up a book by ISBN. Tries Google Books first, then Open Library as fallback.
 * Validates that the returned book's ISBN actually matches the searched ISBN
 * to prevent Google's fuzzy matching from returning wrong books.
 *
 * Also performs ISBN check digit validation and provides helpful error info.
 */
export async function lookupISBN(isbn: string): Promise<{
  result: LookupResult | null
  warning?: string
}> {
  const cleanIsbn = isbn.replace(/[-\s]/g, '')

  // Validate ISBN format
  if (cleanIsbn.length !== 10 && cleanIsbn.length !== 13) {
    return {
      result: null,
      warning: `Format ISBN invalide : "${cleanIsbn}" (doit contenir 10 ou 13 chiffres)`,
    }
  }

  // Validate check digit
  if (!isValidIsbn(cleanIsbn)) {
    // Try to find the closest valid ISBN by suggesting the correct check digit
    let suggestion = ''
    if (cleanIsbn.length === 13) {
      const prefix = cleanIsbn.slice(0, 12)
      if (/^\d{12}$/.test(prefix)) {
        let sum = 0
        for (let i = 0; i < 12; i++) {
          sum += parseInt(prefix[i], 10) * (i % 2 === 0 ? 1 : 3)
        }
        const correctCheck = (10 - (sum % 10)) % 10
        suggestion = prefix + correctCheck
      }
    } else if (cleanIsbn.length === 10) {
      const prefix = cleanIsbn.slice(0, 9)
      if (/^\d{9}$/.test(prefix)) {
        let sum = 0
        for (let i = 0; i < 9; i++) {
          sum += parseInt(prefix[i], 10) * (10 - i)
        }
        const remainder = sum % 11
        const correctCheck = remainder === 0 ? 0 : 11 - remainder
        const checkChar = correctCheck === 10 ? 'X' : correctCheck.toString()
        suggestion = prefix + checkChar
      }
    }

    const suggestionText = suggestion
      ? ` Vouliez-vous dire : ${suggestion} ?`
      : ''

    return {
      result: null,
      warning: `ISBN invalide (chiffre de contrôle incorrect).${suggestionText}`,
    }
  }

  // Normalize ISBN-10 to ISBN-13 for consistent storage
  const normalizedIsbn = normalizeIsbn(cleanIsbn)

  // Try Google Books first
  let result = await lookupGoogleBooks(cleanIsbn)

  // Also try with the normalized ISBN if different
  if (!result && normalizedIsbn !== cleanIsbn) {
    result = await lookupGoogleBooks(normalizedIsbn)
  }

  // If no results from Google, try Open Library
  if (!result) {
    result = await lookupOpenLibrary(cleanIsbn)
  }
  if (!result && normalizedIsbn !== cleanIsbn) {
    result = await lookupOpenLibrary(normalizedIsbn)
  }

  if (!result) {
    return { result: null }
  }

  return { result }
}
