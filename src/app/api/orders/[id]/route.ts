import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// Helper to check admin access
function isAdmin(request: NextRequest): boolean {
  const authHeader = request.headers.get('x-admin-token')
  return authHeader === 'kitabi-admin-token'
}

const VALID_STATUSES = [
  'nouvelle',
  'confirmee',
  'en_impression',
  'prete_a_livrer',
  'expediee',
  'livree',
  'annulee',
]

// GET /api/orders/[id] - Get single order with items and book details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const order = await db.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            book: {
              select: {
                id: true,
                title: true,
                author: true,
                coverUrl: true,
                isbn: true,
                language: true,
              },
            },
          },
        },
      },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    return NextResponse.json({ order })
  } catch (error) {
    console.error('Error fetching order:', error)
    return NextResponse.json(
      { error: 'Failed to fetch order' },
      { status: 500 }
    )
  }
}

// PUT /api/orders/[id] - Update order status (admin only)
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
    const { status } = body

    if (!status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      )
    }

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Valid statuses: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      )
    }

    // Check if order exists
    const existing = await db.order.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const order = await db.order.update({
      where: { id },
      data: { status },
      include: {
        items: {
          include: {
            book: {
              select: {
                id: true,
                title: true,
                author: true,
                coverUrl: true,
              },
            },
          },
        },
      },
    })

    return NextResponse.json({ order })
  } catch (error) {
    console.error('Error updating order:', error)
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    )
  }
}
