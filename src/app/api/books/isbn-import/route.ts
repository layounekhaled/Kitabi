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

        imported.push({
          isbn: cleanIsbn,
          title: book.title,
          id: book.id,
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
