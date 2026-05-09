'use client'

import { useRouterStore } from '@/stores/router-store'
import { Header } from '@/components/client/header'
import { Footer } from '@/components/client/footer'
import { HomePage } from '@/components/client/home-page'
import { CatalogPage } from '@/components/client/catalog-page'
import { GenresPage } from '@/components/client/genres-page'
import { BookDetailPage } from '@/components/client/book-detail-page'
import { CartPage } from '@/components/client/cart-page'
import { CheckoutPage } from '@/components/client/checkout-page'
import { OrderSuccessPage } from '@/components/client/order-success-page'
import AdminLogin from '@/components/admin/admin-login'
import AdminLayout from '@/components/admin/admin-layout'
import AdminDashboard from '@/components/admin/admin-dashboard'
import AdminBooks from '@/components/admin/admin-books'
import AdminOrders from '@/components/admin/admin-orders'
import AdminCategories from '@/components/admin/admin-categories'
import AdminImport from '@/components/admin/admin-import'
import AdminSocial from '@/components/admin/admin-social'

function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}

export default function Home() {
  const currentPage = useRouterStore((s) => s.currentPage)

  // Admin login has its own standalone layout
  if (currentPage === 'adminLogin') {
    return <AdminLogin />
  }

  // Admin pages get their own layout (no header/footer)
  const isAdminPage = [
    'admin',
    'adminBooks',
    'adminOrders',
    'adminCategories',
    'adminImport',
    'adminSocial',
  ].includes(currentPage)

  if (isAdminPage) {
    const renderAdminPage = () => {
      switch (currentPage) {
        case 'admin':
          return <AdminDashboard />
        case 'adminBooks':
          return <AdminBooks />
        case 'adminOrders':
          return <AdminOrders />
        case 'adminCategories':
          return <AdminCategories />
        case 'adminImport':
          return <AdminImport />
        case 'adminSocial':
          return <AdminSocial />
        default:
          return <AdminDashboard />
      }
    }

    return <AdminLayout>{renderAdminPage()}</AdminLayout>
  }

  // Client pages with header/footer
  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage />
      case 'catalog':
        return <CatalogPage />
      case 'genres':
        return <GenresPage />
      case 'bookDetail':
        return <BookDetailPage />
      case 'cart':
        return <CartPage />
      case 'checkout':
        return <CheckoutPage />
      case 'orderSuccess':
        return <OrderSuccessPage />
      default:
        return <HomePage />
    }
  }

  return <ClientLayout>{renderPage()}</ClientLayout>
}
