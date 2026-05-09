import { NextRequest, NextResponse } from 'next/server'
import { lookupISBN } from '@/lib/isbn-lookup'

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

    // Use the shared lookup function with a 25s timeout
    const lookupPromise = lookupISBN(cleanIsbn)
    const timeoutPromise = new Promise<{ result: null; warning?: string }>((resolve) => {
      setTimeout(() => resolve({ result: null, warning: 'Recherche expirée (délai de 25s dépassé)' }), 25000)
    })

    const { result, warning } = await Promise.race([lookupPromise, timeoutPromise])

    if (!result) {
      if (warning) {
        return NextResponse.json(
          { error: warning, isbn: cleanIsbn },
          { status: 400 }
        )
      }
      return NextResponse.json(
        { error: 'Livre introuvable dans les bases de données externes', isbn: cleanIsbn },
        { status: 404 }
      )
    }

    // Auto-calculate prices based on page count
    // Prix d'achat = (pages × 2.5 DA) + 200 DA (couverture)
    // Marge = 800 DA fixe
    // Prix de vente = prix d'achat + marge = (pages × 2.5) + 1000 DA
    const pages = result.pageCount || 300 // default 300 pages if unknown
    const pricePurchase = Math.round((pages * 2.5) + 200)
    const margin = 800
    const priceSale = pricePurchase + margin

    const response: Record<string, unknown> = {
      book: result,
      pricing: {
        pageCount: pages,
        pricePurchase,
        margin,
        priceSale,
      },
    }
    if (warning) {
      response.warning = warning
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error looking up ISBN:', error)
    return NextResponse.json(
      { error: 'Failed to look up ISBN' },
      { status: 500 }
    )
  }
}
