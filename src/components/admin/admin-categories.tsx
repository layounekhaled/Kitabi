'use client'

import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from '@/lib/i18n'
import { getAuthHeaders } from '@/lib/admin-auth'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Plus,
  Pencil,
  Trash2,
  FolderOpen,
  Loader2,
  BookOpen,
} from 'lucide-react'
import { toast } from 'sonner'

interface Category {
  id: string
  nameFr: string
  nameAr: string
  nameEn: string
  slug: string
  _count?: { books: number }
}

export default function AdminCategories() {
  const { t } = useTranslation()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  // Dialog states
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selectedCat, setSelectedCat] = useState<Category | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [form, setForm] = useState({
    nameFr: '',
    nameAr: '',
    nameEn: '',
    slug: '',
  })

  const fetchCategories = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/categories')
      const data = await res.json()
      setCategories(data.categories || [])
    } catch {
      toast.error(t.common.error)
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  const resetForm = () => {
    setForm({ nameFr: '', nameAr: '', nameEn: '', slug: '' })
  }

  const openNewCategory = () => {
    setSelectedCat(null)
    resetForm()
    setEditOpen(true)
  }

  const openEditCategory = (cat: Category) => {
    setSelectedCat(cat)
    setForm({
      nameFr: cat.nameFr,
      nameAr: cat.nameAr,
      nameEn: cat.nameEn,
      slug: cat.slug,
    })
    setEditOpen(true)
  }

  const openDeleteCategory = (cat: Category) => {
    setSelectedCat(cat)
    setDeleteOpen(true)
  }

  // Auto-generate slug from French name
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
  }

  const handleNameFrChange = (value: string) => {
    setForm((prev) => ({
      ...prev,
      nameFr: value,
      slug: prev.slug === generateSlug(prev.nameFr) || !prev.slug ? generateSlug(value) : prev.slug,
    }))
  }

  const handleSaveCategory = async () => {
    if (!form.nameFr || !form.nameAr || !form.nameEn || !form.slug) {
      toast.error(t.common.required)
      return
    }
    setSaving(true)
    try {
      if (selectedCat) {
        const res = await fetch(`/api/categories?id=${selectedCat.id}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(form),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Update failed')
        }
        toast.success(t.admin.editCategory)
      } else {
        const res = await fetch('/api/categories', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(form),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Create failed')
        }
        toast.success(t.admin.addCategory)
      }
      setEditOpen(false)
      fetchCategories()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.common.error)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteCategory = async () => {
    if (!selectedCat) return
    try {
      const res = await fetch(`/api/categories?id=${selectedCat.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Delete failed')
      }
      toast.success(t.admin.deleteCategory)
      setDeleteOpen(false)
      setSelectedCat(null)
      fetchCategories()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.common.error)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">{t.admin.categoryManagement}</h1>
        <Button onClick={openNewCategory} className="gap-2 bg-amber-500 hover:bg-amber-600 text-white">
          <Plus className="w-4 h-4" />
          {t.admin.addCategory}
        </Button>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : categories.length === 0 ? (
            <div className="py-12 text-center">
              <FolderOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-400">{t.common.noResults}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.admin.categoryNameFr}</TableHead>
                    <TableHead>{t.admin.categoryNameAr}</TableHead>
                    <TableHead className="hidden md:table-cell">{t.admin.categoryNameEn}</TableHead>
                    <TableHead>{t.admin.categorySlug}</TableHead>
                    <TableHead className="text-center">
                      <BookOpen className="w-4 h-4 inline" />
                    </TableHead>
                    <TableHead className="text-right">{t.common.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((cat) => (
                    <TableRow key={cat.id}>
                      <TableCell className="font-medium">{cat.nameFr}</TableCell>
                      <TableCell className="text-right" dir="rtl">{cat.nameAr}</TableCell>
                      <TableCell className="hidden md:table-cell">{cat.nameEn}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[10px] font-mono">{cat.slug}</Badge>
                      </TableCell>
                      <TableCell className="text-center text-sm text-slate-600">
                        {cat._count?.books ?? 0}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEditCategory(cat)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDeleteCategory(cat)}
                            className="text-red-500 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Category Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedCat ? t.admin.editCategory : t.admin.addCategory}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t.admin.categoryNameFr} *</Label>
              <Input
                value={form.nameFr}
                onChange={(e) => handleNameFrChange(e.target.value)}
                placeholder="Livres français"
              />
            </div>
            <div className="space-y-2">
              <Label>{t.admin.categoryNameAr} *</Label>
              <Input
                value={form.nameAr}
                onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
                placeholder="كتب فرنسية"
                dir="rtl"
              />
            </div>
            <div className="space-y-2">
              <Label>{t.admin.categoryNameEn} *</Label>
              <Input
                value={form.nameEn}
                onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
                placeholder="French Books"
              />
            </div>
            <div className="space-y-2">
              <Label>{t.admin.categorySlug} *</Label>
              <Input
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                placeholder="livres-francais"
                className="font-mono"
              />
              <p className="text-[10px] text-slate-400">Auto-generated from French name. Edit manually if needed.</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>{t.common.cancel}</Button>
            <Button
              onClick={handleSaveCategory}
              disabled={saving}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {t.common.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.admin.confirmDelete}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.admin.confirmDeleteDesc}
              {selectedCat && (
                <span className="block mt-2 font-medium text-slate-700">
                  &ldquo;{selectedCat.nameFr}&rdquo; ({selectedCat._count?.books ?? 0} books)
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCategory} className="bg-red-500 hover:bg-red-600 text-white">
              {t.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
