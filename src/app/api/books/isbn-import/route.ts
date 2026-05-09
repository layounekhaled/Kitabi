import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { lookupISBN, normalizeIsbn } from '@/lib/isbn-lookup'

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
      const cleanIsbn = rawIsbn.replace(/[-\s]/g, '')
      const normalizedIsbn = normalizeIsbn(cleanIsbn)

      try {
        // Check if already exists (by normalized ISBN)
        const existing = await db.book.findUnique({ where: { isbn: normalizedIsbn } })
        if (existing) {
          duplicates.push({ isbn: cleanIsbn, title: existing.title })
          continue
        }

        // Look up via APIs
        const { result: lookupResult, warning } = await lookupISBN(cleanIsbn)
        if (!lookupResult) {
          notFound.push(cleanIsbn)
          continue
        }

        // Auto-calculate prices based on page count (only if pages found in lookup)
        // Prix d'achat = (pages × 2.5 DA) + 200 DA (couverture)
        // Marge = 800 DA fixe
        // Prix de vente = prix d'achat + marge = (pages × 2.5) + 1000 DA
        const hasRealPages = !!lookupResult.pageCount && lookupResult.pageCount > 0
        const pages = lookupResult.pageCount || 300 // default 300 pages if unknown
        const pricePurchase = Math.round((pages * 2.5) + 200) // prix d'achat
        const margin = 800 // marge fixe
        const priceSale = pricePurchase + margin // prix de vente

        // Auto-publish ONLY if we have BOTH cover URL AND real page count from lookup
        // Otherwise keep as draft (brouillon)
        const hasCover = !!lookupResult.coverUrl
        const autoPublish = hasCover && hasRealPages

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
            genre: lookupResult.genre,
            priceSale,
            pricePrint: pricePurchase,
            margin,
            isDraft: !autoPublish,
            isPublished: autoPublish,
            isAvailable: autoPublish,
          },
        })

        imported.push({
          isbn: cleanIsbn,
          title: book.title,
          id: book.id,
          published: autoPublish,
        })

        // Log warnings if any
        if (warning) {
          console.warn(`ISBN ${cleanIsbn}: ${warning}`)
        }
      } catch (error) {
        console.error(`Error importing ISBN ${cleanIsbn}:`, error)
        errors.push({ isbn: cleanIsbn, error: 'Failed to import' })
      }
    }

    const publishedCount = imported.filter(b => b.published).length
    const draftCount = imported.filter(b => !b.published).length

    return NextResponse.json({
      imported,
      duplicates,
      notFound,
      errors,
      summary: {
        total: isbns.length,
        imported: imported.length,
        published: publishedCount,
        drafts: draftCount,
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
