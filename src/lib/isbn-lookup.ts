// Shared ISBN lookup utility with multiple sources:
// 1. Google Books API (primary - best covers & metadata)
// 2. Open Library Books API (good for English/academic books)
// 3. Open Library Direct ISBN endpoint (finds books the Books API misses)
// 4. Open Library Search API (broader coverage)
// 5. BNF - Bibliothèque Nationale de France (excellent for French books)
// 6. Crossref API (excellent for English/academic/trade books)
// 7. Wikidata SPARQL (good for notable books)
// 8. Internet Archive (good for rare/older books, global coverage)
// 9. Google Books Enhanced Search (different query strategies)
// 10. Google Books broader search (fallback with less strict matching)
// 11. Web Search (z-ai-web-dev-sdk) - last resort, searches the entire web
//
// Strategy: Three-phase parallel lookup.
// Phase 1: Fast sources (Google Books + Open Library) - return immediately if cover found
// Phase 2: All remaining API sources in parallel - return best result
// Phase 3: Web search fallback (only if all APIs fail) - searches entire web
// Plus: Cross-source cover & metadata enrichment
// Each source uses fetch() with individual timeouts 

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

interface OLDirectBookData {
  title?: string
  authors?: Array<{ key?: string }>
  publishers?: string[]
  publish_date?: string
  number_of_pages?: number
  isbn_10?: string[]
  isbn_13?: string[]
  covers?: number[]
  languages?: Array<{ key?: string }>
  subjects?: Array<{ key?: string; name?: string }>
  description?: string | { value: string }
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

interface CrossrefWorkItem {
  title?: string[]
  author?: Array<{ given?: string; family?: string }>
  publisher?: string[]
  'published-print'?: { 'date-parts': number[][] }
  'published-online'?: { 'date-parts': number[][] }
  ISBN?: string[]
  subject?: string[]
  abstract?: string
  container_title?: string[]
  resource?: { primary?: { URL?: string } }
}

interface CrossrefResponse {
  status: string
  message?: {
    items?: CrossrefWorkItem[]
    'total-results'?: number
  }
}

interface IADoc {
  title?: string
  creator?: string
  publisher?: string[]
  date?: string
  language?: string | string[]
  description?: string | string[]
  identifier?: string
  isbn?: string[]
  coverImage?: string
}

interface IAResponse {
  responseHeader?: {
    status?: number
  }
  response?: {
    numFound?: number
    docs?: IADoc[]
  }
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

function isbn13To10(isbn13: string): string | null {
  // Only works for 978-prefix ISBNs
  if (!isbn13.startsWith('978') || isbn13.length !== 13) return null
  const core = isbn13.slice(3, 12)
  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += parseInt(core[i], 10) * (10 - i)
  }
  const remainder = sum % 11
  const checkChar = remainder === 0 ? '0' : remainder === 1 ? 'X' : (11 - remainder).toString()
  return core + checkChar
}

export function normalizeIsbn(isbn: string): string {
  const clean = isbn.replace(/[-\s]/g, '')
  if (clean.length === 10 && isValidIsbn10(clean)) {
    return isbn10To13(clean) || clean
  }
  return clean
}

/** Get both ISBN-10 and ISBN-13 variants for a given ISBN */
function getIsbnVariants(isbn: string): string[] {
  const normalized = normalizeIsbn(isbn)
  const variants = [normalized]
  const as10 = isbn13To10(normalized)
  if (as10) variants.push(as10)
  return Array.from(new Set(variants))
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

/** Infer language from ISBN prefix when no language metadata is available */
function inferLanguageFromIsbn(isbn: string): string {
  if (isbn.startsWith('9789961') || isbn.startsWith('9789954') ||
      isbn.startsWith('978977') || isbn.startsWith('9789948') ||
      isbn.startsWith('9789960') || isbn.startsWith('9789933') ||
      isbn.startsWith('978614') || isbn.startsWith('9789953') ||
      isbn.startsWith('9789947')) {
    return 'ar'
  }
  if (isbn.startsWith('9780') || isbn.startsWith('9781')) {
    return 'en'
  }
  // Default to French for 978-2 prefix and others
  return 'fr'
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
      
    )
    if (!response.ok) return null
    const data = await response.json()
    if (!data.items || data.items.length === 0) return null

    // Find the first result whose ISBN actually matches
    let matchedItem: { volumeInfo: GoogleBookVolumeInfo } | null = null
    for (const item of data.items) {
      if (isbnMatchesResult(item.volumeInfo, isbn)) {
        matchedItem = item
        break
      }
    }

    if (!matchedItem) return null

    const volumeInfo = matchedItem.volumeInfo
    return buildGoogleBooksResult(volumeInfo, isbn)
  } catch (error) {
    console.error('Google Books API error:', error)
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
// Source 2: Open Library Books API (exact ISBN lookup)
// ============================================================

async function lookupOpenLibrary(isbn: string): Promise<LookupResult | null> {
  try {
    const response = await fetch(
      `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`,
      
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
// Source 3: Open Library Direct ISBN endpoint
// Different from the Books API - the /isbn/{isbn}.json endpoint
// queries the edition directly. Often finds books the Books API misses.
// ============================================================

async function lookupOpenLibraryDirect(isbn: string): Promise<LookupResult | null> {
  try {
    const response = await fetch(
      `https://openlibrary.org/isbn/${isbn}.json`,
      
    )
    if (!response.ok) return null
    const bookData = await response.json()
    if (!bookData.title) return null

    const normalizedIsbn = normalizeIsbn(isbn)

    // Build cover URL from cover ID
    let coverUrl: string | null = null
    if (bookData.covers && bookData.covers.length > 0) {
      coverUrl = `https://covers.openlibrary.org/b/id/${bookData.covers[0]}-L.jpg`
    }

    // Get description
    let description: string | null = null
    if (bookData.description) {
      description = typeof bookData.description === 'string'
        ? bookData.description
        : bookData.description.value
    }

    // Resolve author name from first key with a fast fetch
    let author = ''
    if (bookData.authors && bookData.authors.length > 0) {
      const authorKey = bookData.authors[0]?.key
      if (authorKey) {
        try {
          const authorResponse = await fetch(
            `https://openlibrary.org${authorKey}.json`,
            
          )
          if (authorResponse.ok) {
            const authorData = await authorResponse.json()
            author = authorData.name || authorData.personal_name || ''
          }
        } catch {
          // Error - use key as fallback
          author = authorKey.split('/').pop() || ''
        }
      }
      // If multiple authors, append remaining keys
      if (bookData.authors.length > 1) {
        const extra = bookData.authors.slice(1).map(a => a.key?.split('/').pop() || '').filter(Boolean)
        if (extra.length > 0) {
          author = author ? `${author}, ${extra.join(', ')}` : extra.join(', ')
        }
      }
    }

    // Determine language
    let language = inferLanguageFromIsbn(normalizedIsbn)
    if (bookData.languages && bookData.languages.length > 0) {
      const langKey = bookData.languages[0].key || ''
      const langCode = langKey.split('/').pop() || ''
      language = normalizeLanguage(langCode)
    }

    // Get subjects/categories
    const categories = bookData.subjects
      ?.map(s => typeof s === 'string' ? s : (s.name || ''))
      .filter(Boolean) || []

    return {
      title: bookData.title || '',
      author,
      description,
      coverUrl,
      publisher: bookData.publishers?.[0] || null,
      pageCount: bookData.number_of_pages || null,
      language,
      publishDate: bookData.publish_date || null,
      isbn: normalizedIsbn,
      categories,
      suggestedCategorySlug: suggestCategory(language),
      source: 'openlibrary-direct',
    }
  } catch (error) {
    console.error('Open Library Direct ISBN error:', error)
    return null
  }
}

// ============================================================
// Source 4: Open Library Search API (broader coverage)
// Uses the search index which has more books.
// ============================================================

async function lookupOpenLibrarySearch(isbn: string): Promise<LookupResult | null> {
  try {
    const response = await fetch(
      `https://openlibrary.org/search.json?isbn=${isbn}&limit=5&fields=title,author_name,publisher,first_publish_year,isbn,cover_i,number_of_pages,language`,
      
    )
    if (!response.ok) return null
    const json = await response.json()
    const data = json as OLSearchResponse
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

    // If no exact ISBN match, take the first result
    if (!matchedDoc) {
      matchedDoc = data.docs[0]
    }

    const doc = matchedDoc!

    // Build cover URL from cover ID
    let coverUrl: string | null = null
    if (doc.cover_i) {
      coverUrl = `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`
    }

    // Determine language
    let language = inferLanguageFromIsbn(normalizedIsbn)
    if (doc.language && doc.language.length > 0) {
      language = normalizeLanguage(doc.language[0])
    }

    const authorName = Array.isArray(doc.author_name) ? doc.author_name.join(', ') : (doc.author_name || '')
    const publisher = Array.isArray(doc.publisher) ? doc.publisher[0] : (doc.publisher || null)
    const publishDate = doc.first_publish_year?.toString() || null

    return {
      title: doc.title || '',
      author: authorName,
      description: null,
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
// Source 5: BNF - Bibliothèque Nationale de France
// Excellent for French books. Uses the SRU API (free, no key needed).
// ============================================================

async function lookupBNF(isbn: string): Promise<LookupResult | null> {
  try {
    const normalizedIsbn = normalizeIsbn(isbn)
    const isbn10 = isbn13To10(normalizedIsbn)

    // Try both ISBN-13 and ISBN-10
    const isbnVariants = [normalizedIsbn]
    if (isbn10) isbnVariants.push(isbn10)

    for (const variant of isbnVariants) {
      const result = await lookupBNFByIsbn(variant, normalizedIsbn)
      if (result) return result
    }

    return null
  } catch (error) {
    console.error('BNF API error:', error)
    return null
  }
}

async function lookupBNFByIsbn(searchIsbn: string, normalizedIsbn: string): Promise<LookupResult | null> {
  // BNF SRU API - search by ISBN
  const response = await fetch(
    `https://catalogue.bnf.fr/api/SRU?version=1.2&operation=searchRetrieve&query=bib.isbn%20all%20%22${encodeURIComponent(searchIsbn)}%22&recordSchema=dublincore&maximumRecords=3`,
    
  )
  if (!response.ok) return null

  let xml = await response.text()

  // Check if we have results
  const recordMatch = xml.match(/(?:<[^>]*:?numberOfRecords>)(\d+)(?:<\/[^>]*:?numberOfRecords>)/)
  const hasResults = recordMatch ? parseInt(recordMatch[1]) > 0 : false

  if (!hasResults) {
    // Try full text search as fallback
    const ftResponse = await fetch(
      `https://catalogue.bnf.fr/api/SRU?version=1.2&operation=searchRetrieve&query=bib.anywhere%20all%20%22${encodeURIComponent(searchIsbn)}%22&recordSchema=dublincore&maximumRecords=3`,
      
    )
    if (ftResponse.ok) {
      xml = await ftResponse.text()
    } else {
      return null
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

  // Clean up author (BNF adds dates and roles)
  let author = creators.length > 0 ? creators[0] : ''
  author = author.replace(/\([^)]*\)\s*\.?\s*(Auteur|Autre|Éditeur|Traducteur|Directeur|Préfacier|Illustrateur|Compilateur|Commentaire)[^,]*/g, '').trim()
  author = author.replace(/\s*\.?\s*(Auteur du texte|Auteur|Autre|Éditeur|Traducteur|Directeur de publication|Préfacier|Illustrateur)[^,]*/g, '').trim()
  if (creators.length > 1) {
    author = creators.slice(0, 3).map(c =>
      c.replace(/\([^)]*\)\s*\.?\s*(Auteur|Autre|Éditeur|Traducteur|Directeur|Préfacier|Illustrateur|Compilateur|Commentaire)[^,]*/g, '').trim()
    ).filter(Boolean).join(', ')
  }

  // Determine language
  let language = inferLanguageFromIsbn(normalizedIsbn)
  if (languages.length > 0) {
    language = normalizeLanguage(languages[0])
  }

  // Extract page count from dc:format field
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
}

/**
 * Extract field values from XML response
 */
function extractXmlFields(xml: string, tagName: string): string[] {
  const results: string[] = []
  const regex = new RegExp(`<${tagName}[^>]*>([^<]+)</${tagName}>`, 'g')
  let match
  while ((match = regex.exec(xml)) !== null) {
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
// Source 6: Crossref API
// Free, no authentication needed. Excellent for English and
// academic/trade books. Covers many publishers globally.
// ============================================================

async function lookupCrossref(isbn: string): Promise<LookupResult | null> {
  try {
    const normalizedIsbn = normalizeIsbn(isbn)
    const isbn10 = isbn13To10(normalizedIsbn)

    const response = await fetch(
      `https://api.crossref.org/works?filter=isbn:${encodeURIComponent(normalizedIsbn)}&rows=3`,
      
    )
    if (!response.ok) return null
    const data = await response.json()
    if (!data.message?.items || data.message.items.length === 0) {
      // Try with ISBN-10 variant
      if (isbn10) {
        const response10 = await fetch(
          `https://api.crossref.org/works?filter=isbn:${encodeURIComponent(isbn10)}&rows=3`,
          
        )
        if (!response10.ok) return null
        const data10 = await response10.json()
        if (!data10.message?.items || data10.message.items.length === 0) return null
        return buildCrossrefResult(data10.message.items[0], normalizedIsbn)
      }
      return null
    }

    return buildCrossrefResult(data.message.items[0], normalizedIsbn)
  } catch (error) {
    console.error('Crossref API error:', error)
    return null
  }
}

function buildCrossrefResult(item: CrossrefWorkItem, normalizedIsbn: string): LookupResult {
  // Title is an array in Crossref
  const title = item.title?.[0] || ''

  // Author: combine given + family names
  const author = item.author
    ?.map(a => [a.given, a.family].filter(Boolean).join(' '))
    .join(', ') || ''

  // Publisher
  const publisher = item.publisher?.[0] || null

  // Date
  let publishDate: string | null = null
  const dateParts = item['published-print']?.['date-parts']?.[0] ||
                    item['published-online']?.['date-parts']?.[0]
  if (dateParts) {
    publishDate = dateParts.join('-') // e.g., "2017-5-12" or "2017"
  }

  // Language from ISBN prefix
  const language = inferLanguageFromIsbn(normalizedIsbn)

  // Subjects
  const categories = item.subject || []

  // Description - Crossref sometimes has abstract
  let description: string | null = null
  if (item.abstract) {
    // Strip HTML tags from abstract
    description = item.abstract.replace(/<[^>]+>/g, '').trim()
  }

  return {
    title,
    author,
    description,
    coverUrl: null, // Crossref doesn't provide cover images
    publisher,
    pageCount: null,
    language,
    publishDate,
    isbn: normalizedIsbn,
    categories,
    suggestedCategorySlug: suggestCategory(language),
    source: 'crossref',
  }
}

// ============================================================
// Source 7: Wikidata SPARQL
// Free, no auth. Good for notable/published books.
// Can find books that commercial APIs miss, especially
// translated editions and non-English works.
// ============================================================

interface WikidataSparqlResult {
  results?: {
    bindings?: Array<Record<string, { value?: string }>>
  }
}

async function lookupWikidata(isbn: string): Promise<LookupResult | null> {
  try {
    const normalizedIsbn = normalizeIsbn(isbn)
    const isbn10 = isbn13To10(normalizedIsbn)

    // Try with ISBN-13 first, then ISBN-10
    for (const variant of [normalizedIsbn, isbn10].filter(Boolean) as string[]) {
      const result = await lookupWikidataByIsbn(variant, normalizedIsbn)
      if (result) return result
    }

    return null
  } catch (error) {
    console.error('Wikidata SPARQL error:', error)
    return null
  }
}

async function lookupWikidataByIsbn(searchIsbn: string, normalizedIsbn: string): Promise<LookupResult | null> {
  // Wikidata stores ISBNs both with and without hyphens
  // Try the exact number first
  const sparqlQuery = `
    SELECT ?item ?itemLabel ?itemDescription ?authorLabel ?publisherLabel ?publicationDate ?image WHERE {
      ?item wdt:P212 "${searchIsbn}" .
      OPTIONAL { ?item wdt:P50 ?author . }
      OPTIONAL { ?item wdt:P123 ?publisher . }
      OPTIONAL { ?item wdt:P577 ?publicationDate . }
      OPTIONAL { ?item wdt:P18 ?image . }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "fr,en,ar,es,de" . }
    }
    LIMIT 1
  `.trim()

  const response = await fetch(
    `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(sparqlQuery)}`,
    
  )
  if (!response.ok) return null
  const data = await response.json()
  const bindings = data.results?.bindings
  if (!bindings || bindings.length === 0) {
    // Also try P957 (ISBN-10 property)
    const sparqlQuery10 = `
      SELECT ?item ?itemLabel ?itemDescription ?authorLabel ?publisherLabel ?publicationDate ?image WHERE {
        ?item wdt:P957 "${searchIsbn}" .
        OPTIONAL { ?item wdt:P50 ?author . }
        OPTIONAL { ?item wdt:P123 ?publisher . }
        OPTIONAL { ?item wdt:P577 ?publicationDate . }
        OPTIONAL { ?item wdt:P18 ?image . }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "fr,en,ar,es,de" . }
      }
      LIMIT 1
    `.trim()

    const response10 = await fetch(
      `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(sparqlQuery10)}`,
      
    )
    if (!response10.ok) return null
    const data10 = await response10.json()
    const bindings10 = data10.results?.bindings
    if (!bindings10 || bindings10.length === 0) return null

    return buildWikidataResult(bindings10[0], normalizedIsbn)
  }

  return buildWikidataResult(bindings[0], normalizedIsbn)
}

function buildWikidataResult(binding: Record<string, { value?: string }>, normalizedIsbn: string): LookupResult {
  const title = binding.itemLabel?.value || ''
  const author = binding.authorLabel?.value || ''
  const publisher = binding.publisherLabel?.value || null
  const description = binding.itemDescription?.value || null

  // Parse publication date (format: "2023-01-15T00:00:00Z")
  let publishDate: string | null = null
  if (binding.publicationDate?.value) {
    const dateStr = binding.publicationDate.value
    const dateMatch = dateStr.match(/^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?/)
    if (dateMatch) {
      publishDate = [dateMatch[1], dateMatch[2], dateMatch[3]].filter(Boolean).join('-')
    }
  }

  // Cover image from Wikidata Commons
  let coverUrl: string | null = null
  if (binding.image?.value) {
    // Wikidata image URLs are Commons filenames, convert to direct URL
    const imageName = binding.image.value.replace('http://commons.wikimedia.org/wiki/Special:FilePath/', '')
    if (imageName) {
      coverUrl = `https://commons.wikimedia.org/w/index.php?title=Special:Redirect/file/${encodeURIComponent(imageName)}&width=400`
    }
  }

  const language = inferLanguageFromIsbn(normalizedIsbn)

  return {
    title,
    author,
    description,
    coverUrl,
    publisher,
    pageCount: null,
    language,
    publishDate,
    isbn: normalizedIsbn,
    categories: [],
    suggestedCategorySlug: suggestCategory(language),
    source: 'wikidata',
  }
}

// ============================================================
// Source 8: Google Books broader search (fallback)
// Less reliable but can find books not indexed by ISBN.
// ============================================================

async function lookupGoogleBooksBroad(isbn: string): Promise<LookupResult | null> {
  try {
    const response = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(isbn)}&maxResults=5`,
      
    )
    if (!response.ok) return null
    const data = await response.json()
    if (!data.items || data.items.length === 0) return null

    const normalizedIsbn = normalizeIsbn(isbn)

    for (const item of data.items) {
      const volumeInfo = item.volumeInfo

      // Check if there's an exact ISBN match
      if (volumeInfo.industryIdentifiers) {
        for (const id of volumeInfo.industryIdentifiers) {
          const idValue = id.identifier.replace(/[-\s]/g, '')
          if (idValue === isbn || idValue === normalizedIsbn) {
            return buildGoogleBooksResult(volumeInfo, isbn)
          }
          if (id.type === 'ISBN_10' && idValue.length === 10) {
            const as13 = isbn10To13(idValue)
            if (as13 === normalizedIsbn) {
              return buildGoogleBooksResult(volumeInfo, isbn)
            }
          }
        }
      }

      // Check if the ISBN appears in the title or description
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

// ============================================================
// Source 9: Internet Archive
// Free, no auth required. Good for rare and older books.
// Advanced Search API returns JSON.
// ============================================================

async function lookupInternetArchive(isbn: string): Promise<LookupResult | null> {
  try {
    const normalizedIsbn = normalizeIsbn(isbn)
    const isbn10 = isbn13To10(normalizedIsbn)

    // Try both ISBN-13 and ISBN-10
    for (const variant of [normalizedIsbn, isbn10].filter(Boolean) as string[]) {
      const result = await lookupIAByIsbn(variant, normalizedIsbn)
      if (result) return result
    }

    return null
  } catch (error) {
    console.error('Internet Archive API error:', error)
    return null
  }
}

// Internet Archive spam titles that are not real books
const IA_SPAM_PATTERNS = [
  'donation from better world books',
  'pallets from bwb',
  'donation from bwb',
  'better world books',
  'bwb donation',
  'bwb pallet',
]

async function lookupIAByIsbn(searchIsbn: string, normalizedIsbn: string): Promise<LookupResult | null> {
  const url = `https://archive.org/advancedsearch.php?q=isbn%3A${encodeURIComponent(searchIsbn)}&fl[]=title&fl[]=creator&fl[]=publisher&fl[]=date&fl[]=language&fl[]=description&fl[]=identifier&fl[]=coverImage&output=json&rows=10`

  const response = await fetch(url, {
    headers: { 'Accept': 'application/json' },
  })

  if (!response.ok) return null

  const data = await response.json() as IAResponse
  if (!data.response?.docs || data.response.docs.length === 0) return null

  // Filter out spam/non-book entries and find the first real book
  const doc = data.response.docs.find(d => {
    if (!d.title) return false
    const lowerTitle = d.title.toLowerCase()
    // Skip spam entries
    if (IA_SPAM_PATTERNS.some(pattern => lowerTitle.includes(pattern))) return false
    // Skip entries with no useful metadata at all
    if (!d.creator && !d.publisher && !d.date) return false
    return true
  }) || data.response.docs.find(d => d.title && !IA_SPAM_PATTERNS.some(p => d.title!.toLowerCase().includes(p)))

  if (!doc || !doc.title) return null

  // Build cover URL from Internet Archive identifier
  let coverUrl: string | null = null
  if (doc.identifier) {
    coverUrl = `https://archive.org/services/img/${doc.identifier}`
  }

  // Description can be an array
  let description: string | null = null
  if (doc.description) {
    description = Array.isArray(doc.description) ? doc.description[0] : doc.description
    // Strip HTML tags from description
    if (description) description = description.replace(/<[^>]+>/g, '').trim()
  }

  // Language can be an array
  let language = inferLanguageFromIsbn(normalizedIsbn)
  if (doc.language) {
    const langCode = Array.isArray(doc.language) ? doc.language[0] : doc.language
    language = normalizeLanguage(langCode)
  }

  // Publisher can be an array
  const publisher = Array.isArray(doc.publisher) ? doc.publisher[0] : (doc.publisher || null)

  return {
    title: doc.title,
    author: doc.creator || '',
    description,
    coverUrl,
    publisher,
    pageCount: null,
    language,
    publishDate: doc.date || null,
    isbn: normalizedIsbn,
    categories: [],
    suggestedCategorySlug: suggestCategory(language),
    source: 'internet-archive',
  }
}

// ============================================================
// Source 10: Google Books Enhanced Search
// Tries different query strategies to find books that the
// standard isbn: query misses. Some books have the ISBN in
// their metadata but aren't indexed by the isbn: search operator.
// ============================================================

async function lookupGoogleBooksEnhanced(isbn: string): Promise<LookupResult | null> {
  try {
    const normalizedIsbn = normalizeIsbn(isbn)
    const isbn10 = isbn13To10(normalizedIsbn)
    const variants = [normalizedIsbn, isbn10].filter(Boolean) as string[]

    // Strategy 1: Search with "ISBN" prefix (matches books where ISBN is in description)
    for (const variant of variants) {
      const result = await lookupGBEnhancedQuery(`ISBN+${variant}`, normalizedIsbn)
      if (result) return result
    }

    // Strategy 2: Search with hyphenated ISBN format
    for (const variant of variants) {
      const hyphenated = hyphenateIsbn(variant)
      if (hyphenated !== variant) {
        const result = await lookupGBEnhancedQuery(hyphenated, normalizedIsbn)
        if (result) return result
      }
    }

    // Strategy 3: Search by the raw ISBN number (matches title/description)
    for (const variant of variants) {
      const result = await lookupGBEnhancedQuery(variant, normalizedIsbn)
      if (result) return result
    }

    return null
  } catch (error) {
    console.error('Google Books Enhanced error:', error)
    return null
  }
}

async function lookupGBEnhancedQuery(query: string, normalizedIsbn: string): Promise<LookupResult | null> {
  const response = await fetch(
    `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=5`,
  )
  if (!response.ok) return null
  const data = await response.json()
  if (!data.items || data.items.length === 0) return null

  for (const item of data.items) {
    const volumeInfo = item.volumeInfo

    // Verify the result actually matches our ISBN
    if (volumeInfo.industryIdentifiers) {
      for (const id of volumeInfo.industryIdentifiers) {
        const idValue = id.identifier.replace(/[-\s]/g, '')
        if (idValue === normalizedIsbn) {
          return buildGoogleBooksResult(volumeInfo, normalizedIsbn)
        }
        if (id.type === 'ISBN_10' && idValue.length === 10) {
          const as13 = isbn10To13(idValue)
          if (as13 === normalizedIsbn) {
            return buildGoogleBooksResult(volumeInfo, normalizedIsbn)
          }
        }
      }
    }
  }

  return null
}

/** Add standard ISBN hyphens for display/search purposes */
function hyphenateIsbn(isbn: string): string {
  if (isbn.length === 13) {
    // EAN-13 hyphenation: 978-X-XXXX-XXXX-X
    return `${isbn.slice(0, 3)}-${isbn.slice(3, 4)}-${isbn.slice(4, 8)}-${isbn.slice(8, 12)}-${isbn.slice(12)}`
  }
  if (isbn.length === 10) {
    // ISBN-10 hyphenation: X-XXXX-XXXX-X
    return `${isbn.slice(0, 1)}-${isbn.slice(1, 5)}-${isbn.slice(5, 9)}-${isbn.slice(9)}`
  }
  return isbn
}

// ============================================================
// Source 11: Web Search (z-ai-web-dev-sdk)
// Last resort: search the entire web for the ISBN.
// Can find books from retailer sites, publisher pages, blogs, etc.
// Uses AI to extract structured book data from search results.
// ============================================================

async function lookupWebSearch(isbn: string): Promise<LookupResult | null> {
  try {
    const normalizedIsbn = normalizeIsbn(isbn)
    const isbn10 = isbn13To10(normalizedIsbn)

    // Dynamic import to avoid issues if SDK is not available
    let ZAI: any
    try {
      const mod = await import('z-ai-web-dev-sdk')
      ZAI = mod.default || mod
    } catch (importErr) {
      console.error('[ISBN Lookup] z-ai-web-dev-sdk import failed:', (importErr as Error)?.message)
      return null
    }

    const zai = await ZAI.create()

    // Infer language from ISBN to craft better search queries
    const inferredLang = inferLanguageFromIsbn(normalizedIsbn)
    const langKeywords: Record<string, string> = {
      'fr': 'livre auteur éditeur',
      'en': 'book author publisher',
      'ar': 'كتاب مؤلف ناشر',
    }
    const keyword = langKeywords[inferredLang] || 'book'

    // Try multiple search queries
    const queries = [
      `"${normalizedIsbn}" ${keyword}`,
      isbn10 ? `"${isbn10}" ${keyword}` : null,
      `${normalizedIsbn} ${keyword}`,
    ].filter(Boolean) as string[]

    // Generic ISBN lookup sites to filter out (they don't contain book metadata)
    const spamHosts = [
      'isbnsearch.org', 'isbndb.com', 'isbn.nu', 'bookfinder.com',
      'chasse-aux-livres.fr', 'booktrapper.com', 'isbnsearch.com',
      'openisbn.com', 'isbnexplorer.com', 'findbooksearch.com',
    ]

    let bestSnippets = ''
    let searchWorked = false

    for (const query of queries) {
      try {
        const searchResults = await zai.functions.invoke('web_search', {
          query,
          num: 10,
        })

        if (!searchResults || !Array.isArray(searchResults) || searchResults.length === 0) continue

        // Filter out generic ISBN lookup sites and collect meaningful snippets
        const snippets = searchResults
          .filter((r: { host_name?: string }) => {
            const host = (r.host_name || '').toLowerCase()
            return !spamHosts.some(spam => host.includes(spam))
          })
          .map((r: { name?: string; snippet?: string; url?: string }) => {
            const parts: string[] = []
            if (r.name) parts.push(r.name)
            if (r.snippet) parts.push(r.snippet)
            if (r.url) parts.push(`(source: ${r.url})`)
            return parts.join(' | ')
          })
          .filter((s: string) => s.length > 20)

        if (snippets.length > 0) {
          const combined = snippets.join('\n')
          // Prefer search results that actually mention the ISBN
          if (combined.toLowerCase().includes(normalizedIsbn) ||
              (isbn10 && combined.includes(isbn10))) {
            bestSnippets = combined
            searchWorked = true
            break // Found good results, stop searching
          }
          // Otherwise keep the longest snippet set
          if (combined.length > bestSnippets.length) {
            bestSnippets = combined
          }
        }
      } catch (searchErr) {
        console.error('[ISBN Lookup] Web search query failed:', (searchErr as Error)?.message)
      }
    }

    if (!bestSnippets || bestSnippets.length < 30) {
      console.log(`[ISBN Lookup] Web search: no meaningful results found`)
      return null
    }

    console.log(`[ISBN Lookup] Web search: found ${bestSnippets.length} chars of snippets`)

    // Use AI to extract structured book data from search results
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are a book metadata extractor. Given web search results for a book identified by ISBN "${normalizedIsbn}", extract the book's metadata. Return ONLY a JSON object with these fields (use null for unknown fields):
- "title": string (book title)
- "author": string (author name(s))
- "publisher": string or null
- "description": string or null (brief description, max 300 chars)
- "language": "fr"|"en"|"ar" or null
- "publishDate": string or null (YYYY or YYYY-MM-DD)
- "pageCount": number or null

Important rules:
- Return ONLY the JSON object, no markdown fences, no explanation
- If you cannot confidently identify the SPECIFIC book for this ISBN, return {"title": null}
- Do NOT guess - only extract information that is clearly present in the search results
- The ISBN is ${normalizedIsbn}, make sure the extracted data is for THIS specific ISBN`,
        },
        {
          role: 'user',
          content: `Web search results for ISBN ${normalizedIsbn}:\n\n${bestSnippets}`,
        },
      ],
      temperature: 0,
      max_tokens: 500,
    })

    const content = completion.choices?.[0]?.message?.content?.trim()
    if (!content) return null

    // Parse the AI response as JSON
    let bookData: Record<string, unknown>
    try {
      // Strip markdown code block if present
      const jsonStr = content.replace(/^```json?\s*/, '').replace(/\s*```$/, '')
      bookData = JSON.parse(jsonStr)
    } catch {
      console.error('[ISBN Lookup] Web search: AI response not valid JSON:', content.substring(0, 200))
      return null
    }

    if (!bookData.title || typeof bookData.title !== 'string') {
      console.log(`[ISBN Lookup] Web search: AI could not identify the book`)
      return null
    }

    const language = normalizeLanguage(bookData.language as string) || inferLanguageFromIsbn(normalizedIsbn)

    return {
      title: bookData.title as string,
      author: (bookData.author as string) || '',
      description: (bookData.description as string) || null,
      coverUrl: null, // Web search can't reliably provide cover URLs
      publisher: (bookData.publisher as string) || null,
      pageCount: (bookData.pageCount as number) || null,
      language,
      publishDate: (bookData.publishDate as string) || null,
      isbn: normalizedIsbn,
      categories: [],
      suggestedCategorySlug: suggestCategory(language),
      source: 'web-search',
    }
  } catch (error) {
    console.error('Web Search fallback error:', error)
    return null
  }
}

// ============================================================
// Cover Enrichment: Try to find a cover when the main result
// has no cover URL. Uses Open Library Covers API and
// Google Books thumbnail as fallbacks.
// ============================================================

async function tryEnrichCover(result: LookupResult, normalizedIsbn: string): Promise<LookupResult> {
  if (result.coverUrl) return result

  const isbn10 = isbn13To10(normalizedIsbn)

  // 1. Try Open Library Covers API (HEAD request to check if cover exists)
  for (const variant of [normalizedIsbn, isbn10].filter(Boolean) as string[]) {
    try {
      const coverResp = await fetch(
        `https://covers.openlibrary.org/b/isbn/${variant}-L.jpg?default=false`,
        { method: 'HEAD', redirect: 'manual' }
      )
      // Open Library Covers API returns 302 redirect if cover exists, 404 if not
      if (coverResp.status === 302 || coverResp.status === 200) {
        const location = coverResp.headers.get('location')
        if (location) {
          return { ...result, coverUrl: location.startsWith('http') ? location.replace('http://', 'https://') : `https://covers.openlibrary.org${location}` }
        }
      }
    } catch {
      // Ignore errors in cover enrichment
    }
  }

  // 2. Try Google Books thumbnail by ISBN
  try {
    const gbResponse = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=isbn:${normalizedIsbn}&fields=items(volumeInfo(imageLinks(thumbnail)))`,
    )
    if (gbResponse.ok) {
      const gbData = await gbResponse.json()
      const thumbnail = gbData.items?.[0]?.volumeInfo?.imageLinks?.thumbnail
      if (thumbnail) {
        return { ...result, coverUrl: thumbnail.replace('http://', 'https://').replace('&edge=curl', '') }
      }
    }
  } catch {
    // Ignore errors in cover enrichment
  }

  return result
}

// ============================================================
// Metadata Enrichment: Fill missing fields from other sources
// ============================================================

function enrichResult(base: LookupResult, others: LookupResult[]): LookupResult {
  let enriched = { ...base }

  // Fill missing cover from other sources
  if (!enriched.coverUrl) {
    const withCover = others.find(r => r.coverUrl)
    if (withCover) enriched.coverUrl = withCover.coverUrl
  }

  // Fill missing description from other sources
  if (!enriched.description) {
    const withDesc = others.find(r => r.description && r.description.length > 20)
    if (withDesc) enriched.description = withDesc.description
  }

  // Fill missing publisher from other sources
  if (!enriched.publisher) {
    const withPub = others.find(r => r.publisher)
    if (withPub) enriched.publisher = withPub.publisher
  }

  // Fill missing page count from other sources
  if (!enriched.pageCount) {
    const withPages = others.find(r => r.pageCount)
    if (withPages) enriched.pageCount = withPages.pageCount
  }

  // Fill missing publish date from other sources
  if (!enriched.publishDate) {
    const withDate = others.find(r => r.publishDate)
    if (withDate) enriched.publishDate = withDate.publishDate
  }

  // Fill missing categories from other sources
  if (enriched.categories.length === 0) {
    const withCats = others.find(r => r.categories && r.categories.length > 0)
    if (withCats) enriched.categories = withCats.categories
  }

  return enriched
}

// ============================================================
// Helper: Try a lookup function with both ISBN-10 and ISBN-13
// ============================================================

async function tryWithVariants(
  isbn: string,
  fn: (isbn: string) => Promise<LookupResult | null>
): Promise<LookupResult | null> {
  // Try with original ISBN
  let result = await fn(isbn)
  if (result) return result

  // Try with alternate variant
  const normalized = normalizeIsbn(isbn)
  if (normalized !== isbn) {
    result = await fn(normalized)
    if (result) return result
  }

  // Try ISBN-10 variant if we have ISBN-13
  if (normalized.length === 13) {
    const as10 = isbn13To10(normalized)
    if (as10) {
      result = await fn(as10)
      if (result) return result
    }
  }

  return null
}

// ============================================================
// Result quality scoring (prefer results with covers & descriptions)
// ============================================================

function resultScore(result: LookupResult): number {
  let score = 0
  if (result.coverUrl) score += 10 // Covers are very important for a bookstore
  if (result.description) score += 3
  if (result.author) score += 2
  if (result.publisher) score += 1
  if (result.pageCount) score += 1
  if (result.publishDate) score += 1

  // Prefer certain sources for better metadata quality
  const sourceBonus: Record<string, number> = {
    'google': 5,
    'openlibrary': 4,
    'openlibrary-direct': 3,
    'openlibrary-search': 2,
    'crossref': 2,
    'bnf': 2,
    'wikidata': 1,
    'internet-archive': 1,
    'google-enhanced': 1,
    'web-search': 0,
    'google-broad': 0,
  }
  score += sourceBonus[result.source] || 0

  return score
}

// ============================================================
// Main Lookup Function - cascading through all sources
// ============================================================

/**
 * Look up a book by ISBN. Uses a two-phase parallel strategy:
 *
 * Phase 1 (Fast): Google Books + Open Library in parallel
 *   - If a result with a cover is found, return immediately (fast path)
 *
 * Phase 2 (Comprehensive): All remaining sources in parallel
 *   - BNF, Crossref, Wikidata, Internet Archive, OCLC Classify
 *   - Best result selected by quality score
 *
 * After both phases: Cross-source metadata enrichment + cover enrichment
 * from Open Library Covers API / Google Books if no cover found.
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
  const isbn10 = isbn13To10(normalizedIsbn)

  console.log(`[ISBN Lookup] Starting two-phase parallel lookup for ${normalizedIsbn}`)

  // ============================================================
  // Phase 1: Fast sources (typically respond in < 2 seconds)
  // Google Books + Open Library - best quality with covers
  // ============================================================

  const phase1Sources: Array<{ name: string; fn: () => Promise<LookupResult | null> }> = [
    { name: 'google-13', fn: () => lookupGoogleBooks(normalizedIsbn) },
    { name: 'google-10', fn: () => isbn10 ? lookupGoogleBooks(isbn10) : Promise.resolve(null) },
    { name: 'openlibrary-13', fn: () => lookupOpenLibrary(normalizedIsbn) },
    { name: 'openlibrary-10', fn: () => isbn10 ? lookupOpenLibrary(isbn10) : Promise.resolve(null) },
  ]

  const phase1Results = await Promise.allSettled(
    phase1Sources.map(async ({ name, fn }) => {
      try {
        const result = await fn()
        if (result) console.log(`[ISBN Lookup] Phase 1 ✓ Found by ${name}`)
        return result
      } catch (e) {
        console.error(`[ISBN Lookup] Phase 1 ✗ ${name} error:`, (e as Error)?.message)
        return null
      }
    })
  )

  const phase1Valid: LookupResult[] = phase1Results
    .filter((r): r is PromiseFulfilledResult<LookupResult | null> => r.status === 'fulfilled' && r.value !== null)
    .map(r => r.value!)

  // Fast path: if Phase 1 found a result WITH a cover, return immediately
  if (phase1Valid.length > 0) {
    const bestWithCover = phase1Valid
      .filter(r => r.coverUrl)
      .sort((a, b) => resultScore(b) - resultScore(a))[0]

    if (bestWithCover) {
      console.log(`[ISBN Lookup] Fast return from ${bestWithCover.source} (score: ${resultScore(bestWithCover)})`)
      return { result: bestWithCover }
    }
  }

  // ============================================================
  // Phase 2: Comprehensive sources (may be slower but broader coverage)
  // BNF, Crossref, Wikidata, Internet Archive, OCLC Classify, Google Broad
  // ============================================================

  const phase2Sources: Array<{ name: string; fn: () => Promise<LookupResult | null> }> = [
    { name: 'openlibrary-direct', fn: () => lookupOpenLibraryDirect(normalizedIsbn) },
    { name: 'openlibrary-search', fn: () => lookupOpenLibrarySearch(normalizedIsbn) },
    { name: 'bnf', fn: () => lookupBNF(normalizedIsbn) },
    { name: 'crossref', fn: () => lookupCrossref(normalizedIsbn) },
    { name: 'internet-archive', fn: () => lookupInternetArchive(normalizedIsbn) },
    { name: 'google-enhanced', fn: () => lookupGoogleBooksEnhanced(normalizedIsbn) },
    { name: 'openlibrary-direct-10', fn: () => isbn10 ? lookupOpenLibraryDirect(isbn10) : Promise.resolve(null) },
    { name: 'openlibrary-search-10', fn: () => isbn10 ? lookupOpenLibrarySearch(isbn10) : Promise.resolve(null) },
    { name: 'wikidata', fn: () => lookupWikidata(normalizedIsbn) },
    { name: 'google-broad', fn: () => lookupGoogleBooksBroad(normalizedIsbn) },
  ]

  const SOURCE_TIMEOUT = 10000 // 10 seconds per source

  const phase2Results = await Promise.allSettled(
    phase2Sources.map(async ({ name, fn }) => {
      try {
        const result = await Promise.race([
          fn(),
          new Promise<null>(resolve => setTimeout(() => resolve(null), SOURCE_TIMEOUT))
        ])
        if (result) console.log(`[ISBN Lookup] Phase 2 ✓ Found by ${name}`)
        return result
      } catch (e) {
        console.error(`[ISBN Lookup] Phase 2 ✗ ${name} error:`, (e as Error)?.message)
        return null
      }
    })
  )

  const phase2Valid: LookupResult[] = phase2Results
    .filter((r): r is PromiseFulfilledResult<LookupResult | null> => r.status === 'fulfilled' && r.value !== null)
    .map(r => r.value!)

  // Combine all results from both phases
  const allResults = [...phase1Valid, ...phase2Valid]

  console.log(`[ISBN Lookup] Total: ${allResults.length} results from ${phase1Sources.length + phase2Sources.length} sources`)

  if (allResults.length === 0) {
    // ============================================================
    // Phase 3: Web Search Fallback (only if all APIs failed)
    // Uses z-ai-web-dev-sdk to search the entire web
    // ============================================================

    console.log(`[ISBN Lookup] All APIs failed, trying web search fallback...`)

    try {
      const webResult = await Promise.race([
        lookupWebSearch(normalizedIsbn),
        new Promise<null>(resolve => setTimeout(() => resolve(null), 15000))
      ])

      if (webResult) {
        console.log(`[ISBN Lookup] Phase 3 ✓ Found by web-search`)
        // Try to enrich cover for web search results
        const enriched = await tryEnrichCover(webResult, normalizedIsbn)
        console.log(`[ISBN Lookup] Best result from ${enriched.source} (score: ${resultScore(enriched)}, cover: ${enriched.coverUrl ? 'yes' : 'no'})`)
        return { result: enriched }
      }
    } catch (e) {
      console.error('[ISBN Lookup] Phase 3 web-search error:', (e as Error)?.message)
    }

    return { result: null }
  }

  // Sort by quality score (best first)
  allResults.sort((a, b) => resultScore(b) - resultScore(a))

  // Start with the best result
  let bestResult = allResults[0]

  // Cross-source enrichment: fill missing fields from other sources
  const otherResults = allResults.filter(r => r.source !== bestResult.source)
  bestResult = enrichResult(bestResult, otherResults)

  // Cover enrichment: if still no cover, try dedicated cover APIs
  if (!bestResult.coverUrl) {
    bestResult = await tryEnrichCover(bestResult, normalizedIsbn)
    if (bestResult.coverUrl) {
      console.log(`[ISBN Lookup] Cover enriched from cover API`)
    }
  }

  console.log(`[ISBN Lookup] Best result from ${bestResult.source} (score: ${resultScore(bestResult)}, cover: ${bestResult.coverUrl ? 'yes' : 'no'})`)

  return { result: bestResult }
}
