"use client"

import React, { useState, useEffect, useRef } from "react"
import { BookOpen, Clock, CheckCircle, Circle, TrendingUp, Calendar } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { getUserEnrollments, getEnrollmentStats, CourseEnrollment } from "@/lib/course-enrollment"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useUserSession } from "@/components/user-session"

export default function EnrollmentsPage() {
  const [enrollments, setEnrollments] = useState<CourseEnrollment[]>([])
  const [enrollmentsWithCourse, setEnrollmentsWithCourse] = useState<any[]>([])
  const [stats, setStats] = useState({
    totalEnrollments: 0,
    completedCourses: 0,
    inProgressCourses: 0,
    averageProgress: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()
  const { user, loading: authLoading, isCheckingSession } = useUserSession()
  const dataFetchedRef = useRef(false)
  const userIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (isCheckingSession || authLoading) return;
    if (!user) {
      dataFetchedRef.current = false
      userIdRef.current = null
      return
    }
    if (dataFetchedRef.current && userIdRef.current === user.id) {
      setLoading(false)
      return
    }
    fetchEnrollments()
  }, [user, isCheckingSession, authLoading])

  const fetchEnrollments = async () => {
    try {
      setLoading(true)
      const [enrollmentsResult, statsResult] = await Promise.all([
        getUserEnrollments(),
        getEnrollmentStats()
      ])

      if (enrollmentsResult.error) {
        setError(enrollmentsResult.error)
        return
      }

      setEnrollments(enrollmentsResult.enrollments)
      
      // جلب بيانات المسار لكل تسجيل
      const supabase = createClientComponentClient()
      const enrollmentsWithCourse = await Promise.all(
        enrollmentsResult.enrollments.map(async (enrollment) => {
          const { data: course } = await supabase
            .from('courses')
            .select('id, title')
            .eq('id', enrollment.course_id)
            .single()
          return { ...enrollment, course }
        })
      )
      setEnrollmentsWithCourse(enrollmentsWithCourse)
      
      if (statsResult.stats) {
        setStats(statsResult.stats)
      }
      // تحديث المرجع لمنع إعادة الجلب
      dataFetchedRef.current = true
      userIdRef.current = user?.id || null
    } catch (err) {
      setError('فشل في تحميل التسجيلات')
      console.error('Error fetching enrollments:', err)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'مكتمل':
        return 'bg-green-600 text-white'
      case 'مستمر':
        return 'bg-blue-600 text-white'
      case 'متوقف':
        return 'bg-gray-600 text-white'
      default:
        return 'bg-gray-600 text-white'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'مكتمل':
        return <CheckCircle className="w-4 h-4" />
      case 'مستمر':
        return <TrendingUp className="w-4 h-4" />
      case 'متوقف':
        return <Circle className="w-4 h-4" />
      default:
        return <Circle className="w-4 h-4" />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">جاري تحميل التسجيلات...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">{error}</div>
          <Button onClick={fetchEnrollments} className="bg-[#8648f9] hover:bg-[#8648f9]/80">
            إعادة المحاولة
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white to-[#8648f9] bg-clip-text text-transparent">
            تسجيلاتي
          </h1>
          <p className="text-xl text-gray-300">
            تتبع تقدمك في جميع المسارات المسجلة
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gray-900/50 border-[#8648f9]/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">إجمالي التسجيلات</CardTitle>
              <BookOpen className="h-4 w-4 text-[#8648f9]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.totalEnrollments}</div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-[#8648f9]/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">المسارات المكتملة</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.completedCourses}</div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-[#8648f9]/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">قيد التقدم</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.inProgressCourses}</div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-[#8648f9]/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">متوسط التقدم</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.averageProgress}%</div>
            </CardContent>
          </Card>
        </div>

        {/* Enrollments List */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-white mb-4">المسارات المسجلة</h2>
          
          {enrollmentsWithCourse.length === 0 ? (
            <Card className="bg-gray-900/50 border-[#8648f9]/20">
              <CardContent className="text-center py-12">
                <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">لا توجد تسجيلات</h3>
                <p className="text-gray-400 mb-6">لم تقم بالتسجيل في أي مسار بعد</p>
                <Link href="/courses">
                  <Button className="bg-[#8648f9] hover:bg-[#8648f9]/80 text-white">
                    استكشف المسارات
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {enrollmentsWithCourse.map((enrollment) => (
                <Card key={enrollment.id} className="bg-gray-900/50 border-[#8648f9]/20 hover:border-[#8648f9]/40 transition-all">
                  <CardHeader>
                    <div className="flex items-center justify-between mb-2">
                      <Badge className={getStatusColor(enrollment.status)}>
                        {getStatusIcon(enrollment.status)}
                        <span className="mr-1">{enrollment.status}</span>
                      </Badge>
                      <div className="flex items-center justify-between text-sm text-gray-400">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 ml-1" />
                          {new Date(enrollment.enrolled_at).toLocaleDateString('en-US')}
                        </div>
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 ml-1" />
                          {enrollment.last_accessed ? 
                            new Date(enrollment.last_accessed).toLocaleDateString('en-US') :
                            'لم يتم الوصول'
                          }
                        </div>
                      </div>
                    </div>
                    <CardTitle className="text-white">{enrollment.course?.title || `المسار ${enrollment.course_id}`}</CardTitle>
                    <CardDescription className="text-gray-300">
                      آخر وصول: {enrollment.last_accessed ? 
                        new Date(enrollment.last_accessed).toLocaleDateString('en-US') : 
                        'غير محدد'
                      }
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm text-gray-400 mb-1">
                          <span>التقدم</span>
                          <span>{enrollment.progress}%</span>
                        </div>
                        <Progress value={enrollment.progress} className="h-2" />
                      </div>
                      
                      <Link href={`/lessons/${enrollment.course_id}`}>
                          <Button className="w-full bg-[#8648f9] hover:bg-[#8648f9]/80 text-white">
                            {enrollment.status === 'مكتمل' ? 'مراجعة المسار' : 'استمر في التعلم'}
                          </Button>
                        </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 