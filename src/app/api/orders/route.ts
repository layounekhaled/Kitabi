import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// Helper to check admin access
function isAdmin(request: NextRequest): boolean {
  const authHeader = request.headers.get('x-admin-token')
  return authHeader === 'kitabi-admin-token'
}

// Generate unique order number: KIT-YYYYMMDD-XXXX
async function generateOrderNumber(): Promise<string> {
  const now = new Date()
  const dateStr = now.getFullYear().toString() +
    (now.getMonth() + 1).toString().padStart(2, '0') +
    now.getDate().toString().padStart(2, '0')

  // Find how many orders exist today to get the sequence number
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)

  const todayOrders = await db.order.count({
    where: {
      createdAt: {
        gte: todayStart,
        lt: todayEnd,
      },
    },
  })

  const sequence = (todayOrders + 1).toString().padStart(4, '0')
  return `KIT-${dateStr}-${sequence}`
}

// GET /api/orders - List all orders (admin) with pagination and status filter
export async function GET(request: NextRequest) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (status) {
      where.status = status
    }

    const [orders, total] = await Promise.all([
      db.order.findMany({
        where,
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
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      db.order.count({ where }),
    ])

    return NextResponse.json({
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching orders:', error)
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}

// POST /api/orders - Create new order
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { fullName, phone, wilaya, commune, address, note, items } = body

    // Validate required fields
    if (!fullName || !phone || !wilaya || !commune || !address) {
      return NextResponse.json(
        { error: 'fullName, phone, wilaya, commune, and address are required' },
        { status: 400 }
      )
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'At least one item is required' },
        { status: 400 }
      )
    }

    // Validate that all books exist and are available
    const bookIds = items.map((item: { bookId: string }) => item.bookId)
    const books = await db.book.findMany({
      where: {
        id: { in: bookIds },
        isAvailable: true,
        isPublished: true,
      },
    })

    if (books.length !== bookIds.length) {
      const foundIds = books.map(b => b.id)
      const missingIds = bookIds.filter((id: string) => !foundIds.includes(id))
      return NextResponse.json(
        {
          error: 'Some books are not available or not found',
          missingBookIds: missingIds,
        },
        { status: 400 }
      )
    }

    // Calculate total amount
    let totalAmount = 0
    const orderItems = items.map((item: { bookId: string; quantity?: number }) => {
      const book = books.find(b => b.id === item.bookId)!
      const quantity = item.quantity || 1
      const unitPrice = book.priceSale || book.pricePrint || 0
      totalAmount += unitPrice * quantity

      return {
        bookId: item.bookId,
        quantity,
        unitPrice,
      }
    })

    // Generate unique order number
    const orderNumber = await generateOrderNumber()

    // Create order with items in a transaction
    const order = await db.order.create({
      data: {
        orderNumber,
        fullName,
        phone,
        wilaya,
        commune,
        address,
        note: note || null,
        totalAmount,
        items: {
          create: orderItems,
        },
      },
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

    return NextResponse.json({ order }, { status: 201 })
  } catch (error) {
    console.error('Error creating order:', error)
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    )
  }
}
