import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { lookupISBN, classifyGenre } from '@/lib/isbn-lookup'

// POST /api/books/reclassify - Re-classify all books that have no genre
// Re-fetches book data from ISBN APIs and updates genre field
export async function POST(request: NextRequest) {
  try {
    // Verify admin token
    const authHeader = request.headers.get('x-admin-token')
    if (authHeader !== 'kitibi-admin-token') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { isbn } = body as { isbn?: string }

    if (isbn) {
      // Re-classify a single book
      const book = await db.book.findUnique({ where: { isbn } })
      if (!book) {
        return NextResponse.json({ error: 'Book not found' }, { status: 404 })
      }

      const { result } = await lookupISBN(isbn)
      if (result && result.genre) {
        const updated = await db.book.update({
          where: { isbn },
          data: { genre: result.genre },
        })
        return NextResponse.json({
          success: true,
          book: { id: updated.id, title: updated.title, genre: updated.genre },
          message: `Genre updated to "${result.genre}"`,
        })
      }

      // If no genre found via API, try classifying from description/title
      const textToClassify = [
        book.title,
        book.description || '',
        book.author,
      ].join(' ')

      const guessedGenre = guessGenreFromText(textToClassify)
      if (guessedGenre) {
        const updated = await db.book.update({
          where: { isbn },
          data: { genre: guessedGenre },
        })
        return NextResponse.json({
          success: true,
          book: { id: updated.id, title: updated.title, genre: updated.genre },
          message: `Genre guessed from title/description as "${guessedGenre}"`,
        })
      }

      return NextResponse.json({
        success: false,
        message: 'Could not determine genre for this book',
      })
    }

    // Bulk re-classify: get all books without genre
    const booksWithoutGenre = await db.book.findMany({
      where: { genre: null },
      select: { id: true, isbn: true, title: true, description: true, author: true },
      take: 50, // Process in batches
    })

    if (booksWithoutGenre.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All books already have a genre assigned',
        results: { updated: 0, failed: 0, skipped: 0 },
      })
    }

    let updated = 0
    let failed = 0
    const results: Array<{ isbn: string; title: string; genre: string | null }> = []

    for (const book of booksWithoutGenre) {
      try {
        // Try to look up via ISBN APIs
        const { result: lookupResult } = await lookupISBN(book.isbn)

        let genre: string | null = null

        if (lookupResult && lookupResult.genre) {
          genre = lookupResult.genre
        } else if (lookupResult && lookupResult.categories.length > 0) {
          genre = classifyGenre(lookupResult.categories)
        }

        // Fallback: try to guess from title + description
        if (!genre) {
          const textToClassify = [
            book.title,
            book.description || '',
            book.author,
          ].join(' ')
          genre = guessGenreFromText(textToClassify)
        }

        if (genre) {
          await db.book.update({
            where: { id: book.id },
            data: { genre },
          })
          updated++
          results.push({ isbn: book.isbn, title: book.title, genre })
        } else {
          failed++
          results.push({ isbn: book.isbn, title: book.title, genre: null })
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500))
      } catch (error) {
        console.error(`Error reclassifying ${book.isbn}:`, error)
        failed++
        results.push({ isbn: book.isbn, title: book.title, genre: null })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Re-classified ${booksWithoutGenre.length} books`,
      results: { updated, failed, skipped: 0 },
      details: results,
    })
  } catch (error) {
    console.error('Error in reclassify:', error)
    return NextResponse.json({ error: 'Failed to reclassify books' }, { status: 500 })
  }
}

// Simple genre guessing from text (title, description, author)
function guessGenreFromText(text: string): string | null {
  if (!text || text.length === 0) return null
  const lower = text.toLowerCase()

  const patterns: Array<{ slug: string; keywords: string[] }> = [
    { slug: 'roman', keywords: ['roman', 'novel', 'fiction', 'رواية', 'récit', 'thriller', 'policier', 'mystery', 'fantasy', 'aventure', 'conte', 'nouvelle'] },
    { slug: 'histoire', keywords: ['histoire', 'history', 'تاريخ', 'historique', 'guerre', 'war'] },
    { slug: 'sciences', keywords: ['science', 'physique', 'chimie', 'biologie', 'math', 'علوم', 'nature'] },
    { slug: 'philosophie', keywords: ['philosophie', 'فلسفة', 'philosophy'] },
    { slug: 'religion', keywords: ['religion', 'islam', 'دين', 'coran', 'quran', 'fiqh', 'tafsir', 'spiritual'] },
    { slug: 'poesie', keywords: ['poésie', 'poetry', 'شعر', 'poème'] },
    { slug: 'enfants', keywords: ['enfant', 'children', 'أطفال', 'jeunesse', 'kid'] },
    { slug: 'biographie', keywords: ['biographie', 'biography', 'سيرة', 'mémoires', 'memoirs', 'autobiographie'] },
    { slug: 'education', keywords: ['éducation', 'education', 'تعليم', 'scolaire', 'pédagogie', 'enseignement'] },
    { slug: 'politique', keywords: ['politique', 'politics', 'سياسة', 'gouvernement'] },
    { slug: 'economie', keywords: ['économie', 'economics', 'اقتصاد', 'finance', 'business', 'management'] },
    { slug: 'droit', keywords: ['droit', 'law', 'قانون', 'juridique', 'justice'] },
    { slug: 'medecine', keywords: ['médecine', 'medicine', 'طب', 'santé', 'health', 'medical'] },
    { slug: 'psychologie', keywords: ['psychologie', 'psychology', 'علم نفس', 'psychiatrie'] },
    { slug: 'informatique', keywords: ['informatique', 'computer', 'programmation', 'algorithm', 'حاسوب', 'software'] },
    { slug: 'sociologie', keywords: ['sociologie', 'sociology', 'anthropologie'] },
    { slug: 'lettres', keywords: ['littérature', 'literature', 'أدب', 'linguistique', 'grammaire'] },
  ]

  for (const pattern of patterns) {
    for (const keyword of pattern.keywords) {
      if (lower.includes(keyword)) {
        return pattern.slug
      }
    }
  }

  return null
}
