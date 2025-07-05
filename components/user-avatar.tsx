"use client"

import React, { useState, useEffect, useRef } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { User, LogOut, BookOpen, Trophy, Calendar } from 'lucide-react'
import { useUserSession } from './user-session'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import { getUserProfile } from '@/lib/user-profile'

export function UserAvatar() {
  const { user, signOut, loading: userLoading, isCheckingSession } = useUserSession()
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const profileFetchedRef = useRef(false)
  const userIdRef = useRef<string | null>(null)

  useEffect(() => {
    // لا تجلب البيانات إذا كان التحقق من الجلسة قيد التنفيذ
    if (isCheckingSession) {
      return
    }

    // لا تجلب البيانات إذا لم يكن هناك مستخدم
    if (!user) {
      setUserProfile(null)
      setProfileLoading(false)
      profileFetchedRef.current = false
      userIdRef.current = null
      return
    }

    // لا تجلب البيانات إذا كان نفس المستخدم وتم جلب البيانات من قبل
    if (profileFetchedRef.current && userIdRef.current === user.id) {
      return
    }

    const fetchUserProfile = async () => {
      try {
        setProfileLoading(true)
        const { profile, error } = await getUserProfile()
        
        if (error) {
          console.error('Error fetching user profile:', error)
          // لا نريد أن نعرض خطأ للمستخدم هنا، فقط نستخدم البيانات المتاحة
        }
        
        setUserProfile(profile)
        profileFetchedRef.current = true
        userIdRef.current = user.id
      } catch (error) {
        console.error('Unexpected error fetching user profile:', error)
        // في حالة الخطأ غير المتوقع، نستخدم بيانات المستخدم الأساسية
        setUserProfile(null)
      } finally {
        setProfileLoading(false)
      }
    }

    fetchUserProfile()
  }, [user?.id, isCheckingSession]) // اعتمد على user.id بدلاً من user كاملاً

  // إظهار مؤشر التحميل فقط إذا كان التحقق من الجلسة قيد التنفيذ
  if (isCheckingSession || userLoading) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-gray-600 rounded-full animate-pulse"></div>
        <div className="w-20 h-4 bg-gray-600 rounded animate-pulse"></div>
      </div>
    )
  }

  // إظهار مؤشر التحميل للملف الشخصي فقط إذا كان المستخدم مسجل دخول
  if (user && profileLoading) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-gray-600 rounded-full animate-pulse"></div>
        <div className="w-20 h-4 bg-gray-600 rounded animate-pulse"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <Link href="/login">
        <Button variant="outline" size="sm" className="border-[#8648f9] text-[#8648f9] hover:bg-[#8648f9]/10">
          <User className="w-4 h-4 ml-2" />
          تسجيل الدخول
        </Button>
      </Link>
    )
  }

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true)
      await signOut()
      toast({
        title: "تم تسجيل الخروج",
        description: "تم تسجيل خروجك بنجاح",
      })
      router.push('/')
    } catch (error) {
      console.error('Error signing out:', error)
      toast({
        title: "خطأ في تسجيل الخروج",
        description: "حدث خطأ أثناء تسجيل الخروج",
        variant: "destructive",
      })
    } finally {
      setIsSigningOut(false)
    }
  }

  // استخراج الأحرف الأولى من اسم المستخدم من قاعدة البيانات
  const getUserInitials = () => {
    if (userProfile?.full_name) {
      const name = userProfile.full_name
      const words = name.split(' ')
      if (words.length >= 2) {
        return `${words[0][0]}${words[1][0]}`.toUpperCase()
      }
      return name[0].toUpperCase()
    }
    
    if (user.email) {
      return user.email[0].toUpperCase()
    }
    
    return 'U'
  }

  const getUserDisplayName = () => {
    if (userProfile?.full_name) {
      return userProfile.full_name
    }
    
    if (user.email) {
      return user.email.split('@')[0]
    }
    
    return 'مستخدم'
  }

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-auto p-2 rounded-lg hover:bg-gray-800 flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage 
                src={userProfile?.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture} 
                alt={getUserDisplayName()}
              />
              <AvatarFallback className="bg-[#8648f9] text-white font-semibold">
                {getUserInitials()}
              </AvatarFallback>
            </Avatar>
            <div className="hidden md:flex flex-col items-start text-right">
              <span className="text-sm font-medium text-white leading-none">
                {getUserDisplayName()}
              </span>
              <span className="text-xs text-gray-400 leading-none">
                {user.email}
              </span>
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{getUserDisplayName()}</p>
              <p className="text-xs leading-none text-muted-foreground">
                {user.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          <Link href="/dashboard">
            <DropdownMenuItem className="cursor-pointer">
              <BookOpen className="w-4 h-4 ml-2" />
              لوحة التحكم
            </DropdownMenuItem>
          </Link>
          
          <Link href="/dashboard/enrollments">
            <DropdownMenuItem className="cursor-pointer">
              <Trophy className="w-4 h-4 ml-2" />
              مساراتي
            </DropdownMenuItem>
          </Link>
          
          <Link href="/courses">
            <DropdownMenuItem className="cursor-pointer">
              <Calendar className="w-4 h-4 ml-2" />
              جميع المسارات
            </DropdownMenuItem>
          </Link>
          
          <DropdownMenuSeparator />
          
          <Link href="/profile">
            <DropdownMenuItem className="cursor-pointer">
              <User className="w-4 h-4 ml-2" />
              الملف الشخصي
            </DropdownMenuItem>
          </Link>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            className="cursor-pointer text-red-600 focus:text-red-600"
            onClick={handleSignOut}
            disabled={isSigningOut}
          >
            <LogOut className="w-4 h-4 ml-2" />
            {isSigningOut ? 'جاري تسجيل الخروج...' : 'تسجيل الخروج'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
} 