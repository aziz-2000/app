"use client"

import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Trophy, 
  Calendar, 
  Eye, 
  Star,
  CheckCircle,
  Loader2,
  Award,
  Clock,
  Medal,
  Sparkles
} from 'lucide-react'
import Link from 'next/link'
import { useUserSession } from '@/components/user-session'
import { getCompletedCourses } from '@/lib/course-enrollment'
import { getUserBadges, getUserBadgeStats, UserBadge, BadgeStats } from '@/lib/badges'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'

interface CompletedCourseEnrollment {
  id: string
  user_id: string
  course_id: number
  enrolled_at: string
  progress: number
  status: "مستمر" | "مكتمل" | "متوقف"
  last_accessed?: string
  total_time_spent?: number
  completed_at?: string
  course?: {
    id: number
    title: string
    description: string
    level: string
    duration: string
    image?: string
  }
}

export default function CompletedCoursesPage() {
  const { user, loading: authLoading, isCheckingSession } = useUserSession()
  const [completedCourses, setCompletedCourses] = useState<CompletedCourseEnrollment[]>([])
  const [userBadges, setUserBadges] = useState<UserBadge[]>([])
  const [badgeStats, setBadgeStats] = useState<BadgeStats>({
    total_badges: 0,
    total_courses_completed: 0,
    completion_rate: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { toast } = useToast()
  
  // إضافة useRef لمنع إعادة الجلب المتكرر
  const dataFetchedRef = useRef(false)
  const userIdRef = useRef<string | null>(null)

  useEffect(() => {
    // لا تجلب البيانات إذا كان التحقق من الجلسة قيد التنفيذ
    if (isCheckingSession) {
      return
    }

    // لا تجلب البيانات إذا لم يكن هناك مستخدم
    if (!user) {
      setLoading(false)
      dataFetchedRef.current = false
      userIdRef.current = null
      return
    }

    // لا تجلب البيانات إذا كان نفس المستخدم وتم جلب البيانات من قبل
    if (dataFetchedRef.current && userIdRef.current === user.id) {
      setLoading(false)
      return
    }

    // لا تجلب البيانات إذا كان التحميل قيد التنفيذ
    if (authLoading) {
      return
    }

    fetchCompletedCourses()
  }, [user?.id, isCheckingSession, authLoading])

  const fetchCompletedCourses = async () => {
    try {
      setLoading(true)
      console.log('🏆 Fetching completed courses and badges...')
      
      // جلب المسارات المكتملة
      const { completedCourses: courses, error: coursesError } = await getCompletedCourses()
      
      if (coursesError) {
        console.error('❌ Error fetching completed courses:', coursesError)
        setError(coursesError)
        return
      }

      // جلب شارات المستخدم
      const { badges, error: badgesError } = await getUserBadges()
      
      if (badgesError) {
        console.error('❌ Error fetching user badges:', badgesError)
        // لا نوقف التحميل إذا فشل جلب الشارات
      }

      // جلب إحصائيات الشارات
      const { stats, error: statsError } = await getUserBadgeStats()
      
      if (statsError) {
        console.error('❌ Error fetching badge stats:', statsError)
        // لا نوقف التحميل إذا فشل جلب الإحصائيات
      }

      console.log('✅ Data loaded:', {
        courses: courses.length,
        badges: badges?.length || 0,
        stats
      })
      
      setCompletedCourses(courses as CompletedCourseEnrollment[])
      setUserBadges(badges || [])
      if (stats) setBadgeStats(stats)

      // تحديث المراجع لمنع إعادة الجلب
      dataFetchedRef.current = true
      userIdRef.current = user?.id || null
    } catch (error) {
      console.error('❌ Error in fetchData:', error)
      setError('حدث خطأ غير متوقع')
    } finally {
      setLoading(false)
    }
  }

  // البحث عن شارة مسار معين
  const getBadgeForCourse = (courseId: number) => {
    return userBadges.find(badge => 
      badge.course_title.toLowerCase().includes('مسار') || 
      badge.course_title.toLowerCase().includes('course') ||
      badge.course_title.toLowerCase().includes('أساسيات') ||
      badge.course_title.toLowerCase().includes('اختبار') ||
      badge.course_title.toLowerCase().includes('شبكات') ||
      badge.course_title.toLowerCase().includes('تحليل') ||
      badge.course_title.toLowerCase().includes('تطبيقات') ||
      badge.course_title.toLowerCase().includes('حوادث')
    )
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
          <span>جاري تحميل المسارات المكتملة والشارات...</span>
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
          <p className="text-gray-400 mb-4">يجب تسجيل الدخول لعرض المسارات المكتملة</p>
          <Link href="/login">
            <Button>تسجيل الدخول</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Trophy className="w-8 h-8 text-[#8648f9]" />
            <h1 className="text-4xl font-bold text-white">المسارات المكتملة والشارات</h1>
          </div>
          <p className="text-gray-400">استعرض إنجازاتك والشارات التي حصلت عليها</p>
        </div>

        {/* Badge Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gray-900/50 border-[#8648f9]/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">الشارات المكتسبة</CardTitle>
              <Medal className="h-4 w-4 text-[#8648f9]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{badgeStats.total_badges}</div>
              <p className="text-xs text-gray-400">شارة مكتسبة</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-[#8648f9]/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">المسارات المكتملة</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{badgeStats.total_courses_completed}</div>
              <p className="text-xs text-gray-400">مسار مكتمل</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-[#8648f9]/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">معدل الإكمال</CardTitle>
              <Sparkles className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{badgeStats.completion_rate}%</div>
              <p className="text-xs text-gray-400">من المسارات المسجلة</p>
            </CardContent>
          </Card>
        </div>

        {error ? (
          <Card className="bg-gray-900/50 border-red-500/20">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="text-red-500 text-center">
                <p className="text-lg font-semibold mb-2">حدث خطأ</p>
                <p className="text-gray-400">{error}</p>
                <Button 
                  onClick={fetchCompletedCourses}
                  className="mt-4 bg-[#8648f9] hover:bg-[#8648f9]/80"
                >
                  إعادة المحاولة
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : completedCourses.length === 0 ? (
          <Card className="bg-gray-900/50 border-[#8648f9]/20">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Trophy className="w-16 h-16 text-gray-600 mb-4" />
              <h3 className="text-xl font-semibold text-gray-300 mb-2">لا توجد مسارات مكتملة</h3>
              <p className="text-gray-400 text-center mb-6">
                لم تكمل أي مسار بعد. ابدأ رحلة التعلم الآن!
              </p>
              <Link href="/courses">
                <Button className="bg-[#8648f9] hover:bg-[#8648f9]/80">
                  <Award className="w-4 h-4 ml-2" />
                  استكشف المسارات
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {completedCourses.map((enrollment) => {
              const courseBadge = getBadgeForCourse(enrollment.course_id)
              
              return (
                <Card key={enrollment.id} className="bg-gray-900/50 border-[#8648f9]/20 hover:border-[#8648f9]/40 transition-all">
                  <CardHeader>
                    <div className="flex items-center justify-between mb-2">
                      <Badge className="bg-green-600">
                        <CheckCircle className="w-3 h-3 ml-1" />
                        مكتمل
                      </Badge>
                      <Badge variant="outline" className="border-gray-600 text-gray-400">
                        {enrollment.course?.level || 'غير محدد'}
                      </Badge>
                    </div>
                    <CardTitle className="text-white text-lg line-clamp-2">
                      {enrollment.course?.title || `المسار ${enrollment.course_id}`}
                    </CardTitle>
                    <CardDescription className="text-gray-400 line-clamp-2">
                      {enrollment.course?.description || 'لا يوجد وصف متوفر'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Badge Display */}
                      {courseBadge ? (
                        <div className="bg-gradient-to-r from-[#8648f9]/10 to-purple-600/10 p-4 rounded-lg border border-[#8648f9]/20">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-12 h-12 rounded-full flex items-center justify-center"
                              style={{ backgroundColor: courseBadge.badge_color }}
                            >
                              <Trophy className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1">
                              <h4 className="text-white font-semibold text-sm">{courseBadge.badge_name}</h4>
                              <p className="text-gray-400 text-xs">{courseBadge.badge_description}</p>
                              <p className="text-[#8648f9] text-xs mt-1">
                                تم منحها في {new Date(courseBadge.awarded_at).toLocaleDateString('en-US')}
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-gray-800/30 p-4 rounded-lg border border-gray-700/50">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center">
                              <Medal className="w-6 h-6 text-gray-500" />
                            </div>
                            <div className="flex-1">
                              <h4 className="text-gray-400 font-semibold text-sm">شارة المسار</h4>
                              <p className="text-gray-500 text-xs">سيتم منحها قريباً</p>
                            </div>
                          </div>
                        </div>
                      )}

                      <div>
                        <div className="flex justify-between text-sm text-gray-400 mb-1">
                          <span>التقدم</span>
                          <span>{enrollment.progress}%</span>
                        </div>
                        <Progress value={enrollment.progress} className="h-2" />
                      </div>
                      
                      <div className="flex items-center justify-between text-sm text-gray-400">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 ml-1" />
                          {enrollment.course?.duration || 'غير محدد'}
                        </div>
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 ml-1" />
                          {enrollment.completed_at ? 
                            new Date(enrollment.completed_at).toLocaleDateString('en-US') :
                            'غير محدد'
                          }
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Link href={`/lessons/${enrollment.course_id}`} className="flex-1">
                          <Button variant="outline" className="w-full border-[#8648f9] text-[#8648f9] hover:bg-[#8648f9]/10">
                            <Eye className="w-4 h-4 ml-2" />
                            مراجعة
                          </Button>
                        </Link>
                        {courseBadge && (
                          <Button 
                            className="flex-1 bg-gradient-to-r from-[#8648f9] to-purple-600 hover:from-[#8648f9]/80 hover:to-purple-600/80"
                            onClick={() => {
                              toast({
                                title: "🎉 تهانينا!",
                                description: `لقد حصلت على شارة ${courseBadge.badge_name}`,
                              })
                            }}
                          >
                            <Trophy className="w-4 h-4 ml-2" />
                            عرض الشارة
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* All Badges Section */}
        {userBadges.length > 0 && (
          <div className="mt-12">
            <Card className="bg-gray-900/50 border-[#8648f9]/20">
              <CardHeader>
                <CardTitle className="text-white">جميع شاراتي</CardTitle>
                <CardDescription className="text-gray-400">
                  الشارات التي حصلت عليها من إكمال المسارات
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {userBadges.map((badge, index) => (
                    <div 
                      key={index}
                      className="bg-gradient-to-r from-gray-800/50 to-gray-700/50 p-4 rounded-lg border border-gray-600/30 hover:border-[#8648f9]/40 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-10 h-10 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: badge.badge_color }}
                        >
                          <Trophy className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-white font-semibold text-sm">{badge.badge_name}</h4>
                          <p className="text-gray-400 text-xs">{badge.course_title}</p>
                          <p className="text-[#8648f9] text-xs mt-1">
                            {new Date(badge.awarded_at).toLocaleDateString('en-US')}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
} 