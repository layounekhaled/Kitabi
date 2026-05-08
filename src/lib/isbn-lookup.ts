// Shared ISBN lookup utility with multiple sources:
// 1. Google Books API (primary - good international coverage)
// 2. Open Library Books API (good for English/academic books)
// 3. Open Library Search API (broader coverage, finds books the Books API misses)
// 4. BNF - Bibliothèque Nationale de France (excellent for French books)
// 5. Google Books broader search (fallback with less strict matching)

// ============================================================
// Types
// ============================================================

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

interface OLSearchDoc {
  title?: string
  author_name?: string | string[]
  publisher?: string | string[]
  first_publish_year?: number
  isbn?: string[]
  cover_i?: number
  number_of_pages?: number
  language?: string[]
}

interface OLSearchResponse {
  numFound: number
  docs?: OLSearchDoc[]
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

// ============================================================
// ISBN Validation
// ============================================================

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

export function isValidIsbn(isbn: string): boolean {
  const clean = isbn.replace(/[-\s]/g, '')
  if (clean.length === 10) return isValidIsbn10(clean)
  if (clean.length === 13) return isValidIsbn13(clean)
  return false
}

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

export function normalizeIsbn(isbn: string): string {
  const clean = isbn.replace(/[-\s]/g, '')
  if (clean.length === 10 && isValidIsbn10(clean)) {
    return isbn10To13(clean) || clean
  }
  return clean
}

// ============================================================
// Language & Category Helpers
// ============================================================

function normalizeLanguage(lang: string | undefined): string {
  if (!lang) return 'fr'
  const lower = lang.toLowerCase()
  if (lower === 'ar' || lower.startsWith('ar')) return 'ar'
  if (lower === 'en' || lower.startsWith('en')) return 'en'
  if (lower === 'fr' || lower.startsWith('fr')) return 'fr'
  // Common language codes
  const langMap: Record<string, string> = {
    'ara': 'ar', 'arabic': 'ar',
    'eng': 'en', 'english': 'en',
    'fre': 'fr', 'fra': 'fr', 'french': 'fr', 'francais': 'fr', 'français': 'fr',
  }
  if (langMap[lower]) return langMap[lower]
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

// ============================================================
// Source 1: Google Books API (with strict ISBN verification)
// ============================================================

function isbnMatchesResult(volumeInfo: GoogleBookVolumeInfo, searchedIsbn: string): boolean {
  const identifiers = volumeInfo.industryIdentifiers
  if (!identifiers || identifiers.length === 0) return false

  const normalizedSearch = normalizeIsbn(searchedIsbn)

  for (const id of identifiers) {
    const idValue = id.identifier.replace(/[-\s]/g, '')
    if (idValue === searchedIsbn || idValue === normalizedSearch) return true
    if (id.type === 'ISBN_10' && idValue.length === 10) {
      const as13 = isbn10To13(idValue)
      if (as13 === normalizedSearch || as13 === searchedIsbn) return true
    }
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

    // Find the first result whose ISBN actually matches
    let matchedItem = null
    for (const item of data.items) {
      if (isbnMatchesResult(item.volumeInfo, isbn)) {
        matchedItem = item
        break
      }
    }

    if (!matchedItem) return null

    const volumeInfo = matchedItem.volumeInfo

    let coverUrl: string | null = null
    if (volumeInfo.imageLinks) {
      coverUrl = volumeInfo.imageLinks.thumbnail || volumeInfo.imageLinks.smallThumbnail || null
      if (coverUrl) {
        coverUrl = coverUrl.replace('http://', 'https://').replace('&edge=curl', '')
        coverUrl = coverUrl.replace(/&zoom=\d/, '&zoom=2')
      }
    }

    const language = normalizeLanguage(volumeInfo.language)
    const normalizedIsbn = normalizeIsbn(isbn)
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

// ============================================================
// Source 2: Open Library Books API (exact ISBN lookup)
// ============================================================

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
      const langKey = bookData.languages[0].key || ''
      const langCode = langKey.split('/').pop() || ''
      language = normalizeLanguage(langCode)
    }

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
    console.error('Open Library Books API error:', error)
    return null
  }
}

// ============================================================
// Source 3: Open Library Search API (broader coverage)
// Different from the Books API - uses the search index which
// has more books. Good fallback when the Books API misses.
// ============================================================

async function lookupOpenLibrarySearch(isbn: string): Promise<LookupResult | null> {
  try {
    const response = await fetch(
      `https://openlibrary.org/search.json?isbn=${isbn}&limit=3&fields=title,author_name,publisher,first_publish_year,isbn,cover_i,number_of_pages,language`,
      { next: { revalidate: 0 } }
    )
    if (!response.ok) return null

    const data: OLSearchResponse = await response.json()
    if (!data.docs || data.docs.length === 0) return null

    // Find the doc that has our ISBN
    const normalizedIsbn = normalizeIsbn(isbn)
    let matchedDoc: OLSearchDoc | null = null

    for (const doc of data.docs) {
      if (doc.isbn && doc.isbn.some(i => {
        const clean = i.replace(/[-\s]/g, '')
        return clean === isbn || clean === normalizedIsbn ||
               normalizeIsbn(clean) === normalizedIsbn
      })) {
        matchedDoc = doc
        break
      }
    }

    // If no exact ISBN match, take the first result (less reliable but better than nothing)
    if (!matchedDoc) {
      matchedDoc = data.docs[0]
    }

    const doc = matchedDoc

    // Build cover URL from cover ID
    let coverUrl: string | null = null
    if (doc.cover_i) {
      coverUrl = `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`
    }

    // Determine language from ISBN prefix or default to French
    let language = 'fr'
    if (normalizedIsbn.startsWith('9789961') || normalizedIsbn.startsWith('9789954')) {
      language = 'ar' // North African ISBNs
    } else if (normalizedIsbn.startsWith('9780') || normalizedIsbn.startsWith('9781')) {
      language = 'en' // English ISBNs
    } else if (doc.language && doc.language.length > 0) {
      language = normalizeLanguage(doc.language[0])
    }

    const authorName = Array.isArray(doc.author_name) ? doc.author_name.join(', ') : (doc.author_name || '')
    const publisher = Array.isArray(doc.publisher) ? doc.publisher[0] : (doc.publisher || null)
    const publishDate = doc.first_publish_year?.toString() || null

    return {
      title: doc.title || '',
      author: authorName,
      description: null, // Search API doesn't return descriptions
      coverUrl,
      publisher,
      pageCount: doc.number_of_pages || null,
      language,
      publishDate,
      isbn: normalizedIsbn,
      categories: [],
      suggestedCategorySlug: suggestCategory(language),
      source: 'openlibrary-search',
    }
  } catch (error) {
    console.error('Open Library Search API error:', error)
    return null
  }
}

// ============================================================
// Source 4: BNF - Bibliothèque Nationale de France
// Excellent for French books that aren't on Google Books or
// Open Library. Uses the SRU API (free, no key needed).
// ============================================================

async function lookupBNF(isbn: string): Promise<LookupResult | null> {
  try {
    const normalizedIsbn = normalizeIsbn(isbn)

    // BNF SRU API - search by ISBN first
    const response = await fetch(
      `https://catalogue.bnf.fr/api/SRU?version=1.2&operation=searchRetrieve&query=bib.isbn%20all%20%22${encodeURIComponent(normalizedIsbn)}%22&recordSchema=dublincore&maximumRecords=3`,
      { next: { revalidate: 0 } }
    )
    if (!response.ok) return null

    let xml = await response.text()

    // Check if we have results - BNF uses srw: namespace prefix
    // Also try without namespace for robustness
    const recordMatch = xml.match(/(?:<[^>]*:?numberOfRecords>)(\d+)(?:<\/[^>]*:?numberOfRecords>)/)
    const hasResults = recordMatch ? parseInt(recordMatch[1]) > 0 : false

    // If no results by ISBN, try full text search as fallback
    if (!hasResults) {
      const fullTextResponse = await fetch(
        `https://catalogue.bnf.fr/api/SRU?version=1.2&operation=searchRetrieve&query=bib.anywhere%20all%20%22${encodeURIComponent(normalizedIsbn)}%22&recordSchema=dublincore&maximumRecords=3`,
        { next: { revalidate: 0 } }
      )
      if (fullTextResponse.ok) {
        xml = await fullTextResponse.text()
      }
    }

    // Parse XML to extract book data
    const titles = extractXmlFields(xml, 'dc:title')
    const creators = extractXmlFields(xml, 'dc:creator')
    const publishers = extractXmlFields(xml, 'dc:publisher')
    const dates = extractXmlFields(xml, 'dc:date')
    const languages = extractXmlFields(xml, 'dc:language')
    const descriptions = extractXmlFields(xml, 'dc:description')
    const formats = extractXmlFields(xml, 'dc:format')

    if (titles.length === 0) return null

    // Clean up title (BNF often appends " / Author" to titles)
    let title = titles[0]
    const slashIdx = title.indexOf(' / ')
    if (slashIdx > 0) {
      title = title.substring(0, slashIdx).trim()
    }

    // Clean up author (BNF adds dates and roles like "Plée, Leslie (1980-....). Auteur du texte")
    let author = creators.length > 0 ? creators[0] : ''
    // Remove patterns like "(1980-....). Auteur du texte"
    author = author.replace(/\([^)]*\)\s*\.?\s*(Auteur|Autre|Éditeur|Traducteur|Directeur|Préfacier|Illustrateur|Traducteur|Compilateur|Commentaire)[^,]*/g, '').trim()
    author = author.replace(/\s*\.?\s*(Auteur du texte|Auteur|Autre|Éditeur|Traducteur|Directeur de publication|Préfacier|Illustrateur)[^,]*/g, '').trim()
    // If multiple creators, join them but clean each
    if (creators.length > 1) {
      author = creators.slice(0, 3).map(c =>
        c.replace(/\([^)]*\)\s*\.?\s*(Auteur|Autre|Éditeur|Traducteur|Directeur|Préfacier|Illustrateur|Compilateur|Commentaire)[^,]*/g, '').trim()
      ).filter(Boolean).join(', ')
    }

    // Determine language
    let language = 'fr' // BNF is primarily French
    if (languages.length > 0) {
      language = normalizeLanguage(languages[0])
    }

    // Extract page count from dc:format field (e.g. "1 vol. (103 p.) : ill. ; 19 cm")
    let pageCount: number | null = null
    for (const fmt of formats) {
      const pageMatch = fmt.match(/\((\d+)\s*p\.?\)/)
      if (pageMatch) {
        pageCount = parseInt(pageMatch[1])
        break
      }
    }

    // Extract date
    const publishDate = dates.length > 0 ? dates[0] : null

    // Get description (skip barcode descriptions)
    let description: string | null = null
    for (const desc of descriptions) {
      if (!desc.includes('Code à barres') && !desc.includes('EAN')) {
        description = desc
        break
      }
    }

    return {
      title,
      author,
      description,
      coverUrl: null, // BNF doesn't provide covers through this API
      publisher: publishers.length > 0 ? publishers[0] : null,
      pageCount,
      language,
      publishDate,
      isbn: normalizedIsbn,
      categories: [],
      suggestedCategorySlug: suggestCategory(language),
      source: 'bnf',
    }
  } catch (error) {
    console.error('BNF API error:', error)
    return null
  }
}

// BNF full text search is now integrated into lookupBNF function

/**
 * Extract field values from XML response
 */
function extractXmlFields(xml: string, tagName: string): string[] {
  const results: string[] = []
  // Match both <dc:tag>value</dc:tag> and <dc:tag xmlns:...>value</dc:tag>
  const regex = new RegExp(`<${tagName}[^>]*>([^<]+)</${tagName}>`, 'g')
  let match
  while ((match = regex.exec(xml)) !== null) {
    // Decode XML entities
    const value = match[1]
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .trim()
    if (value) results.push(value)
  }
  return results
}

// ============================================================
// Source 5: Google Books broader search (fallback)
// When the strict isbn: search fails, try a broader query.
// Less reliable but can find books that aren't indexed by ISBN.
// ============================================================

async function lookupGoogleBooksBroad(isbn: string): Promise<LookupResult | null> {
  try {
    // Try searching with just the ISBN number (no isbn: prefix)
    // This catches books where Google has the ISBN in metadata but not as a primary identifier
    const response = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(isbn)}&maxResults=5`,
      { next: { revalidate: 0 } }
    )
    if (!response.ok) return null

    const data: GoogleBooksResponse = await response.json()
    if (!data.items || data.items.length === 0) return null

    // Try to find a match - be more lenient than the strict search
    const normalizedIsbn = normalizeIsbn(isbn)

    for (const item of data.items) {
      const volumeInfo = item.volumeInfo

      // First check if there's an exact ISBN match we might have missed
      if (volumeInfo.industryIdentifiers) {
        for (const id of volumeInfo.industryIdentifiers) {
          const idValue = id.identifier.replace(/[-\s]/g, '')
          if (idValue === isbn || idValue === normalizedIsbn) {
            // Found a match! Return this book
            return buildGoogleBooksResult(volumeInfo, isbn)
          }
          // Check ISBN-10 to ISBN-13 conversion
          if (id.type === 'ISBN_10' && idValue.length === 10) {
            const as13 = isbn10To13(idValue)
            if (as13 === normalizedIsbn) {
              return buildGoogleBooksResult(volumeInfo, isbn)
            }
          }
        }
      }

      // No exact match - check if the ISBN appears in the title or description
      // (some Google Books entries have ISBN in title for certain editions)
      const titleMatch = volumeInfo.title?.includes(isbn) || volumeInfo.subtitle?.includes(isbn)
      if (titleMatch) {
        return buildGoogleBooksResult(volumeInfo, isbn)
      }
    }

    return null
  } catch (error) {
    console.error('Google Books broad search error:', error)
    return null
  }
}

/**
 * Helper to build a LookupResult from Google Books volumeInfo
 */
function buildGoogleBooksResult(volumeInfo: GoogleBookVolumeInfo, isbn: string): LookupResult {
  let coverUrl: string | null = null
  if (volumeInfo.imageLinks) {
    coverUrl = volumeInfo.imageLinks.thumbnail || volumeInfo.imageLinks.smallThumbnail || null
    if (coverUrl) {
      coverUrl = coverUrl.replace('http://', 'https://').replace('&edge=curl', '')
      coverUrl = coverUrl.replace(/&zoom=\d/, '&zoom=2')
    }
  }

  const language = normalizeLanguage(volumeInfo.language)
  const normalizedIsbn = normalizeIsbn(isbn)
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
}

// ============================================================
// Main Lookup Function - cascading through all sources
// ============================================================

/**
 * Look up a book by ISBN. Tries multiple sources in order:
 * 1. Google Books (strict ISBN match) - best metadata & covers
 * 2. Open Library Books API - good for English/academic
 * 3. Open Library Search API - broader coverage
 * 4. BNF - Bibliothèque Nationale de France - excellent for French books
 * 5. Google Books broad search - last resort
 *
 * Also validates the ISBN check digit and provides helpful suggestions.
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

  const normalizedIsbn = normalizeIsbn(cleanIsbn)

  // Source 1: Google Books (strict ISBN match)
  let result = await lookupGoogleBooks(cleanIsbn)
  if (!result && normalizedIsbn !== cleanIsbn) {
    result = await lookupGoogleBooks(normalizedIsbn)
  }
  if (result) return { result }

  // Source 2: Open Library Books API
  result = await lookupOpenLibrary(cleanIsbn)
  if (!result && normalizedIsbn !== cleanIsbn) {
    result = await lookupOpenLibrary(normalizedIsbn)
  }
  if (result) return { result }

  // Source 3: Open Library Search API (broader)
  result = await lookupOpenLibrarySearch(cleanIsbn)
  if (!result && normalizedIsbn !== cleanIsbn) {
    result = await lookupOpenLibrarySearch(normalizedIsbn)
  }
  if (result) return { result }

  // Source 4: BNF - Bibliothèque Nationale de France
  result = await lookupBNF(cleanIsbn)
  if (result) return { result }

  // Source 5: Google Books broader search (last resort)
  result = await lookupGoogleBooksBroad(cleanIsbn)
  if (result) return { result }

  return { result: null }
}
