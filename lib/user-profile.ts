import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export interface UserProfile {
  id: string
  full_name: string
  email: string
  role: string
  status: string
  join_date: string
  avatar_url?: string
  created_at: string
}

export interface UserStats {
  totalEnrollments: number
  completedCourses: number
  totalLessonsCompleted: number
  totalTimeSpent: number
  averageRating: number
  totalBadges: number
  joinDate: string
  lastActivity: string
}

export interface UserActivity {
  id: string
  type: 'enrollment' | 'completion' | 'badge' | 'lesson'
  title: string
  description: string
  timestamp: string
  course_id?: number
  badge_id?: number
  lesson_id?: number
}

/**
 * جلب بيانات الملف الشخصي للمستخدم
 */
export async function getUserProfile(): Promise<{ profile: UserProfile | null, error: string | null }> {
  try {
    const supabase = createClientComponentClient()
    
    // الحصول على المستخدم الحالي
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return { profile: null, error: 'يجب تسجيل الدخول أولاً' }
    }

    // جلب بيانات المستخدم من جدول users
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Error fetching user profile:', profileError)
      return { profile: null, error: 'فشل في جلب بيانات الملف الشخصي' }
    }

    return { profile, error: null }
  } catch (error) {
    console.error('Error in getUserProfile:', error)
    return { profile: null, error: 'حدث خطأ غير متوقع' }
  }
}

/**
 * تحديث بيانات الملف الشخصي
 */
export async function updateUserProfile(updates: {
  full_name?: string
  avatar_url?: string
}): Promise<{ success: boolean, error: string | null }> {
  try {
    const supabase = createClientComponentClient()
    
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return { success: false, error: 'يجب تسجيل الدخول أولاً' }
    }

    const { error: updateError } = await supabase
      .from('users')
      .update(updates)
      .eq('id', user.id)

    if (updateError) {
      console.error('Error updating user profile:', updateError)
      return { success: false, error: 'فشل في تحديث الملف الشخصي' }
    }

    return { success: true, error: null }
  } catch (error) {
    console.error('Error in updateUserProfile:', error)
    return { success: false, error: 'حدث خطأ غير متوقع' }
  }
}

/**
 * جلب إحصائيات المستخدم
 */
export async function getUserStats(): Promise<{ stats: UserStats, error: string | null }> {
  try {
    const supabase = createClientComponentClient()
    
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return { 
        stats: {
          totalEnrollments: 0,
          completedCourses: 0,
          totalLessonsCompleted: 0,
          totalTimeSpent: 0,
          averageRating: 0,
          totalBadges: 0,
          joinDate: '',
          lastActivity: ''
        }, 
        error: 'يجب تسجيل الدخول أولاً' 
      }
    }

    // جلب بيانات المستخدم الأساسية
    const { data: userData } = await supabase
      .from('users')
      .select('join_date, created_at')
      .eq('id', user.id)
      .single()

    // جلب تسجيلات المسارات
    const { data: enrollments } = await supabase
      .from('course_enrollments')
      .select('*')
      .eq('user_id', user.id)

    // جلب الدروس المكتملة
    const { data: completedLessons } = await supabase
      .from('lesson_progress')
      .select('*')
      .eq('user_id', user.id)
      .eq('completed', true)

    // جلب الشارات
    const { data: badges } = await supabase
      .from('user_course_badges')
      .select('*')
      .eq('user_id', user.id)

    // جلب التقييمات
    const { data: ratings } = await supabase
      .from('lesson_ratings')
      .select('rating')
      .eq('user_id', user.id)

    // حساب الإحصائيات
    const totalEnrollments = enrollments?.length || 0
    const completedCourses = enrollments?.filter(e => e.status === 'مكتمل').length || 0
    const totalLessonsCompleted = completedLessons?.length || 0
    const totalTimeSpent = enrollments?.reduce((sum, e) => sum + (e.total_time_spent || 0), 0) || 0
    const totalBadges = badges?.length || 0
    
    // حساب متوسط التقييم
    const averageRating = ratings && ratings.length > 0 
      ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length 
      : 0

    // آخر نشاط
    const lastActivity = enrollments && enrollments.length > 0 
      ? enrollments.reduce((latest, e) => 
          e.last_accessed && (!latest.last_accessed || e.last_accessed > latest.last_accessed) 
            ? e 
            : latest
        ).last_accessed || ''
      : ''

    const stats: UserStats = {
      totalEnrollments,
      completedCourses,
      totalLessonsCompleted,
      totalTimeSpent,
      averageRating: Math.round(averageRating * 10) / 10,
      totalBadges,
      joinDate: userData?.join_date || userData?.created_at || '',
      lastActivity
    }

    return { stats, error: null }
  } catch (error) {
    console.error('Error in getUserStats:', error)
    return { 
      stats: {
        totalEnrollments: 0,
        completedCourses: 0,
        totalLessonsCompleted: 0,
        totalTimeSpent: 0,
        averageRating: 0,
        totalBadges: 0,
        joinDate: '',
        lastActivity: ''
      }, 
      error: 'حدث خطأ غير متوقع' 
    }
  }
}

/**
 * جلب نشاطات المستخدم
 */
export async function getUserActivity(): Promise<{ activities: UserActivity[], error: string | null }> {
  try {
    const supabase = createClientComponentClient()
    
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return { activities: [], error: 'يجب تسجيل الدخول أولاً' }
    }

    const activities: UserActivity[] = []

    // جلب التسجيلات الجديدة
    const { data: enrollments } = await supabase
      .from('course_enrollments')
      .select(`
        id,
        enrolled_at,
        course_id,
        courses!course_enrollments_course_id_fkey (title)
      `)
      .eq('user_id', user.id)
      .order('enrolled_at', { ascending: false })
      .limit(10)

    enrollments?.forEach(enrollment => {
      const courseData = enrollment.courses as any
      activities.push({
        id: enrollment.id,
        type: 'enrollment',
        title: `تم التسجيل في مسار: ${courseData?.title || 'مسار جديد'}`,
        description: 'تم تفعيل مسار تعليمي جديد',
        timestamp: enrollment.enrolled_at,
        course_id: enrollment.course_id
      })
    })

    // جلب المسارات المكتملة
    const { data: completedCourses } = await supabase
      .from('course_enrollments')
      .select(`
        id,
        completed_at,
        course_id,
        courses!course_enrollments_course_id_fkey (title)
      `)
      .eq('user_id', user.id)
      .eq('status', 'مكتمل')
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(10)

    completedCourses?.forEach(course => {
      const courseData = course.courses as any
      activities.push({
        id: course.id,
        type: 'completion',
        title: `تم إكمال مسار: ${courseData?.title || 'مسار'}`,
        description: 'مبروك! لقد أكملت مسار تعليمي بنجاح',
        timestamp: course.completed_at!,
        course_id: course.course_id
      })
    })

    // جلب الشارات الجديدة
    const { data: badges } = await supabase
      .from('user_course_badges')
      .select(`
        id,
        awarded_at,
        badge_id,
        course_badges!user_course_badges_badge_id_fkey (name, course_id)
      `)
      .eq('user_id', user.id)
      .order('awarded_at', { ascending: false })
      .limit(10)

    badges?.forEach(badge => {
      const badgeData = badge.course_badges as any
      activities.push({
        id: badge.id.toString(),
        type: 'badge',
        title: `تم الحصول على شارة: ${badgeData?.name || 'شارة جديدة'}`,
        description: 'مبروك! لقد حصلت على شارة إنجاز جديدة',
        timestamp: badge.awarded_at,
        badge_id: badge.badge_id
      })
    })

    // ترتيب النشاطات حسب التاريخ
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    return { activities: activities.slice(0, 20), error: null }
  } catch (error) {
    console.error('Error in getUserActivity:', error)
    return { activities: [], error: 'حدث خطأ غير متوقع' }
  }
}

/**
 * جلب المسارات المفضلة للمستخدم
 */
export async function getUserFavoriteCourses(): Promise<{ courses: any[], error: string | null }> {
  try {
    const supabase = createClientComponentClient()
    
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return { courses: [], error: 'يجب تسجيل الدخول أولاً' }
    }

    // جلب المسارات التي قضى فيها المستخدم وقتاً أكثر
    const { data: favoriteCourses } = await supabase
      .from('course_enrollments')
      .select(`
        course_id,
        total_time_spent,
        courses!course_enrollments_course_id_fkey (
          id,
          title,
          description,
          level,
          image,
          duration
        )
      `)
      .eq('user_id', user.id)
      .gt('total_time_spent', 0)
      .order('total_time_spent', { ascending: false })
      .limit(5)

    const courses = favoriteCourses?.map(fc => ({
      ...fc.courses,
      time_spent: fc.total_time_spent
    })) || []

    return { courses, error: null }
  } catch (error) {
    console.error('Error in getUserFavoriteCourses:', error)
    return { courses: [], error: 'حدث خطأ غير متوقع' }
  }
} 