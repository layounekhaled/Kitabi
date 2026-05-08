import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// Helper to check admin access
function isAdmin(request: NextRequest): boolean {
  const authHeader = request.headers.get('x-admin-token')
  return authHeader === 'kitabi-admin-token'
}

// GET /api/stats - Dashboard stats
export async function GET(request: NextRequest) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Run all queries in parallel for better performance
    const [
      totalBooks,
      publishedBooks,
      draftBooks,
      totalOrders,
      ordersByStatus,
      deliveredOrders,
      recentOrders,
    ] = await Promise.all([
      // Total books
      db.book.count(),

      // Published books
      db.book.count({ where: { isPublished: true, isDraft: false } }),

      // Draft books
      db.book.count({ where: { isDraft: true } }),

      // Total orders
      db.order.count(),

      // Orders by status
      db.order.groupBy({
        by: ['status'],
        _count: { status: true },
      }),

      // Delivered orders for revenue calculation
      db.order.findMany({
        where: { status: 'livree' },
        select: { totalAmount: true },
      }),

      // Recent orders
      db.order.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          items: {
            include: {
              book: {
                select: {
                  title: true,
                  coverUrl: true,
                },
              },
            },
          },
        },
      }),
    ])

    // Calculate revenue
    const revenue = deliveredOrders.reduce((sum, order) => sum + order.totalAmount, 0)

    // Format orders by status
    const ordersByStatusMap: Record<string, number> = {}
    for (const entry of ordersByStatus) {
      ordersByStatusMap[entry.status] = entry._count.status
    }

    return NextResponse.json({
      books: {
        total: totalBooks,
        published: publishedBooks,
        draft: draftBooks,
      },
      orders: {
        total: totalOrders,
        byStatus: ordersByStatusMap,
      },
      revenue,
      recentOrders,
    })
  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}
