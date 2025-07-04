"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Menu, X, Shield, BookOpen, LayoutDashboard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { UserAvatar } from "./user-avatar"
import { NotificationsButton } from "./notifications-button"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useUserSession } from "./user-session"

type Notification = {
  id: number;
  user_id: string | null;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
};

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)

  // استخدام useMemo لمنع إعادة إنشاء المصفوفة
  const navItems = useMemo(() => [
    { href: "/", label: "الرئيسية", icon: Shield },
    { href: "/courses", label: "المسارات", icon: BookOpen },
    { href: "/dashboard", label: "لوحة التحكم", icon: LayoutDashboard },
  ], [])

  // استخدام useCallback لمنع إعادة إنشاء الدالة
  const toggleMenu = useCallback(() => {
    setIsOpen(prev => !prev)
  }, [])

  const closeMenu = useCallback(() => {
    setIsOpen(false)
  }, [])

  const { user } = useUserSession()
  const [notifications, setNotifications] = useState<Notification[]>([])

  useEffect(() => {
    if (!user) return
    const supabase = createClientComponentClient()
    supabase
      .from("notifications")
      .select("*")
      .or(`user_id.eq.${user.id},user_id.is.null`)
      .order("created_at", { ascending: false })
      .then(({ data }) => setNotifications(data || []))
  }, [user])

  return (
    <nav className="bg-black/95 backdrop-blur-sm border-b border-[#8648f9]/20 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2 space-x-reverse">
            <Image src="/logo.png" alt="شعار المنصة" width={140} height={40} className="w-30 h-10" />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center justify-between flex-1 mx-8">
            <div className="flex items-center space-x-8 space-x-reverse">
              {navItems.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center space-x-2 space-x-reverse text-gray-300 hover:text-[#8648f9] transition-colors duration-200"
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </div>
            <div className="flex items-center space-x-4 space-x-reverse">
              <NotificationsButton />
              <UserAvatar />
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMenu}
              className="text-white hover:bg-[#8648f9]/20"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 bg-black/95 border-t border-[#8648f9]/20">
              {navItems.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center space-x-2 space-x-reverse px-3 py-2 text-gray-300 hover:text-[#8648f9] hover:bg-[#8648f9]/10 rounded-md transition-colors duration-200"
                    onClick={closeMenu}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
              <div className="px-3 py-2">
                <div className="flex justify-center items-center gap-2">
                  <NotificationsButton />
                  <UserAvatar />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
