import * as React from 'react'

export type ToastVariant = 'success' | 'info' | 'warning' | 'danger'

export interface NotificationItem {
  id: number
  title: string
  description?: string
  variant: ToastVariant
  timestamp: Date
  read: boolean
}

interface ToastContextValue {
  showToast: (title: string, description?: string, variant?: ToastVariant) => void
  notifications: NotificationItem[]
  unreadCount: number
  markAsRead: (id: number) => void
  markAllAsRead: () => void
  clearAll: () => void
  removeNotification: (id: number) => void
}

const ToastContext = React.createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = React.useState<NotificationItem[]>([])

  const showToast = React.useCallback(
    (title: string, description?: string, variant: ToastVariant = 'success') => {
      const newNotification: NotificationItem = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        title,
        description,
        variant,
        timestamp: new Date(),
        read: false,
      }
      setNotifications((prev) => [newNotification, ...prev])
    },
    []
  )

  const markAsRead = React.useCallback((id: number) => {
    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, read: true } : item))
    )
  }, [])

  const markAllAsRead = React.useCallback(() => {
    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })))
  }, [])

  const clearAll = React.useCallback(() => {
    setNotifications([])
  }, [])

  const removeNotification = React.useCallback((id: number) => {
    setNotifications((prev) => prev.filter((item) => item.id !== id))
  }, [])

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <ToastContext.Provider
      value={{
        showToast,
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        clearAll,
        removeNotification,
      }}
    >
      {children}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = React.useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
