"use client"

import React, { useState, useEffect, useRef } from "react"
import { Search, Filter, Clock, Users, Star, Shield, Code, Database, Globe, Zap, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { enrollInCourse, checkEnrollment, getUserEnrollments, CourseEnrollment } from "@/lib/course-enrollment"
import { useUserSession } from "@/components/user-session"
import { getCourseProgressStats } from '@/lib/lesson-progress'


interface Course {
  id: number
  title: string
  description: string | null
  level: "مبتدئ" | "متوسط" | "متقدم"
  category: "شبكات" | "اختبار الاختراق" | "أنظمة التشغيل" | "التحليل الجنائي" | "الاستجابة للحوادث" | "تحليل البرمجيات الخبيثة" | "التشفير"
  students: number
  status: "منشور" | "مسودة"
  created_at: string
  image?: string;
  price: string;
  duration: string;
  rating: number;
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [enrollingCourseId, setEnrollingCourseId] = useState<number | null>(null)
  const [userEnrollments, setUserEnrollments] = useState<CourseEnrollment[]>([])
  const [courseProgress, setCourseProgress] = useState<{ [courseId: number]: number }>({})
  
  const { user, loading: authLoading, isCheckingSession } = useUserSession()
  const router = useRouter()
  const { toast } = useToast()
  
  // إضافة useRef لمنع إعادة الجلب المتكرر
  const coursesFetchedRef = useRef(false)
  const enrollmentsFetchedRef = useRef(false)
  const userIdRef = useRef<string | null>(null)

  const categories = [
    "جميع المسارات",
    "شبكات",
    "اختبار الاختراق",
    "أنظمة التشغيل",
    "التحليل الجنائي",
    "الاستجابة للحوادث",
    "تحليل البرمجيات الخبيثة",
    "التشفير"
  ]

  const levels = ["جميع المستويات", "مبتدئ", "متوسط", "متقدم"]

  // Filter states
  const [searchText, setSearchText] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("جميع المسارات")
  const [selectedLevel, setSelectedLevel] = useState("جميع المستويات")

  // جلب تسجيلات المستخدم عند تغيير حالة المصادقة
  useEffect(() => {
    // لا تجلب البيانات إذا كان التحقق من الجلسة قيد التنفيذ
    if (isCheckingSession) {
      return
    }

    // لا تجلب البيانات إذا لم يكن هناك مستخدم
    if (!user) {
      setUserEnrollments([])
      enrollmentsFetchedRef.current = false
      userIdRef.current = null
      return
    }

    // لا تجلب البيانات إذا كان نفس المستخدم وتم جلب البيانات من قبل
    if (enrollmentsFetchedRef.current && userIdRef.current === user.id) {
      return
    }

    fetchUserEnrollments()
  }, [user?.id, isCheckingSession])

  const fetchUserEnrollments = async () => {
    try {
      console.log('📚 Fetching user enrollments...')
      const { enrollments, error } = await getUserEnrollments()
      
      if (error) {
        console.error('❌ Error fetching user enrollments:', error)
        return
      }
      
      console.log('✅ User enrollments loaded:', enrollments)
      setUserEnrollments(enrollments)

      // جلب تقدم المسارات
      if (enrollments.length > 0) {
        const progressMap: { [courseId: number]: number } = {}
        await Promise.all(
          enrollments.map(async (enrollment) => {
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
        console.log('✅ Course progress loaded:', progressMap)
      }

      // تحديث المراجع لمنع إعادة الجلب
      enrollmentsFetchedRef.current = true
      userIdRef.current = user?.id || null
    } catch (err) {
      console.error('❌ Error fetching user enrollments:', err)
    }
  }

  useEffect(() => {
    // لا تجلب البيانات إذا كان التحقق من الجلسة قيد التنفيذ
    if (isCheckingSession) {
      return
    }

    // لا تجلب البيانات إذا كان التحميل قيد التنفيذ
    if (authLoading) {
      return
    }

    // لا تجلب البيانات إذا تم جلبها من قبل
    if (coursesFetchedRef.current) {
      setLoading(false)
      return
    }

    fetchCourses()
  }, [isCheckingSession, authLoading])

  const fetchCourses = async () => {
    try {
      setLoading(true)
      const { createClientComponentClient } = await import('@supabase/auth-helpers-nextjs')
      const supabase = createClientComponentClient()
      
      // فحص وجود جدول المسارات
      console.log('📚 Fetching courses...')
      
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('status', 'منشور')

      console.log('📚 Courses data:', data)
      console.log('📚 Courses error:', error)

      if (error) {
        console.error('❌ Supabase error:', error)
        throw error
      }
      
              // جلب عدد المستخدمين مباشرة من جدول course_enrollments
        if (data && data.length > 0) {
          const coursesWithStudents = await Promise.all(
            data.map(async (course) => {
              try {
                // جلب عدد المستخدمين المسجلين في هذا المسار من جدول course_enrollments
                const { count: studentsCount, error: studentsError } = await supabase
                  .from('course_enrollments')
                  .select('*', { count: 'exact', head: true })
                  .eq('course_id', course.id)
                
                if (studentsError) {
                  console.error(`❌ Error fetching users count for course ${course.id}:`, studentsError)
                  return { ...course, students: 0 }
                }
                
                return { ...course, students: studentsCount || 0 }
              } catch (err) {
                console.error(`❌ Error processing course ${course.id}:`, err)
                return { ...course, students: 0 }
              }
            })
          )
          
          setCourses(coursesWithStudents)
          console.log('✅ Courses with real users counts from course_enrollments:', coursesWithStudents)
        } else {
          setCourses(data || [])
        }
      
      // إذا لم توجد مسارات، جرب جلب جميع المسارات
      if (!data || data.length === 0) {
        console.log('⚠️ No published courses found, trying to fetch all courses...')
        const { data: allCourses, error: allError } = await supabase
          .from('courses')
          .select('*')
        
        console.log('📚 All courses:', allCourses)
        if (allCourses && allCourses.length > 0) {
                  // جلب عدد المستخدمين مباشرة من جدول course_enrollments لجميع المسارات
        const allCoursesWithStudents = await Promise.all(
          allCourses.map(async (course) => {
            try {
              const { count: studentsCount, error: studentsError } = await supabase
                .from('course_enrollments')
                .select('*', { count: 'exact', head: true })
                .eq('course_id', course.id)
              
              if (studentsError) {
                console.error(`❌ Error fetching users count for course ${course.id}:`, studentsError)
                return { ...course, students: 0 }
              }
              
              return { ...course, students: studentsCount || 0 }
            } catch (err) {
              console.error(`❌ Error processing course ${course.id}:`, err)
              return { ...course, students: 0 }
            }
          })
        )
        
        setCourses(allCoursesWithStudents)
        console.log('✅ Using all courses with real users counts from course_enrollments')
        }
      }

      // تحديث المرجع لمنع إعادة الجلب
      coursesFetchedRef.current = true
      
    } catch (err) {
      console.error('❌ Error fetching courses:', err)
      setError('فشل في تحميل المسارات. يرجى المحاولة مرة أخرى.')
    } finally {
      setLoading(false)
    }
  }

  // Check if user is enrolled in a course
  const isUserEnrolled = (courseId: number) => {
    return userEnrollments.some(enrollment => enrollment.course_id === courseId)
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
          <span>جاري تحميل المسارات...</span>
        </div>
      </div>
    )
  }

  // Enroll user in a course
  const enrollInCourseHandler = async (courseId: number) => {
    console.log('🎯 Enroll button clicked for course:', courseId)
    console.log('👤 Current user from useUserSession:', user ? user.email : 'null')
    console.log('🔐 Auth loading state:', authLoading)
    
    // التحقق من تسجيل الدخول أولاً
    if (!user) {
      console.log('⚠️ User not logged in, redirecting to login...')
      toast({
        title: "تسجيل الدخول مطلوب",
        description: "يجب تسجيل الدخول أولاً لبدء المسار",
        variant: "destructive",
      })
      
      // توجيه المستخدم لصفحة تسجيل الدخول
      router.push('/login')
      return
    }

    // التحقق من التسجيل المسبق
    if (isUserEnrolled(courseId)) {
      console.log('✅ User already enrolled, redirecting to lessons...')
      router.push(`/lessons/${courseId}`)
      return
    }

    setEnrollingCourseId(courseId)
    console.log('🔄 Starting enrollment process...')

    try {
      const { success, error } = await enrollInCourse(courseId)
      
      if (!success) {
        console.error('❌ Enrollment failed:', error)
        toast({
          title: "خطأ في التسجيل",
          description: error || "فشل في تسجيل المسار. يرجى المحاولة مرة أخرى.",
          variant: "destructive",
        })
        return
      }

      console.log('✅ Enrollment successful, refreshing enrollments...')
      
      // تحديث قائمة التسجيلات
      await fetchUserEnrollments()

      // تحديث عدد المستخدمين في المسار
      const updatedCourses = courses.map(c => 
        c.id === courseId ? { ...c, students: c.students + 1 } : c
      )
      setCourses(updatedCourses)

      toast({
        title: "تم التسجيل بنجاح",
        description: "تم تفعيل المسار وإضافته إلى لوحة تحكمك!",
      })

      // الانتقال لصفحة الدروس
      console.log('🚀 Redirecting to lessons page...')
      router.push(`/lessons/${courseId}`)

    } catch (err) {
      console.error('❌ Error enrolling in course:', err)
      toast({
        title: "خطأ في التسجيل",
        description: "فشل في تسجيل المسار. يرجى المحاولة مرة أخرى.",
        variant: "destructive",
      })
    } finally {
      setEnrollingCourseId(null)
    }
  }

  // Course filtering function
  const filteredCourses = courses.filter((course) => {
    const matchesSearch =
      course.title.includes(searchText) || 
      (course.description && course.description.includes(searchText))

    const matchesLevel =
      selectedLevel === "جميع المستويات" || course.level === selectedLevel

    const matchesCategory =
      selectedCategory === "جميع المسارات" || course.category === selectedCategory

    return matchesSearch && matchesLevel && matchesCategory
  })

  // Function to get appropriate icon for course
  const getCourseIcon = (courseTitle: string) => {
    if (courseTitle.includes("أساسيات")) return Shield
    if (courseTitle.includes("اختبار")) return Zap
    if (courseTitle.includes("تطبيقات")) return Code
    if (courseTitle.includes("قواعد بيانات")) return Database
    if (courseTitle.includes("شبكات")) return Globe
    return Shield // Default icon
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-red-500">{error}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Title */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white to-[#8648f9] bg-clip-text text-transparent">
            مسارات التعلم
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            اختر من بين مجموعة واسعة من المسارات التعليمية المتخصصة في الأمن السيبراني
          </p>
        </div>

        {/* Search and filters */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="ابحث عن مسار..."
                className="pr-10 bg-gray-900/50 border-[#8648f9]/20 text-white placeholder:text-gray-400"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              className="border-[#8648f9]/20 text-gray-300 hover:bg-[#8648f9]/10"
              onClick={() => {
                // Reset filters
                setSearchText("")
                setSelectedCategory("جميع المسارات")
                setSelectedLevel("جميع المستويات")
              }}
            >
              <Filter className="w-4 h-4 ml-2" />
              إعادة تعيين
            </Button>
          </div>

          {/* Category filter */}
          <div className="flex flex-wrap gap-2 mb-4">
            {categories.map((category) => (
              <Badge
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                className={`cursor-pointer border-[#8648f9]/20 text-gray-300 hover:bg-[#8648f9]/20 hover:text-[#8648f9] ${
                  selectedCategory === category ? "bg-[#8648f9] text-white" : ""
                }`}
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </Badge>
            ))}
          </div>

          {/* Level filter */}
          <div className="flex flex-wrap gap-2">
            {levels.map((level) => (
              <Badge
                key={level}
                variant={selectedLevel === level ? "default" : "outline"}
                className={`cursor-pointer border-[#8648f9]/20 text-gray-300 hover:bg-[#8648f9]/20 hover:text-[#8648f9] ${
                  selectedLevel === level ? "bg-[#8648f9] text-white" : ""
                }`}
                onClick={() => setSelectedLevel(level)}
              >
                {level}
              </Badge>
            ))}
          </div>
        </div>

        {/* Courses grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredCourses.length === 0 ? (
            <p className="text-gray-400 col-span-full text-center">لا توجد مسارات مطابقة للبحث.</p>
          ) : (
            filteredCourses.map((course) => {
              const Icon = getCourseIcon(course.title)
              const isEnrolled = isUserEnrolled(course.id)
              const isEnrolling = enrollingCourseId === course.id
              const courseStatus = getCourseStatus(course.id)
              
              return (
                <Card
                  key={course.id}
                  className="bg-gray-900/50 border-[#8648f9]/20 hover:border-[#8648f9]/40 transition-all hover:scale-105 overflow-hidden"
                >
                  <div className="relative h-48 w-full">
                    {course.image ? (
                      <Image
                        src={course.image}
                        alt={course.title}
                        fill
                        className="object-cover"
                        onError={(e) => {
                          // Fallback to placeholder if image fails to load
                          (e.target as HTMLImageElement).src = "/placeholder.jpg";
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[#8648f9]/20 to-purple-600/20 flex items-center justify-center">
                        <div className="text-center">
                          <Shield className="w-12 h-12 text-[#8648f9] mx-auto mb-2" />
                          <p className="text-sm text-gray-400">لا توجد صورة</p>
                        </div>
                      </div>
                    )}
                    <div className="absolute top-4 right-4">
                      <Badge
                        variant="outline"
                        className="border-[#8648f9]/20 text-[#8648f9] bg-black/50 backdrop-blur-sm"
                      >
                        {course.level}
                      </Badge>
                    </div>
                    <div className="absolute top-4 left-4">
                      <Badge
                        variant="outline"
                        className="border-green-500/20 text-green-500 bg-black/50 backdrop-blur-sm"
                      >
                        {course.category}
                      </Badge>
                    </div>
                    {isEnrolled && (
                      <div className="absolute top-4 left-4">
                        <Badge className={courseStatus.color}>
                          {courseStatus.text}
                        </Badge>
                      </div>
                    )}
                  </div>
                  <CardHeader>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 bg-[#8648f9]/20 rounded-lg flex items-center justify-center">
                        <Icon className="w-6 h-6 text-[#8648f9]" />
                      </div>
                    </div>
                    <CardTitle className="text-white text-lg">{course.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-gray-300 mb-4 line-clamp-2">
                      {course.description || "لا يوجد وصف متوفر لهذا المسار."}
                    </CardDescription>

                    <div className="space-y-3 mb-4">
                      <div className="flex items-center justify-between text-sm text-gray-400">
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 ml-1" />
                          {course.duration || "غير محدد"}
                        </div>
                        <div className="flex items-center">
                          <Users className="w-4 h-4 ml-1" />
                          {course.students} مستخدم
                        </div>
                      </div>

                      {/* Progress bar for enrolled courses */}
                      {isEnrolled && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm text-gray-400">
                            <span>التقدم</span>
                            <span>{courseProgress[course.id] || 0}%</span>
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-2">
                            <div 
                              className="bg-[#8648f9] h-2 rounded-full transition-all duration-300"
                              style={{ width: `${courseProgress[course.id] || 0}%` }}
                            ></div>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Star className="w-4 h-4 text-yellow-400 ml-1" />
                          <span className="text-sm text-gray-300">{course.rating?.toString() || "4.8"}</span>
                        </div>
                        <span className="text-lg font-bold text-[#8648f9]">
                          {!course.price || course.price === "0" || parseFloat(course.price) === 0 ? "مجاني" : `${course.price} ر.ع`}
                        </span>
                      </div>
                    </div>

                    <Button 
                      className="w-full bg-[#8648f9] hover:bg-[#8648f9]/80 text-white"
                      onClick={() => enrollInCourseHandler(course.id)}
                      disabled={isEnrolling}
                    >
                      {isEnrolling ? (
                        <>
                          <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                          جاري التفعيل...
                        </>
                      ) : isEnrolled ? (
                        courseStatus.status === 'completed' ? 'مراجعة المسار' : 'استمر في المسار'
                      ) : !user ? (
                        "تسجيل الدخول أولاً"
                      ) : (
                        "تفعيل المسار"
                      )}
                    </Button>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>

        {/* Load more button */}
        <div className="text-center mt-12">
          <Button variant="outline" className="border-[#8648f9] text-[#8648f9] hover:bg-[#8648f9]/10">
            عرض المزيد من المسارات
          </Button>
        </div>
      </div>
    </div>
  )
}