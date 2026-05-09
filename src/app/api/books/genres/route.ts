import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const genreCounts = await db.book.groupBy({
      by: ['genre'],
      where: {
        genre: { not: null },
        isPublished: true,
        isDraft: false,
      },
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
