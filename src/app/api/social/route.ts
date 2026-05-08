import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// Helper to check admin access
function isAdmin(request: NextRequest): boolean {
  const authHeader = request.headers.get('x-admin-token')
  return authHeader === 'kitabi-admin-token'
}

// Generate marketing content based on book data
function generateMarketingContent(
  book: {
    title: string
    author: string
    description: string | null
    language: string
    priceSale: number | null
    pricePrint: number | null
    pageCount: number | null
  },
  platform: string
): string {
  const isInstagram = platform === 'instagram'
  const isArabic = book.language === 'ar'

  if (isArabic) {
    const emoji = isInstagram ? '📚✨' : '📖'
    const price = book.priceSale
      ? `${book.priceSale} د.ج`
      : book.pricePrint
        ? `${book.pricePrint} د.ج`
        : ''

    let content = `${emoji} كتاب جديد متوفر!\n\n`
    content += `📕 "${book.title}"\n`
    content += `✍️ ${book.author}\n`
    if (book.pageCount) content += `📄 ${book.pageCount} صفحة\n`
    if (price) content += `💰 السعر: ${price}\n`
    content += `\n🚚 التوصيل لجميع الولايات\n`
    if (isInstagram) content += `\n#كتب_عربية #قراءة #كتاب_جديد #كتابي #طباعة_حسب_الطلب`
    return content
  }

  const emoji = isInstagram ? '📚✨' : '📖'
  const price = book.priceSale
    ? `${book.priceSale} DA`
    : book.pricePrint
      ? `${book.pricePrint} DA`
      : ''

  const langLabel = book.language === 'fr' ? 'Nouveau livre disponible !' : 'New book available!'

  let content = `${emoji} ${langLabel}\n\n`
  content += `📕 "${book.title}"\n`
  content += `✍️ ${book.author}\n`
  if (book.pageCount) content += `📄 ${book.pageCount} pages\n`
  if (price) content += `💰 Prix: ${price}\n`
  content += `\n🚚 Livraison dans toutes les wilayas\n`
  if (isInstagram) content += `\n#kitabi #livres #lecture #impressionsàlademande #algérie`

  return content
}

// GET /api/social - List social posts
export async function GET(request: NextRequest) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const platform = searchParams.get('platform')
    const status = searchParams.get('status')

    const where: Record<string, unknown> = {}
    if (platform) where.platform = platform
    if (status) where.status = status

    const posts = await db.socialPost.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        // We can't directly include book relation since bookId is optional
        // We'll manually look up the book
      },
    })

    // Enrich with book data
    const enrichedPosts = await Promise.all(
      posts.map(async (post) => {
        if (post.bookId) {
          const book = await db.book.findUnique({
            where: { id: post.bookId },
            select: { id: true, title: true, author: true, coverUrl: true },
          })
          return { ...post, book }
        }
        return { ...post, book: null }
      })
    )

    return NextResponse.json({ posts: enrichedPosts })
  } catch (error) {
    console.error('Error fetching social posts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch social posts' },
      { status: 500 }
    )
  }
}

// POST /api/social - Create a social post
export async function POST(request: NextRequest) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { bookId, platform, content, imageUrl, scheduledAt, autoGenerate } = body

    if (!platform) {
      return NextResponse.json(
        { error: 'Platform is required (facebook or instagram)' },
        { status: 400 }
      )
    }

    let finalContent = content
    let finalImageUrl = imageUrl || null

    // Auto-generate marketing content if requested
    if (autoGenerate && bookId) {
      const book = await db.book.findUnique({
        where: { id: bookId },
        select: {
          title: true,
          author: true,
          description: true,
          language: true,
          priceSale: true,
          pricePrint: true,
          pageCount: true,
          coverUrl: true,
        },
      })

      if (!book) {
        return NextResponse.json(
          { error: 'Book not found' },
          { status: 404 }
        )
      }

      finalContent = finalContent || generateMarketingContent(book, platform)
      finalImageUrl = finalImageUrl || book.coverUrl

      // Mark book as social published
      await db.book.update({
        where: { id: bookId },
        data: { socialPublished: true },
      })
    }

    if (!finalContent) {
      return NextResponse.json(
        { error: 'Content is required (provide content or use autoGenerate with a bookId)' },
        { status: 400 }
      )
    }

    const post = await db.socialPost.create({
      data: {
        bookId: bookId || null,
        platform,
        content: finalContent,
        imageUrl: finalImageUrl,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        status: scheduledAt ? 'programmee' : 'brouillon',
      },
    })

    return NextResponse.json({ post }, { status: 201 })
  } catch (error) {
    console.error('Error creating social post:', error)
    return NextResponse.json(
      { error: 'Failed to create social post' },
      { status: 500 }
    )
  }
}
