import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// Helper to check admin access
function isAdmin(request: NextRequest): boolean {
  const authHeader = request.headers.get('x-admin-token')
  return authHeader === 'kitabi-admin-token'
}

// GET /api/books/[id] - Get single book by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const book = await db.book.findUnique({
      where: { id },
      include: { category: true },
    })

    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 })
    }

    return NextResponse.json({ book })
  } catch (error) {
    console.error('Error fetching book:', error)
    return NextResponse.json(
      { error: 'Failed to fetch book' },
      { status: 500 }
    )
  }
}

// PUT /api/books/[id] - Update book (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    // Check if book exists
    const existing = await db.book.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 })
    }

    // If ISBN is being changed, check for uniqueness
    if (body.isbn && body.isbn !== existing.isbn) {
      const isbnExists = await db.book.findUnique({ where: { isbn: body.isbn } })
      if (isbnExists) {
        return NextResponse.json(
          { error: 'A book with this ISBN already exists' },
          { status: 409 }
        )
      }
    }

    // Build update data - only include fields that are provided
    const updateData: Record<string, unknown> = {}
    const allowedFields = [
      'isbn', 'title', 'author', 'description', 'coverUrl', 'publisher',
      'pageCount', 'language', 'publishDate', 'categorySlug', 'priceSale',
      'pricePrint', 'margin', 'printDelay', 'isAvailable', 'isDraft',
      'isPublished', 'socialPublished',
    ]

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    const book = await db.book.update({
      where: { id },
      data: updateData,
      include: { category: true },
    })

    return NextResponse.json({ book })
  } catch (error) {
    console.error('Error updating book:', error)
    return NextResponse.json(
      { error: 'Failed to update book' },
      { status: 500 }
    )
  }
}

// DELETE /api/books/[id] - Delete book (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Check if book exists
    const existing = await db.book.findUnique({
      where: { id },
      include: { orderItems: true },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 })
    }

    // Check if book has associated order items
    if (existing.orderItems.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete book with associated orders. Consider marking it as unavailable instead.' },
        { status: 400 }
      )
    }

    await db.book.delete({ where: { id } })

    return NextResponse.json({ message: 'Book deleted successfully' })
  } catch (error) {
    console.error('Error deleting book:', error)
    return NextResponse.json(
      { error: 'Failed to delete book' },
      { status: 500 }
    )
  }
}
