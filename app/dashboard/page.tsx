"use client"

import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  BookOpen, 
  Trophy, 
  Clock, 
  Target, 
  TrendingUp, 
  Calendar,
  Play,
  CheckCircle,
  Loader2,
  Award,
  Star
} from 'lucide-react'
import Link from 'next/link'
import { useUserSession } from '@/components/user-session'
import { getUserEnrollments, getEnrollmentStats, CourseEnrollment } from '@/lib/course-enrollment'
import { getCourseProgressStats } from '@/lib/lesson-progress'
import { getUserBadges, UserBadge } from '@/lib/badges'
import { useRouter } from 'next/navigation'
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js'
import { Radar } from 'react-chartjs-2'

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
)

interface CourseWithEnrollment extends CourseEnrollment {
  course?: {
    id: number
    title: string
    description: string
    level: string
    duration: string
    image?: string
  }
}

export default function DashboardPage() {
  const { user, loading: authLoading, isCheckingSession } = useUserSession()
  const [enrollments, setEnrollments] = useState<CourseWithEnrollment[]>([])
  const [userBadges, setUserBadges] = useState<UserBadge[]>([])
  const [stats, setStats] = useState({
    totalEnrollments: 0,
    completedCourses: 0,
    inProgressCourses: 0,
    averageProgress: 0
  })
  const [loading, setLoading] = useState(true)
  const [courseProgress, setCourseProgress] = useState<{ [courseId: number]: number }>({})
  const router = useRouter()
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

    fetchDashboardData()
  }, [user?.id, isCheckingSession, authLoading])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      console.log('📊 Fetching dashboard data...')
      console.log('👤 Current user:', user ? user.email : 'null')
      
      // جلب تسجيلات المستخدم
      const { enrollments: userEnrollments, error: enrollmentsError } = await getUserEnrollments()
      
      if (enrollmentsError) {
        console.error('❌ Error fetching enrollments:', enrollmentsError)
        
        // إذا كان الخطأ يتعلق بتسجيل الدخول، توجيه لصفحة تسجيل الدخول
        if (enrollmentsError.includes('يجب تسجيل الدخول أولاً')) {
          console.log('🔄 Redirecting to login due to authentication error')
          router.push('/login')
          return
        }
        return
      }

      console.log('✅ Enrollments loaded:', userEnrollments.length)

      // جلب بيانات المسارات لكل تسجيل
      const enrollmentsWithCourses = await Promise.all(
        userEnrollments.map(async (enrollment) => {
          try {
            const { createClientComponentClient } = await import('@supabase/auth-helpers-nextjs')
            const supabase = createClientComponentClient()
            
            const { data: course } = await supabase
              .from('courses')
              .select('id, title, description, level, duration, image, category')
              .eq('id', enrollment.course_id)
              .single()

            return {
              ...enrollment,
              course: course || undefined
            }
          } catch (error) {
            console.error('Error fetching course data:', error)
            return enrollment
          }
        })
      )

      setEnrollments(enrollmentsWithCourses)
      console.log('✅ Courses data loaded for enrollments')

      // جلب نسب التقدم من lesson_progress لكل مسار
      const progressMap: { [courseId: number]: number } = {}
      await Promise.all(
        enrollmentsWithCourses.map(async (enrollment) => {
          if (enrollment.course_id) {
            try {
              const { stats } = await getCourseProgressStats(enrollment.course_id)
              progressMap[enrollment.course_id] = stats?.averageProgress || 0
            } catch (e) {
              progressMap[enrollment.course_id] = 0
            }
          }
        })
      )
      setCourseProgress(progressMap)

      // جلب الشارات الحقيقية من قاعدة البيانات
      const { badges: badgesData, error: badgesError } = await getUserBadges()
      if (badgesError) {
        console.error('❌ Error fetching badges:', badgesError)
        // لا نوقف التحميل إذا فشل جلب الشارات، فقط نضع مصفوفة فارغة
        setUserBadges([])
      } else {
        setUserBadges(badgesData)
        console.log('✅ User badges loaded:', badgesData.length)
      }

      // جلب الإحصائيات
      const { stats: userStats } = await getEnrollmentStats()
      setStats(userStats)
      console.log('✅ Stats loaded:', userStats)

      // تحديث المراجع لمنع إعادة الجلب
      dataFetchedRef.current = true
      userIdRef.current = user?.id || null

      console.log('enrollments', enrollmentsWithCourses);
      console.log('courseProgress', progressMap);

    } catch (error) {
      console.error('❌ Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Get course status based on progress
  const getCourseStatus = (courseId: number) => {
    const progress = courseProgress[courseId] || 0
    if (progress >= 100) {
      return { status: 'completed', text: 'تم الانتهاء', color: 'bg-green-600' }
    } else if (progress > 0) {
      return { status: 'in-progress', text: 'قيد التقدم', color: 'bg-blue-600' }
    } else {
      return { status: 'enrolled', text: 'مفعل', color: 'bg-[#8648f9]' }
    }
  }

  // Calculate skills matrix based on completed courses categories
  const calculateSkillsMatrix = () => {
    const skillsMap = {
      'شبكات': 0,
      'اختبار الاختراق': 0,
      'أنظمة التشغيل': 0,
      'التحليل الجنائي': 0,
      'الاستجابة للحوادث': 0,
      'تحليل البرمجيات الخبيثة': 0,
      'التشفير': 0
    }

    // حساب نقاط المهارات بناءً على المسارات المكتملة
    enrollments.forEach(enrollment => {
      const progress = courseProgress[enrollment.course_id] || 0
      const course = enrollment.course
      
      if (progress >= 100 && course) {
        // إضافة نقاط للمسار المكتمل بناءً على تصنيفه
        const category = (course as any).category || 'شبكات'
        const basePoints = 25 // نقاط أساسية للمسار المكتمل
        
        switch (category) {
          case 'شبكات':
            skillsMap['شبكات'] += basePoints
            break
          case 'اختبار الاختراق':
            skillsMap['اختبار الاختراق'] += basePoints
            skillsMap['شبكات'] += 10
            break
          case 'أنظمة التشغيل':
            skillsMap['أنظمة التشغيل'] += basePoints
            skillsMap['شبكات'] += 10
            break
          case 'التحليل الجنائي':
            skillsMap['التحليل الجنائي'] += basePoints
            skillsMap['الاستجابة للحوادث'] += 15
            break
          case 'الاستجابة للحوادث':
            skillsMap['الاستجابة للحوادث'] += basePoints
            skillsMap['التحليل الجنائي'] += 15
            break
          case 'تحليل البرمجيات الخبيثة':
            skillsMap['تحليل البرمجيات الخبيثة'] += basePoints
            skillsMap['التحليل الجنائي'] += 15
            break
          case 'التشفير':
            skillsMap['التشفير'] += basePoints
            skillsMap['شبكات'] += 10
            skillsMap['أنظمة التشغيل'] += 10
            break
        }
      } else if (progress > 0) {
        // إضافة نقاط جزئية للمسارات قيد التقدم
        const category = (course as any).category || 'شبكات'
        const partialPoints = Math.floor((progress / 100) * 15) // نقاط جزئية
        
        switch (category) {
          case 'شبكات':
            skillsMap['شبكات'] += partialPoints
            break
          case 'اختبار الاختراق':
            skillsMap['اختبار الاختراق'] += partialPoints
            break
          case 'أنظمة التشغيل':
            skillsMap['أنظمة التشغيل'] += partialPoints
            break
          case 'التحليل الجنائي':
            skillsMap['التحليل الجنائي'] += partialPoints
            break
          case 'الاستجابة للحوادث':
            skillsMap['الاستجابة للحوادث'] += partialPoints
            break
          case 'تحليل البرمجيات الخبيثة':
            skillsMap['تحليل البرمجيات الخبيثة'] += partialPoints
            break
          case 'التشفير':
            skillsMap['التشفير'] += partialPoints
            break
        }
      }
    })

    // إضافة نقاط أساسية للخبرة العامة
    const totalCompleted = enrollments.filter(e => (courseProgress[e.course_id] || 0) >= 100).length
    const totalEnrolled = enrollments.length
    
    if (totalCompleted > 0) {
      Object.keys(skillsMap).forEach(skill => {
        skillsMap[skill as keyof typeof skillsMap] += Math.min(20, totalCompleted * 3)
      })
    }

    // التأكد من أن القيم لا تتجاوز 100
    Object.keys(skillsMap).forEach(skill => {
      skillsMap[skill as keyof typeof skillsMap] = Math.min(100, Math.max(1, skillsMap[skill as keyof typeof skillsMap]))
    })

    console.log('skillsMatrix', skillsMap);

    return skillsMap
  }

  // Get user display name
  const getUserDisplayName = () => {
    if (user?.user_metadata?.name) {
      return user.user_metadata.name
    }
    
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name
    }
    
    if (user?.email) {
      return user.email.split('@')[0]
    }
    
    return 'مستخدم'
  }

  // Get badge icon based on badge name
  const getBadgeIcon = (badgeName: string) => {
    const name = badgeName.toLowerCase()
    if (name.includes('مبتدئ') || name.includes('beginner')) {
      return <Trophy className="w-8 h-8 text-yellow-400" />
    } else if (name.includes('متوسط') || name.includes('intermediate')) {
      return <Trophy className="w-8 h-8 text-gray-400" />
    } else if (name.includes('متقدم') || name.includes('advanced')) {
      return <Trophy className="w-8 h-8 text-purple-400" />
    } else if (name.includes('خبير') || name.includes('expert')) {
      return <Award className="w-8 h-8 text-red-400" />
    } else {
      return <Star className="w-8 h-8 text-blue-400" />
    }
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
          <span>جاري تحميل البيانات...</span>
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
          <p className="text-gray-400 mb-4">يجب تسجيل الدخول لعرض لوحة التحكم</p>
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
          <h1 className="text-4xl font-bold text-white mb-2">لوحة التحكم</h1>
          <p className="text-gray-400">مرحباً {getUserDisplayName()}، تابع تقدمك في المسارات التعليمية</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gray-900/50 border-[#8648f9]/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">إجمالي المسارات</CardTitle>
              <BookOpen className="h-4 w-4 text-[#8648f9]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.totalEnrollments}</div>
              <p className="text-xs text-gray-400">مسار مفعل</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-[#8648f9]/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">المسارات المكتملة</CardTitle>
              <Trophy className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.completedCourses}</div>
              <p className="text-xs text-gray-400">مسار مكتمل</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-[#8648f9]/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">قيد التقدم</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.inProgressCourses}</div>
              <p className="text-xs text-gray-400">مسار قيد التعلم</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-[#8648f9]/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">متوسط التقدم</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{Math.round(stats.averageProgress)}%</div>
              <p className="text-xs text-gray-400">من إجمالي المسارات</p>
            </CardContent>
          </Card>
        </div>

        {/* Enrolled Courses */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">مساراتي المفعلة</h2>
            <div className="flex gap-2">
              <Link href="/dashboard/completed-courses">
                <Button variant="outline" className="border-green-500 text-green-500 hover:bg-green-500/10">
                  <Trophy className="w-4 h-4 ml-2" />
                  المسارات المكتملة
                </Button>
              </Link>
              <Link href="/courses">
                <Button variant="outline" className="border-[#8648f9] text-[#8648f9] hover:bg-[#8648f9]/10">
                  <BookOpen className="w-4 h-4 ml-2" />
                  استكشف مسارات جديدة
                </Button>
              </Link>
            </div>
          </div>

          {enrollments.length === 0 ? (
            <Card className="bg-gray-900/50 border-[#8648f9]/20">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BookOpen className="w-16 h-16 text-gray-600 mb-4" />
                <h3 className="text-xl font-semibold text-gray-300 mb-2">لا توجد مسارات مفعلة</h3>
                <p className="text-gray-400 text-center mb-6">
                  لم تقم بتفعيل أي مسار بعد. ابدأ رحلة التعلم الآن!
                </p>
                <Link href="/courses">
                  <Button className="bg-[#8648f9] hover:bg-[#8648f9]/80">
                    <Play className="w-4 h-4 ml-2" />
                    استكشف المسارات
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {enrollments.map((enrollment) => (
                <Card key={enrollment.id} className="bg-gray-900/50 border-[#8648f9]/20 hover:border-[#8648f9]/40 transition-all">
                  <CardHeader>
                    <div className="flex items-center justify-between mb-2">
                      <Badge 
                        className={getCourseStatus(enrollment.course_id).color}
                      >
                        {getCourseStatus(enrollment.course_id).status === 'completed' ? (
                          <>
                            <CheckCircle className="w-3 h-3 ml-1" />
                            {getCourseStatus(enrollment.course_id).text}
                          </>
                        ) : getCourseStatus(enrollment.course_id).status === 'in-progress' ? (
                          <>
                            <Clock className="w-3 h-3 ml-1" />
                            {getCourseStatus(enrollment.course_id).text}
                          </>
                        ) : (
                          <>
                            <Target className="w-3 h-3 ml-1" />
                            {getCourseStatus(enrollment.course_id).text}
                          </>
                        )}
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
                      <div>
                        <div className="flex justify-between text-sm text-gray-400 mb-1">
                          <span>التقدم</span>
                          <span>{courseProgress[enrollment.course_id] ?? 0}%</span>
                        </div>
                        <Progress value={courseProgress[enrollment.course_id] ?? 0} className="h-2" />
                      </div>
                      
                      <div className="flex items-center justify-between text-sm text-gray-400">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 ml-1" />
                          {enrollment.course?.duration || 'غير محدد'}
                        </div>
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 ml-1" />
                          {enrollment.last_accessed ? 
                            new Date(enrollment.last_accessed).toLocaleDateString('en-GB') : 
                            'لم يتم الوصول'
                          }
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Link href={`/lessons/${enrollment.course_id}`} className="flex-1">
                          <Button className="w-full bg-[#8648f9] hover:bg-[#8648f9]/80">
                            <Play className="w-4 h-4 ml-2" />
                            {getCourseStatus(enrollment.course_id).text === 'تم الانتهاء' ? 'مراجعة' : 'استمر'}
                          </Button>
                        </Link>
                        <Link href={`/dashboard/enrollments`} className="flex-1">
                          <Button variant="outline" className="w-full border-[#8648f9] text-[#8648f9] hover:bg-[#8648f9]/10">
                            <Target className="w-4 h-4 ml-2" />
                            التفاصيل
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-gray-900/50 border-[#8648f9]/20">
            <CardHeader>
              <CardTitle className="text-white">Skills Matrix</CardTitle>
              <CardDescription className="text-gray-400">
                تحليل مهاراتك في مجال الأمن السيبراني بناءً على المسارات المكتملة وتصنيفاتها
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <Radar
                  data={{
                    labels: [
                      'شبكات',
                      'اختبار الاختراق',
                      'أنظمة التشغيل',
                      'التحليل الجنائي',
                      'الاستجابة للحوادث',
                      'تحليل البرمجيات الخبيثة',
                      'التشفير'
                    ],
                    datasets: [
                      {
                        label: 'مستوى المهارة',
                        data: (() => {
                          const skillsMatrix = calculateSkillsMatrix()
                          return [
                            skillsMatrix['شبكات'],
                            skillsMatrix['اختبار الاختراق'],
                            skillsMatrix['أنظمة التشغيل'],
                            skillsMatrix['التحليل الجنائي'],
                            skillsMatrix['الاستجابة للحوادث'],
                            skillsMatrix['تحليل البرمجيات الخبيثة'],
                            skillsMatrix['التشفير']
                          ]
                        })(),
                        backgroundColor: 'rgba(134, 72, 249, 0.15)',
                        borderColor: 'rgba(134, 72, 249, 0.8)',
                        borderWidth: 3,
                        pointBackgroundColor: 'rgba(134, 72, 249, 0.9)',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        pointRadius: 6,
                        pointHoverBackgroundColor: 'rgba(134, 72, 249, 1)',
                        pointHoverBorderColor: '#fff',
                        pointHoverBorderWidth: 3,
                        pointHoverRadius: 8,
                        fill: true,
                        tension: 0.4,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                      intersect: false,
                      mode: 'index',
                    },
                    scales: {
                      r: {
                        beginAtZero: true,
                        max: 100,
                        min: 0,
                        ticks: {
                          stepSize: 25,
                          color: '#9CA3AF',
                          font: {
                            family: 'Tajawal, sans-serif',
                            size: 11,
                            weight: 'normal'
                          },
                          callback: function(value) {
                            return '' // إخفاء الأرقام المئوية
                          }
                        },
                        grid: {
                          color: 'rgba(156, 163, 175, 0.15)',
                          lineWidth: 1
                        },
                        angleLines: {
                          color: 'rgba(156, 163, 175, 0.15)',
                          lineWidth: 1
                        },
                        pointLabels: {
                          color: '#E5E7EB',
                          font: {
                            family: 'Tajawal, sans-serif',
                            size: 12,
                            weight: 'bold'
                          },
                          padding: 15
                        }
                      }
                    },
                    plugins: {
                      legend: {
                        display: false
                      },
                      tooltip: {
                        backgroundColor: 'rgba(17, 24, 39, 0.95)',
                        titleColor: '#F9FAFB',
                        bodyColor: '#E5E7EB',
                        borderColor: 'rgba(134, 72, 249, 0.6)',
                        borderWidth: 2,
                        cornerRadius: 8,
                        padding: 12,
                        displayColors: false,
                        titleFont: {
                          family: 'Tajawal, sans-serif',
                          size: 14,
                          weight: 'bold'
                        },
                        bodyFont: {
                          family: 'Tajawal, sans-serif',
                          size: 13,
                          weight: 'normal'
                        },
                        callbacks: {
                          title: function(context) {
                            return context[0].label
                          },
                          label: function(context) {
                            const value = context.parsed.r
                            const skillName = (context as any)[0]?.label || ''
                            let level = ''
                            if (value >= 80) level = 'ممتاز'
                            else if (value >= 60) level = 'جيد جداً'
                            else if (value >= 40) level = 'جيد'
                            else if (value >= 20) level = 'مقبول'
                            else level = 'مبتدئ'
                            
                            // حساب المسارات المكتملة لهذه المهارة
                            const completedCoursesForSkill = enrollments.filter(enrollment => {
                              const progress = courseProgress[enrollment.course_id] || 0
                              const course = enrollment.course
                              if (progress >= 100 && course) {
                                const category = (course as any).category || 'شبكات'
                                switch (skillName) {
                                  case 'شبكات':
                                    return ['شبكات', 'اختبار الاختراق', 'أنظمة التشغيل', 'التشفير'].includes(category)
                                  case 'اختبار الاختراق':
                                    return ['اختبار الاختراق'].includes(category)
                                  case 'أنظمة التشغيل':
                                    return ['أنظمة التشغيل', 'التشفير'].includes(category)
                                  case 'التحليل الجنائي':
                                    return ['التحليل الجنائي', 'الاستجابة للحوادث', 'تحليل البرمجيات الخبيثة'].includes(category)
                                  case 'الاستجابة للحوادث':
                                    return ['الاستجابة للحوادث', 'التحليل الجنائي'].includes(category)
                                  case 'تحليل البرمجيات الخبيثة':
                                    return ['تحليل البرمجيات الخبيثة', 'التحليل الجنائي'].includes(category)
                                  case 'التشفير':
                                    return ['التشفير'].includes(category)
                                  default:
                                    return false
                                }
                              }
                              return false
                            }).length
                            
                            return [
                              `المستوى: ${value}%`,
                              `التقييم: ${level}`,
                              `المسارات المكتملة: ${completedCoursesForSkill} مسار`,
                              `إجمالي المسارات: ${enrollments.length} مسار`
                            ]
                          }
                        }
                      }
                    },
                    elements: {
                      point: {
                        hoverRadius: 8,
                        radius: 6
                      }
                    }
                  }}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-[#8648f9]/20">
            <CardHeader>
              <CardTitle className="text-white">شاراتي</CardTitle>
              <CardDescription className="text-gray-400">
                شارات إنجازاتك في رحلة التعلم
              </CardDescription>
            </CardHeader>
            <CardContent>
              {userBadges.length === 0 ? (
                <div className="text-center py-8">
                  <Trophy className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h4 className="text-lg font-semibold text-gray-300 mb-2">لا توجد شارات بعد</h4>
                  <p className="text-gray-400 mb-4">أكمل المسارات التعليمية للحصول على شارات الإنجاز</p>
                  <Link href="/courses">
                    <Button className="bg-[#8648f9] hover:bg-[#8648f9]/80">
                      <Play className="w-4 h-4 ml-2" />
                      ابدأ التعلم
                    </Button>
                  </Link>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    {userBadges.slice(0, 4).map((badge) => (
                      <div key={badge.id} className="text-center p-3 rounded-lg bg-gray-800/50">
                        <div 
                          className="w-16 h-16 mx-auto mb-2 rounded-full flex items-center justify-center shadow-lg"
                          style={{ backgroundColor: badge.badge_color }}
                        >
                          {badge.badge_image_url ? (
                            <img 
                              src={badge.badge_image_url} 
                              alt={badge.badge_name}
                              className="w-12 h-12 rounded-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none'
                                e.currentTarget.nextElementSibling?.classList.remove('hidden')
                              }}
                            />
                          ) : null}
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center bg-white/10 ${badge.badge_image_url ? 'hidden' : ''}`}>
                            {getBadgeIcon(badge.badge_name)}
                          </div>
                        </div>
                        <h4 className="text-sm font-semibold text-white mb-1 line-clamp-1">
                          {badge.badge_name}
                        </h4>
                        <p className="text-xs text-gray-400 line-clamp-2">
                          {badge.course_title}
                        </p>
                        <div className="flex items-center justify-center mt-2">
                          <Star className="w-3 h-3 text-yellow-400 ml-1" />
                          <span className="text-xs text-gray-400">
                            {new Date(badge.awarded_at).toLocaleDateString('en-US')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {userBadges.length > 4 && (
                    <div className="text-center mb-4">
                      <Badge variant="outline" className="border-[#8648f9] text-[#8648f9]">
                        +{userBadges.length - 4} شارات أخرى
                      </Badge>
                    </div>
                  )}
                  
                  <div className="text-center">
                    <Link href="/badges">
                      <Button variant="outline" className="border-[#8648f9] text-[#8648f9] hover:bg-[#8648f9]/10">
                        <Trophy className="w-4 h-4 ml-2" />
                        عرض جميع الشارات ({userBadges.length})
                      </Button>
                    </Link>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
