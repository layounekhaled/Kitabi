// Shared ISBN lookup utility with multiple sources:
// 1. Google Books API (primary - best covers & metadata)
// 2. Open Library Books API (good for English/academic books)
// 3. Open Library Direct ISBN endpoint (finds books the Books API misses)
// 4. Open Library Search API (broader coverage)
// 5. BNF - Bibliothèque Nationale de France (excellent for French books)
// 6. Crossref API (excellent for English/academic/trade books)
// 7. Wikidata SPARQL (good for notable books)
// 8. Google Books broader search (fallback with less strict matching)
//
// Strategy: Sequential cascade through all sources.
// Each source uses fetch() 

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
    'google-broad': 0,
  }
  score += sourceBonus[result.source] || 0

  return score
}

// ============================================================
// Main Lookup Function - cascading through all sources
// ============================================================

/**
 * Look up a book by ISBN. Uses a sequential cascade through 8 sources:
 *
 * 1. Google Books (ISBN-13) - best covers & metadata
 * 2. Google Books (ISBN-10) - alternate variant
 * 3. Open Library Books (ISBN-13) - good covers
 * 4. Open Library Books (ISBN-10) - alternate variant
 * 5. Open Library Direct (ISBN-13) - finds books the Books API misses
 * 6. Open Library Search - broader OL search
 * 7. BNF - French national library (excellent for French books)
 * 8. Crossref - English/academic/trade books
 * 9. Wikidata - notable books
 *
 * Each source is wrapped in its own try/catch. First non-null result is returned.
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

  // ============================================================
  // Sequential cascade through all sources
  // ============================================================

  console.log(`[ISBN Lookup] Starting lookup for ${normalizedIsbn}`)

  let result: LookupResult | null = null

  // 1. Google Books (ISBN-13) - best quality overall
  try {
    result = await lookupGoogleBooks(normalizedIsbn)
    if (result) return { result }
  } catch (e) { console.error('[ISBN] google-13 error:', (e as Error)?.message) }

  // 2. Google Books (ISBN-10) - some books only indexed by ISBN-10
  if (isbn10) {
    try {
      result = await lookupGoogleBooks(isbn10)
      if (result) return { result }
    } catch (e) { console.error('[ISBN] google-10 error:', (e as Error)?.message) }
  }

  // 3. Open Library Books API (ISBN-13)
  try {
    result = await lookupOpenLibrary(normalizedIsbn)
    if (result) return { result }
  } catch (e) { console.error('[ISBN] openlibrary-13 error:', (e as Error)?.message) }

  // 4. Open Library Books API (ISBN-10)
  if (isbn10) {
    try {
      result = await lookupOpenLibrary(isbn10)
      if (result) return { result }
    } catch (e) { console.error('[ISBN] openlibrary-10 error:', (e as Error)?.message) }
  }

  // 5. Open Library Direct ISBN endpoint
  try {
    result = await lookupOpenLibraryDirect(normalizedIsbn)
    if (result) return { result }
  } catch (e) { console.error('[ISBN] ol-direct error:', (e as Error)?.message) }

  // 6. Open Library Search API (broader coverage)
  try {
    result = await lookupOpenLibrarySearch(normalizedIsbn)
    if (result) return { result }
  } catch (e) { console.error('[ISBN] ol-search error:', (e as Error)?.message) }

  // 7. BNF - Bibliothèque Nationale de France (French books)
  try {
    result = await lookupBNF(normalizedIsbn)
    if (result) return { result }
  } catch (e) { console.error('[ISBN] bnf error:', (e as Error)?.message) }

  // 8. Crossref API (English/academic/trade books)
  try {
    result = await lookupCrossref(normalizedIsbn)
    if (result) return { result }
  } catch (e) { console.error('[ISBN] crossref error:', (e as Error)?.message) }

  // 9. Wikidata SPARQL (notable books)
  try {
    result = await lookupWikidata(normalizedIsbn)
    if (result) return { result }
  } catch (e) { console.error('[ISBN] wikidata error:', (e as Error)?.message) }

  return { result: null }
}
