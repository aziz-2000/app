'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Bell, X, Trash2 } from 'lucide-react'
import { useUserSession } from './user-session'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useToast } from '@/hooks/use-toast'

export function NotificationsButton() {
  const { user, loading } = useUserSession()
  const [notifications, setNotifications] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (!user) return
    const supabase = createClientComponentClient()
    supabase
      .from('notifications')
      .select('*')
      .or(`user_id.eq.${user.id},user_id.is.null`)
      .order('created_at', { ascending: false })
      .then(({ data }) => setNotifications(data || []))
  }, [user])

  // عداد غير المقروءة
  const unreadCount = notifications.filter(n => !n.is_read).length

  // إغلاق القائمة عند الضغط خارجها
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    } else {
      document.removeEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  // تحديث حالة الإشعار إلى مقروء عند فتح القائمة
  useEffect(() => {
    if (open && unreadCount > 0 && user) {
      const supabase = createClientComponentClient()
      const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id)
      if (unreadIds.length > 0) {
        supabase.from('notifications').update({ is_read: true }).in('id', unreadIds).then(() => {
          setNotifications(prev => prev.map(n => unreadIds.includes(n.id) ? { ...n, is_read: true } : n))
        })
      }
    }
  }, [open, unreadCount, user, notifications])

  // دالة حذف الإشعار
  const handleDeleteNotification = async (notificationId: number) => {
    setDeletingId(notificationId)
    const supabase = createClientComponentClient()
    
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)
    
    setDeletingId(null)
    
    if (error) {
      toast({
        title: "خطأ",
        description: "فشل في حذف الإشعار",
        variant: "destructive"
      })
    } else {
      // إزالة الإشعار من القائمة المحلية
      setNotifications(prev => prev.filter(n => n.id !== notificationId))
      toast({
        title: "تم الحذف",
        description: "تم حذف الإشعار بنجاح"
      })
    }
  }

  // لا تظهر أي شيء إذا كان المستخدم في حالة تحميل أو غير مسجل دخول
  if (loading || !user) {
    return null
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="icon"
        className="relative text-gray-300 hover:text-[#8648f9] hover:bg-[#8648f9]/20"
        onClick={() => setOpen(o => !o)}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-xs text-white flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </Button>
      {open && (
        <div className="absolute left-1/2 -translate-x-1/2 mt-2 w-80 bg-black border border-[#8648f9]/20 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          <div className="p-3 border-b border-[#8648f9]/10 text-sm font-bold text-[#8648f9] flex items-center justify-between">
            <span>الإشعارات</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-gray-400 hover:text-white"
              onClick={() => setOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-gray-400">لا توجد إشعارات</div>
          ) : (
            notifications.map((n) => (
              <div key={n.id} className={`px-4 py-3 border-b border-[#8648f9]/10 text-sm ${n.is_read ? 'bg-black' : 'bg-[#8648f9]/10'} relative group`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1 pr-2">
                    <div className="font-semibold text-white mb-1">{n.title}</div>
                    <div className="text-gray-400 mb-1">{n.message}</div>
                    <div className="text-xs text-gray-500 text-left">{new Date(n.created_at).toLocaleString('ar-EG')}</div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleDeleteNotification(n.id)}
                    disabled={deletingId === n.id}
                  >
                    {deletingId === n.id ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-red-500" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
} 