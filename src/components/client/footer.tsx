'use client'

import { BookOpen, Mail, Phone, MapPin, Facebook, Instagram, Twitter } from 'lucide-react'
import { useRouterStore } from '@/stores/router-store'
import { useTranslation } from '@/lib/i18n'

export function Footer() {
  const { t } = useTranslation()
  const navigate = useRouterStore((s) => s.navigate)

  return (
    <footer className="bg-navy text-white/90">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* About */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <img src="/favicon.svg" alt="Kitabi" className="h-6 w-6" />
              <span className="font-heading text-xl font-bold text-gold">Kitabi</span>
            </div>
            <p className="text-sm text-white/70 leading-relaxed">
              {t('footer.aboutDesc')}
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-heading text-base font-semibold text-white mb-4">
              {t('footer.quickLinks')}
            </h3>
            <ul className="space-y-2.5">
              {[
                { page: 'home' as const, label: t('nav.home') },
                { page: 'catalog' as const, label: t('nav.catalog') },
              ].map((link) => (
                <li key={link.page}>
                  <button
                    onClick={() => navigate(link.page)}
                    className="text-sm text-white/70 hover:text-gold transition-colors"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
              <li>
                <button className="text-sm text-white/70 hover:text-gold transition-colors">
                  {t('footer.faq')}
                </button>
              </li>
              <li>
                <button className="text-sm text-white/70 hover:text-gold transition-colors">
                  {t('footer.terms')}
                </button>
              </li>
              <li>
                <button className="text-sm text-white/70 hover:text-gold transition-colors">
                  {t('footer.privacy')}
                </button>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-heading text-base font-semibold text-white mb-4">
              {t('footer.contactUs')}
            </h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2.5">
                <Mail className="h-4 w-4 text-gold mt-0.5 shrink-0" />
                <span className="text-sm text-white/70">{t('footer.email')}</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Phone className="h-4 w-4 text-gold mt-0.5 shrink-0" />
                <span className="text-sm text-white/70" dir="ltr">{t('footer.phone')}</span>
              </li>
              <li className="flex items-start gap-2.5">
                <MapPin className="h-4 w-4 text-gold mt-0.5 shrink-0" />
                <span className="text-sm text-white/70">{t('footer.address')}</span>
              </li>
            </ul>
          </div>

          {/* Social */}
          <div>
            <h3 className="font-heading text-base font-semibold text-white mb-4">
              {t('footer.followUs')}
            </h3>
            <div className="flex items-center gap-3">
              <a
                href="#"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/70 hover:bg-gold hover:text-white transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="h-4 w-4" />
              </a>
              <a
                href="#"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/70 hover:bg-gold hover:text-white transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="h-4 w-4" />
              </a>
              <a
                href="#"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/70 hover:bg-gold hover:text-white transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-white/50">
            © {new Date().getFullYear()} Kitabi. {t('footer.rights')}.
          </p>
          <button
            onClick={() => navigate('adminLogin')}
            className="text-xs text-white/30 hover:text-gold/60 transition-colors"
          >
            Administration
          </button>
        </div>
      </div>
    </footer>
  )
}
