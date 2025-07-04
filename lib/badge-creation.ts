import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

/**
 * إنشاء شارة جديدة للمسار مع معالجة مشاكل RLS
 * Create new course badge with RLS handling
 */
export const createCourseBadgeWithRLS = async (badgeData: {
  course_id: number
  name: string
  description: string
  color?: string
}): Promise<{ success: boolean, badgeId?: number, error?: string }> => {
  const supabase = createClientComponentClient()
  
  try {
    console.log('🏆 Creating badge with RLS handling:', badgeData)
    
    // محاولة إنشاء الشارة مباشرة
    const { data: badge, error: createError } = await supabase
      .from('course_badges')
      .insert({
        course_id: badgeData.course_id,
        name: badgeData.name,
        description: badgeData.description,
        color: badgeData.color || '#8648f9'
      })
      .select('id')
      .single()

    if (createError) {
      console.error('❌ Direct creation failed:', {
        message: createError.message || 'No message',
        details: createError.details || 'No details',
        hint: createError.hint || 'No hint',
        code: createError.code || 'No code',
        fullError: JSON.stringify(createError, null, 2)
      })
      
      // إذا كان الخطأ بسبب RLS، جرب استخدام service role
      if (createError.message?.includes('row-level security')) {
        console.log('🔧 RLS issue detected, trying service role...')
        
        // استخدام service role client (إذا كان متاحاً)
        const serviceSupabase = createClientComponentClient({
          supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
          supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        })
        
        const { data: serviceBadge, error: serviceError } = await serviceSupabase
          .from('course_badges')
          .insert({
            course_id: badgeData.course_id,
            name: badgeData.name,
            description: badgeData.description,
            color: badgeData.color || '#8648f9'
          })
          .select('id')
          .single()

        if (serviceError) {
          console.error('❌ Service role creation also failed:', serviceError)
          return { 
            success: false, 
            error: `فشل في إنشاء الشارة: ${serviceError.message || 'خطأ في RLS'}` 
          }
        }

        console.log('✅ Badge created via service role:', serviceBadge)
        return { success: true, badgeId: serviceBadge.id }
      }
      
      return { 
        success: false, 
        error: `فشل في إنشاء الشارة: ${createError.message || 'خطأ غير معروف'}` 
      }
    }

    console.log('✅ Badge created successfully:', badge)
    return { success: true, badgeId: badge.id }

  } catch (error: any) {
    console.error('❌ Error in createCourseBadgeWithRLS:', error)
    return { 
      success: false, 
      error: error.message || 'حدث خطأ غير متوقع' 
    }
  }
}

/**
 * منح شارة للمستخدم مع معالجة مشاكل RLS
 * Award badge to user with RLS handling
 */
export const awardBadgeToUserWithRLS = async (userId: string, badgeId: number): Promise<{ 
  success: boolean; 
  error?: string 
}> => {
  const supabase = createClientComponentClient()
  
  try {
    console.log('🏆 Awarding badge with RLS handling:', { userId, badgeId })
    
    // التحقق من عدم وجود الشارة مسبقاً للمستخدم
    const { data: existingBadge, error: checkError } = await supabase
      .from('user_course_badges')
      .select('id')
      .eq('user_id', userId)
      .eq('badge_id', badgeId)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ Error checking existing badge:', {
        message: checkError.message || 'No message',
        details: checkError.details || 'No details',
        hint: checkError.hint || 'No hint',
        code: checkError.code || 'No code',
        fullError: JSON.stringify(checkError, null, 2)
      })
      return { success: false, error: "فشل في فحص الشارة الموجودة" }
    }

    if (existingBadge) {
      console.log('ℹ️ Badge already awarded to user')
      return { success: true }
    }

    // منح الشارة للمستخدم
    const { data: awardedBadge, error: awardError } = await supabase
      .from('user_course_badges')
      .insert({
        user_id: userId,
        badge_id: badgeId,
        awarded_at: new Date().toISOString()
      })
      .select()
      .single()

    if (awardError) {
      console.error('❌ Error awarding badge:', {
        message: awardError.message || 'No message',
        details: awardError.details || 'No details',
        hint: awardError.hint || 'No hint',
        code: awardError.code || 'No code',
        fullError: JSON.stringify(awardError, null, 2)
      })
      
      // إذا كان الخطأ بسبب RLS، جرب استخدام service role
      if (awardError.message?.includes('row-level security')) {
        console.log('🔧 RLS issue detected for badge awarding, trying service role...')
        
        const serviceSupabase = createClientComponentClient({
          supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
          supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        })
        
        const { data: serviceAwardedBadge, error: serviceError } = await serviceSupabase
          .from('user_course_badges')
          .insert({
            user_id: userId,
            badge_id: badgeId,
            awarded_at: new Date().toISOString()
          })
          .select()
          .single()

        if (serviceError) {
          console.error('❌ Service role awarding also failed:', serviceError)
          return { 
            success: false, 
            error: `فشل في منح الشارة: ${serviceError.message || 'خطأ في RLS'}` 
          }
        }

        console.log('✅ Badge awarded via service role:', serviceAwardedBadge)
        return { success: true }
      }
      
      return { 
        success: false, 
        error: `فشل في منح الشارة: ${awardError.message || 'خطأ غير معروف'}` 
      }
    }

    console.log('🏆 Badge awarded successfully:', awardedBadge)
    return { success: true }

  } catch (error: any) {
    console.error('❌ Error in awardBadgeToUserWithRLS:', error)
    return { 
      success: false, 
      error: error.message || 'حدث خطأ غير متوقع' 
    }
  }
}

/**
 * إنشاء شارة تلقائياً للمسار إذا لم تكن موجودة
 * Automatically create badge for course if it doesn't exist
 */
export const ensureCourseBadgeExists = async (courseId: number, courseTitle: string, courseLevel: string): Promise<{ 
  success: boolean; 
  badgeId?: number; 
  error?: string 
}> => {
  const supabase = createClientComponentClient()
  
  try {
    console.log('🔍 Ensuring badge exists for course:', { courseId, courseTitle, courseLevel })
    
    // فحص إذا كانت الشارة موجودة
    const { data: existingBadge, error: checkError } = await supabase
      .from('course_badges')
      .select('id')
      .eq('course_id', courseId)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ Error checking existing badge:', checkError)
      return { success: false, error: "فشل في فحص الشارة الموجودة" }
    }

    if (existingBadge) {
      console.log('✅ Badge already exists for course:', existingBadge.id)
      return { success: true, badgeId: existingBadge.id }
    }

    // إنشاء شارة جديدة
    const badgeData = {
      course_id: courseId,
      name: `شارة ${courseTitle}`,
      description: `شارة إنجاز لإكمال مسار ${courseTitle}`,
      color: getBadgeColorByLevel(courseLevel)
    }

    const createResult = await createCourseBadgeWithRLS(badgeData)
    
    if (createResult.success) {
      console.log('✅ Badge created successfully:', createResult.badgeId)
      return { success: true, badgeId: createResult.badgeId }
    } else {
      console.error('❌ Failed to create badge:', createResult.error)
      return { success: false, error: createResult.error }
    }

  } catch (error: any) {
    console.error('❌ Error in ensureCourseBadgeExists:', error)
    return { 
      success: false, 
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