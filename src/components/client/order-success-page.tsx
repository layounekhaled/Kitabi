'use client'

import { motion } from 'framer-motion'
import { CheckCircle, ArrowRight, Package, Clock, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useRouterStore } from '@/stores/router-store'
import { useTranslation } from '@/lib/i18n'

export function OrderSuccessPage() {
  const { t } = useTranslation()
  const navigate = useRouterStore((s) => s.navigate)
  const params = useRouterStore((s) => s.params)
  const orderNumber = params.orderNumber || ''
  const orderDate = new Date().toLocaleDateString(
    t('common.da') === 'د.ج' ? 'ar-DZ' : t('common.da') === 'DA' ? 'fr-FR' : 'en-US',
    { year: 'numeric', month: 'long', day: 'numeric' }
  )

  return (
    <div className="animate-fade-in">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          {/* Success Icon */}
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
            >
              <CheckCircle className="h-10 w-10 text-emerald-600" />
            </motion.div>
          </div>

          {/* Title */}
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-navy mb-2">
            {t('orderSuccess.title')}
          </h1>
          <p className="text-muted-foreground mb-8">
            {t('orderSuccess.subtitle')}
          </p>

          {/* Order Info Card */}
          <Card className="text-start mb-6">
            <CardContent className="p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{t('orderSuccess.orderNumber')}</p>
                  <p className="text-lg font-bold text-navy font-mono">{orderNumber || '—'}</p>
                </div>
                <Badge className="bg-emerald-100 text-emerald-800 border-0">
                  {t('orderStatus.nouvelle')}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{t('orderSuccess.orderDate')}</p>
                  <p className="text-sm font-medium text-foreground">{orderDate}</p>
                </div>
              </div>

              {/* Estimated Delivery */}
              <div className="flex items-center gap-2.5 p-3 rounded-lg bg-blue-50 border border-blue-100">
                <Clock className="h-5 w-5 text-blue-600 shrink-0" />
                <div className="text-start">
                  <p className="text-xs text-blue-800 font-medium">{t('checkout.estimatedDelivery')}</p>
                  <p className="text-xs text-blue-600">{t('orderSuccess.estimatedDelivery')}</p>
                </div>
              </div>

              {/* Print on Demand Notice */}
              <div className="flex items-center gap-2.5 p-3 rounded-lg bg-gold/10 border border-gold/20">
                <Printer className="h-5 w-5 text-gold shrink-0" />
                <p className="text-xs text-muted-foreground text-start">
                  {t('home.printOnDemandDesc')}
                </p>
              </div>

              {/* Confirmation Note */}
              <div className="flex items-center gap-2.5 p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                <Package className="h-5 w-5 text-emerald-600 shrink-0" />
                <p className="text-xs text-emerald-800 text-start">
                  {t('orderSuccess.confirmationSent')}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Thank You */}
          <p className="text-base font-medium text-navy mb-8">
            {t('orderSuccess.thankYou')}
          </p>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center gap-3 justify-center">
            <Button
              onClick={() => navigate('catalog')}
              className="bg-gold hover:bg-gold/90 text-white font-semibold min-w-[180px]"
            >
              {t('orderSuccess.continueShopping')}
              <ArrowRight className="ms-2 h-4 w-4 rtl-flip" />
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('home')}
              className="min-w-[180px]"
            >
              {t('common.goToHome')}
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
