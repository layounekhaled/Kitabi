/**
 * Kitabi - Script de seed
 * Crée les données initiales : admin par défaut + catégories
 *
 * Utilisation : npm run db:seed
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Admin par défaut
  const adminEmail = 'admin@kitabi.dz'
  const existingAdmin = await prisma.admin.findUnique({ where: { email: adminEmail } })

  if (!existingAdmin) {
    const bcrypt = await import('bcryptjs')
    const hashedPassword = await bcrypt.hash('admin123', 10)

    await prisma.admin.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        name: 'Admin Kitabi',
      },
    })
    console.log('✅ Admin par défaut créé (admin@kitabi.dz / admin123)')
  } else {
    console.log('⏭️ Admin existe déjà')
  }

  // Catégories par défaut
  const categories = [
    { nameFr: 'Roman', nameAr: 'رواية', nameEn: 'Novel', slug: 'roman' },
    { nameFr: 'Histoire', nameAr: 'تاريخ', nameEn: 'History', slug: 'histoire' },
    { nameFr: 'Science', nameAr: 'علوم', nameEn: 'Science', slug: 'science' },
    { nameFr: 'Religion', nameAr: 'دين', nameEn: 'Religion', slug: 'religion' },
    { nameFr: 'Philosophie', nameAr: 'فلسفة', nameEn: 'Philosophy', slug: 'philosophie' },
    { nameFr: 'Enfants', nameAr: 'أطفال', nameEn: 'Children', slug: 'enfants' },
    { nameFr: 'Éducation', nameAr: 'تعليم', nameEn: 'Education', slug: 'education' },
    { nameFr: 'Poésie', nameAr: 'شعر', nameEn: 'Poetry', slug: 'poesie' },
    { nameFr: 'Informatique', nameAr: 'معلوماتية', nameEn: 'Computer Science', slug: 'informatique' },
    { nameFr: 'Économie', nameAr: 'اقتصاد', nameEn: 'Economics', slug: 'economie' },
    { nameFr: 'Art', nameAr: 'فن', nameEn: 'Art', slug: 'art' },
    { nameFr: 'Santé', nameAr: 'صحة', nameEn: 'Health', slug: 'sante' },
    { nameFr: 'Cuisine', nameAr: 'طبخ', nameEn: 'Cooking', slug: 'cuisine' },
    { nameFr: 'Voyage', nameAr: 'سفر', nameEn: 'Travel', slug: 'voyage' },
    { nameFr: 'Biographie', nameAr: 'سيرة ذاتية', nameEn: 'Biography', slug: 'biographie' },
    { nameFr: 'Sport', nameAr: 'رياضة', nameEn: 'Sports', slug: 'sport' },
  ]

  let created = 0
  for (const cat of categories) {
    const existing = await prisma.category.findUnique({ where: { slug: cat.slug } })
    if (!existing) {
      await prisma.category.create({ data: cat })
      created++
    }
  }
  console.log(`✅ ${created} catégorie(s) créée(s)`)

  console.log('🎉 Seed terminé !')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
