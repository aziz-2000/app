import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export interface UserBadge {
  id: number
  awarded_at: string
  badge_id: number
  badge_name: string
  badge_description: string
  badge_image_url?: string
  badge_color: string
  course_title: string
  course_level: string
}

export interface CourseBadge {
  id: number
  course_id: number
  name: string
  description: string
  image_url?: string
  color: string
  created_at: string
  updated_at: string
}

interface BadgeWithCourse {
  id: number
  awarded_at: string
  badge_id: number
  course_badges: {
    id: number
    name: string
    description: string
    image_url?: string
    color: string
    courses: {
      id: number
      title: string
      level: string
    }
  }
}

export interface BadgeStats {
  total_badges: number
  total_courses_completed: number
  completion_rate: number
}

export interface BadgeWithCourseInfo extends CourseBadge {
  course_title?: string
  course_level?: string
  total_awarded?: number
}

/**
 * الحصول على المستخدم الحالي من الجلسة
 */
async function getCurrentUser() {
  try {
    const supabase = createClientComponentClient()
    
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.error('Session error:', sessionError)
      if (sessionError.message?.includes('Auth session missing')) {
        console.log('⚠️ Session missing, trying getUser()...')
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError) {
          console.error('User error:', userError)
          return null
        }
        
        if (user) {
          console.log('✅ User found via getUser():', user.email)
          return user
        }
      }
      return null
    }
    
    if (session?.user) {
      console.log('✅ User found via getSession():', session.user.email)
      return session.user
    }
    
    console.log('⚠️ No user in session, trying getUser()...')
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError) {
      console.error('User error:', userError)
      return null
    }
    
    if (user) {
      console.log('✅ User found via getUser():', user.email)
      return user
    }
    
    console.log('⚠️ No user found in session or user data')
    return null
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}

/**
 * رفع صورة الشارة
 * Upload badge image
 */
export const uploadBadgeImage = async (file: File): Promise<{ 
  success: boolean; 
  imageUrl?: string; 
  error?: string 
}> => {
  const supabase = createClientComponentClient()
  
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: 'يجب تسجيل الدخول أولاً' }
    }

    // إنشاء اسم فريد للملف
    const fileExt = file.name.split('.').pop()
    const fileName = `badge-${Date.now()}.${fileExt}`
    const filePath = `badges/${fileName}`

    // رفع الملف
    const { error: uploadError } = await supabase.storage
      .from('badge-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('❌ Error uploading badge image:', uploadError)
      return { success: false, error: 'فشل في رفع صورة الشارة' }
    }

    // الحصول على رابط الصورة
    const { data: { publicUrl } } = supabase.storage
      .from('badge-images')
      .getPublicUrl(filePath)

    return { success: true, imageUrl: publicUrl }

  } catch (error) {
    console.error('❌ Error in uploadBadgeImage:', error)
    return { success: false, error: 'حدث خطأ غير متوقع' }
  }
}

/**
 * حذف صورة الشارة
 * Delete badge image
 */
export const deleteBadgeImage = async (imageUrl: string): Promise<{ 
  success: boolean; 
  error?: string 
}> => {
  const supabase = createClientComponentClient()
  
  try {
    // استخراج مسار الملف من الرابط
    const urlParts = imageUrl.split('/')
    const filePath = urlParts.slice(-2).join('/') // badges/filename.ext

    const { error } = await supabase.storage
      .from('badge-images')
      .remove([filePath])

    if (error) {
      console.error('❌ Error deleting badge image:', error)
      return { success: false, error: 'فشل في حذف صورة الشارة' }
    }

    return { success: true }

  } catch (error) {
    console.error('❌ Error in deleteBadgeImage:', error)
    return { success: false, error: 'حدث خطأ غير متوقع' }
  }
}

/**
 * جلب جميع شارات المستخدم مع بيانات المسارات
 * Get all user badges with course data
 */
export const getUserBadges = async (): Promise<{ badges: UserBadge[], error: string | null }> => {
  const supabase = createClientComponentClient()
  
  try {
    // فحص تسجيل الدخول
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError) {
      console.error('❌ User error:', userError)
      return { badges: [], error: 'خطأ في التحقق من المستخدم' }
    }
    
    if (!user || !user.id) {
      console.log('⚠️ No user found or user has no ID')
      return { badges: [], error: 'يجب تسجيل الدخول أولاً' }
    }

    console.log('🏆 Fetching badges for user:', user.id)
    
    // جلب شارات المستخدم مع بيانات الشارات والمسارات
    const { data: badges, error } = await supabase
      .from('user_course_badges')
      .select(`
        id,
        awarded_at,
        badge_id,
        course_badges (
          id,
          name,
          description,
          image_url,
          color,
          courses (
            id,
            title,
            level
          )
        )
      `)
      .eq('user_id', user.id)
      .order('awarded_at', { ascending: false })

    if (error) {
      console.error('❌ Error fetching badges:', error)
      return { badges: [], error: 'فشل في جلب الشارات' }
    }

    // تحويل البيانات إلى الشكل المطلوب
    const formattedBadges: UserBadge[] = (badges || []).map((badge: any) => ({
      id: badge.id,
      awarded_at: badge.awarded_at,
      badge_id: badge.badge_id,
      badge_name: badge.course_badges?.name || 'شارة غير معروفة',
      badge_description: badge.course_badges?.description || 'لا يوجد وصف',
      badge_image_url: badge.course_badges?.image_url,
      badge_color: badge.course_badges?.color || '#8648f9',
      course_title: badge.course_badges?.courses?.title || 'مسار غير معروف',
      course_level: badge.course_badges?.courses?.level || 'غير محدد'
    }))

    console.log('✅ Badges loaded:', formattedBadges.length)
    
    // بعد جلب الشارات، قم بإصلاح الشارات المفقودة تلقائياً
    console.log('🔧 Running automatic missing badges fix...')
    try {
      const fixResult = await checkAndFixMissingBadges()
      if (fixResult.success && (fixResult.createdBadges > 0 || fixResult.awardedBadges > 0)) {
        console.log(`✅ Auto-fix completed: ${fixResult.createdBadges} badges created, ${fixResult.awardedBadges} badges awarded`)
        
        // إعادة جلب الشارات بعد الإصلاح إذا تم إنشاء شارات جديدة
        if (fixResult.awardedBadges > 0) {
          console.log('🔄 Re-fetching badges after auto-fix...')
          const { data: updatedBadges, error: refetchError } = await supabase
            .from('user_course_badges')
            .select(`
              id,
              awarded_at,
              badge_id,
              course_badges (
                id,
                name,
                description,
                image_url,
                color,
                courses (
                  id,
                  title,
                  level
                )
              )
            `)
            .eq('user_id', user.id)
            .order('awarded_at', { ascending: false })

          if (!refetchError && updatedBadges) {
            const updatedFormattedBadges: UserBadge[] = (updatedBadges || []).map((badge: any) => ({
              id: badge.id,
              awarded_at: badge.awarded_at,
              badge_id: badge.badge_id,
              badge_name: badge.course_badges?.name || 'شارة غير معروفة',
              badge_description: badge.course_badges?.description || 'لا يوجد وصف',
              badge_image_url: badge.course_badges?.image_url,
              badge_color: badge.course_badges?.color || '#8648f9',
              course_title: badge.course_badges?.courses?.title || 'مسار غير معروف',
              course_level: badge.course_badges?.courses?.level || 'غير محدد'
            }))
            
            console.log('✅ Updated badges loaded after auto-fix:', updatedFormattedBadges.length)
            return { badges: updatedFormattedBadges, error: null }
          }
        }
      }
    } catch (fixError) {
      console.error('⚠️ Auto-fix failed but badges were loaded:', fixError)
      // لا نعيد خطأ لأن الشارات الأساسية تم جلبها بنجاح
    }
    
    return { badges: formattedBadges, error: null }

  } catch (error: any) {
    console.error('❌ Error in getUserBadges:', error)
    return { badges: [], error: error.message || 'حدث خطأ غير متوقع' }
  }
}

/**
 * جلب جميع شارات المسارات المتاحة مع معلومات إضافية
 * Get all available course badges with additional info
 */
export const getAllCourseBadges = async (): Promise<{ badges: BadgeWithCourseInfo[], error: string | null }> => {
  const supabase = createClientComponentClient()
  
  try {
    const { data: badges, error } = await supabase
      .from('course_badges')
      .select(`
        id,
        course_id,
        name,
        description,
        image_url,
        color,
        created_at,
        updated_at,
        courses (
          id,
          title,
          level
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ Error fetching course badges:', error)
      return { badges: [], error: 'فشل في جلب شارات المسارات' }
    }

    // جلب عدد المرات التي تم منح كل شارة
    const badgesWithStats = await Promise.all(
      (badges || []).map(async (badge: any) => {
        const { count } = await supabase
          .from('user_course_badges')
          .select('*', { count: 'exact', head: true })
          .eq('badge_id', badge.id)

        return {
          id: badge.id,
          course_id: badge.course_id,
          name: badge.name,
          description: badge.description || '',
          image_url: badge.image_url,
          color: badge.color,
          created_at: badge.created_at,
          updated_at: badge.updated_at,
          course_title: badge.courses?.title,
          course_level: badge.courses?.level,
          total_awarded: count || 0
        }
      })
    )

    return { badges: badgesWithStats, error: null }

  } catch (error) {
    console.error('❌ Error in getAllCourseBadges:', error)
    return { badges: [], error: 'حدث خطأ غير متوقع' }
  }
}

/**
 * إنشاء شارة جديدة للمسار
 * Create new course badge
 */
export const createCourseBadge = async (badgeData: {
  course_id: number
  name: string
  description: string
  image_url?: string
  color?: string
}): Promise<{ success: boolean, error?: string }> => {
  const supabase = createClientComponentClient()
  
  try {
    const { error } = await supabase
      .from('course_badges')
      .insert({
        course_id: badgeData.course_id,
        name: badgeData.name,
        description: badgeData.description,
        image_url: badgeData.image_url,
        color: badgeData.color || '#8648f9'
      })

    if (error) {
      console.error('❌ Error creating course badge:', error)
      return { success: false, error: 'فشل في إنشاء الشارة' }
    }

    return { success: true }

  } catch (error) {
    console.error('❌ Error in createCourseBadge:', error)
    return { success: false, error: 'حدث خطأ غير متوقع' }
  }
}

/**
 * تحديث شارة المسار
 * Update course badge
 */
export const updateCourseBadge = async (
  badgeId: number,
  badgeData: {
    name?: string
    description?: string
    image_url?: string
    color?: string
  }
): Promise<{ success: boolean, error?: string }> => {
  const supabase = createClientComponentClient()
  
  try {
    const { error } = await supabase
      .from('course_badges')
      .update({
        ...badgeData,
        updated_at: new Date().toISOString()
      })
      .eq('id', badgeId)

    if (error) {
      console.error('❌ Error updating course badge:', error)
      return { success: false, error: 'فشل في تحديث الشارة' }
    }

    return { success: true }

  } catch (error) {
    console.error('❌ Error in updateCourseBadge:', error)
    return { success: false, error: 'حدث خطأ غير متوقع' }
  }
}

/**
 * حذف شارة المسار
 * Delete course badge
 */
export const deleteCourseBadge = async (badgeId: number): Promise<{ success: boolean, error?: string }> => {
  const supabase = createClientComponentClient()
  
  try {
    // جلب معلومات الشارة قبل الحذف
    const { data: badge, error: fetchError } = await supabase
      .from('course_badges')
      .select('image_url')
      .eq('id', badgeId)
      .single()

    if (fetchError) {
      console.error('❌ Error fetching badge for deletion:', fetchError)
      return { success: false, error: 'فشل في جلب معلومات الشارة' }
    }

    // حذف الشارة من قاعدة البيانات
    const { error: deleteError } = await supabase
      .from('course_badges')
      .delete()
      .eq('id', badgeId)

    if (deleteError) {
      console.error('❌ Error deleting course badge:', deleteError)
      return { success: false, error: 'فشل في حذف الشارة' }
    }

    // حذف الصورة إذا كانت موجودة
    if (badge?.image_url) {
      await deleteBadgeImage(badge.image_url)
    }

    return { success: true }

  } catch (error) {
    console.error('❌ Error in deleteCourseBadge:', error)
    return { success: false, error: 'حدث خطأ غير متوقع' }
  }
}

/**
 * جلب شارة مسار محدد
 * Get specific course badge
 */
export const getCourseBadge = async (courseId: number): Promise<{ badge: CourseBadge | null, error: string | null }> => {
  const supabase = createClientComponentClient()
  
  try {
    const { data: badge, error } = await supabase
      .from('course_badges')
      .select(`
        id,
        course_id,
        name,
        description,
        image_url,
        color,
        created_at,
        updated_at
      `)
      .eq('course_id', courseId)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('❌ Error fetching course badge:', error)
      return { badge: null, error: 'فشل في جلب شارة المسار' }
    }

    return { badge: badge || null, error: null }

  } catch (error) {
    console.error('❌ Error in getCourseBadge:', error)
    return { badge: null, error: 'حدث خطأ غير متوقع' }
  }
}

/**
 * فحص إذا كان المستخدم قد حصل على شارة مسار محدد
 * Check if user has earned a specific course badge
 */
export const hasUserEarnedBadge = async (courseId: number): Promise<{ earned: boolean, badge?: UserBadge, error: string | null }> => {
  const supabase = createClientComponentClient()
  
  try {
    // فحص تسجيل الدخول
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return { earned: false, error: 'يجب تسجيل الدخول أولاً' }
    }

    // جلب شارة المسار
    const { data: badge, error: badgeError } = await supabase
      .from('user_course_badges')
      .select(`
        id,
        awarded_at,
        badge_id,
        course_badges (
          id,
          name,
          description,
          image_url,
          color,
          courses (
            id,
            title,
            level
          )
        )
      `)
      .eq('user_id', user.id)
      .eq('course_badges.course_id', courseId)
      .single()

    if (badgeError && badgeError.code !== 'PGRST116') {
      console.error('❌ Error checking badge:', badgeError)
      return { earned: false, error: 'فشل في فحص الشارة' }
    }

    if (!badge) {
      return { earned: false, error: null }
    }

    const userBadge: UserBadge = {
      id: badge.id,
      awarded_at: badge.awarded_at,
      badge_id: badge.badge_id,
      badge_name: (badge as any).course_badges?.name || 'شارة غير معروفة',
      badge_description: (badge as any).course_badges?.description || 'لا يوجد وصف',
      badge_image_url: (badge as any).course_badges?.image_url,
      badge_color: (badge as any).course_badges?.color || '#8648f9',
      course_title: (badge as any).course_badges?.courses?.title || 'مسار غير معروف',
      course_level: (badge as any).course_badges?.courses?.level || 'غير محدد'
    }

    return { earned: true, badge: userBadge, error: null }

  } catch (error) {
    console.error('❌ Error in hasUserEarnedBadge:', error)
    return { earned: false, error: 'حدث خطأ غير متوقع' }
  }
}

/**
 * جلب إحصائيات شارات المستخدم
 */
export async function getUserBadgeStats(): Promise<{ 
  stats: BadgeStats; 
  error?: string 
}> {
  try {
    console.log('📊 getUserBadgeStats called')
    const supabase = createClientComponentClient()
    
    const user = await getCurrentUser()
    if (!user) {
      return { 
        stats: {
          total_badges: 0,
          total_courses_completed: 0,
          completion_rate: 0
        }, 
        error: "يجب تسجيل الدخول أولاً" 
      }
    }

    const { data: stats, error } = await supabase
      .rpc('get_user_badge_stats', { p_user_id: user.id })

    if (error) {
      console.error('❌ Error fetching badge stats:', error)
      return { 
        stats: {
          total_badges: 0,
          total_courses_completed: 0,
          completion_rate: 0
        }, 
        error: "فشل في جلب إحصائيات الشارات" 
      }
    }

    const badgeStats = stats?.[0] || {
      total_badges: 0,
      total_courses_completed: 0,
      completion_rate: 0
    }

    console.log('✅ Badge stats loaded:', badgeStats)
    return { stats: badgeStats, error: undefined }
  } catch (error) {
    console.error('❌ Error in getUserBadgeStats:', error)
    return { 
      stats: {
        total_badges: 0,
        total_courses_completed: 0,
        completion_rate: 0
      }, 
      error: "حدث خطأ غير متوقع" 
    }
  }
}

/**
 * منح شارة للمستخدم (للاستخدام من قبل المسؤول أو النظام)
 */
export async function awardBadgeToUser(userId: string, courseId: number): Promise<{ 
  success: boolean; 
  error?: string 
}> {
  try {
    console.log('🏆 awardBadgeToUser called for user:', userId, 'course:', courseId)
    const supabase = createClientComponentClient()

    // البحث عن شارة المسار
    const { data: badge, error: badgeError } = await supabase
      .from('course_badges')
      .select('id')
      .eq('course_id', courseId)
      .single()

    if (badgeError || !badge) {
      console.error('❌ Course badge not found:', badgeError)
      return { success: false, error: "شارة المسار غير موجودة" }
    }

    // فحص إذا كان المستخدم قد حصل على الشارة مسبقاً
    const { data: existingBadge, error: existingError } = await supabase
      .from('user_course_badges')
      .select('id')
      .eq('user_id', userId)
      .eq('badge_id', badge.id)
      .single()

    if (existingError && existingError.code !== 'PGRST116') {
      console.error('❌ Error checking existing badge:', existingError)
      return { success: false, error: "فشل في فحص الشارة الموجودة" }
    }

    if (existingBadge) {
      console.log('⚠️ User already has this badge')
      return { success: true, error: undefined } // نجح لأن الشارة موجودة بالفعل
    }

    // منح الشارة للمستخدم
    const { error: awardError } = await supabase
      .from('user_course_badges')
      .insert({
        user_id: userId,
        badge_id: badge.id,
        awarded_at: new Date().toISOString()
      })

    if (awardError) {
      console.error(`❌ Error awarding badge for course ${courseId}:`, {
        message: awardError.message || 'No message',
        details: awardError.details || 'No details',
        hint: awardError.hint || 'No hint',
        code: awardError.code || 'No code',
        fullError: JSON.stringify(awardError, null, 2)
      })
      
      // إضافة معلومات إضافية للتشخيص
      console.error(`🔍 Debug info for awarding badge:`, {
        userId: userId,
        badgeId: badge.id,
        courseId: courseId,
        courseTitle: courseId,
        awardedAt: new Date().toISOString(),
        errorObject: awardError,
        errorType: typeof awardError,
        errorKeys: Object.keys(awardError || {}),
        errorStringified: JSON.stringify(awardError, null, 2)
      })
      
      // محاولة الحصول على رسالة خطأ أكثر تفصيلاً
      let errorMessage = 'فشل في منح الشارة'
      if (awardError && typeof awardError === 'object') {
        if (awardError.message) {
          errorMessage = `فشل في منح الشارة: ${awardError.message}`
        } else if (awardError.details) {
          errorMessage = `فشل في منح الشارة: ${awardError.details}`
        } else if (awardError.hint) {
          errorMessage = `فشل في منح الشارة: ${awardError.hint}`
        } else if (awardError.code) {
          errorMessage = `فشل في منح الشارة (كود: ${awardError.code})`
        }
      }
      
      console.error(`❌ Final error message: ${errorMessage}`)
      return { success: false, error: errorMessage }
    }

    console.log('✅ Badge awarded successfully')
    
    // بعد منح الشارة بنجاح، قم بإصلاح الشارات المفقودة تلقائياً
    console.log('🔧 Running automatic missing badges fix...')
    try {
      const fixResult = await checkAndFixMissingBadges()
      if (fixResult.success && (fixResult.createdBadges > 0 || fixResult.awardedBadges > 0)) {
        console.log(`✅ Auto-fix completed: ${fixResult.createdBadges} badges created, ${fixResult.awardedBadges} badges awarded`)
      }
    } catch (fixError) {
      console.error('⚠️ Auto-fix failed but badge was awarded:', fixError)
      // لا نعيد خطأ لأن الشارة الأساسية تم منحها بنجاح
    }
    
    return { success: true, error: undefined }
  } catch (error) {
    console.error('❌ Error in awardBadgeToUser:', error)
    return { success: false, error: "حدث خطأ غير متوقع" }
  }
}

/**
 * جلب إحصائيات الشارات للمسؤول
 */
export async function getBadgeStats(): Promise<{ 
  stats: {
    total_badges: number
    total_awarded: number
    courses_with_badges: number
    courses_without_badges: number
  }; 
  error?: string 
}> {
  try {
    const supabase = createClientComponentClient()
    
    // إحصائيات الشارات
    const { count: totalBadges } = await supabase
      .from('course_badges')
      .select('*', { count: 'exact', head: true })

    // إحصائيات الشارات الممنوحة
    const { count: totalAwarded } = await supabase
      .from('user_course_badges')
      .select('*', { count: 'exact', head: true })

    // المسارات التي لها شارات
    const { count: coursesWithBadges } = await supabase
      .from('course_badges')
      .select('course_id', { count: 'exact', head: true })

    // إجمالي المسارات
    const { count: totalCourses } = await supabase
      .from('courses')
      .select('*', { count: 'exact', head: true })

    const coursesWithoutBadges = (totalCourses || 0) - (coursesWithBadges || 0)

    return {
      stats: {
        total_badges: totalBadges || 0,
        total_awarded: totalAwarded || 0,
        courses_with_badges: coursesWithBadges || 0,
        courses_without_badges: coursesWithoutBadges
      },
      error: undefined
    }
  } catch (error) {
    console.error('❌ Error in getBadgeStats:', error)
    return {
      stats: {
        total_badges: 0,
        total_awarded: 0,
        courses_with_badges: 0,
        courses_without_badges: 0
      },
      error: 'حدث خطأ غير متوقع'
    }
  }
}

/**
 * إنشاء شارات للمسارات الموجودة التي لا تحتوي على شارات
 * Create badges for existing courses that don't have badges
 */
export const createBadgesForExistingCourses = async (): Promise<{ 
  success: boolean; 
  createdCount: number; 
  error?: string 
}> => {
  const supabase = createClientComponentClient()
  
  try {
    console.log('🏆 Creating badges for existing courses...')
    
    // جلب المسارات التي لا تحتوي على شارات
    const { data: coursesWithoutBadges, error: coursesError } = await supabase
      .from('courses')
      .select(`
        id,
        title,
        level,
        description
      `)
      .not('id', 'in', 
        supabase
          .from('course_badges')
          .select('course_id')
      )

    if (coursesError) {
      console.error('❌ Error fetching courses without badges:', coursesError)
      return { success: false, createdCount: 0, error: 'فشل في جلب المسارات' }
    }

    if (!coursesWithoutBadges || coursesWithoutBadges.length === 0) {
      console.log('✅ All courses already have badges')
      return { success: true, createdCount: 0 }
    }

    console.log(`📚 Found ${coursesWithoutBadges.length} courses without badges`)

    // إنشاء شارات للمسارات
    const badgesToCreate = coursesWithoutBadges.map(course => ({
      course_id: course.id,
      name: `شارة ${course.title}`,
      description: `شارة إنجاز لإكمال مسار ${course.title}`,
      color: getBadgeColorByLevel(course.level)
    }))

    const { data: createdBadges, error: createError } = await supabase
      .from('course_badges')
      .insert(badgesToCreate)
      .select('id, name, course_id')

    if (createError) {
      console.error('❌ Error creating badges:', createError)
      return { success: false, createdCount: 0, error: 'فشل في إنشاء الشارات' }
    }

    console.log(`✅ Created ${createdBadges?.length || 0} badges for courses`)
    return { 
      success: true, 
      createdCount: createdBadges?.length || 0 
    }

  } catch (error: any) {
    console.error('❌ Error in createBadgesForExistingCourses:', error)
    return { 
      success: false, 
      createdCount: 0, 
      error: error.message || 'حدث خطأ غير متوقع' 
    }
  }
}

/**
 * الحصول على لون الشارة بناءً على مستوى المسار
 * Get badge color based on course level
 */
const getBadgeColorByLevel = (level: string): string => {
  switch (level) {
    case 'مبتدئ':
      return '#fbbf24' // yellow-400
    case 'متوسط':
      return '#3b82f6' // blue-500
    case 'متقدم':
      return '#10b981' // green-500
    default:
      return '#8648f9' // purple
  }
}

/**
 * فحص وإصلاح الشارات المفقودة للمسارات المكتملة
 * Check and fix missing badges for completed courses
 */
export const checkAndFixMissingBadges = async (): Promise<{ 
  success: boolean; 
  completedCourses: number;
  existingBadges: number;
  createdBadges: number;
  awardedBadges: number;
  error?: string 
}> => {
  const supabase = createClientComponentClient()
  
  try {
    console.log('🔍 Checking for missing badges...')
    
    // الحصول على المستخدم الحالي
    const user = await getCurrentUser()
    if (!user) {
      return { 
        success: false, 
        completedCourses: 0,
        existingBadges: 0,
        createdBadges: 0,
        awardedBadges: 0,
        error: 'يجب تسجيل الدخول أولاً' 
      }
    }

    // 1. جلب المسارات المكتملة
    const { data: completedCourses, error: coursesError } = await supabase
      .from('course_enrollments')
      .select(`
        course_id,
        completed_at,
        courses (
          id,
          title,
          level,
          description
        )
      `)
      .eq('user_id', user.id)
      .eq('status', 'مكتمل')

    if (coursesError) {
      console.error('❌ Error fetching completed courses:', {
        message: coursesError.message,
        details: coursesError.details,
        hint: coursesError.hint,
        code: coursesError.code
      })
      return { 
        success: false, 
        completedCourses: 0,
        existingBadges: 0,
        createdBadges: 0,
        awardedBadges: 0,
        error: 'فشل في جلب المسارات المكتملة' 
      }
    }

    if (!completedCourses || completedCourses.length === 0) {
      console.log('✅ No completed courses found')
      return { 
        success: true, 
        completedCourses: 0,
        existingBadges: 0,
        createdBadges: 0,
        awardedBadges: 0
      }
    }

    console.log(`📚 Found ${completedCourses.length} completed courses`)

    // 2. جلب الشارات الموجودة
    const { data: existingBadges, error: badgesError } = await supabase
      .from('user_course_badges')
      .select(`
        badge_id,
        course_badges (
          course_id
        )
      `)
      .eq('user_id', user.id)

    if (badgesError) {
      console.error('❌ Error fetching existing badges:', {
        message: badgesError.message,
        details: badgesError.details,
        hint: badgesError.hint,
        code: badgesError.code
      })
      return { 
        success: false, 
        completedCourses: completedCourses.length,
        existingBadges: 0,
        createdBadges: 0,
        awardedBadges: 0,
        error: 'فشل في جلب الشارات الموجودة' 
      }
    }

    const existingBadgeCourseIds = new Set(
      (existingBadges || []).map(badge => (badge as any).course_badges?.course_id)
    )

    console.log(`🏆 Found ${existingBadges?.length || 0} existing badges`)

    // 3. تحديد المسارات التي تحتاج إلى شارات
    const coursesNeedingBadges = completedCourses.filter(
      enrollment => !existingBadgeCourseIds.has(enrollment.course_id)
    )

    if (coursesNeedingBadges.length === 0) {
      console.log('✅ All completed courses have badges')
      return { 
        success: true, 
        completedCourses: completedCourses.length,
        existingBadges: existingBadges?.length || 0,
        createdBadges: 0,
        awardedBadges: 0
      }
    }

    console.log(`⚠️ Found ${coursesNeedingBadges.length} courses needing badges`)

    let createdBadgesCount = 0
    let awardedBadgesCount = 0

    // 4. إنشاء ومنح الشارات للمسارات المفقودة
    for (const enrollment of coursesNeedingBadges) {
      const course = (enrollment as any).courses
      
      // التحقق من وجود بيانات المسار
      if (!course || !course.id || !course.title || !course.level) {
        console.error(`❌ Invalid course data for enrollment:`, {
          enrollment,
          course,
          courseId: course?.id,
          courseTitle: course?.title,
          courseLevel: course?.level
        })
        continue
      }
      
      console.log(`🔍 Processing course: ${course.id} - ${course.title}`)
      
      // فحص إذا كانت الشارة موجودة للمسار
      const { data: courseBadge, error: badgeCheckError } = await supabase
        .from('course_badges')
        .select('id')
        .eq('course_id', course.id)
        .single()

      let badgeId: number

      if (badgeCheckError || !courseBadge) {
        // إنشاء شارة جديدة للمسار
        const badgeData = {
          course_id: course.id,
          name: `شارة ${course.title}`,
          description: `شارة إنجاز لإكمال مسار ${course.title}`,
          color: getBadgeColorByLevel(course.level)
        }
        
        console.log(`📝 Creating badge with data:`, badgeData)
        
        const { data: newBadge, error: createError } = await supabase
          .from('course_badges')
          .insert(badgeData)
          .select('id')
          .single()

        if (createError) {
          console.error(`❌ Error creating badge for course ${course.id}:`, {
            message: createError.message || 'No message',
            details: createError.details || 'No details',
            hint: createError.hint || 'No hint',
            code: createError.code || 'No code',
            fullError: JSON.stringify(createError, null, 2)
          })
          
          // إضافة معلومات إضافية للتشخيص
          console.error(`🔍 Debug info for course ${course.id}:`, {
            courseId: course.id,
            courseTitle: course.title,
            courseLevel: course.level,
            badgeData: badgeData,
            errorObject: createError,
            errorType: typeof createError,
            errorKeys: Object.keys(createError || {}),
            errorStringified: JSON.stringify(createError, null, 2)
          })
          
          // محاولة الحصول على رسالة خطأ أكثر تفصيلاً
          let errorMessage = 'فشل في إنشاء الشارة'
          if (createError && typeof createError === 'object') {
            if (createError.message) {
              errorMessage = `فشل في إنشاء الشارة: ${createError.message}`
            } else if (createError.details) {
              errorMessage = `فشل في إنشاء الشارة: ${createError.details}`
            } else if (createError.hint) {
              errorMessage = `فشل في إنشاء الشارة: ${createError.hint}`
            } else if (createError.code) {
              errorMessage = `فشل في إنشاء الشارة (كود: ${createError.code})`
            }
          }
          
          console.error(`❌ Final error message: ${errorMessage}`)
          
          // محاولة استخدام الدالة البديلة لإنشاء الشارة
          try {
            console.log('🔄 Trying alternative badge creation method...')
            const { createCourseBadgeWithRLS } = await import('./badge-creation')
            const alternativeResult = await createCourseBadgeWithRLS(badgeData)
            
            if (alternativeResult.success && alternativeResult.badgeId) {
              badgeId = alternativeResult.badgeId
              createdBadgesCount++
              console.log(`✅ Created badge via alternative method for course: ${course.title}`)
            } else {
              console.error(`❌ Alternative method also failed: ${alternativeResult.error}`)
              continue
            }
          } catch (importError) {
            console.error('❌ Error importing alternative badge creation:', importError)
            continue
          }
        } else {
          badgeId = newBadge.id
          createdBadgesCount++
          console.log(`✅ Created badge for course: ${course.title}`)
        }

        // منح الشارة للمستخدم
        const awardData = {
          user_id: user.id,
          badge_id: badgeId,
          awarded_at: enrollment.completed_at || new Date().toISOString()
        }
        
        console.log(`🏆 Awarding badge with data:`, awardData)
        
        const { error: awardError } = await supabase
          .from('user_course_badges')
          .insert(awardData)

        if (awardError) {
          console.error(`❌ Error awarding badge for course ${course.id}:`, {
            message: awardError.message || 'No message',
            details: awardError.details || 'No details',
            hint: awardError.hint || 'No hint',
            code: awardError.code || 'No code',
            fullError: JSON.stringify(awardError, null, 2)
          })
          
          // إضافة معلومات إضافية للتشخيص
          console.error(`🔍 Debug info for awarding badge:`, {
            userId: user.id,
            badgeId: badgeId,
            courseId: course.id,
            courseTitle: course.title,
            awardedAt: enrollment.completed_at || new Date().toISOString(),
            errorObject: awardError,
            errorType: typeof awardError,
            errorKeys: Object.keys(awardError || {}),
            errorStringified: JSON.stringify(awardError, null, 2)
          })
          
          // محاولة الحصول على رسالة خطأ أكثر تفصيلاً
          let errorMessage = 'فشل في منح الشارة'
          if (awardError && typeof awardError === 'object') {
            if (awardError.message) {
              errorMessage = `فشل في منح الشارة: ${awardError.message}`
            } else if (awardError.details) {
              errorMessage = `فشل في منح الشارة: ${awardError.details}`
            } else if (awardError.hint) {
              errorMessage = `فشل في منح الشارة: ${awardError.hint}`
            } else if (awardError.code) {
              errorMessage = `فشل في منح الشارة (كود: ${awardError.code})`
            }
          }
          
          console.error(`❌ Final error message: ${errorMessage}`)
          continue
        }

        awardedBadgesCount++
        console.log(`🏆 Awarded badge for course: ${course.title}`)
      } else {
        badgeId = courseBadge.id
        console.log(`✅ Badge already exists for course: ${course.title}`)
      }
    }

    console.log(`✅ Process completed: ${createdBadgesCount} badges created, ${awardedBadgesCount} badges awarded`)

    return { 
      success: true, 
      completedCourses: completedCourses.length,
      existingBadges: existingBadges?.length || 0,
      createdBadges: createdBadgesCount,
      awardedBadges: awardedBadgesCount
    }

  } catch (error: any) {
    console.error('❌ Error in checkAndFixMissingBadges:', error)
    return { 
      success: false, 
      completedCourses: 0,
      existingBadges: 0,
      createdBadges: 0,
      awardedBadges: 0,
      error: error.message || 'حدث خطأ غير متوقع' 
    }
  }
} 