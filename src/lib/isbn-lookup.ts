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
// 11. WorldCat Classify API (OCLC - world's largest library catalog)
// 12. DNB SRU API (Deutsche Nationalbibliothek - good international coverage)
// 13. SUDOC (French university library catalog - excellent for French books)
// 14. Inventaire.io (open-source book database, good for French books)
// 15. HathiTrust API (digital library, excellent for academic/Arabic books)
// 16. LibraryThing API (excellent coverage of books in all languages)
// 17. Google Books Arabic Query (broader search for Arabic ISBNs)
// 18. Open Library Title Search Fallback (cover enrichment by title)
// 19. Web Search (z-ai-web-dev-sdk) - last resort, searches the entire web
// 20. Noor Library (Arabic digital library)
// 21. Jarir (Arabic book retailer)
// 22. Neel wa Furat (Arabic book retailer)
// 23. Hindawi (Arabic digital publishing platform)
// 24. Decitre (French book retailer)
// 25. FNAC (French retailer)
//
// Strategy: Three-phase parallel lookup.
// Phase 1: Fast sources (Google Books + Open Library) - return immediately if cover found
// Phase 2: All remaining API sources in parallel - return best result
// Phase 3: Web search fallback (only if all APIs fail) - searches entire web
// Plus: Cross-source cover & metadata enrichment, description quality validation
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
  genre: string | null
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

export function classifyGenre(categories: string[]): string | null {
  if (!categories || categories.length === 0) return null
  const allText = categories.join(' ').toLowerCase()

  // Check each genre mapping
  const genreMappings: Array<{ slug: string; keywords: string[] }> = [
    { slug: 'roman', keywords: ['fiction', 'novel', 'roman', 'romans', 'رواية', 'روايات', 'contes', 'nouvelles', 'récits', 'literary fiction', 'thriller', 'policier', 'mystery', 'suspense', 'fantasy', 'science fiction', 'science-fiction', 'aventure', 'adventure', 'romance', 'amour', 'drame', 'drama', 'comedie', 'humour', 'satire', 'parodie'] },
    { slug: 'histoire', keywords: ['history', 'histoire', 'تاريخ', 'historical', 'antiquité', 'moyen âge', 'guerre', 'war'] },
    { slug: 'sciences', keywords: ['science', 'sciences', 'علوم', 'mathematics', 'mathématiques', 'physique', 'physics', 'chimie', 'chemistry', 'biologie', 'biology', 'nature', 'astronomy', 'astronomie', 'géologie', 'engineering', 'ingénierie'] },
    { slug: 'philosophie', keywords: ['philosophy', 'philosophie', 'فلسفة', 'philosophique', 'éthique', 'ethics', 'métaphysique', 'épistémologie'] },
    { slug: 'religion', keywords: ['religion', 'religions', 'دين', 'islam', 'christianity', 'christianisme', 'judaïsme', 'judaism', 'spirituality', 'spiritualité', 'torah', 'coran', 'quran', 'bible', 'fiqh', 'tafsir', 'hadith', 'sunnah'] },
    { slug: 'poesie', keywords: ['poetry', 'poésie', 'شعر', 'poèmes', 'poems', 'verse'] },
    { slug: 'enfants', keywords: ['children', 'jeunesse', 'أطفال', 'enfant', 'kids', 'young adult', 'adolescent', 'juvenile', 'picture book', 'livre enfant'] },
    { slug: 'biographie', keywords: ['biography', 'biographie', 'سيرة', 'autobiography', 'autobiographie', 'mémoires', 'memoirs', 'journal', 'diary'] },
    { slug: 'education', keywords: ['education', 'éducation', 'تعليم', 'pedagogy', 'pédagogie', 'teaching', 'enseignement', 'scolaire', 'school', 'universitaire', 'academic', 'étude', 'études'] },
    { slug: 'politique', keywords: ['politics', 'politique', 'سياسة', 'political science', 'sciences politiques', 'government', 'gouvernement', 'democracy', 'démocratie', 'diplomacy'] },
    { slug: 'art', keywords: ['art', 'arts', 'فن', 'music', 'musique', 'cinema', 'cinéma', 'théâtre', 'theater', 'photography', 'photographie', 'architecture', 'design', 'peinture', 'sculpture', 'dessin'] },
    { slug: 'economie', keywords: ['economics', 'économie', 'اقتصاد', 'business', 'finance', 'management', 'marketing', 'comptabilité', 'accounting', 'entrepreneuriat', 'commerce', 'trade', 'investissement'] },
    { slug: 'droit', keywords: ['law', 'droit', 'قانون', 'juridique', 'legal', 'justice', 'حقوق', 'legislation', 'réglementation'] },
    { slug: 'medecine', keywords: ['medicine', 'médecine', 'طب', 'health', 'santé', 'medical', 'pharmacology', 'pharmacologie', 'nursing', 'soins infirmiers', 'dentistry'] },
    { slug: 'psychologie', keywords: ['psychology', 'psychologie', 'علم نفس', 'psychiatric', 'psychiatrie', 'psychotherapy', 'psychanalyse', 'mental health', 'santé mentale'] },
    { slug: 'informatique', keywords: ['computers', 'informatique', 'حاسوب', 'computer science', 'programming', 'programmation', 'software', 'logiciel', 'internet', 'digital', 'numérique', 'algorithm', 'intelligence artificielle', 'artificial intelligence', 'data', 'machine learning', 'réseaux'] },
    { slug: 'sociologie', keywords: ['sociology', 'sociologie', 'علم اجتماع', 'anthropology', 'anthropologie', 'social', 'sociale', 'culture', 'cultural'] },
    { slug: 'lettres', keywords: ['literature', 'littérature', 'أدب', 'literary criticism', 'critique littéraire', 'essais', 'essays', 'linguistics', 'linguistique', 'langue', 'language', 'grammar', 'grammaire'] },
  ]

  for (const mapping of genreMappings) {
    for (const keyword of mapping.keywords) {
      if (allText.includes(keyword)) {
        return mapping.slug
      }
    }
  }

  return null
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
    genre: null,
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
    genre: null,
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
    genre: null,
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
    genre: null,
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
  const subjects = extractXmlFields(xml, 'dc:subject')

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

  // Filter subjects to exclude barcode/technical info and get meaningful categories
  const categories = subjects
    .filter(s => !s.includes('Code à barres') && !s.includes('EAN') && s.length > 2 && s.length < 100)
    .slice(0, 5)

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
    categories,
    suggestedCategorySlug: suggestCategory(language),
    genre: null,
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
    genre: null,
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
    SELECT ?item ?itemLabel ?itemDescription ?authorLabel ?publisherLabel ?publicationDate ?image ?genreLabel WHERE {
      ?item wdt:P212 "${searchIsbn}" .
      OPTIONAL { ?item wdt:P50 ?author . }
      OPTIONAL { ?item wdt:P123 ?publisher . }
      OPTIONAL { ?item wdt:P577 ?publicationDate . }
      OPTIONAL { ?item wdt:P18 ?image . }
      OPTIONAL { ?item wdt:P136 ?genre . }
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
      SELECT ?item ?itemLabel ?itemDescription ?authorLabel ?publisherLabel ?publicationDate ?image ?genreLabel WHERE {
        ?item wdt:P957 "${searchIsbn}" .
        OPTIONAL { ?item wdt:P50 ?author . }
        OPTIONAL { ?item wdt:P123 ?publisher . }
        OPTIONAL { ?item wdt:P577 ?publicationDate . }
        OPTIONAL { ?item wdt:P18 ?image . }
        OPTIONAL { ?item wdt:P136 ?genre . }
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

  // Extract genre/category from Wikidata
  const categories: string[] = []
  if (binding.genreLabel?.value) {
    categories.push(binding.genreLabel.value)
  }

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
    categories,
    suggestedCategorySlug: suggestCategory(language),
    genre: null,
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
    genre: null,
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
// Source 11: WorldCat Classify API (OCLC)
// World's largest library catalog. Free, no key needed for basic
// ISBN classification lookup. Excellent for books in all languages.
// ============================================================

interface WorldCatClassifyRecord {
  oclen?: string
  isbn?: string[]
  issn?: string[]
  title?: string
  author?: string
  publisher?: string
  date?: string
  language?: string
  edition?: string
  holdings?: string
  itemtype?: string
  dewey?: string[]
  lccn?: string[]
  lccallnumber?: string[]
  genre?: string[]
}

interface WorldCatClassifyResponse {
  classify?: {
    search?: {
      totalResults?: string
    }
    works?: Array<{
      title?: string
      author?: string
      owi?: string
      editions?: string
      holdings?: string
      genre?: string[]
    }>
    records?: WorldCatClassifyRecord[]
  }
}

async function lookupWorldCat(isbn: string): Promise<LookupResult | null> {
  try {
    const normalizedIsbn = normalizeIsbn(isbn)
    const isbn10 = isbn13To10(normalizedIsbn)

    // Try both ISBN-13 and ISBN-10
    for (const variant of [normalizedIsbn, isbn10].filter(Boolean) as string[]) {
      const result = await lookupWorldCatByIsbn(variant, normalizedIsbn)
      if (result) return result
    }

    return null
  } catch (error) {
    console.error('WorldCat Classify API error:', error)
    return null
  }
}

async function lookupWorldCatByIsbn(searchIsbn: string, normalizedIsbn: string): Promise<LookupResult | null> {
  const url = `https://classify.oclc.org/classify2/Classify?isbn=${encodeURIComponent(searchIsbn)}&maxRecs=3&summary=true`

  const response = await fetch(url, {
    headers: { 'Accept': 'application/json' },
  })

  if (!response.ok) return null

  // WorldCat Classify returns XML by default, but we can request JSON
  // Try JSON first, fall back to XML parsing
  const contentType = response.headers.get('content-type') || ''
  let data: WorldCatClassifyResponse

  if (contentType.includes('json')) {
    data = await response.json()
  } else {
    // Parse XML response
    const xml = await response.text()

    // Check if we have results
    const totalMatch = xml.match(/<search[^>]*totalResults="(\d+)"[^>]*\/?>/i)
    if (!totalMatch || parseInt(totalMatch[1]) === 0) return null

    // Extract from <work> elements or <record> elements
    return parseWorldCatXml(xml, normalizedIsbn)
  }

  if (!data.classify) return null

  // Check search results
  const totalResults = parseInt(data.classify.search?.totalResults || '0')
  if (totalResults === 0) return null

  // Try to get data from records first (more detailed)
  if (data.classify.records && data.classify.records.length > 0) {
    const record = data.classify.records[0]
    return buildWorldCatResult(record, normalizedIsbn)
  }

  // Fall back to works (less detailed but has basic info)
  if (data.classify.works && data.classify.works.length > 0) {
    const work = data.classify.works[0]
    return {
      title: work.title || '',
      author: work.author || '',
      description: null,
      coverUrl: null,
      publisher: null,
      pageCount: null,
      language: inferLanguageFromIsbn(normalizedIsbn),
      publishDate: null,
      isbn: normalizedIsbn,
      categories: work.genre || [],
      suggestedCategorySlug: suggestCategory(inferLanguageFromIsbn(normalizedIsbn)),
    genre: null,
      source: 'worldcat',
    }
  }

  return null
}

function parseWorldCatXml(xml: string, normalizedIsbn: string): LookupResult | null {
  // Extract from <record> elements
  const recordMatch = xml.match(/<record[^>]*>([\s\S]*?)<\/record>/i)
  if (!recordMatch) {
    // Try <work> elements
    const workMatch = xml.match(/<work[^>]*title="([^"]*)"[^>]*author="([^"]*)"[^>]*\/?>/i)
    if (workMatch) {
      return {
        title: workMatch[1] || '',
        author: workMatch[2] || '',
        description: null,
        coverUrl: null,
        publisher: null,
        pageCount: null,
        language: inferLanguageFromIsbn(normalizedIsbn),
        publishDate: null,
        isbn: normalizedIsbn,
        categories: [],
        suggestedCategorySlug: suggestCategory(inferLanguageFromIsbn(normalizedIsbn)),
    genre: null,
        source: 'worldcat',
      }
    }
    return null
  }

  const recordXml = recordMatch[1]

  const getAttr = (tag: string, attr: string): string | null => {
    const m = recordXml.match(new RegExp(`<${tag}[^>]*${attr}="([^"]*)"[^>]*`, 'i'))
    return m ? m[1] : null
  }

  const getTextContent = (tag: string): string | null => {
    const m = recordXml.match(new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, 'i'))
    return m ? m[1].trim() : null
  }

  const title = getTextContent('title') || getAttr('title', 'value') || ''
  const author = getTextContent('creator') || getAttr('creator', 'value') || ''
  const publisher = getTextContent('publisher') || getAttr('publisher', 'value') || null
  const date = getTextContent('date') || getAttr('date', 'value') || null
  const language = getAttr('language', 'value') || null

  // Extract genres/Dewey categories
  const genres: string[] = []
  const genreMatch = xml.match(/genre="([^"]*)"/g)
  if (genreMatch) {
    for (const g of genreMatch) {
      const val = g.match(/genre="([^"]*)"/)
      if (val && val[1]) genres.push(val[1])
    }
  }

  const lang = language ? normalizeLanguage(language) : inferLanguageFromIsbn(normalizedIsbn)

  return {
    title,
    author,
    description: null,
    coverUrl: null,
    publisher,
    pageCount: null,
    language: lang,
    publishDate: date,
    isbn: normalizedIsbn,
    categories: genres,
    suggestedCategorySlug: suggestCategory(lang),
    genre: null,
    source: 'worldcat',
  }
}

function buildWorldCatResult(record: WorldCatClassifyRecord, normalizedIsbn: string): LookupResult {
  const language = record.language
    ? normalizeLanguage(record.language)
    : inferLanguageFromIsbn(normalizedIsbn)

  return {
    title: record.title || '',
    author: record.author || '',
    description: null,
    coverUrl: null,
    publisher: record.publisher || null,
    pageCount: null,
    language,
    publishDate: record.date || null,
    isbn: normalizedIsbn,
    categories: record.genre || [],
    suggestedCategorySlug: suggestCategory(language),
    genre: null,
    source: 'worldcat',
  }
}

// ============================================================
// Source 12: DNB SRU API (Deutsche Nationalbibliothek)
// Free, no auth needed. Has excellent international coverage,
// including many French books that other sources miss.
// Returns MARC21 XML which we parse for book metadata.
// ============================================================

async function lookupDNB(isbn: string): Promise<LookupResult | null> {
  try {
    const normalizedIsbn = normalizeIsbn(isbn)
    const isbn10 = isbn13To10(normalizedIsbn)

    for (const variant of [normalizedIsbn, isbn10].filter(Boolean) as string[]) {
      const result = await lookupDNBByIsbn(variant, normalizedIsbn)
      if (result) return result
    }

    return null
  } catch (error) {
    console.error('DNB SRU API error:', error)
    return null
  }
}

async function lookupDNBByIsbn(searchIsbn: string, normalizedIsbn: string): Promise<LookupResult | null> {
  const url = `https://services.dnb.de/sru/dnb?version=1.1&operation=searchRetrieve&query=ISBN=${encodeURIComponent(searchIsbn)}&recordSchema=MARC21-xml&maximumRecords=3`

  const response = await fetch(url, {
    headers: { 'Accept': 'application/xml' },
  })

  if (!response.ok) return null

  const xml = await response.text()

  // Check for results
  const numMatch = xml.match(/<numberOfRecords>(\d+)<\/numberOfRecords>/)
  if (!numMatch || parseInt(numMatch[1]) === 0) return null

  // Parse MARC21 XML to extract book data
  return parseDNBMarcXml(xml, normalizedIsbn)
}

function parseDNBMarcXml(xml: string, normalizedIsbn: string): LookupResult | null {
  // Extract data from MARC21 fields
  const getField = (tag: string, code?: string): string | null => {
    if (code) {
      const regex = new RegExp(`<datafield[^>]*tag="${tag}"[^>]*>[\\s\\S]*?<subfield[^>]*code="${code}"[^>]*>([^<]*)<`, 'i')
      const match = xml.match(regex)
      return match ? match[1].trim() : null
    }
    // Control field
    const regex = new RegExp(`<controlfield[^>]*tag="${tag}"[^>]*>([^<]*)<`, 'i')
    const match = xml.match(regex)
    return match ? match[1].trim() : null
  }

  const getAllSubfields = (tag: string, code: string): string[] => {
    const results: string[] = []
    // Find all datafields with this tag
    const fieldRegex = new RegExp(`<datafield[^>]*tag="${tag}"[^>]*>([\\s\\S]*?)</datafield>`, 'gi')
    let fieldMatch
    while ((fieldMatch = fieldRegex.exec(xml)) !== null) {
      const subfieldRegex = new RegExp(`<subfield[^>]*code="${code}"[^>]*>([^<]*)<`, 'gi')
      let subMatch
      while ((subMatch = subfieldRegex.exec(fieldMatch[1])) !== null) {
        if (subMatch[1].trim()) results.push(subMatch[1].trim())
      }
    }
    return results
  }

  // Title (MARC 245 a,b)
  const titleA = getField('245', 'a') || ''
  const titleB = getField('245', 'b') || ''
  let title = titleA.replace(/\s*[\\/:]\s*$/, '').trim()
  if (titleB) {
    title = `${title} : ${titleB.replace(/\s*[\\/:]\s*$/, '').trim()}`
  }

  if (!title) return null

  // Author (MARC 100 a or 700 a)
  let author = getField('100', 'a') || ''
  if (!author) {
    const authors700 = getAllSubfields('700', 'a')
    author = authors700.join(', ')
  }

  // Publisher (MARC 264 b)
  const publisher = getField('264', 'b')?.replace(/[,;:]\s*$/, '').trim() || null

  // Date (MARC 264 c)
  const publishDate = getField('264', 'c')?.replace(/[,;:.\s]+$/, '').trim() || null

  // Language (MARC 008 or 041 a)
  const lang041 = getField('041', 'a')
  const language = lang041
    ? normalizeLanguage(lang041)
    : inferLanguageFromIsbn(normalizedIsbn)

  // Page count (MARC 300 a)
  const pages300 = getField('300', 'a')
  let pageCount: number | null = null
  if (pages300) {
    const pageMatch = pages300.match(/(\d+)\s*(?:S\.|p\.|pages?)/i)
    if (pageMatch) pageCount = parseInt(pageMatch[1])
  }

  // Subjects/genres (MARC 650 a - topical terms, 655 a - genre/form)
  const categories = [
    ...getAllSubfields('650', 'a'),
    ...getAllSubfields('655', 'a'),
  ].slice(0, 5)

  // Description (MARC 520 a)
  const description = getField('520', 'a') || null

  return {
    title,
    author,
    description,
    coverUrl: null,
    publisher,
    pageCount,
    language,
    publishDate,
    isbn: normalizedIsbn,
    categories,
    suggestedCategorySlug: suggestCategory(language),
    genre: null,
    source: 'dnb',
  }
}

// ============================================================
// Source 13: SUDOC (Système Universitaire de Documentation)
// French university library catalog. Free, no auth needed.
// Excellent for French academic and trade books that BNF misses.
// ============================================================

async function lookupSUDOC(isbn: string): Promise<LookupResult | null> {
  try {
    const normalizedIsbn = normalizeIsbn(isbn)
    const isbn10 = isbn13To10(normalizedIsbn)

    for (const variant of [normalizedIsbn, isbn10].filter(Boolean) as string[]) {
      const result = await lookupSUDOCByIsbn(variant, normalizedIsbn)
      if (result) return result
    }

    return null
  } catch (error) {
    console.error('SUDOC API error:', error)
    return null
  }
}

async function lookupSUDOCByIsbn(searchIsbn: string, normalizedIsbn: string): Promise<LookupResult | null> {
  // SUDOC multi-where API returns PPN identifiers for an ISBN
  const whereUrl = `https://www.sudoc.abes.fr/services/isbn2ppn/${encodeURIComponent(searchIsbn)}&format=text/json`

  const whereResponse = await fetch(whereUrl, {
    headers: { 'Accept': 'application/json' },
  })

  if (!whereResponse.ok) return null

  let ppnData: any
  try {
    ppnData = await whereResponse.json()
  } catch {
    // SUDOC sometimes returns XML even when requesting JSON
    const text = await whereResponse.text()
    const ppnMatch = text.match(/<ppn>(\d+)<\/ppn>/)
    if (!ppnMatch) return null
    // Fetch record details by PPN
    return await lookupSUDOCByPPN(ppnMatch[1], normalizedIsbn)
  }

  // Extract PPN from JSON response
  const ppn = ppnData?.sudoc?.ppn || ppnData?.ppn
  if (!ppn) return null

  return await lookupSUDOCByPPN(ppn, normalizedIsbn)
}

async function lookupSUDOCByPPN(ppn: string, normalizedIsbn: string): Promise<LookupResult | null> {
  // Fetch the full record in JSON-LD format
  const recordUrl = `https://www.sudoc.abes.fr/services/PPN/${ppn}&format=text/json`

  const recordResponse = await fetch(recordUrl, {
    headers: { 'Accept': 'application/json' },
  })

  if (!recordResponse.ok) return null

  let xml: string
  try {
    // SUDOC record API often returns XML
    xml = await recordResponse.text()
  } catch {
    return null
  }

  return parseSUDOCXml(xml, normalizedIsbn)
}

function parseSUDOCXml(xml: string, normalizedIsbn: string): LookupResult | null {
  // SUDOC returns UNIMARC XML
  const getField = (tag: string, code: string): string | null => {
    const regex = new RegExp(`<datafield[^>]*tag="${tag}"[^>]*>[\\s\\S]*?<subfield[^>]*code="${code}"[^>]*>([^<]*)<`, 'i')
    const match = xml.match(regex)
    return match ? match[1].trim() : null
  }

  const getAllSubfields = (tag: string, code: string): string[] => {
    const results: string[] = []
    const fieldRegex = new RegExp(`<datafield[^>]*tag="${tag}"[^>]*>([\\s\\S]*?)</datafield>`, 'gi')
    let fieldMatch
    while ((fieldMatch = fieldRegex.exec(xml)) !== null) {
      const subfieldRegex = new RegExp(`<subfield[^>]*code="${code}"[^>]*>([^<]*)<`, 'gi')
      let subMatch
      while ((subMatch = subfieldRegex.exec(fieldMatch[1])) !== null) {
        if (subMatch[1].trim()) results.push(subMatch[1].trim())
      }
    }
    return results
  }

  // Title (UNIMARC 200 a)
  const title = getField('200', 'a')?.replace(/\s*[\\/:;]\s*$/, '').trim() || ''
  if (!title) return null

  // Author (UNIMARC 700 a or 701 a)
  let author = getField('700', 'a') || ''
  if (!author) {
    const authors701 = getAllSubfields('701', 'a')
    author = authors701.join(', ')
  }

  // Publisher (UNIMARC 210 c)
  const publisher = getField('210', 'c')?.replace(/[,;:]\s*$/, '').trim() || null

  // Date (UNIMARC 210 d)
  const publishDate = getField('210', 'd')?.replace(/[,;:.\s]+$/, '').trim() || null

  // Language (UNIMARC 101 a)
  const langCode = getField('101', 'a')
  const language = langCode ? normalizeLanguage(langCode) : inferLanguageFromIsbn(normalizedIsbn)

  // Page count (UNIMARC 215 a)
  const pages = getField('215', 'a')
  let pageCount: number | null = null
  if (pages) {
    const pageMatch = pages.match(/(\d+)\s*(?:p\.|pages?)/i)
    if (pageMatch) pageCount = parseInt(pageMatch[1])
  }

  // Subjects (UNIMARC 606 a - RAMEAU, 610 a - keywords)
  const categories = [
    ...getAllSubfields('606', 'a'),
    ...getAllSubfields('610', 'a'),
  ].slice(0, 5)

  // Description (UNIMARC 330 a)
  const description = getField('330', 'a') || null

  return {
    title,
    author,
    description,
    coverUrl: null,
    publisher,
    pageCount,
    language,
    publishDate,
    isbn: normalizedIsbn,
    categories,
    suggestedCategorySlug: suggestCategory(language),
    genre: null,
    source: 'sudoc',
  }
}

// ============================================================
// Source 14: Inventaire.io
// Open-source book database, especially good for French books.
// Free, no auth needed. Uses Wikidata-style entities.
// ============================================================

interface InventaireEntity {
  uri?: string
  label?: string
  description?: string
  claims?: {
    'wdt:P50'?: string[]   // author
    'wdt:P123'?: string[]  // publisher
    'wdt:P577'?: string[]  // publication date
    'wdt:P1104'?: number   // number of pages
    'wdt:P407'?: string[]  // language of work
    'wdt:P921'?: string[]  // main subject
    'wdt:P136'?: string[]  // genre
  }
}

async function lookupInventaire(isbn: string): Promise<LookupResult | null> {
  try {
    const normalizedIsbn = normalizeIsbn(isbn)
    const isbn10 = isbn13To10(normalizedIsbn)

    for (const variant of [normalizedIsbn, isbn10].filter(Boolean) as string[]) {
      const result = await lookupInventaireByIsbn(variant, normalizedIsbn)
      if (result) return result
    }

    return null
  } catch (error) {
    console.error('Inventaire API error:', error)
    return null
  }
}

async function lookupInventaireByIsbn(searchIsbn: string, normalizedIsbn: string): Promise<LookupResult | null> {
  // Inventaire ISBN lookup - returns entity URI
  const lookupUrl = `https://inventaire.io/api/data?action=by-uris&uris=isbn:${encodeURIComponent(searchIsbn)}`

  const lookupResponse = await fetch(lookupUrl, {
    headers: { 'Accept': 'application/json' },
  })

  if (!lookupResponse.ok) return null

  const lookupData = await lookupResponse.json()
  const entities = lookupData.entities as Record<string, InventaireEntity> | undefined
  if (!entities) return null

  // Find the first entity that has a label (title)
  const entityKey = Object.keys(entities).find(k => entities[k].label)
  if (!entityKey) return null

  const entity = entities[entityKey]

  // Get author details
  let author = ''
  if (entity.claims?.['wdt:P50']?.length) {
    const authorUris = entity.claims['wdt:P50']
    const authorNames: string[] = []
    for (const authorUri of authorUris.slice(0, 3)) {
      try {
        const authorResp = await fetch(
          `https://inventaire.io/api/data?action=by-uris&uris=${encodeURIComponent(authorUri)}`,
          { headers: { 'Accept': 'application/json' } }
        )
        if (authorResp.ok) {
          const authorData = await authorResp.json()
          const authorEntities = authorData.entities as Record<string, InventaireEntity>
          const authorKey = Object.keys(authorEntities)[0]
          if (authorEntities[authorKey]?.label) {
            authorNames.push(authorEntities[authorKey].label!)
          }
        }
      } catch {
        // Skip author lookup errors
      }
    }
    author = authorNames.join(', ')
  }

  // Get publisher details
  let publisher: string | null = null
  if (entity.claims?.['wdt:P123']?.length) {
    const pubUri = entity.claims['wdt:P123'][0]
    try {
      const pubResp = await fetch(
        `https://inventaire.io/api/data?action=by-uris&uris=${encodeURIComponent(pubUri)}`,
        { headers: { 'Accept': 'application/json' } }
      )
      if (pubResp.ok) {
        const pubData = await pubResp.json()
        const pubEntities = pubData.entities as Record<string, InventaireEntity>
        const pubKey = Object.keys(pubEntities)[0]
        publisher = pubEntities[pubKey]?.label || null
      }
    } catch {
      // Skip publisher lookup errors
    }
  }

  // Publication date
  let publishDate: string | null = null
  if (entity.claims?.['wdt:P577']?.length) {
    const dateStr = entity.claims['wdt:P577'][0]
    const dateMatch = dateStr.match(/^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?/)
    if (dateMatch) {
      publishDate = [dateMatch[1], dateMatch[2], dateMatch[3]].filter(Boolean).join('-')
    }
  }

  // Language
  let language = inferLanguageFromIsbn(normalizedIsbn)
  if (entity.claims?.['wdt:P407']?.length) {
    const langUri = entity.claims['wdt:P407'][0]
    // Map Wikidata language entities
    const langMap: Record<string, string> = {
      'Q150': 'fr', 'Q1860': 'en', 'Q13955': 'ar',
      'Q1321': 'es', 'Q188': 'de', 'Q652': 'it',
    }
    const langId = langUri.replace('wd:', '')
    if (langMap[langId]) language = langMap[langId]
  }

  // Subjects & genres
  const categories: string[] = []
  if (entity.claims?.['wdt:P136']?.length) {
    for (const genreUri of entity.claims['wdt:P136'].slice(0, 3)) {
      try {
        const genreResp = await fetch(
          `https://inventaire.io/api/data?action=by-uris&uris=${encodeURIComponent(genreUri)}`,
          { headers: { 'Accept': 'application/json' } }
        )
        if (genreResp.ok) {
          const genreData = await genreResp.json()
          const genreEntities = genreData.entities as Record<string, InventaireEntity>
          const genreKey = Object.keys(genreEntities)[0]
          if (genreEntities[genreKey]?.label) {
            categories.push(genreEntities[genreKey].label!)
          }
        }
      } catch {
        // Skip genre lookup errors
      }
    }
  }

  // Try to get cover from Inventaire
  let coverUrl: string | null = null
  const invId = entityKey.replace('inv:', '')
  if (invId) {
    coverUrl = `https://inventaire.io/img/entities/${invId}?width=400`
  }

  return {
    title: entity.label || '',
    author,
    description: entity.description || null,
    coverUrl,
    publisher,
    pageCount: entity.claims?.['wdt:P1104'] || null,
    language,
    publishDate,
    isbn: normalizedIsbn,
    categories,
    suggestedCategorySlug: suggestCategory(language),
    genre: null,
    source: 'inventaire',
  }
}

// ============================================================
// Helper: Detect Arabic ISBN prefixes
// ============================================================

function isArabicPrefix(isbn: string): boolean {
  return isbn.startsWith('9789961') || isbn.startsWith('9789954') ||
         isbn.startsWith('978977') || isbn.startsWith('9789948') ||
         isbn.startsWith('9789960') || isbn.startsWith('9789933') ||
         isbn.startsWith('978614') || isbn.startsWith('9789953') ||
         isbn.startsWith('9789947') || isbn.startsWith('9789927') ||
         isbn.startsWith('97899901') || isbn.startsWith('97899902') ||
         isbn.startsWith('97899903') || isbn.startsWith('9786050') ||
         isbn.startsWith('9789790') || isbn.startsWith('9780230')
}

// ============================================================
// Source 15: HathiTrust API
// Digital library with excellent coverage of academic books
// including Arabic. Uses the public JSON API.
// ============================================================

async function lookupHathiTrust(isbn: string): Promise<LookupResult | null> {
  try {
    const normalizedIsbn = normalizeIsbn(isbn)

    // Try full JSON first (more metadata), then brief JSON as fallback
    const endpoints = [
      `https://catalog.hathitrust.org/api/volumes/full/json/${normalizedIsbn}`,
      `https://catalog.hathitrust.org/api/volumes/brief/json/${normalizedIsbn}`,
    ]

    for (const url of endpoints) {
      try {
        const resp = await fetch(url)
        if (!resp.ok) continue

        const data = await resp.json()
        const records = data?.records
        if (!records || typeof records !== 'object') continue

        // Pick the first available record
        const recordIds = Object.keys(records)
        if (recordIds.length === 0) continue

        const recordId = recordIds[0]
        const record = records[recordId]
        const isFull = url.includes('/full/json/')

        const titles: string[] = []
        const pubDates: string[] = []
        const publishers: string[] = []
        let author = ''
        let description: string | null = null

        if (isFull && record?.record?.data) {
          const recordData = record.record.data
          if (Array.isArray(recordData.titles)) {
            titles.push(...recordData.titles.filter((t: unknown): t is string => typeof t === 'string'))
          }
          if (Array.isArray(recordData.pubDates)) {
            pubDates.push(...recordData.pubDates.filter((d: unknown): d is string => typeof d === 'string'))
          }
          if (Array.isArray(recordData.publishers)) {
            publishers.push(...recordData.publishers.filter((p: unknown): p is string => typeof p === 'string'))
          }
          if (Array.isArray(recordData.authors) && recordData.authors.length > 0) {
            const firstAuthor = recordData.authors[0]
            author = typeof firstAuthor === 'object' && firstAuthor !== null && 'name' in firstAuthor
              ? String(firstAuthor.name)
              : String(firstAuthor)
          }
        }

        // For brief JSON, try to get title from the record's titles array
        if (!isFull) {
          if (record?.titles && Array.isArray(record.titles)) {
            titles.push(...record.titles.filter((t: unknown): t is string => typeof t === 'string'))
          }
          if (record?.pubDates && Array.isArray(record.pubDates)) {
            pubDates.push(...record.pubDates.filter((d: unknown): d is string => typeof d === 'string'))
          }
          if (record?.publishers && Array.isArray(record.publishers)) {
            publishers.push(...record.publishers.filter((p: unknown): p is string => typeof p === 'string'))
          }
        }

        if (titles.length === 0) continue

        // Build cover URL from the record ID
        const coverUrl = `https://babel.hathitrust.org/cgi/imgsrv/image?id=${recordId};seq=1;size=400`

        // Try to infer language from title (detect Arabic characters)
        let language = inferLanguageFromIsbn(normalizedIsbn)
        const titleText = titles[0] || ''
        if (/[\u0600-\u06FF]/.test(titleText)) {
          language = 'ar'
        } else if (/[a-zA-Z]/.test(titleText)) {
          language = 'en'
        }

        const publishDate = pubDates.length > 0 ? pubDates[0] : null

        return {
          title: titleText,
          author,
          description,
          coverUrl,
          publisher: publishers.length > 0 ? publishers[0] : null,
          pageCount: null,
          language,
          publishDate,
          isbn: normalizedIsbn,
          categories: [],
          suggestedCategorySlug: suggestCategory(language),
    genre: null,
          source: 'hathitrust',
        }
      } catch {
        // Try next endpoint
        continue
      }
    }

    return null
  } catch (error) {
    console.error('[ISBN Lookup] HathiTrust error:', error)
    return null
  }
}

// ============================================================
// Source 16: LibraryThing API
// Free API with excellent coverage of books in all languages.
// Uses thingISBN to get a work ID, then fetches metadata.
// ============================================================

async function lookupLibraryThing(isbn: string): Promise<LookupResult | null> {
  try {
    const normalizedIsbn = normalizeIsbn(isbn)

    // Step 1: Get work ID from thingISBN
    const thingIsbnUrl = `https://www.librarything.com/api/thingISBN/${normalizedIsbn}`
    const thingResp = await fetch(thingIsbnUrl, {
      headers: { 'User-Agent': 'Kitab123/1.0 (contact@kitabi.dz)' },
    })
    if (!thingResp.ok) return null

    const thingData = await thingResp.json()
    // thingISBN returns a list of ISBNs that belong to the same work
    if (!Array.isArray(thingData) || thingData.length === 0) return null

    // Step 2: Get title using the first ISBN from the work
    const firstIsbn = thingData[0]
    const titleUrl = `https://www.librarything.com/api/title/${firstIsbn}`
    const titleResp = await fetch(titleUrl, {
      headers: { 'User-Agent': 'Kitab123/1.0 (contact@kitabi.dz)' },
    })
    if (!titleResp.ok) return null

    const titleText = (await titleResp.text()).trim()
    if (!titleText || titleText.length < 2) return null

    // Step 3: Try to get more metadata from workinfo JSON
    let author = ''
    let publisher: string | null = null
    let publishDate: string | null = null
    let pageCount: number | null = null
    let description: string | null = null

    try {
      // Try workinfo with the first ISBN
      const workInfoUrl = `https://www.librarything.com/api/json/workinfo?id=${firstIsbn}`
      const workResp = await fetch(workInfoUrl, {
        headers: { 'User-Agent': 'Kitab123/1.0 (contact@kitabi.dz)' },
      })
      if (workResp.ok) {
        const workData = await workResp.json()
        const info = workData?.bookinfo || workData?.workinfo || workData
        if (info && typeof info === 'object') {
          if (info.author) author = String(info.author)
          if (info.publisher) publisher = String(info.publisher)
          if (info.date) publishDate = String(info.date)
          if (info.pages) pageCount = parseInt(String(info.pages), 10) || null
          if (info.summary) description = String(info.summary)
        }
      }
    } catch {
      // workinfo is optional, continue with just the title
    }

    // Infer language from title
    let language = inferLanguageFromIsbn(normalizedIsbn)
    if (/[\u0600-\u06FF]/.test(titleText)) {
      language = 'ar'
    } else if (/[a-zA-Z]/.test(titleText)) {
      language = 'en'
    }

    return {
      title: titleText,
      author,
      description,
      coverUrl: null,
      publisher,
      pageCount,
      language,
      publishDate,
      isbn: normalizedIsbn,
      categories: [],
      suggestedCategorySlug: suggestCategory(language),
    genre: null,
      source: 'librarything',
    }
  } catch (error) {
    console.error('[ISBN Lookup] LibraryThing error:', error)
    return null
  }
}

// ============================================================
// Source 17: Google Books with Arabic Query (broader search)
// When an ISBN has an Arabic prefix, search Google Books with
// broader queries that can find books not indexed by isbn: operator.
// ============================================================

async function lookupGoogleBooksArabic(isbn: string): Promise<LookupResult | null> {
  try {
    const normalizedIsbn = normalizeIsbn(isbn)

    // Try broader searches without strict isbn: prefix
    const queries = [
      `https://www.googleapis.com/books/v1/volumes?q=${normalizedIsbn}&maxResults=5`,
      `https://www.googleapis.com/books/v1/volumes?q=${normalizedIsbn}+كتاب&maxResults=3`,
    ]

    for (const url of queries) {
      try {
        const resp = await fetch(url)
        if (!resp.ok) continue

        const data = await resp.json()
        if (!data.items || data.items.length === 0) continue

        for (const item of data.items) {
          const volumeInfo = item.volumeInfo
          if (!volumeInfo || !volumeInfo.title) continue

          // Verify ISBN match (loose - check if our ISBN appears in identifiers)
          const identifiers = volumeInfo.industryIdentifiers || []
          const hasMatch = identifiers.some(
            (id: { type: string; identifier: string }) => {
              const clean = id.identifier.replace(/[-\s]/g, '')
              return clean === normalizedIsbn ||
                     clean === isbn ||
                     normalizeIsbn(clean) === normalizedIsbn
            }
          )

          // Accept if title contains the ISBN digits (some Arabic books list ISBN in title)
          const titleHasIsbn = volumeInfo.title.includes(normalizedIsbn) ||
                               volumeInfo.title.includes(isbn)

          if (!hasMatch && !titleHasIsbn) continue

          const title = volumeInfo.subtitle
            ? `${volumeInfo.title}: ${volumeInfo.subtitle}`
            : volumeInfo.title

          const author = Array.isArray(volumeInfo.authors) ? volumeInfo.authors.join(', ') : ''
          const language = normalizeLanguage(volumeInfo.language) || 'ar'

          const coverUrl = volumeInfo.imageLinks?.thumbnail
            ? volumeInfo.imageLinks.thumbnail.replace('http://', 'https://').replace('&edge=curl', '')
            : null

          return {
            title,
            author,
            description: volumeInfo.description || null,
            coverUrl,
            publisher: volumeInfo.publisher || null,
            pageCount: volumeInfo.pageCount || null,
            language,
            publishDate: volumeInfo.publishedDate || null,
            isbn: normalizedIsbn,
            categories: volumeInfo.categories || [],
            suggestedCategorySlug: suggestCategory(language),
    genre: null,
            source: 'google-arabic',
          }
        }
      } catch {
        continue
      }
    }

    return null
  } catch (error) {
    console.error('[ISBN Lookup] Google Books Arabic error:', error)
    return null
  }
}

// ============================================================
// Source 20: Noor Library (Arabic digital library)
// Free, no auth. Excellent for Arabic books, especially religious,
// educational, and cultural content.
// ============================================================

async function lookupNoorLibrary(isbn: string): Promise<LookupResult | null> {
  try {
    const normalizedIsbn = normalizeIsbn(isbn)
    const isbn10 = isbn13To10(normalizedIsbn)

    for (const variant of [normalizedIsbn, isbn10].filter(Boolean) as string[]) {
      const result = await lookupNoorLibraryByIsbn(variant, normalizedIsbn)
      if (result) return result
    }

    return null
  } catch (error) {
    console.error('[ISBN Lookup] Noor Library error:', error)
    return null
  }
}

async function lookupNoorLibraryByIsbn(searchIsbn: string, normalizedIsbn: string): Promise<LookupResult | null> {
  const url = `https://www.noor-library.com/api/books?isbn=${encodeURIComponent(searchIsbn)}`

  try {
    const resp = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    })
    if (!resp.ok) return null

    const data = await resp.json() as any
    if (!data || !data.title) return null

    let description: string | null = null
    if (data.description) {
      description = typeof data.description === 'string' ? data.description : null
    }

    const categories: string[] = []
    if (data.category) categories.push(String(data.category))
    if (data.categories && Array.isArray(data.categories)) {
      categories.push(...data.categories.slice(0, 3).map(String))
    }

    return {
      title: String(data.title || ''),
      author: data.author ? String(data.author) : '',
      description,
      coverUrl: data.cover || data.image || data.coverUrl ? String(data.cover || data.image || data.coverUrl) : null,
      publisher: data.publisher ? String(data.publisher) : null,
      pageCount: data.pages || data.pageCount ? parseInt(String(data.pages || data.pageCount), 10) || null : null,
      language: 'ar',
      publishDate: data.publishDate || data.year ? String(data.publishDate || data.year) : null,
      isbn: normalizedIsbn,
      categories,
      suggestedCategorySlug: 'livres-arabe',
      genre: null,
      source: 'noor-library',
    }
  } catch {
    return null
  }
}

// ============================================================
// Source 21: Jarir Bookstore (Arabic book retailer)
// Saudi-based retailer with excellent Arabic book database.
// ============================================================

async function lookupJarir(isbn: string): Promise<LookupResult | null> {
  try {
    const normalizedIsbn = normalizeIsbn(isbn)
    const isbn10 = isbn13To10(normalizedIsbn)

    for (const variant of [normalizedIsbn, isbn10].filter(Boolean) as string[]) {
      const result = await lookupJarirByIsbn(variant, normalizedIsbn)
      if (result) return result
    }

    return null
  } catch (error) {
    console.error('[ISBN Lookup] Jarir error:', error)
    return null
  }
}

async function lookupJarirByIsbn(searchIsbn: string, normalizedIsbn: string): Promise<LookupResult | null> {
  const url = `https://www.jarir.com/api/catalog/search/product?q=${encodeURIComponent(searchIsbn)}&pageSize=5`

  try {
    const resp = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; Kitabi/1.0)',
      },
    })
    if (!resp.ok) return null

    const data = await resp.json() as any
    const products = data?.products || data?.data?.products || data?.items || []
    if (!Array.isArray(products) || products.length === 0) return null

    const book = products.find((p: any) =>
      p.isbn === searchIsbn || p.isbn === normalizedIsbn ||
      p.ean === searchIsbn || p.ean === normalizedIsbn
    ) || products[0]

    if (!book) return null

    let description: string | null = null
    if (book.description) {
      const desc = typeof book.description === 'string' ? book.description : ''
      description = desc.replace(/<[^>]+>/g, '').trim().substring(0, 500) || null
    }

    const categories: string[] = []
    if (book.categoryName) categories.push(String(book.categoryName))
    if (book.categories && Array.isArray(book.categories)) {
      categories.push(...book.categories.slice(0, 3).map((c: any) => c.name || String(c)))
    }

    return {
      title: String(book.name || book.title || ''),
      author: book.author || book.authorName ? String(book.author || book.authorName) : '',
      description,
      coverUrl: book.image?.url || book.imageUrl || book.thumbnail ? String(book.image?.url || book.imageUrl || book.thumbnail) : null,
      publisher: book.publisher || book.brand ? String(book.publisher || book.brand) : null,
      pageCount: book.numberOfPages || book.pageCount ? parseInt(String(book.numberOfPages || book.pageCount), 10) || null : null,
      language: 'ar',
      publishDate: null,
      isbn: normalizedIsbn,
      categories,
      suggestedCategorySlug: 'livres-arabe',
      genre: null,
      source: 'jarir',
    }
  } catch {
    return null
  }
}

// ============================================================
// Source 22: Neel wa Furat (Arabic book retailer)
// One of the largest Arabic book databases. Excellent for
// Arabic literature, academic, and cultural books.
// ============================================================

async function lookupNeelWaFurat(isbn: string): Promise<LookupResult | null> {
  try {
    const normalizedIsbn = normalizeIsbn(isbn)
    const isbn10 = isbn13To10(normalizedIsbn)

    for (const variant of [normalizedIsbn, isbn10].filter(Boolean) as string[]) {
      const result = await lookupNeelWaFuratByIsbn(variant, normalizedIsbn)
      if (result) return result
    }

    return null
  } catch (error) {
    console.error('[ISBN Lookup] Neel wa Furat error:', error)
    return null
  }
}

async function lookupNeelWaFuratByIsbn(searchIsbn: string, normalizedIsbn: string): Promise<LookupResult | null> {
  const url = `https://www.neelwafurat.com/api/search?q=${encodeURIComponent(searchIsbn)}&type=isbn`

  try {
    const resp = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; Kitabi/1.0)',
      },
    })
    if (!resp.ok) return null

    const text = await resp.text()

    // Neel wa Furat might return HTML or JSON
    if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
      const data = JSON.parse(text) as any
      const books = Array.isArray(data) ? data : (data.books || data.results || data.data || [])
      if (!Array.isArray(books) || books.length === 0) return null

      const book = books[0]
      if (!book) return null

      let description: string | null = null
      if (book.description) {
        description = typeof book.description === 'string'
          ? book.description.replace(/<[^>]+>/g, '').trim().substring(0, 500) || null
          : null
      }

      return {
        title: String(book.title || book.name || ''),
        author: book.author ? String(book.author) : '',
        description,
        coverUrl: book.cover || book.image ? String(book.cover || book.image) : null,
        publisher: book.publisher ? String(book.publisher) : null,
        pageCount: book.pages ? parseInt(String(book.pages), 10) || null : null,
        language: 'ar',
        publishDate: book.year || book.date ? String(book.year || book.date) : null,
        isbn: normalizedIsbn,
        categories: book.category ? [String(book.category)] : [],
        suggestedCategorySlug: 'livres-arabe',
        genre: null,
        source: 'neel-wa-furat',
      }
    }

    return null
  } catch {
    return null
  }
}

// ============================================================
// Source 23: Hindawi (Arabic digital publishing platform)
// Free, no auth. Excellent for modern Arabic books,
// especially academic and literary works.
// ============================================================

async function lookupHindawi(isbn: string): Promise<LookupResult | null> {
  try {
    const normalizedIsbn = normalizeIsbn(isbn)
    const isbn10 = isbn13To10(normalizedIsbn)

    for (const variant of [normalizedIsbn, isbn10].filter(Boolean) as string[]) {
      const result = await lookupHindawiByIsbn(variant, normalizedIsbn)
      if (result) return result
    }

    return null
  } catch (error) {
    console.error('[ISBN Lookup] Hindawi error:', error)
    return null
  }
}

async function lookupHindawiByIsbn(searchIsbn: string, normalizedIsbn: string): Promise<LookupResult | null> {
  const url = `https://www.hindawi.org/api/books?isbn=${encodeURIComponent(searchIsbn)}`

  try {
    const resp = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    })
    if (!resp.ok) return null

    const data = await resp.json() as any
    if (!data || !data.title) return null

    let description: string | null = null
    if (data.description || data.about) {
      const desc = String(data.description || data.about || '')
      description = desc.replace(/<[^>]+>/g, '').trim().substring(0, 500) || null
    }

    const categories: string[] = []
    if (data.category) categories.push(String(data.category))
    if (data.tags && Array.isArray(data.tags)) {
      categories.push(...data.tags.slice(0, 3).map(String))
    }

    return {
      title: String(data.title || ''),
      author: data.author ? String(data.author) : '',
      description,
      coverUrl: data.cover || data.coverUrl || data.thumbnail ? String(data.cover || data.coverUrl || data.thumbnail) : null,
      publisher: data.publisher ? String(data.publisher) : null,
      pageCount: data.pageCount || data.pages ? parseInt(String(data.pageCount || data.pages), 10) || null : null,
      language: 'ar',
      publishDate: data.publishYear || data.year ? String(data.publishYear || data.year) : null,
      isbn: normalizedIsbn,
      categories,
      suggestedCategorySlug: 'livres-arabe',
      genre: null,
      source: 'hindawi',
    }
  } catch {
    return null
  }
}

// ============================================================
// Source 24: Decitre (French book retailer)
// Major French book retailer with excellent French book metadata.
// ============================================================

async function lookupDecitre(isbn: string): Promise<LookupResult | null> {
  try {
    const normalizedIsbn = normalizeIsbn(isbn)
    const isbn10 = isbn13To10(normalizedIsbn)

    for (const variant of [normalizedIsbn, isbn10].filter(Boolean) as string[]) {
      const result = await lookupDecitreByIsbn(variant, normalizedIsbn)
      if (result) return result
    }

    return null
  } catch (error) {
    console.error('[ISBN Lookup] Decitre error:', error)
    return null
  }
}

async function lookupDecitreByIsbn(searchIsbn: string, normalizedIsbn: string): Promise<LookupResult | null> {
  const url = `https://www.decitre.fr/api/books/v1/isbn/${encodeURIComponent(searchIsbn)}`

  try {
    const resp = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; Kitabi/1.0)',
      },
    })
    if (!resp.ok) return null

    const data = await resp.json() as any
    if (!data || !data.title) return null

    let description: string | null = null
    if (data.description || data.summary) {
      const desc = String(data.description || data.summary || '')
      description = desc.replace(/<[^>]+>/g, '').trim().substring(0, 500) || null
    }

    const categories: string[] = []
    if (data.category) categories.push(String(data.category))
    if (data.categories && Array.isArray(data.categories)) {
      categories.push(...data.categories.slice(0, 3).map(String))
    }
    if (data.themes && Array.isArray(data.themes)) {
      categories.push(...data.themes.slice(0, 3).map(String))
    }

    let coverUrl: string | null = null
    if (data.coverUrl || data.image || data.imageUrl) {
      coverUrl = String(data.coverUrl || data.image || data.imageUrl)
      if (!coverUrl.startsWith('http')) coverUrl = null
    }

    return {
      title: String(data.title || ''),
      author: data.author ? String(data.author) : '',
      description,
      coverUrl,
      publisher: data.publisher ? String(data.publisher) : null,
      pageCount: data.pageCount || data.nbPages ? parseInt(String(data.pageCount || data.nbPages), 10) || null : null,
      language: normalizeLanguage(data.language),
      publishDate: data.publishDate || data.parutionDate ? String(data.publishDate || data.parutionDate) : null,
      isbn: normalizedIsbn,
      categories,
      suggestedCategorySlug: 'livres-francais',
      genre: null,
      source: 'decitre',
    }
  } catch {
    return null
  }
}

// ============================================================
// Source 25: FNAC (French retailer)
// Major French retailer with excellent book metadata and covers.
// ============================================================

async function lookupFNAC(isbn: string): Promise<LookupResult | null> {
  try {
    const normalizedIsbn = normalizeIsbn(isbn)
    const isbn10 = isbn13To10(normalizedIsbn)

    for (const variant of [normalizedIsbn, isbn10].filter(Boolean) as string[]) {
      const result = await lookupFNACByIsbn(variant, normalizedIsbn)
      if (result) return result
    }

    return null
  } catch (error) {
    console.error('[ISBN Lookup] FNAC error:', error)
    return null
  }
}

async function lookupFNACByIsbn(searchIsbn: string, normalizedIsbn: string): Promise<LookupResult | null> {
  const url = `https://fnac.com/api/v1/product/isbn/${encodeURIComponent(searchIsbn)}`

  try {
    const resp = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; Kitabi/1.0)',
      },
    })
    if (!resp.ok) return null

    const data = await resp.json() as any
    if (!data || !data.title) return null

    let description: string | null = null
    if (data.description || data.summary) {
      const desc = String(data.description || data.summary || '')
      description = desc.replace(/<[^>]+>/g, '').trim().substring(0, 500) || null
    }

    const categories: string[] = []
    if (data.category) categories.push(String(data.category))
    if (data.categories && Array.isArray(data.categories)) {
      categories.push(...data.categories.slice(0, 3).map(String))
    }

    let coverUrl: string | null = null
    if (data.coverUrl || data.image || data.imageUrl) {
      coverUrl = String(data.coverUrl || data.image || data.imageUrl)
      if (!coverUrl.startsWith('http')) coverUrl = null
    }

    return {
      title: String(data.title || ''),
      author: data.author ? String(data.author) : '',
      description,
      coverUrl,
      publisher: data.publisher ? String(data.publisher) : null,
      pageCount: data.pageCount || data.nbPages ? parseInt(String(data.pageCount || data.nbPages), 10) || null : null,
      language: normalizeLanguage(data.language),
      publishDate: data.publishDate || data.parutionDate ? String(data.publishDate || data.parutionDate) : null,
      isbn: normalizedIsbn,
      categories,
      suggestedCategorySlug: 'livres-francais',
      genre: null,
      source: 'fnac',
    }
  } catch {
    return null
  }
}

// ============================================================
// Source 18: Open Library Title Search Fallback
// When we have a title but no cover, search Open Library by
// title to find a matching cover image.
// This is used as an enrichment step, not a primary lookup.
// ============================================================

async function lookupOpenLibraryCoverByTitle(
  title: string,
  author: string
): Promise<string | null> {
  if (!title || title.length < 2) return null

  try {
    const params = new URLSearchParams({
      title,
      limit: '1',
      fields: 'cover_i',
    })
    if (author) params.set('author', author)

    const resp = await fetch(
      `https://openlibrary.org/search.json?${params.toString()}`
    )
    if (!resp.ok) return null

    const data = await resp.json()
    const coverId = data?.docs?.[0]?.cover_i
    if (!coverId) return null

    return `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`
  } catch {
    return null
  }
}

// ============================================================
// Source 19: Web Search (z-ai-web-dev-sdk)
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

    // Try multiple search queries - include Arabic-specific queries for Arabic ISBNs
    const isArabic = isArabicPrefix(normalizedIsbn)
    const queries: string[] = [
      `"${normalizedIsbn}" ${keyword}`,
      isbn10 ? `"${isbn10}" ${keyword}` : null,
      `${normalizedIsbn} ${keyword}`,
    ].filter(Boolean) as string[]

    // Add Arabic-specific search queries when the ISBN has an Arabic prefix
    if (isArabic) {
      const arabicQueries = [
        `"${normalizedIsbn}" كتاب`,
        isbn10 ? `"${isbn10}" كتاب` : null,
        `"${normalizedIsbn}" دار نشر`,
        `"${normalizedIsbn}" مؤلف`,
        `"${normalizedIsbn}" site:jamalon.com`,
        `"${normalizedIsbn}" site:neelwafurat.com`,
        `"${normalizedIsbn}" site:goodreads.com`,
      ].filter(Boolean) as string[]
      queries.push(...arabicQueries)
    }

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
- "categories": string[] or null (genres/subjects, e.g. ["Fiction", "Roman", "Science"])

Important rules:
- Return ONLY the JSON object, no markdown fences, no explanation
- If you cannot confidently identify the SPECIFIC book for this ISBN, return {"title": null}
- Do NOT guess - only extract information that is clearly present in the search results
- The ISBN is ${normalizedIsbn}, make sure the extracted data is for THIS specific ISBN
- Include genre/category/subject information when available (e.g. "Roman", "Fiction", "Science-fiction", "Histoire", etc.)`,
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

    // Extract categories from AI response
    const categories = Array.isArray(bookData.categories)
      ? (bookData.categories as string[]).filter((c): c is string => typeof c === 'string')
      : []

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
      categories,
      suggestedCategorySlug: suggestCategory(language),
    genre: null,
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

  // 3. Try Open Library search by title (fallback when we have a title but no cover)
  if (result.title) {
    try {
      const coverUrl = await lookupOpenLibraryCoverByTitle(result.title, result.author)
      if (coverUrl) {
        return { ...result, coverUrl }
      }
    } catch {
      // Ignore errors in cover enrichment
    }
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

  // Fill missing description - PRIORITIZE Google Books descriptions
  if (!enriched.description || enriched.description.length < 20) {
    const googleResult = others.find(r => r.source === 'google' && r.description && r.description.length > 20)
    if (googleResult && googleResult.description) {
      enriched.description = googleResult.description
    }
  }
  // Second pass: if still no good description, try any source with a quality description
  if (!enriched.description || enriched.description.length < 20) {
    const withDesc = others.find(r => r.description && r.description.length > 50 && !isCatalogDescription(r.description))
    if (withDesc && withDesc.description) enriched.description = withDesc.description
  }

  // If base description is catalog-style, replace it with a better one
  if (enriched.description && isCatalogDescription(enriched.description)) {
    const betterDesc = others.find(r => r.description && r.description.length > 50 && !isCatalogDescription(r.description))
    if (betterDesc && betterDesc.description) {
      enriched.description = betterDesc.description
    } else {
      enriched.description = null // Reject catalog-style descriptions
    }
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

  // Merge categories from ALL sources for better genre classification
  const allCategories = [...enriched.categories]
  for (const other of others) {
    if (other.categories && other.categories.length > 0) {
      for (const cat of other.categories) {
        if (!allCategories.some(c => c.toLowerCase() === cat.toLowerCase())) {
          allCategories.push(cat)
        }
      }
    }
  }
  enriched.categories = allCategories

  return enriched
}

/**
 * Detect catalog-style descriptions that are not real book descriptions
 * Examples: "xxviii, 291 p. ; 22 cm", "1 vol. (XVI-346 p.)"
 */
function isCatalogDescription(desc: string): boolean {
  if (!desc) return true
  const trimmed = desc.trim()
  const catalogPatterns = [
    /^\d+\s*(p|pages?)\s*[.;,]/i,
    /^\d+\s*vol/i,
    /^\d+\s*p\.\s*;/i,
    /^\d+\s*cm/i,
    /\d+\s*p\.\s*;\s*\d+\s*cm/i,
    /^\(?\d+\s*p/i,
    /^bibliogr/i,
    /^ill\./i,
    /^[xivlcdm]+,?\s*\d+\s*p/i,
    /^index/i,
    /^\d+\s*x\s*\d+\s*(mm|cm)/i,
  ]
  if (trimmed.length < 100) {
    return catalogPatterns.some(pattern => pattern.test(trimmed))
  }
  if (trimmed.length < 15) return true
  return false
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
    'worldcat': 2,
    'sudoc': 2,
    'dnb': 2,
    'inventaire': 2,
    'hathitrust': 2,
    'librarything': 2,
    'wikidata': 1,
    'internet-archive': 1,
    'google-enhanced': 1,
    'google-arabic': 1,
    'web-search': 0,
    'google-broad': 0,
    'noor-library': 2,
    'jarir': 2,
    'neel-wa-furat': 2,
    'hindawi': 2,
    'decitre': 3,
    'fnac': 3,
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

  // Validate check digit - with auto-correction for wrong last digit
  if (!isValidIsbn(cleanIsbn)) {
    let correctedIsbn: string | null = null
    if (cleanIsbn.length === 13) {
      const prefix = cleanIsbn.slice(0, 12)
      if (/^\d{12}$/.test(prefix)) {
        let sum = 0
        for (let i = 0; i < 12; i++) {
          sum += parseInt(prefix[i], 10) * (i % 2 === 0 ? 1 : 3)
        }
        const correctCheck = (10 - (sum % 10)) % 10
        correctedIsbn = prefix + correctCheck
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
        correctedIsbn = prefix + checkChar
      }
    }

    // If we can auto-correct, try the corrected ISBN via recursive call
    if (correctedIsbn && correctedIsbn !== cleanIsbn) {
      console.log(`[ISBN Lookup] Auto-correcting ISBN: ${cleanIsbn} -> ${correctedIsbn}`)
      const correctedResult = await lookupISBN(correctedIsbn)
      if (correctedResult.result) {
        return {
          ...correctedResult,
          warning: `ISBN corrigé automatiquement : ${cleanIsbn} -> ${correctedIsbn}`,
        }
      }
    }

    const suggestionText = correctedIsbn
      ? ` ISBN corrigé: ${correctedIsbn} (non trouvé non plus)`
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
      // Classify genre before fast return
      if (bestWithCover.categories.length > 0) {
        bestWithCover.genre = classifyGenre(bestWithCover.categories)
      }
      console.log(`[ISBN Lookup] Fast return from ${bestWithCover.source} (score: ${resultScore(bestWithCover)}, genre: ${bestWithCover.genre || 'none'})`)
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
    { name: 'worldcat', fn: () => lookupWorldCat(normalizedIsbn) },
    { name: 'sudoc', fn: () => lookupSUDOC(normalizedIsbn) },
    { name: 'dnb', fn: () => lookupDNB(normalizedIsbn) },
    { name: 'inventaire', fn: () => lookupInventaire(normalizedIsbn) },
    { name: 'wikidata', fn: () => lookupWikidata(normalizedIsbn) },
    { name: 'google-broad', fn: () => lookupGoogleBooksBroad(normalizedIsbn) },
    // New sources for better Arabic & international coverage
    { name: 'hathitrust', fn: () => lookupHathiTrust(normalizedIsbn) },
    { name: 'hathitrust-10', fn: () => isbn10 ? lookupHathiTrust(isbn10) : Promise.resolve(null) },
    { name: 'librarything', fn: () => lookupLibraryThing(normalizedIsbn) },
    { name: 'librarything-10', fn: () => isbn10 ? lookupLibraryThing(isbn10) : Promise.resolve(null) },
    { name: 'google-arabic', fn: () => isArabicPrefix(normalizedIsbn) ? lookupGoogleBooksArabic(normalizedIsbn) : Promise.resolve(null) },
    { name: 'google-arabic-10', fn: () => (isArabicPrefix(normalizedIsbn) && isbn10) ? lookupGoogleBooksArabic(isbn10) : Promise.resolve(null) },
    // Arabic sources
    { name: 'noor-library', fn: () => isArabicPrefix(normalizedIsbn) ? lookupNoorLibrary(normalizedIsbn) : Promise.resolve(null) },
    { name: 'noor-library-10', fn: () => (isArabicPrefix(normalizedIsbn) && isbn10) ? lookupNoorLibrary(isbn10) : Promise.resolve(null) },
    { name: 'jarir', fn: () => isArabicPrefix(normalizedIsbn) ? lookupJarir(normalizedIsbn) : Promise.resolve(null) },
    { name: 'jarir-10', fn: () => (isArabicPrefix(normalizedIsbn) && isbn10) ? lookupJarir(isbn10) : Promise.resolve(null) },
    { name: 'neel-wa-furat', fn: () => isArabicPrefix(normalizedIsbn) ? lookupNeelWaFurat(normalizedIsbn) : Promise.resolve(null) },
    { name: 'neel-wa-furat-10', fn: () => (isArabicPrefix(normalizedIsbn) && isbn10) ? lookupNeelWaFurat(isbn10) : Promise.resolve(null) },
    { name: 'hindawi', fn: () => isArabicPrefix(normalizedIsbn) ? lookupHindawi(normalizedIsbn) : Promise.resolve(null) },
    { name: 'hindawi-10', fn: () => (isArabicPrefix(normalizedIsbn) && isbn10) ? lookupHindawi(isbn10) : Promise.resolve(null) },
    // French retailer sources
    { name: 'decitre', fn: () => lookupDecitre(normalizedIsbn) },
    { name: 'decitre-10', fn: () => isbn10 ? lookupDecitre(isbn10) : Promise.resolve(null) },
    { name: 'fnac', fn: () => lookupFNAC(normalizedIsbn) },
    { name: 'fnac-10', fn: () => isbn10 ? lookupFNAC(isbn10) : Promise.resolve(null) },
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
        // Classify genre
        if (enriched.categories.length > 0) {
          enriched.genre = classifyGenre(enriched.categories)
        }
        console.log(`[ISBN Lookup] Best result from ${enriched.source} (score: ${resultScore(enriched)}, cover: ${enriched.coverUrl ? 'yes' : 'no'}, genre: ${enriched.genre || 'none'})`)
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

  // Genre classification from merged categories
  if (bestResult.categories.length > 0) {
    bestResult.genre = classifyGenre(bestResult.categories)
  }

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
