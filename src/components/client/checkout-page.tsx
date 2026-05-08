'use client'

import { useState } from 'react'
import {
  ArrowLeft, Banknote, BookOpen, Loader2, AlertCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useRouterStore } from '@/stores/router-store'
import { useCartStore } from '@/stores/cart-store'
import { useTranslation } from '@/lib/i18n'
import { toast } from 'sonner'

const WILAYAS = [
  '01 - Adrar', '02 - Chlef', '03 - Laghouat', '04 - Oum El Bouaghi',
  '05 - Batna', '06 - Béjaïa', '07 - Biskra', '08 - Béchar',
  '09 - Blida', '10 - Bouira', '11 - Tamanrasset', '12 - Tébessa',
  '13 - Tlemcen', '14 - Tiaret', '15 - Tizi Ouzou', '16 - Alger',
  '17 - Djelfa', '18 - Jijel', '19 - Sétif', '20 - Saïda',
  '21 - Skikda', '22 - Sidi Bel Abbès', '23 - Annaba', '24 - Guelma',
  '25 - Constantine', '26 - Médéa', '27 - Mostaganem', '28 - M\'Sila',
  '29 - Mascara', '30 - Ouargla', '31 - Oran', '32 - El Bayadh',
  '33 - Illizi', '34 - Bordj Bou Arréridj', '35 - Boumerdès', '36 - El Tarf',
  '37 - Tindouf', '38 - Tissemsilt', '39 - El Oued', '40 - Khenchela',
  '41 - Souk Ahras', '42 - Tipaza', '43 - Mila', '44 - Aïn Defla',
  '45 - Naâma', '46 - Aïn Témouchent', '47 - Ghardaïa', '48 - Relizane',
  '49 - El M\'Ghair', '50 - El Meniaa', '51 - Ouled Djellal',
  '52 - Bordj Badji Mokhtar', '53 - Béni Abbès', '54 - Timimoun',
  '55 - Touggourt', '56 - Djanet', '57 - In Salah', '58 - In Guezzam',
]

interface FormErrors {
  fullName?: string
  phone?: string
  wilaya?: string
  commune?: string
  address?: string
  terms?: string
}

export function CheckoutPage() {
  const { t } = useTranslation()
  const navigate = useRouterStore((s) => s.navigate)
  const { items, totalItems, totalAmount, clearCart } = useCartStore()
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})

  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [wilaya, setWilaya] = useState('')
  const [commune, setCommune] = useState('')
  const [address, setAddress] = useState('')
  const [note, setNote] = useState('')
  const [termsAccepted, setTermsAccepted] = useState(false)

  const validate = (): boolean => {
    const newErrors: FormErrors = {}

    if (!fullName.trim()) {
      newErrors.fullName = t('checkout.requiredField')
    } else if (fullName.trim().length < 3) {
      newErrors.fullName = t('checkout.invalidName')
    }

    if (!phone.trim()) {
      newErrors.phone = t('checkout.requiredField')
    } else if (!/^0[5-7]\d{8}$/.test(phone.replace(/\s/g, ''))) {
      newErrors.phone = t('checkout.invalidPhone')
    }

    if (!wilaya) {
      newErrors.wilaya = t('checkout.requiredField')
    }

    if (!commune.trim()) {
      newErrors.commune = t('checkout.requiredField')
    }

    if (!address.trim()) {
      newErrors.address = t('checkout.requiredField')
    }

    if (!termsAccepted) {
      newErrors.terms = t('checkout.requiredField')
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return

    setSubmitting(true)
    try {
      const orderData = {
        fullName: fullName.trim(),
        phone: phone.trim(),
        wilaya,
        commune: commune.trim(),
        address: address.trim(),
        note: note.trim() || undefined,
        items: items.map((item) => ({
          bookId: item.bookId,
          quantity: item.quantity,
          unitPrice: item.price,
        })),
      }

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      })

      if (res.ok) {
        const data = await res.json()
        clearCart()
        navigate('orderSuccess', { orderNumber: data.order?.orderNumber || data.orderNumber || '' })
      } else {
        const data = await res.json()
        toast.error(data.error || t('common.error'))
      }
    } catch {
      toast.error(t('common.error'))
    } finally {
      setSubmitting(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 text-center">
        <BookOpen className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
        <p className="text-muted-foreground mb-4">{t('cart.empty')}</p>
        <Button onClick={() => navigate('catalog')} variant="outline">
          {t('cart.continueShopping')}
        </Button>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate('cart')}
          className="mb-4 text-muted-foreground hover:text-navy gap-1.5"
        >
          <ArrowLeft className="h-4 w-4 rtl-flip" />
          {t('checkout.backToCart')}
        </Button>

        <h1 className="font-heading text-2xl sm:text-3xl font-bold text-navy mb-6">
          {t('nav.checkout')}
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Info */}
            <Card>
              <CardContent className="p-5 sm:p-6 space-y-4">
                <h2 className="font-heading text-lg font-semibold text-navy">
                  {t('checkout.yourInformation')}
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <Label htmlFor="fullName">{t('checkout.fullName')} *</Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => { setFullName(e.target.value); setErrors((prev) => ({ ...prev, fullName: undefined })) }}
                      placeholder={t('checkout.fullName')}
                      className={errors.fullName ? 'border-destructive' : ''}
                    />
                    {errors.fullName && (
                      <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> {errors.fullName}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="phone">{t('checkout.phone')} *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => { setPhone(e.target.value); setErrors((prev) => ({ ...prev, phone: undefined })) }}
                      placeholder="05XX XXX XXX"
                      dir="ltr"
                      className={errors.phone ? 'border-destructive' : ''}
                    />
                    {errors.phone && (
                      <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> {errors.phone}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="wilaya">{t('checkout.wilaya')} *</Label>
                    <Select
                      value={wilaya}
                      onValueChange={(v) => { setWilaya(v); setErrors((prev) => ({ ...prev, wilaya: undefined })) }}
                    >
                      <SelectTrigger id="wilaya" className={errors.wilaya ? 'border-destructive' : ''}>
                        <SelectValue placeholder={t('checkout.wilaya')} />
                      </SelectTrigger>
                      <SelectContent>
                        {WILAYAS.map((w) => (
                          <SelectItem key={w} value={w}>
                            {w}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.wilaya && (
                      <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> {errors.wilaya}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="commune">{t('checkout.commune')} *</Label>
                    <Input
                      id="commune"
                      value={commune}
                      onChange={(e) => { setCommune(e.target.value); setErrors((prev) => ({ ...prev, commune: undefined })) }}
                      placeholder={t('checkout.commune')}
                      className={errors.commune ? 'border-destructive' : ''}
                    />
                    {errors.commune && (
                      <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> {errors.commune}
                      </p>
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <Label htmlFor="address">{t('checkout.address')} *</Label>
                    <Textarea
                      id="address"
                      value={address}
                      onChange={(e) => { setAddress(e.target.value); setErrors((prev) => ({ ...prev, address: undefined })) }}
                      placeholder={t('checkout.address')}
                      rows={2}
                      className={errors.address ? 'border-destructive' : ''}
                    />
                    {errors.address && (
                      <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> {errors.address}
                      </p>
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <Label htmlFor="note">{t('checkout.note')}</Label>
                    <Textarea
                      id="note"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder={t('checkout.note')}
                      rows={2}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Method */}
            <Card>
              <CardContent className="p-5 sm:p-6">
                <h2 className="font-heading text-lg font-semibold text-navy mb-4">
                  {t('checkout.paymentInfo')}
                </h2>
                <div className="flex items-start gap-3 p-4 rounded-lg border-2 border-gold/40 bg-gold/5">
                  <Banknote className="h-6 w-6 text-gold mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-navy">
                      {t('checkout.cashOnDelivery')}
                    </p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {t('checkout.codDescription')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Terms */}
            <Card>
              <CardContent className="p-5 sm:p-6">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="terms"
                    checked={termsAccepted}
                    onCheckedChange={(checked) => {
                      setTermsAccepted(checked === true)
                      setErrors((prev) => ({ ...prev, terms: undefined }))
                    }}
                    className="mt-0.5"
                  />
                  <div>
                    <Label htmlFor="terms" className="text-sm cursor-pointer">
                      {t('checkout.termsAccept')}
                    </Label>
                    {errors.terms && (
                      <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> {errors.terms}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardContent className="p-5 space-y-4">
                <h2 className="font-heading text-lg font-semibold text-navy">
                  {t('checkout.orderSummary')}
                </h2>

                {/* Items list */}
                <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar">
                  {items.map((item) => (
                    <div key={item.bookId} className="flex items-center gap-3">
                      <div className="shrink-0 w-10 h-13 rounded overflow-hidden bg-beige/50">
                        {item.coverUrl ? (
                          <img src={item.coverUrl} alt={item.title} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <BookOpen className="h-4 w-4 text-navy/20" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-navy line-clamp-1">{item.title}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {item.quantity} × {item.price.toLocaleString()} {t('common.da')}
                        </p>
                      </div>
                      <span className="text-xs font-semibold text-navy shrink-0">
                        {(item.price * item.quantity).toLocaleString()} {t('common.da')}
                      </span>
                    </div>
                  ))}
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {totalItems} {totalItems === 1 ? t('cart.item') : t('cart.items')}
                    </span>
                    <span className="font-medium">{totalAmount.toLocaleString()} {t('common.da')}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="font-bold text-navy">{t('cart.total')}</span>
                    <span className="font-bold text-lg text-gold">
                      {totalAmount.toLocaleString()} {t('common.da')}
                    </span>
                  </div>
                </div>

                <Button
                  size="lg"
                  className="w-full bg-gold hover:bg-gold/90 text-white font-semibold h-12 rounded-xl"
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="me-2 h-4 w-4 animate-spin" />
                      {t('common.loading')}
                    </>
                  ) : (
                    t('checkout.confirmOrder')
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
