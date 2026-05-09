'use client'

import { useState, useEffect } from 'react'
import { Menu, ShoppingCart, Globe, ChevronDown, BookOpen, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useRouterStore } from '@/stores/router-store'
import { useCartStore } from '@/stores/cart-store'
import { useLanguageStore } from '@/stores/language-store'
import { useTranslation, type Language } from '@/lib/i18n'

export function Header() {
  const { t } = useTranslation()
  const navigate = useRouterStore((s) => s.navigate)
  const currentPage = useRouterStore((s) => s.currentPage)
  const totalItems = useCartStore((s) => s.totalItems)
  const { language, setLanguage } = useLanguageStore()
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navLinks = [
    { page: 'home' as const, label: t('nav.home') },
    { page: 'catalog' as const, label: t('nav.catalog') },
    { page: 'genres' as const, label: language === 'ar' ? 'الأنواع' : language === 'en' ? 'Genres' : 'Genres' },
  ]

  const languages: { code: Language; flag: string; label: string }[] = [
    { code: 'fr', flag: '🇫🇷', label: 'Français' },
    { code: 'ar', flag: '🇩🇿', label: 'العربية' },
    { code: 'en', flag: '🇬🇧', label: 'English' },
  ]

  const handleNavClick = (page: Parameters<typeof navigate>[0]) => {
    navigate(page)
    setIsMobileMenuOpen(false)
  }

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        isScrolled
          ? 'bg-navy/95 backdrop-blur-md shadow-lg'
          : 'bg-navy'
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <button
            onClick={() => handleNavClick('home')}
            className="flex items-center gap-2.5 group"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold/15">
              <BookOpen className="h-5 w-5 text-gold transition-transform group-hover:scale-110" />
            </div>
            <span className="font-heading text-xl sm:text-2xl font-bold text-gold tracking-wide">
              Kitibi
            </span>
          </button>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <button
                key={link.page}
                onClick={() => handleNavClick(link.page)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  currentPage === link.page
                    ? 'bg-white/15 text-white'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                {link.label}
              </button>
            ))}
          </nav>

          {/* Right Section */}
          <div className="flex items-center gap-1.5">
            {/* Search icon (navigates to catalog) */}
            <Button
              variant="ghost"
              size="sm"
              className="hidden sm:flex text-white/80 hover:text-white hover:bg-white/10 h-9 w-9 p-0"
              onClick={() => handleNavClick('catalog')}
            >
              <Search className="h-4 w-4" />
            </Button>

            {/* Language Switcher */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white/80 hover:text-white hover:bg-white/10 gap-1.5 h-9 px-2"
                >
                  <Globe className="h-4 w-4" />
                  <span className="hidden sm:inline text-xs font-medium">
                    {languages.find((l) => l.code === language)?.flag}
                  </span>
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[140px]">
                {languages.map((lang) => (
                  <DropdownMenuItem
                    key={lang.code}
                    onClick={() => setLanguage(lang.code)}
                    className={`cursor-pointer ${language === lang.code ? 'bg-accent font-medium' : ''}`}
                  >
                    <span className="me-2">{lang.flag}</span>
                    {lang.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Cart Button */}
            <Button
              variant="ghost"
              size="sm"
              className="relative text-white/80 hover:text-white hover:bg-white/10 h-9 w-9 p-0"
              onClick={() => handleNavClick('cart')}
            >
              <ShoppingCart className="h-5 w-5" />
              {totalItems > 0 && (
                <Badge className="absolute -top-1 -end-1 h-5 min-w-5 flex items-center justify-center bg-gold text-white text-[10px] font-bold px-1 py-0 border-0">
                  {totalItems}
                </Badge>
              )}
            </Button>

            {/* Mobile Menu */}
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="md:hidden text-white/80 hover:text-white hover:bg-white/10 h-9 w-9 p-0"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="end" className="w-72 bg-navy border-navy-light">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2 text-gold">
                    <BookOpen className="h-5 w-5" />
                    <span className="font-heading text-lg font-bold">Kitibi</span>
                  </SheetTitle>
                </SheetHeader>
                <nav className="mt-6 flex flex-col gap-0.5">
                  {navLinks.map((link) => (
                    <SheetClose asChild key={link.page}>
                      <button
                        onClick={() => handleNavClick(link.page)}
                        className={`w-full text-start px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                          currentPage === link.page
                            ? 'bg-white/15 text-white'
                            : 'text-white/80 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        {link.label}
                      </button>
                    </SheetClose>
                  ))}
                  <SheetClose asChild>
                    <button
                      onClick={() => handleNavClick('cart')}
                      className="w-full text-start px-4 py-3 rounded-xl text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 flex items-center gap-3 transition-colors"
                    >
                      <ShoppingCart className="h-4 w-4" />
                      {t('nav.cart')}
                      {totalItems > 0 && (
                        <Badge className="bg-gold text-white text-[10px] font-bold border-0">
                          {totalItems}
                        </Badge>
                      )}
                    </button>
                  </SheetClose>
                  <div className="my-3 border-t border-white/10" />
                  <div className="px-4 py-2 text-xs text-white/50 font-medium uppercase tracking-wider">
                    {t('nav.language')}
                  </div>
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        setLanguage(lang.code)
                        setIsMobileMenuOpen(false)
                      }}
                      className={`w-full text-start px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                        language === lang.code
                          ? 'bg-white/15 text-white'
                          : 'text-white/70 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <span className="me-2">{lang.flag}</span>
                      {lang.label}
                    </button>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  )
}
