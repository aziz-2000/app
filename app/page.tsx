"use client"

import { DollarSign, Monitor, Globe, UserCheck, Lock, Eye, Zap } from "lucide-react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import Image from "next/image"

interface Course {
  id: number
  title: string
  description: string
  level: string
  category: string
  duration: string
  image?: string
  status: string
}

export default function HomePage() {
  const router = useRouter()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash
      if (hash.includes('type=recovery') || hash.includes('access_token')) {
        router.replace('/reset-password')
      }
    }
  }, [router])

  // تحميل المسارات من قاعدة البيانات
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const supabase = createClientComponentClient()
        const { data, error } = await supabase
          .from('courses')
          .select('*')
          .eq('status', 'منشور')
          .order('created_at', { ascending: false })
          .limit(6) // عرض أول 6 مسارات فقط

        if (error) {
          console.error('Error fetching courses:', error)
        } else {
          setCourses(data || [])
        }
      } catch (error) {
        console.error('Error:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchCourses()
  }, [])

  // دالة للحصول على أيقونة المسار بناءً على التصنيف
  const getCourseIcon = (category: string) => {
    switch (category) {
      case 'شبكات':
        return Monitor
      case 'اختبار الاختراق':
        return Eye
      case 'أنظمة التشغيل':
        return Globe
      case 'التحليل الجنائي':
        return Lock
      case 'الاستجابة للحوادث':
        return Zap
      case 'تحليل البرمجيات الخبيثة':
        return Eye
      case 'التشفير':
        return Lock
      default:
        return Monitor
    }
  }

  const features = [
    {
      icon: Globe,
      title: "منصة عربية",
      description: "محتوى تعليمي كامل باللغة العربية يلبي احتياجاتك",
    },
    {
      icon: Monitor,
      title: "سهولة الاستخدام",
      description: "واجهة بسيطة وسلسة تتيح لك التعلم بدون تعقيد",
    },
    {
      icon: DollarSign,
      title: " أسعار مناسبة",
      description: "أسعار مناسبة للجميع مع قيمة تعليمية عالية",
    },
    {
      icon: UserCheck,
      title: "كادر عماني",
      description: "فريق متخصص من الخبراء العمانيين لدعمك وإرشادك.",
    },
  ]

  return (
    <div className="min-h-screen bg-black">
      {/* Hero Section */}
      <section className="relative py-40 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/hero-bg.gif')" }}
        />
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative max-w-7xl mx-auto text-center z-10">
          <div className="mb-8">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-white to-[#8648f9] bg-clip-text text-transparent">
              منصة بونت جارد
            </h1>
            <p className="text-xl md:text-2xl text-gray-100 mb-8 max-w-3xl mx-auto drop-shadow-lg">
            رحلتك المتكاملة لتعلم الأمن السيبراني تبدأ من هنا من الأساسيات إلى الاحتراف، بخطوات عملية ومحتوى موجه لسوق العمل.

            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/login" passHref>
                <Button size="lg" className="bg-[#8648f9] hover:bg-[#8648f9]/80 text-white px-8 py-3 shadow-lg">
                  ابدأ التعلم الآن
                </Button>
              </Link>
              <Link href="/courses" passHref>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10 px-8 py-3 backdrop-blur-sm"
                >
                  استكشف المسارات
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-black to-gray-900">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">لماذا تختار منصتنا؟</h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">نقدم تجربة تعليمية متميزة في مجال الأمن السيبراني</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <Card
                  key={index}
                  className="bg-gray-900/50 border-[#8648f9]/20 hover:border-[#8648f9]/40 transition-colors"
                >
                  <CardHeader className="text-center">
                    <div className="mx-auto w-12 h-12 bg-[#8648f9]/20 rounded-lg flex items-center justify-center mb-4">
                      <Icon className="w-6 h-6 text-[#8648f9]" />
                    </div>
                    <CardTitle className="text-white">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-gray-300 text-center">{feature.description}</CardDescription>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      {/* Courses Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">المسارات الأكثر شعبية</h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              اختر المسار المناسب لمستواك وابدأ رحلتك في الأمن السيبراني
            </p>
          </div>
          
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#8648f9]"></div>
              <p className="text-gray-400 mt-4">جاري تحميل المسارات...</p>
            </div>
          ) : courses.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400">لا توجد مسارات متاحة حالياً</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {courses.map((course) => {
                const Icon = getCourseIcon(course.category)
                return (
                  <Card
                    key={course.id}
                    className="bg-gray-900/50 border-[#8648f9]/20 hover:border-[#8648f9]/40 transition-all hover:scale-105 overflow-hidden"
                  >
                    <div className="relative h-48 w-full">
                      <Image 
                        src={course.image || "/course-placeholder.jpg"} 
                        alt={course.title} 
                        fill 
                        className="object-cover" 
                      />
                      <div className="absolute top-4 right-4 flex gap-2">
                        <span className="text-sm bg-[#8648f9]/90 text-white px-2 py-1 rounded backdrop-blur-sm">
                          {course.level}
                        </span>
                        <span className="text-sm bg-gray-800/90 text-gray-300 px-2 py-1 rounded backdrop-blur-sm">
                          {course.category}
                        </span>
                      </div>
                    </div>
                    <CardHeader>
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-[#8648f9]/20 rounded-lg flex items-center justify-center">
                          <Icon className="w-6 h-6 text-[#8648f9]" />
                        </div>
                      </div>
                      <CardTitle className="text-white">{course.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-gray-300 mb-4 line-clamp-3">
                        {course.description}
                      </CardDescription>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-400">{course.duration}</span>
                        <Link href={`/lessons/${course.id}`}>
                          <Button size="sm" className="bg-[#8648f9] hover:bg-[#8648f9]/80 text-white">
                            ابدأ الآن
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
          
          <div className="text-center mt-12">
            <Link href="/courses">
              <Button size="lg" variant="outline" className="border-[#8648f9] text-[#8648f9] hover:bg-[#8648f9]/10">
                عرض جميع المسارات
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-[#8648f9]/20 to-purple-900/20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6 text-white">ابدأ رحلتك في الأمن السيبراني اليوم</h2>
          <p className="text-xl text-gray-300 mb-8">انضم إلى آلاف المتعلمين واكتسب المهارات المطلوبة في سوق العمل</p>
          <Link href="/login">
            <Button size="lg" className="bg-[#8648f9] hover:bg-[#8648f9]/80 text-white px-8 py-3">
              سجل مجاناً الآن
            </Button>
          </Link>
        </div>
      </section>
    </div>
  )
}
