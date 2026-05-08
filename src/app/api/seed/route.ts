import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// POST /api/seed - Seed the database with initial data
export async function POST() {
  try {
    // Check if data already exists
    const existingCategories = await db.category.count()
    const existingAdmins = await db.admin.count()

    if (existingCategories > 0 && existingAdmins > 0) {
      return NextResponse.json(
        { error: 'Database already seeded. Use db:reset first if you want to re-seed.' },
        { status: 400 }
      )
    }

    // Create default categories
    const categories = await Promise.all([
      db.category.upsert({
        where: { slug: 'livres-arabe' },
        update: {},
        create: {
          slug: 'livres-arabe',
          nameFr: 'Livres en Arabe',
          nameAr: 'كتب عربية',
          nameEn: 'Arabic Books',
        },
      }),
      db.category.upsert({
        where: { slug: 'livres-francais' },
        update: {},
        create: {
          slug: 'livres-francais',
          nameFr: 'Livres en Français',
          nameAr: 'كتب فرنسية',
          nameEn: 'French Books',
        },
      }),
      db.category.upsert({
        where: { slug: 'livres-anglais' },
        update: {},
        create: {
          slug: 'livres-anglais',
          nameFr: 'Livres en Anglais',
          nameAr: 'كتب إنجليزية',
          nameEn: 'English Books',
        },
      }),
    ])

    // Create default admin
    const admin = await db.admin.upsert({
      where: { email: 'admin@kitabi.dz' },
      update: {},
      create: {
        email: 'admin@kitabi.dz',
        password: 'admin123',
        name: 'Admin Kitabi',
      },
    })

    // Create sample books
    const sampleBooks = [
      // Arabic books
      {
        isbn: '978-614-01-1234-1',
        title: 'ألف ليلة وليلة',
        author: 'مجهول',
        description: 'مجموعة من القصص الشعبية العربية التي جُمعت عبر القرون، تُروى على لسان شهرزاد للملك شهريار. تتضمن قصصاً خيالية ومغامرات ساحرة.',
        language: 'ar',
        categorySlug: 'livres-arabe',
        priceSale: 1500,
        pricePrint: 1200,
        margin: 300,
        printDelay: '3-5 jours',
        isDraft: false,
        isPublished: true,
        publisher: 'دار الفكر العربي',
        pageCount: 450,
        publishDate: '2020',
      },
      {
        isbn: '978-614-01-1235-8',
        title: 'مقدمة ابن خلدون',
        author: 'ابن خلدون',
        description: 'كتاب في العلم الاجتماعي والتاريخ، يُعد من أعظم المؤلفات العربية والإسلامية. يتناول نظريات في العمران البشري والاجتماع الإنساني.',
        language: 'ar',
        categorySlug: 'livres-arabe',
        priceSale: 1800,
        pricePrint: 1400,
        margin: 400,
        printDelay: '3-5 jours',
        isDraft: false,
        isPublished: true,
        publisher: 'دار اليقظة',
        pageCount: 600,
        publishDate: '2019',
      },
      {
        isbn: '978-614-01-1236-5',
        title: 'النبي',
        author: 'جبران خليل جبران',
        description: 'كتاب فلسفي شعري يعتبر من أشهر أعمال جبران خليل جبران. يتناول موضوعات الحب والزواج والعمل والموت والحريّة من خلال حكيم يودّع مدينته.',
        language: 'ar',
        categorySlug: 'livres-arabe',
        priceSale: 1200,
        pricePrint: 900,
        margin: 300,
        printDelay: '2-4 jours',
        isDraft: false,
        isPublished: true,
        publisher: 'دار المشرق',
        pageCount: 120,
        publishDate: '2021',
      },
      // French books
      {
        isbn: '978-2-07-036022-8',
        title: 'L\'Étranger',
        author: 'Albert Camus',
        description: 'Roman philosophique d\'Albert Camus, publié en 1942. L\'œuvre met en scène Meursault, un homme ordinaire qui commet un meurtre sans raison apparente, et explore les thèmes de l\'absurde et de l\'aliénation.',
        language: 'fr',
        categorySlug: 'livres-francais',
        priceSale: 1000,
        pricePrint: 700,
        margin: 300,
        printDelay: '3-5 jours',
        isDraft: false,
        isPublished: true,
        publisher: 'Gallimard',
        pageCount: 159,
        publishDate: '1942',
      },
      {
        isbn: '978-2-07-040850-7',
        title: 'Le Petit Prince',
        author: 'Antoine de Saint-Exupéry',
        description: 'Un conte poétique et philosophique sous l\'apparence d\'un conte pour enfants. L\'histoire d\'un petit prince qui voyage de planète en planète, à la recherche de sens et d\'amitié.',
        language: 'fr',
        categorySlug: 'livres-francais',
        priceSale: 900,
        pricePrint: 650,
        margin: 250,
        printDelay: '2-4 jours',
        isDraft: false,
        isPublished: true,
        publisher: 'Gallimard',
        pageCount: 96,
        publishDate: '1943',
      },
      {
        isbn: '978-2-07-036802-6',
        title: 'Les Misérables',
        author: 'Victor Hugo',
        description: 'Roman monumental de Victor Hugo, publié en 1862. L\'histoire de Jean Valjean, un ancien forçat qui tente de se racheter, dans la France du XIXe siècle.',
        language: 'fr',
        categorySlug: 'livres-francais',
        priceSale: 2200,
        pricePrint: 1800,
        margin: 400,
        printDelay: '5-7 jours',
        isDraft: false,
        isPublished: true,
        publisher: 'Gallimard',
        pageCount: 1500,
        publishDate: '1862',
      },
      // English books
      {
        isbn: '978-0-06-112008-4',
        title: 'To Kill a Mockingbird',
        author: 'Harper Lee',
        description: 'A classic novel of racial injustice and childhood innocence in the American South. Through the eyes of young Scout Finch, the story explores themes of empathy, courage, and moral growth.',
        language: 'en',
        categorySlug: 'livres-anglais',
        priceSale: 1300,
        pricePrint: 1000,
        margin: 300,
        printDelay: '3-5 jours',
        isDraft: false,
        isPublished: true,
        publisher: 'HarperCollins',
        pageCount: 281,
        publishDate: '1960',
      },
      {
        isbn: '978-0-7432-7356-5',
        title: 'The Great Gatsby',
        author: 'F. Scott Fitzgerald',
        description: 'A masterful portrait of the Jazz Age, exploring themes of wealth, idealism, and the American Dream through the tragic story of Jay Gatsby and his love for Daisy Buchanan.',
        language: 'en',
        categorySlug: 'livres-anglais',
        priceSale: 1100,
        pricePrint: 800,
        margin: 300,
        printDelay: '3-5 jours',
        isDraft: false,
        isPublished: true,
        publisher: 'Scribner',
        pageCount: 180,
        publishDate: '1925',
      },
      {
        isbn: '978-0-14-028329-7',
        title: '1984',
        author: 'George Orwell',
        description: 'A dystopian novel set in a totalitarian society ruled by Big Brother. The story follows Winston Smith as he begins to question the oppressive regime and seeks freedom of thought.',
        language: 'en',
        categorySlug: 'livres-anglais',
        priceSale: 1200,
        pricePrint: 900,
        margin: 300,
        printDelay: '3-5 jours',
        isDraft: false,
        isPublished: true,
        publisher: 'Penguin Books',
        pageCount: 328,
        publishDate: '1949',
      },
      // Draft books
      {
        isbn: '978-2-07-041239-9',
        title: 'La Peste',
        author: 'Albert Camus',
        description: 'Roman d\'Albert Camus publié en 1947. L\'histoire d\'une épidémie de peste dans la ville d\'Oran, en Algérie.',
        language: 'fr',
        categorySlug: 'livres-francais',
        priceSale: 1100,
        pricePrint: 800,
        margin: 300,
        printDelay: '3-5 jours',
        isDraft: true,
        isPublished: false,
        publisher: 'Gallimard',
        pageCount: 308,
        publishDate: '1947',
      },
    ]

    const createdBooks = []
    for (const bookData of sampleBooks) {
      const book = await db.book.create({ data: bookData })
      createdBooks.push(book)
    }

    return NextResponse.json({
      message: 'Database seeded successfully',
      data: {
        categories: categories.length,
        admin: admin.email,
        books: createdBooks.length,
      },
    })
  } catch (error) {
    console.error('Error seeding database:', error)
    return NextResponse.json(
      { error: 'Failed to seed database', details: String(error) },
      { status: 500 }
    )
  }
}
