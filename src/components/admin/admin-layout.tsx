'use client'

import { useState, useEffect } from 'react'
import { useRouterStore, type PageName } from '@/stores/router-store'
import { useTranslation } from '@/lib/i18n'
import { getAdminInfo, logoutAdmin, isAdminLoggedIn } from '@/lib/admin-auth'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import {
  LayoutDashboard,
  BookOpen,
  ShoppingCart,
  FolderOpen,
  Import,
  Share2,
  LogOut,
  Menu,
  BookMarked,
} from 'lucide-react'

interface AdminLayoutProps {
  children: React.ReactNode
}

const NAV_ITEMS: { page: PageName; icon: React.ElementType; labelKey: string }[] = [
  { page: 'admin', icon: LayoutDashboard, labelKey: 'dashboard' },
  { page: 'adminBooks', icon: BookOpen, labelKey: 'manageBooks' },
  { page: 'adminOrders', icon: ShoppingCart, labelKey: 'manageOrders' },
  { page: 'adminCategories', icon: FolderOpen, labelKey: 'manageCategories' },
  { page: 'adminImport', icon: Import, labelKey: 'importISBN' },
  { page: 'adminSocial', icon: Share2, labelKey: 'socialMedia' },
]

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation()
  const currentPage = useRouterStore((s) => s.currentPage)
  const navigate = useRouterStore((s) => s.navigate)
  const adminInfo = getAdminInfo()

  const handleNav = (page: PageName) => {
    navigate(page)
    onNavigate?.()
  }

  const handleLogout = () => {
    logoutAdmin()
    navigate('adminLogin')
    onNavigate?.()
  }

  return (
    <div className="flex flex-col h-full bg-slate-900 text-white">
      {/* Logo */}
      <div className="p-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-amber-500 flex items-center justify-center shadow-md">
          <BookMarked className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-lg leading-tight">Kitabi</h1>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest">Admin Panel</p>
        </div>
      </div>

      <Separator className="bg-slate-700" />

      {/* Navigation */}
      <ScrollArea className="flex-1 py-3">
        <nav className="px-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = currentPage === item.page
            const Icon = item.icon
            return (
              <button
                key={item.page}
                onClick={() => handleNav(item.page)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-amber-500/15 text-amber-400 shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                <span>{t.admin[item.labelKey as keyof typeof t.admin]}</span>
              </button>
            )
          })}
        </nav>
      </ScrollArea>

      <Separator className="bg-slate-700" />

      {/* Admin info & Logout */}
      <div className="p-3">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <Avatar className="w-8 h-8 border border-slate-600">
            <AvatarFallback className="bg-amber-500/20 text-amber-400 text-xs font-semibold">
              {adminInfo?.name?.charAt(0)?.toUpperCase() || 'A'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{adminInfo?.name || 'Admin'}</p>
            <p className="text-xs text-slate-400 truncate">{adminInfo?.email || ''}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          onClick={handleLogout}
          className="w-full justify-start gap-3 text-slate-400 hover:text-red-400 hover:bg-red-500/10 text-sm"
        >
          <LogOut className="w-4 h-4" />
          {t.admin.logout}
        </Button>
      </div>
    </div>
  )
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { t } = useTranslation()
  const navigate = useRouterStore((s) => s.navigate)
  const currentPage = useRouterStore((s) => s.currentPage)
  const [mobileOpen, setMobileOpen] = useState(false)

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAdminLoggedIn()) {
      navigate('adminLogin')
    }
  }, [currentPage, navigate])

  if (!isAdminLoggedIn()) {
    return null
  }

  const currentPageLabel = NAV_ITEMS.find((i) => i.page === currentPage)
  const pageTitle = currentPageLabel ? t.admin[currentPageLabel.labelKey as keyof typeof t.admin] : t.admin.dashboard

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 border-r border-slate-800">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 p-0 bg-slate-900 border-slate-700">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarContent onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="h-14 border-b border-slate-200 bg-white flex items-center px-4 gap-3 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </Button>
          <h2 className="font-semibold text-slate-800 text-lg">{pageTitle}</h2>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
