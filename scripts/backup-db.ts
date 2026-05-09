/**
 * Kitabi - Script de backup de la base de données
 *
 * Utilisation :
 *   npm run backup              → Backup dans /backups/
 *   npm run backup:restore      → Restaure le dernier backup
 *
 * Les backups sont sauvegardés dans /backups/ avec la date
 * Seuls les 10 derniers backups sont conservés
 */

import { PrismaClient } from '@prisma/client'
import { execSync } from 'child_process'
import { existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'fs'
import { join } from 'path'

const prisma = new PrismaClient()
const BACKUP_DIR = join(process.cwd(), 'backups')

function getBackupFilename(): string {
  const now = new Date()
  const date = now.toISOString().replace(/[:.]/g, '-').split('T')[0]
  const time = now.toISOString().replace(/[:.]/g, '-').split('T')[1].split('.')[0]
  return `kitabi-backup-${date}_${time}.sql`
}

async function backup() {
  try {
    if (!existsSync(BACKUP_DIR)) {
      mkdirSync(BACKUP_DIR, { recursive: true })
    }

    const filename = getBackupFilename()
    const filepath = join(BACKUP_DIR, filename)

    const [books, orders, admins] = await Promise.all([
      prisma.book.count(),
      prisma.order.count(),
      prisma.admin.count(),
    ])

    const dbUrl = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL
    if (!dbUrl) {
      throw new Error('DATABASE_URL ou DATABASE_URL_UNPOOLED non trouvé')
    }

    console.log('📦 Backup en cours...')
    console.log(`   Livres: ${books}`)
    console.log(`   Commandes: ${orders}`)
    console.log(`   Admins: ${admins}`)

    execSync(
      `pg_dump "${dbUrl}" --no-owner --no-privileges --format=plain > "${filepath}"`,
      { stdio: 'pipe' }
    )

    const sizeMB = (statSync(filepath).size / (1024 * 1024)).toFixed(2)

    console.log(`\n✅ Backup réussi !`)
    console.log(`   Fichier: ${filepath}`)
    console.log(`   Taille: ${sizeMB} Mo`)

    // Nettoyer les anciens backups (garder les 10 derniers)
    cleanOldBackups(10)

  } catch (error: any) {
    console.error('❌ Erreur lors du backup:', error.message)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

function cleanOldBackups(keep: number) {
  if (!existsSync(BACKUP_DIR)) return

  const files = readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('kitabi-backup-') && f.endsWith('.sql'))
    .sort()
    .reverse()

  if (files.length > keep) {
    const toDelete = files.slice(keep)
    for (const file of toDelete) {
      unlinkSync(join(BACKUP_DIR, file))
      console.log(`   🗑️ Supprimé: ${file}`)
    }
  }
}

async function restore() {
  try {
    if (!existsSync(BACKUP_DIR)) {
      console.error('❌ Aucun répertoire de backup trouvé')
      process.exit(1)
    }

    const files = readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('kitabi-backup-') && f.endsWith('.sql'))
      .sort()
      .reverse()

    if (files.length === 0) {
      console.error('❌ Aucun backup trouvé')
      process.exit(1)
    }

    const latestFile = files[0]
    const filepath = join(BACKUP_DIR, latestFile)

    console.log(`⚠️  RESTAURATION du backup: ${latestFile}`)

    const dbUrl = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL
    if (!dbUrl) {
      throw new Error('DATABASE_URL non trouvé')
    }

    execSync(`psql "${dbUrl}" < "${filepath}"`, { stdio: 'inherit' })

    console.log('\n✅ Restauration réussie !')

  } catch (error: any) {
    console.error('❌ Erreur lors de la restauration:', error.message)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

const mode = process.argv[2]
if (mode === '--restore') {
  restore()
} else {
  backup()
}
