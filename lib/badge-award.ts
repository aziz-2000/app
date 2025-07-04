import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

/**
 * إعطاء شارة للمستخدم عند إكمال مسار
 */
export async function awardBadgeForCourseCompletion(userId: string, courseId: number): Promise<{ 
  success: boolean; 
  badge?: any; 
  error?: string 
}> {
  try {
    console.log('🏆 Awarding badge for course completion:', { userId, courseId })
    const supabase = createClientComponentClient()
    
    // التحقق من وجود شارة للمسار
    const { data: courseBadge, error: badgeError } = await supabase
      .from('course_badges')
      .select('*')
      .eq('course_id', courseId)
      .single()
    
    if (badgeError || !courseBadge) {
      console.log('⚠️ No badge found for course:', courseId)
      return { 
        success: false, 
        error: 'لا توجد شارة لهذا المسار' 
      }
    }
    
    // التحقق من عدم وجود شارة مسبقاً للمستخدم
    const { data: existingBadge, error: existingError } = await supabase
      .from('user_course_badges')
      .select('*')
      .eq('user_id', userId)
      .eq('badge_id', courseBadge.id)
      .single()
    
    if (existingError && existingError.code !== 'PGRST116') {
      console.error('❌ Error checking existing badge:', existingError)
      return { 
        success: false, 
        error: 'خطأ في التحقق من الشارات الموجودة' 
      }
    }
    
    if (existingBadge) {
      console.log('⚠️ User already has this badge:', existingBadge)
      return { 
        success: false, 
        error: 'المستخدم لديه هذه الشارة بالفعل' 
      }
    }
    
    // إعطاء الشارة للمستخدم
    const { data: awardedBadge, error: awardError } = await supabase
      .from('user_course_badges')
      .insert({
        user_id: userId,
        badge_id: courseBadge.id,
        course_id: courseId,
        awarded_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (awardError) {
      console.error('❌ Error awarding badge:', awardError)
      return { 
        success: false, 
        error: 'فشل في إعطاء الشارة' 
      }
    }
    
    console.log('✅ Badge awarded successfully:', awardedBadge)
    return { 
      success: true, 
      badge: { ...awardedBadge, course_badge: courseBadge }
    }
    
  } catch (error: any) {
    console.error('❌ Error in awardBadgeForCourseCompletion:', error)
    return { 
      success: false, 
      error: error.message || 'حدث خطأ غير متوقع' 
    }
  }
}

/**
 * التحقق من إكمال المسار وإعطاء الشارة
 */
export async function checkCourseCompletionAndAwardBadge(userId: string, courseId: number): Promise<{ 
  success: boolean; 
  badge?: any; 
  error?: string 
}> {
  try {
    console.log('🔍 Checking course completion:', { userId, courseId })
    const supabase = createClientComponentClient()
    
    // جلب جميع دروس المسار
    const { data: lessons, error: lessonsError } = await supabase
      .from('lessons')
      .select('id')
      .eq('course_id', courseId)
      .eq('status', 'منشور')
    
    if (lessonsError) {
      console.error('❌ Error fetching lessons:', lessonsError)
      return { 
        success: false, 
        error: 'خطأ في جلب دروس المسار' 
      }
    }
    
    if (!lessons || lessons.length === 0) {
      console.log('⚠️ No lessons found for course:', courseId)
      return { 
        success: false, 
        error: 'لا توجد دروس في هذا المسار' 
      }
    }
    
    // جلب تقدم المستخدم في دروس المسار
    const { data: progress, error: progressError } = await supabase
      .from('lesson_progress')
      .select('lesson_id, completed')
      .eq('user_id', userId)
      .in('lesson_id', lessons.map(l => l.id))
    
    if (progressError) {
      console.error('❌ Error fetching progress:', progressError)
      return { 
        success: false, 
        error: 'خطأ في جلب تقدم المستخدم' 
      }
    }
    
    // حساب عدد الدروس المكتملة
    const completedLessons = progress?.filter(p => p.completed) || []
    const totalLessons = lessons.length
    const completionRate = (completedLessons.length / totalLessons) * 100
    
    console.log('📊 Course completion stats:', {
      completedLessons: completedLessons.length,
      totalLessons,
      completionRate: `${completionRate}%`
    })
    
    // التحقق من إكمال المسار (100% أو أكثر)
    if (completionRate >= 100) {
      console.log('🎉 Course completed! Awarding badge...')
      return await awardBadgeForCourseCompletion(userId, courseId)
    } else {
      console.log('⏳ Course not yet completed:', `${completionRate}%`)
      return { 
        success: false, 
        error: `المسار غير مكتمل بعد (${Math.round(completionRate)}%)` 
      }
    }
    
  } catch (error: any) {
    console.error('❌ Error in checkCourseCompletionAndAwardBadge:', error)
    return { 
      success: false, 
      error: error.message || 'حدث خطأ غير متوقع' 
    }
  }
}

/**
 * جلب شارات المستخدم مع تفاصيلها
 */
export async function getUserBadgesWithDetails(userId: string): Promise<{ 
  badges: any[]; 
  error?: string 
}> {
  try {
    console.log('🏆 Fetching user badges with details:', userId)
    const supabase = createClientComponentClient()
    
    const { data: badges, error } = await supabase
      .from('user_course_badges')
      .select(`
        *,
        course_badge:course_badges(
          id,
          name,
          description,
          image_url,
          color,
          course_id
        ),
        course:courses(
          id,
          title,
          level
        )
      `)
      .eq('user_id', userId)
      .order('awarded_at', { ascending: false })
    
    if (error) {
      console.error('❌ Error fetching user badges:', error)
      return { 
        badges: [], 
        error: 'خطأ في جلب شارات المستخدم' 
      }
    }
    
    console.log('✅ User badges loaded:', badges?.length || 0)
    return { badges: badges || [] }
    
  } catch (error: any) {
    console.error('❌ Error in getUserBadgesWithDetails:', error)
    return { 
      badges: [], 
      error: error.message || 'حدث خطأ غير متوقع' 
    }
  }
} 