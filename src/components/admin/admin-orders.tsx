'use client'

import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from '@/lib/i18n'
import { getAuthHeaders } from '@/lib/admin-auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Loader2,
  User,
  MapPin,
  Phone,
  FileText,
  Printer,
} from 'lucide-react'
import { toast } from 'sonner'

const ORDER_STATUSES = [
  'nouvelle',
  'confirmee',
  'en_impression',
  'prete_a_livrer',
  'expediee',
  'livree',
  'annulee',
] as const

const STATUS_COLORS: Record<string, string> = {
  nouvelle: 'bg-blue-100 text-blue-700 border-blue-200',
  confirmee: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  en_impression: 'bg-orange-100 text-orange-700 border-orange-200',
  prete_a_livrer: 'bg-purple-100 text-purple-700 border-purple-200',
  expediee: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  livree: 'bg-green-100 text-green-700 border-green-200',
  annulee: 'bg-red-100 text-red-700 border-red-200',
}

const STATUS_DOT_COLORS: Record<string, string> = {
  nouvelle: 'bg-blue-500',
  confirmee: 'bg-yellow-500',
  en_impression: 'bg-orange-500',
  prete_a_livrer: 'bg-purple-500',
  expediee: 'bg-cyan-500',
  livree: 'bg-green-500',
  annulee: 'bg-red-500',
}

interface OrderItem {
  id: string
  bookId: string
  quantity: number
  unitPrice: number
  book: {
    id: string
    title: string
    author: string
    coverUrl: string | null
    isbn?: string
    language?: string
  }
}

interface Order {
  id: string
  orderNumber: string
  fullName: string
  phone: string
  wilaya: string
  commune: string
  address: string
  note: string | null
  status: string
  totalAmount: number
  items: OrderItem[]
  createdAt: string
  updatedAt: string
}

export default function AdminOrders() {
  const { t } = useTranslation()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  // Detail dialog
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [newStatus, setNewStatus] = useState('')
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [note, setNote] = useState('')

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      })
      if (statusFilter !== 'all') {
        params.set('status', statusFilter)
      }
      const res = await fetch(`/api/orders?${params}`, { headers: getAuthHeaders() })
      const data = await res.json()
      setOrders(data.orders || [])
      setTotalPages(data.pagination?.totalPages || 1)
      setTotal(data.pagination?.total || 0)
    } catch {
      toast.error(t.common.error)
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, t])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  const openOrderDetail = async (order: Order) => {
    setDetailOpen(true)
    setLoadingDetail(true)
    setNewStatus(order.status)
    setNote(order.note || '')
    try {
      const res = await fetch(`/api/orders/${order.id}`, { headers: getAuthHeaders() })
      const data = await res.json()
      setSelectedOrder(data.order)
      setNewStatus(data.order.status)
      setNote(data.order.note || '')
    } catch {
      setSelectedOrder(order)
    } finally {
      setLoadingDetail(false)
    }
  }

  const handleUpdateStatus = async () => {
    if (!selectedOrder || !newStatus) return
    setUpdatingStatus(true)
    try {
      const res = await fetch(`/api/orders/${selectedOrder.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error('Update failed')
      toast.success(t.admin.updateStatus)
      fetchOrders()
      // Update local state
      setSelectedOrder((prev) => prev ? { ...prev, status: newStatus } : prev)
    } catch {
      toast.error(t.common.error)
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handlePrint = () => {
    if (!selectedOrder) return
    const printContent = `
      <html>
        <head><title>Order ${selectedOrder.orderNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { font-size: 18px; margin-bottom: 5px; }
          .info { margin: 10px 0; }
          .info span { display: block; margin: 3px 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 13px; }
          th { background: #f5f5f5; }
          .total { font-weight: bold; text-align: right; margin-top: 10px; font-size: 16px; }
        </style>
        </head>
        <body>
          <h1>Kitabi - Commande ${selectedOrder.orderNumber}</h1>
          <div class="info">
            <span><strong>Client:</strong> ${selectedOrder.fullName}</span>
            <span><strong>Tel:</strong> ${selectedOrder.phone}</span>
            <span><strong>Adresse:</strong> ${selectedOrder.address}, ${selectedOrder.commune}, ${selectedOrder.wilaya}</span>
            <span><strong>Date:</strong> ${new Date(selectedOrder.createdAt).toLocaleDateString('fr-FR')}</span>
            <span><strong>Statut:</strong> ${selectedOrder.status}</span>
          </div>
          <table>
            <thead><tr><th>Livre</th><th>Auteur</th><th>Qté</th><th>Prix unitaire</th><th>Total</th></tr></thead>
            <tbody>
              ${selectedOrder.items.map((item) => `
                <tr>
                  <td>${item.book.title}</td>
                  <td>${item.book.author}</td>
                  <td>${item.quantity}</td>
                  <td>${item.unitPrice} DA</td>
                  <td>${(item.unitPrice * item.quantity).toFixed(2)} DA</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="total">Total: ${selectedOrder.totalAmount.toFixed(2)} DA</div>
          ${selectedOrder.note ? `<p><strong>Note:</strong> ${selectedOrder.note}</p>` : ''}
        </body>
      </html>
    `
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(printContent)
      printWindow.document.close()
      printWindow.print()
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatCurrency = (amount: number) => `${amount.toLocaleString()} ${t.common.da}`

  const statusIndex = (status: string) => ORDER_STATUSES.indexOf(status as typeof ORDER_STATUSES[number])

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-800">{t.admin.orderManagement}</h1>

      {/* Status Filter Tabs */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-3">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={statusFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => { setStatusFilter('all'); setPage(1) }}
              className={statusFilter === 'all' ? 'bg-amber-500 hover:bg-amber-600 text-white' : ''}
            >
              {t.admin.all}
            </Button>
            {ORDER_STATUSES.map((status) => (
              <Button
                key={status}
                variant={statusFilter === status ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setStatusFilter(status); setPage(1) }}
                className={statusFilter === status ? 'bg-amber-500 hover:bg-amber-600 text-white' : ''}
              >
                {t.orderStatus[status]}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div className="py-12 text-center">
              <ShoppingCart className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-400">{t.common.noResults}</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order #</TableHead>
                      <TableHead>{t.checkout.fullName}</TableHead>
                      <TableHead className="hidden md:table-cell">{t.checkout.phone}</TableHead>
                      <TableHead className="hidden lg:table-cell">{t.checkout.wilaya}</TableHead>
                      <TableHead>{t.common.amount}</TableHead>
                      <TableHead>{t.common.status}</TableHead>
                      <TableHead className="hidden sm:table-cell">{t.common.date}</TableHead>
                      <TableHead className="text-right">{t.common.actions}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order.id} className="cursor-pointer hover:bg-slate-50" onClick={() => openOrderDetail(order)}>
                        <TableCell className="font-mono text-xs">{order.orderNumber}</TableCell>
                        <TableCell className="text-sm">{order.fullName}</TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-slate-500">{order.phone}</TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-slate-500">{order.wilaya}</TableCell>
                        <TableCell className="text-sm font-medium">{formatCurrency(order.totalAmount)}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={`text-[10px] font-medium ${STATUS_COLORS[order.status] || ''}`}>
                            {t.orderStatus[order.status as keyof typeof t.orderStatus] || order.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-xs text-slate-500">{formatDate(order.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openOrderDetail(order) }}>
                            {t.common.view}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <p className="text-xs text-slate-500">
                  {t.common.showing} {orders.length} {t.common.of} {total}
                </p>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Order Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              {t.admin.orderDetails}
            </DialogTitle>
          </DialogHeader>

          {loadingDetail ? (
            <div className="space-y-4 py-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : selectedOrder ? (
            <div className="space-y-6">
              {/* Order Header */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono text-sm text-slate-500">{selectedOrder.orderNumber}</p>
                  <p className="text-xs text-slate-400">{formatDate(selectedOrder.createdAt)}</p>
                </div>
                <Badge className={`${STATUS_COLORS[selectedOrder.status] || ''} text-xs`}>
                  {t.orderStatus[selectedOrder.status as keyof typeof t.orderStatus] || selectedOrder.status}
                </Badge>
              </div>

              {/* Status Timeline */}
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wider">Progression</p>
                <div className="flex items-center gap-1">
                  {ORDER_STATUSES.map((status, idx) => {
                    const currentIdx = statusIndex(selectedOrder.status)
                    const isCompleted = idx <= currentIdx && selectedOrder.status !== 'annulee'
                    const isCurrent = status === selectedOrder.status
                    return (
                      <div key={status} className="flex-1 flex flex-col items-center gap-1">
                        <div className={`w-full h-2 rounded-full transition-all ${
                          isCompleted ? STATUS_DOT_COLORS[status] : 'bg-slate-200'
                        } ${isCurrent ? 'ring-2 ring-offset-1 ring-amber-400' : ''}`} />
                        <span className={`text-[9px] text-center leading-tight ${
                          isCompleted ? 'text-slate-700 font-medium' : 'text-slate-400'
                        }`}>
                          {t.orderStatus[status]}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Customer Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border shadow-none">
                  <CardContent className="p-4 space-y-2">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t.admin.customerInfo}</p>
                    <div className="space-y-1.5 text-sm">
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>{selectedOrder.fullName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{selectedOrder.phone}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5" />
                        <span>{selectedOrder.address}, {selectedOrder.commune}, {selectedOrder.wilaya}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border shadow-none">
                  <CardContent className="p-4 space-y-2">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t.admin.updateStatus}</p>
                    <div className="space-y-2">
                      <Select value={newStatus} onValueChange={setNewStatus}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ORDER_STATUSES.map((status) => (
                            <SelectItem key={status} value={status}>
                              {t.orderStatus[status]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        onClick={handleUpdateStatus}
                        disabled={updatingStatus || newStatus === selectedOrder.status}
                        className="w-full bg-amber-500 hover:bg-amber-600 text-white gap-2"
                        size="sm"
                      >
                        {updatingStatus ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                        {t.admin.updateStatus}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Order Items */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{t.admin.orderItems}</p>
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">{t.book.title}</TableHead>
                        <TableHead className="text-xs">{t.book.author}</TableHead>
                        <TableHead className="text-xs text-center">Qty</TableHead>
                        <TableHead className="text-xs text-right">{t.book.price}</TableHead>
                        <TableHead className="text-xs text-right">{t.common.total}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedOrder.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="text-sm font-medium">{item.book.title}</TableCell>
                          <TableCell className="text-sm text-slate-500">{item.book.author}</TableCell>
                          <TableCell className="text-sm text-center">{item.quantity}</TableCell>
                          <TableCell className="text-sm text-right">{item.unitPrice} {t.common.da}</TableCell>
                          <TableCell className="text-sm text-right font-medium">
                            {(item.unitPrice * item.quantity).toLocaleString()} {t.common.da}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex justify-end mt-3">
                  <div className="text-right">
                    <p className="text-xs text-slate-500">{t.common.total}</p>
                    <p className="text-lg font-bold text-slate-800">{formatCurrency(selectedOrder.totalAmount)}</p>
                  </div>
                </div>
              </div>

              {/* Note */}
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <FileText className="w-3 h-3" /> Note
                </p>
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add a note..."
                  rows={2}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setDetailOpen(false)} className="gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  {t.common.back}
                </Button>
                <Button variant="outline" onClick={handlePrint} className="gap-2">
                  <Printer className="w-4 h-4" />
                  Print
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
