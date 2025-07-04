import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export interface CourseCompletionResult {
  success: boolean
  completed: boolean
  progress: number
  badgeAwarded?: boolean
  error?: string
}

export interface LessonProgress {
  lesson_id: number
  course_id: number
  progress_percentage: number
  completed: boolean
  time_spent: number
}

/**
 * إنشاء شارة تلقائياً للمسار إذا لم تكن موجودة
 * Create badge automatically for course if it doesn't exist
 */
const createCourseBadgeIfNotExists = async (courseId: number): Promise<{ success: boolean, badgeId?: number, error?: string }> => {
  const supabase = createClientComponentClient()
  
  try {
    // فحص إذا كانت الشارة موجودة بالفعل
    const { data: existingBadge, error: checkError } = await supabase
      .from('course_badges')
      .select('id')
      .eq('course_id', courseId)
      .single()

    if (checkError && !checkError.message?.includes('No rows found')) {
      console.error('❌ Error checking existing badge:', checkError)
      return { success: false, error: 'فشل في فحص الشارة الموجودة' }
    }

    if (existingBadge) {
      return { success: true, badgeId: existingBadge.id }
    }

    // جلب معلومات المسار لإنشاء الشارة
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('title, level, description')
      .eq('id', courseId)
      .single()

    if (courseError) {
      console.error('❌ Error fetching course details:', courseError)
      return { success: false, error: 'فشل في جلب تفاصيل المسار' }
    }

    // إنشاء شارة جديدة للمسار
    const badgeData = {
      course_id: courseId,
      name: `شارة ${course.title}`,
      description: `شارة إنجاز لإكمال مسار ${course.title}`,
      color: getBadgeColorByLevel(course.level)
    }

    const { data: newBadge, error: createError } = await supabase
      .from('course_badges')
      .insert(badgeData)
      .select('id')
      .single()

    if (createError) {
      console.error('❌ Error creating course badge:', createError)
      return { success: false, error: 'فشل في إنشاء شارة المسار' }
    }

    console.log('✅ Created new badge for course:', courseId, 'Badge ID:', newBadge.id)
    return { success: true, badgeId: newBadge.id }

  } catch (error) {
    console.error('❌ Error in createCourseBadgeIfNotExists:', error)
    return { success: false, error: 'حدث خطأ غير متوقع' }
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
 * فحص إكمال المسار بناءً على تقدم الدروس
 * Check course completion based on lesson progress
 */
export const checkCourseCompletion = async (courseId: number): Promise<CourseCompletionResult> => {
  const supabase = createClientComponentClient()
  
  try {
    // الحصول على المستخدم الحالي
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return { success: false, completed: false, progress: 0, error: 'يجب تسجيل الدخول أولاً' }
    }

    // جلب جميع دروس المسار
    const { data: lessons, error: lessonsError } = await supabase
      .from('lessons')
      .select('id, title, lesson_order')
      .eq('course_id', courseId)
      .eq('status', 'منشور')
      .order('lesson_order', { ascending: true })

    if (lessonsError) {
      return { success: false, completed: false, progress: 0, error: 'فشل في جلب دروس المسار' }
    }

    if (!lessons || lessons.length === 0) {
      return { success: false, completed: false, progress: 0, error: 'لا توجد دروس في هذا المسار' }
    }

    // جلب تقدم المستخدم في جميع دروس المسار
    const { data: progressData, error: progressError } = await supabase
      .from('lesson_progress')
      .select('lesson_id, progress_percentage, completed, time_spent')
      .eq('user_id', user.id)
      .eq('course_id', courseId)

    if (progressError) {
      return { success: false, completed: false, progress: 0, error: 'فشل في جلب تقدم الدروس' }
    }

    // حساب التقدم الإجمالي
    let totalProgress = 0
    let completedLessons = 0
    const totalLessons = lessons.length

    lessons.forEach(lesson => {
      const lessonProgress = progressData?.find(p => p.lesson_id === lesson.id)
      if (lessonProgress) {
        totalProgress += lessonProgress.progress_percentage
        if (lessonProgress.completed) {
          completedLessons++
        }
      }
    })

    const averageProgress = totalLessons > 0 ? Math.round(totalProgress / totalLessons) : 0
    const isCompleted = completedLessons === totalLessons && averageProgress >= 100

    return {
      success: true,
      completed: isCompleted,
      progress: averageProgress
    }

  } catch (error) {
    console.error('❌ Error in checkCourseCompletion:', error)
    return { success: false, completed: false, progress: 0, error: 'حدث خطأ غير متوقع' }
  }
}

/**
 * تحديث حالة التسجيل في المسار
 * Update course enrollment status
 */
export const updateEnrollmentStatus = async (courseId: number, completed: boolean): Promise<{ success: boolean, error?: string }> => {
  const supabase = createClientComponentClient()
  
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return { success: false, error: 'يجب تسجيل الدخول أولاً' }
    }

    const updateData: any = {
      status: completed ? 'مكتمل' : 'مستمر',
      progress: completed ? 100 : 0
    }

    if (completed) {
      updateData.completed_at = new Date().toISOString()
    }

    const { error } = await supabase
      .from('course_enrollments')
      .update(updateData)
      .eq('user_id', user.id)
      .eq('course_id', courseId)

    if (error) {
      console.error('❌ Error updating enrollment:', error)
      return { success: false, error: 'فشل في تحديث حالة التسجيل' }
    }

    return { success: true }

  } catch (error) {
    console.error('❌ Error in updateEnrollmentStatus:', error)
    return { success: false, error: 'حدث خطأ غير متوقع' }
  }
}

/**
 * منح شارة للمستخدم عند إكمال المسار
 * Award badge to user upon course completion
 */
export const awardBadgeToUser = async (courseId: number): Promise<{ success: boolean, badgeAwarded: boolean, error?: string }> => {
  const supabase = createClientComponentClient()
  
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return { success: false, badgeAwarded: false, error: 'يجب تسجيل الدخول أولاً' }
    }

    // فحص إذا كانت الشارة موجودة للمسار
    const { data: existingBadge, error: badgeError } = await supabase
      .from('course_badges')
      .select('id, name, description, image_url, color')
      .eq('course_id', courseId)
      .single()

    let badgeId: number

    if (badgeError || !existingBadge) {
      // إنشاء شارة جديدة للمسار إذا لم تكن موجودة
      const badgeCreation = await createCourseBadgeIfNotExists(courseId)
      if (!badgeCreation.success) {
        console.error('❌ Error creating badge:', badgeCreation.error)
        return { success: false, badgeAwarded: false, error: badgeCreation.error }
      }
      badgeId = badgeCreation.badgeId!
    } else {
      badgeId = existingBadge.id
    }

    // فحص إذا كان المستخدم قد حصل على الشارة بالفعل
    const { data: userBadge, error: checkError } = await supabase
      .from('user_course_badges')
      .select('id')
      .eq('user_id', user.id)
      .eq('badge_id', badgeId)
      .single()

    if (checkError && !checkError.message?.includes('No rows found')) {
      console.error('❌ Error checking existing badge:', checkError)
      return { success: false, badgeAwarded: false, error: 'فشل في فحص الشارات الموجودة' }
    }

    if (userBadge) {
      return { success: true, badgeAwarded: false } // الشارة موجودة بالفعل
    }

    // منح الشارة للمستخدم
    const { error: awardError } = await supabase
      .from('user_course_badges')
      .insert({
        user_id: user.id,
        badge_id: badgeId,
        awarded_at: new Date().toISOString()
      })

    if (awardError) {
      console.error('❌ Error awarding badge:', awardError)
      return { success: false, badgeAwarded: false, error: 'فشل في منح الشارة' }
    }

    console.log('🏆 Badge awarded to user:', user.id, 'for course:', courseId)
    
    // إرجاع معلومات الشارة الممنوحة
    if (existingBadge) {
      console.log('📸 Badge includes image:', existingBadge.image_url ? 'Yes' : 'No')
    }
    
    return { success: true, badgeAwarded: true }

  } catch (error) {
    console.error('❌ Error in awardBadgeToUser:', error)
    return { success: false, badgeAwarded: false, error: 'حدث خطأ غير متوقع' }
  }
}

/**
 * تحديث تقدم الدرس وفحص إكمال المسار
 * Update lesson progress and check course completion
 */
export const updateLessonProgress = async (
  lessonId: number, 
  courseId: number, 
  progress: number, 
  completed: boolean = false,
  timeSpent: number = 0
): Promise<CourseCompletionResult> => {
  const supabase = createClientComponentClient()
  
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return { success: false, completed: false, progress: 0, error: 'يجب تسجيل الدخول أولاً' }
    }

    // تحديث تقدم الدرس
    const { error: progressError } = await supabase
      .from('lesson_progress')
      .upsert({
        user_id: user.id,
        lesson_id: lessonId,
        course_id: courseId,
        progress_percentage: Math.min(100, Math.max(0, progress)),
        completed: completed,
        time_spent: timeSpent,
        last_accessed: new Date().toISOString()
      })

    if (progressError) {
      console.error('❌ Error updating lesson progress:', progressError)
      return { success: false, completed: false, progress: 0, error: 'فشل في تحديث تقدم الدرس' }
    }

    // فحص إكمال المسار
    const completionResult = await checkCourseCompletion(courseId)
    
    if (!completionResult.success) {
      return completionResult
    }

    // إذا تم إكمال المسار، تحديث حالة التسجيل ومنح الشارة
    if (completionResult.completed) {
      // تحديث حالة التسجيل
      const enrollmentResult = await updateEnrollmentStatus(courseId, true)
      if (!enrollmentResult.success) {
        console.error('❌ Error updating enrollment status:', enrollmentResult.error)
      }

      // منح الشارة
      const badgeResult = await awardBadgeToUser(courseId)
      if (badgeResult.success && badgeResult.badgeAwarded) {
        completionResult.badgeAwarded = true
      }
    }

    return completionResult

  } catch (error) {
    console.error('❌ Error in updateLessonProgress:', error)
    return { success: false, completed: false, progress: 0, error: 'حدث خطأ غير متوقع' }
  }
}

/**
 * جلب تقدم المستخدم في جميع دروس المسار
 * Get user progress in all course lessons
 */
export const getCourseProgress = async (courseId: number): Promise<{ 
  success: boolean, 
  progress: LessonProgress[], 
  totalProgress: number,
  error?: string 
}> => {
  const supabase = createClientComponentClient()
  
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return { success: false, progress: [], totalProgress: 0, error: 'يجب تسجيل الدخول أولاً' }
    }

    // جلب جميع دروس المسار
    const { data: lessons, error: lessonsError } = await supabase
      .from('lessons')
      .select('id, title, lesson_order')
      .eq('course_id', courseId)
      .eq('status', 'منشور')
      .order('lesson_order', { ascending: true })

    if (lessonsError) {
      return { success: false, progress: [], totalProgress: 0, error: 'فشل في جلب دروس المسار' }
    }

    // جلب تقدم المستخدم
    const { data: progressData, error: progressError } = await supabase
      .from('lesson_progress')
      .select('lesson_id, progress_percentage, completed, time_spent')
      .eq('user_id', user.id)
      .eq('course_id', courseId)

    if (progressError) {
      return { success: false, progress: [], totalProgress: 0, error: 'فشل في جلب تقدم الدروس' }
    }

    // تجميع البيانات
    const progress: LessonProgress[] = lessons.map(lesson => {
      const lessonProgress = progressData?.find(p => p.lesson_id === lesson.id)
      return {
        lesson_id: lesson.id,
        course_id: courseId,
        progress_percentage: lessonProgress?.progress_percentage || 0,
        completed: lessonProgress?.completed || false,
        time_spent: lessonProgress?.time_spent || 0
      }
    })

    // حساب التقدم الإجمالي
    const totalProgress = progress.length > 0 
      ? Math.round(progress.reduce((sum, p) => sum + p.progress_percentage, 0) / progress.length)
      : 0

    return { success: true, progress, totalProgress }

  } catch (error) {
    console.error('❌ Error in getCourseProgress:', error)
    return { success: false, progress: [], totalProgress: 0, error: 'حدث خطأ غير متوقع' }
  }
}

/**
 * فحص إذا كان المستخدم قد أكمل المسار
 * Check if user has completed the course
 */
export const isCourseCompleted = async (courseId: number): Promise<{ 
  completed: boolean, 
  progress: number,
  error?: string 
}> => {
  const result = await checkCourseCompletion(courseId)
  return {
    completed: result.completed,
    progress: result.progress,
    error: result.error
  }
} 