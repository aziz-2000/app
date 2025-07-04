"use client"

import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Award, 
  Trophy, 
  Star, 
  Calendar, 
  BookOpen, 
  Target,
  TrendingUp,
  Clock,
  Users,
  CheckCircle,
  Loader2,
  RefreshCw
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { getUserBadges, checkAndFixMissingBadges } from '@/lib/badges'
import { useUserSession } from '@/components/user-session'
import { useToast } from '@/hooks/use-toast'

export default function BadgesPage() {
  const [badges, setBadges] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [fixing, setFixing] = useState(false)
  const { toast } = useToast()
  const { user, isCheckingSession } = useUserSession()
  
  // إضافة useRef لمنع إعادة الجلب المتكرر
  const badgesFetchedRef = useRef(false)
  const userIdRef = useRef<string | null>(null)
  const autoFixRunRef = useRef(false)

  const fetchBadges = async () => {
    try {
      setLoading(true)
      const result = await getUserBadges()
      
      if (result.error) {
        console.error('Error fetching badges:', result.error)
        toast({
          title: "خطأ",
          description: result.error,
          variant: "destructive",
        })
        return
      }
      
      setBadges(result.badges || [])
      
      // تحديث المراجع لمنع إعادة الجلب
      badgesFetchedRef.current = true
      userIdRef.current = user?.id || null
    } catch (error) {
      console.error('Error in fetchBadges:', error)
      toast({
        title: "خطأ",
        description: "حدث خطأ غير متوقع",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const runAutoFix = async () => {
    try {
      setFixing(true)
      console.log('🔧 Running automatic missing badges fix...')
      
      const result = await checkAndFixMissingBadges()
      
      if (result.success) {
        if (result.createdBadges > 0 || result.awardedBadges > 0) {
          toast({
            title: "تم الإصلاح",
            description: `تم إنشاء ${result.createdBadges} شارة جديدة ومنح ${result.awardedBadges} شارة`,
          })
          // إعادة جلب الشارات بعد الإصلاح
          await fetchBadges()
        } else {
          toast({
            title: "لا توجد مشاكل",
            description: "جميع الشارات موجودة ومحدثة",
          })
        }
      } else {
        toast({
          title: "خطأ في الإصلاح",
          description: result.error || "حدث خطأ أثناء الإصلاح",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error in runAutoFix:', error)
      toast({
        title: "خطأ",
        description: "حدث خطأ غير متوقع أثناء الإصلاح",
        variant: "destructive",
      })
    } finally {
      setFixing(false)
    }
  }

  useEffect(() => {
    // لا تجلب البيانات إذا كان التحقق من الجلسة قيد التنفيذ
    if (isCheckingSession) {
      return
    }

    // لا تجلب البيانات إذا لم يكن هناك مستخدم
    if (!user) {
      setLoading(false)
      badgesFetchedRef.current = false
      userIdRef.current = null
      autoFixRunRef.current = false
      return
    }

    // لا تجلب البيانات إذا كان نفس المستخدم وتم جلب البيانات من قبل
    if (badgesFetchedRef.current && userIdRef.current === user.id) {
      setLoading(false)
      return
    }

    fetchBadges()
  }, [user?.id, isCheckingSession])

  // تشغيل الإصلاح التلقائي عند تحميل الصفحة
  useEffect(() => {
    const autoFixOnLoad = async () => {
      // لا تشغل الإصلاح التلقائي إذا كان التحقق من الجلسة قيد التنفيذ
      if (isCheckingSession) {
        return
      }

      // لا تشغل الإصلاح التلقائي إذا لم يكن هناك مستخدم
      if (!user) {
        return
      }

      // لا تشغل الإصلاح التلقائي إذا تم تشغيله من قبل
      if (autoFixRunRef.current) {
        return
      }

      try {
        console.log('🔧 Running automatic missing badges fix on page load...')
        const result = await checkAndFixMissingBadges()
        if (result.success && (result.createdBadges > 0 || result.awardedBadges > 0)) {
          console.log(`✅ Auto-fix completed on page load: ${result.createdBadges} badges created, ${result.awardedBadges} badges awarded`)
          // إعادة جلب الشارات إذا تم إنشاء شارات جديدة
          if (result.awardedBadges > 0) {
            await fetchBadges()
          }
        }
        autoFixRunRef.current = true
      } catch (error) {
        console.error('⚠️ Auto-fix failed on page load:', error)
        // لا نعرض رسالة خطأ للمستخدم لأن هذا يحدث في الخلفية
      }
    }

    // تشغيل الإصلاح التلقائي بعد تحميل الشارات
    if (!loading && badges.length === 0 && !autoFixRunRef.current) {
      autoFixOnLoad()
    }
  }, [loading, badges.length, user?.id, isCheckingSession])

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'مبتدئ': return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/20'
      case 'متوسط': return 'bg-blue-500/20 text-blue-500 border-blue-500/20'
      case 'متقدم': return 'bg-green-500/20 text-green-500 border-green-500/20'
      default: return 'bg-gray-500/20 text-gray-500 border-gray-500/20'
    }
  }

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'مبتدئ': return <BookOpen className="w-4 h-4" />
      case 'متوسط': return <Target className="w-4 h-4" />
      case 'متقدم': return <TrendingUp className="w-4 h-4" />
      default: return <Award className="w-4 h-4" />
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  // إظهار مؤشر التحميل إذا كان التحقق من الجلسة قيد التنفيذ
  if (isCheckingSession) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>جاري التحقق من الجلسة...</span>
        </div>
      </div>
    )
  }

  // إظهار مؤشر التحميل إذا كان التحميل قيد التنفيذ
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>جاري تحميل الشارات...</span>
        </div>
      </div>
    )
  }

  // إظهار رسالة إذا لم يكن هناك مستخدم
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">يجب تسجيل الدخول</h2>
          <p className="text-gray-400 mb-4">يجب تسجيل الدخول لعرض الشارات</p>
          <Link href="/login">
            <Button>تسجيل الدخول</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (badges.length === 0) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Award className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">لا توجد شارات بعد</h3>
          <p className="text-gray-400 mb-4">
            ابدأ رحلتك التعليمية وأكمل المسارات للحصول على شارات الإنجاز
          </p>
          <div className="space-y-4">
            <Link href="/courses">
              <Button className="bg-[#8648f9] hover:bg-[#7c3aed] w-full">
                <BookOpen className="w-4 h-4 ml-2" />
                استكشف المسارات
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-800 w-full">
                <Target className="w-4 h-4 ml-2" />
                لوحة التحكم
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="bg-gradient-to-b from-[#8648f9]/20 to-transparent py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="p-3 rounded-full bg-[#8648f9]/20">
                <Trophy className="w-8 h-8 text-[#8648f9]" />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-white mb-4">شاراتي</h1>
            <p className="text-gray-300 text-lg max-w-2xl mx-auto mb-6">
              مجموعة شارات الإنجاز التي حصلت عليها من خلال إكمال المسارات التعليمية
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 mb-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-gray-900/50 border-[#8648f9]/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">إجمالي الشارات</p>
                  <p className="text-white text-2xl font-bold">{badges.length}</p>
                </div>
                <Trophy className="w-8 h-8 text-[#8648f9]" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-green-500/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">المسارات المكتملة</p>
                  <p className="text-white text-2xl font-bold">
                    {new Set(badges.map(badge => badge.badge_id)).size}
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-blue-500/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">أحدث شارة</p>
                  <p className="text-white text-sm">
                    {badges.length > 0 
                      ? formatDate(badges[0].awarded_at).split(' ').slice(0, 2).join(' ')
                      : 'لا توجد'
                    }
                  </p>
                </div>
                <Star className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-yellow-500/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">المستوى الأعلى</p>
                  <p className="text-white text-sm">
                    {badges.length > 0 
                      ? badges.reduce((highest, badge) => {
                          const levels = { 'مبتدئ': 1, 'متوسط': 2, 'متقدم': 3 }
                          const currentLevel = levels[badge.course_level as keyof typeof levels] || 0
                          const highestLevel = levels[highest.course_level as keyof typeof levels] || 0
                          return currentLevel > highestLevel ? badge : highest
                        }).course_level
                      : 'لا توجد'
                    }
                  </p>
                </div>
                <Target className="w-8 h-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Badges Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {badges.map((badge, index) => (
            <Card 
              key={badge.id} 
              className="bg-gray-900/50 border-[#8648f9]/20 hover:border-[#8648f9]/40 transition-all duration-300 hover:scale-105 group"
            >
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between mb-4">
                  <Badge 
                    variant="outline" 
                    className={getLevelColor(badge.course_level)}
                  >
                    {getLevelIcon(badge.course_level)}
                    <span className="mr-1">{badge.course_level}</span>
                  </Badge>
                  <div className="flex items-center gap-1 text-sm text-gray-400">
                    <Star className="w-4 h-4 text-yellow-500" />
                    <span>#{index + 1}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  {badge.badge_image_url ? (
                    <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-800 flex items-center justify-center shadow-lg">
                      <Image
                        src={badge.badge_image_url}
                        alt={badge.badge_name}
                        width={64}
                        height={64}
                        className="object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    </div>
                  ) : (
                    <div 
                      className="w-16 h-16 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300"
                      style={{ backgroundColor: badge.badge_color }}
                    >
                      <Award className="w-8 h-8 text-white" />
                    </div>
                  )}
                  <div className="flex-1">
                    <CardTitle className="text-white text-lg mb-1">{badge.badge_name}</CardTitle>
                    <p className="text-gray-400 text-sm">{badge.course_title}</p>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <p className="text-gray-300 text-sm mb-4 line-clamp-2">
                  {badge.badge_description || 'شارة إنجاز لمسار تعليمي'}
                </p>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">تاريخ الحصول:</span>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-white">{formatDate(badge.awarded_at)}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">اللون:</span>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-4 h-4 rounded-full border border-gray-600"
                        style={{ backgroundColor: badge.badge_color }}
                      />
                      <span className="text-white text-xs">{badge.badge_color}</span>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 pt-4 border-t border-gray-700">
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>تم إكمال المسار بنجاح</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Footer CTA */}
      {badges.length > 0 && (
        <div className="bg-gradient-to-t from-[#8648f9]/10 to-transparent py-12">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h3 className="text-2xl font-bold text-white mb-4">
              استمر في التعلم واكتسب المزيد من الشارات!
            </h3>
            <p className="text-gray-300 mb-6">
              كل شارة تمثل إنجازاً جديداً في رحلتك التعليمية. استكشف المزيد من المسارات
            </p>
            <Link href="/courses">
              <Button className="bg-[#8648f9] hover:bg-[#7c3aed]">
                <BookOpen className="w-4 h-4 ml-2" />
                استكشف المسارات
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
} 