'use client'

import { motion } from 'framer-motion'
import { ShoppingCart, Trash2, Plus, Minus, BookOpen, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useRouterStore } from '@/stores/router-store'
import { useCartStore } from '@/stores/cart-store'
import { useTranslation } from '@/lib/i18n'

export function CartPage() {
  const { t } = useTranslation()
  const navigate = useRouterStore((s) => s.navigate)
  const { items, totalItems, totalAmount, updateQuantity, removeItem } = useCartStore()

  if (items.length === 0) {
    return (
      <div className="animate-fade-in">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="text-center max-w-md mx-auto">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-beige mb-6">
              <ShoppingCart className="h-10 w-10 text-navy/30" />
            </div>
            <h1 className="font-heading text-2xl font-bold text-navy mb-3">
              {t('cart.empty')}
            </h1>
            <p className="text-muted-foreground mb-6">
              {t('cart.emptyDesc')}
            </p>
            <Button
              onClick={() => navigate('catalog')}
              className="bg-gold hover:bg-gold/90 text-white font-semibold"
            >
              {t('cart.continueShopping')}
              <ArrowRight className="ms-2 h-4 w-4 rtl-flip" />
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <h1 className="font-heading text-2xl sm:text-3xl font-bold text-navy mb-6">
          {t('cart.yourCart')}
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <motion.div
                key={item.bookId}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <Card className="border-border/50">
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex gap-4">
                      {/* Thumbnail */}
                      <div
                        className="shrink-0 w-16 h-20 sm:w-20 sm:h-28 rounded-lg overflow-hidden bg-beige/50 cursor-pointer"
                        onClick={() => navigate('bookDetail', { id: item.bookId })}
                      >
                        {item.coverUrl ? (
                          <img
                            src={item.coverUrl}
                            alt={item.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <BookOpen className="h-6 w-6 text-navy/20" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3
                              className="font-heading text-sm sm:text-base font-semibold text-navy line-clamp-2 cursor-pointer hover:text-gold transition-colors"
                              onClick={() => navigate('bookDetail', { id: item.bookId })}
                            >
                              {item.title}
                            </h3>
                            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 line-clamp-1">
                              {item.author}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(item.bookId)}
                            className="shrink-0 h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="flex items-center justify-between mt-3">
                          {/* Quantity */}
                          <div className="flex items-center border rounded-lg">
                            <button
                              onClick={() => updateQuantity(item.bookId, item.quantity - 1)}
                              className="px-2.5 py-1.5 text-sm hover:bg-muted transition-colors"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="px-3 py-1.5 text-sm font-semibold border-x min-w-[36px] text-center">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.bookId, item.quantity + 1)}
                              className="px-2.5 py-1.5 text-sm hover:bg-muted transition-colors"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>

                          {/* Price */}
                          <div className="text-end">
                            <p className="text-xs text-muted-foreground">
                              {item.price.toLocaleString()} {t('common.da')} × {item.quantity}
                            </p>
                            <p className="text-base font-bold text-gold">
                              {(item.price * item.quantity).toLocaleString()} {t('common.da')}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardContent className="p-5 space-y-4">
                <h2 className="font-heading text-lg font-semibold text-navy">
                  {t('cart.orderSummary')}
                </h2>

                <div className="space-y-2.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {totalItems} {totalItems === 1 ? t('cart.item') : t('cart.items')}
                    </span>
                    <span className="font-medium">
                      {totalAmount.toLocaleString()} {t('common.da')}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="font-semibold text-navy">{t('cart.subtotal')}</span>
                    <span className="font-bold text-lg text-gold">
                      {totalAmount.toLocaleString()} {t('common.da')}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  {t('cart.shippingNote')}
                </p>

                <Button
                  size="lg"
                  className="w-full bg-gold hover:bg-gold/90 text-white font-semibold h-12 rounded-xl"
                  onClick={() => navigate('checkout')}
                >
                  {t('cart.proceedToCheckout')}
                  <ArrowRight className="ms-2 h-4 w-4 rtl-flip" />
                </Button>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate('catalog')}
                >
                  {t('cart.continueShopping')}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
