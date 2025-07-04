"use client"

import { useState, useEffect, use } from "react"
import {
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Clock,
  CheckCircle,
  Circle,
  Download,
  FileText,
  Beaker,
  GraduationCap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { getCourseWithLessons, Course } from "@/app/admin/dashboard/services/courses"
import { getLabs, Lab } from "@/app/admin/dashboard/services/labs"
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { checkEnrollment, updateLastAccessed } from "@/lib/course-enrollment"
import { useUserSession } from "@/components/user-session"
import { useRouter } from "next/navigation"
import { getCompletedLessons, markLessonAsCompleted, getCourseProgressStats, checkCourseCompletionOnLessonComplete } from "@/lib/lesson-progress"
import { checkCourseCompletionAndAwardBadge } from "@/lib/badge-award"

interface LessonMaterial {
  id: number
  file_url: string
  file_name: string
}

interface Lesson {
  id: number
  title: string
  course_id?: number
  duration?: string
  lesson_order?: number
  status?: string
  content?: string
  description?: string
  created_at?: string
  admin_id?: string
  user_id?: string
  materials?: LessonMaterial[]
}

export default function LessonsPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = use(params)
  const [currentLesson, setCurrentLesson] = useState(0)
  const [completedLessons, setCompletedLessons] = useState<number[]>([])
  const [courseData, setCourseData] = useState<Course | null>(null)
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [labs, setLabs] = useState<Lab[]>([])
  const [availableCourses, setAvailableCourses] = useState<{id: number, title: string}[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [adminInfo, setAdminInfo] = useState<{name: string, email: string, role: string, avatar_url?: string} | null>(null)
  const [userRating, setUserRating] = useState(0)
  const [averageRating, setAverageRating] = useState<number | null>(null)
  const [ratingLoading, setRatingLoading] = useState(false)
  const [ratingError, setRatingError] = useState("")
  const [ratingSuccess, setRatingSuccess] = useState(false)
  const [isEnrolled, setIsEnrolled] = useState(false)
  const [enrollmentLoading, setEnrollmentLoading] = useState(true)
  const [progressStats, setProgressStats] = useState({
    totalLessons: 0,
    completedLessons: 0,
    inProgressLessons: 0,
    averageProgress: 0,
    totalTimeSpent: 0
  })
  const [progressLoading, setProgressLoading] = useState(false)
  
  const { user, loading: authLoading } = useUserSession()
  const router = useRouter()

  // التحقق من تسجيل المستخدم في المسار
  useEffect(() => {
    const checkUserEnrollment = async () => {
      try {
        setEnrollmentLoading(true)
        const courseIdNum = parseInt(courseId)
        if (isNaN(courseIdNum)) {
          setIsEnrolled(false)
          return
        }

        const { isEnrolled: enrolled } = await checkEnrollment(courseIdNum)
        setIsEnrolled(enrolled)

        // تحديث آخر وقت وصول إذا كان المستخدم مسجل
        if (enrolled) {
          await updateLastAccessed(courseIdNum)
        }
      } catch (error) {
        console.error('Error in enrollment check:', error)
        setIsEnrolled(false)
      } finally {
        setEnrollmentLoading(false)
      }
    }

    if (!authLoading) {
      checkUserEnrollment()
    }
  }, [courseId, authLoading])

  // جلب بيانات المسار والدروس
  useEffect(() => {
    const fetchCourseData = async () => {
      try {
        setLoading(true)
        console.log('Fetching data for courseId:', courseId)
        
        // فحص صحة courseId
        const courseIdNum = parseInt(courseId)
        if (isNaN(courseIdNum) || courseIdNum <= 0) {
          throw new Error('معرف المسار غير صحيح')
        }
        
        // فحص حالة المستخدم
        console.log('Current user from session:', user)
        
        // فحص جداول قاعدة البيانات
        try {
          const { data: coursesCount, error: coursesCountError } = await createClientComponentClient()
            .from('courses')
            .select('id', { count: 'exact' })
          
          const { data: lessonsCount, error: lessonsCountError } = await createClientComponentClient()
            .from('lessons')
            .select('id', { count: 'exact' })
          
          const { data: labsCount, error: labsCountError } = await createClientComponentClient()
            .from('labs')
            .select('id', { count: 'exact' })
          
          console.log('Database tables check:', {
            courses: { count: coursesCount, error: coursesCountError },
            lessons: { count: lessonsCount, error: lessonsCountError },
            labs: { count: labsCount, error: labsCountError }
          })
          
          // جلب قائمة المسارات الموجودة للتشخيص
          const { data: availableCoursesData, error: availableCoursesError } = await createClientComponentClient()
            .from('courses')
            .select('id, title')
            .order('id')
          
          console.log('Available courses:', availableCoursesData, 'Error:', availableCoursesError)
          
          if (availableCoursesData && availableCoursesData.length > 0) {
            console.log('Available course IDs:', availableCoursesData.map(c => c.id))
            setAvailableCourses(availableCoursesData)
          }
        } catch (tableCheckError) {
          console.error('Table check error:', tableCheckError)
        }
        
        // جلب بيانات المسار والدروس
        try {
          const { course, lessons: lessonsData } = await getCourseWithLessons(courseIdNum)
          console.log('Course and lessons loaded:', { course, lessonsCount: lessonsData.length })
          setCourseData(course)
          setLessons(lessonsData)
        } catch (courseError: any) {
          console.error('Error loading course/lessons:', courseError)
          console.error('Course error details:', {
            message: courseError.message,
            code: courseError.code,
            details: courseError.details,
            hint: courseError.hint,
            error: courseError
          })
          
          // محاولة جلب البيانات مباشرة من Supabase للتشخيص
          try {
            console.log('Attempting direct Supabase query for course:', courseIdNum)
            const { data: courseData, error: courseQueryError } = await createClientComponentClient()
              .from('courses')
              .select('*')
              .eq('id', courseIdNum)
            
            console.log('Direct course query result:', { courseData, courseQueryError })
            
            if (courseQueryError) {
              throw new Error(`Course query failed: ${courseQueryError.message}`)
            }
            
            if (!courseData || courseData.length === 0) {
              // جلب المسارات المتاحة لعرضها في رسالة الخطأ
              const { data: availableCourses } = await createClientComponentClient()
                .from('courses')
                .select('id, title')
                .order('id')
              
              const availableIds = availableCourses?.map(c => c.id).join(', ') || 'لا توجد مسارات'
              throw new Error(`المسار برقم ${courseIdNum} غير موجود. المسارات المتاحة: ${availableIds}`)
            }
            
            if (courseData.length > 1) {
              console.warn(`Multiple courses found with id ${courseIdNum}, using the first one`)
            }
            
            setCourseData(courseData[0])
            setLessons([])
          } catch (directError: any) {
            console.error('Direct query also failed:', directError)
            throw new Error(`Failed to load course: ${directError.message}`)
          }
        }
        
        // جلب المختبرات
        try {
          const labsData = await getLabs()
          console.log('Labs loaded:', labsData.length)
          const courseLabs = labsData.filter(lab => lab.course_id === courseIdNum)
          setLabs(courseLabs)
        } catch (labsError) {
          console.error('Error loading labs:', labsError)
          setLabs([])
        }
        
      } catch (err: any) {
        console.error('Error in fetchCourseData:', err)
        setError(err.message || 'فشل في تحميل بيانات المسار')
      } finally {
        setLoading(false)
      }
    }

    if (!authLoading) {
      fetchCourseData()
    }
  }, [courseId, authLoading])

  // جلب المواد التعليمية للدروس
  useEffect(() => {
    const fetchMaterialsForLessons = async () => {
      if (!lessons.length) return
      
      try {
        const lessonIds = lessons.map(lesson => lesson.id)
        const { data: materials, error } = await createClientComponentClient()
          .from('lesson_materials')
          .select('*')
          .in('lesson_id', lessonIds)
        
        if (error) {
          console.error('Error fetching lesson materials:', error)
          return
        }
        
        // تنظيم المواد حسب الدرس
        const materialsByLesson = materials?.reduce((acc, material) => {
          if (!acc[material.lesson_id]) {
            acc[material.lesson_id] = []
          }
          acc[material.lesson_id].push(material)
          return acc
        }, {} as Record<number, LessonMaterial[]>)
        
        // إضافة المواد للدروس
        setLessons(prevLessons => 
          prevLessons.map(lesson => ({
            ...lesson,
            materials: materialsByLesson?.[lesson.id] || []
          }))
        )
      } catch (error) {
        console.error('Error in fetchMaterialsForLessons:', error)
      }
    }

    fetchMaterialsForLessons()
  }, [lessons])

  // جلب التقييمات
  useEffect(() => {
    const fetchRatings = async () => {
      if (!courseData?.id) return
      
      try {
        // محاولة جلب التقييمات من Supabase أولاً
        const { data: tableCheck, error: tableError } = await createClientComponentClient()
          .from('lesson_ratings')
          .select('count', { count: 'exact', head: true })
          .limit(1)
        
        if (!tableError) {
          const { data: ratings, error } = await createClientComponentClient()
            .from('lesson_ratings')
            .select('rating')
            .eq('course_id', courseData.id)
          
          if (!error && ratings && ratings.length > 0) {
            const totalRating = ratings.reduce((sum, r) => sum + r.rating, 0)
            setAverageRating(totalRating / ratings.length)
            console.log('✅ Ratings loaded from Supabase')
            return
          }
        }
        
        // إذا فشل Supabase، استخدم localStorage
        console.log('Supabase ratings failed, using localStorage fallback...')
        if (user) {
          const allRatings = []
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i)
            if (key && key.startsWith(`rating_${user.id}_`)) {
              try {
                const rating = JSON.parse(localStorage.getItem(key) || '{}')
                if (rating.course_id === courseData.id) {
                  allRatings.push(rating.rating)
                }
              } catch (e) {
                console.error('Error parsing localStorage rating:', e)
              }
            }
          }
          
          if (allRatings.length > 0) {
            const avg = allRatings.reduce((sum, r) => sum + r, 0) / allRatings.length
            setAverageRating(avg)
            console.log('✅ Ratings loaded from localStorage')
          }
        }
        
      } catch (error: any) {
        console.log('Ratings functionality not available:', error.message)
        // لا نعرض خطأ للمستخدم لأن التقييمات ليست ضرورية
      }
    }

    fetchRatings()
  }, [courseData?.id, user])

  // جلب بيانات مصمم الدرس
  useEffect(() => {
    const fetchLessonDesigner = async () => {
      try {
        // جلب أول مصمم درس حقيقي في هذا المسار
        if (courseData?.id) {
          const { data: lessonDesigner, error } = await createClientComponentClient()
            .from('lessons')
            .select(`user_id, users!lessons_user_id_fkey (id, name, avatar_url)`)
            .eq('course_id', courseData.id)
            .not('user_id', 'is', null)
            .limit(1)
            .single()

          if (!error && lessonDesigner?.users) {
            const user = lessonDesigner.users as any
            setAdminInfo({
              name: user.name,
              email: '',
              role: '',
              avatar_url: user.avatar_url
            })
            return
          }
        }
        // إذا لم يوجد مصمم حقيقي، استخدم الافتراضي
        setAdminInfo({
          name: 'فريق التعليم',
          email: '',
          role: '',
          avatar_url: '/placeholder-user.jpg'
        })
      } catch (error) {
        setAdminInfo({
          name: 'فريق التعليم',
          email: '',
          role: '',
          avatar_url: '/placeholder-user.jpg'
        })
      }
    }
    fetchLessonDesigner()
  }, [currentLesson, courseData?.id])

  // جلب تقدم الدروس
  useEffect(() => {
    const loadLessonProgress = async () => {
      if (!courseData?.id || !user) return
      
      try {
        setProgressLoading(true)
        console.log('Loading lesson progress for course:', courseData.id)
        
        // جلب الدروس المكتملة
        const { lessonIds, error: completedError } = await getCompletedLessons(courseData.id)
        if (completedError) {
          console.error('Error loading completed lessons:', completedError)
        } else {
          setCompletedLessons(lessonIds)
          console.log('Completed lessons loaded:', lessonIds)
        }
        
        // جلب إحصائيات التقدم
        const { stats, error: statsError } = await getCourseProgressStats(courseData.id)
        if (statsError) {
          console.error('Error loading progress stats:', statsError)
        } else {
          setProgressStats(stats)
          console.log('Progress stats loaded:', stats)
        }
        
      } catch (error) {
        console.error('Error in loadLessonProgress:', error)
      } finally {
        setProgressLoading(false)
      }
    }

    loadLessonProgress()
  }, [courseData?.id, user])

  // دوال التنقل والتفاعل
  const markAsCompleted = async (lessonIndex: number) => {
    if (!courseData?.id || !user) return
    
    const lessonId = lessons[lessonIndex]?.id
    if (!lessonId) return
    
    try {
      console.log('Marking lesson as completed:', lessonId)
      
      const { success, error } = await markLessonAsCompleted(lessonId, courseData.id)
      
      if (success) {
        // تحديث الحالة المحلية
        if (!completedLessons.includes(lessonId)) {
          const newCompleted = [...completedLessons, lessonId]
          setCompletedLessons(newCompleted)
        }
        
        // التحقق من إكمال المسار
        console.log('🔍 Checking if course is completed...')
        const { courseCompleted, error: completionError } = await checkCourseCompletionOnLessonComplete(lessonId, courseData.id)
        
        if (completionError) {
          console.error('❌ Error checking course completion:', completionError)
        } else if (courseCompleted) {
          console.log('🎉 Course completed!')
          
          // التحقق من إعطاء الشارة
          console.log('🏆 Checking for badge award...')
          const { success: badgeSuccess, badge, error: badgeError } = await checkCourseCompletionAndAwardBadge(user.id, courseData.id)
          
          if (badgeSuccess && badge) {
            console.log('✅ Badge awarded successfully:', badge)
            // يمكن إضافة إشعار هنا لإخبار المستخدم بالشارة الجديدة
            alert(`🎉 مبروك! لقد أكملت المسار وحصلت على شارة: ${badge.course_badge?.name || 'شارة المسار'}`)
          } else if (badgeError) {
            console.log('⚠️ Badge award info:', badgeError)
            // لا نعرض خطأ للمستخدم لأن الشارة اختيارية
          }
        }
        
        // تحديث إحصائيات التقدم
        const { stats } = await getCourseProgressStats(courseData.id)
        setProgressStats(stats)
        
        console.log('✅ Lesson marked as completed successfully')
      } else {
        console.error('❌ Failed to mark lesson as completed:', error)
      }
    } catch (error) {
      console.error('Error in markAsCompleted:', error)
    }
  }

  const nextLesson = () => {
    if (currentLesson < lessons.length - 1) {
      setCurrentLesson(currentLesson + 1)
    }
  }

  const prevLesson = () => {
    if (currentLesson > 0) {
      setCurrentLesson(currentLesson - 1)
    }
  }

  // حساب التقدم
  const progress = lessons.length > 0 ? Math.round((completedLessons.length / lessons.length) * 100) : 0

  // دالة إرسال التقييم
  const handleSubmitRating = async () => {
    setRatingLoading(true)
    setRatingError("")
    setRatingSuccess(false)
    
    const lessonId = lessons[currentLesson]?.id
    if (!lessonId || userRating === 0) {
      setRatingError("يرجى اختيار تقييم")
      setRatingLoading(false)
      return
    }
    
    if (!user) {
      setRatingError("يجب تسجيل الدخول لتقييم الدرس")
      setRatingLoading(false)
      return
    }
    
    if (!courseData?.id) {
      setRatingError("بيانات المسار غير متوفرة")
      setRatingLoading(false)
      return
    }
    
    try {
      console.log('=== Rating Submission Debug ===')
      console.log('User:', user)
      console.log('Lesson ID:', lessonId)
      console.log('Course ID:', courseData.id)
      console.log('Rating:', userRating)
      
      // إعداد بيانات التقييم
      const ratingData = {
        lesson_id: lessonId,
        course_id: courseData.id,
        rating: userRating,
        comment: `تقييم لدرس: ${lessons[currentLesson]?.title}`
      }
      
      console.log('Submitting rating data:', ratingData)
      
      // محاولة استخدام API route أولاً
      try {
        console.log('Attempting API route...')
        const response = await fetch('/api/ratings/submit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(ratingData)
        })
        
        console.log('API response status:', response.status)
        console.log('API response headers:', Object.fromEntries(response.headers.entries()))
        
        let result
        try {
          const responseText = await response.text()
          console.log('API response text:', responseText)
          
          if (responseText) {
            result = JSON.parse(responseText)
          } else {
            result = {}
          }
        } catch (parseError) {
          console.error('Failed to parse response:', parseError)
          result = { error: 'فشل في تحليل الاستجابة' }
        }
        
        console.log('API response data:', result)
        
        if (response.ok && result.success) {
          setRatingSuccess(true)
          console.log('✅ Rating submitted successfully via API:', result)
          
          // تحديث المتوسط إذا تم إرجاعه
          if (result.averageRating !== null) {
            setAverageRating(result.averageRating)
            console.log('Updated average rating:', result.averageRating)
          }
          
          setRatingLoading(false)
          return
        } else {
          console.log('API route failed, trying fallback...')
          throw new Error(result.error || 'API route failed')
        }
        
      } catch (apiError) {
        console.log('API route error:', apiError)
        console.log('Using localStorage fallback...')
        
        // استخدام localStorage كحل بديل
        const fallbackKey = `rating_${user.id}_${lessonId}`
        const fallbackData = {
          ...ratingData,
          user_id: user.id,
          timestamp: new Date().toISOString(),
          method: 'localStorage'
        }
        
        localStorage.setItem(fallbackKey, JSON.stringify(fallbackData))
        
        // تحديث المتوسط المحلي
        const allRatings = []
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key && key.startsWith(`rating_${user.id}_`)) {
            try {
              const rating = JSON.parse(localStorage.getItem(key) || '{}')
              if (rating.lesson_id === lessonId) {
                allRatings.push(rating.rating)
              }
            } catch (e) {
              console.error('Error parsing localStorage rating:', e)
            }
          }
        }
        
        if (allRatings.length > 0) {
          const avg = allRatings.reduce((sum, r) => sum + r, 0) / allRatings.length
          setAverageRating(avg)
        }
        
        setRatingSuccess(true)
        console.log('✅ Rating saved to localStorage as fallback')
        
        setRatingLoading(false)
        return
      }
      
    } catch (error: any) {
      console.error('❌ Rating submission failed:', error)
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        type: typeof error
      })
      
      let errorMessage = "نظام التقييم غير متاح حالياً"
      
      if (error?.message) {
        errorMessage = `خطأ في التقييم: ${error.message}`
      } else if (error?.toString && error.toString() !== '[object Object]') {
        errorMessage = `خطأ في التقييم: ${error.toString()}`
      }
      
      setRatingError(errorMessage)
    } finally {
      setRatingLoading(false)
    }
  }

  // إذا لم يكن المستخدم مسجل دخول، توجيه لصفحة تسجيل الدخول
  if (!authLoading && !user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">يجب تسجيل الدخول أولاً</h2>
          <p className="text-gray-400 mb-6">يجب تسجيل الدخول لعرض دروس هذا المسار</p>
          <Link href="/login">
            <Button className="bg-[#8648f9] hover:bg-[#8648f9]/80">
              تسجيل الدخول
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  // إذا لم يكن المستخدم مسجل في المسار، توجيه لصفحة المسارات
  if (!enrollmentLoading && !isEnrolled) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">لم يتم تسجيلك في هذا المسار</h2>
          <p className="text-gray-400 mb-6">يجب تفعيل المسار أولاً لعرض الدروس</p>
          <Link href="/courses">
            <Button className="bg-[#8648f9] hover:bg-[#8648f9]/80">
              العودة للمسارات
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  if (loading || enrollmentLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">جاري التحميل...</div>
      </div>
    )
  }

  if (error || !courseData) {
    return (
      <div className="min-h-screen bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="mb-4">
              <Link 
                href="/courses"
                className="text-[#8648f9] hover:text-[#8648f9]/80 flex items-center justify-center"
              >
                <ChevronRight className="w-4 h-4 ml-1" />
                العودة للمسارات
              </Link>
            </div>
            <div className="max-w-2xl mx-auto">
              <div className="mb-6">
                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="w-8 h-8 text-red-500" />
                </div>
                <h1 className="text-3xl font-bold text-white mb-4">خطأ في تحميل المسار</h1>
                <p className="text-gray-300 mb-6">
                  {error || 'حدث خطأ أثناء تحميل بيانات المسار'}
                </p>
              </div>
              
              {availableCourses.length > 0 && (
                <div className="bg-gray-900/30 border border-[#8648f9]/20 rounded-lg p-6 mb-6">
                  <h2 className="text-xl font-semibold text-white mb-4">المسارات المتاحة:</h2>
                  <div className="space-y-2">
                    {availableCourses.map((course) => (
                      <Link 
                        key={course.id} 
                        href={`/lessons/${course.id}`}
                        className="block text-[#8648f9] hover:text-[#8648f9]/80"
                      >
                        {course.title}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <Link href="/courses">
                  <Button className="w-full bg-[#8648f9] hover:bg-[#8648f9]/80 text-white py-3">
                    العودة لصفحة المسارات
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (lessons.length === 0) {
    return (
      <div className="min-h-screen bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-white mb-4">لا توجد دروس متاحة</h1>
            <p className="text-gray-300 mb-8">لم يتم إضافة أي دروس لهذا المسار بعد.</p>
            <Link href="/courses">
              <Button className="bg-[#8648f9] hover:bg-[#8648f9]/80 text-white">
                العودة للمسارات
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <Link 
              href="/courses"
              className="text-[#8648f9] hover:text-[#8648f9]/80 flex items-center justify-center"
            >
              <ChevronRight className="w-4 h-4 ml-1" />
              العودة للمسارات
            </Link>
          </div>
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{courseData.title}</h1>
              <p className="text-gray-300 mb-4">{courseData.description}</p>
              <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                <span className="flex items-center">
                  <BookOpen className="w-4 h-4 ml-1" />
                  {courseData.students} طالب
                </span>
                <span className="flex items-center">
                  <Clock className="w-4 h-4 ml-1" />
                  {courseData.duration}
                </span>
                <Badge variant="outline" className="border-[#8648f9]/20 text-[#8648f9]">
                  {courseData.level}
                </Badge>
                <Badge variant="outline" className="border-green-500/20 text-green-500">
                  {courseData.price}
                </Badge>
                {courseData.rating > 0 && (
                  <Badge variant="outline" className="border-yellow-500/20 text-yellow-500">
                    ⭐ {courseData.rating}
                  </Badge>
                )}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[#8648f9] mb-1">
                {progressLoading ? '...' : progress}%
              </div>
              <Progress value={progress} className="w-32 h-2" />
              <p className="text-sm text-gray-400 mt-1">
                {progressLoading ? 'جاري التحميل...' : `${completedLessons.length} من ${lessons.length} دروس`}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Content Area */}
          <div className="lg:col-span-3">
            <Card className="bg-gray-900/50 border-[#8648f9]/20 mb-6">
              <CardHeader>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <FileText className="w-6 h-6 text-[#8648f9] ml-3" />
                    <div>
                      <h2 className="text-xl font-bold text-white">{lessons[currentLesson]?.title}</h2>
                      <p className="text-sm text-gray-400">
                        {lessons[currentLesson]?.duration || 'مدة غير محددة'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={prevLesson}
                      disabled={currentLesson === 0}
                      className="border-[#8648f9]/20 text-gray-300 hover:bg-[#8648f9]/10"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={nextLesson}
                      disabled={currentLesson === lessons.length - 1}
                      className="border-[#8648f9]/20 text-gray-300 hover:bg-[#8648f9]/10"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <p className="text-gray-300">{lessons[currentLesson]?.description || 'لا يوجد وصف للدرس'}</p>
              </CardHeader>
              <CardContent>
                <div
                  className="lesson-content prose prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: lessons[currentLesson]?.content || "" }}
                />
                <div className="mt-8 pt-6 border-t border-[#8648f9]/20">
                  <Button
                    onClick={() => markAsCompleted(currentLesson)}
                    className="bg-green-600 hover:bg-green-700 text-white"
                    disabled={completedLessons.includes(lessons[currentLesson]?.id) || progressLoading}
                  >
                    <CheckCircle className="w-4 h-4 ml-2" />
                    {completedLessons.includes(lessons[currentLesson]?.id) ? "مكتمل" : progressLoading ? "جاري التحميل..." : "وضع علامة كمكتمل"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Tabs for additional content */}
            <Tabs defaultValue="resources" className="w-full">
              <TabsList className="grid w-full grid-cols-1 bg-gray-900/50 border border-[#8648f9]/20">
                <TabsTrigger
                  value="resources"
                  className="data-[state=active]:bg-[#8648f9] data-[state=active]:text-white text-gray-300"
                >
                  المواد التعليمية
                </TabsTrigger>
              </TabsList>

              <TabsContent value="resources">
                <Card className="bg-gray-900/50 border-[#8648f9]/20">
                  <CardHeader>
                    <CardTitle className="text-white">المواد التعليمية</CardTitle>
                    <CardDescription className="text-gray-300">حمّل المواد المساعدة للدرس</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {lessons[currentLesson]?.materials && lessons[currentLesson].materials.length > 0 ? (
                        lessons[currentLesson].materials.map((mat: any, index: number) => (
                          <div
                            key={mat.id || index}
                            className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-[#8648f9]/10"
                          >
                            <div className="flex items-center">
                              <Download className="w-5 h-5 text-[#8648f9] ml-3" />
                              <div>
                                <p className="text-white font-medium">{mat.file_name || mat.file_url}</p>
                              </div>
                            </div>
                            <a
                              href={mat.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="border-[#8648f9]/20 text-[#8648f9] hover:bg-[#8648f9]/10 px-3 py-1 rounded border text-sm"
                            >
                              تحميل
                            </a>
                          </div>
                        ))
                      ) : (
                        <div className="text-gray-400 text-center">لا توجد مواد تعليمية لهذا الدرس</div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Lessons Sidebar */}
          <div className="lg:col-span-1">
            <Card className="bg-gray-900/50 border-[#8648f9]/20 mb-6">
              <CardHeader>
                <CardTitle className="text-white">قائمة الدروس</CardTitle>
                <CardDescription className="text-gray-300">
                  {progressLoading ? 'جاري التحميل...' : `${completedLessons.length} من ${lessons.length} دروس مكتملة`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {lessons.map((lesson, index) => (
                    <div
                      key={lesson.id}
                      onClick={() => setCurrentLesson(index)}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        currentLesson === index
                          ? "bg-[#8648f9]/20 border border-[#8648f9]/40"
                          : "bg-gray-800/50 hover:bg-gray-800/70"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-white">{lesson.title}</span>
                        {completedLessons.includes(lesson.id) ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <Circle className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                      <div className="flex items-center text-xs text-gray-400">
                        <Clock className="w-3 h-3 ml-1" />
                        {lesson.duration || 'مدة غير محددة'}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Labs Section */}
            {labs.length > 0 && (
              <Card className="bg-gray-900/50 border-[#8648f9]/20">
                <CardHeader>
                  <CardTitle className="text-white">المختبرات العملية</CardTitle>
                  <CardDescription className="text-gray-300">
                    {labs.length} مختبر متاح
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {labs.map((lab) => (
                      <Link
                        key={lab.id}
                        href={`/lab/${lab.id}`}
                        className="block p-3 rounded-lg bg-gray-800/50 hover:bg-gray-800/70 transition-colors border border-[#8648f9]/10 hover:border-[#8648f9]/30"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-white">{lab.title}</span>
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${
                              lab.difficulty === "مبتدئ" 
                                ? "border-green-500/20 text-green-500"
                                : lab.difficulty === "متوسط"
                                ? "border-yellow-500/20 text-yellow-500"
                                : "border-red-500/20 text-red-500"
                            }`}
                          >
                            {lab.difficulty}
                          </Badge>
                        </div>
                        <div className="flex items-center text-xs text-gray-400">
                          <span className="flex items-center">
                            <Beaker className="w-3 h-3 ml-1" />
                            مختبر عملي
                          </span>
                        </div>
                        {lab.description && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                            {lab.description}
                          </p>
                        )}
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* تقييم الدرس وبيانات المصمم */}
        <div className="max-w-3xl mx-auto mt-12 mb-8 p-6 bg-gray-900/60 rounded-lg border border-[#8648f9]/20">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            {/* بيانات مصمم الدرس */}
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16">
                <AvatarImage src={adminInfo?.avatar_url || '/placeholder-user.jpg'} alt={adminInfo?.name} />
                <AvatarFallback className="bg-[#8648f9]/20 text-[#8648f9] text-lg">
                  {adminInfo?.name
                    ? adminInfo.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()
                    : 'ED'}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="text-white font-bold text-lg">
                  {adminInfo?.name || 'مصمم الدرس'}
                </div>
              </div>
            </div>
            {/* تقييم الدرس */}
            <div className="flex flex-col items-start gap-2 w-full md:w-auto">
              <div className="flex items-center gap-1">
                {[1,2,3,4,5].map(star => (
                  <button
                    key={star}
                    onClick={() => setUserRating(star)}
                    className={`text-2xl ${userRating >= star ? 'text-yellow-400' : 'text-gray-500'} focus:outline-none hover:text-yellow-300 transition-colors`}
                    aria-label={`تقييم ${star}`}
                  >★</button>
                ))}
                <span className="ml-2 text-gray-300 text-sm">{averageRating ? `${averageRating.toFixed(1)} / 5` : "لا يوجد تقييمات بعد"}</span>
              </div>
              <Button
                className="bg-[#8648f9] hover:bg-[#8648f9]/80 text-white"
                onClick={handleSubmitRating}
                disabled={userRating === 0 || ratingLoading}
              >
                {ratingLoading ? "جاري الإرسال..." : "إرسال التقييم"}
              </Button>
              {ratingError && <div className="text-red-500 text-xs mt-1">{ratingError}</div>}
              {ratingSuccess && <div className="text-green-500 text-xs mt-1">تم إرسال تقييمك بنجاح</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}