'use client'

import { useEffect, useState } from 'react'
import { useRouterStore } from '@/stores/router-store'
import { useTranslation } from '@/lib/i18n'
import { getAuthHeaders } from '@/lib/admin-auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import {
  BookOpen,
  ShoppingCart,
  DollarSign,
  FolderOpen,
  Plus,
  FileDown,
  TrendingUp,
  ArrowRight,
} from 'lucide-react'

interface Stats {
  books: { total: number; published: number; draft: number }
  orders: { total: number; byStatus: Record<string, number> }
  revenue: number
  recentOrders: Array<{
    id: string
    orderNumber: string
    fullName: string
    totalAmount: number
    status: string
    createdAt: string
    items: Array<{ book: { title: string; coverUrl: string | null } }>
  }>
}

const STATUS_COLORS: Record<string, string> = {
  nouvelle: 'bg-blue-100 text-blue-700',
  confirmee: 'bg-yellow-100 text-yellow-700',
  en_impression: 'bg-orange-100 text-orange-700',
  prete_a_livrer: 'bg-purple-100 text-purple-700',
  expediee: 'bg-cyan-100 text-cyan-700',
  livree: 'bg-green-100 text-green-700',
  annulee: 'bg-red-100 text-red-700',
}

const STATUS_BAR_COLORS: Record<string, string> = {
  nouvelle: 'bg-blue-500',
  confirmee: 'bg-yellow-500',
  en_impression: 'bg-orange-500',
  prete_a_livrer: 'bg-purple-500',
  expediee: 'bg-cyan-500',
  livree: 'bg-green-500',
  annulee: 'bg-red-500',
}

export default function AdminDashboard() {
  const { t } = useTranslation()
  const navigate = useRouterStore((s) => s.navigate)
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/stats', {
        headers: getAuthHeaders(),
      })
      if (!res.ok) throw new Error('Failed to fetch stats')
      const data = await res.json()
      setStats(data)
    } catch {
      setError(t.common.error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString()} ${t.common.da}`
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  if (loading) {
    return <DashboardSkeleton />
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 mb-4">{error}</p>
        <Button onClick={fetchStats} variant="outline">{t.common.tryAgain}</Button>
      </div>
    )
  }

  if (!stats) return null

  const maxOrderStatus = Math.max(...Object.values(stats.orders.byStatus), 1)

  const statCards = [
    { label: t.admin.totalBooks, value: stats.books.total, icon: BookOpen, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: t.admin.totalOrders, value: stats.orders.total, icon: ShoppingCart, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: t.admin.totalRevenue, value: formatCurrency(stats.revenue), icon: DollarSign, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: t.admin.totalCategories, value: '-', icon: FolderOpen, color: 'text-purple-600', bg: 'bg-purple-50' },
  ]

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.label} className="border-0 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500 font-medium">{card.label}</p>
                    <p className="text-2xl font-bold text-slate-800 mt-1">{card.value}</p>
                  </div>
                  <div className={`w-11 h-11 rounded-xl ${card.bg} flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${card.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Orders by Status Chart */}
        <Card className="border-0 shadow-sm lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-slate-800">{t.admin.statistics}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(stats.orders.byStatus).map(([status, count]) => (
              <div key={status} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">
                    {t.orderStatus[status as keyof typeof t.orderStatus] || status}
                  </span>
                  <span className="font-semibold text-slate-800">{count}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${STATUS_BAR_COLORS[status] || 'bg-slate-400'} transition-all duration-500`}
                    style={{ width: `${Math.max((count / maxOrderStatus) * 100, 2)}%` }}
                  />
                </div>
              </div>
            ))}
            {Object.keys(stats.orders.byStatus).length === 0 && (
              <p className="text-sm text-slate-400 text-center py-4">{t.common.noResults}</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card className="border-0 shadow-sm lg:col-span-2">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold text-slate-800">{t.admin.recentOrders}</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('adminOrders')}
              className="text-amber-600 hover:text-amber-700 text-xs"
            >
              {t.home.viewAll} <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Order #</TableHead>
                  <TableHead className="text-xs">{t.checkout.fullName}</TableHead>
                  <TableHead className="text-xs">{t.common.amount}</TableHead>
                  <TableHead className="text-xs">{t.common.status}</TableHead>
                  <TableHead className="text-xs">{t.common.date}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.recentOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-xs">{order.orderNumber}</TableCell>
                    <TableCell className="text-sm">{order.fullName}</TableCell>
                    <TableCell className="text-sm font-medium">{formatCurrency(order.totalAmount)}</TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={`text-[10px] font-medium ${STATUS_COLORS[order.status] || 'bg-slate-100 text-slate-600'}`}
                      >
                        {t.orderStatus[order.status as keyof typeof t.orderStatus] || order.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">{formatDate(order.createdAt)}</TableCell>
                  </TableRow>
                ))}
                {stats.recentOrders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-slate-400 text-sm">
                      {t.common.noResults}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-slate-800">{t.admin.quickActions}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => navigate('adminBooks')}
              variant="outline"
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              {t.admin.addBook}
            </Button>
            <Button
              onClick={() => navigate('adminImport')}
              variant="outline"
              className="gap-2"
            >
              <FileDown className="w-4 h-4" />
              {t.admin.importISBN}
            </Button>
            <Button
              onClick={() => navigate('adminOrders')}
              variant="outline"
              className="gap-2"
            >
              <ShoppingCart className="w-4 h-4" />
              {t.admin.manageOrders}
            </Button>
            <Button
              onClick={() => navigate('adminSocial')}
              variant="outline"
              className="gap-2"
            >
              <TrendingUp className="w-4 h-4" />
              {t.admin.socialMedia}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="border-0 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-7 w-16" />
                </div>
                <Skeleton className="w-11 h-11 rounded-xl" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-2 w-3/4" />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm lg:col-span-2">
          <CardContent className="p-5 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
