import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const language = searchParams.get('language') || undefined

    const where: Record<string, unknown> = {
      genre: { not: null },
      isPublished: true,
      isDraft: false,
    }

    if (language) {
      where.language = language
    }

    const genreCounts = await db.book.groupBy({
      by: ['genre'],
      where,
      _count: { genre: true },
    })

    const genres = genreCounts
      .filter(g => g.genre)
      .map(g => ({ genre: g.genre, count: g._count.genre }))
      .sort((a, b) => b.count - a.count)

    return NextResponse.json({ genres })
  } catch (error) {
    console.error('Error fetching genres:', error)
    return NextResponse.json({ genres: [] })
  }
}
