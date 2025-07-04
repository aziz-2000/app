"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Award, 
  Plus, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  BookOpen,
  Target,
  TrendingUp
} from 'lucide-react'
import { createBadgesForExistingCourses, getAllCourseBadges } from '@/lib/badges'

interface CourseWithoutBadge {
  id: number
  title: string
  level: string
  description: string
}

interface BadgeWithCourseInfo {
  id: number
  course_id: number
  name: string
  description: string
  color: string
  course_title?: string
  course_level?: string
}

export default function CreateMissingBadgesPage() {
  const [coursesWithoutBadges, setCoursesWithoutBadges] = useState<CourseWithoutBadge[]>([])
  const [existingBadges, setExistingBadges] = useState<BadgeWithCourseInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // جلب الشارات الموجودة
      const { badges, error: badgesError } = await getAllCourseBadges()
      
      if (badgesError) {
        setError(badgesError)
        return
      }
      
      setExistingBadges(badges)
      
      // حساب المسارات التي لا تحتوي على شارات
      const coursesWithBadges = new Set(badges.map(badge => badge.course_id))
      
      // هنا يمكنك جلب جميع المسارات من قاعدة البيانات
      // للتبسيط، سنفترض أن المسارات بدون شارات هي تلك التي لا توجد في قائمة الشارات
      const mockCoursesWithoutBadges: CourseWithoutBadge[] = [
        {
          id: 1,
          title: "أساسيات الأمن السيبراني",
          level: "مبتدئ",
          description: "مسار تعليمي للمبتدئين في مجال الأمن السيبراني"
        },
        {
          id: 2,
          title: "التحليل الجنائي الرقمي",
          level: "متوسط",
          description: "تعلم تقنيات التحليل الجنائي الرقمي"
        },
        {
          id: 3,
          title: "اختبار الاختراق المتقدم",
          level: "متقدم",
          description: "تقنيات متقدمة في اختبار الاختراق"
        }
      ].filter(course => !coursesWithBadges.has(course.id))
      
      setCoursesWithoutBadges(mockCoursesWithoutBadges)
      
    } catch (error: any) {
      setError(error.message || 'حدث خطأ غير متوقع')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateBadges = async () => {
    try {
      setCreating(true)
      setError(null)
      setSuccess(null)
      
      const result = await createBadgesForExistingCourses()
      
      if (result.success) {
        setSuccess(`تم إنشاء ${result.createdCount} شارة جديدة بنجاح`)
        // إعادة تحميل البيانات
        await fetchData()
      } else {
        setError(result.error || 'فشل في إنشاء الشارات')
      }
      
    } catch (error: any) {
      setError(error.message || 'حدث خطأ غير متوقع')
    } finally {
      setCreating(false)
    }
  }

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

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8648f9] mx-auto mb-4"></div>
          <p className="text-gray-400">جاري تحميل البيانات...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-[#8648f9]/20">
              <Award className="w-6 h-6 text-[#8648f9]" />
            </div>
            <h1 className="text-3xl font-bold text-white">إنشاء شارات للمسارات</h1>
          </div>
          <p className="text-gray-300">
            إنشاء شارات تلقائياً للمسارات التي لا تحتوي على شارات
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gray-900/50 border-[#8648f9]/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">الشارات الموجودة</p>
                  <p className="text-white text-2xl font-bold">{existingBadges.length}</p>
                </div>
                <Award className="w-8 h-8 text-[#8648f9]" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-yellow-500/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">المسارات بدون شارات</p>
                  <p className="text-white text-2xl font-bold">{coursesWithoutBadges.length}</p>
                </div>
                <AlertCircle className="w-8 h-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-green-500/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">الحالة</p>
                  <p className="text-white text-sm">
                    {coursesWithoutBadges.length === 0 ? 'جميع المسارات لها شارات' : 'تحتاج إلى إنشاء شارات'}
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <p className="text-red-400">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <p className="text-green-400">{success}</p>
            </div>
          </div>
        )}

        {/* Action Button */}
        {coursesWithoutBadges.length > 0 && (
          <div className="mb-8">
            <Card className="bg-gray-900/50 border-yellow-500/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Plus className="w-5 h-5 text-yellow-500" />
                  إنشاء شارات للمسارات
                </CardTitle>
                <CardDescription className="text-gray-400">
                  سيتم إنشاء شارات تلقائياً للمسارات التالية مع ألوان مناسبة حسب المستوى
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={handleCreateBadges}
                  disabled={creating}
                  className="bg-yellow-500 hover:bg-yellow-600 text-black"
                >
                  {creating ? (
                    <>
                      <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                      جاري الإنشاء...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 ml-2" />
                      إنشاء الشارات
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Courses Without Badges */}
        {coursesWithoutBadges.length > 0 ? (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">المسارات التي تحتاج إلى شارات</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {coursesWithoutBadges.map((course) => (
                <Card key={course.id} className="bg-gray-900/50 border-yellow-500/20">
                  <CardHeader>
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline" className={getLevelColor(course.level)}>
                        {getLevelIcon(course.level)}
                        <span className="mr-1">{course.level}</span>
                      </Badge>
                      <div className="w-4 h-4 rounded-full bg-yellow-500/20 border border-yellow-500/40"></div>
                    </div>
                    <CardTitle className="text-white text-lg">{course.title}</CardTitle>
                    <CardDescription className="text-gray-400">
                      {course.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-gray-400">
                      <p>سيتم إنشاء شارة باسم: <span className="text-white">شارة {course.title}</span></p>
                      <p className="mt-1">اللون: <span className="text-white">
                        {course.level === 'مبتدئ' ? 'أصفر' : 
                         course.level === 'متوسط' ? 'أزرق' : 
                         course.level === 'متقدم' ? 'أخضر' : 'بنفسجي'}
                      </span></p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">جميع المسارات لها شارات</h3>
            <p className="text-gray-400">لا توجد مسارات تحتاج إلى إنشاء شارات</p>
          </div>
        )}

        {/* Existing Badges */}
        {existingBadges.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">الشارات الموجودة</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {existingBadges.slice(0, 6).map((badge) => (
                <Card key={badge.id} className="bg-gray-900/50 border-[#8648f9]/20">
                  <CardHeader>
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline" className={getLevelColor(badge.course_level || 'غير محدد')}>
                        {getLevelIcon(badge.course_level || 'غير محدد')}
                        <span className="mr-1">{badge.course_level || 'غير محدد'}</span>
                      </Badge>
                      <div 
                        className="w-4 h-4 rounded-full border border-gray-600"
                        style={{ backgroundColor: badge.color }}
                      ></div>
                    </div>
                    <CardTitle className="text-white text-lg">{badge.name}</CardTitle>
                    <CardDescription className="text-gray-400">
                      {badge.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-gray-400">
                      <p>المسار: <span className="text-white">{badge.course_title || 'غير محدد'}</span></p>
                      <p className="mt-1">اللون: <span className="text-white text-xs">{badge.color}</span></p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            {existingBadges.length > 6 && (
              <div className="text-center mt-6">
                <p className="text-gray-400">و {existingBadges.length - 6} شارة أخرى...</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
} 