"use client"

import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  User, 
  Mail, 
  Calendar, 
  Clock, 
  BookOpen, 
  Trophy, 
  Star, 
  Target,
  TrendingUp,
  Award,
  Edit,
  Save,
  X,
  Loader2,
  Activity,
  Heart,
  BarChart3,
  Settings,
  Shield,
  GraduationCap
} from 'lucide-react'
import { useUserSession } from '@/components/user-session'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import { 
  getUserProfile, 
  updateUserProfile, 
  getUserStats, 
  getUserActivity, 
  getUserFavoriteCourses,
  UserProfile,
  UserStats,
  UserActivity
} from '@/lib/user-profile'
import { getUserBadges, UserBadge } from '@/lib/badges'
import Image from 'next/image'
import Link from 'next/link'

export default function ProfilePage() {
  const { user, loading: authLoading } = useUserSession()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [stats, setStats] = useState<UserStats | null>(null)
  const [activities, setActivities] = useState<UserActivity[]>([])
  const [favoriteCourses, setFavoriteCourses] = useState<any[]>([])
  const [userBadges, setUserBadges] = useState<UserBadge[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    full_name: '',
    avatar_url: ''
  })
  const [saving, setSaving] = useState(false)
  
  const router = useRouter()
  const { toast } = useToast()
  const dataFetchedRef = useRef(false)
  const userIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      dataFetchedRef.current = false
      userIdRef.current = null
      return
    }
    if (dataFetchedRef.current && userIdRef.current === user.id) {
      setLoading(false)
      return
    }
    fetchProfile()
  }, [user, authLoading])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('📊 Fetching profile data...')
      
      // جلب بيانات الملف الشخصي
      const { profile: profileData, error: profileError } = await getUserProfile()
      if (profileError) {
        setError(profileError)
        return
      }
      setProfile(profileData)
      setEditForm({
        full_name: profileData?.full_name || '',
        avatar_url: profileData?.avatar_url || ''
      })

      // جلب الإحصائيات
      const { stats: statsData, error: statsError } = await getUserStats()
      if (!statsError) {
        setStats(statsData)
      }

      // جلب النشاطات
      const { activities: activitiesData, error: activitiesError } = await getUserActivity()
      if (!activitiesError) {
        setActivities(activitiesData)
      }

      // جلب المسارات المفضلة
      const { courses: favoriteCoursesData, error: favoritesError } = await getUserFavoriteCourses()
      if (!favoritesError) {
        setFavoriteCourses(favoriteCoursesData)
      }

      // جلب الشارات
      const { badges: badgesData, error: badgesError } = await getUserBadges()
      if (!badgesError) {
        setUserBadges(badgesData)
      }

      console.log('✅ Profile data loaded successfully')
      // تحديث المرجع لمنع إعادة الجلب
      dataFetchedRef.current = true
      userIdRef.current = user?.id || null
    } catch (error: any) {
      console.error('❌ Error fetching profile data:', error)
      setError(error.message || 'حدث خطأ غير متوقع')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProfile = async () => {
    try {
      setSaving(true)
      
      const { success, error: updateError } = await updateUserProfile(editForm)
      
      if (!success) {
        toast({
          title: "خطأ في التحديث",
          description: updateError || "فشل في تحديث الملف الشخصي",
          variant: "destructive",
        })
        return
      }

      // تحديث البيانات المحلية
      if (profile) {
        setProfile({
          ...profile,
          full_name: editForm.full_name,
          avatar_url: editForm.avatar_url
        })
      }

      setIsEditing(false)
      toast({
        title: "تم التحديث بنجاح",
        description: "تم تحديث بيانات الملف الشخصي",
      })
    } catch (error: any) {
      console.error('Error saving profile:', error)
      toast({
        title: "خطأ في التحديث",
        description: "حدث خطأ أثناء حفظ البيانات",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'مسؤول': return <Shield className="w-4 h-4" />
      case 'مدرب': return <GraduationCap className="w-4 h-4" />
      case 'طالب': return <User className="w-4 h-4" />
      default: return <User className="w-4 h-4" />
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'مسؤول': return 'bg-red-500/20 text-red-500 border-red-500/20'
      case 'مدرب': return 'bg-blue-500/20 text-blue-500 border-blue-500/20'
      case 'طالب': return 'bg-green-500/20 text-green-500 border-green-500/20'
      default: return 'bg-gray-500/20 text-gray-500 border-gray-500/20'
    }
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'enrollment': return <BookOpen className="w-4 h-4 text-blue-500" />
      case 'completion': return <Trophy className="w-4 h-4 text-green-500" />
      case 'badge': return <Award className="w-4 h-4 text-yellow-500" />
      case 'lesson': return <Target className="w-4 h-4 text-purple-500" />
      default: return <Activity className="w-4 h-4 text-gray-500" />
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatTimeSpent = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours} ساعة ${mins} دقيقة`
    }
    return `${mins} دقيقة`
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8648f9] mx-auto mb-4"></div>
          <p className="text-gray-400">جاري تحميل الملف الشخصي...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null // سيتم التوجيه لصفحة تسجيل الدخول
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <User className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">خطأ في تحميل الملف الشخصي</h3>
          <p className="text-gray-400 mb-4">{error}</p>
          <Button onClick={fetchProfile} className="bg-[#8648f9] hover:bg-[#7c3aed]">
            <Loader2 className="w-4 h-4 ml-2" />
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
          <h1 className="text-4xl font-bold text-white mb-2">الملف الشخصي</h1>
          <p className="text-gray-400">إدارة بياناتك الشخصية ومتابعة تقدمك التعليمي</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <Card className="bg-gray-900/50 border-[#8648f9]/20">
              <CardHeader className="text-center">
                <div className="relative mx-auto mb-4">
                  <Avatar className="w-24 h-24 mx-auto">
                    <AvatarImage 
                      src={profile?.avatar_url || user.user_metadata?.avatar_url} 
                      alt={profile?.full_name || 'User'}
                    />
                    <AvatarFallback className="bg-[#8648f9] text-white text-2xl font-bold">
                      {profile?.full_name?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  {isEditing && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="absolute -bottom-2 -right-2 bg-gray-800 border-gray-600"
                      onClick={() => setIsEditing(false)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  )}
                </div>
                
                {isEditing ? (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="full_name" className="text-gray-300">الاسم</Label>
                      <Input
                        id="full_name"
                        value={editForm.full_name}
                        onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                        className="bg-gray-800 border-gray-600 text-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="avatar_url" className="text-gray-300">رابط الصورة الشخصية</Label>
                      <Input
                        id="avatar_url"
                        value={editForm.avatar_url}
                        onChange={(e) => setEditForm({ ...editForm, avatar_url: e.target.value })}
                        className="bg-gray-800 border-gray-600 text-white"
                        placeholder="https://example.com/avatar.jpg"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        onClick={handleSaveProfile}
                        disabled={saving}
                        className="flex-1 bg-[#8648f9] hover:bg-[#7c3aed]"
                      >
                        {saving ? (
                          <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4 ml-2" />
                        )}
                        حفظ
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => setIsEditing(false)}
                        className="flex-1 border-gray-600 text-gray-300"
                      >
                        إلغاء
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <CardTitle className="text-white text-xl mb-2">{profile?.full_name || 'مستخدم'}</CardTitle>
                    <CardDescription className="text-gray-400 mb-4">{profile?.email}</CardDescription>
                    
                    <div className="space-y-3 mb-6">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">الدور:</span>
                        <Badge variant="outline" className={getRoleColor(profile?.role || 'طالب')}>
                          {getRoleIcon(profile?.role || 'طالب')}
                          <span className="mr-1">{profile?.role || 'طالب'}</span>
                        </Badge>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">الحالة:</span>
                        <Badge 
                          variant="outline" 
                          className={profile?.status === 'نشط' 
                            ? 'bg-green-500/20 text-green-500 border-green-500/20' 
                            : 'bg-red-500/20 text-red-500 border-red-500/20'
                          }
                        >
                          {profile?.status === 'نشط' ? 'نشط' : 'معطل'}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">تاريخ الانضمام:</span>
                        <span className="text-white text-sm">
                          {profile?.join_date ? formatDate(profile.join_date) : 'غير محدد'}
                        </span>
                      </div>
                    </div>
                    
                    <Button 
                      onClick={() => setIsEditing(true)}
                      variant="outline" 
                      className="w-full border-[#8648f9] text-[#8648f9] hover:bg-[#8648f9]/10"
                    >
                      <Edit className="w-4 h-4 ml-2" />
                      تعديل الملف الشخصي
                    </Button>
                  </div>
                )}
              </CardHeader>
            </Card>

            {/* Stats Card */}
            {stats && (
              <Card className="bg-gray-900/50 border-[#8648f9]/20 mt-6">
                <CardHeader>
                  <CardTitle className="text-white">الإحصائيات</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-gray-800/50 rounded-lg">
                      <BookOpen className="w-6 h-6 text-[#8648f9] mx-auto mb-2" />
                      <div className="text-white font-bold">{stats.totalEnrollments}</div>
                      <div className="text-gray-400 text-sm">المسارات</div>
                    </div>
                    <div className="text-center p-3 bg-gray-800/50 rounded-lg">
                      <Trophy className="w-6 h-6 text-green-500 mx-auto mb-2" />
                      <div className="text-white font-bold">{stats.completedCourses}</div>
                      <div className="text-gray-400 text-sm">مكتملة</div>
                    </div>
                    <div className="text-center p-3 bg-gray-800/50 rounded-lg">
                      <Target className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                      <div className="text-white font-bold">{stats.totalLessonsCompleted}</div>
                      <div className="text-gray-400 text-sm">الدروس</div>
                    </div>
                    <div className="text-center p-3 bg-gray-800/50 rounded-lg">
                      <Award className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
                      <div className="text-white font-bold">{stats.totalBadges}</div>
                      <div className="text-gray-400 text-sm">الشارات</div>
                    </div>
                  </div>
                  
                  <div className="space-y-3 pt-4 border-t border-gray-700">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">متوسط التقييم:</span>
                      <div className="flex items-center">
                        <Star className="w-4 h-4 text-yellow-400 ml-1" />
                        <span className="text-white">{stats.averageRating}/5</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">الوقت الإجمالي:</span>
                      <span className="text-white text-sm">
                        {formatTimeSpent(stats.totalTimeSpent)}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">آخر نشاط:</span>
                      <span className="text-white text-sm">
                        {stats.lastActivity ? formatDate(stats.lastActivity) : 'غير محدد'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="activity" className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-gray-900/50 border border-[#8648f9]/20">
                <TabsTrigger
                  value="activity"
                  className="data-[state=active]:bg-[#8648f9] data-[state=active]:text-white text-gray-300"
                >
                  <Activity className="w-4 h-4 ml-2" />
                  النشاطات
                </TabsTrigger>
                <TabsTrigger
                  value="favorites"
                  className="data-[state=active]:bg-[#8648f9] data-[state=active]:text-white text-gray-300"
                >
                  <Heart className="w-4 h-4 ml-2" />
                  المفضلة
                </TabsTrigger>
                <TabsTrigger
                  value="badges"
                  className="data-[state=active]:bg-[#8648f9] data-[state=active]:text-white text-gray-300"
                >
                  <Award className="w-4 h-4 ml-2" />
                  الشارات
                </TabsTrigger>
              </TabsList>

              <TabsContent value="activity" className="mt-6">
                <Card className="bg-gray-900/50 border-[#8648f9]/20">
                  <CardHeader>
                    <CardTitle className="text-white">النشاطات الأخيرة</CardTitle>
                    <CardDescription className="text-gray-400">
                      سجل نشاطاتك التعليمية والانجازات
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {activities.length === 0 ? (
                      <div className="text-center py-8">
                        <Activity className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                        <h4 className="text-lg font-semibold text-gray-300 mb-2">لا توجد نشاطات بعد</h4>
                        <p className="text-gray-400 mb-4">ابدأ رحلة التعلم لتظهر نشاطاتك هنا</p>
                        <Link href="/courses">
                          <Button className="bg-[#8648f9] hover:bg-[#7c3aed]">
                            <BookOpen className="w-4 h-4 ml-2" />
                            استكشف المسارات
                          </Button>
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {activities.map((activity, index) => (
                          <div
                            key={`${activity.type}-${activity.id}-${index}`}
                            className="flex items-start gap-4 p-4 bg-gray-800/30 rounded-lg border border-gray-700/50"
                          >
                            <div className="flex-shrink-0">
                              {getActivityIcon(activity.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-white font-medium mb-1">{activity.title}</h4>
                              <p className="text-gray-400 text-sm mb-2">{activity.description}</p>
                              <div className="flex items-center text-xs text-gray-500">
                                <Clock className="w-3 h-3 ml-1" />
                                {formatDate(activity.timestamp)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="favorites" className="mt-6">
                <Card className="bg-gray-900/50 border-[#8648f9]/20">
                  <CardHeader>
                    <CardTitle className="text-white">المسارات المفضلة</CardTitle>
                    <CardDescription className="text-gray-400">
                      المسارات التي قضيت فيها وقتاً أكثر
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {favoriteCourses.length === 0 ? (
                      <div className="text-center py-8">
                        <Heart className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                        <h4 className="text-lg font-semibold text-gray-300 mb-2">لا توجد مسارات مفضلة</h4>
                        <p className="text-gray-400 mb-4">ابدأ التعلم لتظهر مساراتك المفضلة هنا</p>
                        <Link href="/courses">
                          <Button className="bg-[#8648f9] hover:bg-[#7c3aed]">
                            <BookOpen className="w-4 h-4 ml-2" />
                            استكشف المسارات
                          </Button>
                        </Link>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {favoriteCourses.map((course, index) => (
                          <div
                            key={`course-${course.id}-${index}`}
                            className="p-4 bg-gray-800/30 rounded-lg border border-gray-700/50 hover:border-[#8648f9]/30 transition-colors"
                          >
                            <div className="flex items-center gap-3 mb-3">
                              {course.image ? (
                                <Image
                                  src={course.image}
                                  alt={course.title}
                                  width={48}
                                  height={48}
                                  className="rounded-lg object-cover"
                                />
                              ) : (
                                <div className="w-12 h-12 bg-[#8648f9]/20 rounded-lg flex items-center justify-center">
                                  <BookOpen className="w-6 h-6 text-[#8648f9]" />
                                </div>
                              )}
                              <div className="flex-1">
                                <h4 className="text-white font-medium line-clamp-1">{course.title}</h4>
                                <p className="text-gray-400 text-sm">{course.level}</p>
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-400">الوقت المستغرق:</span>
                                <span className="text-white">{formatTimeSpent(course.time_spent || 0)}</span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-400">المدة:</span>
                                <span className="text-white">{course.duration || 'غير محدد'}</span>
                              </div>
                            </div>
                            
                            <Link href={`/lessons/${course.id}`} className="block mt-3">
                              <Button className="w-full bg-[#8648f9] hover:bg-[#7c3aed]">
                                <BookOpen className="w-4 h-4 ml-2" />
                                استمر في التعلم
                              </Button>
                            </Link>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="badges" className="mt-6">
                <Card className="bg-gray-900/50 border-[#8648f9]/20">
                  <CardHeader>
                    <CardTitle className="text-white">شاراتي</CardTitle>
                    <CardDescription className="text-gray-400">
                      شارات الإنجاز التي حصلت عليها
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {userBadges.length === 0 ? (
                      <div className="text-center py-8">
                        <Award className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                        <h4 className="text-lg font-semibold text-gray-300 mb-2">لا توجد شارات بعد</h4>
                        <p className="text-gray-400 mb-4">أكمل المسارات التعليمية للحصول على شارات الإنجاز</p>
                        <Link href="/courses">
                          <Button className="bg-[#8648f9] hover:bg-[#7c3aed]">
                            <BookOpen className="w-4 h-4 ml-2" />
                            استكشف المسارات
                          </Button>
                        </Link>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {userBadges.map((badge, index) => (
                          <div
                            key={`badge-${badge.id}-${index}`}
                            className="flex flex-col items-center p-4 bg-gray-800/30 rounded-lg border border-gray-700/50 hover:border-[#8648f9]/30 transition-colors"
                          >
                            <div 
                              className="w-16 h-16 mx-auto mb-3 rounded-full flex items-center justify-center shadow-lg"
                              style={{ backgroundColor: badge.badge_color }}
                            >
                              {badge.badge_image_url ? (
                                <Image
                                  src={badge.badge_image_url}
                                  alt={badge.badge_name}
                                  width={48}
                                  height={48}
                                  className="rounded-full object-cover"
                                />
                              ) : (
                                <Award className="w-8 h-8 text-white" />
                              )}
                            </div>
                            
                            <h4 className="text-white font-medium mb-1 line-clamp-1">
                              {badge.badge_name}
                            </h4>
                            <p className="text-gray-400 text-sm mb-2 line-clamp-2">
                              {badge.course_title}
                            </p>
                            
                            <div className="flex items-center justify-center text-xs text-gray-500">
                              <Calendar className="w-3 h-3 ml-1" />
                              {formatDate(badge.awarded_at)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {userBadges.length > 0 && (
                      <div className="text-center mt-6">
                        <Link href="/badges">
                          <Button variant="outline" className="border-[#8648f9] text-[#8648f9] hover:bg-[#8648f9]/10">
                            <Award className="w-4 h-4 ml-2" />
                            عرض جميع الشارات ({userBadges.length})
                          </Button>
                        </Link>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  )
} 