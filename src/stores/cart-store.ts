'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartItem {
  bookId: string
  title: string
  author: string
  coverUrl: string
  price: number
  quantity: number
}

interface CartState {
  items: CartItem[]
  addItem: (item: Omit<CartItem, 'quantity'>) => void
  removeItem: (bookId: string) => void
  updateQuantity: (bookId: string, quantity: number) => void
  clearCart: () => void
  totalItems: number
  totalAmount: number
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      totalItems: 0,
      totalAmount: 0,

      addItem: (item) => {
        const { items } = get()
        const existingIndex = items.findIndex((i) => i.bookId === item.bookId)

        let newItems: CartItem[]
        if (existingIndex >= 0) {
          // Increment quantity if item already exists
          newItems = items.map((i, idx) =>
            idx === existingIndex ? { ...i, quantity: i.quantity + 1 } : i
          )
        } else {
          // Add new item with quantity 1
          newItems = [...items, { ...item, quantity: 1 }]
        }

        const totalItems = newItems.reduce((sum, i) => sum + i.quantity, 0)
        const totalAmount = newItems.reduce((sum, i) => sum + i.price * i.quantity, 0)

        set({ items: newItems, totalItems, totalAmount })
      },

      removeItem: (bookId) => {
        const newItems = get().items.filter((i) => i.bookId !== bookId)
        const totalItems = newItems.reduce((sum, i) => sum + i.quantity, 0)
        const totalAmount = newItems.reduce((sum, i) => sum + i.price * i.quantity, 0)
        set({ items: newItems, totalItems, totalAmount })
      },

      updateQuantity: (bookId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(bookId)
          return
        }
        const newItems = get().items.map((i) =>
          i.bookId === bookId ? { ...i, quantity } : i
        )
        const totalItems = newItems.reduce((sum, i) => sum + i.quantity, 0)
        const totalAmount = newItems.reduce((sum, i) => sum + i.price * i.quantity, 0)
        set({ items: newItems, totalItems, totalAmount })
      },

      clearCart: () => {
        set({ items: [], totalItems: 0, totalAmount: 0 })
      },
    }),
    {
      name: 'kitabi-cart',
    }
  )
)
