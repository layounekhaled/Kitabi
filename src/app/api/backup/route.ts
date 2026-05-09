import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { execSync } from 'child_process'
import { existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'fs'
import { join } from 'path'

// Helper to check admin access
function isAdmin(request: NextRequest): boolean {
  const authHeader = request.headers.get('x-admin-token')
  return authHeader === 'kitabi-admin-token'
}

const BACKUP_DIR = join(process.cwd(), 'backups')

async function createBackup() {
  try {
    if (!existsSync(BACKUP_DIR)) {
      mkdirSync(BACKUP_DIR, { recursive: true })
    }

    const now = new Date()
    const date = now.toISOString().replace(/[:.]/g, '-').split('T')[0]
    const time = now.toISOString().replace(/[:.]/g, '-').split('T')[1].split('.')[0]
    const filename = `kitabi-backup-${date}_${time}.sql`
    const filepath = join(BACKUP_DIR, filename)

    // Get counts
    const [books, orders, admins] = await Promise.all([
      db.book.count(),
      db.order.count(),
      db.admin.count(),
    ])

    const dbUrl = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL
    if (!dbUrl) {
      throw new Error('DATABASE_URL non configurée')
    }

    execSync(
      `pg_dump "${dbUrl}" --no-owner --no-privileges --format=plain > "${filepath}"`,
      { stdio: 'pipe' }
    )

    const sizeMB = (statSync(filepath).size / (1024 * 1024)).toFixed(2)

    // Clean old backups (keep last 10)
    if (existsSync(BACKUP_DIR)) {
      const files = readdirSync(BACKUP_DIR)
        .filter(f => f.startsWith('kitabi-backup-') && f.endsWith('.sql'))
        .sort().reverse()
      if (files.length > 10) {
        files.slice(10).forEach(f => unlinkSync(join(BACKUP_DIR, f)))
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Backup créé avec succès',
      filename,
      size: `${sizeMB} Mo`,
      stats: { books, orders, admins },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// GET /api/backup - List existing backups or trigger one
export async function GET(request: NextRequest) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const action = new URL(request.url).searchParams.get('action')

    // If action=backup, trigger a backup
    if (action === 'backup') {
      return createBackup()
    }

    // Otherwise list existing backups
    if (!existsSync(BACKUP_DIR)) {
      return NextResponse.json({ backups: [], message: 'Aucun backup trouvé' })
    }

    const files = readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('kitabi-backup-') && f.endsWith('.sql'))
      .sort()
      .reverse()

    const backups = files.map(f => {
      const stats = statSync(join(BACKUP_DIR, f))
      return {
        filename: f,
        size: (stats.size / (1024 * 1024)).toFixed(2) + ' Mo',
        created: stats.mtime.toISOString(),
      }
    })

    return NextResponse.json({ backups })
  } catch (error: any) {
    console.error('Backup error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/backup - Trigger backup
export async function POST(request: NextRequest) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return createBackup()
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
