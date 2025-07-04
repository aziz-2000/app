"use client"

import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { User } from '@supabase/supabase-js'

interface UserSessionContextType {
  user: User | null
  loading: boolean
  isCheckingSession: boolean
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
}

const UserSessionContext = createContext<UserSessionContextType | undefined>(undefined)

export function UserSessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isCheckingSession, setIsCheckingSession] = useState(true)
  const [isInitialized, setIsInitialized] = useState(false)
  const supabase = createClientComponentClient()
  const sessionCheckedRef = useRef(false)
  const mountedRef = useRef(true)

  useEffect(() => {
    let isMounted = true
    mountedRef.current = true
    
    // فحص الجلسة الحالية مرة واحدة فقط
    const checkSession = async () => {
      if (sessionCheckedRef.current) {
        if (isMounted) setIsCheckingSession(false)
        return
      }
      
      if (isMounted) setIsCheckingSession(true)
      try {
        if (isMounted) setLoading(true)
        sessionCheckedRef.current = true

        // محاولة الحصول على الجلسة
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('Session error:', sessionError)
          // إذا كان خطأ الجلسة مفقودة، جرب getUser
          if (sessionError.message?.includes('Auth session missing')) {
            console.log('⚠️ Session missing, trying getUser()...')
            const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser()
            if (userError) {
              console.error('User error:', userError)
              if (isMounted) setUser(null)
            } else if (currentUser) {
              console.log('✅ User found via getUser():', currentUser.email)
              if (isMounted) setUser(currentUser)
            } else {
              if (isMounted) setUser(null)
            }
          } else {
            if (isMounted) setUser(null)
          }
        } else if (session?.user) {
          console.log('✅ User session found:', session.user.email)
          if (isMounted) setUser(session.user)
        } else {
          console.log('⚠️ No active session found')
          if (isMounted) setUser(null)
        }
      } catch (error) {
        console.error('Error checking session:', error)
        if (isMounted) setUser(null)
      } finally {
        if (isMounted) {
          setLoading(false)
          setIsCheckingSession(false)
          setIsInitialized(true)
        }
      }
    }

    checkSession()

    // الاستماع لتغييرات المصادقة فقط عند التغييرات الفعلية
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state changed:', event, session?.user?.email)
        
        // تجاهل الأحداث إذا لم يتم التهيئة بعد
        if (!isInitialized || !mountedRef.current) {
          return
        }
        
        // تجاهل تحديث التوكن لتجنب إعادة التحميل
        if (event === 'TOKEN_REFRESHED') {
          console.log('🔄 Token refreshed for:', session?.user?.email)
          return
        }
        
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('✅ User signed in:', session.user.email)
          setUser(session.user)
        } else if (event === 'SIGNED_OUT') {
          console.log('🚪 User signed out')
          setUser(null)
        } else if (event === 'USER_UPDATED' && session?.user) {
          console.log('👤 User updated:', session.user.email)
          setUser(session.user)
        }
      }
    )

    return () => {
      isMounted = false
      mountedRef.current = false
      subscription.unsubscribe()
    }
  }, [isInitialized])

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Sign out error:', error)
        throw error
      }
      console.log('✅ User signed out successfully')
    } catch (error) {
      console.error('Error signing out:', error)
      throw error
    }
  }

  const refreshUser = async () => {
    try {
      const { data: { user: refreshedUser }, error } = await supabase.auth.getUser()
      if (error) {
        console.error('Error refreshing user:', error)
        return
      }
      setUser(refreshedUser)
    } catch (error) {
      console.error('Error refreshing user:', error)
    }
  }

  const value = {
    user,
    loading,
    isCheckingSession,
    signOut,
    refreshUser
  }

  return (
    <UserSessionContext.Provider value={value}>
      {children}
    </UserSessionContext.Provider>
  )
}

export function useUserSession() {
  const context = useContext(UserSessionContext)
  if (context === undefined) {
    throw new Error('useUserSession must be used within a UserSessionProvider')
  }
  return context
} 