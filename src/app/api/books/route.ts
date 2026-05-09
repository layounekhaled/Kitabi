import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// Helper to check admin access
function isAdmin(request: NextRequest): boolean {
  const authHeader = request.headers.get('x-admin-token')
  return authHeader === 'kitabi-admin-token'
}

// GET /api/books - List published books with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const language = searchParams.get('language')
    const category = searchParams.get('category')
    const genre = searchParams.get('genre')
    const search = searchParams.get('search')
    const minPrice = searchParams.get('minPrice')
    const maxPrice = searchParams.get('maxPrice')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '12')
    const includeDrafts = searchParams.get('includeDrafts') === 'true' && isAdmin(request)
    const filterIsPublished = searchParams.get('isPublished')
    const filterIsDraft = searchParams.get('isDraft')

    const skip = (page - 1) * limit

    // Build where clause
    const where: Record<string, unknown> = {}

    if (!includeDrafts) {
      where.isPublished = true
      where.isDraft = false
    }

    // Admin status filters (only when includeDrafts is true)
    if (includeDrafts && filterIsPublished === 'true') {
      where.isPublished = true
    }
    if (includeDrafts && filterIsDraft === 'true') {
      where.isDraft = true
    }

    if (language) {
      where.language = language
    }

    if (category) {
      where.categorySlug = category
    }

    if (genre) {
      where.genre = genre
    }

    if (search) {
      // SQLite LIKE is case-insensitive for ASCII by default
      where.OR = [
        { title: { contains: search } },
        { author: { contains: search } },
        { isbn: { contains: search } },
      ]
    }

    if (minPrice || maxPrice) {
      where.priceSale = {}
      if (minPrice) where.priceSale.gte = parseFloat(minPrice)
      if (maxPrice) where.priceSale.lte = parseFloat(maxPrice)
    }

    const [books, total] = await Promise.all([
      db.book.findMany({
        where,
        include: { category: true },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      db.book.count({ where }),
    ])

    return NextResponse.json({
      books,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching books:', error)
    return NextResponse.json(
      { error: 'Failed to fetch books' },
      { status: 500 }
    )
  }
}

// POST /api/books - Create a new book (admin only)
export async function POST(request: NextRequest) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      isbn,
      title,
      author,
      description,
      coverUrl,
      publisher,
      pageCount,
      language,
      publishDate,
      categorySlug,
      priceSale,
      pricePrint,
      margin,
      printDelay,
      isAvailable,
      isDraft,
      isPublished,
    } = body

    // Validate required fields
    if (!isbn || !title || !author || !language) {
      return NextResponse.json(
        { error: 'ISBN, title, author, and language are required' },
        { status: 400 }
      )
    }

    // Check if ISBN already exists
    const existing = await db.book.findUnique({ where: { isbn } })
    if (existing) {
      return NextResponse.json(
        { error: 'A book with this ISBN already exists' },
        { status: 409 }
      )
    }

    const book = await db.book.create({
      data: {
        isbn,
        title,
        author,
        description: description || null,
        coverUrl: coverUrl || null,
        publisher: publisher || null,
        pageCount: pageCount || null,
        language,
        publishDate: publishDate || null,
        categorySlug: categorySlug || null,
        priceSale: priceSale || null,
        pricePrint: pricePrint || null,
        margin: margin || null,
        printDelay: printDelay || null,
        isAvailable: isAvailable ?? true,
        isDraft: isDraft ?? true,
        isPublished: isPublished ?? false,
      },
      include: { category: true },
    })

    return NextResponse.json({ book }, { status: 201 })
  } catch (error) {
    console.error('Error creating book:', error)
    return NextResponse.json(
      { error: 'Failed to create book' },
      { status: 500 }
    )
  }
}
